// Type definitions for Focus Flow OS

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
}

export interface AIClassification {
  category: 'work' | 'personal' | 'ideas';
  confidence: number;
  suggested_action: 'task' | 'project' | 'idea' | 'note';
  suggested_project?: string;
  reasoning: string;
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

export interface Project {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
  completed_at?: string;
  tasks?: Task[];
  metadata?: Record<string, any>;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  status: 'inbox' | 'validated' | 'rejected';
  created_at: string;
  validated_at?: string;
  council_verdict?: CouncilVerdict;
  metadata?: Record<string, any>;
}

export interface CouncilVerdict {
  recommendation: 'approve' | 'reject' | 'needs-info';
  overall_score: number;
  evaluations: AgentEvaluation[];
  synthesized_reasoning: string;
  next_steps?: string[];
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
