import { GlassCard, ConfidenceRing } from '../shared';

interface Evaluator {
  name: string;
  specialty: string;
  score: number;
  assessment: string;
  risk?: { label: string; type: 'caution' | 'risk' };
}

export default function CouncilEvaluationCanvas() {
  // TODO: Pull from API based on canvas params
  const projectName = 'AI Consulting Platform';
  const compositeScore = 7.4;

  const evaluators: Evaluator[] = [
    {
      name: 'The Architect',
      specialty: 'TECH FEASIBILITY',
      score: 8.5,
      assessment: 'Strong technical foundation. The modular approach allows for iterative development. Key risk is API rate limiting at scale.',
      risk: { label: 'CAUTION: API dependency', type: 'caution' },
    },
    {
      name: 'The Strategist',
      specialty: 'MARKET VIABILITY',
      score: 7.2,
      assessment: 'Solid market positioning for SMB segment. Differentiation through personalization is strong. Pricing model needs validation.',
      risk: { label: 'RISK: Pricing untested', type: 'risk' },
    },
    {
      name: 'The Analyst',
      specialty: 'FINANCIAL OUTLOOK',
      score: 6.5,
      assessment: 'Revenue potential is moderate. Break-even at month 8 with current assumptions. Customer acquisition cost needs monitoring.',
      risk: { label: 'FISCAL RISK: High CAC', type: 'risk' },
    },
  ];

  const actions = [
    'Validate pricing model with 5 target customers',
    'Build API fallback strategy for rate limiting',
    'Create financial model with sensitivity analysis',
    'Draft go-to-market plan for SMB segment',
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">
          COUNCIL EVALUATION // PROJECT: {projectName.toUpperCase()}
        </h2>
        <p className="text-text-secondary text-sm mt-1">
          Synthesis of {evaluators.length} specialized intelligence nodes.
        </p>
      </div>

      {/* Main layout: evaluators around central ring */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Evaluator cards */}
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
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Nitara Protocol</h3>
          <div className="space-y-2">
            {actions.map((action, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-primary font-mono text-sm flex-shrink-0">{i + 1}.</span>
                <span className="text-text-secondary text-sm">{action}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
