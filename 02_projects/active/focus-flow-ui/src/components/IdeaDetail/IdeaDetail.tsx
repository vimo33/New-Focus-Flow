import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';

interface PRDDocument {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  user_stories?: string[];
  constraints?: string[];
  success_metrics?: string[];
}

interface ExpandedIdea {
  problem_statement: string;
  proposed_solution: string;
  target_users: string;
  value_proposition: string;
  key_features: string[];
  risks: string[];
  success_metrics: string[];
  competitive_landscape?: string;
  estimated_effort?: string;
}

interface CouncilVerdict {
  recommendation: 'approve' | 'reject' | 'needs-info';
  overall_score: number;
  evaluations: Array<{
    agent_name: string;
    score: number;
    reasoning: string;
    concerns: string[];
  }>;
  synthesized_reasoning: string;
  next_steps?: string[];
  prd_generated?: boolean;
}

interface Idea {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  expanded_at?: string;
  validated_at?: string;
  expanded?: ExpandedIdea;
  council_verdict?: CouncilVerdict;
  prd?: PRDDocument;
  project_id?: string;
}

const STATUS_COLORS: Record<string, string> = {
  inbox: 'bg-blue-500/20 text-blue-400',
  draft: 'bg-gray-500/20 text-gray-400',
  expanded: 'bg-purple-500/20 text-purple-400',
  validating: 'bg-amber-500/20 text-amber-400',
  validated: 'bg-emerald-500/20 text-emerald-400',
  rejected: 'bg-red-500/20 text-red-400',
  spec_ready: 'bg-indigo-500/20 text-indigo-400',
  in_development: 'bg-cyan-500/20 text-cyan-400',
};

const IDEA_STEPS = [
  { key: 'inbox', label: 'Inbox', icon: 'inbox' },
  { key: 'expanded', label: 'Expanded', icon: 'auto_awesome' },
  { key: 'validating', label: 'Validating', icon: 'gavel' },
  { key: 'validated', label: 'Validated', icon: 'verified' },
  { key: 'promoted', label: 'Promoted', icon: 'trending_up' },
];

function getStepIndex(idea: Idea): number {
  if (idea.project_id) return 4;
  if (idea.status === 'validated' || idea.status === 'spec_ready') return 3;
  if (idea.status === 'validating') return 2;
  if (idea.council_verdict) return 3;
  if (idea.expanded) return 1;
  return 0;
}

export function IdeaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanding, setExpanding] = useState(false);
  const [validating, setValidating] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [generatingPrd, setGeneratingPrd] = useState(false);
  const [userContext, setUserContext] = useState('');
  const [showContextInput, setShowContextInput] = useState(false);

  useEffect(() => {
    if (id) loadIdea(id);
  }, [id]);

  const loadIdea = async (ideaId: string) => {
    try {
      setLoading(true);
      const data = await api.getIdea(ideaId);
      setIdea(data as Idea);
    } catch (e: any) {
      console.error('Failed to load idea:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = async () => {
    if (!id) return;
    setExpanding(true);
    try {
      const res = await api.expandIdea(id);
      setIdea(res.idea as Idea);
    } catch (e: any) {
      alert('Expansion failed: ' + e.message);
    } finally {
      setExpanding(false);
    }
  };

  const handleValidate = async () => {
    if (!id) return;
    setValidating(true);
    try {
      await api.validateIdea(id, userContext || undefined);
      await loadIdea(id);
      setShowContextInput(false);
      setUserContext('');
    } catch (e: any) {
      alert('Validation failed: ' + e.message);
    } finally {
      setValidating(false);
    }
  };

  const handleGeneratePrd = async () => {
    if (!id) return;
    setGeneratingPrd(true);
    try {
      await api.post(`/orchestrator/prd/${id}`);
      await loadIdea(id);
    } catch (e: any) {
      alert('PRD generation failed: ' + e.message);
    } finally {
      setGeneratingPrd(false);
    }
  };

  const handlePromote = async () => {
    if (!id) return;
    setPromoting(true);
    try {
      const res = await api.promoteIdea(id);
      navigate(`/projects/${res.project.id}?tab=pipeline`);
    } catch (e: any) {
      alert('Promotion failed: ' + e.message);
    } finally {
      setPromoting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Idea not found</p>
        <Link to="/ideas" className="text-primary mt-2 inline-block">Back to Ideas</Link>
      </div>
    );
  }

  const verdict = idea.council_verdict;
  const expanded = idea.expanded;
  const prd = idea.prd;
  const currentStep = getStepIndex(idea);

  // Determine next action
  const getNextAction = () => {
    if (idea.project_id) return null;
    if (verdict?.recommendation === 'approve' && !prd) return { label: 'Generate PRD', action: handleGeneratePrd, loading: generatingPrd, icon: 'description', color: 'bg-indigo-600 hover:bg-indigo-700' };
    if (verdict?.recommendation === 'approve') return { label: 'Promote to Project', action: handlePromote, loading: promoting, icon: 'trending_up', color: 'bg-primary hover:bg-blue-600' };
    if (expanded && !verdict) return { label: 'Submit to Council', action: () => setShowContextInput(true), loading: false, icon: 'gavel', color: 'bg-emerald-600 hover:bg-emerald-700' };
    if (!expanded) return { label: 'AI Expand', action: handleExpand, loading: expanding, icon: 'auto_awesome', color: 'bg-purple-600 hover:bg-purple-700' };
    return null;
  };

  const nextAction = getNextAction();

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/ideas" className="text-sm text-slate-400 hover:text-white flex items-center gap-1 mb-2">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Ideas
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{idea.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[idea.status] || STATUS_COLORS.draft}`}>
              {idea.status.replace('_', ' ')}
            </span>
            <span className="text-sm text-slate-400">
              Created {new Date(idea.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Status Stepper */}
      <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700/50 p-6">
        <div className="relative">
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-slate-200 dark:bg-slate-700" />
          <div
            className="absolute top-5 left-5 h-0.5 bg-primary transition-all duration-500"
            style={{ width: `${(currentStep / (IDEA_STEPS.length - 1)) * 100}%` }}
          />
          <div className="relative flex justify-between">
            {IDEA_STEPS.map((step, idx) => {
              const isCompleted = idx < currentStep;
              const isCurrent = idx === currentStep;
              return (
                <div key={step.key} className="flex flex-col items-center gap-2">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all
                    ${isCurrent
                      ? 'bg-primary text-white ring-4 ring-primary/20 shadow-lg'
                      : isCompleted
                      ? 'bg-primary text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                    }
                  `}>
                    <span className="material-symbols-outlined text-[18px]">
                      {isCompleted ? 'check' : step.icon}
                    </span>
                  </div>
                  <span className={`text-xs font-medium ${
                    isCurrent ? 'text-primary' : isCompleted ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Next Action CTA */}
      {nextAction && (
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 rounded-xl border border-primary/20 p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Next Step</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {!expanded ? 'Use AI to analyze and expand your idea' :
               !verdict ? 'Submit to the AI council for validation' :
               !prd ? 'Generate a Product Requirements Document' :
               'Promote this idea to a full project'}
            </p>
          </div>
          <button
            onClick={nextAction.action}
            disabled={nextAction.loading}
            className={`px-5 py-2.5 ${nextAction.color} disabled:opacity-50 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95`}
          >
            <span className="material-symbols-outlined text-[18px]">{nextAction.icon}</span>
            {nextAction.loading ? 'Working...' : nextAction.label}
          </button>
        </div>
      )}

      {/* User Context Input for Council */}
      {showContextInput && (
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Council Submission</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">Provide any additional context for the AI council to consider:</p>
          <textarea
            value={userContext}
            onChange={(e) => setUserContext(e.target.value)}
            placeholder="e.g. Target market is SMBs in Europe, budget constraint of $5K for MVP..."
            className="w-full min-h-[100px] px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowContextInput(false)}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleValidate}
              disabled={validating}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">gavel</span>
              {validating ? 'Validating...' : 'Submit to Council'}
            </button>
          </div>
        </div>
      )}

      {/* Description */}
      <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700/50 p-6">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Description</h2>
        <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{idea.description}</p>
      </div>

      {/* Expansion */}
      {expanded && (
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">AI Expansion</h2>

          <Section title="Problem" content={expanded.problem_statement} />
          <Section title="Solution" content={expanded.proposed_solution} />
          <Section title="Target Users" content={expanded.target_users} />
          <Section title="Value Proposition" content={expanded.value_proposition} />

          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Key Features</h3>
            <ul className="space-y-1">
              {expanded.key_features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="text-primary mt-0.5">-</span>{f}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Risks</h3>
            <ul className="space-y-1">
              {expanded.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-600 dark:text-red-300">
                  <span className="mt-0.5">!</span>{r}
                </li>
              ))}
            </ul>
          </div>

          {expanded.competitive_landscape && (
            <Section title="Competitive Landscape" content={expanded.competitive_landscape} />
          )}
          {expanded.estimated_effort && (
            <Section title="Estimated Effort" content={expanded.estimated_effort} />
          )}
        </div>
      )}

      {/* Council Verdict */}
      {verdict && (
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">AI Council Verdict</h2>
            <div className={`text-2xl font-bold ${
              verdict.overall_score >= 7 ? 'text-emerald-500'
              : verdict.overall_score >= 5 ? 'text-amber-500'
              : 'text-red-500'
            }`}>
              {verdict.overall_score}/10
            </div>
          </div>

          <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{verdict.synthesized_reasoning}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {verdict.evaluations.map((ev, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{ev.agent_name}</span>
                  <span className={`text-lg font-bold ${
                    ev.score >= 7 ? 'text-emerald-500'
                    : ev.score >= 5 ? 'text-amber-500'
                    : 'text-red-500'
                  }`}>{ev.score}/10</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{ev.reasoning}</p>
                {ev.concerns.length > 0 && (
                  <div className="mt-2">
                    {ev.concerns.map((c, j) => (
                      <span key={j} className="inline-block text-xs bg-red-500/10 text-red-500 px-2 py-0.5 rounded mr-1 mb-1">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {verdict.next_steps && verdict.next_steps.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Next Steps</h3>
              <ul className="space-y-1">
                {verdict.next_steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="text-primary">{i + 1}.</span>{step}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* PRD Document */}
      {prd && (
        <div className="bg-white dark:bg-card-dark rounded-xl border border-indigo-200 dark:border-indigo-700/50 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-500">description</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{prd.title}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Product Requirements Document</p>
            </div>
          </div>

          <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{prd.description}</p>

          {prd.requirements.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Requirements</h3>
              <ul className="space-y-1.5">
                {prd.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="material-symbols-outlined text-primary text-[14px] mt-0.5">check_circle</span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {prd.user_stories && prd.user_stories.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">User Stories</h3>
              <ul className="space-y-1.5">
                {prd.user_stories.map((story, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="material-symbols-outlined text-purple-500 text-[14px] mt-0.5">person</span>
                    {story}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {prd.constraints && prd.constraints.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Constraints</h3>
              <ul className="space-y-1">
                {prd.constraints.map((c, i) => (
                  <li key={i} className="text-sm text-slate-500 dark:text-slate-400">- {c}</li>
                ))}
              </ul>
            </div>
          )}

          {prd.success_metrics && prd.success_metrics.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Success Metrics</h3>
              <ul className="space-y-1">
                {prd.success_metrics.map((m, i) => (
                  <li key={i} className="text-sm text-slate-500 dark:text-slate-400">- {m}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Promoted Link */}
      {idea.project_id && (
        <div className="bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">folder</span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">This idea has been promoted to a project</span>
          </div>
          <Link
            to={`/projects/${idea.project_id}`}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors"
          >
            View Project
          </Link>
        </div>
      )}
    </div>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{content}</p>
    </div>
  );
}
