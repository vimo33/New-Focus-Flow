import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getVaultPath, readJsonFile, writeJsonFile, listFiles, ensureDir } from '../utils/file-operations';
// inference-logger imported as needed for cost tracking

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QueueTask {
  id: string;
  skill: string;
  arguments: string;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'background';
  directive_aligned: boolean;
  trust_tier: 1 | 2 | 3;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'paused' | 'waiting_children';

  parent_task_id?: string;
  child_task_ids?: string[];
  depends_on?: string[];

  max_duration_minutes: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;

  hitl_question_id?: string;
  hitl_timeout_hours: number;
  answer_file?: string;

  result_file?: string;
  pid?: number;
  error?: string;
  retry_count: number;

  scheduled_at?: string;
  created_by: 'system' | 'user' | 'agent';
}

interface CostBudget {
  daily_budget_usd: number;
  max_daily_tool_calls: number;
  max_daily_api_cost_usd: number;
  weekly_budget_usd: number;
  alert_threshold_pct: number;
}

interface ScheduleEntry {
  skill: string;
  arguments: string;
  cron: string;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'background';
  trust_tier: 1 | 2 | 3;
  description: string;
}

interface CircuitBreaker {
  consecutive_failures: number;
  last_failure_at: string;
  disabled_until?: string;
}

interface RunningTask {
  task: QueueTask;
  process: ChildProcess;
  startedAt: number;
  timeoutHandle: NodeJS.Timeout;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const QUEUE_DIR = '07_system/agent/queue';
const REPORTS_DIR = '07_system/reports';
const PENDING_QUESTIONS_DIR = '07_system/agent/pending-questions';
const ANSWERED_QUESTIONS_DIR = '07_system/agent/answered-questions';
const CIRCUIT_BREAKER_PATH = '07_system/agent/circuit-breaker.json';
const COST_BUDGET_PATH = '07_system/agent/cost-budget.json';
const SCHEDULE_PATH = '07_system/agent/schedule.json';
const KILL_SWITCH_PATH = '07_system/agent/KILL_SWITCH';
const PROFILING_CHECKLIST_PATH = '07_system/agent/profiling-checklist.json';
const PROJECT_DIR = '/srv/focus-flow';
const MAX_CONCURRENT = 2;
const POLL_INTERVAL_MS = 10_000;

const PRIORITY_ORDER: Record<string, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  background: 1,
};

// ─── Service ─────────────────────────────────────────────────────────────────

class TaskQueueService {
  private running: Map<string, RunningTask> = new Map();
  private pollTimer: NodeJS.Timeout | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure queue directories exist
    await ensureDir(getVaultPath(QUEUE_DIR));
    await ensureDir(getVaultPath(REPORTS_DIR));
    await ensureDir(getVaultPath(PENDING_QUESTIONS_DIR));
    await ensureDir(getVaultPath(ANSWERED_QUESTIONS_DIR));
    await ensureDir(getVaultPath('07_system/logs/claude-code'));

    // Recover tasks that were running when backend restarted
    await this.recoverStuckTasks();

    // Bootstrap: if zero completed tasks, enqueue portfolio-analysis
    await this.bootstrapIfEmpty();

    // Start polling
    this.pollTimer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
    this.initialized = true;
    console.log('[TaskQueue] Initialized, polling every 10s');
  }

  async shutdown(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    // Kill all running processes
    for (const [taskId, running] of this.running) {
      console.log(`[TaskQueue] Shutting down task ${taskId}`);
      running.process.kill('SIGTERM');
      clearTimeout(running.timeoutHandle);
    }
    this.running.clear();
    this.initialized = false;
  }

  // ─── Polling Loop ──────────────────────────────────────────────────────────

  private async poll(): Promise<void> {
    try {
      // Check kill switch
      if (fs.existsSync(getVaultPath(KILL_SWITCH_PATH))) {
        return; // All operations paused
      }

      // Check circuit breaker
      const cb = await readJsonFile<CircuitBreaker>(getVaultPath(CIRCUIT_BREAKER_PATH));
      if (cb && cb.consecutive_failures >= 3) {
        const lastFailure = new Date(cb.last_failure_at).getTime();
        const tenMinAgo = Date.now() - 10 * 60 * 1000;
        if (lastFailure > tenMinAgo) {
          return; // Circuit breaker tripped
        }
        // Reset circuit breaker after 10 min cooldown
        await writeJsonFile(getVaultPath(CIRCUIT_BREAKER_PATH), {
          consecutive_failures: 0,
          last_failure_at: cb.last_failure_at,
        });
      }

      // Check waiting_children tasks
      await this.checkWaitingChildren();

      // Check schedule
      await this.checkSchedule();

      // Check profiling gaps
      await this.checkProfilingGaps();

      // Check budget before spawning
      const budgetOk = await this.checkBudget();
      if (!budgetOk) {
        return;
      }

      // Check HITL timeouts
      await this.checkHitlTimeouts();

      // Spawn tasks if capacity available
      if (this.running.size < MAX_CONCURRENT) {
        const next = await this.getNextTask();
        if (next) {
          await this.spawnTask(next);
        }
      }
    } catch (err) {
      console.error('[TaskQueue] Poll error:', err);
    }
  }

  // ─── Task Lifecycle ────────────────────────────────────────────────────────

  async enqueue(params: {
    skill: string;
    arguments?: string;
    priority?: QueueTask['priority'];
    trust_tier?: 1 | 2 | 3;
    parent_task_id?: string;
    depends_on?: string[];
    max_duration_minutes?: number;
    hitl_timeout_hours?: number;
    created_by?: QueueTask['created_by'];
    scheduled_at?: string;
  }): Promise<QueueTask> {
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const directive = await this.isDirectiveAligned(params.skill);

    const task: QueueTask = {
      id,
      skill: params.skill,
      arguments: params.arguments || '',
      priority: params.priority || 'medium',
      directive_aligned: directive,
      trust_tier: params.trust_tier || 2,
      status: 'queued',
      max_duration_minutes: params.max_duration_minutes || 120,
      created_at: new Date().toISOString(),
      hitl_timeout_hours: params.hitl_timeout_hours || 24,
      retry_count: 0,
      parent_task_id: params.parent_task_id,
      depends_on: params.depends_on,
      created_by: params.created_by || 'system',
      scheduled_at: params.scheduled_at,
    };

    await writeJsonFile(getVaultPath(QUEUE_DIR, `${id}.json`), task);
    console.log(`[TaskQueue] Enqueued: ${id} (/${task.skill} ${task.arguments}) priority=${task.priority}`);
    return task;
  }

  async completeTask(taskId: string, resultFile?: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) return;

    task.status = 'completed';
    task.completed_at = new Date().toISOString();
    if (resultFile) task.result_file = resultFile;

    await this.saveTask(task);

    // Reset circuit breaker on success
    await writeJsonFile(getVaultPath(CIRCUIT_BREAKER_PATH), {
      consecutive_failures: 0,
      last_failure_at: new Date().toISOString(),
    });

    // Check if this task has subtasks in its report
    if (resultFile) {
      await this.processSubtasks(task, resultFile);
    }

    console.log(`[TaskQueue] Completed: ${taskId}`);
  }

  async failTask(taskId: string, error: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) return;

    task.retry_count = (task.retry_count || 0) + 1;
    task.error = error;

    if (task.retry_count < 3) {
      task.status = 'queued';
      console.log(`[TaskQueue] Retrying ${taskId} (attempt ${task.retry_count + 1}/3)`);
    } else {
      task.status = 'failed';
      task.completed_at = new Date().toISOString();
      console.log(`[TaskQueue] Failed permanently: ${taskId} — ${error}`);
    }

    await this.saveTask(task);

    // Update circuit breaker
    const cb = await readJsonFile<CircuitBreaker>(getVaultPath(CIRCUIT_BREAKER_PATH)) || {
      consecutive_failures: 0,
      last_failure_at: new Date().toISOString(),
    };
    cb.consecutive_failures += 1;
    cb.last_failure_at = new Date().toISOString();
    await writeJsonFile(getVaultPath(CIRCUIT_BREAKER_PATH), cb);
  }

  async killTask(taskId: string): Promise<boolean> {
    const running = this.running.get(taskId);
    if (!running) return false;

    running.process.kill('SIGTERM');
    clearTimeout(running.timeoutHandle);
    this.running.delete(taskId);

    const task = await this.getTask(taskId);
    if (task) {
      task.status = 'failed';
      task.error = 'Killed by user';
      task.completed_at = new Date().toISOString();
      await this.saveTask(task);
    }

    console.log(`[TaskQueue] Killed: ${taskId}`);
    return true;
  }

  // ─── Kill Switch ───────────────────────────────────────────────────────────

  async activateKillSwitch(): Promise<void> {
    fs.writeFileSync(getVaultPath(KILL_SWITCH_PATH), `Activated at ${new Date().toISOString()}\n`);
    // Kill all running tasks
    for (const [taskId] of this.running) {
      await this.killTask(taskId);
    }
    console.log('[TaskQueue] KILL SWITCH ACTIVATED — all tasks stopped');
  }

  async deactivateKillSwitch(): Promise<void> {
    const ksPath = getVaultPath(KILL_SWITCH_PATH);
    if (fs.existsSync(ksPath)) {
      fs.unlinkSync(ksPath);
    }
    console.log('[TaskQueue] Kill switch deactivated — operations resumed');
  }

  isKillSwitchActive(): boolean {
    return fs.existsSync(getVaultPath(KILL_SWITCH_PATH));
  }

  // ─── Spawning ──────────────────────────────────────────────────────────────

  private syncNitaraCredentials(): void {
    const src = '/root/.claude/.credentials.json';
    const dst = '/home/nitara/.claude/.credentials.json';
    try {
      fs.copyFileSync(src, dst);
      fs.chownSync(dst, 995, 985); // nitara uid:gid
      console.log('[TaskQueue] Synced credentials to nitara user');
    } catch (err: any) {
      console.error(`[TaskQueue] Failed to sync credentials: ${err.message}`);
    }
  }

  private async spawnTask(task: QueueTask): Promise<void> {
    task.status = 'running';
    task.started_at = new Date().toISOString();
    await this.saveTask(task);

    // Sync OAuth credentials before each spawn (tokens expire ~every 10h)
    this.syncNitaraCredentials();

    // Build the prompt
    let prompt = `/${task.skill}`;
    if (task.arguments) prompt += ` ${task.arguments}`;

    // If resumed with an answer file, inject it
    if (task.answer_file) {
      prompt += ` --resumed --answer-file ${task.answer_file}`;
    }

    // Claude CLI rejects --dangerously-skip-permissions when running as root.
    // Spawn via `su - nitara` to run as a non-root user.
    const escapedPrompt = prompt.replace(/'/g, `'\\''`);
    const claudeCmd = `cd ${PROJECT_DIR} && NITARA_TASK_ID='${task.id}' NITARA_TASK_SKILL='${task.skill}' claude --dangerously-skip-permissions --output-format text -p '${escapedPrompt}'`;

    console.log(`[TaskQueue] Spawning as nitara: ${claudeCmd}`);

    const child = spawn('su', ['-', 'nitara', '-c', claudeCmd], {
      env: { ...process.env, HOME: '/home/nitara' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    task.pid = child.pid;
    await this.saveTask(task);

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    // Timeout handler
    const timeoutMs = task.max_duration_minutes * 60 * 1000;
    const timeoutHandle = setTimeout(() => {
      console.log(`[TaskQueue] Timeout reached for ${task.id} (${task.max_duration_minutes} min)`);
      child.kill('SIGTERM');
    }, timeoutMs);

    // Completion handler
    child.on('close', async (code) => {
      clearTimeout(timeoutHandle);
      this.running.delete(task.id);

      if (code === 0) {
        // Find the most recent report file
        const reportFile = await this.findRecentReport(task.skill);
        await this.completeTask(task.id, reportFile || undefined);
      } else {
        await this.failTask(task.id, `Exit code ${code}: ${stderr.slice(-500)}`);
      }
    });

    child.on('error', async (err) => {
      clearTimeout(timeoutHandle);
      this.running.delete(task.id);
      await this.failTask(task.id, `Spawn error: ${err.message}`);
    });

    this.running.set(task.id, {
      task,
      process: child,
      startedAt: Date.now(),
      timeoutHandle,
    });
  }

  // ─── Task Selection ────────────────────────────────────────────────────────

  private async getNextTask(): Promise<QueueTask | null> {
    const files = await listFiles(getVaultPath(QUEUE_DIR));
    const tasks: QueueTask[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const task = await readJsonFile<QueueTask>(getVaultPath(QUEUE_DIR, file));
      if (task && task.status === 'queued') {
        // Check dependencies
        if (task.depends_on && task.depends_on.length > 0) {
          const allDepsComplete = await this.allDependenciesComplete(task.depends_on);
          if (!allDepsComplete) continue;
        }
        // Check scheduled_at
        if (task.scheduled_at && new Date(task.scheduled_at) > new Date()) {
          continue;
        }
        tasks.push(task);
      }
    }

    if (tasks.length === 0) return null;

    // Sort by effective priority (directive_aligned gets +1 boost)
    tasks.sort((a, b) => {
      const aPriority = PRIORITY_ORDER[a.priority] + (a.directive_aligned ? 1 : 0);
      const bPriority = PRIORITY_ORDER[b.priority] + (b.directive_aligned ? 1 : 0);
      if (bPriority !== aPriority) return bPriority - aPriority;
      // Tie-break by creation time (oldest first)
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    return tasks[0];
  }

  private async allDependenciesComplete(depIds: string[]): Promise<boolean> {
    for (const depId of depIds) {
      const dep = await this.getTask(depId);
      if (!dep || dep.status !== 'completed') return false;
    }
    return true;
  }

  // ─── Task I/O ──────────────────────────────────────────────────────────────

  async getTask(taskId: string): Promise<QueueTask | null> {
    return readJsonFile<QueueTask>(getVaultPath(QUEUE_DIR, `${taskId}.json`));
  }

  private async saveTask(task: QueueTask): Promise<void> {
    await writeJsonFile(getVaultPath(QUEUE_DIR, `${task.id}.json`), task);
  }

  async getAllTasks(statusFilter?: string): Promise<QueueTask[]> {
    const files = await listFiles(getVaultPath(QUEUE_DIR));
    const tasks: QueueTask[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const task = await readJsonFile<QueueTask>(getVaultPath(QUEUE_DIR, file));
      if (task) {
        if (!statusFilter || task.status === statusFilter) {
          tasks.push(task);
        }
      }
    }

    return tasks.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  // ─── Budget ────────────────────────────────────────────────────────────────

  private async checkBudget(): Promise<boolean> {
    const budget = await readJsonFile<CostBudget>(getVaultPath(COST_BUDGET_PATH));
    if (!budget) return true; // No budget file = no limit

    // Check tool call count
    const today = new Date().toISOString().slice(0, 10);
    const toolLogPath = getVaultPath('07_system/logs/claude-code', `${today}.jsonl`);
    let toolCallCount = 0;
    if (fs.existsSync(toolLogPath)) {
      const lines = fs.readFileSync(toolLogPath, 'utf-8').split('\n').filter(Boolean);
      toolCallCount = lines.length;
    }

    if (toolCallCount >= budget.max_daily_tool_calls) {
      console.log(`[TaskQueue] Budget exceeded: ${toolCallCount} tool calls >= ${budget.max_daily_tool_calls}`);
      return false;
    }

    // Check API cost
    const inferenceLogPath = getVaultPath('07_system/logs/inference', `${today}.jsonl`);
    let totalCost = 0;
    if (fs.existsSync(inferenceLogPath)) {
      const lines = fs.readFileSync(inferenceLogPath, 'utf-8').split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          totalCost += entry.estimated_cost_usd || 0;
        } catch { /* skip malformed */ }
      }
    }

    if (totalCost >= budget.max_daily_api_cost_usd) {
      console.log(`[TaskQueue] Budget exceeded: $${totalCost.toFixed(2)} >= $${budget.max_daily_api_cost_usd}`);
      return false;
    }

    return true;
  }

  // ─── Schedule ──────────────────────────────────────────────────────────────

  private async checkSchedule(): Promise<void> {
    const schedule = await readJsonFile<ScheduleEntry[]>(getVaultPath(SCHEDULE_PATH));
    if (!schedule || schedule.length === 0) return;

    const now = new Date();

    for (const entry of schedule) {
      if (this.cronMatches(entry.cron, now)) {
        // Check if this skill is already queued or running
        const existing = await this.getAllTasks();
        const alreadyActive = existing.some(
          t => t.skill === entry.skill &&
            (t.status === 'queued' || t.status === 'running') &&
            t.arguments === entry.arguments
        );
        if (!alreadyActive) {
          await this.enqueue({
            skill: entry.skill,
            arguments: entry.arguments,
            priority: entry.priority,
            trust_tier: entry.trust_tier,
            created_by: 'system',
          });
          console.log(`[TaskQueue] Scheduled: /${entry.skill} ${entry.arguments}`);
        }
      }
    }
  }

  private cronMatches(cron: string, now: Date): boolean {
    // Simple cron parser: minute hour day month weekday
    const parts = cron.split(' ');
    if (parts.length !== 5) return false;

    const [min, hour, day, month, weekday] = parts;

    const matchField = (field: string, value: number): boolean => {
      if (field === '*') return true;
      if (field.startsWith('*/')) {
        const interval = parseInt(field.slice(2));
        return value % interval === 0;
      }
      return parseInt(field) === value;
    };

    // Only trigger at the start of the poll interval (within 10s of the cron time)
    return (
      matchField(min, now.getMinutes()) &&
      matchField(hour, now.getHours()) &&
      matchField(day, now.getDate()) &&
      matchField(month, now.getMonth() + 1) &&
      matchField(weekday, now.getDay()) &&
      now.getSeconds() < 15 // Only trigger in first 15 seconds of the minute
    );
  }

  // ─── Profiling Gap Check ───────────────────────────────────────────────────

  private async checkProfilingGaps(): Promise<void> {
    const checklist = await readJsonFile<any>(getVaultPath(PROFILING_CHECKLIST_PATH));
    if (!checklist) return;

    const completeness = checklist.overall_completeness_pct || 0;
    if (completeness >= 80) return;

    // Check if a profiling-question is already active
    const tasks = await this.getAllTasks();
    const profilingActive = tasks.some(
      t => t.skill === 'profiling-question' && (t.status === 'queued' || t.status === 'running')
    );
    if (profilingActive) return;

    // Check last profiling question (>24h ago)
    const lastProfiling = tasks
      .filter(t => t.skill === 'profiling-question' && t.status === 'completed')
      .sort((a, b) => new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime())[0];

    if (lastProfiling && lastProfiling.completed_at) {
      const hoursSince = (Date.now() - new Date(lastProfiling.completed_at).getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) return;
    }

    await this.enqueue({
      skill: 'profiling-question',
      priority: 'background',
      trust_tier: 1,
      created_by: 'system',
    });
    console.log(`[TaskQueue] Auto-enqueued profiling question (completeness: ${completeness}%)`);
  }

  // ─── Waiting Children ──────────────────────────────────────────────────────

  private async checkWaitingChildren(): Promise<void> {
    const tasks = await this.getAllTasks('waiting_children');

    for (const parent of tasks) {
      if (!parent.child_task_ids || parent.child_task_ids.length === 0) continue;

      const allChildrenDone = await Promise.all(
        parent.child_task_ids.map(async (childId) => {
          const child = await this.getTask(childId);
          return child && (child.status === 'completed' || child.status === 'failed');
        })
      );

      if (allChildrenDone.every(Boolean)) {
        // All children finished — re-queue parent with --resumed --children-results
        parent.status = 'queued';
        parent.arguments += ' --resumed --children-results';
        await this.saveTask(parent);
        console.log(`[TaskQueue] All children done for ${parent.id}, re-queuing parent`);
      }
    }
  }

  // ─── Task Decomposition ────────────────────────────────────────────────────

  private async processSubtasks(parent: QueueTask, resultFile: string): Promise<void> {
    const report = await readJsonFile<any>(resultFile);
    if (!report || !report.subtasks || !Array.isArray(report.subtasks)) return;

    const childIds: string[] = [];

    for (const subtask of report.subtasks) {
      const child = await this.enqueue({
        skill: subtask.skill,
        arguments: subtask.arguments || '',
        priority: subtask.priority || parent.priority,
        trust_tier: subtask.trust_tier || parent.trust_tier,
        parent_task_id: parent.id,
        created_by: 'agent',
      });
      childIds.push(child.id);
    }

    if (childIds.length > 0) {
      parent.child_task_ids = childIds;
      parent.status = 'waiting_children';
      await this.saveTask(parent);
      console.log(`[TaskQueue] Created ${childIds.length} subtasks for ${parent.id}`);
    }
  }

  // ─── HITL Timeout ──────────────────────────────────────────────────────────

  private async checkHitlTimeouts(): Promise<void> {
    const tasks = await this.getAllTasks('paused');

    for (const task of tasks) {
      if (!task.hitl_question_id || !task.started_at) continue;

      const hoursPaused = (Date.now() - new Date(task.started_at).getTime()) / (1000 * 60 * 60);

      if (hoursPaused >= task.hitl_timeout_hours) {
        if (task.trust_tier <= 2) {
          // Auto-approve
          const answerPath = getVaultPath(ANSWERED_QUESTIONS_DIR, `${task.hitl_question_id}.json`);
          await writeJsonFile(answerPath, {
            question_id: task.hitl_question_id,
            answer: 'auto-approved',
            auto_approved: true,
            approved_at: new Date().toISOString(),
            reason: `Auto-approved after ${task.hitl_timeout_hours} hours (Tier ${task.trust_tier})`,
          });
          task.status = 'queued';
          task.answer_file = answerPath;
          await this.saveTask(task);
          console.log(`[TaskQueue] Auto-approved ${task.id} after HITL timeout`);
        } else {
          // Auto-reject tier 3
          task.status = 'failed';
          task.error = `HITL timeout: auto-rejected after ${task.hitl_timeout_hours} hours (Tier 3)`;
          task.completed_at = new Date().toISOString();
          await this.saveTask(task);
          console.log(`[TaskQueue] Auto-rejected ${task.id} (Tier 3 HITL timeout)`);
        }
      }
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async isDirectiveAligned(skill: string): Promise<boolean> {
    // Skills directly aligned with income-generation directive
    const incomeAligned = [
      'portfolio-analysis', 'research-market', 'research-passive-income',
      'network-analyze', 'build-mvp',
    ];
    return incomeAligned.includes(skill);
  }

  private async findRecentReport(skill: string): Promise<string | null> {
    const reportsDir = getVaultPath(REPORTS_DIR);
    try {
      const files = await listFiles(reportsDir);
      const fiveMinAgo = Date.now() - 5 * 60 * 1000;

      const recent = files
        .filter(f => f.endsWith('.json') && f.includes(skill))
        .map(f => ({
          name: f,
          path: path.join(reportsDir, f),
          mtime: fs.statSync(path.join(reportsDir, f)).mtimeMs,
        }))
        .filter(f => f.mtime > fiveMinAgo)
        .sort((a, b) => b.mtime - a.mtime);

      return recent.length > 0 ? recent[0].path : null;
    } catch {
      return null;
    }
  }

  private async recoverStuckTasks(): Promise<void> {
    const tasks = await this.getAllTasks('running');
    for (const task of tasks) {
      console.log(`[TaskQueue] Recovering stuck task ${task.id} — requeueing`);
      task.status = 'queued';
      task.pid = undefined;
      await this.saveTask(task);
    }
  }

  private async bootstrapIfEmpty(): Promise<void> {
    const tasks = await this.getAllTasks();
    const hasCompleted = tasks.some(t => t.status === 'completed');

    if (!hasCompleted && tasks.length === 0) {
      await this.enqueue({
        skill: 'portfolio-analysis',
        arguments: 'all',
        priority: 'high',
        trust_tier: 2,
        created_by: 'system',
      });
      console.log('[TaskQueue] Bootstrap: enqueued initial portfolio-analysis');
    }
  }

  // ─── Stats ─────────────────────────────────────────────────────────────────

  async getStats(): Promise<{
    running_count: number;
    queued_count: number;
    completed_today: number;
    failed_today: number;
    daily_cost_usd: number;
    daily_tool_calls: number;
    kill_switch_active: boolean;
  }> {
    const tasks = await this.getAllTasks();
    const today = new Date().toISOString().slice(0, 10);

    const todayTasks = tasks.filter(t =>
      t.created_at && t.created_at.startsWith(today)
    );

    // Get cost data
    let dailyCost = 0;
    const inferenceLogPath = getVaultPath('07_system/logs/inference', `${today}.jsonl`);
    if (fs.existsSync(inferenceLogPath)) {
      const lines = fs.readFileSync(inferenceLogPath, 'utf-8').split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          dailyCost += entry.estimated_cost_usd || 0;
        } catch { /* skip */ }
      }
    }

    let toolCalls = 0;
    const toolLogPath = getVaultPath('07_system/logs/claude-code', `${today}.jsonl`);
    if (fs.existsSync(toolLogPath)) {
      toolCalls = fs.readFileSync(toolLogPath, 'utf-8').split('\n').filter(Boolean).length;
    }

    return {
      running_count: this.running.size,
      queued_count: tasks.filter(t => t.status === 'queued').length,
      completed_today: todayTasks.filter(t => t.status === 'completed').length,
      failed_today: todayTasks.filter(t => t.status === 'failed').length,
      daily_cost_usd: Math.round(dailyCost * 100) / 100,
      daily_tool_calls: toolCalls,
      kill_switch_active: this.isKillSwitchActive(),
    };
  }
}

export const taskQueueService = new TaskQueueService();
