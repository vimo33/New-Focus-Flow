/**
 * Type definitions for Focus Flow Telegram Bot
 */

export interface InboxItem {
  id: string;
  text: string;
  category?: 'work' | 'personal' | 'ideas';
  prefix?: string;
  source: string;
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

export interface InboxCounts {
  all: number;
  work: number;
  personal: number;
  ideas: number;
}

export interface CapturePayload {
  text: string;
  source: 'telegram' | 'pwa' | 'voice' | 'api';
  prefix?: string;
  metadata?: Record<string, unknown>;
}

export interface ProcessInboxRequest {
  action: 'task' | 'project' | 'idea' | 'archive' | 'delete';
  task_data?: Record<string, any>;
  project_data?: Record<string, any>;
  idea_data?: Record<string, any>;
}

export interface CaptureResponse {
  id: string;
  status: string;
  item: InboxItem;
}

export interface ProcessResponse {
  status: string;
  action: string;
}
