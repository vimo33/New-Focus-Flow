import { useEffect, useState } from 'react';
import { useCanvasStore } from '../../stores/canvas';
import { api } from '../../services/api';
import { GlassCard, StatCard, Badge, PipelineNode, NitaraInsightCard } from '../shared';
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
  'software-build': { label: 'SOFTWARE', variant: 'active' },
  'client-engagement': { label: 'CLIENT', variant: 'playbook' },
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
  const { canvasParams, goBack } = useCanvasStore();
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

  useEffect(() => {
    if (!projectId) return;

    Promise.all([
      api.getProject(projectId),
      api.getProjectFinancials(projectId),
      api.getCollaborators(projectId),
      api.getProjectActivity(projectId),
      api.getProjectMemories(projectId, 5).catch(() => ({ memories: [] })),
    ])
      .then(([proj, fin, collab, act, mem]) => {
        setProject(proj);
        setFinancials(fin);
        setCollaborators(collab.collaborators || []);
        setActivity(act.entries || []);
        setMemories(mem.memories?.map((m: any) => m.memory) || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
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

  const statusColor = project.status === 'active' ? 'bg-success' :
    project.status === 'paused' ? 'bg-secondary' : 'bg-primary';

  const activeRevenue = financials?.revenue?.filter((r: any) => r.active) || [];
  const activeCosts = financials?.costs?.filter((c: any) => c.active) || [];
  const totalRevenue = activeRevenue.reduce((sum: number, r: any) => sum + r.amount_monthly, 0);
  const totalCosts = activeCosts.reduce((sum: number, c: any) => sum + c.amount_monthly, 0);

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
        <div className="flex items-center gap-3 flex-wrap">
          {badge && <Badge label={badge.label} variant={badge.variant} />}
          <h1 className="text-2xl lg:text-3xl font-bold text-text-primary tracking-tight" style={{ fontFamily: 'var(--font-body)' }}>
            {project.title}
          </h1>
          <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
          <span className="text-text-secondary text-sm capitalize">{currentPhase}</span>
        </div>
        {project.description && (
          <p className="text-text-secondary text-sm mt-2 max-w-2xl">{project.description}</p>
        )}
      </div>

      {/* Pipeline Visualization */}
      <div className="mb-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {PHASES.map((phase, i) => {
            let status: 'completed' | 'active' | 'upcoming' | 'blocked' = 'upcoming';
            if (i < currentPhaseIdx) status = 'completed';
            else if (i === currentPhaseIdx) status = 'active';

            const phaseState = project.pipeline?.phases?.[phase];
            if (phaseState?.sub_state === 'rejected') status = 'blocked';

            return (
              <div key={phase} className="flex items-center">
                <PipelineNode status={status} label={PHASE_LABELS[phase]} size="full" />
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

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column (span 2) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tasks Card */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">Tasks</h3>
              <Badge
                label={`${project.tasks?.filter(t => t.status === 'done').length || 0}/${project.tasks?.length || 0}`}
                variant="active"
              />
            </div>

            <div className="space-y-2 mb-4">
              {(project.tasks || []).map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-1.5 group">
                  <button
                    onClick={() => handleToggleTask(task)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      task.status === 'done'
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'border-text-tertiary/40 hover:border-primary'
                    }`}
                  >
                    {task.status === 'done' && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span className={`flex-1 text-sm ${task.status === 'done' ? 'text-text-tertiary line-through' : 'text-text-primary'}`}>
                    {task.title}
                  </span>
                  {task.priority && (
                    <Badge
                      label={task.priority.toUpperCase()}
                      variant={task.priority === 'high' ? 'blocked' : task.priority === 'medium' ? 'active' : 'paused'}
                    />
                  )}
                  {task.due_date && (
                    <span className="text-text-tertiary text-xs font-mono">{task.due_date.split('T')[0]}</span>
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

          {/* Deliverables Card */}
          {project.pipeline?.phases?.[currentPhase as keyof typeof project.pipeline.phases] && (
            <GlassCard>
              <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">
                Current Phase: {PHASE_LABELS[currentPhase]}
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-text-secondary">Sub-state:</span>
                  <Badge
                    label={(project.pipeline.phases[currentPhase as keyof typeof project.pipeline.phases]?.sub_state || 'idle').toUpperCase()}
                    variant={
                      project.pipeline.phases[currentPhase as keyof typeof project.pipeline.phases]?.sub_state === 'approved' ? 'completed' :
                      project.pipeline.phases[currentPhase as keyof typeof project.pipeline.phases]?.sub_state === 'rejected' ? 'blocked' :
                      project.pipeline.phases[currentPhase as keyof typeof project.pipeline.phases]?.sub_state === 'working' ? 'active' :
                      'paused'
                    }
                  />
                </div>
                {project.pipeline.phases[currentPhase as keyof typeof project.pipeline.phases]?.feedback && (
                  <p className="text-text-secondary text-sm">
                    Feedback: {project.pipeline.phases[currentPhase as keyof typeof project.pipeline.phases]?.feedback}
                  </p>
                )}
              </div>
            </GlassCard>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Financials */}
          <GlassCard>
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Financials</h3>
            <div className="space-y-3">
              <StatCard value={totalRevenue.toLocaleString('en-US')} label="Revenue" currency="CHF" />
              <StatCard value={totalCosts.toLocaleString('en-US')} label="Costs" currency="CHF" />
            </div>
          </GlassCard>

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

          {/* Nitara Insight */}
          {memories.length > 0 && (
            <NitaraInsightCard title="STRATEGIC NOTES">
              <ul className="space-y-1">
                {memories.map((m, i) => (
                  <li key={i} className="text-xs">{m}</li>
                ))}
              </ul>
            </NitaraInsightCard>
          )}

          {/* Activity Feed */}
          <GlassCard>
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Recent Activity</h3>
            {activity.length === 0 ? (
              <p className="text-text-tertiary text-xs">No activity recorded.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activity.slice(0, 15).map((entry) => (
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
