import { useEffect, useState } from 'react';
import { Wallet, Calendar, Power, Settings2 } from 'lucide-react';
import { useBudgetStore } from '../../stores/budget';
import { api } from '../../services/api';
import { GlassCard, ProgressBar, KillSwitchToggle } from '../shared';
import type { ScheduleEntry, AgentRunStats } from '../../services/api';

export default function ResourceEngine() {
  const { budget, loading: budgetLoading, fetchBudget, updateBudget } = useBudgetStore();
  const [runStats, setRunStats] = useState<AgentRunStats | null>(null);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [editing, setEditing] = useState(false);
  const [formValues, setFormValues] = useState({ daily: 20, weekly: 100, threshold: 80 });

  useEffect(() => {
    fetchBudget();
    loadExtras();
  }, []);

  useEffect(() => {
    if (budget?.config) {
      setFormValues({
        daily: budget.config.daily_budget_usd,
        weekly: budget.config.weekly_budget_usd,
        threshold: budget.config.alert_threshold_pct,
      });
    }
  }, [budget?.config]);

  async function loadExtras() {
    try {
      const [statsRes, schedRes] = await Promise.all([
        api.getAgentRunStats().catch(() => null),
        api.getQueueSchedule().catch(() => ({ schedule: [] })),
      ]);
      if (statsRes) setRunStats(statsRes);
      setSchedule(schedRes.schedule || []);
    } catch {}
  }

  async function handleSave() {
    await updateBudget({
      daily_budget_usd: formValues.daily,
      weekly_budget_usd: formValues.weekly,
      alert_threshold_pct: formValues.threshold,
    });
    setEditing(false);
  }

  return (
    <div data-testid="canvas-resource-engine" className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Wallet size={20} className="text-success" />
            Resource Engine
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Budget management, cost tracking, and resource allocation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Kill Switch</span>
          <KillSwitchToggle />
        </div>
      </div>

      {/* Budget Overview */}
      <GlassCard className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Wallet size={14} className="text-success" />
            Budget Overview
          </h2>
          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            className="px-3 py-1 rounded text-xs font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
          >
            {editing ? 'Save' : 'Edit'}
          </button>
        </div>

        {budgetLoading ? (
          <p className="text-xs text-slate-500 text-center py-4">Loading budget...</p>
        ) : budget ? (
          <div className="space-y-4">
            <ProgressBar
              value={budget.today.spent}
              max={budget.today.budget}
              label="Daily Budget"
            />
            <ProgressBar
              value={budget.week.spent}
              max={budget.week.budget}
              label="Weekly Budget"
            />

            {editing && (
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Daily Limit ($)</label>
                  <input
                    type="number"
                    value={formValues.daily}
                    onChange={e => setFormValues(v => ({ ...v, daily: Number(e.target.value) }))}
                    className="w-full bg-surface border border-white/10 rounded px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Weekly Limit ($)</label>
                  <input
                    type="number"
                    value={formValues.weekly}
                    onChange={e => setFormValues(v => ({ ...v, weekly: Number(e.target.value) }))}
                    className="w-full bg-surface border border-white/10 rounded px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Alert at (%)</label>
                  <input
                    type="number"
                    value={formValues.threshold}
                    onChange={e => setFormValues(v => ({ ...v, threshold: Number(e.target.value) }))}
                    className="w-full bg-surface border border-white/10 rounded px-3 py-2 text-sm text-slate-200"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center py-4">Could not load budget</p>
        )}
      </GlassCard>

      {/* Cost by Mode */}
      {runStats && runStats.by_mode.length > 0 && (
        <GlassCard className="mb-6">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <Settings2 size={14} className="text-primary" />
            Spend by Mode
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {runStats.by_mode.map(m => (
              <div key={m.mode} className="text-center p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <p className="text-lg font-mono font-bold text-slate-200">${m.cost.toFixed(2)}</p>
                <p className="text-xs text-slate-500 capitalize">{m.mode}</p>
                <p className="text-[10px] text-slate-600">{m.count} runs</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Schedule Overview */}
      <GlassCard>
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
          <Calendar size={14} className="text-tertiary" />
          Scheduled Tasks ({schedule.length})
        </h2>
        {schedule.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No scheduled tasks</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {schedule.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <Power size={12} className="text-success shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300">{entry.description || entry.skill}</p>
                  <p className="text-xs text-slate-500 font-mono">{entry.cron}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400">
                  T{entry.trust_tier}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
