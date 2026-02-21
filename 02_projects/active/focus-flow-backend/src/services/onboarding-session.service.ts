import fs from 'fs/promises';
import { getVaultPath, readJsonFile, writeJsonFile } from '../utils/file-operations';
import { cachedInference } from './cached-inference.service';
import { founderProfileService } from './founder-profile.service';

// ─── Types ───────────────────────────────────────────────────────────────────

export type OnboardingPhase =
  | 'welcome'
  | 'strategic_vision'
  | 'financial_reality'
  | 'working_style'
  | 'network_import'
  | 'portfolio_review'
  | 'wrapup';

interface ConversationTurn {
  role: 'nitara' | 'founder';
  content: string;
  phase: OnboardingPhase;
  timestamp: string;
}

interface OnboardingSession {
  id: string;
  status: 'idle' | 'active' | 'paused' | 'completed';
  current_phase: OnboardingPhase;
  phase_index: number;
  conversation_history: ConversationTurn[];
  extracted_data: Record<string, any>;
  started_at: string;
  updated_at: string;
  completed_phases: string[];
}

export interface ProcessAnswerResult {
  nitara_message: string;
  phase_changed: boolean;
  new_phase?: OnboardingPhase;
  session_status: OnboardingSession['status'];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SESSION_PATH = '07_system/agent/onboarding-session.json';
const CHECKLIST_PATH = '07_system/agent/profiling-checklist.json';
const NITARA_SOUL_PATH = '07_system/NITARA_SOUL.md';

const PHASE_ORDER: OnboardingPhase[] = [
  'welcome',
  'strategic_vision',
  'financial_reality',
  'working_style',
  'network_import',
  'portfolio_review',
  'wrapup',
];

const PHASE_CONFIG: Record<OnboardingPhase, {
  label: string;
  maxTurns: number;
  targetKeys: string[];
}> = {
  welcome: {
    label: 'Welcome',
    maxTurns: 1,
    targetKeys: [],
  },
  strategic_vision: {
    label: 'Strategic Vision',
    maxTurns: 5,
    targetKeys: ['vision_1yr', 'vision_3yr', 'definition_of_success', 'fears_concerns', 'business_type'],
  },
  financial_reality: {
    label: 'Financial Reality',
    maxTurns: 5,
    targetKeys: ['personal_burn', 'savings_runway', 'tax_situation', 'pricing_strategy', 'payment_terms'],
  },
  working_style: {
    label: 'Working Style',
    maxTurns: 4,
    targetKeys: ['working_style', 'daily_tools', 'biggest_time_sinks', 'delegation_wishes', 'energizers'],
  },
  network_import: {
    label: 'Network & Relationships',
    maxTurns: 3,
    targetKeys: ['key_relationships', 'partner_dynamics', 'referral_sources'],
  },
  portfolio_review: {
    label: 'Portfolio Review',
    maxTurns: 6,
    targetKeys: ['project_honest_status', 'project_blockers', 'kill_candidates', 'project_emotional_vs_strategic'],
  },
  wrapup: {
    label: 'Wrapup',
    maxTurns: 1,
    targetKeys: [],
  },
};

const WELCOME_MESSAGE = `Good morning, Vimo. I'm Nitara — your co-founder in this system.

I have your 17 projects, your revenue streams, and the basic profile you set up. But my picture has significant gaps. I know project names but not which ones you'd bet your year on. I know your revenue total but not your expense baseline.

I'd like to fix that. This conversation will take about 20-30 minutes and will dramatically sharpen every recommendation I give you going forward.

You can type "pause" anytime to stop and resume later. Type "skip" to move past any question.

Let's start with what matters most — where you want to be. If you look 12 months out from today and things have gone well, what does that look like for you?`;

// ─── Service ─────────────────────────────────────────────────────────────────

class OnboardingSessionService {
  private session: OnboardingSession | null = null;
  private nitaraSoul: string | null = null;

  private async loadSession(): Promise<OnboardingSession | null> {
    if (this.session) return this.session;
    this.session = await readJsonFile<OnboardingSession>(getVaultPath(SESSION_PATH));
    return this.session;
  }

  private async saveSession(session: OnboardingSession): Promise<void> {
    session.updated_at = new Date().toISOString();
    this.session = session;
    await writeJsonFile(getVaultPath(SESSION_PATH), session);
  }

  private async getNitaraSoul(): Promise<string> {
    if (this.nitaraSoul) return this.nitaraSoul;
    try {
      this.nitaraSoul = await fs.readFile(getVaultPath(NITARA_SOUL_PATH), 'utf-8');
    } catch {
      this.nitaraSoul = 'You are Nitara, an AI co-founder. Be direct, strategic, and genuinely curious.';
    }
    return this.nitaraSoul;
  }

  async getSessionState(): Promise<OnboardingSession | null> {
    return this.loadSession();
  }

  async startSession(): Promise<{ message: string; resumed: boolean }> {
    const existing = await this.loadSession();

    // Resume paused session
    if (existing && (existing.status === 'paused' || existing.status === 'active')) {
      existing.status = 'active';
      await this.saveSession(existing);
      const phase = PHASE_CONFIG[existing.current_phase];
      return {
        message: `Welcome back, Vimo. We left off in the "${phase.label}" phase. Let me pick up where we were.\n\nLet me continue with the next question...`,
        resumed: true,
      };
    }

    // Start fresh session
    const session: OnboardingSession = {
      id: `onboard-${Date.now()}`,
      status: 'active',
      current_phase: 'welcome',
      phase_index: 0,
      conversation_history: [{
        role: 'nitara',
        content: WELCOME_MESSAGE,
        phase: 'welcome',
        timestamp: new Date().toISOString(),
      }],
      extracted_data: {},
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_phases: [],
    };

    await this.saveSession(session);
    return { message: WELCOME_MESSAGE, resumed: false };
  }

  async processAnswer(text: string): Promise<ProcessAnswerResult> {
    const session = await this.loadSession();
    if (!session || session.status !== 'active') {
      return {
        nitara_message: 'No active onboarding session. Send /onboard to start one.',
        phase_changed: false,
        session_status: 'idle',
      };
    }

    // If still in welcome phase, auto-advance to strategic_vision
    if (session.current_phase === 'welcome') {
      session.completed_phases.push('welcome');
      session.current_phase = 'strategic_vision';
      session.phase_index = 1;
    }

    // Record the founder's answer
    session.conversation_history.push({
      role: 'founder',
      content: text,
      phase: session.current_phase,
      timestamp: new Date().toISOString(),
    });

    // Extract data from the answer
    await this.extractAndPersist(session, text);

    // Count turns in current phase
    const phaseTurns = session.conversation_history
      .filter(t => t.phase === session.current_phase && t.role === 'founder')
      .length;

    const config = PHASE_CONFIG[session.current_phase];
    const phaseIdx = PHASE_ORDER.indexOf(session.current_phase);

    // Check if we should advance phase
    let shouldAdvance = phaseTurns >= config.maxTurns;

    if (!shouldAdvance && phaseTurns >= 2) {
      // Ask LLM if enough info gathered for this phase
      shouldAdvance = await this.shouldAdvancePhase(session);
    }

    let phaseChanged = false;
    let newPhase: OnboardingPhase | undefined;

    if (shouldAdvance) {
      session.completed_phases.push(session.current_phase);
      const nextIdx = phaseIdx + 1;

      if (nextIdx >= PHASE_ORDER.length - 1) {
        // Wrapup phase
        session.current_phase = 'wrapup';
        session.phase_index = PHASE_ORDER.length - 1;
        phaseChanged = true;
        newPhase = 'wrapup';

        const wrapupMsg = await this.generateWrapup(session);
        session.conversation_history.push({
          role: 'nitara',
          content: wrapupMsg,
          phase: 'wrapup',
          timestamp: new Date().toISOString(),
        });
        session.completed_phases.push('wrapup');
        session.status = 'completed';
        await this.saveSession(session);

        return {
          nitara_message: wrapupMsg,
          phase_changed: true,
          new_phase: 'wrapup',
          session_status: 'completed',
        };
      }

      session.current_phase = PHASE_ORDER[nextIdx];
      session.phase_index = nextIdx;
      phaseChanged = true;
      newPhase = session.current_phase;
    }

    // Generate next question
    const nextQuestion = await this.generateNextQuestion(session);
    session.conversation_history.push({
      role: 'nitara',
      content: nextQuestion,
      phase: session.current_phase,
      timestamp: new Date().toISOString(),
    });

    await this.saveSession(session);

    return {
      nitara_message: nextQuestion,
      phase_changed: phaseChanged,
      new_phase: newPhase,
      session_status: session.status,
    };
  }

  async pauseSession(): Promise<string> {
    const session = await this.loadSession();
    if (!session || session.status !== 'active') {
      return 'No active session to pause.';
    }

    session.status = 'paused';
    await this.saveSession(session);

    const completedCount = session.completed_phases.length;
    const totalPhases = PHASE_ORDER.length;

    return `Session paused. We've covered ${completedCount} of ${totalPhases} areas. All your answers have been saved — nothing is lost.\n\nSend /onboard whenever you're ready to continue.`;
  }

  async skipQuestion(): Promise<ProcessAnswerResult> {
    const session = await this.loadSession();
    if (!session || session.status !== 'active') {
      return {
        nitara_message: 'No active session.',
        phase_changed: false,
        session_status: 'idle',
      };
    }

    // Generate next question in same phase, or advance if at max turns
    const phaseTurns = session.conversation_history
      .filter(t => t.phase === session.current_phase && t.role === 'nitara')
      .length;
    const config = PHASE_CONFIG[session.current_phase];

    if (phaseTurns >= config.maxTurns) {
      // Force advance
      return this.processAnswer('[skipped]');
    }

    const nextQuestion = await this.generateNextQuestion(session);
    session.conversation_history.push({
      role: 'nitara',
      content: nextQuestion,
      phase: session.current_phase,
      timestamp: new Date().toISOString(),
    });
    await this.saveSession(session);

    return {
      nitara_message: nextQuestion,
      phase_changed: false,
      session_status: 'active',
    };
  }

  // ─── LLM Calls ─────────────────────────────────────────────────────────────

  private async generateNextQuestion(session: OnboardingSession): Promise<string> {
    const soul = await this.getNitaraSoul();
    const phase = session.current_phase;
    const config = PHASE_CONFIG[phase];
    const checklist = await readJsonFile<any>(getVaultPath(CHECKLIST_PATH));

    // Get gaps for this phase
    const gapItems = this.getPhaseGaps(checklist, config.targetKeys);

    // Recent conversation context (last 6 turns)
    const recentHistory = session.conversation_history.slice(-6)
      .map(t => `${t.role === 'nitara' ? 'Nitara' : 'Vimo'}: ${t.content}`)
      .join('\n\n');

    const systemPrompt = `${soul}

You are conducting an onboarding conversation with your founder Vimo (Vikas Mohan).
Current phase: ${config.label}
Phase ${session.phase_index + 1} of ${PHASE_ORDER.length}.

Your goal: gather specific information to fill gaps in the founder profile.

Information gaps to fill in this phase:
${gapItems.map(g => `- ${g.label} (currently: ${g.status}${g.notes ? `, notes: ${g.notes}` : ''})`).join('\n')}

Rules:
- Ask ONE focused question at a time
- Be conversational, warm but direct — as described in NITARA_SOUL
- Reference what the founder just said to show you're listening
- Don't repeat questions already answered
- Keep questions concise (2-3 sentences max)
- Never use bullet points or structured formatting — this is a chat conversation`;

    const userPrompt = `Recent conversation:\n\n${recentHistory}\n\nGenerate Nitara's next question for the "${config.label}" phase. Ask about one of the remaining gaps. Return ONLY Nitara's message, no prefixes or labels.`;

    try {
      const response = await cachedInference.complete(
        userPrompt,
        systemPrompt,
        'conversation',
        'standard',
        { max_tokens: 300, temperature: 0.7, caller: 'onboarding-session' }
      );
      return response.trim();
    } catch (err: any) {
      console.error('[Onboarding] Question generation failed:', err.message);
      return "I'd like to continue, but I'm having a moment. Could you tell me more about what we were just discussing?";
    }
  }

  private async extractAndPersist(session: OnboardingSession, answer: string): Promise<void> {
    const phase = session.current_phase;
    const config = PHASE_CONFIG[phase];

    // Get recent context
    const recentHistory = session.conversation_history.slice(-4)
      .map(t => `${t.role === 'nitara' ? 'Nitara' : 'Vimo'}: ${t.content}`)
      .join('\n\n');

    const systemPrompt = `You are a data extraction system. Extract structured profile data from a founder's answer.

Current onboarding phase: ${config.label}
Target profile keys: ${config.targetKeys.join(', ')}

Return ONLY valid JSON with these fields:
{
  "profile_updates": {
    "key": "value"  // keys matching founder.json fields: bio, location, timezone, etc.
  },
  "checklist_updates": [
    {
      "domain": "domain_name",  // e.g. strategic_context, financial_reality, operational_reality, network_intelligence, portfolio_depth, founder_identity, skills_expertise
      "key": "item_key",
      "status": "known" | "partial",
      "notes": "extracted information"
    }
  ]
}

Only extract what is clearly stated. Do not infer or assume. If nothing useful is found, return {"profile_updates": {}, "checklist_updates": []}.`;

    const userPrompt = `Conversation context:\n\n${recentHistory}\n\nExtract structured data from the founder's latest response.`;

    try {
      const response = await cachedInference.complete(
        userPrompt,
        systemPrompt,
        'memory_extraction',
        'economy',
        { max_tokens: 500, temperature: 0, caller: 'onboarding-extraction' }
      );

      // Parse JSON from response
      const cleaned = response
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;

      const extracted = JSON.parse(jsonMatch[0]);

      // Update founder profile
      if (extracted.profile_updates && Object.keys(extracted.profile_updates).length > 0) {
        await founderProfileService.saveProfile(extracted.profile_updates);
        Object.assign(session.extracted_data, extracted.profile_updates);
      }

      // Update profiling checklist
      if (extracted.checklist_updates && extracted.checklist_updates.length > 0) {
        await this.updateChecklist(extracted.checklist_updates);
      }
    } catch (err: any) {
      console.error('[Onboarding] Data extraction failed:', err.message);
    }
  }

  private async shouldAdvancePhase(session: OnboardingSession): Promise<boolean> {
    const config = PHASE_CONFIG[session.current_phase];
    const checklist = await readJsonFile<any>(getVaultPath(CHECKLIST_PATH));
    const gaps = this.getPhaseGaps(checklist, config.targetKeys);
    const unknownGaps = gaps.filter(g => g.status === 'unknown');

    // If all target keys are at least partial, advance
    if (unknownGaps.length === 0) return true;

    // If we have at least 2 turns and most gaps filled, advance
    const filledRatio = (gaps.length - unknownGaps.length) / Math.max(gaps.length, 1);
    return filledRatio >= 0.6;
  }

  private async generateWrapup(session: OnboardingSession): Promise<string> {
    const checklist = await readJsonFile<any>(getVaultPath(CHECKLIST_PATH));
    const overall = checklist?.overall_completeness || 16;

    // Recalculate completeness
    const newCompleteness = this.calculateCompleteness(checklist);
    if (checklist) {
      checklist.overall_completeness = newCompleteness;
      await writeJsonFile(getVaultPath(CHECKLIST_PATH), checklist);
    }

    const phasesCompleted = session.completed_phases.length;
    const answersGiven = session.conversation_history.filter(t => t.role === 'founder').length;

    return `That was genuinely useful, Vimo. Thank you for being candid.

Here's what changed: My profiling completeness went from ${overall}% to ${newCompleteness}%. We covered ${phasesCompleted} areas across ${answersGiven} exchanges.

Every recommendation I give you from now on — portfolio priorities, income strategies, network plays — will be significantly sharper because of this conversation.

I'll be reviewing what you shared and may follow up with specific questions as I connect the dots. For now, this session is complete.`;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private getPhaseGaps(checklist: any, targetKeys: string[]): Array<{ key: string; label: string; status: string; notes: string }> {
    if (!checklist?.domains) return [];

    const gaps: Array<{ key: string; label: string; status: string; notes: string }> = [];
    for (const domain of Object.values(checklist.domains) as any[]) {
      if (!domain.items) continue;
      for (const item of domain.items) {
        if (targetKeys.includes(item.key)) {
          gaps.push({
            key: item.key,
            label: item.label,
            status: item.status,
            notes: item.notes || '',
          });
        }
      }
    }
    return gaps;
  }

  private async updateChecklist(updates: Array<{ domain: string; key: string; status: string; notes: string }>): Promise<void> {
    const checklist = await readJsonFile<any>(getVaultPath(CHECKLIST_PATH));
    if (!checklist?.domains) return;

    for (const update of updates) {
      const domain = checklist.domains[update.domain];
      if (!domain?.items) continue;

      const item = domain.items.find((i: any) => i.key === update.key);
      if (item) {
        item.status = update.status;
        item.notes = update.notes;
        item.source = 'onboarding';
      }
    }

    // Recalculate domain completeness
    for (const [, domain] of Object.entries(checklist.domains) as [string, any][]) {
      if (!domain.items) continue;
      const known = domain.items.filter((i: any) => i.status === 'known').length;
      const partial = domain.items.filter((i: any) => i.status === 'partial').length;
      domain.completeness = Math.round(((known + partial * 0.5) / domain.items.length) * 100);
    }

    checklist.overall_completeness = this.calculateCompleteness(checklist);
    checklist.last_updated = new Date().toISOString().split('T')[0];
    await writeJsonFile(getVaultPath(CHECKLIST_PATH), checklist);
  }

  private calculateCompleteness(checklist: any): number {
    if (!checklist?.domains) return 0;
    const domains = Object.values(checklist.domains) as any[];
    if (domains.length === 0) return 0;
    const total = domains.reduce((sum: number, d: any) => sum + (d.completeness || 0), 0);
    return Math.round(total / domains.length);
  }
}

export const onboardingSessionService = new OnboardingSessionService();
