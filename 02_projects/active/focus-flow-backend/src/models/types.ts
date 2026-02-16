// Type definitions for Nitara

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

export interface AgentProgressEntry {
  agent_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  evaluation?: AgentEvaluation;
  error?: string;
}

export interface CouncilProgress {
  started_at: string;
  agents: AgentProgressEntry[];
  synthesis_status: 'pending' | 'running' | 'completed' | 'failed';
  completed_count: number;
  total_count: number;
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

export type ProjectPhase = 'concept' | 'spec' | 'design' | 'dev' | 'test' | 'deploy' | 'live';

export type PlaybookType = 'software-build' | 'client-engagement' | 'content-course' | 'studio-project' | 'exploratory-idea';

export type ConceptStep = 'refining' | 'council_selection' | 'council_running' | 'council_review' | 'prd_generation' | 'prd_review';

export interface CouncilMember {
  agent_name: string;
  role: string;
  focus: string;
  evaluation_criteria?: string[];
  system_prompt?: string;    // Override auto-generated system prompt
  max_tokens?: number;       // Override default 1500 token limit
}

// Pipeline HITL types
export type PhaseSubState = 'idle' | 'working' | 'review' | 'approved' | 'rejected';

export interface PhaseState {
  phase: ProjectPhase;
  sub_state: PhaseSubState;
  started_at?: string;
  completed_at?: string;
  feedback?: string;
  step?: string; // For multi-step phases (design: 'system'|'main_screens'|'all_screens')
}

export interface PipelineState {
  current_phase: ProjectPhase;
  phases: Partial<Record<ProjectPhase, PhaseState>>;
  run_id?: string;
  updated_at: string;
}

export interface DesignSystem {
  color_palette: { name: string; hex: string; usage: string }[];
  typography: { role: string; font: string; size: string; weight: string }[];
  spacing_scale: Record<string, string>;
  component_inventory: string[];
  brand_guidelines?: string;
}

export interface ProjectArtifacts {
  prd?: PRDDocument;
  refined_concept?: string;
  council_brief?: string;
  council_verdict?: CouncilVerdict;
  selected_council?: CouncilMember[];
  council_progress?: CouncilProgress;
  specs?: Specification[];
  design_system?: DesignSystem;
  designs?: ParsedDesign[];
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'paused' | 'completed';
  phase?: ProjectPhase;
  playbook_type?: PlaybookType;
  idea_id?: string;
  concept_thread_id?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  tasks?: Task[];
  progress?: number;
  pipeline?: PipelineState;
  artifacts?: ProjectArtifacts;
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
// Decision Log Types
// ============================================================================

export type DecisionType = 'council_response' | 'pipeline_gate' | 'strategic' | 'technical' | 'override';
export type DecisionOutcome = 'pending' | 'succeeded' | 'failed' | 'revised';
export type DecisionSource = 'user' | 'council' | 'agent';

export interface DecisionEntry {
  id: string;
  project_id: string;
  timestamp: string;
  decision_type: DecisionType;
  context: string;
  decision: string;
  reasoning: string;
  alternatives: string[];
  outcome: DecisionOutcome;
  source: DecisionSource;
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

// ============================================================================
// Phase 4: Generalized Council Types
// ============================================================================

export type CouncilDecisionType =
  | 'idea_validation' | 'architecture_review' | 'pricing'
  | 'go_to_market' | 'risk_assessment' | string;

export type VerdictLevel =
  | 'strong_proceed' | 'proceed_with_caution' | 'needs_more_info'
  | 'reconsider' | 'strong_reject';

export interface DimensionScore {
  dimension: string;
  score: number;
  weight: number;
  reasoning: string;
}

export interface RecommendedAction {
  action: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  can_auto_create_task: boolean;
  task_template?: {
    title: string;
    description: string;
    category: 'work' | 'personal' | 'scheduled';
    priority: 'low' | 'medium' | 'high';
  };
}

export interface EnhancedAgentEvaluation extends AgentEvaluation {
  dimension_scores: DimensionScore[];
  confidence: number;
  key_insight?: string;
}

export interface EnhancedCouncilVerdict {
  id: string;
  decision_type: CouncilDecisionType;
  verdict: VerdictLevel;
  confidence: number;
  overall_score: number;
  executive_summary: string;
  key_insight: string;
  dimension_scores: DimensionScore[];
  evaluations: EnhancedAgentEvaluation[];
  recommended_actions: RecommendedAction[];
  risks: string[];
  open_questions: string[];
  consensus_areas: string[];
  disagreement_areas: string[];
  synthesized_reasoning: string;
  council_composition: string[];
  created_at: string;
  project_id?: string;
  subject_title: string;
  subject_description: string;
  // Backward compat fields
  recommendation: 'approve' | 'reject' | 'needs-info';
  next_steps: string[];
}

export interface CouncilDecisionConfig {
  decision_type: CouncilDecisionType;
  display_name: string;
  description: string;
  default_agent_count: number;
  required_dimensions: string[];
  optional_dimensions: string[];
  dimension_weights: Record<string, number>;
  agent_selection_prompt: string;
  synthesis_prompt: string;
  verdict_thresholds: {
    strong_proceed: number;
    proceed_with_caution: number;
    needs_more_info: number;
    reconsider: number;
  };
  action_templates: RecommendedAction[];
}

export interface CouncilPanelProposal {
  decision_type: CouncilDecisionType;
  proposed_agents: CouncilMember[];
  reasoning: string;
  context_summary: string;
}

export interface PanelModification {
  action: 'add' | 'remove' | 'swap' | 'custom';
  agent_name?: string;
  new_agent?: CouncilMember;
  description?: string;
}

// ============================================================================
// Phase 5: Co-CEO Core Agent Types
// ============================================================================

export type AgentStatus = 'idle' | 'generating_briefing' | 'awaiting_approval'
  | 'executing' | 'paused' | 'end_of_day';

export type TrustTier = 1 | 2 | 3;

export type NotificationType =
  | 'daily_briefing' | 'work_plan' | 'progress_update' | 'stalled_pipeline'
  | 'approval_request' | 'verdict_delivered' | 'task_overdue'
  | 'implementation_complete' | 'test_results' | 'deploy_ready'
  | 'agent_status' | 'cost_alert' | 'end_of_day_summary';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface AgentAction {
  id: string;
  type: string;
  project_id?: string;
  description: string;
  parameters?: Record<string, any>;
}

export interface PendingApproval {
  id: string;
  tier: TrustTier;
  action: AgentAction;
  context: string;
  reasoning: string;
  created_at: string;
  expires_at?: string;
  status: 'pending' | 'approved' | 'rejected' | 'auto_executed' | 'cancelled';
  resolved_at?: string;
  feedback?: string;
}

export interface WorkPlanItem {
  id: string;
  project_id: string;
  action: string;
  description: string;
  trust_tier: TrustTier;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimated_cost?: string;
  auto_approved: boolean;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
}

export interface WorkPlan {
  id: string;
  date: string;
  items: WorkPlanItem[];
  approved: boolean;
  approved_at?: string;
  created_at: string;
}

export interface PortfolioOverview {
  total_projects: number;
  active_projects: { id: string; title: string; phase: string; sub_state: string; updated_at: string }[];
  overdue_tasks: Task[];
  pending_council_verdicts: any[];
  cross_project_context: string;
}

export interface Briefing {
  id: string;
  date: string;
  generated_at: string;
  portfolio_overview: PortfolioOverview;
  work_plan: WorkPlanItem[];
  stalled_items: { project_id: string; title: string; phase: string; stalled_since: string; reason: string }[];
  pending_approvals_summary: { id: string; action: string; tier: TrustTier; created_at: string }[];
  cost_estimate: { estimated_tokens: number; estimated_cost_usd: number };
  ai_summary: string;
}

export interface DailyStats {
  actions_executed: number;
  actions_approved: number;
  actions_rejected: number;
  briefings_generated: number;
  notifications_sent: number;
  ai_calls_made: number;
  estimated_cost_usd: number;
}

export interface CoreAgentState {
  status: AgentStatus;
  current_briefing_id: string | null;
  active_work_plan: WorkPlan | null;
  pending_approvals: PendingApproval[];
  delayed_executions: PendingApproval[];
  last_briefing_at: string | null;
  last_heartbeat_at: string | null;
  daily_stats: DailyStats;
  activityLog: AgentActivityEntry[];
  updated_at: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  data?: Record<string, any>;
  action_url?: string;
  requires_response?: boolean;
  approval_id?: string;
  created_at: string;
  read_at?: string;
  dismissed_at?: string;
}

export interface AgentActivityEntry {
  id: string;
  timestamp: string;
  type: 'action_executed' | 'action_approved' | 'action_rejected' | 'briefing_generated'
    | 'work_plan_approved' | 'message_sent' | 'state_change' | 'tool_executed' | 'auto_executed';
  description: string;
  action_type?: string;
  project_id?: string;
  tier?: TrustTier;
  result?: 'success' | 'failure';
  metadata?: Record<string, any>;
}

export interface AgentResponse {
  message: string;
  actions_taken?: string[];
  state: CoreAgentState;
}

// ============================================================================
// Phase 1: Founder Profile Types
// ============================================================================

export type ArchetypePreference = 'strategist' | 'cofounder' | 'critic';

export interface FounderSkill {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: string;
  added_at: string;
}

export interface FounderExperience {
  id: string;
  title: string;
  company?: string;
  description: string;
  start_date?: string;
  end_date?: string;
  tags: string[];
  added_at: string;
}

export interface FounderProfile {
  id: string;
  name: string;
  bio?: string;
  location?: string;
  timezone?: string;
  preferred_archetype: ArchetypePreference;
  skills: FounderSkill[];
  experience: FounderExperience[];
  active_work: string[];
  strategic_focus_tags: string[];
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Phase 1: Financials Types
// ============================================================================

export type RevenueType = 'recurring' | 'one_time' | 'retainer' | 'royalty' | 'equity';
export type CostCategory = 'tools' | 'hosting' | 'contractors' | 'marketing' | 'office' | 'insurance' | 'other';

export interface RevenueStream {
  id: string;
  project_id?: string;
  source: string;
  type: RevenueType;
  amount_monthly: number;
  currency: string;
  start_date?: string;
  end_date?: string;
  active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CostItem {
  id: string;
  name: string;
  category: CostCategory;
  amount_monthly: number;
  currency: string;
  active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialGoals {
  income_goal: number;
  safety_net_months: number;
  runway_months?: number;
  currency: string;
  updated_at: string;
}

export interface PortfolioFinancials {
  total_monthly_revenue: number;
  total_monthly_costs: number;
  net_monthly: number;
  currency: string;
  revenue_streams: RevenueStream[];
  cost_items: CostItem[];
  goals: FinancialGoals | null;
  runway_months: number | null;
}

export interface FinancialSnapshot {
  id: string;
  month: string;
  year: number;
  total_revenue: number;
  total_costs: number;
  net: number;
  currency: string;
  revenue_breakdown: { source: string; amount: number }[];
  cost_breakdown: { category: string; amount: number }[];
  created_at: string;
}

// ============================================================================
// Phase 1: Network Types
// ============================================================================

export type RelationshipType = 'colleague' | 'client' | 'investor' | 'mentor' | 'friend' | 'partner' | 'vendor' | 'other';
export type RelationshipStrength = 'strong' | 'moderate' | 'weak' | 'dormant';
export type BusinessValue = 'high' | 'medium' | 'low' | 'unknown';

export interface NetworkContact {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string;
  company?: string;
  position?: string;
  location?: string;
  linkedin_url?: string;
  relationship_type: RelationshipType;
  relationship_strength: RelationshipStrength;
  business_value: BusinessValue;
  tags: string[];
  notes?: string;
  last_contacted?: string;
  ai_summary?: string;
  ai_tags?: string[];
  imported_from?: string;
  created_at: string;
  updated_at: string;
}

export type ImportJobStatus = 'pending' | 'extracting' | 'enriching' | 'completed' | 'failed';

export interface ImportJob {
  id: string;
  source: 'linkedin';
  status: ImportJobStatus;
  total_contacts: number;
  processed_contacts: number;
  created_contacts: number;
  errors: string[];
  started_at: string;
  completed_at?: string;
}

// ============================================================================
// Phase 1: Network Graph Types
// ============================================================================

export interface IndustryCluster {
  industry: string;
  count: number;
  contacts: string[];
}

export interface GeographicDistribution {
  location: string;
  count: number;
  contacts: string[];
}

export interface NetworkGraphSummary {
  total_contacts: number;
  industry_clusters: IndustryCluster[];
  geographic_distribution: GeographicDistribution[];
  relationship_breakdown: Record<RelationshipType, number>;
  strength_breakdown: Record<RelationshipStrength, number>;
  avg_business_value: number;
}

export interface NetworkOpportunity {
  id: string;
  type: 'reconnect' | 'introduction' | 'collaboration' | 'business_development';
  title: string;
  description: string;
  contacts: string[];
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  created_at: string;
}
