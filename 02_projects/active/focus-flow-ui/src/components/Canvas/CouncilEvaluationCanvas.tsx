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
  color: string;
}

const EVALUATOR_COLORS = ['text-primary', 'text-success', 'text-secondary', 'text-tertiary', 'text-danger'];
const EVALUATOR_BORDER_COLORS = ['border-l-primary', 'border-l-success', 'border-l-secondary', 'border-l-tertiary', 'border-l-danger'];
const EVALUATOR_BAR_COLORS = ['bg-primary', 'bg-success', 'bg-secondary', 'bg-tertiary', 'bg-danger'];

function EvaluatorCard({ ev, index }: { ev: Evaluator; index: number }) {
  const nameColor = EVALUATOR_COLORS[index % EVALUATOR_COLORS.length];
  const borderColor = EVALUATOR_BORDER_COLORS[index % EVALUATOR_BORDER_COLORS.length];
  const barColor = EVALUATOR_BAR_COLORS[index % EVALUATOR_BAR_COLORS.length];
  const barWidth = `${(ev.score / 10) * 100}%`;

  return (
    <GlassCard>
      {/* Header: icon + name + score */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg bg-elevated flex items-center justify-center ${nameColor} text-sm`}>
            {'\u25C8'}
          </div>
          <div>
            <p className={`text-sm font-semibold ${nameColor}`}>{ev.name}</p>
            <p className="text-text-tertiary text-[10px] tracking-[0.15em] uppercase">{ev.specialty}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="font-mono text-xl font-bold text-text-primary tabular-nums" style={{ letterSpacing: '0.05em' }}>
            {ev.score.toFixed(1)}
          </span>
          <span className="text-text-tertiary text-xs ml-0.5">/10</span>
        </div>
      </div>

      {/* Assessment with left border */}
      <div className={`border-l-2 ${borderColor} pl-3 mb-3`}>
        <p className="text-text-secondary text-sm leading-relaxed">{ev.assessment}</p>
      </div>

      {/* Risk badge */}
      {ev.risk && (
        <div className={`px-3 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase mb-4 ${
          ev.risk.type === 'caution'
            ? 'bg-secondary/10 text-secondary border border-secondary/20'
            : 'bg-danger/10 text-danger border border-danger/20'
        }`}>
          {ev.risk.type === 'caution' ? '\u25B2 ' : '\u25CF '}{ev.risk.label}
        </div>
      )}

      {/* Score bar at bottom */}
      <div className="flex items-center gap-2 mt-auto pt-2">
        <div className="flex-1 h-1 rounded-full bg-elevated/50 overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: barWidth }} />
        </div>
        <div className="w-6 h-1 rounded-full bg-text-tertiary/20" />
      </div>
    </GlassCard>
  );
}

export default function CouncilEvaluationCanvas() {
  const { canvasParams, goBack } = useCanvasStore();
  const [verdict, setVerdict] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const projectId = canvasParams?.projectId;
    const verdictId = canvasParams?.verdictId;

    const fetchFullVerdict = async (id: string) => {
      const res = await api.getCouncilVerdict(id);
      return res?.verdict || res;
    };

    const loadVerdict = async () => {
      try {
        if (verdictId) {
          const v = await fetchFullVerdict(verdictId);
          setVerdict(v);
        } else if (projectId) {
          const res = await api.getCouncilVerdicts(projectId);
          const summary = res.verdicts?.[0];
          if (summary?.id) {
            const full = await fetchFullVerdict(summary.id);
            setVerdict(full);
          } else {
            try {
              const proj = await api.getProject(projectId);
              if (proj?.artifacts?.council_verdict) {
                setVerdict({ ...proj.artifacts.council_verdict, project_name: proj.title });
              }
            } catch {
              // No verdict found
            }
          }
        } else {
          const res = await api.getCouncilVerdicts();
          const summary = res.verdicts?.[0];
          if (summary?.id) {
            const full = await fetchFullVerdict(summary.id);
            setVerdict(full);
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadVerdict();
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
          {canvasParams?.projectId && (
            <button onClick={goBack} className="mt-4 px-4 py-2 rounded-lg text-sm font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
              Back to Project
            </button>
          )}
        </div>
      </div>
    );
  }

  const projectName = verdict.project_name || verdict.project_title || canvasParams?.projectName || 'Project';
  const compositeScore = verdict.overall_score || 0;
  const evaluations = verdict.evaluations || [];

  const evaluators: Evaluator[] = evaluations.map((ev: any, i: number) => {
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
      color: EVALUATOR_COLORS[i % EVALUATOR_COLORS.length],
    };
  });

  const actions = verdict.next_steps || [];

  // Split evaluators: first goes left (featured), rest go right stacked
  const featuredEvaluator = evaluators[0];
  const rightEvaluators = evaluators.slice(1);

  const handleApplyActions = async () => {
    if (verdict.id) {
      await api.applyCouncilActions(verdict.id).catch(console.error);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={goBack}
          className="text-text-tertiary hover:text-text-primary text-sm mb-3 flex items-center gap-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h2 className="text-xs font-semibold tracking-wider uppercase">
          <span className="text-text-tertiary">COUNCIL EVALUATION // </span>
          <span className="text-primary">PROJECT: {projectName.toUpperCase()}</span>
        </h2>
        <p className="text-text-secondary text-sm mt-1 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block" />
          {evaluators.length > 0
            ? `Synthesis of ${evaluators.length} specialized intelligence node${evaluators.length !== 1 ? 's' : ''}.`
            : 'Council evaluation complete.'}
        </p>
      </div>

      {/* Main Asymmetric Layout: Left evaluator | Center Ring | Right evaluators */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 mb-8 items-start">
        {/* Left: Featured evaluator */}
        <div>
          {featuredEvaluator && (
            <EvaluatorCard ev={featuredEvaluator} index={0} />
          )}
        </div>

        {/* Center: Large composite ring */}
        <div className="flex justify-center items-center py-4 lg:py-8">
          <div className="text-center">
            <ConfidenceRing score={compositeScore} size="xl" />
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className={`w-2 h-2 rounded-full ${
                compositeScore >= 7 ? 'bg-success' : compositeScore >= 5 ? 'bg-secondary' : 'bg-danger'
              }`} />
              <p className="text-xs tracking-[0.15em] text-text-tertiary uppercase font-semibold">
                {compositeScore >= 7 ? 'OPPORTUNITY' : compositeScore >= 5 ? 'PROCEED WITH CAUTION' : 'PASS'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Stacked evaluators */}
        <div className="space-y-4">
          {rightEvaluators.map((ev, i) => (
            <EvaluatorCard key={i} ev={ev} index={i + 1} />
          ))}
        </div>
      </div>

      {/* Bottom row: Risk Matrix + Nitara Protocol */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Risk Matrix */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">Risk Matrix</h3>
            <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </div>

          {/* 2D Risk grid visualization */}
          <div className="relative">
            <div className="grid grid-cols-2 grid-rows-2 w-full aspect-square max-w-[200px] border border-text-tertiary/20 rounded">
              <div className="border-r border-b border-text-tertiary/20 relative">
                {/* High Impact, Low Probability */}
              </div>
              <div className="border-b border-text-tertiary/20 relative">
                {/* High Impact, High Probability */}
              </div>
              <div className="border-r border-text-tertiary/20 relative">
                {/* Low Impact, Low Probability */}
              </div>
              <div className="relative">
                {/* Low Impact, High Probability */}
              </div>
              {/* Plot risk dots */}
              {evaluators.filter(e => e.risk).map((ev, i) => {
                const x = ev.risk?.type === 'risk' ? 65 : 35;
                const y = ev.score < 5 ? 25 : 65;
                return (
                  <div
                    key={i}
                    className={`absolute w-3 h-3 rounded-full ${ev.risk?.type === 'risk' ? 'bg-danger' : 'bg-secondary'}`}
                    style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                  />
                );
              })}
              {evaluators.filter(e => e.risk).length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                </div>
              )}
            </div>
            <div className="flex justify-between mt-1 px-1">
              <span className="text-[9px] text-text-tertiary tracking-wider uppercase">Low</span>
              <span className="text-[9px] text-text-tertiary tracking-wider uppercase">PROBABILITY</span>
              <span className="text-[9px] text-text-tertiary tracking-wider uppercase">High</span>
            </div>
            <div className="absolute left-[-18px] top-0 bottom-6 flex flex-col justify-between items-center">
              <span className="text-[9px] text-text-tertiary tracking-wider uppercase rotate-[-90deg] origin-center">IMPACT</span>
            </div>
          </div>

          {/* Risk list below grid */}
          <div className="space-y-1.5 mt-4">
            {evaluators.filter(e => e.risk).map((ev, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${ev.risk?.type === 'caution' ? 'bg-secondary' : 'bg-danger'}`} />
                <span className="text-text-secondary text-xs">{ev.risk?.label}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Nitara Protocol */}
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
          <div className="space-y-3">
            {actions.length === 0 ? (
              <p className="text-text-tertiary text-sm">No next steps defined</p>
            ) : (
              actions.map((action: string, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-md border border-primary/30 flex items-center justify-center flex-shrink-0 text-primary font-mono text-xs font-bold">
                    {i + 1}
                  </div>
                  <span className="text-text-secondary text-sm leading-relaxed pt-0.5">{action}</span>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      {/* Synthesis bar */}
      {verdict.synthesized_reasoning && (
        <div className="bg-tertiary/10 border border-tertiary/20 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-tertiary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-tertiary text-lg">{'\u2726'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-tertiary text-xs font-semibold tracking-wider uppercase">NITARA</span>
              <span className="text-text-tertiary text-[10px]">The Critic Node Active</span>
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
            </div>
            <p className="text-text-secondary text-sm mt-0.5 truncate">
              {'\u00BB'} {verdict.synthesized_reasoning}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
