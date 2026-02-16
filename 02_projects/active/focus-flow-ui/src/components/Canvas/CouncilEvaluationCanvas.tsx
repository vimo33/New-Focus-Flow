import { useEffect, useState } from 'react';
import { useCanvasStore } from '../../stores/canvas';
import { api } from '../../services/api';
import { GlassCard, ConfidenceRing } from '../shared';

interface Evaluator {
  name: string;
  specialty: string;
  score: number;
  assessment: string;
  risk?: { label: string; type: 'caution' | 'risk' };
}

export default function CouncilEvaluationCanvas() {
  const { canvasParams } = useCanvasStore();
  const [verdict, setVerdict] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const projectId = canvasParams?.projectId;
    const verdictId = canvasParams?.verdictId;

    if (verdictId) {
      api.getCouncilVerdict(verdictId)
        .then(v => { setVerdict(v); setLoading(false); })
        .catch(err => { setError(err.message); setLoading(false); });
    } else if (projectId) {
      api.getCouncilVerdicts(projectId)
        .then(res => {
          setVerdict(res.verdicts?.[0] || null);
          setLoading(false);
        })
        .catch(err => { setError(err.message); setLoading(false); });
    } else {
      // No params — try to get latest verdict
      api.getCouncilVerdicts()
        .then(res => {
          setVerdict(res.verdicts?.[0] || null);
          setLoading(false);
        })
        .catch(err => { setError(err.message); setLoading(false); });
    }
  }, [canvasParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-tertiary">Loading council evaluation...</div>
      </div>
    );
  }

  if (error || !verdict) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-text-secondary text-lg">No Council Evaluation</p>
          <p className="text-text-tertiary text-sm mt-1">
            {error || 'Run a council evaluation on a project to see results here.'}
          </p>
        </div>
      </div>
    );
  }

  // Map verdict data to evaluators
  const projectName = verdict.project_name || verdict.project_title || canvasParams?.projectName || 'Project';
  const compositeScore = verdict.overall_score || 0;
  const evaluations = verdict.evaluations || [];

  const evaluators: Evaluator[] = evaluations.map((ev: any) => {
    const concerns = ev.concerns || [];
    const topConcern = concerns[0];
    return {
      name: ev.evaluator_name || ev.agent_name || 'Evaluator',
      specialty: (ev.perspective || ev.role || 'Analysis').toUpperCase(),
      score: ev.score || 0,
      assessment: ev.analysis || ev.reasoning || '',
      risk: topConcern
        ? { label: topConcern, type: (ev.score < 6 ? 'risk' : 'caution') as 'risk' | 'caution' }
        : undefined,
    };
  });

  const actions = verdict.next_steps || [];

  const handleApplyActions = async () => {
    if (verdict.id) {
      await api.applyCouncilActions(verdict.id).catch(console.error);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">
          COUNCIL EVALUATION // PROJECT: {projectName.toUpperCase()}
        </h2>
        <p className="text-text-secondary text-sm mt-1">
          {evaluators.length > 0
            ? `Synthesis of ${evaluators.length} specialized intelligence node${evaluators.length !== 1 ? 's' : ''}.`
            : 'Council evaluation complete.'}
        </p>
      </div>

      {/* Main layout: evaluators */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {evaluators.map((ev, i) => (
          <GlassCard key={i}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-tertiary text-lg">{'\u25C8'}</span>
              <div>
                <p className="text-text-primary text-sm font-semibold">{ev.name}</p>
                <p className="text-text-tertiary text-[10px] tracking-wider uppercase">{ev.specialty}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-xl font-bold text-text-primary tabular-nums">{ev.score.toFixed(1)}</span>
              <span className="text-text-tertiary text-xs">/10</span>
            </div>
            <p className="text-text-secondary text-sm mb-3">{ev.assessment}</p>
            {ev.risk && (
              <div className={`px-3 py-2 rounded-lg text-xs font-medium ${
                ev.risk.type === 'caution'
                  ? 'bg-secondary/10 text-secondary border border-secondary/20'
                  : 'bg-danger/10 text-danger border border-danger/20'
              }`}>
                {ev.risk.label}
              </div>
            )}
          </GlassCard>
        ))}
      </div>

      {/* Central composite score */}
      <div className="flex justify-center mb-8">
        <div className="text-center">
          <ConfidenceRing score={compositeScore} size="lg" />
          <p className="text-xs tracking-wider text-text-tertiary uppercase mt-2">
            {compositeScore >= 7 ? 'OPPORTUNITY' : compositeScore >= 5 ? 'PROCEED WITH CAUTION' : 'PASS'}
          </p>
          {verdict.synthesized_reasoning && (
            <p className="text-text-secondary text-sm mt-3 max-w-lg mx-auto">{verdict.synthesized_reasoning}</p>
          )}
        </div>
      </div>

      {/* Protocol actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard>
          <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Risk Matrix</h3>
          <div className="space-y-2">
            {evaluators.filter(e => e.risk).map((ev, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${ev.risk?.type === 'caution' ? 'bg-secondary' : 'bg-danger'}`} />
                <span className="text-text-secondary text-sm">{ev.risk?.label}</span>
              </div>
            ))}
            {evaluators.filter(e => e.risk).length === 0 && (
              <p className="text-text-tertiary text-sm">No significant risks identified</p>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">Nitara Protocol</h3>
            {actions.length > 0 && verdict.id && (
              <button
                onClick={handleApplyActions}
                className="px-3 py-1 rounded-md text-xs font-medium bg-primary text-base hover:bg-primary/80 transition-colors"
              >
                Apply Actions
              </button>
            )}
          </div>
          <div className="space-y-2">
            {actions.length === 0 ? (
              <p className="text-text-tertiary text-sm">No next steps defined</p>
            ) : (
              actions.map((action: string, i: number) => (
                <div key={i} className="flex gap-2">
                  <span className="text-primary font-mono text-sm flex-shrink-0">{i + 1}.</span>
                  <span className="text-text-secondary text-sm">{action}</span>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
