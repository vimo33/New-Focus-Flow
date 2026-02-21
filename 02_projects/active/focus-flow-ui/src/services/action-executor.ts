import { api, type VoiceCommandIntent } from './api';

export interface ExecutionResult {
  success: boolean;
  message: string;
  speak?: boolean;
  data?: any;
}

export class ActionExecutor {
  private navigate: (path: string) => void;

  constructor(navigate: (path: string) => void) {
    this.navigate = navigate;
  }

  /**
   * Execute a classified voice command intent
   */
  async execute(intent: VoiceCommandIntent): Promise<ExecutionResult> {
    try {
      switch (intent.action) {
        // ==================== NAVIGATION ACTIONS ====================
        case 'navigate_inbox':
          this.navigate('/inbox');
          return { success: true, message: 'Opening inbox', speak: true };

        case 'navigate_projects':
          this.navigate('/projects');
          return { success: true, message: 'Opening projects', speak: true };

        case 'navigate_calendar':
          this.navigate('/calendar');
          return { success: true, message: 'Opening calendar', speak: true };

        case 'navigate_tasks':
          this.navigate('/tasks');
          return { success: true, message: 'Opening tasks', speak: true };

        case 'navigate_ideas':
          this.navigate('/ideas');
          return { success: true, message: 'Opening ideas', speak: true };

        case 'navigate_voice':
          this.navigate('/voice');
          return { success: true, message: 'Opening voice assistant', speak: true };

        case 'navigate_wellbeing':
          this.navigate('/wellbeing');
          return { success: true, message: 'Opening wellbeing', speak: true };

        // ==================== CREATE ACTIONS ====================
        case 'create_task':
          return await this.executeCreateTask(intent.parameters);

        case 'create_project':
          return await this.executeCreateProject(intent.parameters);

        case 'create_idea':
          return await this.executeCreateIdea(intent.parameters);

        case 'capture_quick':
          return await this.executeQuickCapture(intent.parameters);

        // ==================== QUERY ACTIONS ====================
        case 'query_inbox_count':
          return await this.executeQueryInboxCount();

        case 'query_agenda':
          return await this.executeQueryAgenda();

        case 'query_projects':
          return await this.executeQueryProjects(intent.parameters);

        case 'query_tasks':
          return await this.executeQueryTasks(intent.parameters);

        // ==================== UPDATE ACTIONS ====================
        case 'update_task_status':
          return await this.executeUpdateTaskStatus(intent.parameters);

        // ==================== DELETE ACTIONS ====================
        case 'delete_item':
          return await this.executeDeleteItem(intent.parameters);

        // ==================== APPROVAL ACTIONS ====================
        case 'approval_approve_latest':
          return await this.executeApprovalAction('approve');

        case 'approval_reject_latest':
          return await this.executeApprovalAction('reject');

        case 'approval_approve_tier1':
          return await this.executeApprovalTier1();

        case 'navigate_approvals':
          // Use canvas store directly (SPA navigation)
          return { success: true, message: 'Showing approvals', speak: true, data: { canvas: 'voice_console' } };

        // ==================== CONVERSATION ====================
        case 'conversation':
          return {
            success: true,
            message: 'Let me help you with that',
            speak: false,
            data: { fallback_to_thread: true }
          };

        default:
          return {
            success: false,
            message: `Unknown action: ${intent.action}`,
            speak: true
          };
      }
    } catch (error: any) {
      console.error('Action execution error:', error);
      return {
        success: false,
        message: `Failed to execute action: ${error.message}`,
        speak: true
      };
    }
  }

  // ==================== CREATE ACTION IMPLEMENTATIONS ====================

  private async executeCreateTask(params: Record<string, any>): Promise<ExecutionResult> {
    const { title, project_id, due_date, priority } = params;

    if (!title) {
      return {
        success: false,
        message: 'Task title is required',
        speak: true
      };
    }

    const task = await api.createTask({
      title,
      project_id,
      due_date,
      priority,
      category: 'work',
      status: 'todo'
    });

    return {
      success: true,
      message: `Created task: ${task.task.title}`,
      speak: true,
      data: task.task
    };
  }

  private async executeCreateProject(params: Record<string, any>): Promise<ExecutionResult> {
    const { title, description } = params;

    if (!title) {
      return {
        success: false,
        message: 'Project title is required',
        speak: true
      };
    }

    const project = await api.createProject({
      title,
      description,
      status: 'active'
    });

    return {
      success: true,
      message: `Created project: ${project.project.title}`,
      speak: true,
      data: project.project
    };
  }

  private async executeCreateIdea(params: Record<string, any>): Promise<ExecutionResult> {
    const { title, description } = params;

    if (!title) {
      return {
        success: false,
        message: 'Idea title is required',
        speak: true
      };
    }

    const idea = await api.createIdea({
      title,
      description,
      status: 'inbox'
    });

    return {
      success: true,
      message: `Created idea: ${idea.idea.title}`,
      speak: true,
      data: idea.idea
    };
  }

  private async executeQuickCapture(params: Record<string, any>): Promise<ExecutionResult> {
    const { text } = params;

    if (!text) {
      return {
        success: false,
        message: 'Capture text is required',
        speak: true
      };
    }

    const result = await api.capture({
      text,
      source: 'voice'
    });

    return {
      success: true,
      message: `Captured: ${text}`,
      speak: true,
      data: result.item
    };
  }

  // ==================== QUERY ACTION IMPLEMENTATIONS ====================

  private async executeQueryInboxCount(): Promise<ExecutionResult> {
    const counts = await api.getInboxCounts();
    const total = counts.all;

    const message = total === 0
      ? 'Your inbox is empty'
      : total === 1
      ? 'You have 1 item in your inbox'
      : `You have ${total} items in your inbox. ${counts.work} work, ${counts.personal} personal, and ${counts.ideas} ideas.`;

    return {
      success: true,
      message,
      speak: true,
      data: counts
    };
  }

  private async executeQueryAgenda(): Promise<ExecutionResult> {
    const summary = await api.getSummary();

    const message = `You have ${summary.active_projects_count} active projects and ${summary.tasks_today} tasks remaining today.`;

    return {
      success: true,
      message,
      speak: true,
      data: summary
    };
  }

  private async executeQueryProjects(params: Record<string, any>): Promise<ExecutionResult> {
    const { status } = params;
    const projects = await api.getProjects(status);

    const message = projects.count === 0
      ? 'You have no projects'
      : projects.count === 1
      ? `You have 1 project: ${projects.projects[0].title}`
      : `You have ${projects.count} projects`;

    // Navigate to projects page to show results
    this.navigate('/projects');

    return {
      success: true,
      message,
      speak: true,
      data: projects.projects
    };
  }

  private async executeQueryTasks(params: Record<string, any>): Promise<ExecutionResult> {
    const { category, status } = params;
    const tasks = await api.getTasks(category);

    const filteredTasks = status
      ? tasks.tasks.filter(t => t.status === status)
      : tasks.tasks;

    const message = filteredTasks.length === 0
      ? 'You have no tasks'
      : filteredTasks.length === 1
      ? `You have 1 task: ${filteredTasks[0].title}`
      : `You have ${filteredTasks.length} tasks`;

    return {
      success: true,
      message,
      speak: true,
      data: filteredTasks
    };
  }

  // ==================== UPDATE ACTION IMPLEMENTATIONS ====================

  private async executeUpdateTaskStatus(params: Record<string, any>): Promise<ExecutionResult> {
    const { task_title, status } = params;

    if (!task_title || !status) {
      return {
        success: false,
        message: 'Task title and status are required',
        speak: true
      };
    }

    // Find the task by title (fuzzy match)
    const allTasks = await api.getTasks();
    const task = allTasks.tasks.find(t =>
      t.title.toLowerCase().includes(task_title.toLowerCase())
    );

    if (!task) {
      return {
        success: false,
        message: `Could not find task: ${task_title}`,
        speak: true
      };
    }

    const updated = await api.updateTask(task.id, { status });

    const statusText = status === 'done' ? 'complete' : status === 'in_progress' ? 'in progress' : 'to do';
    return {
      success: true,
      message: `Marked "${task.title}" as ${statusText}`,
      speak: true,
      data: updated.task
    };
  }

  // ==================== APPROVAL ACTION IMPLEMENTATIONS ====================

  private async executeApprovalAction(decision: 'approve' | 'reject'): Promise<ExecutionResult> {
    try {
      const { approvals } = await api.getApprovals('pending');
      if (!approvals || approvals.length === 0) {
        return { success: true, message: 'No pending approvals', speak: true };
      }

      const latest = approvals[0];
      await api.decideApproval(latest.id, decision === 'approve' ? 'approved' : 'rejected');

      const verb = decision === 'approve' ? 'Approved' : 'Rejected';
      return {
        success: true,
        message: `${verb}: ${latest.actionSummary}`,
        speak: true,
        data: latest,
      };
    } catch (error: any) {
      return { success: false, message: `Failed to ${decision}: ${error.message}`, speak: true };
    }
  }

  private async executeApprovalTier1(): Promise<ExecutionResult> {
    try {
      const { approvals } = await api.getApprovals('pending');
      const tier1 = (approvals || []).filter((a: any) => a.riskTier === 'tier1');

      if (tier1.length === 0) {
        return { success: true, message: 'No tier 1 approvals pending', speak: true };
      }

      let approved = 0;
      for (const a of tier1) {
        await api.decideApproval(a.id, 'approved');
        approved++;
      }

      return {
        success: true,
        message: `Auto-approved ${approved} tier 1 action${approved > 1 ? 's' : ''}`,
        speak: true,
      };
    } catch (error: any) {
      return { success: false, message: `Failed to auto-approve: ${error.message}`, speak: true };
    }
  }

  // ==================== DELETE ACTION IMPLEMENTATIONS ====================

  private async executeDeleteItem(params: Record<string, any>): Promise<ExecutionResult> {
    const { item_type, title } = params;

    // Note: This is a placeholder - actual deletion would require finding the item first
    // For now, we just return a message indicating this requires confirmation
    return {
      success: false,
      message: `Deleting ${item_type} "${title}" requires confirmation. Please use the action panel to approve.`,
      speak: true,
      data: { item_type, title }
    };
  }
}
