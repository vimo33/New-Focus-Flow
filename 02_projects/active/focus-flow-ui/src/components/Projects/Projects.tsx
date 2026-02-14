import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { Project } from '../../services/api';
import { CreateProjectModal } from './CreateProjectModal';

type StatusFilter = 'active' | 'paused' | 'all';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

const PIPELINE_PHASES: { key: string; label: string; icon: string }[] = [
  { key: 'concept', label: 'Concept', icon: 'lightbulb' },
  { key: 'spec', label: 'Spec', icon: 'description' },
  { key: 'design', label: 'Design', icon: 'palette' },
  { key: 'dev', label: 'Dev', icon: 'code' },
  { key: 'test', label: 'Test', icon: 'bug_report' },
  { key: 'deploy', label: 'Deploy', icon: 'rocket_launch' },
  { key: 'live', label: 'Live', icon: 'check_circle' },
];

function ProjectCard({ project, onClick }: ProjectCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'paused':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'completed':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getProjectIcon = (projectId: string) => {
    // Cycle through icons for variety
    const icons = ['web', 'smartphone', 'palette', 'campaign', 'code', 'design_services'];
    const index = parseInt(projectId.slice(-1), 36) % icons.length;
    return icons[index];
  };

  const getIconColor = (projectId: string) => {
    // Cycle through colors for variety
    const colors = [
      { bg: 'bg-indigo-500/10', text: 'text-indigo-500' },
      { bg: 'bg-pink-500/10', text: 'text-pink-500' },
      { bg: 'bg-amber-500/10', text: 'text-amber-500' },
      { bg: 'bg-teal-500/10', text: 'text-teal-500' },
      { bg: 'bg-purple-500/10', text: 'text-purple-500' },
      { bg: 'bg-cyan-500/10', text: 'text-cyan-500' },
    ];
    const index = parseInt(projectId.slice(-1), 36) % colors.length;
    return colors[index];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    if (weeks < 4) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const iconColor = getIconColor(project.id);
  const icon = getProjectIcon(project.id);

  return (
    <div
      className="group bg-white dark:bg-card-dark rounded-xl p-5 border border-slate-200 dark:border-[#2a3b4d] hover:border-primary/50 dark:hover:border-primary/50 transition-all hover:shadow-lg dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between min-h-[220px] cursor-pointer"
      onClick={onClick}
      data-testid={`project-card-${project.id}`}
    >
      <div>
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${iconColor.bg} flex items-center justify-center ${iconColor.text}`}>
              <span className="material-symbols-outlined">{icon}</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight group-hover:text-primary transition-colors">
                {project.title}
              </h3>
              <span className="text-xs text-slate-500">
                {project.status === 'paused' ? `Paused ${formatDate(project.updated_at)}` : `Last updated ${formatDate(project.updated_at)}`}
              </span>
            </div>
          </div>
          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getStatusBadge(project.status)}`}>
            {getStatusText(project.status)}
          </span>
        </div>

        {project.description && (
          <div className="flex items-center gap-2 mb-6 text-slate-500 dark:text-slate-400 text-xs font-mono bg-slate-100 dark:bg-[#111a22] p-2 rounded border border-slate-200 dark:border-[#233648]">
            <span className="material-symbols-outlined text-[16px] text-slate-400">folder_open</span>
            <span className="truncate">{project.description}</span>
            <button
              className="ml-auto text-primary hover:text-white hover:bg-primary rounded p-0.5 transition-colors"
              title="Open Project"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </button>
          </div>
        )}

        {project.pipeline && (
          <div className="mb-2">
            <div className="flex items-center gap-1">
              {PIPELINE_PHASES.map((phase, i) => {
                const currentIdx = PIPELINE_PHASES.findIndex(p => p.key === project.pipeline!.current_phase);
                const isDone = i < currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <div key={phase.key} className="flex items-center gap-1 flex-1 min-w-0">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 ${
                      isDone ? 'bg-emerald-500/15 text-emerald-500'
                        : isCurrent ? 'bg-primary/15 text-primary ring-2 ring-primary/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                        {isDone ? 'check' : phase.icon}
                      </span>
                    </div>
                    {i < PIPELINE_PHASES.length - 1 && (
                      <div className={`h-0.5 flex-1 rounded-full ${
                        isDone ? 'bg-emerald-500/30' : 'bg-slate-200 dark:bg-slate-700'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs font-medium text-primary mt-1.5">
              {PIPELINE_PHASES.find(p => p.key === project.pipeline!.current_phase)?.label || project.pipeline.current_phase}
            </p>
          </div>
        )}
      </div>

      <div className="pt-4 mt-2 border-t border-slate-100 dark:border-[#233648] flex justify-between items-center">
        {project.artifacts?.council_verdict ? (() => {
          const score = project.artifacts.council_verdict.overall_score;
          const color = score >= 7 ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
            : score >= 5 ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
            : 'text-red-400 bg-red-500/10 border-red-500/20';
          return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border ${color}`}>
              <span className="material-symbols-outlined text-[14px]">gavel</span>
              {score}/10
            </span>
          );
        })() : <span />}
        <button
          className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-white transition-colors flex items-center gap-1"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          data-testid={`open-project-${project.id}`}
        >
          Open Project
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}

function CreateProjectCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-[#111a22]/50 border-2 border-dashed border-slate-300 dark:border-[#2a3b4d] hover:border-primary dark:hover:border-primary rounded-xl p-6 min-h-[220px] transition-all"
      data-testid="create-project-card"
    >
      <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-[#233648] flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-primary group-hover:text-white transition-colors">
        <span className="material-symbols-outlined text-3xl">add</span>
      </div>
      <div className="text-center">
        <p className="text-base font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">
          Create New Project
        </p>
        <p className="text-xs text-slate-500 mt-1">Setup a new workspace</p>
      </div>
    </button>
  );
}

export function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [projects, activeFilter, searchQuery]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getProjects();
      setProjects(response.projects);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = projects;

    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(p => p.status === activeFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    setFilteredProjects(filtered);
  };

  const handleFilterChange = (filter: StatusFilter) => {
    setActiveFilter(filter);
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  const handleCreateProject = async (data: Partial<Project>) => {
    try {
      await api.createProject(data);
      setShowCreateModal(false);
      loadProjects();
    } catch (err) {
      console.error('Failed to create project:', err);
      throw err;
    }
  };

  // Get counts for each filter
  const activeCounts = {
    active: projects.filter(p => p.status === 'active').length,
    paused: projects.filter(p => p.status === 'paused').length,
    all: projects.length,
  };

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark" data-testid="projects-page">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-[1200px] mx-auto w-full p-6 md:p-8 flex flex-col gap-6">
          {/* Page Heading */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Projects
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Manage your active workstreams and track progress.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white font-bold py-2.5 px-5 rounded-lg transition-all shadow-lg shadow-blue-500/20 active:scale-95 whitespace-nowrap"
              data-testid="new-project-button"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>New Project</span>
            </button>
          </header>

          {/* Tabs */}
          <div className="border-b border-slate-200 dark:border-[#2a3b4d]">
            <nav aria-label="Tabs" className="flex gap-8 -mb-px">
              <button
                onClick={() => handleFilterChange('active')}
                className={`border-b-2 py-3 px-1 text-sm font-bold flex items-center gap-2 transition-colors ${
                  activeFilter === 'active'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300'
                }`}
                data-testid="filter-active"
              >
                Active
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeFilter === 'active'
                    ? 'bg-primary/20 text-primary'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {activeCounts.active}
                </span>
              </button>
              <button
                onClick={() => handleFilterChange('paused')}
                className={`border-b-2 py-3 px-1 text-sm font-medium flex items-center gap-2 transition-colors ${
                  activeFilter === 'paused'
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300'
                }`}
                data-testid="filter-paused"
              >
                Paused
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-1 ${
                  activeFilter === 'paused'
                    ? 'bg-primary/20 text-primary'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {activeCounts.paused}
                </span>
              </button>
              <button
                onClick={() => handleFilterChange('all')}
                className={`border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
                  activeFilter === 'all'
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300'
                }`}
                data-testid="filter-all"
              >
                All
              </button>
            </nav>
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div className="transition-all">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-card-dark border border-slate-200 dark:border-[#2a3b4d] rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary transition-colors"
                  data-testid="search-input"
                />
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`p-2 rounded-md transition-colors ${
                  showSearch
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Search"
                data-testid="search-button"
              >
                <span className="material-symbols-outlined text-[20px]">search</span>
              </button>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3"
              data-testid="error-message"
            >
              <span className="material-symbols-outlined text-red-500">error</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                  Failed to load projects
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
              <button
                onClick={loadProjects}
                className="text-sm font-semibold text-red-700 dark:text-red-300 hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20" data-testid="loading-state">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredProjects.length === 0 && !error && (
            <div
              className="flex flex-col items-center justify-center py-20 text-center"
              data-testid="empty-state"
            >
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-[64px] mb-4">
                folder_open
              </span>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
                {searchQuery ? 'No projects found' : 'No projects yet'}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                {searchQuery
                  ? 'Try adjusting your search query or filters'
                  : 'Get started by creating your first project to organize your work'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white font-bold py-2.5 px-5 rounded-lg transition-all shadow-lg shadow-blue-500/20"
                  data-testid="empty-create-button"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  <span>Create Your First Project</span>
                </button>
              )}
            </div>
          )}

          {/* Project Grid */}
          {!loading && filteredProjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="projects-grid">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => handleProjectClick(project.id)}
                />
              ))}
              <CreateProjectCard onClick={() => setShowCreateModal(true)} />
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProject}
        />
      )}
    </div>
  );
}

export default Projects;
