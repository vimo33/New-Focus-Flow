import {
  CoreAgentState,
  AgentStatus,
  AgentAction,
  AgentResponse,
  AgentActivityEntry,
  PendingApproval,
  WorkPlan,
  DailyStats,
} from '../models/types';
import {
  getVaultPath,
  readJsonFile,
  writeJsonFile,
} from '../utils/file-operations';
import { generateAgentActionId, generateActivityId, generateId } from '../utils/id-generator';
import { trustGate } from './trust-gate.service';
import { notificationRouter } from './notification-router.service';
import { briefingGenerator } from './briefing-generator.service';
import { cachedInference } from './cached-inference.service';
import { sseManager } from './sse-manager.service';
import { toolRunner } from './tool-runner.service';
import { VaultService } from './vault.service';
import { mem0Service } from './mem0.service';

const LOG_PREFIX = '[CoreAgent]';

const STATE_PATH = getVaultPath('07_system', 'agent', 'state.json');
const CONFIG_PATH = getVaultPath('07_system', 'agent', 'config.json');
const MAX_ACTIVITY_LOG = 200;

function defaultDailyStats(): DailyStats {
  return {
    actions_executed: 0,
    actions_approved: 0,
    actions_rejected: 0,
    briefings_generated: 0,
    notifications_sent: 0,
    ai_calls_made: 0,
    estimated_cost_usd: 0,
  };
}

function defaultState(): CoreAgentState {
  return {
    status: 'idle',
    current_briefing_id: null,
    active_work_plan: null,
    pending_approvals: [],
    delayed_executions: [],
    last_briefing_at: null,
    last_heartbeat_at: null,
    daily_stats: defaultDailyStats(),
    activityLog: [],
    updated_at: new Date().toISOString(),
  };
}

class CoreAgentService {
  private state: CoreAgentState;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatInterval = 60000;
  private briefingSchedule: string | null = null;
  private vault = new VaultService();

  constructor() {
    this.state = defaultState();
    this.initialize().catch(err =>
      console.error(`${LOG_PREFIX} Init failed:`, err.message)
    );
  }

  private async initialize(): Promise<void> {
    // Load persisted state
    const saved = await readJsonFile<CoreAgentState>(STATE_PATH);
    if (saved) {
      this.state = saved;
      // Ensure activityLog exists (migration from older state)
      if (!this.state.activityLog) {
        this.state.activityLog = [];
      }
      // Reload pending approvals from trust gate
      this.state.pending_approvals = await trustGate.getPendingApprovals();
      console.log(`${LOG_PREFIX} Loaded persisted state (status: ${this.state.status})`);
    }

    // Load config
    const config = await readJsonFile<any>(CONFIG_PATH);
    if (config?.heartbeat_interval_ms) {
      this.heartbeatInterval = config.heartbeat_interval_ms;
    }
    if (config?.briefing_schedule) {
      this.briefingSchedule = config.briefing_schedule;
      console.log(`${LOG_PREFIX} Briefing schedule: ${this.briefingSchedule}`);
    }

    // Reset daily stats if it's a new day
    if (this.state.last_heartbeat_at) {
      const lastDate = this.state.last_heartbeat_at.split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      if (lastDate !== today) {
        this.state.daily_stats = defaultDailyStats();
      }
    }

    // Start heartbeat
    this.start();
  }

  start(): void {
    if (this.heartbeatTimer) return;

    this.heartbeatTimer = setInterval(() => {
      this.heartbeat().catch(err =>
        console.error(`${LOG_PREFIX} Heartbeat error:`, err.message)
      );
    }, this.heartbeatInterval);

    if (this.heartbeatTimer.unref) {
      this.heartbeatTimer.unref();
    }

    console.log(`${LOG_PREFIX} Heartbeat started (${this.heartbeatInterval}ms interval)`);
  }

  stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      console.log(`${LOG_PREFIX} Heartbeat stopped`);
    }
  }

  private async heartbeat(): Promise<void> {
    this.state.last_heartbeat_at = new Date().toISOString();

    // Scheduled briefing check
    if (this.briefingSchedule && this.state.status !== 'paused') {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const lastBriefingDate = this.state.last_briefing_at
        ? this.state.last_briefing_at.split('T')[0]
        : null;
      const today = now.toISOString().split('T')[0];

      if (currentTime === this.briefingSchedule && lastBriefingDate !== today) {
        console.log(`${LOG_PREFIX} Scheduled briefing triggered at ${currentTime}`);
        try {
          await this.generateBriefing();
        } catch (err: any) {
          console.error(`${LOG_PREFIX} Scheduled briefing failed:`, err.message);
        }
      }
    }

    // Check for expired Tier 2 delayed executions
    const expired = await trustGate.checkExpiredDelays();
    for (const approval of expired) {
      console.log(`${LOG_PREFIX} Auto-executing Tier 2 action: ${approval.action.description}`);
      this.state.daily_stats.actions_executed++;
      await this.logActivity('auto_executed', `Auto-executed delayed action: ${approval.action.description}`, {
        action_type: approval.action.type,
        tier: 2,
        result: 'success',
      });
      await notificationRouter.send({
        type: 'progress_update',
        priority: 'medium',
        title: 'Auto-executed delayed action',
        body: approval.action.description,
        data: { approval_id: approval.id, action: approval.action },
      });
    }

    // Refresh pending approvals
    this.state.pending_approvals = await trustGate.getPendingApprovals();
    this.state.delayed_executions = this.state.pending_approvals.filter(
      a => a.tier === 2 && a.status === 'pending'
    );

    await this.persistState();
  }

  private async logActivity(
    type: AgentActivityEntry['type'],
    description: string,
    meta?: Partial<Pick<AgentActivityEntry, 'action_type' | 'project_id' | 'tier' | 'result' | 'metadata'>>
  ): Promise<void> {
    const entry: AgentActivityEntry = {
      id: generateActivityId(),
      timestamp: new Date().toISOString(),
      type,
      description,
      ...meta,
    };

    this.state.activityLog.push(entry);

    // Cap at MAX_ACTIVITY_LOG
    if (this.state.activityLog.length > MAX_ACTIVITY_LOG) {
      this.state.activityLog = this.state.activityLog.slice(-MAX_ACTIVITY_LOG);
    }

    await this.persistState();
    sseManager.broadcast('activity', entry);
  }

  getActivity(limit = 50): AgentActivityEntry[] {
    return this.state.activityLog.slice(-limit).reverse();
  }

  async generateBriefing(): Promise<AgentResponse> {
    await this.transition('generating_briefing');

    try {
      const briefing = await briefingGenerator.generateBriefing();

      this.state.current_briefing_id = briefing.id;
      this.state.last_briefing_at = briefing.generated_at;
      this.state.daily_stats.briefings_generated++;
      this.state.daily_stats.ai_calls_made += 2;

      // Create work plan from briefing
      if (briefing.work_plan.length > 0) {
        this.state.active_work_plan = {
          id: generateId('wp'),
          date: briefing.date,
          items: briefing.work_plan,
          approved: false,
          created_at: new Date().toISOString(),
        };
      }

      await this.transition('awaiting_approval');

      await this.logActivity('briefing_generated', `Daily briefing generated: ${briefing.ai_summary.slice(0, 100)}`, {
        metadata: { briefing_id: briefing.id },
      });

      // Send notification
      await notificationRouter.send({
        type: 'daily_briefing',
        priority: 'high',
        title: 'Daily Briefing Ready',
        body: briefing.ai_summary,
        data: { briefing_id: briefing.id },
        action_url: '/agent',
      });
      this.state.daily_stats.notifications_sent++;

      sseManager.broadcast('briefing', briefing);

      return {
        message: `Briefing generated: ${briefing.ai_summary}`,
        actions_taken: ['generate_briefing', 'formulate_work_plan'],
        state: this.state,
      };
    } catch (err: any) {
      await this.transition('idle');
      throw err;
    }
  }

  async approveWorkPlan(planId: string, edits?: any[]): Promise<AgentResponse> {
    if (!this.state.active_work_plan || this.state.active_work_plan.id !== planId) {
      return { message: 'No matching work plan found', state: this.state };
    }

    this.state.active_work_plan.approved = true;
    this.state.active_work_plan.approved_at = new Date().toISOString();

    // Apply edits if provided
    if (edits && Array.isArray(edits)) {
      for (const edit of edits) {
        const item = this.state.active_work_plan.items.find(i => i.id === edit.id);
        if (item) {
          if (edit.action === 'skip') item.status = 'skipped';
          if (edit.priority) item.priority = edit.priority;
        }
      }
    }

    await this.transition('executing');

    await this.logActivity('work_plan_approved', `Work plan approved with ${this.state.active_work_plan.items.filter(i => i.status !== 'skipped').length} active items`, {
      metadata: { plan_id: planId, skipped: edits?.filter(e => e.action === 'skip').length || 0 },
    });

    // Auto-execute Tier 1 items, create approvals for Tier 2/3
    const actions: string[] = ['approve_work_plan'];

    for (const item of this.state.active_work_plan.items) {
      if (item.status === 'skipped') continue;

      const action: AgentAction = {
        id: generateAgentActionId(),
        type: item.action,
        project_id: item.project_id,
        description: item.description,
      };

      await this.executeAction(action);
      actions.push(`dispatch_${item.action}`);
    }

    await notificationRouter.send({
      type: 'work_plan',
      priority: 'medium',
      title: 'Work plan approved and executing',
      body: `${this.state.active_work_plan.items.filter(i => i.status !== 'skipped').length} items being processed`,
    });

    await this.transition('idle');

    return {
      message: 'Work plan approved and dispatched',
      actions_taken: actions,
      state: this.state,
    };
  }

  async executeAction(action: AgentAction): Promise<void> {
    const tier = trustGate.classify(action.type);

    if (tier === 1) {
      // Auto-execute with real tool execution
      console.log(`${LOG_PREFIX} Auto-executing Tier 1: ${action.description}`);
      const result = await this.executeApprovedAction(action);
      this.state.daily_stats.actions_executed++;
      await this.logActivity('auto_executed', `Auto-executed Tier 1: ${action.description}`, {
        action_type: action.type,
        project_id: action.project_id,
        tier: 1,
        result: result ? 'success' : 'failure',
      });
    } else {
      // Create approval request
      const approval = await trustGate.createApproval(
        action,
        `Agent wants to execute: ${action.description}`,
        `Action type "${action.type}" is classified as Tier ${tier}`
      );

      this.state.pending_approvals.push(approval);

      if (tier === 2) {
        this.state.delayed_executions.push(approval);
      }

      await notificationRouter.send({
        type: 'approval_request',
        priority: tier === 3 ? 'high' : 'medium',
        title: `Approval needed (Tier ${tier})`,
        body: action.description,
        requires_response: true,
        approval_id: approval.id,
        action_url: '/agent',
      });
      this.state.daily_stats.notifications_sent++;
    }

    await this.persistState();
  }

  private async executeApprovedAction(action: AgentAction): Promise<boolean> {
    try {
      let result: any;

      switch (action.type) {
        case 'read_vault': {
          const projects = await this.vault.getProjects('active');
          result = `Found ${projects.length} active projects: ${projects.map(p => p.title).join(', ')}`;
          break;
        }
        case 'search_memory': {
          result = await mem0Service.searchMemories(action.description, { limit: 5 });
          break;
        }
        case 'generate_summary':
        case 'run_inference_analysis': {
          result = await cachedInference.complete(
            action.description,
            'You are an analytical assistant. Provide a concise analysis.',
            'summarization',
            'standard',
            { max_tokens: 500 }
          );
          this.state.daily_stats.ai_calls_made++;
          break;
        }
        case 'assemble_context': {
          result = await mem0Service.assembleContext(
            action.project_id || '',
            action.description
          );
          break;
        }
        case 'monitor_services': {
          try {
            const res = await fetch('http://localhost:3001/health');
            result = { status: res.status, ok: res.ok };
          } catch {
            result = { status: 'unreachable', ok: false };
          }
          break;
        }
        case 'council_evaluation': {
          const toolResult = await toolRunner.execute('ai-council', action.parameters || {});
          result = toolResult.data;
          await this.logActivity('tool_executed', `Executed council evaluation`, {
            action_type: action.type,
            project_id: action.project_id,
            result: toolResult.success ? 'success' : 'failure',
          });
          break;
        }
        case 'create_tasks_from_verdict': {
          if (action.parameters?.tasks && Array.isArray(action.parameters.tasks)) {
            for (const taskData of action.parameters.tasks) {
              await this.vault.createTask(taskData);
            }
            result = `Created ${action.parameters.tasks.length} tasks`;
          }
          break;
        }
        default: {
          // Try tool runner for any other action type
          const toolResult = await toolRunner.execute(action.type, action.parameters || {});
          if (toolResult.success) {
            result = toolResult.data;
            await this.logActivity('tool_executed', `Executed tool: ${action.type}`, {
              action_type: action.type,
              project_id: action.project_id,
              result: 'success',
              metadata: { execution_ms: toolResult.execution_ms },
            });
          } else {
            console.log(`${LOG_PREFIX} No handler for action type: ${action.type}`);
            return true; // Non-fatal: just no handler
          }
          break;
        }
      }

      console.log(`${LOG_PREFIX} Action executed: ${action.type}`, typeof result === 'string' ? result.slice(0, 100) : '');
      return true;
    } catch (err: any) {
      console.error(`${LOG_PREFIX} Action execution failed (${action.type}):`, err.message);
      return false;
    }
  }

  async processApproval(approvalId: string, approved: boolean, feedback?: string): Promise<AgentResponse> {
    const resolved = await trustGate.resolveApproval(approvalId, approved, feedback);
    if (!resolved) {
      return { message: 'Approval not found or already resolved', state: this.state };
    }

    if (approved) {
      this.state.daily_stats.actions_approved++;
      this.state.daily_stats.actions_executed++;
      console.log(`${LOG_PREFIX} Executing approved action: ${resolved.action.description}`);

      // Execute the approved action
      const result = await this.executeApprovedAction(resolved.action);
      await this.logActivity('action_approved', `Approved and executed: ${resolved.action.description}`, {
        action_type: resolved.action.type,
        project_id: resolved.action.project_id,
        tier: resolved.tier,
        result: result ? 'success' : 'failure',
      });
    } else {
      this.state.daily_stats.actions_rejected++;
      console.log(`${LOG_PREFIX} Action rejected: ${resolved.action.description}`);
      await this.logActivity('action_rejected', `Rejected: ${resolved.action.description}`, {
        action_type: resolved.action.type,
        tier: resolved.tier,
        metadata: { feedback },
      });
    }

    // Refresh approvals list
    this.state.pending_approvals = await trustGate.getPendingApprovals();
    this.state.delayed_executions = this.state.pending_approvals.filter(
      a => a.tier === 2 && a.status === 'pending'
    );

    await notificationRouter.send({
      type: 'verdict_delivered',
      priority: 'medium',
      title: approved ? 'Action approved' : 'Action rejected',
      body: `${resolved.action.description}${feedback ? ` — ${feedback}` : ''}`,
    });

    await this.persistState();

    return {
      message: approved ? `Approved: ${resolved.action.description}` : `Rejected: ${resolved.action.description}`,
      actions_taken: [approved ? 'approve_action' : 'reject_action'],
      state: this.state,
    };
  }

  async sendMessage(message: string): Promise<AgentResponse> {
    this.state.daily_stats.ai_calls_made++;

    // Build context about agent state
    const stateContext = `Current agent state: ${this.state.status}. ` +
      `Active projects: ${this.state.active_work_plan?.items.length || 0} work plan items. ` +
      `Pending approvals: ${this.state.pending_approvals.length}. ` +
      `Last briefing: ${this.state.last_briefing_at || 'never'}. ` +
      `Today's stats: ${this.state.daily_stats.actions_executed} actions executed, ` +
      `${this.state.daily_stats.briefings_generated} briefings generated.`;

    try {
      const response = await cachedInference.complete(
        `${stateContext}\n\nUser message: ${message}`,
        `You are Nitara, an AI business partner for solo entrepreneurs. You help the founder manage their projects, prioritize work, and make strategic decisions. Be concise and actionable. If the user asks about project status, portfolio health, or next steps, use the context provided. For actions that would require executing tools, mention what you would recommend doing.`,
        'conversation',
        'standard',
        { max_tokens: 1000, temperature: 0.6 }
      );

      await this.logActivity('message_sent', `Responded to: "${message.slice(0, 60)}"`, {
        metadata: { response_length: response.length },
      });

      await this.persistState();

      return {
        message: response,
        state: this.state,
      };
    } catch (err: any) {
      console.error(`${LOG_PREFIX} Message handling failed:`, err.message);
      return {
        message: `I encountered an error processing your message: ${err.message}`,
        state: this.state,
      };
    }
  }

  getState(): CoreAgentState {
    return { ...this.state };
  }

  async pause(): Promise<void> {
    await this.transition('paused');
    await this.logActivity('state_change', 'Agent paused by user');
  }

  async resume(): Promise<void> {
    await this.transition('idle');
    await this.logActivity('state_change', 'Agent resumed by user');
  }

  private async transition(newStatus: AgentStatus): Promise<void> {
    const oldStatus = this.state.status;
    this.state.status = newStatus;
    this.state.updated_at = new Date().toISOString();
    await this.persistState();

    sseManager.broadcast('agent_state', { status: newStatus, previous: oldStatus });
    console.log(`${LOG_PREFIX} ${oldStatus} → ${newStatus}`);
  }

  private async persistState(): Promise<void> {
    this.state.updated_at = new Date().toISOString();
    await writeJsonFile(STATE_PATH, this.state);
  }
}

export const coreAgent = new CoreAgentService();
