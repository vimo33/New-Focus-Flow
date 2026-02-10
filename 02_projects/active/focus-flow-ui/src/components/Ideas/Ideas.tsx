import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { Idea } from '../../services/api';
import { CreateIdeaModal } from './CreateIdeaModal';

type StatusFilter = 'inbox' | 'validated' | 'rejected';

export function Ideas() {
  const navigate = useNavigate();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('inbox');
  const [loading, setLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch ideas based on active filter
  useEffect(() => {
    loadIdeas();
  }, [activeFilter]);

  const loadIdeas = async () => {
    try {
      setLoading(true);
      const response = await api.getIdeas(activeFilter);
      setIdeas(response.ideas);
    } catch (error) {
      console.error('Failed to load ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filter: StatusFilter) => {
    setActiveFilter(filter);
  };

  const handleValidateIdea = async (ideaId: string) => {
    try {
      setValidatingId(ideaId);
      const response = await api.validateIdea(ideaId);

      // Reload ideas to show the updated status
      await loadIdeas();

      console.log('Validation complete:', response.verdict);
    } catch (error) {
      console.error('Failed to validate idea:', error);
      alert('Failed to validate idea. Please try again.');
    } finally {
      setValidatingId(null);
    }
  };

  const handleCreateIdea = async (title: string, description: string) => {
    try {
      await api.createIdea({ title, description, status: 'inbox' });
      setShowCreateModal(false);
      await loadIdeas();
    } catch (error) {
      console.error('Failed to create idea:', error);
      alert('Failed to create idea. Please try again.');
    }
  };

  // Filter ideas by search query
  const filteredIdeas = ideas.filter(idea => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      idea.title.toLowerCase().includes(query) ||
      idea.description.toLowerCase().includes(query) ||
      idea.council_verdict?.synthesized_reasoning?.toLowerCase().includes(query)
    );
  });

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'inbox':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'validated':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Get recommendation badge color
  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'approve':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'needs-info':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'reject':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get counts for filter tabs
  const getCounts = () => {
    const allIdeas = ideas;
    return {
      inbox: allIdeas.filter(i => i.status === 'inbox').length,
      validated: allIdeas.filter(i => i.status === 'validated').length,
      rejected: allIdeas.filter(i => i.status === 'rejected').length,
    };
  };

  const counts = getCounts();

  return (
    <div className="flex flex-col h-full bg-background-dark">
      {/* Header */}
      <header className="flex flex-col shrink-0 pb-4 border-b border-[#233648]/50 z-10 bg-background-dark/95 backdrop-blur-sm">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
          <div className="flex min-w-72 flex-col gap-1">
            <h2 className="text-white tracking-tight text-3xl font-black leading-tight">
              Ideas Explorer
            </h2>
            <p className="text-[#92adc9] text-base font-normal leading-normal">
              Manage and validate your creative concepts
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 cursor-pointer justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#233648] hover:bg-primary text-white text-sm font-bold transition-all shadow-lg border border-[#324d67]"
            data-testid="new-idea-button"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span className="truncate">New Idea</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <label className="relative flex w-full h-12 rounded-lg bg-[#233648] focus-within:ring-2 focus-within:ring-primary/50 transition-all">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <span className="material-symbols-outlined text-[#92adc9]">search</span>
            </div>
            <input
              className="w-full h-full bg-transparent border-none text-white placeholder:text-[#92adc9] pl-12 pr-4 rounded-lg focus:ring-0 text-base"
              placeholder="Search ideas by title, tag, or problem statement..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="search-input"
            />
          </label>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => handleFilterChange('inbox')}
            className={`flex items-center gap-2 px-4 h-9 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeFilter === 'inbox'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-[#233648] text-[#92adc9] hover:text-white hover:bg-[#324d67]'
            }`}
            data-testid="filter-inbox"
          >
            <span className="material-symbols-outlined text-[18px]">inbox</span>
            Inbox
            {counts.inbox > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeFilter === 'inbox' ? 'bg-white/20' : 'bg-[#324d67]'
              }`}>
                {counts.inbox}
              </span>
            )}
          </button>

          <button
            onClick={() => handleFilterChange('validated')}
            className={`flex items-center gap-2 px-4 h-9 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeFilter === 'validated'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-[#233648] text-[#92adc9] hover:text-white hover:bg-[#324d67]'
            }`}
            data-testid="filter-validated"
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            Validated
            {counts.validated > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeFilter === 'validated' ? 'bg-white/20' : 'bg-[#324d67]'
              }`}>
                {counts.validated}
              </span>
            )}
          </button>

          <button
            onClick={() => handleFilterChange('rejected')}
            className={`flex items-center gap-2 px-4 h-9 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeFilter === 'rejected'
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-[#233648] text-[#92adc9] hover:text-white hover:bg-[#324d67]'
            }`}
            data-testid="filter-rejected"
          >
            <span className="material-symbols-outlined text-[18px]">cancel</span>
            Rejected
            {counts.rejected > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeFilter === 'rejected' ? 'bg-white/20' : 'bg-[#324d67]'
              }`}>
                {counts.rejected}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto py-6">
        <div className="max-w-[1200px] mx-auto">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20" data-testid="loading-state">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredIdeas.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="empty-state">
              <span className="material-symbols-outlined text-[64px] text-[#324d67] mb-4">lightbulb</span>
              <h3 className="text-white text-xl font-semibold mb-2">
                {searchQuery ? 'No ideas found' : `No ${activeFilter} ideas`}
              </h3>
              <p className="text-[#92adc9] text-sm">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : activeFilter === 'inbox'
                  ? 'Create a new idea to get started'
                  : `No ideas in ${activeFilter} yet`}
              </p>
            </div>
          )}

          {/* Ideas Grid */}
          {!loading && filteredIdeas.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-12">
              {filteredIdeas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  onValidate={handleValidateIdea}
                  onNavigate={() => navigate(`/ideas/${idea.id}`)}
                  isValidating={validatingId === idea.id}
                  getStatusBadge={getStatusBadge}
                  getRecommendationBadge={getRecommendationBadge}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Idea Modal */}
      {showCreateModal && (
        <CreateIdeaModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateIdea}
        />
      )}
    </div>
  );
}

interface IdeaCardProps {
  idea: Idea;
  onValidate: (ideaId: string) => void;
  onNavigate: () => void;
  isValidating: boolean;
  getStatusBadge: (status: string) => string;
  getRecommendationBadge: (recommendation: string) => string;
  formatDate: (dateString: string) => string;
}

function IdeaCard({ idea, onValidate, onNavigate, isValidating, getStatusBadge, getRecommendationBadge, formatDate }: IdeaCardProps) {
  const verdict = idea.council_verdict;
  const hasVerdict = !!verdict;

  return (
    <div
      onClick={onNavigate}
      className="group flex flex-col bg-[#192633] rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-black/20 border border-transparent hover:border-primary/30 transition-all duration-300 cursor-pointer"
      data-testid={`idea-card-${idea.id}`}
    >
      {/* Header with Status Badge */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span
            className={`px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider border backdrop-blur-md ${getStatusBadge(idea.status)}`}
            data-testid={`status-badge-${idea.id}`}
          >
            {idea.status}
          </span>
          {hasVerdict && (
            <span
              className={`px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider border backdrop-blur-md ${getRecommendationBadge(verdict.recommendation)}`}
              data-testid={`recommendation-badge-${idea.id}`}
            >
              {verdict.recommendation === 'needs-info' ? 'Needs Info' : verdict.recommendation}
            </span>
          )}
        </div>

        <h3 className="text-white text-xl font-bold leading-tight group-hover:text-primary transition-colors mb-1">
          {idea.title}
        </h3>
        <p className="text-[#92adc9] text-sm mt-1">
          {idea.validated_at ? `Validated ${formatDate(idea.validated_at)}` : `Created ${formatDate(idea.created_at)}`}
        </p>
      </div>

      {/* Description */}
      <div className="px-5 flex flex-col gap-2 text-sm text-[#92adc9]/90 flex-1">
        <p>
          <strong className="text-white">Problem:</strong> {idea.description}
        </p>
      </div>

      {/* AI Council Verdict */}
      {hasVerdict && (
        <div className="px-5 mt-4">
          <div className="bg-[#111a22] border border-[#233648] rounded-lg p-3">
            <h4 className="text-white text-sm font-bold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">psychology</span>
              AI Council Verdict
            </h4>

            {/* Agent Scores */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {verdict.evaluations.map((evaluation, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center p-2 bg-[#192633] rounded"
                  data-testid={`evaluation-${idea.id}-${idx}`}
                >
                  <div className="text-2xl font-bold text-primary">{evaluation.score}</div>
                  <div className="text-[10px] text-[#92adc9] text-center leading-tight">
                    {evaluation.agent_name.replace(' Agent', '')}
                  </div>
                </div>
              ))}
            </div>

            {/* Overall Score */}
            <div className="mb-3 pb-3 border-b border-[#233648]">
              <div className="flex items-center justify-between">
                <span className="text-[#92adc9] text-xs font-medium">Overall Score</span>
                <span className="text-white text-lg font-bold">{verdict.overall_score}/10</span>
              </div>
            </div>

            {/* Synthesized Reasoning */}
            <div className="mb-3">
              <div className="text-[#92adc9] text-xs font-medium mb-1">Reasoning</div>
              <p className="text-white/90 text-xs leading-relaxed">{verdict.synthesized_reasoning}</p>
            </div>

            {/* Next Steps */}
            {verdict.next_steps && verdict.next_steps.length > 0 && (
              <div>
                <div className="text-[#92adc9] text-xs font-medium mb-2">Next Steps</div>
                <ul className="space-y-1">
                  {verdict.next_steps.map((step, idx) => (
                    <li key={idx} className="text-white/90 text-xs flex items-start gap-2">
                      <span className="material-symbols-outlined text-[14px] text-primary mt-0.5">chevron_right</span>
                      <span className="flex-1">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-5 pt-4 mt-auto border-t border-white/5">
        {idea.status === 'inbox' && (
          <button
            onClick={(e) => { e.stopPropagation(); onValidate(idea.id); }}
            disabled={isValidating}
            className="w-full bg-[#233648] hover:bg-white/10 text-white h-9 rounded-lg text-sm font-medium transition-colors border border-white/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid={`validate-button-${idea.id}`}
          >
            {isValidating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Validating...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">science</span>
                <span>Validate with AI Council</span>
              </>
            )}
          </button>
        )}

        {idea.status === 'validated' && verdict?.recommendation === 'approve' && (
          <button
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-primary hover:bg-blue-600 text-white h-9 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
            data-testid={`promote-button-${idea.id}`}
          >
            Promote to Project
          </button>
        )}

        {idea.status === 'rejected' && (
          <button
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent hover:bg-white/5 text-[#92adc9] h-9 rounded-lg text-sm font-medium transition-colors border border-white/10"
            data-testid={`view-reason-button-${idea.id}`}
          >
            View Reason
          </button>
        )}
      </div>
    </div>
  );
}
