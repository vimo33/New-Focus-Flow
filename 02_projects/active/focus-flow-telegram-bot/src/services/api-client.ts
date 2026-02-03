import fetch from 'node-fetch';

/**
 * API Client Service - Handles communication with Focus Flow Backend API
 *
 * Responsibilities:
 * - Send captures to backend
 * - Fetch inbox items
 * - Update item status
 * - Handle authentication
 */

interface CapturePayload {
  text: string;
  source: 'telegram' | 'pwa' | 'voice' | 'api';
  prefix?: string;
  metadata?: Record<string, unknown>;
}

interface InboxItem {
  id: string;
  text: string;
  category?: 'work' | 'personal' | 'ideas';
  prefix?: string;
  source: string;
  created_at: string;
  processed_at?: string;
  metadata?: Record<string, any>;
  ai_classification?: {
    category: string;
    confidence: number;
    suggested_action: string;
    reasoning: string;
  };
}

interface InboxCounts {
  all: number;
  work: number;
  personal: number;
  ideas: number;
}

interface ProcessInboxRequest {
  action: 'task' | 'project' | 'idea' | 'archive' | 'delete';
  task_data?: Record<string, any>;
  project_data?: Record<string, any>;
  idea_data?: Record<string, any>;
}

class ApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string = '', apiKey: string = '') {
    this.baseUrl = baseUrl || process.env.BACKEND_API_URL || 'http://localhost:3001';
    this.apiKey = apiKey || process.env.BACKEND_API_KEY || '';
  }

  /**
   * Send a capture to the backend
   */
  async sendCapture(payload: CapturePayload): Promise<{ id: string; status: string; item: InboxItem }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/capture`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as { id: string; status: string; item: InboxItem };
    } catch (error) {
      console.error('Error sending capture:', error);
      throw error;
    }
  }

  /**
   * Fetch inbox items from backend
   */
  async fetchInbox(filter?: string): Promise<InboxItem[]> {
    try {
      const url = filter
        ? `${this.baseUrl}/api/inbox?filter=${encodeURIComponent(filter)}`
        : `${this.baseUrl}/api/inbox`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: any = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error fetching inbox:', error);
      throw error;
    }
  }

  /**
   * Get inbox counts
   */
  async getInboxCounts(): Promise<InboxCounts> {
    try {
      const response = await fetch(`${this.baseUrl}/api/inbox/counts`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as InboxCounts;
    } catch (error) {
      console.error('Error fetching inbox counts:', error);
      throw error;
    }
  }

  /**
   * Get single inbox item
   */
  async getInboxItem(itemId: string): Promise<InboxItem> {
    try {
      const response = await fetch(`${this.baseUrl}/api/inbox/${itemId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as InboxItem;
    } catch (error) {
      console.error('Error fetching inbox item:', error);
      throw error;
    }
  }

  /**
   * Process an inbox item
   */
  async processInboxItem(itemId: string, processData: ProcessInboxRequest): Promise<{ status: string; action: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/inbox/${itemId}/process`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(processData)
      });

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as { status: string; action: string };
    } catch (error) {
      console.error('Error processing inbox item:', error);
      throw error;
    }
  }

  /**
   * Set authorization header
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }
}

export default new ApiClient();
