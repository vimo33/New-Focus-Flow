import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { Project, Task } from '../../services/api';

interface TaskItemProps {
  task: Task;
  onToggle: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

function TaskItem({ task, onToggle, onEdit, onDelete }: TaskItemProps) {
  const isCompleted = task.status === 'done';

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'high':
        return (
          <span className="text-xs font-medium text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded">
            High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="text-xs font-medium text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">
            Medium Priority
          </span>
        );
      case 'low':
        return (
          <span className="text-xs font-medium text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded">
            Low Priority
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="group flex items-start gap-3 p-3 rounded-lg hover:bg-white dark:hover:bg-[#1a2632] transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700/50"
      data-testid={`task-${task.id}`}
    >
      <div className="pt-0.5 relative flex items-center">
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={() => onToggle(task.id)}
          className="peer size-5 appearance-none rounded-md border-2 border-slate-300 dark:border-slate-600 bg-transparent checked:bg-primary checked:border-primary transition-all cursor-pointer"
          data-testid={`task-checkbox-${task.id}`}
        />
        <span
          className="material-symbols-outlined absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none"
          style={{ fontSize: '16px', left: '2px', top: '2px' }}
        >
          check
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-base leading-relaxed ${
            isCompleted
              ? 'text-slate-500 dark:text-slate-400 line-through'
              : 'text-slate-900 dark:text-white group-hover:text-primary transition-colors'
          }`}
        >
          {task.title}
        </p>
        {!isCompleted && (task.priority || task.due_date) && (
          <div className="flex items-center gap-3 mt-1.5">
            {getPriorityBadge(task.priority)}
            {task.due_date && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  calendar_today
                </span>
                {formatDate(task.due_date)}
              </span>
            )}
          </div>
        )}
      </div>
      {!isCompleted && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task.id);
            }}
            className="p-1.5 text-slate-400 hover:text-primary rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            data-testid={`task-edit-${task.id}`}
            aria-label="Edit task"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              edit
            </span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            data-testid={`task-delete-${task.id}`}
            aria-label="Delete task"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              delete
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'pipeline' | 'tasks' | 'notes' | 'activity'>('tasks');

  useEffect(() => {
    if (id) {
      loadProjectData(id);
    }
  }, [id]);

  const loadProjectData = async (projectId: string) => {
    setLoading(true);
    setError(null);

    try {
      const projectData = await api.getProject(projectId);
      setProject(projectData);
      setTasks(projectData.tasks || []);
    } catch (err) {
      console.error('Failed to load project:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTaskText.trim() && project) {
      try {
        const response = await api.createTask({
          title: newTaskText.trim(),
          project_id: project.id,
          status: 'todo',
          category: 'work',
        });

        setTasks([...tasks, response.task]);
        setNewTaskText('');
      } catch (err) {
        console.error('Failed to create task:', err);
      }
    }
  };

  const handleToggleTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    try {
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      const response = await api.updateTask(taskId, { status: newStatus });
      setTasks(tasks.map((t) => (t.id === taskId ? response.task : t)));
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleEditTask = (taskId: string) => {
    // TODO: Implement task editing modal/inline editing
    console.log('Edit task:', taskId);
  };

  const handleDeleteTask = async (taskId: string) => {
    // TODO: Implement task deletion with confirmation
    console.log('Delete task:', taskId);
  };

  const handleStartFocusSession = () => {
    // TODO: Implement focus session start
    console.log('Start focus session for project:', project?.id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
            In Progress
          </div>
        );
      case 'paused':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-600 dark:text-slate-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            Paused
          </div>
        );
      case 'completed':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Completed
          </div>
        );
      default:
        return null;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const calculateProgress = () => {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter((t) => t.status === 'done').length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-10 max-w-5xl mx-auto" data-testid="project-detail-loading">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-300 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="h-12 bg-slate-300 dark:bg-slate-700 rounded w-2/3 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-6 lg:p-10 max-w-5xl mx-auto" data-testid="project-detail-error">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-red-500 text-5xl">error</span>
          <div className="text-center">
            <p className="text-lg font-semibold text-red-900 dark:text-red-200">
              {error || 'Project not found'}
            </p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-2">
              The project you're looking for doesn't exist or has been deleted.
            </p>
          </div>
          <button
            onClick={() => navigate('/projects')}
            className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="flex-1 overflow-y-auto" data-testid="project-detail">
      <div className="max-w-5xl mx-auto p-6 lg:p-10 pb-20">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-[#92adc9] mb-6">
          <Link
            to="/projects"
            className="hover:text-primary cursor-pointer transition-colors"
            data-testid="breadcrumb-projects"
          >
            Projects
          </Link>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            chevron_right
          </span>
          <span className="text-slate-900 dark:text-white font-medium">{project.title}</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8">
          <div className="flex flex-col gap-3">
            <h1
              className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight"
              data-testid="project-title"
            >
              {project.title}
            </h1>
            <div className="flex items-center gap-3">
              {getStatusBadge(project.status)}
              <span className="text-slate-400 text-sm">•</span>
              <span className="text-slate-500 dark:text-slate-400 text-sm">
                Updated {formatTimeAgo(project.updated_at)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleStartFocusSession}
              className="group flex items-center justify-center h-11 px-6 bg-primary hover:bg-blue-600 text-white rounded-lg gap-2 text-sm font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
              data-testid="start-focus-session"
            >
              <span className="material-symbols-outlined">play_arrow</span>
              <span>Start Focus Session</span>
            </button>
            <button
              className="flex items-center justify-center size-11 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              data-testid="project-menu"
              aria-label="Project menu"
            >
              <span className="material-symbols-outlined">more_horiz</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-1 pb-4 mr-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            data-testid="tab-overview"
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-1 pb-4 mr-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'tasks'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            data-testid="tab-tasks"
          >
            Tasks{' '}
            <span className="ml-1.5 text-xs bg-primary/10 px-1.5 py-0.5 rounded-full">
              {tasks.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-1 pb-4 mr-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'pipeline'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            data-testid="tab-pipeline"
          >
            Pipeline
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-1 pb-4 mr-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'notes'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            data-testid="tab-notes"
          >
            Notes
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-1 pb-4 mr-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'activity'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            data-testid="tab-activity"
          >
            Activity
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6" data-testid="overview-content">
            {project.description && (
              <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                  Description
                </h3>
                <p className="text-slate-700 dark:text-slate-300">{project.description}</p>
              </div>
            )}

            <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Progress
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {tasks.filter((t) => t.status === 'done').length} of {tasks.length} tasks
                      completed
                    </span>
                    <span className="text-lg font-bold text-primary">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                      data-testid="progress-bar"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div data-testid="tasks-content">
            {/* Task Quick Add */}
            <div className="relative group mb-8">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined">add</span>
              </div>
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={handleAddTask}
                className="w-full bg-white dark:bg-[#1a2632] border-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 h-14 pl-12 pr-4 rounded-xl shadow-sm focus:ring-2 focus:ring-primary/50 transition-all text-base"
                placeholder="Add a new task..."
                data-testid="add-task-input"
              />
              <div className="absolute inset-y-0 right-3 flex items-center">
                <span className="text-xs text-slate-400 px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800/50">
                  Enter
                </span>
              </div>
            </div>

            {/* Tasks List */}
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-6xl mb-4">
                  task_alt
                </span>
                <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
                  No tasks yet
                </p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
                  Add your first task to get started
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggleTask}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pipeline' && (
          <PipelineView
            project={project}
            onPhaseChange={async (phase) => {
              try {
                const res = await api.updateProject(project.id, { metadata: { ...project.metadata, phase } });
                setProject(res.project);
              } catch (err) {
                console.error('Failed to update phase:', err);
              }
            }}
          />
        )}

        {activeTab === 'notes' && (
          <div className="space-y-4" data-testid="notes-content">
            <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700/50 p-6">
              <textarea
                className="w-full min-h-[300px] bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:outline-none text-base leading-relaxed"
                placeholder="Add project notes here... (Markdown supported)"
                data-testid="notes-textarea"
              ></textarea>
            </div>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                Cancel
              </button>
              <button className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                Save Notes
              </button>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-4" data-testid="activity-content">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-6xl mb-4">
                history
              </span>
              <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
                No recent activity
              </p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
                Activity will appear here as you work on this project
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const PIPELINE_PHASES = [
  { key: 'idea', label: 'Idea', icon: 'lightbulb', color: 'bg-amber-500' },
  { key: 'spec', label: 'Spec', icon: 'description', color: 'bg-blue-500' },
  { key: 'design', label: 'Design', icon: 'palette', color: 'bg-purple-500' },
  { key: 'dev', label: 'Dev', icon: 'code', color: 'bg-emerald-500' },
  { key: 'test', label: 'Test', icon: 'bug_report', color: 'bg-orange-500' },
  { key: 'deploy', label: 'Deploy', icon: 'rocket_launch', color: 'bg-cyan-500' },
  { key: 'gtm', label: 'GTM', icon: 'campaign', color: 'bg-pink-500' },
  { key: 'live', label: 'Live', icon: 'check_circle', color: 'bg-green-500' },
] as const;

function PipelineView({ project, onPhaseChange }: { project: Project; onPhaseChange: (phase: string) => void }) {
  const currentPhase = project.metadata?.phase || 'idea';
  const currentIdx = PIPELINE_PHASES.findIndex(p => p.key === currentPhase);

  return (
    <div className="space-y-6" data-testid="pipeline-content">
      {/* Phase Progress Bar */}
      <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Project Pipeline</h3>

        {/* Horizontal Phase Track */}
        <div className="relative">
          {/* Connection Line */}
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-slate-200 dark:bg-slate-700" />
          <div
            className="absolute top-5 left-5 h-0.5 bg-primary transition-all duration-500"
            style={{ width: currentIdx >= 0 ? `${(currentIdx / (PIPELINE_PHASES.length - 1)) * 100}%` : '0%' }}
          />

          <div className="relative flex justify-between">
            {PIPELINE_PHASES.map((phase, idx) => {
              const isCompleted = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              const isFuture = idx > currentIdx;

              return (
                <button
                  key={phase.key}
                  onClick={() => onPhaseChange(phase.key)}
                  className="flex flex-col items-center gap-2 group"
                  data-testid={`phase-${phase.key}`}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all
                    ${isCurrent
                      ? `${phase.color} text-white ring-4 ring-primary/20 shadow-lg`
                      : isCompleted
                      ? 'bg-primary text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
                    }
                  `}>
                    <span className="material-symbols-outlined text-[18px]">
                      {isCompleted ? 'check' : phase.icon}
                    </span>
                  </div>
                  <span className={`text-xs font-medium ${
                    isCurrent ? 'text-primary' : isFuture ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'
                  }`}>
                    {phase.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Current Phase Card */}
      <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${PIPELINE_PHASES[currentIdx >= 0 ? currentIdx : 0].color} text-white`}>
            <span className="material-symbols-outlined">{PIPELINE_PHASES[currentIdx >= 0 ? currentIdx : 0].icon}</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Current Phase: {PIPELINE_PHASES[currentIdx >= 0 ? currentIdx : 0].label}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Phase {(currentIdx >= 0 ? currentIdx : 0) + 1} of {PIPELINE_PHASES.length}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {currentIdx > 0 && (
            <button
              onClick={() => onPhaseChange(PIPELINE_PHASES[currentIdx - 1].key)}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Back to {PIPELINE_PHASES[currentIdx - 1].label}
            </button>
          )}
          {currentIdx < PIPELINE_PHASES.length - 1 && (
            <button
              onClick={() => onPhaseChange(PIPELINE_PHASES[currentIdx + 1].key)}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-blue-600 transition-colors"
            >
              Advance to {PIPELINE_PHASES[currentIdx + 1].label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
