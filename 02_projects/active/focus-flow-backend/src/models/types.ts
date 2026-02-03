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

export interface CouncilVerdict {
  recommendation: 'approve' | 'reject' | 'revise';
  confidence: number;
  pragmatist_view: string;
  visionary_view: string;
  skeptic_view: string;
  synthesis: string;
  timestamp: string;
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
