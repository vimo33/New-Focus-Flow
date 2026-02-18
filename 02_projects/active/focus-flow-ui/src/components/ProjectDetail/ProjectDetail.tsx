import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAgentStore } from '../../stores/agent';
import type {
  Project, Task, ActivityEntry, FocusSession, DesignScreen,
  PipelineState, PhaseState, PhaseSubState,
  PRDDocument, Specification, DesignSystemType,
  ConceptStep, CouncilMember, ThreadMessage,
  AgentProgressEntry, CouncilProgress,
} from '../../services/api';

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
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'overview' | 'pipeline' | 'tasks' | 'notes' | 'activity') || 'pipeline';
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'pipeline' | 'tasks' | 'notes' | 'activity'>(initialTab);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [notes, setNotes] = useState('');
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [activityLoaded, setActivityLoaded] = useState(false);
  const [focusSession, setFocusSession] = useState<FocusSession | null>(null);
  const [pomodoroSeconds, setPomodoroSeconds] = useState(0);
  const [pomodoroPhase, setPomodoroPhase] = useState<'work' | 'break'>('work');
  const [pomodoroPaused, setPomodoroPaused] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<FocusSession[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (id) {
      loadProjectData(id);
    }
  }, [id]);

  // SSE: auto-refresh when relevant tools complete
  useEffect(() => {
    if (!id) return;

    const RELEVANT_TOOLS = new Set([
      'create_task', 'update_task', 'create_project', 'update_project',
      'process_inbox_item', 'promote_idea_to_project', 'validate_idea',
      'start_pipeline', 'scaffold_project', 'generate_specs',
    ]);

    const unsub = useAgentStore.getState().onToolCompleted('project-detail', (data) => {
      if (RELEVANT_TOOLS.has(data.tool)) {
        const isRelevant = !data.data?.project_id || data.data.project_id === id;
        if (isRelevant) {
          loadProjectData(id);
        }
      }
    });

    return unsub;
  }, [id]);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleArchiveProject = async () => {
    if (!project || !window.confirm(`Archive "${project.title}"? You can restore it later.`)) return;
    try {
      await api.updateProject(project.id, { status: 'paused' } as any);
      setMenuOpen(false);
      navigate('/');
    } catch (err) {
      console.error('Failed to archive project:', err);
    }
  };

  const handleDeleteProject = async () => {
    if (!project || !window.confirm(`Permanently delete "${project.title}"? This cannot be undone.`)) return;
    try {
      await api.deleteProject(project.id);
      setMenuOpen(false);
      navigate('/');
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

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

  useEffect(() => {
    if (id && activeTab === 'notes' && !notesLoaded) {
      api.getProjectNotes(id).then((res) => {
        setNotes(res.content);
        setNotesLoaded(true);
      }).catch(() => setNotesLoaded(true));
    }
  }, [id, activeTab, notesLoaded]);

  useEffect(() => {
    if (id && activeTab === 'activity' && !activityLoaded) {
      api.getProjectActivity(id).then((res) => {
        setActivity(res.entries);
        setActivityLoaded(true);
      }).catch(() => setActivityLoaded(true));
    }
  }, [id, activeTab, activityLoaded]);

  const handleSaveNotes = async () => {
    if (!id) return;
    setNotesSaving(true);
    try {
      await api.saveProjectNotes(id, notes);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setNotesSaving(false);
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
    const task = tasks.find((t) => t.id === taskId);
    if (task) setEditingTask({ ...task });
  };

  const handleSaveEdit = async () => {
    if (!editingTask) return;
    try {
      const response = await api.updateTask(editingTask.id, {
        title: editingTask.title,
        priority: editingTask.priority,
        due_date: editingTask.due_date,
        status: editingTask.status,
      });
      setTasks(tasks.map((t) => (t.id === editingTask.id ? response.task : t)));
      setEditingTask(null);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !window.confirm(`Delete task "${task.title}"?`)) return;

    try {
      await api.deleteTask(taskId);
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  // Pomodoro timer tick
  useEffect(() => {
    if (focusSession && !pomodoroPaused) {
      timerRef.current = setInterval(() => {
        setPomodoroSeconds((prev) => {
          const limit = pomodoroPhase === 'work'
            ? focusSession.work_duration * 60
            : focusSession.break_duration * 60;
          if (prev + 1 >= limit) {
            if (pomodoroPhase === 'work') {
              setPomodoroPhase('break');
              return 0;
            } else {
              // Break done — auto-complete
              handleStopFocusSession();
              return 0;
            }
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [focusSession, pomodoroPaused, pomodoroPhase]);

  // Load session history on overview tab
  useEffect(() => {
    if (id && project) {
      api.getFocusSessions(id).then((res) => setSessionHistory(res.sessions)).catch(() => {});
    }
  }, [id, project, focusSession]);

  const handleStartFocusSession = async () => {
    if (!project) return;
    try {
      const res = await api.startFocusSession({
        project_id: project.id,
        session_type: 'pomodoro',
        work_duration: 25,
        break_duration: 5,
      });
      setFocusSession(res.session);
      setPomodoroSeconds(0);
      setPomodoroPhase('work');
      setPomodoroPaused(false);
    } catch (err) {
      console.error('Failed to start focus session:', err);
    }
  };

  const handleStopFocusSession = useCallback(async () => {
    if (!focusSession) return;
    try {
      await api.updateFocusSession(focusSession.id, {
        status: 'completed',
        ended_at: new Date().toISOString(),
      } as any);
    } catch (err) {
      console.error('Failed to stop focus session:', err);
    }
    setFocusSession(null);
    setPomodoroSeconds(0);
    setActivityLoaded(false);
  }, [focusSession]);

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
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center justify-center size-11 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                data-testid="project-menu"
                aria-label="Project menu"
              >
                <span className="material-symbols-outlined">more_horiz</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-50 py-1 overflow-hidden">
                  <button
                    onClick={() => { setActiveTab('pipeline'); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">conversion_path</span>
                    Pipeline
                  </button>
                  <button
                    onClick={() => { setActiveTab('tasks'); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">checklist</span>
                    Tasks
                  </button>
                  <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                  <button
                    onClick={handleArchiveProject}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">archive</span>
                    Archive Project
                  </button>
                  <button
                    onClick={handleDeleteProject}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    Delete Project
                  </button>
                </div>
              )}
            </div>
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

        {/* Pomodoro Timer */}
        {focusSession && (
          <div className="mb-8 bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${pomodoroPhase === 'work' ? 'bg-red-500 animate-pulse' : 'bg-green-500 animate-pulse'}`} />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {pomodoroPhase === 'work' ? 'Focus Time' : 'Break Time'}
                </h3>
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Pomodoro
              </span>
            </div>
            <div className="flex items-center justify-center py-6">
              <div className="text-6xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                {(() => {
                  const limit = pomodoroPhase === 'work' ? focusSession.work_duration * 60 : focusSession.break_duration * 60;
                  const remaining = Math.max(0, limit - pomodoroSeconds);
                  const min = Math.floor(remaining / 60);
                  const sec = remaining % 60;
                  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
                })()}
              </div>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mb-6">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${pomodoroPhase === 'work' ? 'bg-red-500' : 'bg-green-500'}`}
                style={{
                  width: `${(pomodoroSeconds / ((pomodoroPhase === 'work' ? focusSession.work_duration : focusSession.break_duration) * 60)) * 100}%`
                }}
              />
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setPomodoroPaused(!pomodoroPaused)}
                className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {pomodoroPaused ? 'play_arrow' : 'pause'}
                </span>
                {pomodoroPaused ? 'Resume' : 'Pause'}
              </button>
              {pomodoroPhase === 'work' && (
                <button
                  onClick={() => { setPomodoroPhase('break'); setPomodoroSeconds(0); }}
                  className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>skip_next</span>
                  Skip to Break
                </button>
              )}
              <button
                onClick={handleStopFocusSession}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>stop</span>
                End Session
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6" data-testid="overview-content">
            {project.description && !project.artifacts?.refined_concept && (
              <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                  Description
                </h3>
                <p className="text-slate-700 dark:text-slate-300">{project.description}</p>
              </div>
            )}

            {project.artifacts?.refined_concept && (
              <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-amber-500">auto_awesome</span>
                  Concept Note
                </h3>
                <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                  {project.artifacts.refined_concept}
                </div>
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

            {sessionHistory.length > 0 && (
              <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Recent Focus Sessions
                </h3>
                <div className="space-y-3">
                  {sessionHistory.slice(0, 5).map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-sm ${s.status === 'completed' ? 'text-green-500' : 'text-slate-400'}`}>
                          {s.status === 'completed' ? 'check_circle' : 'timer'}
                        </span>
                        <div>
                          <p className="text-sm text-slate-900 dark:text-white">
                            {s.duration_minutes ? `${s.duration_minutes}min` : 'In progress'}
                          </p>
                          <p className="text-xs text-slate-400">{formatTimeAgo(s.started_at)}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        s.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            onProjectUpdate={(p) => setProject(p)}
          />
        )}

        {activeTab === 'notes' && (
          <div className="space-y-4" data-testid="notes-content">
            <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700/50 p-6">
              <textarea
                className="w-full min-h-[300px] bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:outline-none text-base leading-relaxed"
                placeholder="Add project notes here... (Markdown supported)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="notes-textarea"
              ></textarea>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setNotesLoaded(false); }}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Revert
              </button>
              <button
                onClick={handleSaveNotes}
                disabled={notesSaving}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {notesSaving ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        )}

        {/* Task Edit Modal */}
        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingTask(null)}>
            <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Edit Task</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                  <input
                    type="text"
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                    <select
                      value={editingTask.priority || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, priority: (e.target.value || undefined) as Task['priority'] })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    >
                      <option value="">None</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                    <select
                      value={editingTask.status}
                      onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as Task['status'] })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editingTask.due_date || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value || undefined })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-4" data-testid="activity-content">
            {activity.length === 0 ? (
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
            ) : (
              <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-800">
                {activity.map((entry) => {
                  const iconMap: Record<string, string> = {
                    task_created: 'add_task',
                    task_updated: 'edit',
                    task_deleted: 'delete',
                    phase_changed: 'swap_horiz',
                    notes_saved: 'edit_note',
                    focus_session_started: 'play_arrow',
                    focus_session_ended: 'stop',
                  };
                  return (
                    <div key={entry.id} className="flex items-start gap-3 p-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-slate-500 dark:text-slate-400" style={{ fontSize: '16px' }}>
                          {iconMap[entry.type] || 'circle'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900 dark:text-white">{entry.description}</p>
                        <p className="text-xs text-slate-400 mt-1">{formatTimeAgo(entry.timestamp)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const PIPELINE_PHASES = [
  { key: 'concept', label: 'Concept', icon: 'lightbulb', color: 'bg-amber-500' },
  { key: 'spec', label: 'Spec', icon: 'description', color: 'bg-blue-500' },
  { key: 'design', label: 'Design', icon: 'palette', color: 'bg-purple-500' },
  { key: 'dev', label: 'Dev', icon: 'code', color: 'bg-emerald-500' },
  { key: 'test', label: 'Test', icon: 'bug_report', color: 'bg-orange-500' },
  { key: 'deploy', label: 'Deploy', icon: 'rocket_launch', color: 'bg-cyan-500' },
  { key: 'live', label: 'Live', icon: 'check_circle', color: 'bg-green-500' },
] as const;

function getSubStateBadge(subState: PhaseSubState | undefined) {
  switch (subState) {
    case 'working':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Working
        </span>
      );
    case 'review':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Awaiting Review
        </span>
      );
    case 'approved':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Approved
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          Changes Requested
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-500 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          Idle
        </span>
      );
  }
}

function PipelineView({ project, onProjectUpdate }: { project: Project; onProjectUpdate: (p: Project) => void }) {
  const [pipelineState, setPipelineState] = useState<PipelineState | null>(project.pipeline || null);
  const [currentPhaseState, setCurrentPhaseState] = useState<PhaseState | null>(null);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentPhase = pipelineState?.current_phase || project.phase || 'concept';
  const currentIdx = PIPELINE_PHASES.findIndex(p => p.key === currentPhase);

  // Load pipeline status
  const loadStatus = useCallback(async () => {
    try {
      const status = await api.getPipelineStatus(project.id);
      setPipelineState(status.pipeline);
      setCurrentPhaseState(status.current_phase_state);
      if (status.project) onProjectUpdate(status.project);
    } catch (err) {
      console.error('Failed to load pipeline status:', err);
    }
  }, [project.id]);

  useEffect(() => {
    if (pipelineState) {
      loadStatus();
    }
  }, []);

  // Poll while working
  useEffect(() => {
    if (currentPhaseState?.sub_state === 'working') {
      pollRef.current = setInterval(loadStatus, 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [currentPhaseState?.sub_state, loadStatus]);

  const handleStartPipeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.startPipeline(project.id);
      setPipelineState(result.pipeline);
      onProjectUpdate(result.project);
      // Kick off polling
      setTimeout(loadStatus, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.reviewPhase(project.id, 'approve');
      setPipelineState(result.pipeline);
      onProjectUpdate(result.project);
      setFeedback('');
      setTimeout(loadStatus, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!feedback.trim()) {
      setError('Please provide feedback for the changes you want.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.reviewPhase(project.id, 'reject', feedback.trim());
      setPipelineState(result.pipeline);
      onProjectUpdate(result.project);
      setFeedback('');
      setTimeout(loadStatus, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const artifacts = project.artifacts;

  return (
    <div className="space-y-6" data-testid="pipeline-content">
      {/* Phase Progress Bar */}
      <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Project Pipeline</h3>
          {!pipelineState && (
            <button
              onClick={handleStartPipeline}
              disabled={loading}
              className="px-5 py-2.5 bg-primary hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
            >
              <span className="material-symbols-outlined text-[18px]">play_arrow</span>
              {loading ? 'Starting...' : 'Start Pipeline'}
            </button>
          )}
        </div>

        {/* Horizontal Phase Track */}
        <div className="relative">
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-slate-200 dark:bg-slate-700" />
          <div
            className="absolute top-5 left-5 h-0.5 bg-primary transition-all duration-500"
            style={{ width: currentIdx >= 0 ? `${(currentIdx / (PIPELINE_PHASES.length - 1)) * 100}%` : '0%' }}
          />

          <div className="relative flex justify-between">
            {PIPELINE_PHASES.map((phase, idx) => {
              const phaseState = pipelineState?.phases[phase.key as keyof typeof pipelineState.phases];
              const isCompleted = phaseState?.sub_state === 'approved';
              const isCurrent = phase.key === currentPhase;
              const isFuture = idx > currentIdx;
              const subState = phaseState?.sub_state;

              return (
                <div key={phase.key} className="flex flex-col items-center gap-2" data-testid={`phase-${phase.key}`}>
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all
                    ${isCurrent && subState === 'working'
                      ? `${phase.color} text-white ring-4 ring-blue-500/30 shadow-lg animate-pulse`
                      : isCurrent && subState === 'review'
                      ? `${phase.color} text-white ring-4 ring-amber-500/30 shadow-lg`
                      : isCurrent
                      ? `${phase.color} text-white ring-4 ring-primary/20 shadow-lg`
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
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
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Current Phase Card */}
      {pipelineState && (
        <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${PIPELINE_PHASES[currentIdx >= 0 ? currentIdx : 0].color} text-white`}>
                <span className="material-symbols-outlined">{PIPELINE_PHASES[currentIdx >= 0 ? currentIdx : 0].icon}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {PIPELINE_PHASES[currentIdx >= 0 ? currentIdx : 0].label} Phase
                  {currentPhaseState?.step ? ` - ${currentPhaseState.step.replace('_', ' ')}` : ''}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Phase {(currentIdx >= 0 ? currentIdx : 0) + 1} of {PIPELINE_PHASES.length}
                </p>
              </div>
            </div>
            {getSubStateBadge(currentPhaseState?.sub_state)}
          </div>

          {/* Working state (non-concept phases) */}
          {currentPhase !== 'concept' && currentPhaseState?.sub_state === 'working' && (
            <div className="flex items-center gap-3 py-8 justify-center">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-600 dark:text-slate-300 font-medium">AI is working on the {currentPhase} phase...</p>
            </div>
          )}

          {/* Concept phase — handled by dedicated component */}
          {currentPhase === 'concept' && (
            <ConceptPhaseView
              project={project}
              phaseState={currentPhaseState}
              onProjectUpdate={onProjectUpdate}
              onStatusRefresh={loadStatus}
            />
          )}

          {/* Review state — show artifacts + approve/reject (non-concept phases) */}
          {currentPhase !== 'concept' && currentPhaseState?.sub_state === 'review' && (
            <div className="space-y-4">
              {/* Phase-specific artifact previews */}
              {currentPhase === 'spec' && artifacts?.specs && (
                <SpecsArtifactView specs={artifacts.specs} />
              )}
              {currentPhase === 'design' && (
                <DesignArtifactView
                  designSystem={artifacts?.design_system}
                  step={currentPhaseState.step}
                  projectId={project.id}
                />
              )}
              {currentPhase === 'dev' && (
                <DevPhaseView project={project} />
              )}
              {currentPhase === 'test' && (
                <TestPhaseView project={project} />
              )}
              {currentPhase === 'deploy' && (
                <DeployPhaseView project={project} />
              )}

              {/* Feedback from previous rejection */}
              {currentPhaseState.feedback && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Previous feedback:</p>
                  <p className="text-sm text-amber-800 dark:text-amber-300">{currentPhaseState.feedback}</p>
                </div>
              )}

              {/* Approve/Reject controls */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <div className="flex flex-col gap-3">
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide feedback for changes (required for rejection)..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
                    rows={2}
                  />
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleApprove}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      {loading ? 'Processing...' : 'Approve & Continue'}
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={loading || !feedback.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit_note</span>
                      Request Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Approved / Live state */}
          {currentPhase === 'live' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <span className="material-symbols-outlined text-emerald-500 text-5xl">rocket_launch</span>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">Project is Live!</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Pipeline completed successfully.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Artifact Preview Components
// ============================================================================

function PRDArtifactView({ prd }: { prd: PRDDocument }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px] text-amber-500">article</span>
        PRD: {prd.title}
      </h4>
      <p className="text-sm text-slate-600 dark:text-slate-300">{prd.description}</p>
      {prd.requirements.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Requirements</p>
          <ul className="space-y-1">
            {prd.requirements.map((req, i) => (
              <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                <span className="text-primary mt-0.5">-</span>
                {req}
              </li>
            ))}
          </ul>
        </div>
      )}
      {prd.user_stories && prd.user_stories.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">User Stories</p>
          <ul className="space-y-1">
            {prd.user_stories.map((story, i) => (
              <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">-</span>
                {story}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SpecsArtifactView({ specs }: { specs: Specification[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px] text-blue-500">description</span>
        Technical Specifications ({specs.length} features)
      </h4>
      {specs.map((spec, idx) => (
        <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                spec.complexity === 'simple' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                spec.complexity === 'moderate' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>{spec.complexity}</span>
              <span className="text-sm font-medium text-slate-900 dark:text-white">{spec.feature_name}</span>
            </div>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">
              {expandedIdx === idx ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          {expandedIdx === idx && (
            <div className="p-3 pt-0 space-y-2 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-600 dark:text-slate-300">{spec.description}</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="font-medium text-slate-500 dark:text-slate-400 mb-1">Components</p>
                  {spec.frontend.components.map((c, i) => (
                    <span key={i} className="inline-block mr-1 mb-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">{c}</span>
                  ))}
                </div>
                <div>
                  <p className="font-medium text-slate-500 dark:text-slate-400 mb-1">Endpoints</p>
                  {spec.backend.endpoints.map((e, i) => (
                    <p key={i} className="text-slate-600 dark:text-slate-300 font-mono">{e.method} {e.path}</p>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Acceptance Criteria</p>
                {spec.acceptance_criteria.map((c, i) => (
                  <p key={i} className="text-xs text-slate-600 dark:text-slate-300">- {c}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DesignArtifactView({ designSystem, step, projectId }: { designSystem?: DesignSystemType; step?: string; projectId: string }) {
  const [screens, setScreens] = useState<DesignScreen[]>([]);

  useEffect(() => {
    if (step === 'main_screens' || step === 'all_screens') {
      api.getDesignScreens(projectId).then((res) => setScreens(res.screens)).catch(() => {});
    }
  }, [projectId, step]);

  return (
    <div className="space-y-3">
      {(step === 'system' || !step) && designSystem && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-purple-500">palette</span>
            Design System
          </h4>
          {designSystem.color_palette && (
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Colors</p>
              <div className="flex flex-wrap gap-2">
                {designSystem.color_palette.map((color, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-lg p-2 border border-slate-200 dark:border-slate-700">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: color.hex }} />
                    <div>
                      <p className="text-xs font-medium text-slate-900 dark:text-white">{color.name}</p>
                      <p className="text-[10px] text-slate-400">{color.hex}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {designSystem.typography && (
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Typography</p>
              <div className="flex flex-wrap gap-2">
                {designSystem.typography.map((t, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                    {t.role}: {t.font} {t.size} ({t.weight})
                  </span>
                ))}
              </div>
            </div>
          )}
          {designSystem.component_inventory && (
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Components</p>
              <div className="flex flex-wrap gap-1">
                {designSystem.component_inventory.map((c, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {(step === 'main_screens' || step === 'all_screens') && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-purple-500">image</span>
            {step === 'main_screens' ? 'Main Screens' : 'All Screens'} ({screens.length})
          </h4>
          {screens.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {screens.map(screen => (
                <div key={screen.id} className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{screen.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{screen.status}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">Screens are being generated...</p>
          )}
        </div>
      )}
    </div>
  );
}

function DevPhaseView({ project }: { project: Project }) {
  const workspace = project.metadata?.dev_workspace;

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px] text-emerald-500">code</span>
        Development Workspace
      </h4>
      {workspace && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-3">
            <code className="text-sm text-emerald-400 flex-1 font-mono">{workspace}</code>
            <button
              onClick={() => navigator.clipboard.writeText(`cd ${workspace} && claude`)}
              className="text-slate-400 hover:text-white p-1"
              title="Copy launch command"
            >
              <span className="material-symbols-outlined text-[16px]">content_copy</span>
            </button>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <p>Launch Claude CLI in the workspace:</p>
            <code className="block bg-slate-900 text-emerald-400 rounded p-2 font-mono">cd {workspace} && claude</code>
          </div>
        </div>
      )}
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Review the task breakdown (CLAUDE.md and TASKS.md), then approve to begin development.
        After dev is complete, come back and approve to advance to testing.
      </p>
    </div>
  );
}

function TestPhaseView({ project }: { project: Project }) {
  const checklist = project.metadata?.test_checklist || [];

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px] text-orange-500">bug_report</span>
        Testing Checklist ({checklist.length} items)
      </h4>
      {checklist.length > 0 ? (
        <div className="space-y-2">
          {checklist.map((item: any, idx: number) => (
            <div key={idx} className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={item.passed} readOnly className="mt-0.5 rounded" />
              <div>
                <span className="text-xs font-medium text-slate-500">[{item.feature}]</span>
                <p className="text-slate-700 dark:text-slate-300">{item.criteria}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">No test criteria available.</p>
      )}
    </div>
  );
}

function DeployPhaseView({ project }: { project: Project }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px] text-cyan-500">rocket_launch</span>
        Deployment
      </h4>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {project.metadata?.deploy_status === 'ready_for_review'
          ? 'Deployment is ready for your review. Approve to go live.'
          : 'Preparing deployment...'}
      </p>
    </div>
  );
}

// ============================================================================
// Concept Timeline — Horizontal step indicator with history navigation
// ============================================================================

const CONCEPT_STEPS: { key: ConceptStep; label: string; icon: string }[] = [
  { key: 'refining', label: 'Refine', icon: 'psychology' },
  { key: 'council_selection', label: 'Council', icon: 'groups' },
  { key: 'council_running', label: 'Evaluating', icon: 'sync' },
  { key: 'council_review', label: 'Verdict', icon: 'gavel' },
  { key: 'prd_generation', label: 'PRD Gen', icon: 'article' },
  { key: 'prd_review', label: 'PRD Review', icon: 'fact_check' },
];

function ConceptTimeline({
  currentStep,
  artifacts,
  onViewStep,
}: {
  currentStep: ConceptStep;
  artifacts?: Project['artifacts'];
  onViewStep: (step: ConceptStep | null) => void;
}) {
  const currentIdx = CONCEPT_STEPS.findIndex(s => s.key === currentStep);

  // Determine which steps have been completed based on artifacts
  const isStepCompleted = (step: ConceptStep): boolean => {
    switch (step) {
      case 'refining': return !!(artifacts?.refined_concept);
      case 'council_selection': return !!(artifacts?.selected_council && artifacts.selected_council.length > 0);
      case 'council_running': return !!(artifacts?.council_verdict);
      case 'council_review': return !!(artifacts?.council_verdict && artifacts?.prd);
      case 'prd_generation': return !!(artifacts?.prd);
      case 'prd_review': return false; // Terminal review step
      default: return false;
    }
  };

  return (
    <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2 no-scrollbar">
      {CONCEPT_STEPS.map((step, idx) => {
        const completed = isStepCompleted(step.key);
        const isCurrent = step.key === currentStep;
        const isFuture = idx > currentIdx;
        const isClickable = completed && !isCurrent;

        return (
          <div key={step.key} className="flex items-center">
            {idx > 0 && (
              <div className={`w-6 h-0.5 ${idx <= currentIdx ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`} />
            )}
            <button
              onClick={() => isClickable ? onViewStep(step.key) : isCurrent ? onViewStep(null) : undefined}
              disabled={isFuture && !completed}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                isCurrent
                  ? 'bg-primary text-white shadow-md shadow-blue-500/20'
                  : completed
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 cursor-pointer'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
              }`}
              title={isClickable ? `View ${step.label} history` : undefined}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                {completed && !isCurrent ? 'check_circle' : step.icon}
              </span>
              {step.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Concept Phase View — Interactive concept refinement, council, PRD
// ============================================================================

function ConceptPhaseView({
  project,
  phaseState,
  onProjectUpdate,
  onStatusRefresh,
}: {
  project: Project;
  phaseState: PhaseState | null;
  onProjectUpdate: (p: Project) => void;
  onStatusRefresh: () => void;
}) {
  const step = (phaseState?.step as ConceptStep) || 'refining';
  const [viewingStep, setViewingStep] = useState<ConceptStep | null>(null);

  // Reset viewingStep when the current step changes
  useEffect(() => {
    setViewingStep(null);
  }, [step]);

  const renderHistoryPanel = (historyStep: ConceptStep) => {
    switch (historyStep) {
      case 'refining':
        return <RefiningHistoryView project={project} />;
      case 'council_selection':
        return <CouncilSelectionHistoryView project={project} />;
      case 'council_review':
        return <CouncilReviewView project={project} onProjectUpdate={onProjectUpdate} onStatusRefresh={onStatusRefresh} readOnly />;
      case 'prd_review':
      case 'prd_generation':
        return project.artifacts?.prd ? <PRDArtifactView prd={project.artifacts.prd} /> : null;
      default:
        return null;
    }
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 'refining':
        return <ConceptRefiningView project={project} onStatusRefresh={onStatusRefresh} />;
      case 'council_selection':
        return <CouncilSelectionView project={project} onProjectUpdate={onProjectUpdate} onStatusRefresh={onStatusRefresh} />;
      case 'council_running':
        return <CouncilRunningView project={project} onStatusRefresh={onStatusRefresh} />;
      case 'council_review':
        return <CouncilReviewView project={project} onProjectUpdate={onProjectUpdate} onStatusRefresh={onStatusRefresh} />;
      case 'prd_generation':
        return <PRDGeneratingView />;
      case 'prd_review':
        return <PRDReviewView project={project} onProjectUpdate={onProjectUpdate} onStatusRefresh={onStatusRefresh} />;
      default:
        return <ConceptRefiningView project={project} onStatusRefresh={onStatusRefresh} />;
    }
  };

  return (
    <div>
      <ConceptTimeline
        currentStep={step}
        artifacts={project.artifacts}
        onViewStep={setViewingStep}
      />
      {project.artifacts?.refined_concept && step !== 'refining' && (
        <details className="mb-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
          <summary className="cursor-pointer px-4 py-3 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300 select-none">
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            Concept Note
            <span className="ml-auto material-symbols-outlined text-[16px] transition-transform details-open:rotate-180">expand_more</span>
          </summary>
          <div className="px-4 pb-4">
            <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
              {project.artifacts.refined_concept}
            </p>
          </div>
        </details>
      )}
      {viewingStep ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setViewingStep(null)}
              className="flex items-center gap-1 text-xs text-primary hover:text-blue-600 font-medium"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
              Back to current step
            </button>
            <span className="text-xs text-slate-400">
              Viewing: {CONCEPT_STEPS.find(s => s.key === viewingStep)?.label}
            </span>
          </div>
          {renderHistoryPanel(viewingStep)}
        </div>
      ) : (
        renderCurrentStep()
      )}
    </div>
  );
}

// -- History: read-only refining chat + concept summary
function RefiningHistoryView({ project }: { project: Project }) {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getConceptMessages(project.id).then((res) => {
      setMessages(res.messages);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [project.id]);

  return (
    <div className="space-y-4">
      {project.artifacts?.refined_concept && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            Refined Concept
          </h4>
          <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap">{project.artifacts.refined_concept}</p>
        </div>
      )}
      <div className="bg-slate-50 dark:bg-[#0d1520] rounded-lg border border-slate-200 dark:border-slate-700 max-h-[300px] overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No chat history available.</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary/20 text-primary dark:text-blue-300'
                  : 'bg-white dark:bg-[#1e2936] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// -- History: read-only council selection
function CouncilSelectionHistoryView({ project }: { project: Project }) {
  const council = project.artifacts?.selected_council;

  if (!council || council.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-4">No council selection data.</p>;
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px] text-purple-500">groups</span>
        Selected Council ({council.length} agents)
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {council.map((agent) => (
          <div key={agent.agent_name} className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{agent.agent_name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{agent.role}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{agent.focus}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- Step: refining -- Interactive chat with AI Concept Analyst
function ConceptRefiningView({ project, onStatusRefresh }: { project: Project; onStatusRefresh: () => void }) {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [readying, setReadying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getConceptMessages(project.id).then((res) => {
      setMessages(res.messages);
      setLoadingMessages(false);
    }).catch(() => setLoadingMessages(false));
  }, [project.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);
    setError(null);

    // Optimistic user message
    const tempUserMsg: ThreadMessage = {
      id: `temp-${Date.now()}`,
      thread_id: '',
      role: 'user',
      content: text,
      source: 'text',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const result = await api.sendConceptMessage(project.id, text);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        result.user_message,
        result.assistant_message,
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setSending(false);
    }
  };

  const handleReadyForCouncil = async () => {
    setReadying(true);
    setError(null);
    try {
      await api.markConceptReady(project.id);
      onStatusRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to advance to council');
    } finally {
      setReadying(false);
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-sm">psychology</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Concept Analyst</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Refine your project concept through conversation</p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="bg-slate-50 dark:bg-[#0d1520] rounded-lg border border-slate-200 dark:border-slate-700 max-h-[400px] overflow-y-auto p-4 space-y-4">
        {loadingMessages ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Start the conversation to refine your concept...</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id}>
              {msg.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-primary text-white rounded-2xl rounded-tr-sm px-4 py-3">
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-start items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-white" style={{ fontSize: '14px' }}>psychology</span>
                  </div>
                  <div className="max-w-[80%] bg-white dark:bg-[#1e2936] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-sm px-4 py-3">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white" style={{ fontSize: '14px' }}>psychology</span>
            </div>
            <div className="bg-white dark:bg-[#1e2936] border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask a question or refine your concept..."
          className="flex-1 px-4 py-2.5 bg-white dark:bg-[#1e2936] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || sending}
          className="px-4 py-2.5 bg-primary hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </form>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Ready for Council Button — always visible so user can skip chat if doc is comprehensive */}
      <button
        onClick={handleReadyForCouncil}
        disabled={readying}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-amber-500/20"
      >
        {readying ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Preparing for Council...</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[18px]">groups</span>
            <span>Send to Council</span>
          </>
        )}
      </button>
    </div>
  );
}

// -- Step: council_selection -- AI recommends tailored council members, user approves
function CouncilSelectionView({
  project,
  onProjectUpdate,
  onStatusRefresh,
}: {
  project: Project;
  onProjectUpdate: (p: Project) => void;
  onStatusRefresh: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recommendedAgents = project.artifacts?.selected_council as CouncilMember[] | undefined;
  const refinedConcept = project.artifacts?.refined_concept as string | undefined;

  // Pre-select all recommended agents on mount
  useEffect(() => {
    if (recommendedAgents) {
      setSelected(new Set(recommendedAgents.map((a) => a.agent_name)));
    }
  }, [project.id]);

  const toggleAgent = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleApproveCouncil = async () => {
    if (selected.size === 0 || !recommendedAgents) {
      setError('Select at least one council member.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const selectedAgents = recommendedAgents.filter((a) => selected.has(a.agent_name));
      const result = await api.approveCouncil(project.id, selectedAgents);
      if (result.project) onProjectUpdate(result.project);
      onStatusRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to start council');
    } finally {
      setLoading(false);
    }
  };

  const agents = recommendedAgents || [];

  return (
    <div className="space-y-4">
      {/* Refined concept summary */}
      {refinedConcept && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            Refined Concept
          </h4>
          <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap">{refinedConcept}</p>
        </div>
      )}

      {/* Council Selection */}
      <div>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-purple-500">groups</span>
          AI-Recommended Evaluators
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          {agents.length} specialist{agents.length !== 1 ? 's' : ''} tailored to your concept — toggle any on or off.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {agents.map((agent) => {
            const isSelected = selected.has(agent.agent_name);
            return (
              <button
                key={agent.agent_name}
                onClick={() => toggleAgent(agent.agent_name)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{agent.agent_name}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-primary bg-primary' : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {isSelected && <span className="material-symbols-outlined text-white" style={{ fontSize: '14px' }}>check</span>}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{agent.role}</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1">{agent.focus}</p>
                {agent.evaluation_criteria && agent.evaluation_criteria.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {agent.evaluation_criteria.map((c) => (
                      <span key={c} className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              const result = await api.reviewPhase(project.id, 'reject', 'Refining concept further');
              if (result.project) onProjectUpdate(result.project);
              onStatusRefresh();
            } catch (err: any) {
              setError(err.message || 'Failed to go back');
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 border border-slate-300 dark:border-slate-600 hover:border-primary dark:hover:border-primary text-slate-700 dark:text-slate-200 rounded-lg text-sm font-bold transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">edit_note</span>
          <span>Refine Concept</span>
        </button>
        <button
          onClick={handleApproveCouncil}
          disabled={loading || selected.size === 0}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-all"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Starting Council...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>Approve Council ({selected.size} of {agents.length} selected)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// -- Step: council_running -- Progress cards with per-agent status
function CouncilRunningView({ project, onStatusRefresh }: { project: Project; onStatusRefresh: () => void }) {
  const [progress, setProgress] = useState<CouncilProgress | null>(project.artifacts?.council_progress || null);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // SSE-driven progress + fallback poll every 10s
  useEffect(() => {
    // SSE: live per-agent updates
    const unsubProgress = useAgentStore.getState().onCouncilProgress('council-running-view', (data) => {
      if (data.project_id !== project.id) return;
      setProgress(prev => {
        if (!prev) return prev;
        const agents: AgentProgressEntry[] = prev.agents.map(a => {
          if (a.agent_name !== data.agent_name) return a;
          const updated: AgentProgressEntry = { ...a, status: data.status };
          if (data.error) updated.error = data.error;
          if (data.score != null && a.evaluation) {
            updated.evaluation = { ...a.evaluation, score: data.score };
          }
          return updated;
        });
        return { ...prev, agents, completed_count: data.completed_count ?? prev.completed_count };
      });
    });

    // SSE: council completed → trigger refresh
    const unsubCompleted = useAgentStore.getState().onCouncilCompleted('council-running-view', (data) => {
      if (data.project_id !== project.id) return;
      if (pollRef.current) clearInterval(pollRef.current);
      onStatusRefresh();
    });

    // Fallback poll every 10s
    const poll = async () => {
      try {
        const status = await api.getPipelineStatus(project.id);
        const p = status.project;
        const cp = p.artifacts?.council_progress;
        if (cp) setProgress(cp);

        const step = status.current_phase_state?.step;
        if (step === 'council_review') {
          if (pollRef.current) clearInterval(pollRef.current);
          onStatusRefresh();
        }
      } catch (err) {
        console.error('Failed to poll council progress:', err);
      }
    };
    poll();
    pollRef.current = setInterval(poll, 10000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      unsubProgress();
      unsubCompleted();
    };
  }, [project.id]);

  const handleRetry = async () => {
    setRetrying(true);
    setError(null);
    try {
      await api.retryCouncil(project.id);
      onStatusRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to retry council');
    } finally {
      setRetrying(false);
    }
  };

  const getAgentStatusCard = (agent: AgentProgressEntry) => {
    switch (agent.status) {
      case 'pending':
        return (
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{agent.agent_name}</span>
              <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '18px' }}>hourglass_empty</span>
            </div>
            <p className="text-xs text-slate-400">Waiting...</p>
          </div>
        );
      case 'running':
        return (
          <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{agent.agent_name}</span>
              <span className="material-symbols-outlined text-blue-500 animate-spin" style={{ fontSize: '18px' }}>sync</span>
            </div>
            <p className="text-xs text-blue-500 dark:text-blue-400">Evaluating...</p>
          </div>
        );
      case 'completed':
        return (
          <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{agent.agent_name}</span>
              {agent.evaluation && (
                <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                  agent.evaluation.score >= 8 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                  agent.evaluation.score >= 6 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                }`}>
                  {agent.evaluation.score}/10
                </span>
              )}
            </div>
            {agent.evaluation && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 line-clamp-2 mt-1">
                {agent.evaluation.reasoning.substring(0, 100)}{agent.evaluation.reasoning.length > 100 ? '...' : ''}
              </p>
            )}
          </div>
        );
      case 'failed':
        return (
          <div className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-red-700 dark:text-red-300">{agent.agent_name}</span>
              <span className="material-symbols-outlined text-red-500" style={{ fontSize: '18px' }}>error</span>
            </div>
            <p className="text-xs text-red-500 dark:text-red-400">{agent.error || 'Failed'}</p>
          </div>
        );
    }
  };

  // Check if stuck (no progress object, or synthesis failed, or all agents failed)
  const isStuck = !progress ||
    (progress.synthesis_status === 'failed') ||
    (progress.agents.every(a => a.status === 'failed'));
  const hasFailedAgents = progress?.agents.some(a => a.status === 'failed');
  const allDone = progress && progress.agents.every(a => a.status === 'completed' || a.status === 'failed');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-purple-500">groups</span>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Council Evaluation</h4>
        </div>
        {progress && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {progress.completed_count} of {progress.total_count} complete
          </span>
        )}
      </div>

      {/* Progress bar */}
      {progress && (
        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
          <div
            className="bg-purple-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${progress.total_count > 0 ? (progress.completed_count / progress.total_count) * 100 : 0}%` }}
          />
        </div>
      )}

      {/* Agent cards grid */}
      {progress && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {progress.agents.map((agent) => (
            <div key={agent.agent_name}>
              {getAgentStatusCard(agent)}
            </div>
          ))}
        </div>
      )}

      {/* Synthesis status */}
      {allDone && progress?.synthesis_status === 'running' && (
        <div className="flex items-center justify-center gap-3 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-purple-600 dark:text-purple-400">Synthesizing verdict...</span>
        </div>
      )}

      {allDone && progress?.synthesis_status === 'pending' && !isStuck && (
        <div className="flex items-center justify-center gap-3 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-500">Preparing synthesis...</span>
        </div>
      )}

      {/* Error/stuck state */}
      {(isStuck || (allDone && hasFailedAgents && progress?.synthesis_status === 'failed')) && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-red-500" style={{ fontSize: '18px' }}>warning</span>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              {!progress ? 'Council evaluation stuck (no progress data)' : 'Some agents failed'}
            </p>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400 mb-3">
            Click retry to re-run the council evaluation.
          </p>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all"
          >
            {retrying ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Retrying...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>Retry Council</span>
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}

// -- Step: council_review -- Show verdict, approve/reject
function CouncilReviewView({
  project,
  onProjectUpdate,
  onStatusRefresh,
  readOnly = false,
}: {
  project: Project;
  onProjectUpdate: (p: Project) => void;
  onStatusRefresh: () => void;
  readOnly?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);

  const verdict = project.artifacts?.council_verdict as any;

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.reviewPhase(project.id, 'approve');
      if (result.project) onProjectUpdate(result.project);
      onStatusRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!feedback.trim()) {
      setError('Provide feedback to refine the concept.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.reviewPhase(project.id, 'reject', feedback.trim());
      if (result.project) onProjectUpdate(result.project);
      onStatusRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!verdict) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getScoreBadge = (score: number) => {
    if (score >= 8) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (score >= 6) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case 'approve': return { icon: 'check_circle', color: 'text-emerald-500' };
      case 'reject': return { icon: 'cancel', color: 'text-red-500' };
      default: return { icon: 'help', color: 'text-amber-500' };
    }
  };

  const rec = getRecommendationIcon(verdict.recommendation);

  return (
    <div className="space-y-4">
      {/* Overall Verdict */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-purple-500">gavel</span>
            Council Verdict
          </h4>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold px-3 py-1 rounded-lg ${getScoreBadge(verdict.overall_score)}`}>
              {verdict.overall_score}/10
            </span>
            <span className={`material-symbols-outlined ${rec.color}`}>{rec.icon}</span>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">{verdict.synthesized_reasoning}</p>
      </div>

      {/* Individual Agent Evaluations */}
      {verdict.evaluations && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Agent Evaluations</h4>
          {verdict.evaluations.map((evaluation: any, idx: number) => (
            <details key={idx} className="bg-white dark:bg-[#1e2936] border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{evaluation.agent_name}</span>
                </div>
                <span className={`text-sm font-bold px-2 py-0.5 rounded ${getScoreBadge(evaluation.score)}`}>
                  {evaluation.score}/10
                </span>
              </summary>
              <div className="p-3 pt-0 border-t border-slate-100 dark:border-slate-700 space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-300">{evaluation.reasoning}</p>
                {evaluation.concerns && evaluation.concerns.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Concerns:</p>
                    <ul className="space-y-1">
                      {evaluation.concerns.map((concern: string, i: number) => (
                        <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                          <span className="text-amber-500 mt-0.5">-</span>
                          {concern}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}

      {/* Next Steps */}
      {verdict.next_steps && verdict.next_steps.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">Recommended Next Steps</h4>
          <ul className="space-y-1">
            {verdict.next_steps.map((step: string, i: number) => (
              <li key={i} className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!readOnly && error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Approve/Reject (hidden in readOnly mode) */}
      {!readOnly && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Feedback (required to send back for refinement)..."
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
            rows={2}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              {loading ? 'Processing...' : 'Approve & Generate PRD'}
            </button>
            <button
              onClick={handleReject}
              disabled={loading || !feedback.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">edit_note</span>
              Back to Refinement
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// -- Step: prd_generation -- Spinner while PRD is generated
function PRDGeneratingView() {
  return (
    <div className="flex flex-col items-center py-8 gap-4">
      <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-lg font-semibold text-slate-900 dark:text-white">Generating PRD</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
        Creating a Product Requirements Document from your refined concept and council insights...
      </p>
    </div>
  );
}

// -- Step: prd_review -- User reviews generated PRD
function PRDReviewView({
  project,
  onProjectUpdate,
  onStatusRefresh,
}: {
  project: Project;
  onProjectUpdate: (p: Project) => void;
  onStatusRefresh: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);

  const prd = project.artifacts?.prd as PRDDocument | undefined;

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.reviewPhase(project.id, 'approve');
      if (result.project) onProjectUpdate(result.project);
      onStatusRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!feedback.trim()) {
      setError('Provide feedback for PRD changes.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.reviewPhase(project.id, 'reject', feedback.trim());
      if (result.project) onProjectUpdate(result.project);
      onStatusRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!prd) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PRDArtifactView prd={prd} />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Feedback for PRD changes (required for rejection)..."
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
          rows={2}
        />
        <div className="flex items-center gap-3">
          <button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            {loading ? 'Processing...' : 'Approve PRD & Continue'}
          </button>
          <button
            onClick={handleReject}
            disabled={loading || !feedback.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">edit_note</span>
            Request Changes
          </button>
        </div>
      </div>
    </div>
  );
}
