import { useEffect, useState } from 'react';
import { TrendingUp, Activity, Beaker, Target } from 'lucide-react';
import { api } from '../../services/api';
import { StatCard, GlassCard, ConfidenceRing } from '../shared';

export default function KPIDashboard() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [financials, setFinancials] = useState<any>(null);
  const [experiments, setExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [portfolioRes, financialsRes, experimentsRes] = await Promise.all([
        api.getPortfolioDashboard().catch(() => null),
        api.getPortfolioFinancials().catch(() => null),
        api.getExperimentsV2().catch(() => ({ experiments: [] })),
      ]);
      setPortfolio(portfolioRes);
      setFinancials(financialsRes);
      setExperiments(experimentsRes.experiments || []);
    } catch (err) {
      console.error('KPI load failed:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div data-testid="canvas-kpi-dashboard" className="flex items-center justify-center h-64">
        <p className="text-slate-500 text-sm">Loading KPI dashboard...</p>
      </div>
    );
  }

  const projects = portfolio?.projects || [];
  const totalMrr = financials?.total_mrr || financials?.revenue?.monthly || 0;
  const activeProjects = projects.filter((p: any) => p.status === 'active').length;
  const runningExperiments = experiments.filter(e => e.status === 'running').length;
  const completedExperiments = experiments.filter(e => e.status === 'completed').length;

  // Hypothesis validation funnel
  const draftCount = experiments.filter(e => e.status === 'draft').length;
  const funnelStages = [
    { label: 'Draft', count: draftCount, color: 'bg-slate-500' },
    { label: 'Running', count: runningExperiments, color: 'bg-primary' },
    { label: 'Completed', count: completedExperiments, color: 'bg-success' },
    { label: 'Decided', count: experiments.filter(e => e.decision).length, color: 'bg-tertiary' },
  ];
  const maxFunnel = Math.max(...funnelStages.map(s => s.count), 1);

  return (
    <div data-testid="canvas-kpi-dashboard" className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <TrendingUp size={20} className="text-success" />
          KPI Dashboard
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Cross-project metrics and growth tracking
        </p>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          value={totalMrr > 0 ? String(totalMrr) : '0'}
          label="Total MRR"
          currency="$"
        />
        <StatCard value={String(activeProjects)} label="Active Projects" />
        <StatCard value={String(runningExperiments)} label="Experiments Running" />
        <StatCard
          value={String(completedExperiments > 0 ? Math.round(completedExperiments / Math.max(experiments.length, 1) * 100) : 0) + '%'}
          label="Completion Rate"
        />
      </div>

      {/* Project Health Grid */}
      {projects.length > 0 && (
        <GlassCard className="mb-6">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <Activity size={14} className="text-primary" />
            Project Health
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project: any) => {
              const health = project.health_score ?? project.progress ?? 50;
              return (
                <div key={project.id} className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <ConfidenceRing score={health / 10} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 font-medium truncate">{project.title || project.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{project.stage || project.status}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Validation Funnel */}
      <GlassCard className="mb-6">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
          <Beaker size={14} className="text-tertiary" />
          Experiment Validation Funnel
        </h2>
        <div className="space-y-3">
          {funnelStages.map(stage => (
            <div key={stage.label} className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-20">{stage.label}</span>
              <div className="flex-1 h-7 bg-surface rounded-full overflow-hidden">
                <div
                  className={`h-full ${stage.color} rounded-full flex items-center justify-end pr-2 transition-all duration-500`}
                  style={{ width: `${Math.max((stage.count / maxFunnel) * 100, 8)}%` }}
                >
                  <span className="text-[10px] font-mono text-white">{stage.count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Decision Velocity */}
      <GlassCard>
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
          <Target size={14} className="text-success" />
          Recent Decisions
        </h2>
        {experiments.filter(e => e.decision).length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No experiment decisions recorded yet</p>
        ) : (
          <div className="space-y-2">
            {experiments.filter(e => e.decision).slice(0, 10).map(exp => (
              <div key={exp.id} className="flex items-center gap-3 p-2 rounded bg-white/[0.02]">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  exp.decision === 'scale' ? 'bg-success/20 text-success' :
                  exp.decision === 'kill' ? 'bg-danger/20 text-danger' :
                  'bg-primary/20 text-primary'
                }`}>
                  {exp.decision}
                </span>
                <p className="text-sm text-slate-300 flex-1 truncate">{exp.metricName || exp.metric_name}</p>
                <span className="text-xs text-slate-500">
                  {new Date(exp.createdAt || exp.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
