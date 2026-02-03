// Focus Flow API Client Service
// Provides typed methods for all backend API endpoints

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

export interface AgentEvaluation {
  agent_name: string;
  score: number;
  reasoning: string;
  concerns: string[];
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
// API Client Class
// ============================================================================

export class VaultAPI {
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:3001/api') {
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
}

// ============================================================================
// Default Export
// ============================================================================

// Export a singleton instance for convenience
export const api = new VaultAPI();

// Also export the class for custom instances
export default VaultAPI;
