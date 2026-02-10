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

export interface ThreadListResponse {
  threads: Thread[];
  count: number;
}

export interface ThreadDetailResponse {
  thread: Thread;
  messages: ThreadMessage[];
}

export interface SendMessageResponse {
  user_message: ThreadMessage;
  assistant_message: ThreadMessage;
}
