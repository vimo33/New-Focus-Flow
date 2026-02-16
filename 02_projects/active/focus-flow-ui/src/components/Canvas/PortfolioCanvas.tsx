import { useEffect, useState } from 'react';
import { useCanvasStore } from '../../stores/canvas';
import { api } from '../../services/api';
import { GlassCard, StatCard, Badge } from '../shared';

interface ProjectHealth {
  project_id: string;
  score: number;
  factors: {
    pipeline_velocity: number;
    task_completion_rate: number;
    days_since_update: number;
    has_overdue_tasks: boolean;
    financial_health: number;
  };
  status: 'thriving' | 'healthy' | 'stalling' | 'at_risk';
}

interface PortfolioProject {
  id: string;
  title: string;
  playbook_type?: string;
  phase?: string;
  phase_sub_state?: string;
  status: 'active' | 'paused' | 'completed';
  health: ProjectHealth;
  monthly_revenue: number;
  monthly_costs: number;
  task_count: number;
  completed_tasks: number;
  collaborators: string[];
  updated_at: string;
}

interface RankedIdea {
  idea: {
    id: string;
    title: string;
    description: string;
    status: string;
    council_verdict?: { overall_score: number; recommendation: string };
  };
  composite_score: number;
  breakdown: {
    council_score: number;
    skill_alignment: number;
    network_advantage: number;
    financial_viability: number;
    time_to_revenue: number;
  };
  evaluated: boolean;
}

interface Dashboard {
  projects: PortfolioProject[];
  active_count: number;
  paused_count: number;
  completed_count: number;
  total_monthly_revenue: number;
  total_monthly_costs: number;
  net_monthly: number;
  currency: string;
  ranked_ideas: RankedIdea[];
  unevaluated_ideas_count: number;
}

const PLAYBOOK_BADGES: Record<string, { label: string; variant: 'active' | 'playbook' | 'council' | 'completed' | 'paused' }> = {
  'software-build': { label: 'SOFTWARE', variant: 'active' },
  'client-engagement': { label: 'CLIENT', variant: 'playbook' },
  'content-course': { label: 'CONTENT', variant: 'council' },
  'studio-project': { label: 'STUDIO', variant: 'completed' },
  'exploratory-idea': { label: 'EXPLORE', variant: 'paused' },
};

const PHASES = ['concept', 'spec', 'design', 'dev', 'test', 'deploy', 'live'];

const HEALTH_COLORS: Record<string, string> = {
  thriving: 'bg-success',
  healthy: 'bg-primary',
  stalling: 'bg-secondary',
  at_risk: 'bg-danger',
};

export default function PortfolioCanvas() {
  const { setCanvas } = useCanvasStore();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState<string | null>(null);

  useEffect(() => {
    api.getPortfolioDashboard()
      .then(setDashboard)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleEvaluate = async (ideaId: string) => {
    setEvaluating(ideaId);
    try {
      await api.evaluateIdea(ideaId);
      // Refresh dashboard
      const updated = await api.getPortfolioDashboard();
      setDashboard(updated);
    } catch (e) {
      console.error('Evaluation failed:', e);
    } finally {
      setEvaluating(null);
    }
  };

  const handlePromote = async (ideaId: string) => {
    try {
      await api.promoteIdea(ideaId);
      const updated = await api.getPortfolioDashboard();
      setDashboard(updated);
    } catch (e) {
      console.error('Promotion failed:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-tertiary">Loading portfolio...</div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-tertiary">Failed to load portfolio data.</div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">PORTFOLIO</h2>
        <h1 className="text-2xl lg:text-3xl font-bold text-text-primary tracking-tight mt-1" style={{ fontFamily: 'var(--font-body)' }}>
          Your Ventures
        </h1>
        <p className="text-text-secondary text-sm mt-2">
          {dashboard.active_count} active{dashboard.paused_count > 0 ? `, ${dashboard.paused_count} paused` : ''}
          {dashboard.completed_count > 0 ? `, ${dashboard.completed_count} completed` : ''}
        </p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          value={String(dashboard.active_count)}
          label="Active Projects"
          trend={{ direction: 'flat', percentage: `${dashboard.projects.length} total` }}
        />
        <StatCard
          value={dashboard.total_monthly_revenue.toLocaleString('en-US')}
          label="Monthly Revenue"
          currency={dashboard.currency}
          trend={{ direction: dashboard.net_monthly >= 0 ? 'up' : 'down', percentage: `net ${dashboard.currency} ${dashboard.net_monthly.toLocaleString('en-US')}` }}
        />
        <StatCard
          value={dashboard.total_monthly_costs.toLocaleString('en-US')}
          label="Monthly Costs"
          currency={dashboard.currency}
        />
        <StatCard
          value={dashboard.net_monthly.toLocaleString('en-US')}
          label="Net Income"
          currency={dashboard.currency}
          trend={{ direction: dashboard.net_monthly >= 0 ? 'up' : 'down', percentage: dashboard.net_monthly >= 0 ? 'Profitable' : 'Loss' }}
        />
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {dashboard.projects.map((project) => {
          const badge = project.playbook_type ? PLAYBOOK_BADGES[project.playbook_type] : null;
          const currentPhaseIdx = project.phase ? PHASES.indexOf(project.phase) : -1;
          const healthColor = HEALTH_COLORS[project.health.status] || 'bg-text-tertiary';

          return (
            <div
              key={project.id}
              className="cursor-pointer"
              onClick={() => setCanvas('project_detail', { projectId: project.id })}
            >
            <GlassCard
              className="hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${healthColor}`} />
                  <h3 className="text-text-primary font-medium truncate">{project.title}</h3>
                </div>
                {badge && <Badge label={badge.label} variant={badge.variant} />}
              </div>

              {/* Phase indicator */}
              <div className="flex items-center gap-1 mb-3">
                {PHASES.map((phase, i) => (
                  <div
                    key={phase}
                    className={`h-1.5 flex-1 rounded-full ${
                      i < currentPhaseIdx ? 'bg-primary/40' :
                      i === currentPhaseIdx ? 'bg-primary' :
                      'bg-text-tertiary/20'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  {project.monthly_revenue > 0 && (
                    <span className="font-mono">{dashboard.currency} {project.monthly_revenue.toLocaleString('en-US')}/mo</span>
                  )}
                  {project.monthly_revenue === 0 && <span className="text-text-tertiary">No revenue yet</span>}
                </span>
                <span className="text-text-tertiary">
                  {project.completed_tasks}/{project.task_count} tasks
                </span>
              </div>

              {/* Task progress bar */}
              {project.task_count > 0 && (
                <div className="mt-2 h-1 bg-text-tertiary/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/60 rounded-full transition-all"
                    style={{ width: `${(project.completed_tasks / project.task_count) * 100}%` }}
                  />
                </div>
              )}
            </GlassCard>
            </div>
          );
        })}
      </div>

      {/* Idea Backlog */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">
            IDEA BACKLOG
          </h3>
          <Badge label={`${dashboard.ranked_ideas.length} IDEAS`} variant="council" />
        </div>

        {dashboard.ranked_ideas.length === 0 ? (
          <p className="text-text-tertiary text-sm">No ideas yet. Capture some ideas to get started.</p>
        ) : (
          <div className="space-y-3">
            {dashboard.ranked_ideas.map((ranked) => (
              <div
                key={ranked.idea.id}
                className="flex items-center gap-3 py-2 border-b border-[var(--glass-border)] last:border-0"
              >
                {/* Composite score badge */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-mono text-sm font-bold ${
                  ranked.composite_score >= 70 ? 'bg-success/15 text-success' :
                  ranked.composite_score >= 40 ? 'bg-primary/15 text-primary' :
                  'bg-text-tertiary/15 text-text-tertiary'
                }`}>
                  {ranked.composite_score}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-medium truncate">{ranked.idea.title}</p>
                  <p className="text-text-tertiary text-xs truncate">{ranked.idea.description}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!ranked.evaluated && (
                    <Badge label="UNEVALUATED" variant="paused" />
                  )}
                  {ranked.idea.status === 'validated' && (
                    <Badge label="VALIDATED" variant="active" />
                  )}

                  {!ranked.evaluated && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEvaluate(ranked.idea.id); }}
                      disabled={evaluating === ranked.idea.id}
                      className="px-3 py-1 rounded-md text-xs font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                    >
                      {evaluating === ranked.idea.id ? 'Evaluating...' : 'Evaluate'}
                    </button>
                  )}

                  {ranked.evaluated && ranked.idea.status === 'validated' && !ranked.idea.council_verdict && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePromote(ranked.idea.id); }}
                      className="px-3 py-1 rounded-md text-xs font-medium bg-primary text-base hover:bg-primary/80 transition-colors"
                    >
                      Promote
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {dashboard.unevaluated_ideas_count > 0 && (
          <p className="text-text-tertiary text-xs mt-3">
            {dashboard.unevaluated_ideas_count} idea(s) awaiting evaluation
          </p>
        )}
      </GlassCard>
    </div>
  );
}
