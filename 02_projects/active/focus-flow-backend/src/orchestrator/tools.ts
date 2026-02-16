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

  // Financials
  tool('get_financials_summary', 'Get portfolio revenue, costs, runway, and financial goals.', {}),

  tool('get_income_strategies', 'Get income planning strategies and goal-gap analysis.', {}),

  // Intelligence & Reports
  tool('get_weekly_report', 'Generate or retrieve the weekly summary with KPIs and momentum.', {
    generate: { type: 'boolean', description: 'If true, generate a fresh report instead of returning the latest' },
  }),

  tool('get_morning_briefing', 'Generate or retrieve the daily morning briefing with priorities and opportunities.', {
    generate: { type: 'boolean', description: 'If true, generate a fresh briefing instead of returning the latest' },
  }),

  // Pipeline
  tool('start_pipeline', 'Start a project pipeline at the concept phase.', {
    project_id: { type: 'string', description: 'Project ID to start pipeline for' },
  }, ['project_id']),

  tool('get_pipeline_status', 'Check pipeline progress for a project.', {
    project_id: { type: 'string', description: 'Project ID to check pipeline for' },
  }, ['project_id']),

  // Network
  tool('get_network_contacts', 'Get professional network graph summary with clusters and distribution.', {}),

  tool('get_network_opportunities', 'Find networking opportunities based on contact analysis.', {}),

  // Content & GTM
  tool('draft_content', 'Draft marketing, blog, email, social, or proposal content.', {
    content_type: { type: 'string', enum: ['blog_post', 'documentation', 'proposal', 'marketing_copy', 'social_post', 'email'], description: 'Type of content' },
    brief: { type: 'string', description: 'Brief describing what to write' },
    project_id: { type: 'string', description: 'Associated project ID' },
    tone: { type: 'string', enum: ['professional', 'casual', 'technical', 'persuasive'], description: 'Desired tone' },
  }, ['content_type', 'brief']),

  tool('get_calendar_entries', 'Get upcoming content calendar entries for a project.', {
    project_id: { type: 'string', description: 'Project ID to get calendar for' },
  }, ['project_id']),

  // System
  tool('update_capabilities', 'Add or update a capability in the dynamic registry.', {
    domain: { type: 'string', description: 'Capability domain name' },
    tool_name: { type: 'string', description: 'Tool name to add/update' },
    description: { type: 'string', description: 'Tool description' },
    tier: { type: 'number', description: 'Trust tier (1, 2, or 3)' },
  }, ['domain', 'tool_name', 'description']),

  tool('get_dashboard_summary', 'Get an overview: inbox counts, active projects, pending tasks.', {}),

  tool('navigate', 'Tell the frontend to navigate to a specific page.', {
    route: { type: 'string', enum: ['/', '/capture', '/inbox', '/projects', '/ideas', '/calendar', '/wellbeing', '/command', '/sales', '/crm'] },
  }, ['route']),

  // Research & Search
  tool('web_search', 'Search the web for current information — market research, competitor analysis, industry trends, regulations, news, pricing data. Use this when you need real-time information.', {
    query: { type: 'string', description: 'Search query' },
    context: { type: 'string', description: 'Why you need this (helps refine results)' },
  }, ['query']),

  tool('deep_search', 'Search across ALL internal data — projects, ideas, contacts, deals, tasks, memories, threads, financials. Use this when you need to find specific information or cross-reference data across the platform.', {
    query: { type: 'string', description: 'What to search for' },
    scope: { type: 'string', enum: ['all', 'projects', 'ideas', 'contacts', 'deals', 'tasks', 'memories', 'threads', 'financials'], description: 'Which data domain to search (default: all)' },
  }, ['query']),

  // Strategic Directive
  tool('update_directive', "Update Nitara's active strategic directive — the current focus area and behavioral priorities. Use when the founder changes strategic focus.", {
    focus: { type: 'string', description: 'New primary focus area' },
    details: { type: 'string', description: 'Detailed directive text' },
  }, ['focus']),

  // Profiling
  tool('get_profiling_gaps', "Check what Nitara still doesn't know about the founder and their business. Returns the highest-priority unknown items grouped by domain. Use this to identify what to ask about next in conversation.", {
    domain: { type: 'string', enum: ['all', 'founder_identity', 'skills_expertise', 'financial_reality', 'portfolio_depth', 'network_intelligence', 'strategic_context', 'operational_reality'], description: 'Which domain to check gaps for (default: all)' },
  }),

  tool('update_profile_data', "Store new information learned about the founder during conversation. Updates the profiling checklist AND writes structured data to the appropriate vault location (founder profile, project financials, network contacts, etc.).", {
    domain: { type: 'string', enum: ['founder_identity', 'skills_expertise', 'financial_reality', 'portfolio_depth', 'network_intelligence', 'strategic_context', 'operational_reality'], description: 'Which knowledge domain this belongs to' },
    item_key: { type: 'string', description: 'The specific checklist item key being updated (e.g., monthly_expenses, vision_1yr)' },
    data: { type: 'object', description: 'Structured data to store. Shape depends on the domain and item.' },
    notes: { type: 'string', description: 'Human-readable summary of what was learned' },
    status: { type: 'string', enum: ['known', 'partial'], description: 'Whether this fully answers the item or is still partial' },
  }, ['domain', 'item_key', 'notes', 'status']),

  tool('get_profiling_summary', "Get a summary of how well Nitara knows the founder. Shows completeness by domain and overall. Use to report progress to the founder.", {}),
];
