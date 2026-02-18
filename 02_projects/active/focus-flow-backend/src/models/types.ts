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
  | 'agent_status' | 'cost_alert' | 'end_of_day_summary'
  | 'tool_completed';

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
  predicted_confidence?: number;
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
  financial_insights?: { top_opportunities: Opportunity[]; summary: string };
}

export interface DailyStats {
  actions_executed: number;
  actions_approved: number;
  actions_rejected: number;
  briefings_generated: number;
  notifications_sent: number;
  ai_calls_made: number;
  estimated_cost_usd: number;
  confidence_records_created: number;
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
  settings?: {
    reasoning_depth?: number;
    auto_drafting?: boolean;
    network_alerts?: boolean;
    risk_monitoring?: boolean;
  };
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
  inference_costs?: {
    total_cost_usd: number;
    daily_average_usd: number;
    monthly_estimate_usd: number;
  };
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
// Phase 3: Income Strategy & Opportunity Types
// ============================================================================

export type StrategyType = 'retainer' | 'productized_service' | 'digital_product' | 'consulting' | 'saas' | 'course' | 'licensing';
export type StrategyStatus = 'suggested' | 'exploring' | 'dismissed' | 'active';

export interface IncomeStrategy {
  id: string;
  title: string;
  description: string;
  type: StrategyType;
  estimated_monthly_revenue: number;
  estimated_effort_hours: number;
  confidence: number; // 0-1
  time_to_revenue_weeks: number;
  leveraged_skills: string[];
  prerequisites: string[];
  status: StrategyStatus;
  created_at: string;
  updated_at: string;
}

export interface GoalGapAnalysis {
  income_goal: number;
  current_revenue: number;
  gap: number;
  gap_percentage: number;
  currency: string;
  strategies_to_close: IncomeStrategy[];
  projected_with_strategies: number;
  analysis_text: string;
}

export type OpportunityType = 'pricing_gap' | 'high_cost_ratio' | 'stagnant_revenue' | 'underutilized_skill' | 'network_leverage';

export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  description: string;
  impact_score: number; // 1-10
  effort_score: number; // 1-10
  confidence: number; // 0-1
  related_project_id?: string;
  suggested_action: string;
  created_at: string;
}

export interface ScanResult {
  opportunities: Opportunity[];
  scanned_at: string;
  summary: string;
}

// ============================================================================
// Phase 1: Network Types
// ============================================================================

export type RelationshipType = 'colleague' | 'client' | 'investor' | 'mentor' | 'friend' | 'partner' | 'vendor' | 'other';
export type RelationshipStrength = 'strong' | 'moderate' | 'weak' | 'dormant';
export type BusinessValue = 'high' | 'medium' | 'low' | 'unknown';

export type SeniorityLevel = 'c_suite' | 'vp' | 'director' | 'manager' | 'individual_contributor' | 'founder' | 'unknown';

export interface NetworkContact {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;

  // Identity (multi-value, cross-source dedup)
  email?: string;
  emails?: string[];
  phone?: string;
  phones?: string[];
  company?: string;
  position?: string;
  location?: string;
  linkedin_url?: string;
  imported_from?: string;
  import_sources?: string[];    // e.g., ['linkedin', 'gmail', 'manual']

  // Professional
  industry?: string;
  seniority?: SeniorityLevel;
  skills?: string[];
  company_size?: string;        // e.g., '1-10', '11-50', '51-200', '201-1000', '1000+'

  // Relationship
  relationship_type: RelationshipType;
  relationship_strength: RelationshipStrength;
  business_value: BusinessValue;
  warmth_score?: number;        // 0-100, time-decaying
  warmth_last_computed?: string;
  communication_frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'dormant';
  last_contacted?: string;

  // Strategic value
  project_relevance?: Record<string, number>;  // projectId → relevance score 0-10
  potential_value_type?: string[];              // e.g., ['customer', 'advisor', 'beta_tester', 'distributor']
  intro_chain_available?: boolean;
  intro_chain_path?: string[];                  // contact IDs forming an introduction chain

  // Interaction history (summarized)
  interaction_summary?: string;
  conversation_topics?: string[];
  commitments?: string[];       // pending follow-ups, promises made
  last_interaction_type?: string;

  // Enrichment
  enrichment_date?: string;
  enrichment_data?: {
    recent_news?: string[];
    company_funding?: string;
    job_changes?: string[];
    outreach_angle?: string;
  };

  // AI classification
  tags: string[];
  notes?: string;
  ai_summary?: string;
  ai_tags?: string[];

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

// ============================================================================
// Phase 2: Portfolio Dashboard Types
// ============================================================================

export interface ProjectHealthIndicator {
  project_id: string;
  score: number;
  factors: {
    pipeline_velocity: number;
    task_completion_rate: number;
    days_since_update: number;
    has_overdue_tasks: boolean;
    financial_health: number;
  };
  status: 'thriving' | 'healthy' | 'stalling' | 'at_risk';
}

export interface CouncilVerdictSummary {
  overall_score: number;
  recommendation: 'approve' | 'reject' | 'needs-info';
  num_evaluations: number;
  council_composition: string[];
}

export interface PortfolioProjectSummary {
  id: string;
  title: string;
  playbook_type: PlaybookType | undefined;
  phase: ProjectPhase | undefined;
  phase_sub_state: PhaseSubState | undefined;
  status: 'active' | 'paused' | 'completed';
  health: ProjectHealthIndicator;
  monthly_revenue: number;
  monthly_costs: number;
  task_count: number;
  completed_tasks: number;
  collaborators: string[];
  updated_at: string;
  council_verdict?: CouncilVerdictSummary;
}

export interface RankedIdea {
  idea: Idea;
  composite_score: number;
  breakdown: {
    council_score: number;
    skill_alignment: number;
    network_advantage: number;
    financial_viability: number;
    time_to_revenue: number;
  };
  evaluated: boolean;
}

export interface PortfolioDashboard {
  projects: PortfolioProjectSummary[];
  active_count: number;
  paused_count: number;
  completed_count: number;
  total_monthly_revenue: number;
  total_monthly_costs: number;
  net_monthly: number;
  currency: string;
  ranked_ideas: RankedIdea[];
  unevaluated_ideas_count: number;
}

// ============================================================================
// Phase 2: Weekly Report Types
// ============================================================================

export interface WeeklyKPI {
  label: string;
  value: string;
  trend_direction: 'up' | 'down' | 'flat';
  trend_percentage: string;
  spark_data: number[];
}

export interface WeeklyReport {
  id: string;
  week_start: string;
  week_end: string;
  overall_momentum: number;
  kpis: WeeklyKPI[];
  strategic_intelligence: string[];
  activity_volume: number[];
  retrospective: string;
  created_at: string;
}

// ============================================================================
// Phase 2: Partner Analysis Types
// ============================================================================

export interface ProjectCollaborator {
  id: string;
  project_id: string;
  contact_id?: string;
  name: string;
  role: string;
  email?: string;
  company?: string;
  added_at: string;
}

export interface PartnerAnalysis {
  collaborator_id: string;
  network_overlap: { shared_contacts: string[]; shared_industries: string[] };
  business_possibilities: {
    type: 'joint_venture' | 'referral_channel' | 'skill_complement' | 'market_access';
    title: string;
    description: string;
    confidence: number;
  }[];
  analyzed_at: string;
}

// ============================================================================
// Phase 4: GTM & Marketing Types
// ============================================================================

export type ContentChannel = 'blog' | 'twitter' | 'linkedin' | 'email' | 'newsletter';
export type CalendarEntryStatus = 'planned' | 'drafted' | 'approved' | 'published' | 'skipped';
export type GTMStrategyStatus = 'planned' | 'active' | 'paused' | 'completed';

// Re-export canonical content types from content-engine
export type { ContentType, ContentTone } from '../services/content-engine.service';

export interface GTMStrategy {
  id: string;
  project_id: string;
  status: GTMStrategyStatus;
  council_verdict_id?: string;
  target_audience: string;
  value_proposition: string;
  channels: ContentChannel[];
  messaging_pillars: string[];
  launch_date?: string;
  kpis: { name: string; target: number; current?: number }[];
  playbook_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ContentCalendarEntry {
  id: string;
  project_id: string;
  title: string;
  content_type: string;
  brief: string;
  tone: string;
  channel: ContentChannel;
  scheduled_date: string;
  status: CalendarEntryStatus;
  draft_content?: string;
  published_url?: string;
  published_at?: string;
  approval_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface GTMDashboard {
  strategy: GTMStrategy | null;
  calendar_entries: ContentCalendarEntry[];
  upcoming_count: number;
  drafted_count: number;
  published_count: number;
  leads_generated: number;
}

export interface PublishResult {
  success: boolean;
  channel: ContentChannel;
  url?: string;
  error?: string;
  approval_required?: boolean;
  approval_id?: string;
}

// ============================================================================
// Phase 5: Confidence Calibration Types
// ============================================================================

export type ConfidenceOutcome = 'success' | 'failure' | 'cancelled' | 'pending';

export interface ConfidenceRecord {
  id: string;
  action_id: string;
  action_type: string;
  predicted_confidence: number;
  outcome: ConfidenceOutcome;
  actual_confidence?: number;
  resolved_at?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface CalibrationBucket {
  action_type: string;
  total_instances: number;
  successes: number;
  failures: number;
  cancelled: number;
  pending: number;
  avg_predicted_confidence: number;
  actual_success_rate: number;
  calibration_score: number;
  qualifies_for_evolution: boolean;
}

export interface CalibrationReport {
  generated_at: string;
  period_start: string;
  period_end: string;
  total_records: number;
  buckets: CalibrationBucket[];
  overall_calibration: number;
  trust_evolution_candidates: TrustEvolutionCandidate[];
}

export interface TrustEvolutionCandidate {
  action_type: string;
  current_tier: TrustTier;
  proposed_tier: TrustTier;
  instance_count: number;
  avg_confidence: number;
  approval_rate: number;
  calibration_score: number;
  meets_all_criteria: boolean;
  failing_criteria: string[];
}

// ============================================================================
// Phase 6: YouTube Indexer / Knowledge Types
// ============================================================================

export interface YouTubePlaylist {
  id: string;
  playlist_id: string; // YouTube playlist ID
  title: string;
  description?: string;
  tags: string[];
  video_count: number;
  indexed_count: number;
  last_indexed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface YouTubeVideo {
  id: string;
  video_id: string; // YouTube video ID
  playlist_id: string; // Internal playlist ID
  title: string;
  channel?: string;
  duration_seconds?: number;
  transcript_path?: string;
  summary?: string;
  summary_word_count?: number;
  mem0_id?: string;
  status: 'pending' | 'indexed' | 'failed' | 'skipped';
  error?: string;
  indexed_at?: string;
  created_at: string;
}
