import { useEffect, useState } from 'react';
import { Users, BarChart3, Clock, DollarSign } from 'lucide-react';
import { api } from '../../services/api';
import type { AgentRun, AgentRunStats } from '../../services/api';
import { StatCard, GlassCard, AgentCard } from '../shared';

// Known agent definitions
const KNOWN_AGENTS = [
  { name: 'nitara-portfolio-analyst', model: 'opus' },
  { name: 'nitara-researcher', model: 'sonnet' },
  { name: 'nitara-network-analyst', model: 'sonnet' },
  { name: 'nitara-builder', model: 'opus' },
  { name: 'nitara-meta', model: 'opus' },
];

export default function AgentDashboard() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [stats, setStats] = useState<AgentRunStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const [runsRes, statsRes] = await Promise.all([
        api.getAgentRuns(statusFilter ? { status: statusFilter } : {}),
        api.getAgentRunStats(),
      ]);
      setRuns(runsRes.runs || []);
      setStats(statsRes);
    } catch (err) {
      console.error('Failed to load agent data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Compute per-agent stats from runs
  const agentStats = KNOWN_AGENTS.map(agent => {
    const agentRuns = runs.filter(r =>
      (r.agentsJson || []).some((a: string) => a.includes(agent.name))
    );
    return {
      ...agent,
      totalRuns: agentRuns.length,
      totalCost: agentRuns.reduce((s, r) => s + (Number(r.costUsd) || 0), 0),
      lastRun: agentRuns[0]?.createdAt,
      status: agentRuns.some(r => r.status === 'running') ? 'running' as const : 'idle' as const,
    };
  });

  const STATUSES = ['', 'queued', 'running', 'completed', 'failed', 'cancelled'];

  return (
    <div data-testid="canvas-agent-dashboard" className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Users size={20} className="text-primary" />
          Agent Dashboard
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Agent performance, run history, and cost breakdown
        </p>
      </div>

      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard value={String(stats.total_runs)} label="Total Runs" />
          <StatCard value={`$${stats.total_cost.toFixed(2)}`} label="Total Cost" />
          <StatCard value={String(stats.by_status?.completed?.count || 0)} label="Completed" />
          <StatCard value={String(stats.by_status?.failed?.count || 0)} label="Failed" />
        </div>
      )}

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {agentStats.map(agent => (
          <AgentCard
            key={agent.name}
            name={agent.name}
            model={agent.model}
            totalRuns={agent.totalRuns}
            totalCost={agent.totalCost}
            lastRun={agent.lastRun}
            status={agent.status}
          />
        ))}
      </div>

      {/* Cost Breakdown by Mode */}
      {stats && stats.by_mode.length > 0 && (
        <GlassCard className="mb-6">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-primary" />
            Cost by Mode
          </h2>
          <div className="space-y-3">
            {stats.by_mode.map(m => {
              const maxCost = Math.max(...stats.by_mode.map(x => x.cost), 1);
              const pct = (m.cost / maxCost) * 100;
              return (
                <div key={m.mode} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-20 capitalize">{m.mode}</span>
                  <div className="flex-1 h-5 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/40 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-300 w-20 text-right">
                    ${m.cost.toFixed(2)} ({m.count})
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Run History */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Clock size={14} className="text-slate-400" />
            Run History
          </h2>
          <div className="flex gap-1">
            {STATUSES.map(s => (
              <button
                key={s || 'all'}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-primary/20 text-primary'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500 text-center py-6">Loading runs...</p>
        ) : runs.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No agent runs found</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {runs.map(run => (
              <div key={run.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  run.status === 'running' ? 'bg-success animate-pulse' :
                  run.status === 'completed' ? 'bg-primary' :
                  run.status === 'failed' ? 'bg-danger' : 'bg-slate-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 truncate">
                    {(run.agentsJson || []).join(', ') || 'Unknown agent'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {run.mode} · {new Date(run.createdAt).toLocaleString()}
                  </p>
                </div>
                {run.costUsd !== null && run.costUsd !== undefined && (
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                    <DollarSign size={10} />
                    {Number(run.costUsd).toFixed(4)}
                  </span>
                )}
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  run.status === 'completed' ? 'bg-primary/20 text-primary' :
                  run.status === 'running' ? 'bg-success/20 text-success' :
                  run.status === 'failed' ? 'bg-danger/20 text-danger' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  {run.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
