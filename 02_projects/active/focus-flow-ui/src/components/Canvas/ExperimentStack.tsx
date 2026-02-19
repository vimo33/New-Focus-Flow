import { useState, useEffect } from 'react';
import { FlaskConical, AlertTriangle } from 'lucide-react';
import { useExperimentStore, type Experiment } from '../../stores/experiment';
import DecisionGateCard from '../shared/DecisionGateCard';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Draft' },
  running: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Running' },
  paused: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Paused' },
  completed: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', label: 'Completed' },
};

type TabFilter = 'all' | 'decision-required' | 'running';

function ExperimentCard({ experiment }: { experiment: Experiment }) {
  const status = STATUS_STYLES[experiment.status] || STATUS_STYLES.draft;
  const needsDecision = experiment.status === 'completed' && !experiment.decision;
  const results = experiment.resultsJson;
  const { recordDecision } = useExperimentStore();
  const [decidingRationale, setDecidingRationale] = useState('');
  const [showRationale, setShowRationale] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const handleDecide = (action: string) => {
    setPendingAction(action);
    setShowRationale(true);
  };

  const confirmDecision = () => {
    if (pendingAction && decidingRationale.trim()) {
      recordDecision(experiment.id, pendingAction, decidingRationale);
      setShowRationale(false);
      setPendingAction(null);
      setDecidingRationale('');
    }
  };

  return (
    <div className={`bg-[rgba(15,10,20,0.65)] backdrop-blur-[20px] border rounded-xl p-5 transition-all hover:border-white/15 ${
      needsDecision ? 'border-amber-500/30' : 'border-white/8'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-slate-200">{experiment.metricName}</h3>
            {needsDecision && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase">
                <AlertTriangle size={10} /> Decision Required
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{experiment.successRule}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${status.bg} ${status.text}`}>
          {status.label}
        </span>
      </div>

      {results && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Baseline</p>
            <p className="text-sm font-mono text-slate-300">{results.baseline ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Variant</p>
            <p className="text-sm font-mono text-slate-300">{results.variant ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Lift</p>
            <p className={`text-sm font-mono ${(results.lift ?? 0) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {results.lift != null ? `${results.lift > 0 ? '+' : ''}${results.lift}%` : '—'}
            </p>
          </div>
        </div>
      )}

      {experiment.decision && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5 mb-3">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Decision:</span>
          <span className="text-xs font-semibold text-slate-300 capitalize">{experiment.decision}</span>
          {experiment.decisionRationale && (
            <span className="text-xs text-slate-500 truncate ml-1">— {experiment.decisionRationale}</span>
          )}
        </div>
      )}

      {needsDecision && !showRationale && (
        <div className="pt-3 border-t border-white/5">
          <DecisionGateCard onDecide={handleDecide} compact />
        </div>
      )}

      {showRationale && (
        <div className="pt-3 border-t border-white/5 space-y-2">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">
            Rationale for <span className="text-slate-200 capitalize">{pendingAction}</span>
          </p>
          <input
            type="text"
            value={decidingRationale}
            onChange={(e) => setDecidingRationale(e.target.value)}
            placeholder="Why this decision?"
            className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-white/40"
            onKeyDown={(e) => e.key === 'Enter' && confirmDecision()}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={confirmDecision}
              disabled={!decidingRationale.trim()}
              className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-40"
            >
              Confirm
            </button>
            <button
              onClick={() => { setShowRationale(false); setPendingAction(null); }}
              className="px-3 py-1.5 text-slate-500 text-xs hover:text-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExperimentStack() {
  const { experiments, loading, fetchExperiments } = useExperimentStore();
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  // For now, fetch all experiments across projects (using a wildcard or default project)
  useEffect(() => {
    // Try to load experiments — will use dev auth fallback
    fetchExperiments('all');
  }, [fetchExperiments]);

  const filtered = experiments.filter((exp) => {
    if (activeTab === 'decision-required') return exp.status === 'completed' && !exp.decision;
    if (activeTab === 'running') return exp.status === 'running';
    return true;
  });

  const decisionRequiredCount = experiments.filter(e => e.status === 'completed' && !e.decision).length;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FlaskConical size={20} className="text-amber-400" />
            Experiment Stack
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {experiments.length} experiments · {decisionRequiredCount} decisions pending
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 p-1 bg-white/5 rounded-lg w-fit">
        {[
          { id: 'all' as TabFilter, label: 'All' },
          { id: 'decision-required' as TabFilter, label: `Decision Required (${decisionRequiredCount})` },
          { id: 'running' as TabFilter, label: 'Running' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white/10 text-slate-200'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Experiment list */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-slate-500 text-sm">Loading experiments...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <FlaskConical size={32} className="text-slate-600 mb-2" />
          <p className="text-slate-400 text-sm">No experiments yet</p>
          <p className="text-slate-600 text-xs mt-1">Create hypotheses in Think mode to generate experiments</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((exp) => (
            <ExperimentCard key={exp.id} experiment={exp} />
          ))}
        </div>
      )}
    </div>
  );
}
