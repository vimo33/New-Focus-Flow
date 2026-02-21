import { useEffect, useState, useMemo } from 'react';
import { FlaskConical, BarChart3, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../../services/api';
import { GlassCard, StatCard } from '../shared';

export default function VariantTesting() {
  const [experiments, setExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Significance calculator state
  const [calcInputs, setCalcInputs] = useState({
    baselineRate: 5,
    variantRate: 7,
    sampleSize: 1000,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.getExperimentsV2();
      setExperiments(res.experiments || []);
    } catch (err) {
      console.error('Failed to load experiments:', err);
    } finally {
      setLoading(false);
    }
  }

  // Experiments with variant data
  const abTests = experiments.filter(e =>
    e.resultsJson?.baseline !== undefined && e.resultsJson?.variant !== undefined
  );

  // Simple significance calculation (z-test approximation)
  const calcResult = useMemo(() => {
    const { baselineRate, variantRate, sampleSize } = calcInputs;
    const p1 = baselineRate / 100;
    const p2 = variantRate / 100;
    const pooled = (p1 + p2) / 2;
    const se = Math.sqrt(pooled * (1 - pooled) * (2 / sampleSize));
    const z = se > 0 ? Math.abs(p2 - p1) / se : 0;
    // Two-tailed p-value approximation
    const pValue = z > 0 ? Math.exp(-0.5 * z * z) * 2 : 1;
    const significant = pValue < 0.05 && sampleSize >= 100;
    return { z: z.toFixed(2), pValue: pValue.toFixed(4), significant };
  }, [calcInputs]);

  return (
    <div data-testid="canvas-variant-testing" className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <FlaskConical size={20} className="text-tertiary" />
          Variant Testing
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          A/B test results and statistical significance
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard value={String(abTests.length)} label="A/B Tests" />
        <StatCard
          value={String(abTests.filter(e => e.resultsJson?.p_value < 0.05).length)}
          label="Significant"
        />
        <StatCard
          value={String(experiments.filter(e => e.status === 'running').length)}
          label="Running"
        />
      </div>

      {/* Significance Calculator */}
      <GlassCard className="mb-6">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
          <BarChart3 size={14} className="text-primary" />
          Significance Calculator
        </h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Baseline Rate (%)</label>
            <input
              type="number" min={0} max={100} step={0.1}
              value={calcInputs.baselineRate}
              onChange={e => setCalcInputs(v => ({ ...v, baselineRate: Number(e.target.value) }))}
              className="w-full bg-surface border border-white/10 rounded px-3 py-2 text-sm text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Variant Rate (%)</label>
            <input
              type="number" min={0} max={100} step={0.1}
              value={calcInputs.variantRate}
              onChange={e => setCalcInputs(v => ({ ...v, variantRate: Number(e.target.value) }))}
              className="w-full bg-surface border border-white/10 rounded px-3 py-2 text-sm text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Sample Size</label>
            <input
              type="number" min={10}
              value={calcInputs.sampleSize}
              onChange={e => setCalcInputs(v => ({ ...v, sampleSize: Number(e.target.value) }))}
              className="w-full bg-surface border border-white/10 rounded px-3 py-2 text-sm text-slate-200"
            />
          </div>
        </div>
        <div className={`flex items-center gap-3 p-3 rounded-lg ${
          calcResult.significant ? 'bg-success/10 border border-success/20' : 'bg-white/[0.02] border border-white/5'
        }`}>
          {calcResult.significant ? (
            <CheckCircle2 size={16} className="text-success" />
          ) : (
            <XCircle size={16} className="text-slate-500" />
          )}
          <div>
            <p className="text-sm text-slate-200">
              {calcResult.significant ? 'Statistically Significant' : 'Not Significant'}
            </p>
            <p className="text-xs text-slate-500">
              z = {calcResult.z} · p-value = {calcResult.pValue} · Lift = {(calcInputs.variantRate - calcInputs.baselineRate).toFixed(1)}pp
            </p>
          </div>
        </div>
      </GlassCard>

      {/* A/B Test Results */}
      <GlassCard>
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
          <FlaskConical size={14} className="text-tertiary" />
          Test Results
        </h2>
        {loading ? (
          <p className="text-xs text-slate-500 text-center py-6">Loading tests...</p>
        ) : abTests.length === 0 ? (
          <div className="text-center py-8">
            <FlaskConical size={32} className="text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No A/B test results yet</p>
            <p className="text-slate-600 text-xs mt-1">
              Record baseline and variant data in experiments to see them here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {abTests.map(exp => {
              const r = exp.resultsJson;
              const lift = r.lift ?? ((r.variant - r.baseline) / Math.max(r.baseline, 0.001) * 100);
              const sig = r.p_value !== undefined && r.p_value < 0.05;
              return (
                <div key={exp.id} className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm text-slate-200 font-medium">
                      {exp.metricName || exp.metric_name}
                    </h3>
                    {sig && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-success/20 text-success">
                        significant
                      </span>
                    )}
                  </div>
                  <div className="flex gap-6 text-xs">
                    <div>
                      <p className="text-slate-500">Baseline</p>
                      <p className="font-mono text-slate-300">{r.baseline}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Variant</p>
                      <p className="font-mono text-slate-300">{r.variant}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Lift</p>
                      <p className={`font-mono ${lift > 0 ? 'text-success' : 'text-danger'}`}>
                        {lift > 0 ? '+' : ''}{lift.toFixed(1)}%
                      </p>
                    </div>
                    {r.p_value !== undefined && (
                      <div>
                        <p className="text-slate-500">p-value</p>
                        <p className="font-mono text-slate-300">{Number(r.p_value).toFixed(4)}</p>
                      </div>
                    )}
                    {r.sample_size && (
                      <div>
                        <p className="text-slate-500">n</p>
                        <p className="font-mono text-slate-300">{r.sample_size}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
