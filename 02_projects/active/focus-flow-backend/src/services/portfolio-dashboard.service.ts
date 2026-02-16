import { VaultService } from './vault.service';
import { financialsService } from './financials.service';
import { founderProfileService } from './founder-profile.service';
import { networkImporterService } from './network-importer.service';
import { cachedInference } from './cached-inference.service';
import type {
  Project,
  Task,
  Idea,
  FounderProfile,
  NetworkContact,
  ProjectHealthIndicator,
  PortfolioProjectSummary,
  RankedIdea,
  PortfolioDashboard,
} from '../models/types';

const vault = new VaultService();

class PortfolioDashboardService {
  async getDashboard(): Promise<PortfolioDashboard> {
    const [allProjects, allTasks, allIdeas, financials] = await Promise.all([
      vault.getProjects(),
      vault.getTasks(),
      vault.getIdeas(),
      financialsService.getPortfolioFinancials(),
    ]);

    const projectSummaries: PortfolioProjectSummary[] = await Promise.all(
      allProjects.map(async (project) => {
        const projectTasks = allTasks.filter(t => t.project_id === project.id);
        const projectFinancials = await financialsService.getProjectFinancials(project.id);
        const projectRevenue = projectFinancials.revenue
          .filter(r => r.active)
          .reduce((sum, r) => sum + r.amount_monthly, 0);
        const projectCosts = projectFinancials.costs
          .filter((c: any) => c.active)
          .reduce((sum: number, c: any) => sum + c.amount_monthly, 0);

        const health = this.calculateHealth(project, projectTasks, { revenue: projectRevenue, costs: projectCosts });

        return {
          id: project.id,
          title: project.title,
          playbook_type: project.playbook_type,
          phase: project.phase,
          phase_sub_state: project.pipeline?.phases?.[project.pipeline?.current_phase]?.sub_state,
          status: project.status,
          health,
          monthly_revenue: projectRevenue,
          monthly_costs: projectCosts,
          task_count: projectTasks.length,
          completed_tasks: projectTasks.filter(t => t.status === 'done').length,
          collaborators: [],
          updated_at: project.updated_at,
        };
      })
    );

    const activeCount = projectSummaries.filter(p => p.status === 'active').length;
    const pausedCount = projectSummaries.filter(p => p.status === 'paused').length;
    const completedCount = projectSummaries.filter(p => p.status === 'completed').length;

    const rankedIdeas = await this.getRankedIdeas();

    return {
      projects: projectSummaries,
      active_count: activeCount,
      paused_count: pausedCount,
      completed_count: completedCount,
      total_monthly_revenue: financials.total_monthly_revenue,
      total_monthly_costs: financials.total_monthly_costs,
      net_monthly: financials.net_monthly,
      currency: financials.currency,
      ranked_ideas: rankedIdeas,
      unevaluated_ideas_count: rankedIdeas.filter(r => !r.evaluated).length,
    };
  }

  async getRankedIdeas(): Promise<RankedIdea[]> {
    const [ideas, profile, contacts] = await Promise.all([
      vault.getIdeas(),
      founderProfileService.getProfile(),
      networkImporterService.getContacts(),
    ]);

    const ranked = ideas.map((idea) => this.scoreIdeaSync(idea, profile, contacts));
    ranked.sort((a, b) => b.composite_score - a.composite_score);
    return ranked;
  }

  async evaluateIdea(ideaId: string): Promise<RankedIdea> {
    const idea = await vault.getIdea(ideaId);
    if (!idea) throw new Error(`Idea ${ideaId} not found`);

    const [profile, contacts] = await Promise.all([
      founderProfileService.getProfile(),
      networkImporterService.getContacts(),
    ]);

    return await this.scoreIdea(idea, profile, contacts);
  }

  private calculateHealth(
    project: Project,
    tasks: Task[],
    financials: { revenue: number; costs: number }
  ): ProjectHealthIndicator {
    const now = Date.now();
    const updatedAt = new Date(project.updated_at).getTime();
    const daysSinceUpdate = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));

    // Pipeline velocity based on days since update
    let pipeline_velocity: number;
    if (daysSinceUpdate < 7) pipeline_velocity = 100;
    else if (daysSinceUpdate < 14) pipeline_velocity = 75;
    else if (daysSinceUpdate < 30) pipeline_velocity = 50;
    else pipeline_velocity = 25;

    // Task completion rate
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const task_completion_rate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 50;

    // Overdue tasks
    const has_overdue_tasks = tasks.some(t => {
      if (t.status === 'done' || !t.due_date) return false;
      return new Date(t.due_date).getTime() < now;
    });

    // Financial health
    let financial_health = 0;
    if (financials.revenue > 0 && financials.costs > 0) {
      financial_health = Math.min(financials.revenue / financials.costs, 2) * 50;
    } else if (financials.revenue > 0) {
      financial_health = 100;
    }

    // Composite score
    const score = Math.round(
      pipeline_velocity * 0.3 +
      task_completion_rate * 0.3 +
      financial_health * 0.2 +
      (has_overdue_tasks ? 0 : 20)
    );

    let status: ProjectHealthIndicator['status'];
    if (score > 75) status = 'thriving';
    else if (score > 50) status = 'healthy';
    else if (score > 30) status = 'stalling';
    else status = 'at_risk';

    return {
      project_id: project.id,
      score,
      factors: {
        pipeline_velocity,
        task_completion_rate: Math.round(task_completion_rate),
        days_since_update: daysSinceUpdate,
        has_overdue_tasks,
        financial_health: Math.round(financial_health),
      },
      status,
    };
  }

  /** Synchronous scoring (no AI call) for bulk ranking */
  private scoreIdeaSync(
    idea: Idea,
    profile: FounderProfile | null,
    contacts: NetworkContact[]
  ): RankedIdea {
    const hasVerdict = !!idea.council_verdict;
    const council_score = idea.council_verdict
      ? (idea.council_verdict.overall_score / 10) * 100
      : 0;

    // Skill alignment: match idea tags/title keywords to profile skills
    let skill_alignment = 0;
    if (profile && profile.skills.length > 0) {
      const ideaText = `${idea.title} ${idea.description}`.toLowerCase();
      const matchingSkills = profile.skills.filter(s =>
        ideaText.includes(s.name.toLowerCase()) || ideaText.includes(s.category.toLowerCase())
      );
      skill_alignment = Math.min((matchingSkills.length / Math.max(profile.skills.length, 1)) * 100, 100);
    }

    // Network advantage: contacts with matching tags
    let network_advantage = 0;
    if (contacts.length > 0) {
      const ideaWords = `${idea.title} ${idea.description}`.toLowerCase().split(/\s+/);
      const matchingContacts = contacts.filter(c =>
        c.tags.some(tag => ideaWords.some(w => tag.toLowerCase().includes(w) && w.length > 3))
      );
      network_advantage = Math.min((matchingContacts.length / Math.max(contacts.length * 0.1, 1)) * 100, 100);
    }

    // Financial viability: inverse of estimated effort
    let financial_viability = 50;
    if (idea.expanded?.estimated_effort) {
      const effort = idea.expanded.estimated_effort.toLowerCase();
      if (effort.includes('low') || effort.includes('small')) financial_viability = 90;
      else if (effort.includes('medium') || effort.includes('moderate')) financial_viability = 60;
      else if (effort.includes('high') || effort.includes('large')) financial_viability = 30;
    }

    // Time to revenue estimate from expanded data
    let time_to_revenue = 50;
    if (idea.expanded?.key_features && idea.expanded.key_features.length <= 3) {
      time_to_revenue = 80; // fewer features = faster to revenue
    } else if (idea.expanded?.key_features && idea.expanded.key_features.length > 6) {
      time_to_revenue = 30;
    }

    const composite_score = Math.round(
      council_score * 0.3 +
      skill_alignment * 0.2 +
      network_advantage * 0.15 +
      financial_viability * 0.2 +
      time_to_revenue * 0.15
    );

    return {
      idea,
      composite_score,
      breakdown: {
        council_score: Math.round(council_score),
        skill_alignment: Math.round(skill_alignment),
        network_advantage: Math.round(network_advantage),
        financial_viability: Math.round(financial_viability),
        time_to_revenue: Math.round(time_to_revenue),
      },
      evaluated: hasVerdict,
    };
  }

  /** Full scoring with AI evaluation for a single idea */
  private async scoreIdea(
    idea: Idea,
    profile: FounderProfile | null,
    contacts: NetworkContact[]
  ): Promise<RankedIdea> {
    // Start with sync scoring
    const base = this.scoreIdeaSync(idea, profile, contacts);

    // AI-enhanced skill alignment
    if (profile && profile.skills.length > 0) {
      try {
        const result = await cachedInference.infer({
          task_type: 'fast_classification',
          budget_tier: 'economy',
          system_prompt: 'Rate skill alignment 0-100. Return only a JSON object: {"score": <number>}',
          messages: [{
            role: 'user',
            content: `Idea: ${idea.title} - ${idea.description}\nFounder skills: ${profile.skills.map(s => `${s.name} (${s.level})`).join(', ')}\nRate how well the founder's skills align with this idea (0-100).`,
          }],
        });
        const parsed = JSON.parse(result.content);
        if (typeof parsed.score === 'number') {
          base.breakdown.skill_alignment = Math.min(Math.max(parsed.score, 0), 100);
        }
      } catch {
        // Keep sync score
      }
    }

    // AI-enhanced time to revenue
    try {
      const result = await cachedInference.infer({
        task_type: 'fast_classification',
        budget_tier: 'economy',
        system_prompt: 'Estimate time-to-revenue score 0-100 (100=fastest). Return only JSON: {"score": <number>}',
        messages: [{
          role: 'user',
          content: `Idea: ${idea.title}\nDescription: ${idea.description}\n${idea.expanded ? `Features: ${idea.expanded.key_features?.join(', ')}\nEffort: ${idea.expanded.estimated_effort}` : ''}\nRate time-to-first-revenue (0=years, 100=days).`,
        }],
      });
      const parsed = JSON.parse(result.content);
      if (typeof parsed.score === 'number') {
        base.breakdown.time_to_revenue = Math.min(Math.max(parsed.score, 0), 100);
      }
    } catch {
      // Keep sync score
    }

    // Recalculate composite
    base.composite_score = Math.round(
      base.breakdown.council_score * 0.3 +
      base.breakdown.skill_alignment * 0.2 +
      base.breakdown.network_advantage * 0.15 +
      base.breakdown.financial_viability * 0.2 +
      base.breakdown.time_to_revenue * 0.15
    );
    base.evaluated = true;

    return base;
  }
}

export const portfolioDashboardService = new PortfolioDashboardService();
