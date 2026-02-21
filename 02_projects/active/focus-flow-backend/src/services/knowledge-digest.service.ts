/**
 * Knowledge Digest Service — Nitara's World State
 *
 * Reads the full vault and produces a structured "World State" document
 * that Nitara always has loaded in her system prompt.
 *
 * Two tiers:
 * - Compact (~3-5K tokens): financial snapshot, project names, today's priorities
 * - Full (~15-20K tokens): everything + council scores, risks, memories, network
 */

import * as fs from 'fs';
import * as path from 'path';
import { VaultService } from './vault.service';
import { founderProfileService } from './founder-profile.service';
import { mem0Service } from './mem0.service';
import { agentMemoryService } from './agent-memory.service';
import { briefingGenerator } from './briefing-generator.service';
import { salesService } from './sales.service';
import { crmService } from './crm.service';
import { financialsService } from './financials.service';
import { incomeStrategyService } from './income-strategy.service';

const vaultService = new VaultService();
const DIGEST_DIR = '/srv/focus-flow/07_system/agent';
const COMPACT_PATH = path.join(DIGEST_DIR, 'knowledge-digest-compact.md');
const FULL_PATH = path.join(DIGEST_DIR, 'knowledge-digest-full.md');
const STATS_PATH = path.join(DIGEST_DIR, 'knowledge-digest-stats.json');
const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

interface DigestStats {
  last_updated: string;
  compact_tokens: number;
  full_tokens: number;
  project_count: number;
  task_count: number;
  memory_count: number;
  contact_count: number;
  deal_count: number;
}

class KnowledgeDigestService {
  private compactDigest: string = '';
  private fullDigest: string = '';
  private stats: DigestStats | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private isGenerating = false;

  async initialize(): Promise<void> {
    // Load cached digests if available
    try {
      if (fs.existsSync(COMPACT_PATH)) {
        this.compactDigest = fs.readFileSync(COMPACT_PATH, 'utf-8');
      }
      if (fs.existsSync(FULL_PATH)) {
        this.fullDigest = fs.readFileSync(FULL_PATH, 'utf-8');
      }
      if (fs.existsSync(STATS_PATH)) {
        this.stats = JSON.parse(fs.readFileSync(STATS_PATH, 'utf-8'));
      }
    } catch (e: any) {
      console.warn('[KnowledgeDigest] Failed to load cached digests:', e.message);
    }

    // Generate fresh digests in background
    this.regenerate().catch(err =>
      console.error('[KnowledgeDigest] Initial generation failed:', err.message)
    );

    // Schedule periodic refresh
    this.refreshTimer = setInterval(() => {
      this.regenerate().catch(err =>
        console.error('[KnowledgeDigest] Scheduled refresh failed:', err.message)
      );
    }, REFRESH_INTERVAL_MS);
  }

  async regenerate(): Promise<DigestStats> {
    if (this.isGenerating) {
      console.log('[KnowledgeDigest] Generation already in progress, skipping');
      return this.stats || { last_updated: '', compact_tokens: 0, full_tokens: 0, project_count: 0, task_count: 0, memory_count: 0, contact_count: 0, deal_count: 0 };
    }

    this.isGenerating = true;
    const startTime = Date.now();
    console.log('[KnowledgeDigest] Starting digest generation...');

    try {
      // Gather all data in parallel
      const [
        projects,
        tasks,
        ideas,
        profile,
        deals,
        contacts,
        financials,
        strategies,
        memories,
        briefing,
        experimentOutcomes,
        patterns,
        failurePatterns,
        networkInsights,
      ] = await Promise.allSettled([
        vaultService.getProjects(),
        vaultService.getTasks(),
        vaultService.getIdeas(),
        founderProfileService.getProfile(),
        salesService.getDeals(),
        crmService.getContacts(),
        financialsService.getPortfolioFinancials(),
        incomeStrategyService.getStrategies(),
        mem0Service.isAvailable ? mem0Service.getAllMemories() : Promise.resolve([]),
        briefingGenerator.getLatestBriefing(),
        agentMemoryService.getExperimentOutcomes(10),
        agentMemoryService.getPatterns(5),
        agentMemoryService.getFailurePatterns(5),
        agentMemoryService.getNetworkInsights(10),
      ]);

      const projectData = projects.status === 'fulfilled' ? projects.value : [];
      const taskData = tasks.status === 'fulfilled' ? tasks.value : [];
      const ideaData = ideas.status === 'fulfilled' ? ideas.value : [];
      const profileData = profile.status === 'fulfilled' ? profile.value : null;
      const dealData = deals.status === 'fulfilled' ? deals.value : [];
      const contactData = contacts.status === 'fulfilled' ? contacts.value : [];
      const financialData = financials.status === 'fulfilled' ? financials.value : null;
      const strategyData = strategies.status === 'fulfilled' ? strategies.value : [];
      const memoryData = memories.status === 'fulfilled' ? memories.value : [];
      const briefingData = briefing.status === 'fulfilled' ? briefing.value : null;
      const experimentOutcomeData = experimentOutcomes.status === 'fulfilled' ? experimentOutcomes.value : [];
      const patternData = patterns.status === 'fulfilled' ? patterns.value : [];
      const failurePatternData = failurePatterns.status === 'fulfilled' ? failurePatterns.value : [];
      const networkInsightData = networkInsights.status === 'fulfilled' ? networkInsights.value : [];

      const now = new Date().toISOString().split('T')[0];
      const pendingTasks = taskData.filter(t => t.status !== 'done');
      const activeProjects = projectData.filter(p => p.status === 'active');

      // === Build Compact Digest ===
      const compact = this.buildCompactDigest({
        date: now, profileData, financialData, dealData,
        activeProjects, pendingTasks, briefingData, strategyData,
      });

      // === Build Full Digest ===
      const full = this.buildFullDigest({
        date: now, profileData, financialData, dealData,
        activeProjects, projectData, taskData, pendingTasks,
        ideaData, contactData, memoryData, briefingData, strategyData,
        experimentOutcomeData, patternData, failurePatternData, networkInsightData,
      });

      // Persist
      this.compactDigest = compact;
      this.fullDigest = full;

      this.stats = {
        last_updated: new Date().toISOString(),
        compact_tokens: this.estimateTokens(compact),
        full_tokens: this.estimateTokens(full),
        project_count: projectData.length,
        task_count: taskData.length,
        memory_count: memoryData.length,
        contact_count: contactData.length,
        deal_count: dealData.length,
      };

      // Write to disk
      fs.mkdirSync(DIGEST_DIR, { recursive: true });
      fs.writeFileSync(COMPACT_PATH, compact);
      fs.writeFileSync(FULL_PATH, full);
      fs.writeFileSync(STATS_PATH, JSON.stringify(this.stats, null, 2));

      const elapsed = Date.now() - startTime;
      console.log(`[KnowledgeDigest] Generated in ${elapsed}ms — compact: ~${this.stats.compact_tokens} tokens, full: ~${this.stats.full_tokens} tokens`);

      return this.stats;
    } finally {
      this.isGenerating = false;
    }
  }

  private buildCompactDigest(data: {
    date: string;
    profileData: any;
    financialData: any;
    dealData: any[];
    activeProjects: any[];
    pendingTasks: any[];
    briefingData: any;
    strategyData: any[];
  }): string {
    const { date, profileData, financialData, dealData, activeProjects, pendingTasks, briefingData, strategyData } = data;

    let digest = `# NITARA WORLD STATE (COMPACT) — ${date}\n\n`;

    // Financial snapshot
    digest += `## FINANCIAL SNAPSHOT\n`;
    if (financialData) {
      digest += `- Monthly revenue: ${financialData.total_monthly_revenue || 0} ${financialData.currency || 'CHF'}\n`;
      digest += `- Monthly costs: ${financialData.total_monthly_costs || 0} ${financialData.currency || 'CHF'}\n`;
      digest += `- Net monthly: ${financialData.net_monthly || 0} ${financialData.currency || 'CHF'}\n`;
      if (financialData.runway_months) digest += `- Runway: ${financialData.runway_months} months\n`;
      if (financialData.goals?.income_goal) digest += `- Income goal: ${financialData.goals.income_goal} ${financialData.currency || 'CHF'}/mo\n`;
    } else {
      digest += `- No financial data available\n`;
    }

    // Active deals
    if (dealData.length > 0) {
      digest += `\n## ACTIVE DEALS (${dealData.length})\n`;
      for (const deal of dealData.slice(0, 5)) {
        digest += `- ${deal.title} | Stage: ${deal.stage} | Value: ${deal.value || '?'} ${deal.currency || 'CHF'}\n`;
      }
    }

    // Active projects (one line each)
    digest += `\n## ACTIVE PROJECTS (${activeProjects.length})\n`;
    for (const p of activeProjects) {
      digest += `- ${p.title} | Phase: ${p.phase || 'unknown'} | Status: ${p.status}\n`;
    }

    // Today's priorities
    if (briefingData?.work_plan) {
      digest += `\n## TODAY'S PRIORITIES\n`;
      const topItems = briefingData.work_plan.slice(0, 3);
      for (const item of topItems) {
        digest += `- ${item.action || item.title || item.description || 'Priority item'}\n`;
      }
    }

    // Pending tasks count
    digest += `\n## TASKS: ${pendingTasks.length} pending\n`;

    // Top income strategies
    if (strategyData.length > 0) {
      digest += `\n## TOP INCOME STRATEGIES\n`;
      for (const s of strategyData.slice(0, 3)) {
        digest += `- ${s.title} — Est. ${s.estimated_monthly_revenue || '?'}/mo (${s.status || 'active'})\n`;
      }
    }

    return digest;
  }

  private buildFullDigest(data: {
    date: string;
    profileData: any;
    financialData: any;
    dealData: any[];
    activeProjects: any[];
    projectData: any[];
    taskData: any[];
    pendingTasks: any[];
    ideaData: any[];
    contactData: any[];
    memoryData: any[];
    briefingData: any;
    strategyData: any[];
    experimentOutcomeData: any[];
    patternData: any[];
    failurePatternData: string[];
    networkInsightData: any[];
  }): string {
    const {
      date, profileData, financialData, dealData, activeProjects,
      projectData, taskData, pendingTasks, ideaData, contactData,
      memoryData, briefingData, strategyData,
      experimentOutcomeData, patternData, failurePatternData, networkInsightData,
    } = data;

    let digest = `# NITARA WORLD STATE — ${date}\n\n`;

    // Founder profile
    digest += `## FOUNDER`;
    if (profileData) {
      digest += `: ${profileData.name || 'VIKAS MOHAN'} (VIMO)\n`;
      if (profileData.location) digest += `- Location: ${profileData.location}\n`;
      if (profileData.preferred_archetype) digest += `- Archetype: ${profileData.preferred_archetype}\n`;
      if (profileData.skills?.length > 0) {
        digest += `- Core skills: ${profileData.skills.map((s: any) => s.name).join(', ')}\n`;
      }
      if (profileData.strategic_focus_tags?.length > 0) {
        digest += `- Strategic focus: ${profileData.strategic_focus_tags.join(', ')}\n`;
      }
      if (profileData.active_work?.length > 0) {
        digest += `- Active work: ${profileData.active_work.join(', ')}\n`;
      }
    } else {
      digest += `\n- Profile not yet configured\n`;
    }

    // Financial situation
    digest += `\n## FINANCIAL SITUATION\n`;
    if (financialData) {
      digest += `- Monthly revenue: ${financialData.total_monthly_revenue || 0} ${financialData.currency || 'CHF'}/mo\n`;
      digest += `- Monthly costs: ${financialData.total_monthly_costs || 0} ${financialData.currency || 'CHF'}/mo\n`;
      digest += `- Net monthly: ${financialData.net_monthly || 0} ${financialData.currency || 'CHF'}\n`;
      if (financialData.runway_months) digest += `- Runway: ${financialData.runway_months} months\n`;
      if (financialData.goals) {
        digest += `- Income goal: ${financialData.goals.income_goal || '?'} ${financialData.currency || 'CHF'}/mo\n`;
        if (financialData.goals.safety_net_months) digest += `- Safety net target: ${financialData.goals.safety_net_months} months\n`;
      }
      if (financialData.revenue_streams?.length > 0) {
        digest += `- Revenue streams:\n`;
        for (const rs of financialData.revenue_streams) {
          digest += `  - ${rs.name || rs.source || 'Stream'}: ${rs.amount || rs.monthly_amount || '?'} ${financialData.currency || 'CHF'}/mo\n`;
        }
      }
      if (financialData.inference_costs) {
        digest += `- AI inference costs: ${JSON.stringify(financialData.inference_costs)}\n`;
      }
    } else {
      digest += `- No financial data configured\n`;
    }

    // Active deals
    if (dealData.length > 0) {
      digest += `\n## SALES PIPELINE (${dealData.length} deals)\n`;
      for (const deal of dealData) {
        digest += `- ${deal.title} | Stage: ${deal.stage} | Value: ${deal.value || '?'} ${deal.currency || 'CHF'}`;
        if (deal.contact_id) digest += ` | Contact: ${deal.contact_id}`;
        digest += `\n`;
      }
    }

    // Income strategies
    if (strategyData.length > 0) {
      digest += `\n## INCOME STRATEGIES (${strategyData.length})\n`;
      for (const s of strategyData) {
        digest += `- ${s.title} (${s.type || 'general'}) — Est. ${s.estimated_monthly_revenue || '?'}/mo — Confidence: ${s.confidence || '?'} — Status: ${s.status || 'active'}\n`;
      }
    }

    // Portfolio
    digest += `\n## PORTFOLIO (${projectData.length} total, ${activeProjects.length} active)\n`;
    for (const p of projectData) {
      digest += `\n### ${p.title}\n`;
      digest += `- ID: ${p.id} | Phase: ${p.phase || '?'} | Status: ${p.status || '?'}\n`;
      if (p.description) digest += `- Description: ${p.description.substring(0, 200)}\n`;
      if (p.playbook_type) digest += `- Playbook: ${p.playbook_type}\n`;
      if (p.artifacts?.council_verdict) {
        const cv = p.artifacts.council_verdict;
        digest += `- Council score: ${cv.overall_score || '?'}/10 | Recommendation: ${cv.recommendation || '?'}\n`;
        if (cv.synthesized_reasoning) digest += `- Council insight: ${cv.synthesized_reasoning.substring(0, 150)}\n`;
      }
      if (p.artifacts?.financials) {
        const f = p.artifacts.financials;
        digest += `- Revenue: ${f.revenue || f.monthly_revenue || '?'} | Costs: ${f.costs || f.monthly_costs || '?'}\n`;
      }
      // Project tasks
      const projectTasks = taskData.filter(t => t.project_id === p.id);
      if (projectTasks.length > 0) {
        const done = projectTasks.filter(t => t.status === 'done').length;
        digest += `- Tasks: ${done}/${projectTasks.length} complete\n`;
      }
    }

    // Ideas pipeline
    if (ideaData.length > 0) {
      digest += `\n## IDEAS IN PIPELINE (${ideaData.length})\n`;
      for (const idea of ideaData) {
        digest += `- ${idea.title} — Status: ${idea.status || 'inbox'}`;
        if (idea.council_verdict?.overall_score) digest += ` — Score: ${idea.council_verdict.overall_score}/10`;
        digest += `\n`;
      }
    }

    // Active tasks
    digest += `\n## ACTIVE TASKS (${pendingTasks.length} pending)\n`;
    for (const t of pendingTasks.slice(0, 20)) {
      digest += `- ${t.title} — ${t.status} — Priority: ${t.priority || 'medium'}`;
      if (t.project_id) digest += ` — Project: ${t.project_id}`;
      if (t.due_date) digest += ` — Due: ${t.due_date}`;
      digest += `\n`;
    }
    if (pendingTasks.length > 20) {
      digest += `  ... and ${pendingTasks.length - 20} more\n`;
    }

    // Network & Relationships
    if (contactData.length > 0) {
      digest += `\n## NETWORK & RELATIONSHIPS (${contactData.length} contacts)\n`;
      for (const c of contactData.slice(0, 15)) {
        digest += `- ${c.name}`;
        if (c.company) digest += ` (${c.company})`;
        if (c.tags?.length > 0) digest += ` [${c.tags.join(', ')}]`;
        digest += `\n`;
      }
      if (contactData.length > 15) {
        digest += `  ... and ${contactData.length - 15} more contacts\n`;
      }
    }

    // Strategic memories
    if (memoryData.length > 0) {
      digest += `\n## STRATEGIC MEMORIES (${memoryData.length} total, showing top 20)\n`;
      for (const m of memoryData.slice(0, 20)) {
        digest += `- ${(m.memory || m.text || '').substring(0, 150)}\n`;
      }
    }

    // Validation learnings (from agent memory)
    if (experimentOutcomeData.length > 0 || patternData.length > 0 || failurePatternData.length > 0) {
      digest += `\n## VALIDATION LEARNINGS\n`;

      if (experimentOutcomeData.length > 0) {
        digest += `\n### Recent Experiment Outcomes (${experimentOutcomeData.length})\n`;
        for (const e of experimentOutcomeData) {
          digest += `- ${(e.memory || '').substring(0, 200)}\n`;
        }
      }

      if (patternData.length > 0) {
        digest += `\n### Cross-Project Patterns (${patternData.length})\n`;
        for (const p of patternData) {
          const conf = typeof p.confidence === 'number' ? ` (confidence: ${(p.confidence * 100).toFixed(0)}%)` : '';
          digest += `- [${p.category || 'pattern'}] ${(p.memory || '').substring(0, 200)}${conf}\n`;
        }
      }

      if (failurePatternData.length > 0) {
        digest += `\n### ⚠ Failure Patterns to Avoid\n`;
        for (const f of failurePatternData) {
          digest += `- ${f.substring(0, 200)}\n`;
        }
      }
    }

    // Network intelligence (from agent memory)
    if (networkInsightData.length > 0) {
      digest += `\n## NETWORK INTELLIGENCE (${networkInsightData.length} insights)\n`;
      for (const n of networkInsightData) {
        digest += `- ${(n.memory || '').substring(0, 200)}\n`;
      }
    }

    // Knowledge gaps from profiling checklist
    try {
      const checklistPath = path.join('/srv/focus-flow/07_system/agent/profiling-checklist.json');
      if (fs.existsSync(checklistPath)) {
        const checklistRaw = fs.readFileSync(checklistPath, 'utf-8');
        const checklist = JSON.parse(checklistRaw);
        digest += `\n## KNOWLEDGE GAPS\n`;
        digest += `Overall profiling completeness: ${checklist.overall_completeness}%\n`;

        // Collect critical gaps
        const criticalGaps: string[] = [];
        const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2 };
        const sortedDomains = Object.entries(checklist.domains)
          .sort(([, a]: any, [, b]: any) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));

        for (const [, domainData] of sortedDomains as any[]) {
          const unknowns = domainData.items.filter((i: any) => i.status === 'unknown');
          for (const item of unknowns) {
            if (criticalGaps.length < 5) {
              criticalGaps.push(`- [${domainData.priority}] ${domainData.label}: ${item.label}`);
            }
          }
        }

        if (criticalGaps.length > 0) {
          digest += `Critical gaps:\n`;
          digest += criticalGaps.join('\n') + '\n';
        }
      }
    } catch {
      // Non-critical: skip knowledge gaps if checklist unavailable
    }

    // Today's priorities from briefing
    if (briefingData) {
      digest += `\n## TODAY'S PRIORITIES (from morning briefing)\n`;
      if (briefingData.narrative_summary) {
        digest += `${briefingData.narrative_summary}\n\n`;
      }
      if (briefingData.work_plan) {
        for (const item of briefingData.work_plan.slice(0, 5)) {
          digest += `- [${item.priority || 'medium'}] ${item.action || item.title || item.description || 'Work item'}`;
          if (item.project_id) digest += ` (project: ${item.project_id})`;
          digest += `\n`;
        }
      }
      if (briefingData.stalled_items?.length > 0) {
        digest += `\nStalled items:\n`;
        for (const s of briefingData.stalled_items) {
          digest += `- ${s.title || s.project_title || 'Unknown'} — stalled for ${s.days_stalled || '?'} days\n`;
        }
      }
    }

    return digest;
  }

  getCompactDigest(): string {
    return this.compactDigest;
  }

  getFullDigest(): string {
    return this.fullDigest;
  }

  /**
   * Select the appropriate digest tier based on context heuristics
   */
  selectDigest(options: {
    intent?: string;
    projectId?: string;
    messageLength?: number;
    threadMessageCount?: number;
    deepMode?: boolean;
  }): string {
    const { intent, projectId, messageLength, threadMessageCount, deepMode } = options;

    // Use full digest for strategic contexts
    if (
      deepMode ||
      intent === 'greeting' ||
      projectId ||
      (messageLength && messageLength > 100) ||
      (threadMessageCount && threadMessageCount > 5)
    ) {
      return this.fullDigest || this.compactDigest;
    }

    return this.compactDigest || this.fullDigest;
  }

  getStats(): DigestStats | null {
    return this.stats;
  }

  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

export const knowledgeDigestService = new KnowledgeDigestService();
