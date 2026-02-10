import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';

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
};

export function IdeaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanding, setExpanding] = useState(false);
  const [validating, setValidating] = useState(false);
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    if (id) {
      loadIdea(id);
    }
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
      await api.validateIdea(id);
      await loadIdea(id);
    } catch (e: any) {
      alert('Validation failed: ' + e.message);
    } finally {
      setValidating(false);
    }
  };

  const handlePromote = async () => {
    if (!id) return;
    setPromoting(true);
    try {
      const res = await api.promoteIdea(id);
      navigate(`/projects/${res.project.id}`);
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/ideas" className="text-sm text-gray-400 hover:text-white flex items-center gap-1 mb-2">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Ideas
          </Link>
          <h1 className="text-2xl font-bold text-white">{idea.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[idea.status] || STATUS_COLORS.draft}`}>
              {idea.status}
            </span>
            <span className="text-sm text-gray-400">
              Created {new Date(idea.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {!expanded && (
            <button
              onClick={handleExpand}
              disabled={expanding}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              {expanding ? 'Expanding...' : 'AI Expand'}
            </button>
          )}
          {!verdict && (
            <button
              onClick={handleValidate}
              disabled={validating}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">gavel</span>
              {validating ? 'Validating...' : 'Validate'}
            </button>
          )}
          {verdict?.recommendation === 'approve' && !idea.project_id && (
            <button
              onClick={handlePromote}
              disabled={promoting}
              className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white rounded-lg text-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">trending_up</span>
              {promoting ? 'Promoting...' : 'Promote to Project'}
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="bg-card-dark rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Description</h2>
        <p className="text-gray-200 leading-relaxed">{idea.description}</p>
      </div>

      {/* Timeline */}
      <div className="bg-card-dark rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Journey Timeline</h2>
        <div className="space-y-4">
          <TimelineStep
            icon="lightbulb"
            title="Idea Created"
            date={idea.created_at}
            active
          />
          {expanded && (
            <TimelineStep
              icon="auto_awesome"
              title="AI Expanded"
              date={idea.expanded_at}
              active
            />
          )}
          {verdict && (
            <TimelineStep
              icon="gavel"
              title={`Council: ${verdict.recommendation.toUpperCase()} (${verdict.overall_score}/10)`}
              date={idea.validated_at}
              active
              color={
                verdict.recommendation === 'approve' ? 'text-emerald-400'
                : verdict.recommendation === 'reject' ? 'text-red-400'
                : 'text-amber-400'
              }
            />
          )}
          {idea.project_id && (
            <TimelineStep
              icon="folder"
              title="Promoted to Project"
              active
              color="text-primary"
            />
          )}
        </div>
      </div>

      {/* Expansion */}
      {expanded && (
        <div className="bg-card-dark rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">AI Expansion</h2>

          <Section title="Problem" content={expanded.problem_statement} />
          <Section title="Solution" content={expanded.proposed_solution} />
          <Section title="Target Users" content={expanded.target_users} />
          <Section title="Value Proposition" content={expanded.value_proposition} />

          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Key Features</h3>
            <ul className="space-y-1">
              {expanded.key_features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-primary mt-0.5">-</span>{f}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Risks</h3>
            <ul className="space-y-1">
              {expanded.risks.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-300">
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
        <div className="bg-card-dark rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">AI Council Verdict</h2>
            <div className={`text-2xl font-bold ${
              verdict.overall_score >= 7 ? 'text-emerald-400'
              : verdict.overall_score >= 5 ? 'text-amber-400'
              : 'text-red-400'
            }`}>
              {verdict.overall_score}/10
            </div>
          </div>

          <p className="text-gray-200 leading-relaxed">{verdict.synthesized_reasoning}</p>

          {/* Agent Scores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {verdict.evaluations.map((ev, i) => (
              <div key={i} className="bg-surface-dark rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-300">{ev.agent_name}</span>
                  <span className={`text-lg font-bold ${
                    ev.score >= 7 ? 'text-emerald-400'
                    : ev.score >= 5 ? 'text-amber-400'
                    : 'text-red-400'
                  }`}>{ev.score}/10</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{ev.reasoning}</p>
                {ev.concerns.length > 0 && (
                  <div className="mt-2">
                    {ev.concerns.map((c, j) => (
                      <span key={j} className="inline-block text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded mr-1 mb-1">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Next Steps */}
          {verdict.next_steps && verdict.next_steps.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">Next Steps</h3>
              <ul className="space-y-1">
                {verdict.next_steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-primary">{i + 1}.</span>{step}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-300 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{content}</p>
    </div>
  );
}

function TimelineStep({ icon, title, date, active, color }: {
  icon: string;
  title: string;
  date?: string;
  active?: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        active ? 'bg-primary/20' : 'bg-gray-700'
      }`}>
        <span className={`material-symbols-outlined text-[16px] ${color || (active ? 'text-primary' : 'text-gray-500')}`}>
          {icon}
        </span>
      </div>
      <div>
        <div className={`text-sm font-medium ${color || 'text-gray-200'}`}>{title}</div>
        {date && (
          <div className="text-xs text-gray-500">{new Date(date).toLocaleString()}</div>
        )}
      </div>
    </div>
  );
}
