import { useEffect, useState } from 'react';
import { Database, Plus, Filter } from 'lucide-react';
import { api } from '../../services/api';
import type { Signal } from '../../services/api';
import { GlassCard, StatCard, SignalBadge } from '../shared';

export default function DataSources() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ projectId: '', type: 'metric', source: 'manual', value: '' });

  useEffect(() => {
    loadSignals();
  }, []);

  async function loadSignals() {
    setLoading(true);
    try {
      const res = await api.getSignals();
      setSignals(res.signals || []);
    } catch (err) {
      console.error('Failed to load signals:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.projectId || !form.type) return;
    try {
      let valueJson: unknown;
      try { valueJson = JSON.parse(form.value); } catch { valueJson = { raw: form.value }; }
      await api.createSignal({
        projectId: form.projectId,
        type: form.type,
        source: form.source,
        valueJson,
      });
      setShowForm(false);
      setForm({ projectId: '', type: 'metric', source: 'manual', value: '' });
      loadSignals();
    } catch (err) {
      console.error('Create signal failed:', err);
    }
  }

  // Group by source
  const bySource: Record<string, Signal[]> = {};
  signals.forEach(s => {
    const src = s.source || 'unknown';
    if (!bySource[src]) bySource[src] = [];
    bySource[src].push(s);
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Database size={20} className="text-primary" />
            Data Sources
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Signal sources, data points, and experiment feeds
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors"
        >
          <Plus size={14} /> Add Signal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard value={String(signals.length)} label="Total Signals" />
        <StatCard value={String(Object.keys(bySource).length)} label="Sources" />
        <StatCard
          value={String(signals.filter(s => s.experimentId).length)}
          label="Linked to Experiments"
        />
      </div>

      {/* Add Signal Form */}
      {showForm && (
        <GlassCard className="mb-6">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Add Signal</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Project ID</label>
              <input
                type="text"
                value={form.projectId}
                onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                placeholder="Project UUID"
                className="w-full bg-surface border border-white/10 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-600"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-surface border border-white/10 rounded px-3 py-2 text-sm text-slate-200"
              >
                <option value="metric">metric</option>
                <option value="event">event</option>
                <option value="feedback">feedback</option>
                <option value="alert">alert</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Source</label>
              <input
                type="text"
                value={form.source}
                onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                className="w-full bg-surface border border-white/10 rounded px-3 py-2 text-sm text-slate-200"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Value (JSON)</label>
              <input
                type="text"
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                placeholder='{"count": 42}'
                className="w-full bg-surface border border-white/10 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-600"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors"
          >
            Create Signal
          </button>
        </GlassCard>
      )}

      {/* Sources Overview */}
      {Object.keys(bySource).length > 0 && (
        <GlassCard className="mb-6">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <Filter size={14} className="text-slate-400" />
            Sources
          </h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(bySource).map(([source, sigs]) => (
              <div key={source} className="px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5 text-center">
                <p className="text-lg font-mono font-bold text-slate-200">{sigs.length}</p>
                <p className="text-xs text-slate-500">{source}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Signal Feed */}
      <GlassCard>
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
          <Database size={14} className="text-primary" />
          Recent Signals
        </h2>
        {loading ? (
          <p className="text-xs text-slate-500 text-center py-6">Loading signals...</p>
        ) : signals.length === 0 ? (
          <div className="text-center py-8">
            <Database size={32} className="text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No signals recorded yet</p>
            <p className="text-slate-600 text-xs mt-1">Add data points to track experiment signals</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {signals.map(sig => (
              <div key={sig.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <SignalBadge type={sig.type} source={sig.source} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 font-mono truncate">
                    {typeof sig.valueJson === 'object' ? JSON.stringify(sig.valueJson) : String(sig.valueJson || '')}
                  </p>
                </div>
                {sig.experimentId && (
                  <span className="text-[10px] text-slate-600 font-mono truncate max-w-24">
                    exp:{sig.experimentId.slice(0, 8)}
                  </span>
                )}
                <span className="text-[10px] text-slate-600 whitespace-nowrap">
                  {new Date(sig.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
