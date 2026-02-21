import { useState } from 'react';
import { Calculator, AlertTriangle, Lightbulb } from 'lucide-react';
import { api } from '../../services/api';
import type { SimulationResult } from '../../services/api';
import { GlassCard, StatCard } from '../shared';

export default function SimulationView() {
  const [params, setParams] = useState({
    budgetPerDay: 20,
    founderHoursPerWeek: 20,
    riskTolerance: 'medium' as 'low' | 'medium' | 'high',
    timeHorizonWeeks: 12,
  });
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runSimulation() {
    setLoading(true);
    try {
      const res = await api.runSimulation({
        projects: [],
        ...params,
      });
      setResult(res);
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Calculator size={20} className="text-tertiary" />
          Simulation
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          What-if scenarios to project growth outcomes
        </p>
      </div>

      {/* Scenario Builder */}
      <GlassCard className="mb-6">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Scenario Parameters</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Budget ($/day): <span className="text-slate-200 font-mono">${params.budgetPerDay}</span>
            </label>
            <input
              type="range" min={5} max={100} step={5}
              value={params.budgetPerDay}
              onChange={e => setParams(p => ({ ...p, budgetPerDay: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Founder Hours/Week: <span className="text-slate-200 font-mono">{params.founderHoursPerWeek}h</span>
            </label>
            <input
              type="range" min={5} max={60} step={5}
              value={params.founderHoursPerWeek}
              onChange={e => setParams(p => ({ ...p, founderHoursPerWeek: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Risk Tolerance</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setParams(p => ({ ...p, riskTolerance: level }))}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                    params.riskTolerance === level
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-surface text-slate-500 border border-white/5 hover:text-slate-300'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Time Horizon: <span className="text-slate-200 font-mono">{params.timeHorizonWeeks} weeks</span>
            </label>
            <input
              type="range" min={4} max={52} step={4}
              value={params.timeHorizonWeeks}
              onChange={e => setParams(p => ({ ...p, timeHorizonWeeks: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
          </div>
        </div>
        <button
          onClick={runSimulation}
          disabled={loading}
          className="mt-6 w-full py-3 rounded-lg bg-primary/20 text-primary text-sm font-semibold hover:bg-primary/30 transition-colors disabled:opacity-50"
        >
          {loading ? 'Running Simulation...' : 'Run Simulation'}
        </button>
      </GlassCard>

      {/* Results */}
      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <StatCard value={`$${result.projectedMrr}`} label="Projected MRR" currency="" />
            <StatCard value={`${result.experimentVelocity}/wk`} label="Experiment Velocity" />
            <StatCard value={result.validationTimeline.split(',')[0]} label="First Validation" />
          </div>

          <GlassCard className="mb-6">
            <p className="text-xs text-slate-400 mb-3 font-mono">{result.scenario}</p>
            <p className="text-sm text-slate-300">{result.validationTimeline}</p>
          </GlassCard>

          {result.risks.length > 0 && (
            <GlassCard className="mb-6">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-warning" />
                Risks
              </h2>
              <ul className="space-y-1">
                {result.risks.map((r, i) => (
                  <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                    <span className="text-warning mt-0.5">·</span> {r}
                  </li>
                ))}
              </ul>
            </GlassCard>
          )}

          {result.recommendations.length > 0 && (
            <GlassCard>
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
                <Lightbulb size={14} className="text-success" />
                Recommendations
              </h2>
              <ul className="space-y-1">
                {result.recommendations.map((r, i) => (
                  <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                    <span className="text-success mt-0.5">·</span> {r}
                  </li>
                ))}
              </ul>
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
}
