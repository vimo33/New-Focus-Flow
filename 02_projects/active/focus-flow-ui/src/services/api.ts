// Nitara API Client Service
// Provides typed methods for all backend API endpoints

import type {
  Thread,
  ThreadListResponse,
  ThreadDetailResponse,
  SendMessageResponse,
} from '../types/threads';

// ============================================================================
// Type Definitions
// ============================================================================

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
  reasoning?: string;
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

export type ConceptStep = 'refining' | 'council_selection' | 'council_running' | 'council_review' | 'prd_generation' | 'prd_review';

export interface CouncilMember {
  agent_name: string;
  role: string;
  focus: string;
  evaluation_criteria?: string[];
}

export interface ThreadMessage {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  source: 'voice' | 'text';
  created_at: string;
}
export type PhaseSubState = 'idle' | 'working' | 'review' | 'approved' | 'rejected';

export interface PhaseState {
  phase: ProjectPhase;
  sub_state: PhaseSubState;
  started_at?: string;
  completed_at?: string;
  feedback?: string;
  step?: string;
}

export interface PipelineState {
  current_phase: ProjectPhase;
  phases: Partial<Record<ProjectPhase, PhaseState>>;
  run_id?: string;
  updated_at: string;
}

export interface DesignSystemColor {
  name: string;
  hex: string;
  usage: string;
}

export interface DesignSystemType {
  color_palette: DesignSystemColor[];
  typography: { role: string; font: string; size: string; weight: string }[];
  spacing_scale: Record<string, string>;
  component_inventory: string[];
  brand_guidelines?: string;
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

export interface Specification {
  feature_name: string;
  description: string;
  frontend: {
    components: string[];
    routes: string[];
    state: string[];
  };
  backend: {
    endpoints: { method: string; path: string; purpose: string }[];
    models: string[];
  };
  acceptance_criteria: string[];
  dependencies: string[];
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface ProjectArtifacts {
  prd?: PRDDocument;
  refined_concept?: string;
  council_verdict?: CouncilVerdict;
  selected_council?: CouncilMember[];
  council_progress?: CouncilProgress;
  specs?: Specification[];
  design_system?: DesignSystemType;
  designs?: any[];
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'paused' | 'completed';
  phase?: ProjectPhase;
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

export interface DesignScreen {
  id: string;
  project_id: string;
  name: string;
  prompt: string;
  status: 'generating' | 'completed' | 'failed';
  image_path?: string;
  html_path?: string;
  created_at: string;
  completed_at?: string;
  error?: string;
}

export interface HealthLog {
  id: string;
  mood: number;
  energy: number;
  sleep_hours: number;
  exercise_minutes: number;
  date: string;
  notes?: string;
  created_at: string;
}

export interface HealthExperiment {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date?: string;
  status: 'active' | 'completed' | 'paused';
  metrics_tracked: string[];
}

export interface FocusSession {
  id: string;
  project_id: string;
  session_type: string;
  work_duration: number;
  break_duration: number;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  notes: string | null;
}

export interface ActivityEntry {
  id: string;
  type: string;
  description: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface UploadedFile {
  name: string;
  originalName: string;
  size: number;
  path?: string;
  uploadedAt: string;
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
// Response Types
// ============================================================================

export interface CaptureResponse {
  id: string;
  status: 'created';
  item: InboxItem;
}

export interface InboxListResponse {
  items: InboxItem[];
  count: number;
}

export interface TaskListResponse {
  tasks: Task[];
  count: number;
}

export interface TaskResponse {
  status: 'created' | 'updated';
  task: Task;
}

export interface ProjectListResponse {
  projects: Project[];
  count: number;
}

export interface ProjectResponse {
  status: 'created';
  project: Project;
}

export interface IdeaListResponse {
  ideas: Idea[];
  count: number;
}

export interface IdeaResponse {
  status: 'created';
  idea: Idea;
}

export interface ProcessResponse {
  status: 'processed';
  action: string;
}

export interface ApiError {
  error: string;
  message?: string;
}

// ============================================================================
// Voice Command Types
// ============================================================================

export type VoiceIntentType = 'navigation' | 'create' | 'query' | 'update' | 'delete' | 'conversation';

export interface VoiceCommandIntent {
  type: VoiceIntentType;
  confidence: number;
  action: string;
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

export interface VoiceCommandResponse {
  status: 'classified';
  intent: VoiceCommandIntent;
}

// ============================================================================
// API Client Class
// ============================================================================

export class VaultAPI {
  private baseURL: string;

  constructor(baseURL: string = import.meta.env.VITE_API_URL || 'http://localhost:3001/api') {
    this.baseURL = baseURL;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(
          errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  // ============================================================================
  // Inbox Methods
  // ============================================================================

  /**
   * POST /api/capture - Quick capture an inbox item
   */
  async capture(data: CaptureRequest): Promise<CaptureResponse> {
    return this.request<CaptureResponse>('/capture', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * GET /api/inbox - Get all inbox items with optional filter
   * @param filter - Optional category filter ('work' | 'personal' | 'ideas')
   */
  async getInbox(filter?: string): Promise<InboxListResponse> {
    const queryParams = filter ? `?filter=${encodeURIComponent(filter)}` : '';
    return this.request<InboxListResponse>(`/inbox${queryParams}`);
  }

  /**
   * GET /api/inbox/counts - Get inbox item counts by category
   */
  async getInboxCounts(): Promise<InboxCounts> {
    return this.request<InboxCounts>('/inbox/counts');
  }

  /**
   * GET /api/inbox/:id - Get a single inbox item by ID
   */
  async getInboxItem(id: string): Promise<InboxItem> {
    return this.request<InboxItem>(`/inbox/${id}`);
  }

  /**
   * POST /api/inbox/:id/process - Process an inbox item
   */
  async processInboxItem(
    id: string,
    data: ProcessInboxRequest
  ): Promise<ProcessResponse> {
    return this.request<ProcessResponse>(`/inbox/${id}/process`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================================================
  // Task Methods
  // ============================================================================

  /**
   * GET /api/tasks - Get all tasks with optional category filter
   * @param category - Optional category filter ('work' | 'personal' | 'scheduled')
   */
  async getTasks(category?: string): Promise<TaskListResponse> {
    const queryParams = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request<TaskListResponse>(`/tasks${queryParams}`);
  }

  /**
   * POST /api/tasks - Create a new task
   */
  async createTask(data: Partial<Task>): Promise<TaskResponse> {
    return this.request<TaskResponse>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT /api/tasks/:id - Update an existing task
   */
  async updateTask(id: string, data: Partial<Task>): Promise<TaskResponse> {
    return this.request<TaskResponse>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE /api/tasks/:id - Delete a task
   */
  async deleteTask(id: string): Promise<{ status: string; id: string }> {
    return this.request<{ status: string; id: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // Project Methods
  // ============================================================================

  /**
   * GET /api/projects - Get all projects with optional status filter
   * @param status - Optional status filter ('active' | 'paused' | 'completed')
   */
  async getProjects(status?: string): Promise<ProjectListResponse> {
    const queryParams = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<ProjectListResponse>(`/projects${queryParams}`);
  }

  /**
   * POST /api/projects - Create a new project
   */
  async createProject(data: Partial<Project>): Promise<ProjectResponse> {
    return this.request<ProjectResponse>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================================================
  // Idea Methods
  // ============================================================================

  /**
   * GET /api/ideas - Get all ideas with optional status filter
   * @param status - Optional status filter ('inbox' | 'validated' | 'rejected')
   */
  async getIdeas(status?: string): Promise<IdeaListResponse> {
    const queryParams = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<IdeaListResponse>(`/ideas${queryParams}`);
  }

  /**
   * POST /api/ideas - Create a new idea
   */
  async createIdea(data: Partial<Idea>): Promise<IdeaResponse> {
    return this.request<IdeaResponse>('/ideas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /api/ideas/:id/validate - Validate idea with AI Council
   */
  async validateIdea(id: string, userContext?: string): Promise<{ status: string; ideaId: string; verdict: CouncilVerdict }> {
    return this.request<{ status: string; ideaId: string; verdict: CouncilVerdict }>(`/ideas/${id}/validate`, {
      method: 'POST',
      body: JSON.stringify({ userContext }),
    });
  }

  // ============================================================================
  // Dashboard Methods
  // ============================================================================

  /**
   * GET /api/summary - Get dashboard summary data
   */
  async getSummary(): Promise<DashboardSummary> {
    return this.request<DashboardSummary>('/summary');
  }

  // ============================================================================
  // Health Methods
  // ============================================================================

  /**
   * POST /api/health/log - Log a health metric
   */
  async logHealthMetric(data: Partial<HealthMetric>): Promise<{ status: string; metric: HealthMetric }> {
    return this.request('/health/log', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Generic POST method for custom endpoints
   */
  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // ============================================================================
  // Thread Methods
  // ============================================================================

  async createThread(data?: { title?: string; project_id?: string }): Promise<Thread> {
    return this.request<Thread>('/threads', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async getThreads(projectId?: string): Promise<ThreadListResponse> {
    const params = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
    return this.request<ThreadListResponse>(`/threads${params}`);
  }

  async getThread(id: string): Promise<ThreadDetailResponse> {
    return this.request<ThreadDetailResponse>(`/threads/${id}`);
  }

  async sendMessage(
    threadId: string,
    content: string,
    source: 'voice' | 'text' = 'text'
  ): Promise<SendMessageResponse> {
    return this.request<SendMessageResponse>(`/threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, source }),
    });
  }

  async updateThread(id: string, data: { title?: string; project_id?: string }): Promise<Thread> {
    return this.request<Thread>(`/threads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteThread(id: string): Promise<{ status: string; id: string }> {
    return this.request<{ status: string; id: string }>(`/threads/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // Voice Command Methods
  // ============================================================================

  /**
   * POST /api/voice-command/classify - Classify a voice command
   */
  async classifyVoiceCommand(request: VoiceCommandRequest): Promise<VoiceCommandResponse> {
    return this.request<VoiceCommandResponse>('/voice-command/classify', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * GET /api/voice-command/status - Get voice command service status
   */
  async getVoiceCommandStatus(): Promise<{ status: string; api_connected: boolean }> {
    return this.request<{ status: string; api_connected: boolean }>('/voice-command/status');
  }

  // ============================================================================
  // Orchestrator Methods
  // ============================================================================

  async sendOrchestratorMessage(
    content: string,
    threadId?: string | null,
    source: 'voice' | 'text' = 'text'
  ): Promise<{ thread_id: string; content: string; tool_calls?: any[]; navigate_to?: string }> {
    return this.request('/orchestrator/chat', {
      method: 'POST',
      body: JSON.stringify({ content, thread_id: threadId, source }),
    });
  }

  async getOrchestratorThreads(): Promise<{ threads: any[]; count: number }> {
    return this.request('/orchestrator/threads');
  }

  async createOrchestratorThread(title?: string): Promise<any> {
    return this.request('/orchestrator/threads', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async getOrchestratorThread(id: string): Promise<any> {
    return this.request(`/orchestrator/threads/${id}`);
  }

  // ============================================================================
  // Idea Detail Methods
  // ============================================================================

  async getIdea(id: string): Promise<Idea> {
    return this.request<Idea>(`/ideas/${id}`);
  }

  async expandIdea(id: string): Promise<{ status: string; idea: Idea }> {
    return this.request(`/ideas/${id}/expand`, { method: 'POST' });
  }

  async promoteIdea(id: string): Promise<{ status: string; project: Project; idea_id: string }> {
    return this.request(`/ideas/${id}/promote`, { method: 'POST' });
  }

  // ============================================================================
  // Project Detail Methods
  // ============================================================================

  async getProject(id: string): Promise<Project & { tasks: Task[]; progress: number }> {
    return this.request(`/projects/${id}`);
  }

  async updateProject(id: string, data: Partial<Project>): Promise<{ status: string; project: Project }> {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string): Promise<{ status: string }> {
    return this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  async getProjectNotes(id: string): Promise<{ content: string }> {
    return this.request(`/projects/${id}/notes`);
  }

  async saveProjectNotes(id: string, content: string): Promise<{ status: string }> {
    return this.request(`/projects/${id}/notes`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  async getProjectActivity(id: string): Promise<{ entries: ActivityEntry[] }> {
    return this.request(`/projects/${id}/activity`);
  }

  async startFocusSession(data: { project_id: string; session_type?: string; work_duration?: number; break_duration?: number }): Promise<{ status: string; session: FocusSession }> {
    return this.request('/focus-sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFocusSession(id: string, data: Partial<FocusSession>): Promise<{ status: string; session: FocusSession }> {
    return this.request(`/focus-sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getFocusSessions(projectId?: string): Promise<{ sessions: FocusSession[]; count: number }> {
    const params = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
    return this.request(`/focus-sessions${params}`);
  }

  // ============================================================================
  // CRM Methods
  // ============================================================================

  async getContacts(search?: string): Promise<{ contacts: any[]; total: number }> {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request(`/crm/contacts${params}`);
  }

  async createContact(data: { name: string; email?: string; company?: string; phone?: string; tags?: string[] }): Promise<any> {
    return this.request('/crm/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================================================
  // Sales Methods
  // ============================================================================

  async getDeals(stage?: string): Promise<{ deals: any[]; total: number }> {
    const params = stage ? `?stage=${encodeURIComponent(stage)}` : '';
    return this.request(`/sales/deals${params}`);
  }

  async createDeal(data: { title: string; value?: number; stage?: string; contact_id?: string; project_id?: string }): Promise<any> {
    return this.request('/sales/deals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDeal(id: string, data: { stage?: string; value?: number }): Promise<any> {
    return this.request(`/sales/deals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getSalesPipeline(): Promise<any> {
    return this.request('/sales/pipeline');
  }

  async deleteDeal(id: string): Promise<{ status: string }> {
    return this.request(`/sales/deals/${id}`, { method: 'DELETE' });
  }

  // ============================================================================
  // Concept Chat Methods
  // ============================================================================

  async sendConceptMessage(projectId: string, content: string): Promise<{
    user_message: ThreadMessage;
    assistant_message: ThreadMessage;
  }> {
    return this.request(`/pipeline/${projectId}/concept/chat`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async getConceptMessages(projectId: string): Promise<{ messages: ThreadMessage[] }> {
    return this.request(`/pipeline/${projectId}/concept/messages`);
  }

  async markConceptReady(projectId: string): Promise<{
    status: string;
    project: Project;
    pipeline: PipelineState;
    refined_concept: string;
    suggested_council: CouncilMember[];
  }> {
    return this.request(`/pipeline/${projectId}/concept/ready`, { method: 'POST' });
  }

  async approveCouncil(projectId: string, agents: CouncilMember[]): Promise<{
    status: string;
    project: Project;
    pipeline: PipelineState;
    council_progress?: CouncilProgress;
  }> {
    return this.request(`/pipeline/${projectId}/council/approve`, {
      method: 'POST',
      body: JSON.stringify({ agents }),
    });
  }

  async retryCouncil(projectId: string): Promise<{
    status: string;
    project: Project;
    pipeline: PipelineState;
    council_progress?: CouncilProgress;
  }> {
    return this.request(`/pipeline/${projectId}/council/retry`, { method: 'POST' });
  }

  // ============================================================================
  // Pipeline Methods
  // ============================================================================

  async startPipeline(projectId: string): Promise<{ status: string; project: Project; pipeline: PipelineState }> {
    return this.request(`/pipeline/${projectId}/start`, { method: 'POST' });
  }

  async getPipelineStatus(projectId: string): Promise<{
    project: Project;
    pipeline: PipelineState | null;
    current_phase_state: PhaseState | null;
  }> {
    return this.request(`/pipeline/${projectId}/status`);
  }

  async reviewPhase(
    projectId: string,
    action: 'approve' | 'reject',
    feedback?: string
  ): Promise<{ status: string; project: Project; pipeline: PipelineState }> {
    return this.request(`/pipeline/${projectId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, feedback }),
    });
  }

  // ============================================================================
  // Design Methods
  // ============================================================================

  async getDesignScreens(projectId: string): Promise<{ screens: DesignScreen[]; count: number }> {
    return this.request(`/designs/${projectId}`);
  }

  async generateDesignScreen(projectId: string, prompt: string, model?: string): Promise<{ status: string; screen: DesignScreen }> {
    return this.request(`/designs/${projectId}/generate`, {
      method: 'POST',
      body: JSON.stringify({ prompt, model }),
    });
  }

  async deleteDesignScreen(projectId: string, screenId: string): Promise<{ status: string }> {
    return this.request(`/designs/${projectId}/${screenId}`, { method: 'DELETE' });
  }

  // ============================================================================
  // Health Methods (Extended)
  // ============================================================================

  async getHealthLogs(startDate?: string, endDate?: string): Promise<{ logs: HealthLog[]; count: number }> {
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/health/logs${qs}`);
  }

  async getHealthToday(): Promise<{ log: HealthLog | null }> {
    return this.request('/health/logs/today');
  }

  async getHealthTrends(days?: number): Promise<{ trends: HealthLog[]; averages: Record<string, number> }> {
    const qs = days ? `?days=${days}` : '';
    return this.request(`/health/trends${qs}`);
  }

  async saveHealthLog(data: { mood: number; energy: number; sleep_hours: number; exercise_minutes: number; date?: string }): Promise<{ status: string; log: HealthLog }> {
    return this.request('/health/log', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getExperiments(): Promise<{ experiments: HealthExperiment[]; count: number }> {
    return this.request('/health/experiments');
  }

  async createExperiment(data: { title: string; description: string; metrics_tracked: string[] }): Promise<{ status: string; experiment: HealthExperiment }> {
    return this.request('/health/experiments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateExperiment(id: string, data: Partial<HealthExperiment>): Promise<{ status: string; experiment: HealthExperiment }> {
    return this.request(`/health/experiments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ============================================================================
  // CRM Extended Methods
  // ============================================================================

  async getContact(id: string): Promise<any> {
    return this.request(`/crm/contacts/${id}`);
  }

  async updateContact(id: string, data: any): Promise<any> {
    return this.request(`/crm/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addInteraction(data: { contact_id: string; type: string; notes: string }): Promise<any> {
    return this.request('/crm/interactions', {
      method: 'POST',
      body: JSON.stringify({
        contact_id: data.contact_id,
        type: data.type,
        subject: data.notes,
        content: data.notes,
      }),
    });
  }

  async deleteContact(id: string): Promise<{ status: string }> {
    return this.request(`/crm/contacts/${id}`, { method: 'DELETE' });
  }

  // ============================================================================
  // Upload Methods
  // ============================================================================

  async uploadFile(file: File): Promise<{ files: UploadedFile[] }> {
    const formData = new FormData();
    formData.append('files', file);
    const url = `${this.baseURL}/uploads`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async getUploads(): Promise<{ files: UploadedFile[]; count: number }> {
    return this.request('/uploads');
  }

  getDownloadUrl(filename: string): string {
    return `${this.baseURL}/uploads/${encodeURIComponent(filename)}`;
  }

  async deleteUpload(filename: string): Promise<{ status: string; filename: string }> {
    return this.request(`/uploads/${encodeURIComponent(filename)}`, { method: 'DELETE' });
  }

  // ============================================================================
  // Memory Methods
  // ============================================================================

  async getMemories(limit?: number): Promise<{ memories: MemoryItem[]; count: number }> {
    const params = limit ? `?limit=${limit}` : '';
    return this.request(`/memory${params}`);
  }

  async searchMemories(query: string, limit?: number): Promise<{ results: MemoryItem[]; count: number }> {
    const params = new URLSearchParams({ query });
    if (limit) params.set('limit', String(limit));
    return this.request(`/memory/search?${params.toString()}`);
  }

  async getProjectMemories(projectId: string, limit?: number): Promise<{ memories: MemoryItem[]; count: number }> {
    const params = limit ? `?limit=${limit}` : '';
    return this.request(`/memory/project/${projectId}${params}`);
  }

  async addProjectMemory(projectId: string, content: string, tags?: string[]): Promise<{ result: any; status: string }> {
    return this.request(`/memory/project/${projectId}`, {
      method: 'POST',
      body: JSON.stringify({ content, tags }),
    });
  }

  async deleteMemory(id: string): Promise<{ status: string }> {
    return this.request(`/memory/${id}`, { method: 'DELETE' });
  }

  async getMemoryHealth(): Promise<{ status: string; available: boolean }> {
    return this.request('/memory/health');
  }

  // ============================================================================
  // Profile Methods
  // ============================================================================

  async getProfile(): Promise<any> {
    return this.request('/profile');
  }

  async saveProfile(data: any): Promise<any> {
    return this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async extractProfile(text: string): Promise<any> {
    return this.request('/profile/extract', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async setArchetype(archetype: string): Promise<any> {
    return this.request('/profile/archetype', {
      method: 'PUT',
      body: JSON.stringify({ archetype }),
    });
  }

  async addProfileSkill(skill: any): Promise<any> {
    return this.request('/profile/skills', {
      method: 'POST',
      body: JSON.stringify(skill),
    });
  }

  async addProfileExperience(experience: any): Promise<any> {
    return this.request('/profile/experience', {
      method: 'POST',
      body: JSON.stringify(experience),
    });
  }

  // ============================================================================
  // Financials Methods
  // ============================================================================

  async getPortfolioFinancials(): Promise<any> {
    return this.request('/financials/portfolio');
  }

  async getFinancialGoals(): Promise<any> {
    return this.request('/financials/goals');
  }

  async setFinancialGoals(goals: any): Promise<any> {
    return this.request('/financials/goals', {
      method: 'PUT',
      body: JSON.stringify(goals),
    });
  }

  async getProjectFinancials(projectId: string): Promise<any> {
    return this.request(`/financials/${projectId}`);
  }

  async addRevenue(data: any): Promise<any> {
    return this.request('/financials/revenue', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRevenue(id: string, data: any): Promise<any> {
    return this.request(`/financials/revenue/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRevenue(id: string): Promise<{ status: string }> {
    return this.request(`/financials/revenue/${id}`, { method: 'DELETE' });
  }

  async addCost(data: any): Promise<any> {
    return this.request('/financials/cost', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCost(id: string, data: any): Promise<any> {
    return this.request(`/financials/cost/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCost(id: string): Promise<{ status: string }> {
    return this.request(`/financials/cost/${id}`, { method: 'DELETE' });
  }

  async createFinancialSnapshot(): Promise<any> {
    return this.request('/financials/snapshot', { method: 'POST' });
  }

  async getFinancialSnapshots(): Promise<any> {
    return this.request('/financials/snapshots');
  }

  // ============================================================================
  // Network Methods
  // ============================================================================

  async importLinkedInNetwork(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const url = `${this.baseURL}/network/import/linkedin`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Import failed' }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async getNetworkContacts(search?: string, relationship?: string): Promise<{ contacts: any[]; count: number }> {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (relationship) params.set('relationship', relationship);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/network/contacts${qs}`);
  }

  async getNetworkContact(id: string): Promise<any> {
    return this.request(`/network/contacts/${id}`);
  }

  async updateNetworkContact(id: string, data: any): Promise<any> {
    return this.request(`/network/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getNetworkGraph(): Promise<any> {
    return this.request('/network/graph');
  }

  async getNetworkOpportunities(): Promise<{ opportunities: any[]; count: number }> {
    return this.request('/network/opportunities');
  }

  async getImportJobStatus(jobId: string): Promise<any> {
    return this.request(`/network/import/${jobId}`);
  }

  getImportSSEUrl(): string {
    return `${this.baseURL}/network/import/status`;
  }
}

// ============================================================================
// Memory Types
// ============================================================================

export interface MemoryItem {
  id: string;
  memory: string;
  score?: number;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Default Export
// ============================================================================

// Export a singleton instance for convenience
export const api = new VaultAPI();

// Also export the class for custom instances
export default VaultAPI;
