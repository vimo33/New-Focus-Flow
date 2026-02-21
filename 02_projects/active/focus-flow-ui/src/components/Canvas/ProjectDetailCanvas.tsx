import { useEffect, useState } from 'react';
import { useCanvasStore } from '../../stores/canvas';
import { useConversationStore } from '../../stores/conversation';
import { api } from '../../services/api';
import { FileText, AlertTriangle } from 'lucide-react';
import { GlassCard, Badge, PipelineNode, ConfidenceRing, SignalStrengthBadge, EnjoymentWidget } from '../shared';
import { useValidationStore } from '../../stores/validation';
import type { Task, Project, ActivityEntry } from '../../services/api';

const PHASES = ['concept', 'spec', 'design', 'dev', 'test', 'deploy', 'live'] as const;
const PHASE_LABELS: Record<string, string> = {
  concept: 'Concept',
  spec: 'Spec',
  design: 'Design',
  dev: 'Dev',
  test: 'Test',
  deploy: 'Deploy',
  live: 'Live',
};

const PLAYBOOK_BADGES: Record<string, { label: string; variant: 'active' | 'playbook' | 'council' | 'completed' | 'paused' }> = {
  'software-build': { label: 'SOFTWARE BUILD', variant: 'active' },
  'client-engagement': { label: 'CLIENT ENGAGEMENT', variant: 'playbook' },
  'content-course': { label: 'CONTENT', variant: 'council' },
  'studio-project': { label: 'STUDIO', variant: 'completed' },
  'exploratory-idea': { label: 'EXPLORE', variant: 'paused' },
};

interface Collaborator {
  id: string;
  project_id: string;
  name: string;
  role: string;
  email?: string;
  company?: string;
  added_at: string;
}

export default function ProjectDetailCanvas() {
  const { canvasParams, goBack, setCanvas } = useCanvasStore();
  const projectId = canvasParams.projectId;

  const [project, setProject] = useState<(Project & { tasks: Task[]; progress: number }) | null>(null);
  const [financials, setFinancials] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [memories, setMemories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingCollaborator, setAddingCollaborator] = useState(false);
  const [newCollabName, setNewCollabName] = useState('');
  const [newCollabRole, setNewCollabRole] = useState('');
  const [projectReports, setProjectReports] = useState<any[]>([]);
  const [networkLeverage, setNetworkLeverage] = useState<{
    score: number;
    warm_paths: number;
    potential_customers: number;
    advisors: number;
    summary: string;
  } | null>(null);
  const [networkXref] = useState<Array<{
    contact: any;
    relevance_score: number;
    value_types: string[];
    reasoning: string;
  }>>([]);
  const { scores, fetchScore, fetchEnjoyment } = useValidationStore();

  // Set project context for Nitara when viewing this project
  useEffect(() => {
    if (projectId) {
      // We'll set the name once project data loads
      useConversationStore.getState().setProjectContext(projectId);
    }
    return () => {
      useConversationStore.getState().setProjectContext(null);
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    Promise.all([
      api.getProject(projectId),
      api.getProjectFinancials(projectId).catch(() => null),
      api.getCollaborators(projectId).catch(() => ({ collaborators: [] })),
      api.getProjectActivity(projectId).catch(() => ({ entries: [] })),
      api.getProjectMemories(projectId, 5).catch(() => ({ memories: [] })),
      api.getReports(undefined, 50).catch(() => ({ reports: [] })),
    ])
      .then(([proj, fin, collab, act, mem, reports]) => {
        setProject(proj);
        setFinancials(fin);
        setCollaborators(collab?.collaborators || []);
        setActivity(act?.entries || []);
        setMemories(mem?.memories?.map((m: any) => m.memory) || []);
        // Filter reports for this project
        const projReports = (reports?.reports || []).filter((r: any) => r.project_id === projectId);
        setProjectReports(projReports);
        // Update conversation store with project name for context indicator
        if (proj?.title) {
          useConversationStore.getState().setProjectContext(projectId, proj.title);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Fetch validation data
    fetchScore(projectId);
    fetchEnjoyment(projectId);

    // Fetch network leverage (fast — reads persisted data, no AI call)
    api.getNetworkLeverage(projectId)
      .then(setNetworkLeverage)
      .catch(() => setNetworkLeverage(null));
  }, [projectId]);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !projectId) return;
    try {
      await api.createTask({
        title: newTaskTitle.trim(),
        category: 'work',
        project_id: projectId,
        priority: 'medium',
      });
      setNewTaskTitle('');
      const updated = await api.getProject(projectId);
      setProject(updated);
    } catch (e) {
      console.error('Failed to add task:', e);
    }
  };

  const handleToggleTask = async (task: Task) => {
    try {
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      await api.updateTask(task.id, {
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : undefined,
      });
      if (projectId) {
        const updated = await api.getProject(projectId);
        setProject(updated);
      }
    } catch (e) {
      console.error('Failed to toggle task:', e);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.deleteTask(taskId);
      if (projectId) {
        const updated = await api.getProject(projectId);
        setProject(updated);
      }
    } catch (e) {
      console.error('Failed to delete task:', e);
    }
  };

  const handleAddCollaborator = async () => {
    if (!newCollabName.trim() || !projectId) return;
    try {
      await api.addCollaborator(projectId, { name: newCollabName.trim(), role: newCollabRole.trim() || 'Collaborator' });
      setNewCollabName('');
      setNewCollabRole('');
      setAddingCollaborator(false);
      const updated = await api.getCollaborators(projectId);
      setCollaborators(updated.collaborators || []);
    } catch (e) {
      console.error('Failed to add collaborator:', e);
    }
  };

  const handleRemoveCollaborator = async (collabId: string) => {
    if (!projectId) return;
    try {
      await api.removeCollaborator(projectId, collabId);
      const updated = await api.getCollaborators(projectId);
      setCollaborators(updated.collaborators || []);
    } catch (e) {
      console.error('Failed to remove collaborator:', e);
    }
  };

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-tertiary">No project selected.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-tertiary">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-tertiary">Project not found.</div>
      </div>
    );
  }

  const currentPhase = project.pipeline?.current_phase || project.phase || 'concept';
  const currentPhaseIdx = PHASES.indexOf(currentPhase as typeof PHASES[number]);
  const badge = project.metadata?.playbook_type ? PLAYBOOK_BADGES[project.metadata.playbook_type] :
    (project as any).playbook_type ? PLAYBOOK_BADGES[(project as any).playbook_type] : null;

  const activeRevenue = financials?.revenue?.filter((r: any) => r.active) || [];
  const activeCosts = financials?.costs?.filter((c: any) => c.active) || [];
  const totalRevenue = activeRevenue.reduce((sum: number, r: any) => sum + r.amount_monthly, 0);
  const totalCosts = activeCosts.reduce((sum: number, c: any) => sum + c.amount_monthly, 0);
  const margin = totalRevenue - totalCosts;
  const marginPercent = totalRevenue > 0 ? Math.round((margin / totalRevenue) * 100) : 0;

  // Lead partner: first collaborator or owner
  const leadPartner = collaborators[0];
  const clientCollab = collaborators.find(c => c.company);

  // Phase sub-states for current phase
  const phaseState = project.pipeline?.phases?.[currentPhase as keyof typeof project.pipeline.phases];
  const subStates = phaseState?.sub_state ? [phaseState.sub_state] : [];

  // Separate tasks by status
  const allTasks = project.tasks || [];
  const activeTasks = allTasks.filter(t => t.status !== 'done');
  const doneTasks = allTasks.filter(t => t.status === 'done');
  const highPriorityTasks = activeTasks.filter(t => t.priority === 'high');

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={goBack}
          className="text-text-tertiary hover:text-text-primary text-sm mb-3 flex items-center gap-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex items-start justify-between">
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-2">
              {badge && (
                <span className={`px-2 py-0.5 rounded text-[10px] tracking-wider font-semibold uppercase border ${
                  badge.variant === 'playbook' ? 'border-primary/40 text-primary' :
                  badge.variant === 'active' ? 'border-success/40 text-success' :
                  'border-text-tertiary/40 text-text-tertiary'
                }`}>
                  {badge.label}
                </span>
              )}
              <span className="text-text-tertiary text-xs">/</span>
              {clientCollab?.company && (
                <>
                  <span className="text-text-secondary text-xs">{clientCollab.company}</span>
                  <span className="text-text-tertiary text-xs">/</span>
                </>
              )}
              <span className={`text-xs flex items-center gap-1.5 ${
                project.status === 'active' ? 'text-success' : project.status === 'paused' ? 'text-secondary' : 'text-primary'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {project.status.toUpperCase()}
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-bold text-text-primary tracking-tight uppercase" style={{ fontFamily: 'var(--font-body)' }}>
              {project.title}
            </h1>
            {project.description && (
              <p className="text-text-secondary text-sm mt-2 max-w-2xl">{project.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3">
              {scores.get(project.id) && (
                <SignalStrengthBadge score={scores.get(project.id)!} />
              )}
              <EnjoymentWidget projectId={project.id} />
            </div>
          </div>

          {/* Lead Partner (top right) */}
          {leadPartner && (
            <div className="text-right flex-shrink-0 ml-4">
              <p className="text-[10px] tracking-wider text-text-tertiary uppercase">LEAD PARTNER</p>
              <div className="flex items-center gap-2 mt-1 justify-end">
                <span className="text-text-primary font-semibold">{leadPartner.name.split(' ')[0]}</span>
                <div className="w-8 h-8 rounded-full bg-elevated flex items-center justify-center text-text-secondary text-xs font-medium">
                  {leadPartner.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Visualization */}
      <div className="mb-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {PHASES.map((phase, i) => {
            let status: 'completed' | 'active' | 'upcoming' | 'blocked' = 'upcoming';
            if (i < currentPhaseIdx) status = 'completed';
            else if (i === currentPhaseIdx) status = 'active';

            const pState = project.pipeline?.phases?.[phase];
            if (pState?.sub_state === 'rejected') status = 'blocked';

            return (
              <div key={phase} className="flex items-center">
                <div className="flex flex-col items-center">
                  <PipelineNode status={status} label={PHASE_LABELS[phase]} size="full" />
                  {/* Sub-phase indicators for active phase */}
                  {i === currentPhaseIdx && subStates.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      {['draft', 'review', 'send'].map((sub) => (
                        <div key={sub} className="flex items-center gap-0.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            sub === phaseState?.sub_state ? 'bg-primary' : 'bg-text-tertiary/30'
                          }`} />
                          <span className={`text-[8px] tracking-wider uppercase ${
                            sub === phaseState?.sub_state ? 'text-primary' : 'text-text-tertiary/50'
                          }`}>{sub}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {i < PHASES.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${
                    i < currentPhaseIdx ? 'bg-primary/40' : 'bg-text-tertiary/20'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Current Deliverables */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold tracking-wider text-text-primary uppercase">Current Deliverables</h3>
              {phaseState && (
                <Badge
                  label={`PHASE ${currentPhaseIdx + 1}: ${PHASE_LABELS[currentPhase]?.toUpperCase() || currentPhase.toUpperCase()}`}
                  variant="completed"
                />
              )}
            </div>

            <div className="space-y-3">
              {/* Show pipeline artifacts or phase info as deliverables */}
              {phaseState?.feedback && (
                <div className="flex items-center gap-3 py-3 px-3 bg-elevated/40 rounded-lg">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium">Phase Feedback</p>
                    <p className="text-text-tertiary text-xs">{phaseState.feedback}</p>
                  </div>
                  {phaseState.sub_state === 'approved' && (
                    <svg className="w-5 h-5 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
              )}

              {/* Show completed tasks as deliverables */}
              {doneTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-3 px-3 bg-elevated/40 rounded-lg">
                  <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium">{task.title}</p>
                    <p className="text-text-tertiary text-xs">COMPLETED</p>
                  </div>
                  <svg className="w-5 h-5 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              ))}

              {/* Show active tasks as in-progress deliverables */}
              {activeTasks.slice(0, 2).map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-3 px-3 bg-elevated/40 rounded-lg">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium">{task.title}</p>
                    <p className="text-primary text-xs">IN PROGRESS</p>
                  </div>
                </div>
              ))}

              {allTasks.length === 0 && !phaseState?.feedback && (
                <p className="text-text-tertiary text-sm">No deliverables yet for this phase.</p>
              )}
            </div>
          </GlassCard>

          {/* Tasks Card */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold tracking-wider text-text-primary uppercase">Tasks</h3>
              <span className="text-text-tertiary text-xs">
                VIEW ALL &rarr;
              </span>
            </div>

            <div className="space-y-1 mb-4">
              {/* Active tasks */}
              {activeTasks.map((task) => (
                <div key={task.id} className={`flex items-center gap-3 py-2 group ${
                  task.priority === 'high' ? 'px-2 -mx-2 bg-secondary/5 rounded-lg border border-secondary/15' : ''
                }`}>
                  <button
                    onClick={() => handleToggleTask(task)}
                    className="w-5 h-5 rounded border-2 border-text-tertiary/40 hover:border-primary flex items-center justify-center flex-shrink-0 transition-colors"
                  />
                  <span className="flex-1 text-sm text-text-primary">{task.title}</span>
                  {task.priority && (
                    <Badge
                      label={task.priority === 'high' ? 'URGENT' : task.priority.toUpperCase()}
                      variant={task.priority === 'high' ? 'blocked' : task.priority === 'medium' ? 'active' : 'paused'}
                    />
                  )}
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger text-xs transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              {/* Done tasks */}
              {doneTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-2 group opacity-60">
                  <button
                    onClick={() => handleToggleTask(task)}
                    className="w-5 h-5 rounded border-2 bg-primary/20 border-primary text-primary flex items-center justify-center flex-shrink-0 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <span className="flex-1 text-sm text-text-tertiary line-through">{task.title}</span>
                  {task.priority && <Badge label="DONE" variant="completed" />}
                </div>
              ))}

              {/* High priority tasks - amber highlighted */}
              {highPriorityTasks.length > 0 && activeTasks.filter(t => t.priority !== 'high').length > 0 && (
                <div className="h-px bg-secondary/20 my-1" />
              )}
              {/* Note: high-priority tasks already appear above with URGENT badge */}
            </div>

            {/* Add Task */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Add a task..."
                className="flex-1 bg-elevated border border-[var(--glass-border)] rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-primary/50"
              />
              <button
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-base hover:bg-primary/80 transition-colors disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Financials with Margin */}
          <GlassCard>
            <h3 className="text-xs font-semibold tracking-wider text-text-primary uppercase mb-4">Financials</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-sm">Quote Value</span>
                <span className="font-mono text-text-primary font-bold">CHF {totalRevenue.toLocaleString('en-US')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-sm">Estimated Costs</span>
                <span className="font-mono text-text-primary font-bold">CHF {totalCosts.toLocaleString('en-US')}</span>
              </div>
              <div className="h-px bg-[var(--glass-border)]" />
              <div className="flex items-center justify-between">
                <span className="text-primary text-sm font-semibold uppercase">Margin</span>
                <div className="text-right">
                  <span className={`font-mono text-lg font-bold ${margin >= 0 ? 'text-success' : 'text-danger'}`}>
                    CHF {margin.toLocaleString('en-US')}
                  </span>
                  {totalRevenue > 0 && (
                    <span className="text-text-tertiary text-xs ml-2">{marginPercent}% Projected</span>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Network Leverage */}
          {(networkLeverage || networkXref.length > 0) && (
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold tracking-wider text-text-primary uppercase">Network Leverage</h3>
                {networkLeverage && (
                  <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    networkLeverage.score >= 7 ? 'bg-success/20 text-success' :
                    networkLeverage.score >= 4 ? 'bg-warning/20 text-warning' :
                    'bg-danger/20 text-danger'
                  }`}>
                    {networkLeverage.score}/10
                  </div>
                )}
              </div>

              {networkLeverage && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 bg-elevated/40 rounded-lg">
                    <div className="text-lg font-bold text-text-primary">{networkLeverage.potential_customers}</div>
                    <div className="text-[9px] text-text-tertiary uppercase tracking-wider">Customers</div>
                  </div>
                  <div className="text-center p-2 bg-elevated/40 rounded-lg">
                    <div className="text-lg font-bold text-text-primary">{networkLeverage.advisors}</div>
                    <div className="text-[9px] text-text-tertiary uppercase tracking-wider">Advisors</div>
                  </div>
                  <div className="text-center p-2 bg-elevated/40 rounded-lg">
                    <div className="text-lg font-bold text-text-primary">{networkLeverage.warm_paths}</div>
                    <div className="text-[9px] text-text-tertiary uppercase tracking-wider">Warm Paths</div>
                  </div>
                </div>
              )}

              {networkXref.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] tracking-wider text-primary uppercase">Top Relevant Contacts</p>
                  {networkXref.slice(0, 5).map((rc, i) => (
                    <div key={i} className="flex items-center gap-2 py-1.5 px-2 bg-elevated/30 rounded-lg">
                      <div className="w-7 h-7 rounded-full bg-elevated flex items-center justify-center text-text-secondary text-[10px] font-medium flex-shrink-0">
                        {rc.contact.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-xs font-medium truncate">{rc.contact.full_name}</p>
                        <p className="text-text-tertiary text-[10px] truncate">
                          {rc.value_types.join(', ')} — {rc.reasoning.substring(0, 80)}
                        </p>
                      </div>
                      <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        rc.relevance_score >= 8 ? 'bg-success/20 text-success' :
                        rc.relevance_score >= 6 ? 'bg-warning/20 text-warning' :
                        'bg-text-tertiary/20 text-text-tertiary'
                      }`}>
                        {rc.relevance_score}/10
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {networkLeverage && networkLeverage.score === 0 && networkXref.length === 0 && (
                <div className="flex items-center gap-2 text-text-tertiary text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>No network connections for this project</span>
                </div>
              )}
            </GlassCard>
          )}

          {/* Client Context */}
          {clientCollab && (
            <GlassCard>
              <h3 className="text-xs font-semibold tracking-wider text-text-primary uppercase mb-4">Client Context</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center text-text-secondary text-sm font-medium flex-shrink-0">
                  {clientCollab.company?.charAt(0).toUpperCase() || 'C'}
                </div>
                <div>
                  <p className="text-text-primary text-sm font-semibold">{clientCollab.company}</p>
                  <p className="text-text-tertiary text-xs">{clientCollab.role}</p>
                </div>
              </div>

              <p className="text-[10px] tracking-wider text-primary uppercase mb-1">POINT OF CONTACT</p>
              <div className="flex items-center justify-between">
                <p className="text-text-primary text-sm">{clientCollab.name} ({clientCollab.role})</p>
                {clientCollab.email && (
                  <a href={`mailto:${clientCollab.email}`} className="text-text-tertiary hover:text-primary transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </a>
                )}
              </div>

              {/* Nitara Note embedded in client context */}
              {memories.length > 0 && (
                <div className="mt-4 bg-secondary/10 border border-secondary/20 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-secondary text-xs">{'\u2726'}</span>
                    <span className="text-secondary text-[10px] font-semibold tracking-wider uppercase">NITARA NOTE</span>
                  </div>
                  <div className="text-text-secondary text-xs leading-relaxed space-y-1">
                    {memories.slice(0, 2).map((m, i) => (
                      <p key={i}>{m}</p>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          )}

          {/* Standalone Nitara Note when no client context */}
          {!clientCollab && memories.length > 0 && (
            <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-secondary text-sm">{'\u2726'}</span>
                <span className="text-secondary text-xs font-semibold tracking-wider uppercase">NITARA NOTE</span>
              </div>
              <div className="text-text-secondary text-sm space-y-1">
                {memories.map((m, i) => (
                  <p key={i}>{m}</p>
                ))}
              </div>
            </div>
          )}

          {/* AI Council Review */}
          {(project as any).artifacts?.council_verdict && (() => {
            const cv = (project as any).artifacts.council_verdict;
            const score = cv.overall_score || 0;
            const rec = cv.recommendation || 'needs-info';
            const evals = cv.evaluations || [];
            return (
              <div className="cursor-pointer" onClick={() => setCanvas('council_evaluation', { projectId: project.id, projectName: project.title })}>
              <GlassCard className="hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold tracking-wider text-text-primary uppercase">AI Council Review</h3>
                  <span className={`text-[10px] tracking-wider font-semibold px-2 py-0.5 rounded-full ${
                    rec === 'approve' ? 'bg-success/15 text-success' :
                    rec === 'needs-info' ? 'bg-secondary/15 text-secondary' :
                    'bg-danger/15 text-danger'
                  }`}>
                    {rec === 'approve' ? 'PROCEED' : rec === 'needs-info' ? 'NEEDS INFO' : 'RECONSIDER'}
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-3">
                  <ConfidenceRing score={score} size="sm" />
                  <div>
                    <p className="text-text-primary font-mono text-lg font-bold tabular-nums">{score.toFixed(1)}<span className="text-text-tertiary text-sm">/10</span></p>
                    <p className="text-text-tertiary text-xs">{evals.length} specialist{evals.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="space-y-1.5 mb-3">
                  {evals.slice(0, 3).map((ev: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-text-secondary text-xs truncate flex-1 mr-2">
                        {ev.agent_name || ev.evaluator_name || 'Agent'}
                      </span>
                      <span className={`font-mono text-xs font-semibold ${
                        ev.score >= 7 ? 'text-success' : ev.score >= 5 ? 'text-secondary' : 'text-danger'
                      }`}>
                        {ev.score?.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end">
                  <span className="text-primary text-xs font-medium">View Full Evaluation &rarr;</span>
                </div>
              </GlassCard>
              </div>
            );
          })()}

          {!(project as any).artifacts?.council_verdict && (
            <GlassCard>
              <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-3">AI Council Review</h3>
              <p className="text-text-tertiary text-sm mb-3">No council evaluation yet.</p>
              <button
                onClick={() => setCanvas('council_evaluation', { projectId: project.id, projectName: project.title })}
                className="w-full px-3 py-2 rounded-lg text-sm font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
              >
                Run Council Evaluation
              </button>
            </GlassCard>
          )}

          {/* Collaborators */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">Collaborators</h3>
              <button
                onClick={() => setAddingCollaborator(!addingCollaborator)}
                className="text-primary text-xs hover:text-primary/80 transition-colors"
              >
                {addingCollaborator ? 'Cancel' : '+ Add'}
              </button>
            </div>

            {addingCollaborator && (
              <div className="space-y-2 mb-3">
                <input
                  type="text"
                  value={newCollabName}
                  onChange={(e) => setNewCollabName(e.target.value)}
                  placeholder="Name"
                  className="w-full bg-elevated border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-primary/50"
                />
                <input
                  type="text"
                  value={newCollabRole}
                  onChange={(e) => setNewCollabRole(e.target.value)}
                  placeholder="Role"
                  className="w-full bg-elevated border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-primary/50"
                />
                <button
                  onClick={handleAddCollaborator}
                  disabled={!newCollabName.trim()}
                  className="w-full px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-base hover:bg-primary/80 transition-colors disabled:opacity-50"
                >
                  Add Collaborator
                </button>
              </div>
            )}

            {collaborators.length === 0 ? (
              <p className="text-text-tertiary text-xs">No collaborators yet.</p>
            ) : (
              <div className="space-y-2">
                {collaborators.map((collab) => (
                  <div key={collab.id} className="flex items-center gap-2 group">
                    <div className="w-7 h-7 rounded-full bg-elevated flex items-center justify-center text-text-secondary text-xs font-medium flex-shrink-0">
                      {collab.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm truncate">{collab.name}</p>
                      <p className="text-text-tertiary text-xs">{collab.role}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveCollaborator(collab.id)}
                      className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger text-xs transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* GTM & Marketing (visible when live) */}
          {currentPhase === 'live' && (
            <GlassCard>
              <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-3">GTM & Marketing</h3>
              <p className="text-text-secondary text-xs mb-3">
                Your project is live. Manage your go-to-market strategy.
              </p>
              <button
                onClick={() => setCanvas('marketing', { projectId: project.id })}
                className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-primary text-base hover:bg-primary/80 transition-colors"
              >
                Open Marketing
              </button>
            </GlassCard>
          )}

          {/* Reports */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">Reports</h3>
              <button
                onClick={() => setCanvas('reports')}
                className="text-primary text-xs hover:text-primary/80 transition-colors"
              >
                View All &rarr;
              </button>
            </div>
            {projectReports.length === 0 ? (
              <p className="text-text-tertiary text-xs">No reports for this project yet.</p>
            ) : (
              <div className="space-y-2">
                {projectReports.slice(0, 3).map((report: any) => (
                  <button
                    key={report.id}
                    onClick={() => setCanvas('reports')}
                    className="w-full flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-elevated/40 transition-colors text-left"
                  >
                    <FileText size={14} className="text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm truncate">{report.title}</p>
                      <p className="text-text-tertiary text-xs">
                        {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <Badge
                      label={report.type.replace(/-/g, ' ').toUpperCase()}
                      variant="playbook"
                    />
                  </button>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Activity Feed */}
          <GlassCard>
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Recent Activity</h3>
            {activity.length === 0 ? (
              <p className="text-text-tertiary text-xs">No activity recorded.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activity.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="flex gap-2 text-xs">
                    <span className="text-text-tertiary font-mono flex-shrink-0">
                      {new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-text-secondary">{entry.description}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
