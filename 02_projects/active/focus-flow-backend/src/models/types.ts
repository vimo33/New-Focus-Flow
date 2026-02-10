// Type definitions for Focus Flow OS

// ============================================================================
// Thread / Conversation Types
// ============================================================================

export interface Thread {
  id: string;
  title: string;
  project_id?: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_preview?: string;
}

export interface ThreadMessage {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  source: 'voice' | 'text';
  created_at: string;
}

export interface InboxItem {
  id: string;
  text: string;
  category?: 'work' | 'personal' | 'ideas';
  prefix?: string;
  source: 'telegram' | 'pwa' | 'voice' | 'api';
  created_at: string;
  processed_at?: string;
  metadata?: Record<string, any>;
  ai_classification?: AIClassification;
  auto_routed?: boolean;
  routed_to?: {
    entity_type: SmartClassificationType;
    entity_id: string;
    vault_path: string;
  };
}

export type SmartClassificationType = 'task' | 'idea' | 'note' | 'health_log' | 'event';

export interface AIClassification {
  category: 'work' | 'personal' | 'ideas';
  confidence: number;
  suggested_action: 'task' | 'project' | 'idea' | 'note';
  suggested_project?: string;
  reasoning: string;
  smart_type?: SmartClassificationType;
  smart_confidence?: number;
  auto_routable?: boolean;
}

export interface AgentEvaluation {
  agent_name: string;
  score: number;
  reasoning: string;
  concerns: string[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: 'work' | 'personal' | 'scheduled';
  status: 'todo' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
  project_id?: string;
  created_at: string;
  completed_at?: string;
  metadata?: Record<string, any>;
}

export type ProjectPhase = 'idea' | 'spec' | 'design' | 'dev' | 'deploy' | 'gtm' | 'sales' | 'crm';

export interface Project {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'paused' | 'completed';
  phase?: ProjectPhase;
  idea_id?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  tasks?: Task[];
  progress?: number;
  metadata?: Record<string, any>;
}

export type IdeaStatus =
  | 'inbox'
  | 'draft'
  | 'expanded'
  | 'validating'
  | 'validated'
  | 'rejected'
  | 'spec_ready'
  | 'in_development'
  | 'deployed'
  | 'gtm'
  | 'live';

export interface ExpandedIdea {
  problem_statement: string;
  proposed_solution: string;
  target_users: string;
  value_proposition: string;
  key_features: string[];
  risks: string[];
  success_metrics: string[];
  competitive_landscape?: string;
  estimated_effort?: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  status: IdeaStatus;
  created_at: string;
  expanded_at?: string;
  validated_at?: string;
  expanded?: ExpandedIdea;
  council_verdict?: CouncilVerdict;
  prd?: PRDDocument;
  project_id?: string;
  metadata?: Record<string, any>;
}

export interface CouncilVerdict {
  recommendation: 'approve' | 'reject' | 'needs-info';
  overall_score: number;
  evaluations: AgentEvaluation[];
  synthesized_reasoning: string;
  next_steps?: string[];
  council_composition?: string[];
  prd_generated?: boolean;
}

export interface HealthMetric {
  id: string;
  metric_type: 'sleep' | 'exercise' | 'mood' | 'energy' | 'focus' | 'stress';
  value: number | string;
  unit?: string;
  date: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface CaptureRequest {
  text: string;
  prefix?: string;
  source?: 'telegram' | 'pwa' | 'voice' | 'api';
  metadata?: Record<string, any>;
  auto_process?: boolean;
}

export interface AutoRouteResult {
  routed: boolean;
  entity_type?: SmartClassificationType;
  entity_id?: string;
  vault_path?: string;
  confidence?: number;
  reason?: string;
}

export interface ProcessInboxRequest {
  action: 'task' | 'project' | 'idea' | 'archive' | 'delete';
  task_data?: Partial<Task>;
  project_data?: Partial<Project>;
  idea_data?: Partial<Idea>;
}

export interface InboxCounts {
  all: number;
  work: number;
  personal: number;
  ideas: number;
}

export interface DashboardSummary {
  inbox_counts: InboxCounts;
  active_projects_count: number;
  tasks_today: number;
  recent_activity: Array<{
    type: 'inbox' | 'task' | 'project' | 'idea';
    text: string;
    timestamp: string;
  }>;
}

// ============================================================================
// Orchestrator Types - PRD to Code Pipeline
// ============================================================================

export type OrchestratorState =
  | 'intake'
  | 'spec_generation'
  | 'design_parsing'
  | 'code_generation'
  | 'validation'
  | 'deployment'
  | 'complete'
  | 'failed';

export interface OrchestratorRun {
  id: string;
  idea_id: string;
  state: OrchestratorState;
  created_at: string;
  updated_at: string;
  metadata: {
    prd_title: string;
    estimated_complexity?: 'simple' | 'moderate' | 'complex';
  };
  outputs: {
    specs?: Specification[];
    designs?: ParsedDesign[];
    code?: GeneratedCode;
    validation?: ValidationResult;
    deployment?: DeploymentResult;
  };
  error?: {
    message: string;
    stack: string;
    state_when_failed: string;
  };
}

export interface PRDDocument {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  user_stories?: string[];
  constraints?: string[];
  success_metrics?: string[];
}

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  purpose: string;
}

export interface Specification {
  feature_name: string;
  description: string;
  frontend: {
    components: string[];
    routes: string[];
    state: string[];
  };
  backend: {
    endpoints: APIEndpoint[];
    models: string[];
  };
  acceptance_criteria: string[];
  dependencies: string[];
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface LayoutSection {
  name: string;
  width: string;
  position?: 'left' | 'right' | 'center';
}

export interface Layout {
  type: 'single-column' | 'two-column' | 'grid' | 'sidebar' | 'custom';
  sections: LayoutSection[];
  responsive: {
    mobile: boolean;
    tablet: boolean;
    desktop: boolean;
  };
}

export interface FormField {
  name: string;
  type: string;
  label: string;
  required?: boolean;
}

export interface Component {
  type: 'button' | 'form' | 'list' | 'card' | 'modal' | 'table' | 'chart' | 'custom';
  classes?: string;
  text?: string;
  fields?: FormField[];
  items?: string[];
  onClick?: string;
  action?: string;
  [key: string]: any;
}

export interface StyleGuide {
  colors: Record<string, string>;
  spacing: Record<string, string>;
  typography: {
    font: string;
    sizes: Record<string, string>;
  };
  theme: 'light' | 'dark';
}

export interface ParsedDesign {
  feature_name: string;
  source: string;
  html_path?: string;
  png_path?: string;
  layout: Layout;
  components: Component[];
  styles: StyleGuide;
}

export interface FrontendCode {
  component_name: string;
  file_path: string;
  code: string;
  types: string;
  route: string;
}

export interface BackendCode {
  route_file: string;
  file_path: string;
  code: string;
  models: string;
}

export interface TestCode {
  test_file: string;
  file_path: string;
  code: string;
}

export interface GeneratedCode {
  frontend: FrontendCode[];
  backend: BackendCode[];
  tests: TestCode[];
}

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export interface DeploymentResult {
  frontend_files: string[];
  backend_files: string[];
  git_commit: string | null;
}

// ============================================================================
// Voice Command Types
// ============================================================================

export type VoiceIntentType = 'navigation' | 'create' | 'query' | 'update' | 'delete' | 'conversation';

export type VoiceActionType =
  | 'navigate_inbox'
  | 'navigate_projects'
  | 'navigate_calendar'
  | 'navigate_tasks'
  | 'navigate_ideas'
  | 'navigate_voice'
  | 'navigate_wellbeing'
  | 'create_task'
  | 'create_project'
  | 'create_idea'
  | 'capture_quick'
  | 'query_inbox_count'
  | 'query_agenda'
  | 'query_projects'
  | 'query_tasks'
  | 'update_task_status'
  | 'delete_item'
  | 'conversation';

export interface VoiceCommandIntent {
  type: VoiceIntentType;
  confidence: number;
  action: VoiceActionType;
  parameters: Record<string, any>;
  requires_confirmation: boolean;
  suggested_response?: string;
}

export interface VoiceCommandRequest {
  command: string;
  context?: {
    current_route?: string;
    recent_items?: string[];
  };
}
