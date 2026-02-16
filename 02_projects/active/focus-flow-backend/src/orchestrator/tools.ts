/**
 * OpenClaw Tool Definitions for the Orchestrator
 *
 * Format follows OpenAI's function calling API since OpenClaw uses
 * /v1/chat/completions (OpenAI-compatible endpoint).
 */

export interface OrchestratorTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

function tool(
  name: string,
  description: string,
  properties: Record<string, any>,
  required?: string[]
): OrchestratorTool {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters: { type: 'object', properties, required },
    },
  };
}

export const ORCHESTRATOR_TOOLS: OrchestratorTool[] = [
  // Capture & Inbox
  tool('capture_item', 'Quick-capture text to the Nitara inbox.', {
    text: { type: 'string', description: 'The text to capture' },
    source: { type: 'string', enum: ['voice', 'text', 'api'], description: 'Source' },
  }, ['text']),

  tool('list_inbox', 'List items in the inbox, optionally filtered by category.', {
    filter: { type: 'string', enum: ['work', 'personal', 'ideas'], description: 'Filter by category' },
    limit: { type: 'number', description: 'Max items to return (default 10)' },
  }),

  tool('process_inbox_item', 'Process an inbox item as task, project, idea, archive, or delete.', {
    id: { type: 'string', description: 'Inbox item ID' },
    action: { type: 'string', enum: ['task', 'project', 'idea', 'archive', 'delete'] },
    title: { type: 'string', description: 'Override title' },
  }, ['id', 'action']),

  // Tasks
  tool('create_task', 'Create a new task.', {
    title: { type: 'string', description: 'Task title' },
    category: { type: 'string', enum: ['work', 'personal', 'scheduled'] },
    priority: { type: 'string', enum: ['low', 'medium', 'high'] },
    due_date: { type: 'string', description: 'Due date ISO format' },
    project_id: { type: 'string', description: 'Associate with project' },
    description: { type: 'string', description: 'Detailed description' },
  }, ['title']),

  tool('list_tasks', 'List tasks, optionally filtered by category or status.', {
    category: { type: 'string', enum: ['work', 'personal', 'scheduled'] },
    status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
    limit: { type: 'number', description: 'Max items (default 10)' },
  }),

  tool('update_task', 'Update a task status, priority, or title.', {
    id: { type: 'string', description: 'Task ID' },
    status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
    priority: { type: 'string', enum: ['low', 'medium', 'high'] },
    title: { type: 'string' },
  }, ['id']),

  // Projects
  tool('create_project', 'Create a new project.', {
    title: { type: 'string', description: 'Project title' },
    description: { type: 'string', description: 'Project description' },
    phase: { type: 'string', enum: ['idea', 'spec', 'design', 'dev', 'deploy', 'gtm', 'sales', 'crm'] },
  }, ['title']),

  tool('list_projects', 'List projects, optionally filtered by status.', {
    status: { type: 'string', enum: ['active', 'paused', 'completed'] },
  }),

  tool('get_project', 'Get full project details including tasks and progress.', {
    id: { type: 'string', description: 'Project ID' },
  }, ['id']),

  tool('update_project', 'Update a project phase, status, or details.', {
    id: { type: 'string', description: 'Project ID' },
    phase: { type: 'string', enum: ['idea', 'spec', 'design', 'dev', 'deploy', 'gtm', 'sales', 'crm'] },
    status: { type: 'string', enum: ['active', 'paused', 'completed'] },
    title: { type: 'string' },
    description: { type: 'string' },
  }, ['id']),

  // Ideas
  tool('create_idea', 'Capture a new idea for later expansion and validation.', {
    title: { type: 'string', description: 'Idea title' },
    description: { type: 'string', description: 'Idea description' },
  }, ['title', 'description']),

  tool('list_ideas', 'List ideas, optionally filtered by status.', {
    status: { type: 'string', enum: ['inbox', 'validated', 'rejected'] },
  }),

  tool('get_idea', 'Get full idea details including expansion and council verdict.', {
    id: { type: 'string', description: 'Idea ID' },
  }, ['id']),

  tool('validate_idea', 'Run the AI Council to evaluate an idea. Returns scores and verdict.', {
    id: { type: 'string', description: 'Idea ID to validate' },
  }, ['id']),

  tool('promote_idea_to_project', 'Convert a validated idea into an active project.', {
    id: { type: 'string', description: 'Idea ID to promote' },
  }, ['id']),

  // Health
  tool('log_health', 'Log a health/wellbeing metric (sleep, exercise, mood, energy, focus, stress).', {
    metric_type: { type: 'string', enum: ['sleep', 'exercise', 'mood', 'energy', 'focus', 'stress'] },
    value: { type: 'number', description: 'Metric value' },
    notes: { type: 'string', description: 'Optional notes' },
  }, ['metric_type', 'value']),

  // Memory
  tool('search_memory', 'Search persistent long-term memory for relevant past context.', {
    query: { type: 'string', description: 'Search query' },
  }, ['query']),

  // CRM
  tool('create_contact', 'Create a new CRM contact.', {
    name: { type: 'string', description: 'Contact name' },
    email: { type: 'string', description: 'Email address' },
    company: { type: 'string', description: 'Company name' },
    phone: { type: 'string', description: 'Phone number' },
    tags: { type: 'string', description: 'Comma-separated tags' },
  }, ['name']),

  tool('list_contacts', 'List CRM contacts, optionally search.', {
    search: { type: 'string', description: 'Search query for name/email/company' },
  }),

  // Sales
  tool('create_deal', 'Create a new sales deal/lead.', {
    title: { type: 'string', description: 'Deal title' },
    stage: { type: 'string', enum: ['lead', 'qualified', 'demo', 'proposal', 'negotiation', 'closed_won', 'closed_lost'], description: 'Pipeline stage' },
    value: { type: 'number', description: 'Deal value' },
    contact_id: { type: 'string', description: 'Associated contact ID' },
    project_id: { type: 'string', description: 'Associated project ID' },
  }, ['title']),

  tool('list_deals', 'List sales deals, optionally by stage.', {
    stage: { type: 'string', enum: ['lead', 'qualified', 'demo', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] },
  }),

  tool('update_deal', 'Update a sales deal stage or details.', {
    id: { type: 'string', description: 'Deal ID' },
    stage: { type: 'string', enum: ['lead', 'qualified', 'demo', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] },
    value: { type: 'number', description: 'Updated deal value' },
  }, ['id']),

  tool('get_sales_pipeline', 'Get sales pipeline summary with counts and values per stage.', {}),

  // Dev Flow
  tool('scaffold_project', 'Scaffold a new project directory with CLAUDE.md, .beads/, and boilerplate.', {
    project_id: { type: 'string', description: 'Project ID to scaffold' },
  }, ['project_id']),

  tool('generate_specs', 'Generate technical specifications for a project from its requirements.', {
    project_id: { type: 'string', description: 'Project ID to generate specs for' },
  }, ['project_id']),

  // System
  tool('get_dashboard_summary', 'Get an overview: inbox counts, active projects, pending tasks.', {}),

  tool('navigate', 'Tell the frontend to navigate to a specific page.', {
    route: { type: 'string', enum: ['/', '/capture', '/inbox', '/projects', '/ideas', '/calendar', '/wellbeing', '/command', '/sales', '/crm'] },
  }, ['route']),
];
