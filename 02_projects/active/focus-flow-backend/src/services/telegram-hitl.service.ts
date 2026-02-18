import { Bot, Context, InlineKeyboard } from 'grammy';
import fs from 'fs';
import path from 'path';
import { getVaultPath, readJsonFile, writeJsonFile, listFiles, ensureDir } from '../utils/file-operations';
import { taskQueueService, QueueTask } from './task-queue.service';
import { onboardingSessionService } from './onboarding-session.service';
import { orchestratorService } from '../orchestrator/orchestrator.service';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PendingQuestion {
  question_id: string;
  task_id?: string;
  question_text: string;
  question_type: 'approval' | 'profiling' | 'choice' | 'free_text';
  choices?: string[];
  context?: string;
  domain?: string;
  priority?: string;
  triggered_by?: string;
  created_at: string;
}

interface AnsweredQuestion {
  question_id: string;
  answer: string;
  auto_approved?: boolean;
  approved_at: string;
  reason?: string;
  answered_by?: string;
}

interface HITLState {
  question_to_message: Record<string, number>; // questionId → telegramMessageId
  last_checked: string;
  onboarding_active?: boolean;
  telegram_thread_id?: string; // orchestrator conversation thread for Telegram AI chat
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PENDING_DIR = '07_system/agent/pending-questions';
const ANSWERED_DIR = '07_system/agent/answered-questions';
const HITL_STATE_PATH = '07_system/agent/hitl-state.json';
const TELEGRAM_ENV_PATH = '07_system/secrets/.telegram.env';
const HITL_TIMEOUT_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

// ─── Service ─────────────────────────────────────────────────────────────────

class TelegramHitlService {
  private bot: Bot | null = null;
  private ownerChatId: string = '';
  private ownerId: number = 0;
  private state: HITLState = { question_to_message: {}, last_checked: '' };
  private watcher: fs.FSWatcher | null = null;
  private timeoutChecker: NodeJS.Timeout | null = null;
  private initialized = false;

  async initialize(): Promise<boolean> {
    // Load Telegram credentials
    const creds = this.loadCredentials();
    if (!creds) {
      console.log('[TelegramHITL] Telegram not configured — skipping initialization');
      return false;
    }

    try {
      this.bot = new Bot(creds.botToken);
      this.ownerChatId = creds.chatId;
      this.ownerId = parseInt(creds.ownerId, 10);

      // Load persisted state
      this.state = await readJsonFile<HITLState>(getVaultPath(HITL_STATE_PATH)) || {
        question_to_message: {},
        last_checked: new Date().toISOString(),
      };

      // Register command handlers
      this.registerCommands();

      // Register callback query handler
      this.bot.on('callback_query:data', (ctx) => this.handleCallback(ctx));

      // Register text message handler (for free-text replies)
      this.bot.on('message:text', (ctx) => this.handleTextReply(ctx));

      // Watch pending-questions directory for new files
      await ensureDir(getVaultPath(PENDING_DIR));
      await ensureDir(getVaultPath(ANSWERED_DIR));
      this.startWatching();

      // Start HITL timeout checker
      this.timeoutChecker = setInterval(() => this.checkTimeouts(), HITL_TIMEOUT_CHECK_INTERVAL);

      // Process any existing pending questions
      await this.processExistingPending();

      // Delete any existing webhook and start long polling
      await this.bot.api.deleteWebhook();
      this.bot.start({
        onStart: () => console.log('[TelegramHITL] Long polling started'),
        allowed_updates: ['message', 'callback_query'],
      });

      this.initialized = true;
      console.log('[TelegramHITL] Initialized with long polling');

      return true;
    } catch (err) {
      console.error('[TelegramHITL] Initialization failed:', err);
      return false;
    }
  }

  getBot(): Bot | null {
    return this.bot;
  }

  async shutdown(): Promise<void> {
    if (this.bot) {
      await this.bot.stop();
    }
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    if (this.timeoutChecker) {
      clearInterval(this.timeoutChecker);
      this.timeoutChecker = null;
    }
    this.initialized = false;
  }

  // ─── Security ──────────────────────────────────────────────────────────────

  private isOwner(ctx: Context): boolean {
    return ctx.from?.id === this.ownerId;
  }

  private guardOwner(ctx: Context): boolean {
    if (!this.isOwner(ctx)) {
      ctx.reply('Unauthorized.');
      return false;
    }
    return true;
  }

  // ─── Commands ──────────────────────────────────────────────────────────────

  private registerCommands(): void {
    if (!this.bot) return;

    this.bot.command('status', (ctx) => this.cmdStatus(ctx));
    this.bot.command('tasks', (ctx) => this.cmdTasks(ctx));
    this.bot.command('approve', (ctx) => this.cmdApprove(ctx));
    this.bot.command('reject', (ctx) => this.cmdReject(ctx));
    this.bot.command('budget', (ctx) => this.cmdBudget(ctx));
    this.bot.command('pause', (ctx) => this.cmdPause(ctx));
    this.bot.command('resume', (ctx) => this.cmdResume(ctx));
    this.bot.command('enable', (ctx) => this.cmdEnable(ctx));
    this.bot.command('profiling', (ctx) => this.cmdProfiling(ctx));
    this.bot.command('start', (ctx) => this.cmdStart(ctx));
    this.bot.command('help', (ctx) => this.cmdHelp(ctx));
    this.bot.command('onboard', (ctx) => this.cmdOnboard(ctx));
  }

  private async cmdStart(ctx: Context): Promise<void> {
    if (!this.guardOwner(ctx)) return;
    await ctx.reply(
      '✦ *Nitara Autonomous Agent*\n\n' +
      'Your AI co-founder is online. They are monitoring your portfolio, ' +
      'researching opportunities, and managing tasks.\n\n' +
      'Use /help to see available commands.',
      { parse_mode: 'Markdown' }
    );
  }

  private async cmdHelp(ctx: Context): Promise<void> {
    if (!this.guardOwner(ctx)) return;
    await ctx.reply(
      '✦ *Nitara Commands*\n\n' +
      '/status — Active tasks, queue depth, spend\n' +
      '/tasks — Top 10 queued tasks\n' +
      '/approve {id} — Approve a pending task\n' +
      '/reject {id} — Reject a pending task\n' +
      '/budget — Spending vs daily/weekly budget\n' +
      '/onboard — Start founder profiling session\n' +
      '/pause — Activate kill switch (stop all)\n' +
      '/resume — Deactivate kill switch\n' +
      '/enable — Reset circuit breaker\n' +
      '/profiling — Profiling completeness + gaps',
      { parse_mode: 'Markdown' }
    );
  }

  private async cmdStatus(ctx: Context): Promise<void> {
    if (!this.guardOwner(ctx)) return;

    const stats = await taskQueueService.getStats();
    const statusEmoji = stats.kill_switch_active ? '🔴' : '🟢';

    await ctx.reply(
      `✦ *Nitara Status* ${statusEmoji}\n\n` +
      `Running: ${stats.running_count}\n` +
      `Queued: ${stats.queued_count}\n` +
      `Completed today: ${stats.completed_today}\n` +
      `Failed today: ${stats.failed_today}\n` +
      `Daily cost: $${stats.daily_cost_usd}\n` +
      `Tool calls today: ${stats.daily_tool_calls}\n` +
      `Kill switch: ${stats.kill_switch_active ? 'ACTIVE' : 'off'}`,
      { parse_mode: 'Markdown' }
    );
  }

  private async cmdTasks(ctx: Context): Promise<void> {
    if (!this.guardOwner(ctx)) return;

    const tasks = await taskQueueService.getAllTasks();
    const queued = tasks
      .filter(t => t.status === 'queued' || t.status === 'running')
      .slice(0, 10);

    if (queued.length === 0) {
      await ctx.reply('✦ No active or queued tasks.');
      return;
    }

    const lines = queued.map((t, i) => {
      const icon = t.status === 'running' ? '⚡' : '⏳';
      return `${i + 1}. ${icon} /${t.skill} ${t.arguments || ''}\n   ${t.priority}${t.directive_aligned ? ' +directive' : ''} | ${t.status}`;
    });

    await ctx.reply(
      `✦ *Tasks* (${queued.length})\n\n${lines.join('\n\n')}`,
      { parse_mode: 'Markdown' }
    );
  }

  private async cmdApprove(ctx: Context): Promise<void> {
    if (!this.guardOwner(ctx)) return;
    const taskId = ctx.message?.text?.split(' ')[1];
    if (!taskId) {
      await ctx.reply('Usage: /approve {task-id}');
      return;
    }
    await this.answerQuestion(taskId, 'approved', 'owner');
    await ctx.reply(`✦ Approved: ${taskId}`);
  }

  private async cmdReject(ctx: Context): Promise<void> {
    if (!this.guardOwner(ctx)) return;
    const taskId = ctx.message?.text?.split(' ')[1];
    if (!taskId) {
      await ctx.reply('Usage: /reject {task-id}');
      return;
    }
    await this.answerQuestion(taskId, 'rejected', 'owner');
    await ctx.reply(`✦ Rejected: ${taskId}`);
  }

  private async cmdBudget(ctx: Context): Promise<void> {
    if (!this.guardOwner(ctx)) return;

    const stats = await taskQueueService.getStats();
    const budget = await readJsonFile<any>(getVaultPath('07_system/agent/cost-budget.json'));
    const dailyBudget = budget?.daily_budget_usd || 20;
    const weeklyBudget = budget?.weekly_budget_usd || 100;
    const pct = Math.round((stats.daily_cost_usd / dailyBudget) * 100);

    await ctx.reply(
      `✦ *Budget*\n\n` +
      `Daily: $${stats.daily_cost_usd} / $${dailyBudget} (${pct}%)\n` +
      `Tool calls: ${stats.daily_tool_calls} / ${budget?.max_daily_tool_calls || 500}\n` +
      `${pct > 80 ? '⚠️ Approaching daily limit' : '✅ Within budget'}`,
      { parse_mode: 'Markdown' }
    );
  }

  private async cmdPause(ctx: Context): Promise<void> {
    if (!this.guardOwner(ctx)) return;
    await taskQueueService.activateKillSwitch();
    await ctx.reply('🔴 Kill switch activated. All autonomous operations paused.\nUse /resume to restart.');
  }

  private async cmdResume(ctx: Context): Promise<void> {
    if (!this.guardOwner(ctx)) return;
    await taskQueueService.deactivateKillSwitch();
    await ctx.reply('🟢 Kill switch deactivated. Autonomous operations resumed.');
  }

  private async cmdEnable(ctx: Context): Promise<void> {
    if (!this.guardOwner(ctx)) return;
    const cbPath = getVaultPath('07_system/agent/circuit-breaker.json');
    await writeJsonFile(cbPath, { consecutive_failures: 0, last_failure_at: new Date().toISOString() });
    await ctx.reply('✦ Circuit breaker reset. Task execution enabled.');
  }

  private async cmdProfiling(ctx: Context): Promise<void> {
    if (!this.guardOwner(ctx)) return;

    const checklist = await readJsonFile<any>(getVaultPath('07_system/agent/profiling-checklist.json'));
    if (!checklist) {
      await ctx.reply('✦ Profiling checklist not found.');
      return;
    }

    const overall = checklist.overall_completeness_pct || 0;
    const domains = checklist.domains || [];

    const lines = domains.map((d: any) => {
      const pct = d.completeness_pct || 0;
      const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
      return `${d.name}: ${bar} ${pct}%`;
    });

    await ctx.reply(
      `✦ *Profiling Completeness: ${overall}%*\n\n${lines.join('\n')}`,
      { parse_mode: 'Markdown' }
    );
  }

  // ─── Onboarding ───────────────────────────────────────────────────────────

  private async cmdOnboard(ctx: Context): Promise<void> {
    if (!this.guardOwner(ctx)) return;

    const { message, resumed } = await onboardingSessionService.startSession();
    this.state.onboarding_active = true;
    await this.saveState();

    if (resumed) {
      await ctx.reply(`✦ ${message}`);
      // Generate the continuation question
      const result = await onboardingSessionService.processAnswer('[resuming session]');
      if (result.nitara_message) {
        await ctx.reply(result.nitara_message);
      }
    } else {
      await ctx.reply(message);
    }
  }

  private async handleOnboardingMessage(ctx: Context): Promise<void> {
    const text = (ctx.message?.text || '').trim();
    if (!text) return;

    const lower = text.toLowerCase();

    // Handle special keywords
    if (lower === 'pause' || lower === 'stop') {
      const msg = await onboardingSessionService.pauseSession();
      this.state.onboarding_active = false;
      await this.saveState();
      await ctx.reply(`✦ ${msg}`);
      return;
    }

    if (lower === 'skip') {
      const result = await onboardingSessionService.skipQuestion();
      await this.sendOnboardingResponse(ctx, result);
      return;
    }

    // Send typing indicator
    await ctx.replyWithChatAction('typing');

    const result = await onboardingSessionService.processAnswer(text);
    await this.sendOnboardingResponse(ctx, result);
  }

  private async sendOnboardingResponse(
    ctx: Context,
    result: { nitara_message: string; phase_changed: boolean; new_phase?: string; session_status: string }
  ): Promise<void> {
    if (result.phase_changed && result.new_phase && result.new_phase !== 'wrapup') {
      const phaseLabels: Record<string, string> = {
        strategic_vision: 'Strategic Vision',
        financial_reality: 'Financial Reality',
        working_style: 'Working Style',
        network_import: 'Network & Relationships',
        portfolio_review: 'Portfolio Review',
        wrapup: 'Wrapup',
      };
      const label = phaseLabels[result.new_phase] || result.new_phase;
      await ctx.reply(`── ${label} ──`);
    }

    await ctx.reply(result.nitara_message);

    if (result.session_status === 'completed') {
      this.state.onboarding_active = false;
      await this.saveState();
    }
  }

  // ─── Callback Queries (inline button responses) ────────────────────────────

  private async handleCallback(ctx: Context): Promise<void> {
    if (!this.guardOwner(ctx)) return;

    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const [action, questionId, ...rest] = data.split(':');

    switch (action) {
      case 'approve':
        await this.answerQuestion(questionId, 'approved', 'owner');
        await ctx.answerCallbackQuery({ text: 'Approved' });
        await ctx.editMessageReplyMarkup({ reply_markup: undefined });
        await ctx.reply(`✦ Approved: ${questionId}`);
        break;
      case 'reject':
        await this.answerQuestion(questionId, 'rejected', 'owner');
        await ctx.answerCallbackQuery({ text: 'Rejected' });
        await ctx.editMessageReplyMarkup({ reply_markup: undefined });
        await ctx.reply(`✦ Rejected: ${questionId}`);
        break;
      case 'choice':
        const value = rest.join(':');
        await this.answerQuestion(questionId, value, 'owner');
        await ctx.answerCallbackQuery({ text: `Selected: ${value}` });
        await ctx.editMessageReplyMarkup({ reply_markup: undefined });
        break;
      default:
        await ctx.answerCallbackQuery({ text: 'Unknown action' });
    }
  }

  // ─── Text Replies (for profiling free-text answers) ────────────────────────

  private async handleTextReply(ctx: Context): Promise<void> {
    if (!this.guardOwner(ctx)) return;

    // If onboarding is active, route ALL non-command text to onboarding
    if (this.state.onboarding_active) {
      const text = ctx.message?.text || '';
      if (!text.startsWith('/')) {
        await this.handleOnboardingMessage(ctx);
        return;
      }
    }

    // Handle replies to specific bot messages (profiling questions)
    if (ctx.message?.reply_to_message) {
      const replyToId = ctx.message.reply_to_message.message_id;
      const answerText = ctx.message.text || '';

      for (const [questionId, messageId] of Object.entries(this.state.question_to_message)) {
        if (messageId === replyToId) {
          await this.answerQuestion(questionId, answerText, 'owner');
          await ctx.reply(`✦ Answer recorded for ${questionId}. Nitara will continue.`);
          return;
        }
      }
    }

    // Plain text (not a reply) — route through orchestrator AI
    await this.routeToOrchestrator(ctx);
  }

  // ─── Orchestrator AI Chat ─────────────────────────────────────────────────

  private async routeToOrchestrator(ctx: Context): Promise<void> {
    const text = (ctx.message?.text || '').trim();
    if (!text || !this.bot) return;

    // Show typing indicator, refresh every 4s (Telegram expires after 5s)
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    await ctx.replyWithChatAction('typing');
    const typingInterval = setInterval(() => {
      this.bot!.api.sendChatAction(chatId, 'typing').catch(() => {});
    }, 4000);

    try {
      const response = await orchestratorService.chat(
        text,
        this.state.telegram_thread_id,
        'text',
        {}
      );

      // Persist thread_id for conversation continuity
      if (response.thread_id && response.thread_id !== this.state.telegram_thread_id) {
        this.state.telegram_thread_id = response.thread_id;
        await this.saveState();
      }

      const reply = response.content || '(No response from Nitara)';
      await this.sendLongMessage(chatId, reply);
    } catch (err: any) {
      console.error('[TelegramHITL] Orchestrator error:', err.message);
      await ctx.reply('Something went wrong reaching Nitara\'s brain. Try again in a moment.');
    } finally {
      clearInterval(typingInterval);
    }
  }

  private async sendLongMessage(chatId: number | string, text: string): Promise<void> {
    if (!this.bot) return;
    const MAX_LEN = 4096;

    if (text.length <= MAX_LEN) {
      await this.trySendMarkdown(chatId, text);
      return;
    }

    // Split into chunks respecting paragraph > line > space > hard-cut boundaries
    let remaining = text;
    while (remaining.length > 0) {
      if (remaining.length <= MAX_LEN) {
        await this.trySendMarkdown(chatId, remaining);
        break;
      }

      let splitAt = remaining.lastIndexOf('\n\n', MAX_LEN);
      if (splitAt < MAX_LEN * 0.3) splitAt = remaining.lastIndexOf('\n', MAX_LEN);
      if (splitAt < MAX_LEN * 0.3) splitAt = remaining.lastIndexOf(' ', MAX_LEN);
      if (splitAt < MAX_LEN * 0.3) splitAt = MAX_LEN;

      await this.trySendMarkdown(chatId, remaining.substring(0, splitAt));
      remaining = remaining.substring(splitAt).trimStart();
    }
  }

  private async trySendMarkdown(chatId: number | string, text: string): Promise<void> {
    if (!this.bot) return;
    try {
      await this.bot.api.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch {
      // Markdown parse failed — send as plain text
      await this.bot.api.sendMessage(chatId, text);
    }
  }

  // ─── Outbound (question watching) ──────────────────────────────────────────

  private startWatching(): void {
    const dir = getVaultPath(PENDING_DIR);
    try {
      this.watcher = fs.watch(dir, (eventType, filename) => {
        if (eventType === 'rename' && filename && filename.endsWith('.json')) {
          // Small delay to let the file be fully written
          setTimeout(() => this.sendPendingQuestion(filename), 500);
        }
      });
    } catch (err) {
      console.error('[TelegramHITL] Failed to watch pending-questions:', err);
    }
  }

  private async processExistingPending(): Promise<void> {
    try {
      const files = await listFiles(getVaultPath(PENDING_DIR));
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        // Check if already answered
        const questionId = path.basename(file, '.json');
        const answerExists = fs.existsSync(getVaultPath(ANSWERED_DIR, `${questionId}.json`));
        if (!answerExists && !this.state.question_to_message[questionId]) {
          await this.sendPendingQuestion(file);
        }
      }
    } catch (err) {
      console.error('[TelegramHITL] Error processing existing pending:', err);
    }
  }

  private async sendPendingQuestion(filename: string): Promise<void> {
    if (!this.bot || !this.ownerChatId) return;

    const filePath = getVaultPath(PENDING_DIR, filename);
    const question = await readJsonFile<PendingQuestion>(filePath);
    if (!question) return;

    try {
      let keyboard: InlineKeyboard | undefined;
      let message = '';

      switch (question.question_type) {
        case 'approval':
          message = `✦ *Approval Required*\n\n${question.question_text}`;
          if (question.context) message += `\n\n_Context: ${question.context}_`;
          keyboard = new InlineKeyboard()
            .text('✅ Approve', `approve:${question.question_id}`)
            .text('❌ Reject', `reject:${question.question_id}`);
          break;

        case 'profiling':
          message = `✦ *Nitara wants to know:*\n\n${question.question_text}`;
          if (question.context) message += `\n\n_${question.context}_`;
          message += '\n\n_Reply to this message with your answer._';
          break;

        case 'choice':
          message = `✦ *Choose:*\n\n${question.question_text}`;
          keyboard = new InlineKeyboard();
          for (const choice of question.choices || []) {
            keyboard.text(choice, `choice:${question.question_id}:${choice}`).row();
          }
          break;

        default:
          message = `✦ ${question.question_text}`;
          message += '\n\n_Reply to this message with your answer._';
      }

      const sent = await this.bot.api.sendMessage(this.ownerChatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });

      // Track mapping
      this.state.question_to_message[question.question_id] = sent.message_id;
      await this.saveState();

      console.log(`[TelegramHITL] Sent question ${question.question_id} as message ${sent.message_id}`);
    } catch (err) {
      console.error(`[TelegramHITL] Failed to send question ${question.question_id}:`, err);
    }
  }

  // ─── Answer Processing ─────────────────────────────────────────────────────

  private async answerQuestion(questionId: string, answer: string, answeredBy: string): Promise<void> {
    const answerData: AnsweredQuestion = {
      question_id: questionId,
      answer,
      approved_at: new Date().toISOString(),
      answered_by: answeredBy,
    };

    await writeJsonFile(getVaultPath(ANSWERED_DIR, `${questionId}.json`), answerData);

    // Find and resume any paused task linked to this question
    const tasks = await taskQueueService.getAllTasks('paused');
    for (const task of tasks) {
      if (task.hitl_question_id === questionId) {
        // Requeue with answer file
        const answerPath = getVaultPath(ANSWERED_DIR, `${questionId}.json`);
        task.status = 'queued';
        task.answer_file = answerPath;
        // Save through the queue service by re-enqueuing logic
        await writeJsonFile(getVaultPath('07_system/agent/queue', `${task.id}.json`), task);
        console.log(`[TelegramHITL] Resumed task ${task.id} with answer for ${questionId}`);
        break;
      }
    }

    // Clean up state
    delete this.state.question_to_message[questionId];
    await this.saveState();
  }

  // ─── HITL Timeouts ─────────────────────────────────────────────────────────

  private async checkTimeouts(): Promise<void> {
    // This is also handled by the task queue, but we send reminders here
    if (!this.bot || !this.ownerChatId) return;

    const tasks = await taskQueueService.getAllTasks('paused');

    for (const task of tasks) {
      if (!task.hitl_question_id || !task.started_at) continue;

      const hoursPaused = (Date.now() - new Date(task.started_at).getTime()) / (1000 * 60 * 60);
      const halfTimeout = task.hitl_timeout_hours / 2;

      // Send reminder at 50% timeout for Tier 3
      if (task.trust_tier === 3 && hoursPaused >= halfTimeout && hoursPaused < halfTimeout + 0.1) {
        try {
          await this.bot.api.sendMessage(
            this.ownerChatId,
            `⏰ *Reminder*: Task \`${task.id}\` (/${task.skill}) is waiting for your response.\n` +
            `It will be auto-rejected in ${Math.round(task.hitl_timeout_hours - hoursPaused)} hours.`,
            { parse_mode: 'Markdown' }
          );
        } catch { /* ignore send failures */ }
      }
    }
  }

  // ─── Send Notification ─────────────────────────────────────────────────────

  async sendNotification(message: string): Promise<boolean> {
    if (!this.bot || !this.ownerChatId) return false;

    try {
      await this.bot.api.sendMessage(this.ownerChatId, message, { parse_mode: 'Markdown' });
      return true;
    } catch (err) {
      console.error('[TelegramHITL] Failed to send notification:', err);
      return false;
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private loadCredentials(): { botToken: string; chatId: string; ownerId: string } | null {
    const envPath = getVaultPath(TELEGRAM_ENV_PATH);
    if (!fs.existsSync(envPath)) return null;

    const content = fs.readFileSync(envPath, 'utf-8');
    const vars: Record<string, string> = {};

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...rest] = trimmed.split('=');
      vars[key.trim()] = rest.join('=').trim();
    }

    const botToken = vars.TELEGRAM_BOT_TOKEN;
    const chatId = vars.TELEGRAM_CHAT_ID;
    const ownerId = vars.OWNER_TELEGRAM_ID;

    if (!botToken || !chatId || !ownerId ||
        botToken === 'placeholder_replace_me' ||
        chatId === 'placeholder_replace_me') {
      return null;
    }

    return { botToken, chatId, ownerId };
  }

  private async saveState(): Promise<void> {
    this.state.last_checked = new Date().toISOString();
    await writeJsonFile(getVaultPath(HITL_STATE_PATH), this.state);
  }
}

export const telegramHitlService = new TelegramHitlService();
