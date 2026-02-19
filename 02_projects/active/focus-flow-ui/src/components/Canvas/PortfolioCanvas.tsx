import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
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
  council_verdict?: {
    overall_score: number;
    recommendation: 'approve' | 'reject' | 'needs-info';
    num_evaluations: number;
    council_composition: string[];
  };
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
}

const PLAYBOOK_BADGES: Record<string, { label: string; variant: 'active' | 'playbook' | 'council' | 'completed' | 'paused' }> = {
  'software-build': { label: 'SOFTWARE', variant: 'active' },
  'client-engagement': { label: 'CLIENT', variant: 'playbook' },
  'content-course': { label: 'CONTENT', variant: 'council' },
  'studio-project': { label: 'STUDIO', variant: 'completed' },
  'exploratory-idea': { label: 'EXPLORE', variant: 'paused' },
};


const HEALTH_COLORS: Record<string, string> = {
  thriving: 'bg-success',
  healthy: 'bg-primary',
  stalling: 'bg-secondary',
  at_risk: 'bg-danger',
};

type FilterTab = 'all' | 'active' | 'paused';

const PIPELINE_PHASES = ['CONCEPT', 'SPEC', 'DESIGN', 'DEV', 'TEST', 'DEPLOY', 'LIVE'];
const PHASE_TO_PIPELINE: Record<string, number> = {
  concept: 0, spec: 1, design: 2, dev: 3, test: 4, deploy: 5, live: 6,
};

export default function PortfolioCanvas() {
  const { setCanvas } = useCanvasStore();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');

  useEffect(() => {
    api.getPortfolioDashboard()
      .then(setDashboard)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">PORTFOLIO</h2>
          <h1 className="text-2xl lg:text-3xl font-bold text-text-primary tracking-tight mt-1" style={{ fontFamily: 'var(--font-body)' }}>
            Your Ventures
          </h1>
          <p className="text-text-secondary text-sm mt-2">
            {dashboard.active_count} active{dashboard.paused_count > 0 ? `, ${dashboard.paused_count} paused` : ''}
            {dashboard.completed_count > 0 ? `, ${dashboard.completed_count} completed` : ''}
          </p>
        </div>
        <button
          onClick={() => setCanvas('venture_wizard')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-500/20 text-indigo-400 text-sm font-medium hover:bg-indigo-500/30 border border-indigo-500/20 transition-colors"
        >
          <Plus size={16} />
          New Venture
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { key: 'all', label: 'All' },
          { key: 'active', label: 'Active' },
          { key: 'paused', label: 'Paused' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-colors ${
              filter === tab.key
                ? 'bg-primary text-base'
                : 'bg-elevated/50 text-text-secondary hover:text-text-primary border border-[var(--glass-border)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {dashboard.projects
          .filter(p => {
            if (filter === 'all') return true;
            if (filter === 'active') return p.status === 'active';
            if (filter === 'paused') return p.status === 'paused';
            return true;
          })
          .map((project) => {
          const badge = project.playbook_type ? PLAYBOOK_BADGES[project.playbook_type] : null;
          const pipelineIdx = project.phase ? (PHASE_TO_PIPELINE[project.phase] ?? -1) : -1;
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
                <div className="flex items-center gap-2 flex-shrink-0">
                  {project.council_verdict && (
                    <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                      project.council_verdict.overall_score >= 7 ? 'bg-success/15 text-success' :
                      project.council_verdict.overall_score >= 5 ? 'bg-secondary/15 text-secondary' :
                      'bg-danger/15 text-danger'
                    }`}>
                      {project.council_verdict.overall_score?.toFixed(1) || '—'}/10
                    </span>
                  )}
                  {badge && <Badge label={badge.label} variant={badge.variant} />}
                </div>
              </div>

              {/* Pipeline dot visualization */}
              <div className="flex items-center gap-2 mb-3">
                {PIPELINE_PHASES.map((phase, i) => (
                  <div key={phase} className="flex items-center gap-1">
                    <div
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
                        i < pipelineIdx ? 'bg-primary/50' :
                        i === pipelineIdx ? 'bg-primary ring-2 ring-primary/30' :
                        'bg-text-tertiary/20'
                      }`}
                    />
                    <span className={`text-[9px] tracking-wider ${
                      i === pipelineIdx ? 'text-primary font-semibold' : 'text-text-tertiary'
                    }`}>
                      {phase}
                    </span>
                    {i < PIPELINE_PHASES.length - 1 && (
                      <div className={`w-3 h-px ${i < pipelineIdx ? 'bg-primary/30' : 'bg-text-tertiary/15'}`} />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  {project.monthly_revenue > 0 ? (
                    <span className="font-mono">{dashboard.currency} {project.monthly_revenue.toLocaleString('en-US')}/mo</span>
                  ) : (
                    <span className="text-text-tertiary">No revenue yet</span>
                  )}
                </span>
                {project.monthly_costs > 0 && (
                  <span className="text-text-tertiary font-mono text-xs">
                    -{dashboard.currency} {project.monthly_costs.toLocaleString('en-US')}/mo
                  </span>
                )}
                <span className="text-text-tertiary">
                  {project.completed_tasks}/{project.task_count} tasks
                </span>
              </div>
            </GlassCard>
            </div>
          );
        })}
      </div>

    </div>
  );
}
