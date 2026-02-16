import path from 'path';
import {
  Briefing,
  PortfolioOverview,
  WorkPlanItem,
  Task,
} from '../models/types';
import {
  getVaultPath,
  ensureDir,
  readJsonFile,
  writeJsonFile,
} from '../utils/file-operations';
import { generateBriefingId, generateAgentActionId } from '../utils/id-generator';
import { VaultService } from './vault.service';
import { mem0Service } from './mem0.service';
import { cachedInference } from './cached-inference.service';
import { councilFramework } from '../ai/council-framework';
import { trustGate } from './trust-gate.service';
import { opportunityScanner } from './opportunity-scanner.service';

const LOG_PREFIX = '[BriefingGenerator]';

const BRIEFINGS_DIR = getVaultPath('07_system', 'agent', 'briefings');

class BriefingGeneratorService {
  private vault = new VaultService();

  constructor() {
    ensureDir(BRIEFINGS_DIR).catch(err =>
      console.error(`${LOG_PREFIX} Failed to ensure briefings dir:`, err.message)
    );
  }

  async assessPortfolio(): Promise<PortfolioOverview> {
    const projects = await this.vault.getProjects('active');
    const tasks = await this.vault.getTasks();
    const verdicts = await councilFramework.listVerdicts();

    // Find overdue tasks
    const now = new Date();
    const overdueTasks = tasks.filter(t => {
      if (t.status === 'done' || !t.due_date) return false;
      return new Date(t.due_date) < now;
    });

    // Find pending verdicts (those with needs-info recommendation)
    const pendingVerdicts = verdicts
      .filter(v => v.recommendation === 'needs-info')
      .slice(0, 5);

    // Assemble cross-project context from memory
    let crossProjectContext = '';
    try {
      crossProjectContext = await mem0Service.assembleContext(
        '',
        'cross-project status portfolio overview priorities',
        2000
      );
    } catch {
      // Memory might not be available
    }

    const activeProjects = projects.map(p => ({
      id: p.id,
      title: p.title,
      phase: p.pipeline?.current_phase || p.phase || 'concept',
      sub_state: p.pipeline?.phases?.[p.pipeline?.current_phase]?.sub_state || 'idle',
      updated_at: p.updated_at,
    }));

    return {
      total_projects: projects.length,
      active_projects: activeProjects,
      overdue_tasks: overdueTasks.slice(0, 10),
      pending_council_verdicts: pendingVerdicts,
      cross_project_context: crossProjectContext,
    };
  }

  async formulateWorkPlan(portfolio: PortfolioOverview): Promise<WorkPlanItem[]> {
    const projectSummaries = portfolio.active_projects
      .map(p => `- ${p.title} (${p.phase}/${p.sub_state}, updated ${p.updated_at})`)
      .join('\n');

    const overdueList = portfolio.overdue_tasks
      .map(t => `- ${t.title} (due: ${t.due_date}, project: ${t.project_id || 'none'})`)
      .join('\n');

    const prompt = `You are a Co-CEO agent for a venture portfolio. Based on the current portfolio state, propose a prioritized work plan for today.

## Active Projects
${projectSummaries || 'No active projects.'}

## Overdue Tasks
${overdueList || 'No overdue tasks.'}

## Pending Verdicts
${portfolio.pending_council_verdicts.length} council verdicts need attention.

${portfolio.cross_project_context ? `## Context\n${portfolio.cross_project_context}` : ''}

Respond with a JSON array of work plan items. Each item must have:
- project_id: string (project ID or "system" for cross-project work)
- action: string (action_type like read_vault, council_evaluation, create_tasks_from_verdict, etc.)
- description: string (what to do)
- priority: "critical" | "high" | "medium" | "low"
- estimated_cost: string (e.g., "~500 tokens", "~2000 tokens")

Focus on the most impactful actions. Keep the plan to 5-8 items max.
Respond ONLY with the JSON array, no markdown fences.`;

    try {
      const response = await cachedInference.complete(
        prompt,
        'You are a strategic AI operations manager. Return only valid JSON arrays.',
        'strategic_reasoning',
        'standard',
        { max_tokens: 2000, temperature: 0.3 }
      );

      const items = JSON.parse(response);
      if (!Array.isArray(items)) return [];

      return items.map((item: any) => ({
        id: generateAgentActionId(),
        project_id: item.project_id || 'system',
        action: item.action || 'read_vault',
        description: item.description || '',
        trust_tier: trustGate.classify(item.action || 'read_vault'),
        priority: item.priority || 'medium',
        estimated_cost: item.estimated_cost,
        auto_approved: trustGate.classify(item.action || 'read_vault') === 1,
        status: 'pending' as const,
      }));
    } catch (err: any) {
      console.error(`${LOG_PREFIX} Failed to formulate work plan:`, err.message);
      return [];
    }
  }

  async generateNarrativeSummary(
    portfolio: PortfolioOverview,
    workPlan: WorkPlanItem[],
    stalledItems: any[]
  ): Promise<string> {
    const prompt = `Generate a brief executive summary for a daily briefing.

Portfolio: ${portfolio.total_projects} active projects, ${portfolio.overdue_tasks.length} overdue tasks.
Work Plan: ${workPlan.length} items planned.
Stalled Items: ${stalledItems.length} stalled.
Top projects: ${portfolio.active_projects.slice(0, 3).map(p => p.title).join(', ')}.

Write 2-3 sentences summarizing today's priorities and key observations. Be concise and actionable.`;

    try {
      return await cachedInference.complete(
        prompt,
        'You are a concise executive assistant. Write brief, actionable summaries.',
        'summarization',
        'economy',
        { max_tokens: 300, temperature: 0.5 }
      );
    } catch (err: any) {
      console.error(`${LOG_PREFIX} Failed to generate summary:`, err.message);
      return `Portfolio has ${portfolio.total_projects} active projects with ${portfolio.overdue_tasks.length} overdue tasks. ${workPlan.length} actions planned for today.`;
    }
  }

  async generateBriefing(): Promise<Briefing> {
    console.log(`${LOG_PREFIX} Generating daily briefing...`);

    const portfolio = await this.assessPortfolio();
    const workPlan = await this.formulateWorkPlan(portfolio);

    // Detect stalled items: projects not updated in 7+ days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const stalledItems = portfolio.active_projects
      .filter(p => new Date(p.updated_at).getTime() < sevenDaysAgo)
      .map(p => ({
        project_id: p.id,
        title: p.title,
        phase: p.phase,
        stalled_since: p.updated_at,
        reason: `No updates since ${new Date(p.updated_at).toLocaleDateString()}`,
      }));

    // Get pending approvals
    const pendingApprovals = await trustGate.getPendingApprovals();
    const pendingApprovalsSummary = pendingApprovals.map(a => ({
      id: a.id,
      action: a.action.description,
      tier: a.tier,
      created_at: a.created_at,
    }));

    // Estimate costs
    const estimatedTokens = workPlan.reduce((sum, item) => {
      const cost = item.estimated_cost || '~500 tokens';
      const match = cost.match(/(\d+)/);
      return sum + (match ? parseInt(match[1]) : 500);
    }, 0);

    const [aiSummary, financialInsights] = await Promise.all([
      this.generateNarrativeSummary(portfolio, workPlan, stalledItems),
      opportunityScanner.getBriefingInsights().catch(() => ({ top_opportunities: [], summary: '' })),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const briefing: Briefing = {
      id: generateBriefingId(),
      date: today,
      generated_at: new Date().toISOString(),
      portfolio_overview: portfolio,
      work_plan: workPlan,
      stalled_items: stalledItems,
      pending_approvals_summary: pendingApprovalsSummary,
      cost_estimate: {
        estimated_tokens: estimatedTokens,
        estimated_cost_usd: estimatedTokens * 0.000015, // rough estimate
      },
      ai_summary: aiSummary,
      financial_insights: financialInsights.top_opportunities.length > 0 ? financialInsights : undefined,
    };

    // Persist briefing
    await writeJsonFile(path.join(BRIEFINGS_DIR, `${today}.json`), briefing);
    console.log(`${LOG_PREFIX} Briefing ${briefing.id} generated for ${today}`);

    return briefing;
  }

  async getLatestBriefing(): Promise<Briefing | null> {
    const today = new Date().toISOString().split('T')[0];
    return readJsonFile<Briefing>(path.join(BRIEFINGS_DIR, `${today}.json`));
  }

  async getBriefing(date: string): Promise<Briefing | null> {
    return readJsonFile<Briefing>(path.join(BRIEFINGS_DIR, `${date}.json`));
  }
}

export const briefingGenerator = new BriefingGeneratorService();
