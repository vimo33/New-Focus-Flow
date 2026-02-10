import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAppStore } from '../../stores/app';
import type { DashboardSummary, Project, Idea } from '../../services/api';

interface TodaysBriefProps {
  summary: DashboardSummary | null;
  loading: boolean;
}

function TodaysBrief({ summary, loading }: TodaysBriefProps) {
  if (loading) {
    return (
      <div className="col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-8">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-slate-100 dark:to-card-dark h-full min-h-[220px] flex flex-col justify-end p-6 border border-slate-200 dark:border-white/5">
          <div className="relative z-10 flex flex-col gap-2 max-w-2xl animate-pulse">
            <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-32"></div>
            <div className="h-8 bg-slate-300 dark:bg-slate-700 rounded w-3/4"></div>
            <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  const tasksToday = summary?.tasks_today || 0;
  const activeProjects = summary?.active_projects_count || 0;

  return (
    <div className="col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-8">
      <div
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-slate-100 dark:to-card-dark h-full min-h-[220px] flex flex-col justify-end p-6 border border-slate-200 dark:border-white/5"
        data-testid="todays-brief"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50"></div>
        <div className="relative z-10 flex flex-col gap-2 max-w-2xl">
          <div className="flex items-center gap-2 text-primary mb-1">
            <span className="material-symbols-outlined text-[20px]">lightbulb</span>
            <span className="text-xs font-bold uppercase tracking-widest">Today's Brief</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold leading-tight text-slate-900 dark:text-white">
            {activeProjects > 0
              ? `You have ${activeProjects} active ${activeProjects === 1 ? 'project' : 'projects'} in progress.`
              : 'No active projects. Start something new!'}
          </h2>
          <p className="text-slate-600 dark:text-slate-300 font-medium">
            {tasksToday > 0
              ? `You have ${tasksToday} high-priority ${tasksToday === 1 ? 'task' : 'tasks'} remaining today.`
              : 'Your schedule is clear. Great time to focus on deep work!'}
          </p>
        </div>
      </div>
    </div>
  );
}

interface InboxWidgetProps {
  loading: boolean;
}

function InboxWidget({ loading }: InboxWidgetProps) {
  const navigate = useNavigate();
  const inboxCount = useAppStore((state) => state.inboxCount);

  if (loading) {
    return (
      <div className="col-span-1 md:col-span-2 lg:col-span-1 xl:col-span-4">
        <div className="h-full bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-white/5 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 bg-slate-300 dark:bg-slate-700 rounded w-20 animate-pulse"></div>
          </div>
          <div className="flex flex-col gap-3 flex-1 justify-center">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800/50 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const categories = [
    { name: 'Work', count: inboxCount.work, color: 'bg-primary', testId: 'inbox-work' },
    { name: 'Personal', count: inboxCount.personal, color: 'bg-emerald-500', testId: 'inbox-personal' },
    { name: 'Ideas', count: inboxCount.ideas, color: 'bg-amber-500', testId: 'inbox-ideas' },
  ];

  return (
    <div className="col-span-1 md:col-span-2 lg:col-span-1 xl:col-span-4">
      <div
        className="h-full bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-white/5 p-6 flex flex-col"
        data-testid="inbox-widget"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Inbox</h3>
          <button
            onClick={() => navigate('/inbox')}
            className="text-slate-400 hover:text-primary transition-colors"
            aria-label="View Inbox"
          >
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
        <div className="flex flex-col gap-3 flex-1 justify-center">
          {categories.map((category) => (
            <div
              key={category.name}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 group hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              onClick={() => navigate('/inbox')}
              data-testid={category.testId}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${category.color}`}></div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {category.name}
                </span>
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-700 px-2 py-0.5 rounded shadow-sm">
                {category.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ActiveProjectsProps {
  projects: Project[];
  loading: boolean;
}

function ActiveProjects({ projects, loading }: ActiveProjectsProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="col-span-1 md:col-span-1 lg:col-span-2 xl:col-span-6">
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-white/5 p-6 h-full">
          <div className="flex items-center justify-between mb-5">
            <div className="h-6 bg-slate-300 dark:bg-slate-700 rounded w-32 animate-pulse"></div>
          </div>
          <div className="flex flex-col gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 animate-pulse"></div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Use real progress from backend, generate dynamic subtitles
  const projectsWithProgress = projects.slice(0, 3).map((project) => ({
    ...project,
    progress: project.progress ?? 0,
    subtitle: project.progress !== undefined && project.progress >= 75
      ? 'Nearly complete'
      : project.progress !== undefined && project.progress >= 50
      ? 'Good progress'
      : project.progress !== undefined && project.progress > 0
      ? 'Just started'
      : 'No tasks yet',
  }));

  return (
    <div className="col-span-1 md:col-span-1 lg:col-span-2 xl:col-span-6">
      <div
        className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-white/5 p-6 h-full"
        data-testid="active-projects"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Projects</h3>
          <button
            onClick={() => navigate('/projects')}
            className="text-slate-400 hover:text-primary transition-colors"
            aria-label="More options"
          >
            <span className="material-symbols-outlined">more_horiz</span>
          </button>
        </div>
        {projectsWithProgress.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-5xl mb-3">
              folder_open
            </span>
            <p className="text-slate-500 dark:text-slate-400 text-sm">No active projects</p>
            <button
              onClick={() => navigate('/projects')}
              className="mt-4 text-primary text-sm font-semibold hover:underline"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {projectsWithProgress.map((project) => (
              <div
                key={project.id}
                className="flex flex-col gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate(`/projects/${project.id}`)}
                data-testid={`project-${project.id}`}
              >
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {project.title}
                    </span>
                    <span className="text-xs text-slate-500">{project.subtitle}</span>
                  </div>
                  <span className={`text-xs font-bold ${project.progress >= 75 ? 'text-primary' : 'text-slate-500'}`}>
                    {project.progress}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${project.progress >= 75 ? 'bg-primary' : 'bg-slate-400 dark:bg-slate-600'}`}
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface RecentActivityProps {
  summary: DashboardSummary | null;
  loading: boolean;
}

function RecentActivity({ summary, loading }: RecentActivityProps) {
  if (loading) {
    return (
      <div className="col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-6">
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-white/5 p-6 h-full">
          <div className="h-6 bg-slate-300 dark:bg-slate-700 rounded w-32 mb-5 animate-pulse"></div>
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800/50 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activities = summary?.recent_activity || [];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'inbox': return 'inbox';
      case 'task': return 'check_circle';
      case 'project': return 'folder';
      case 'idea': return 'lightbulb';
      default: return 'circle';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'inbox': return 'text-primary';
      case 'task': return 'text-emerald-500';
      case 'project': return 'text-purple-500';
      case 'idea': return 'text-amber-500';
      default: return 'text-slate-500';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-6">
      <div
        className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-white/5 p-6 h-full"
        data-testid="recent-activity"
      >
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5">Recent Activity</h3>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-5xl mb-3">
              history
            </span>
            <p className="text-slate-500 dark:text-slate-400 text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activities.slice(0, 5).map((activity, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                data-testid={`activity-${idx}`}
              >
                <span className={`material-symbols-outlined text-[18px] mt-0.5 ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-200 line-clamp-2">
                    {activity.text}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatTimestamp(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface IdeasPipelineProps {
  ideas: Idea[];
  loading: boolean;
}

function IdeasPipeline({ ideas, loading }: IdeasPipelineProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-6">
        <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-white/5 p-6 h-full">
          <div className="h-6 bg-slate-300 dark:bg-slate-700 rounded w-32 mb-5 animate-pulse"></div>
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800/50 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statusCounts = {
    inbox: ideas.filter(i => i.status === 'inbox').length,
    validated: ideas.filter(i => i.status === 'validated').length,
    rejected: ideas.filter(i => i.status === 'rejected').length,
  };

  const recentIdeas = ideas.slice(0, 4);

  return (
    <div className="col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-6">
      <div
        className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-white/5 p-6 h-full"
        data-testid="ideas-pipeline"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Ideas Pipeline</h3>
          <button
            onClick={() => navigate('/ideas')}
            className="text-slate-400 hover:text-primary transition-colors"
            aria-label="View Ideas"
          >
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>

        {/* Status Summary */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 bg-blue-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">{statusCounts.inbox}</div>
            <div className="text-xs text-slate-500">Inbox</div>
          </div>
          <div className="flex-1 bg-emerald-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">{statusCounts.validated}</div>
            <div className="text-xs text-slate-500">Validated</div>
          </div>
          <div className="flex-1 bg-red-500/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-400">{statusCounts.rejected}</div>
            <div className="text-xs text-slate-500">Rejected</div>
          </div>
        </div>

        {/* Recent Ideas */}
        {recentIdeas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-4xl mb-2">lightbulb</span>
            <p className="text-slate-500 dark:text-slate-400 text-sm">No ideas yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recentIdeas.map((idea) => (
              <div
                key={idea.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                onClick={() => navigate(`/ideas/${idea.id}`)}
              >
                <span className={`material-symbols-outlined text-[16px] ${
                  idea.status === 'validated' ? 'text-emerald-400' : idea.status === 'rejected' ? 'text-red-400' : 'text-blue-400'
                }`}>
                  {idea.status === 'validated' ? 'check_circle' : idea.status === 'rejected' ? 'cancel' : 'lightbulb'}
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-200 truncate flex-1">{idea.title}</span>
                {idea.council_verdict && (
                  <span className="text-xs font-bold text-primary">{idea.council_verdict.overall_score}/10</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface QuickActionsProps {
  onNewCapture: () => void;
  onViewInbox: () => void;
  onNewProject: () => void;
}

function QuickActions({ onNewCapture, onViewInbox, onNewProject }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-3" data-testid="quick-actions">
      <button
        onClick={onNewCapture}
        className="group flex items-center gap-2 px-4 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-card-dark hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
        data-testid="btn-new-capture"
      >
        <span className="material-symbols-outlined text-slate-500 text-[20px]">add</span>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Quick capture</span>
      </button>
      <button
        onClick={onViewInbox}
        className="group flex items-center gap-2 px-4 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-card-dark hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
        data-testid="btn-view-inbox"
      >
        <span className="material-symbols-outlined text-slate-500 text-[20px]">inbox</span>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">View Inbox</span>
      </button>
      <button
        onClick={onNewProject}
        className="flex items-center gap-2 px-5 h-10 rounded-lg bg-primary hover:bg-primary/90 text-white transition-all shadow-md shadow-primary/20"
        data-testid="btn-new-project"
      >
        <span className="material-symbols-outlined text-[20px]">folder_open</span>
        <span className="text-sm font-bold">New Project</span>
      </button>
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { refreshInboxCount } = useAppStore();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all dashboard data in parallel
      const [summaryData, projectsData, ideasData] = await Promise.all([
        api.getSummary(),
        api.getProjects('active'),
        api.getIdeas(),
      ]);

      setSummary(summaryData);
      setProjects(projectsData.projects);
      setIdeas(ideasData.ideas);

      // Refresh inbox count in store
      await refreshInboxCount();
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleNewCapture = () => {
    navigate('/capture');
  };

  const handleViewInbox = () => {
    navigate('/inbox');
  };

  const handleNewProject = () => {
    navigate('/projects');
  };

  const getCurrentDate = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="p-6 lg:p-10 max-w-[1440px] w-full mx-auto flex flex-col gap-8" data-testid="dashboard">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            {getGreeting()}.
          </p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            {getCurrentDate()}
          </h1>
        </div>
        <QuickActions
          onNewCapture={handleNewCapture}
          onViewInbox={handleViewInbox}
          onNewProject={handleNewProject}
        />
      </header>

      {/* Error Message */}
      {error && (
        <div
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3"
          data-testid="error-message"
        >
          <span className="material-symbols-outlined text-red-500">error</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900 dark:text-red-200">
              Failed to load dashboard
            </p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
          <button
            onClick={loadDashboardData}
            className="text-sm font-semibold text-red-700 dark:text-red-300 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12 gap-6 auto-rows-min">
        <TodaysBrief summary={summary} loading={loading} />
        <InboxWidget loading={loading} />
        <ActiveProjects projects={projects} loading={loading} />
        <RecentActivity summary={summary} loading={loading} />
        <IdeasPipeline ideas={ideas} loading={loading} />
      </div>
    </div>
  );
}
