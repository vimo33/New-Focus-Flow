import { create } from 'zustand';
import { api } from '../services/api';
import type { Thread, ThreadMessage } from '../types/threads';

interface ThreadsState {
  threads: Thread[];
  activeThreadId: string | null;
  messages: ThreadMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  fetchThreads: (projectId?: string) => Promise<void>;
  createThread: (title?: string, projectId?: string) => Promise<Thread>;
  selectThread: (threadId: string) => Promise<void>;
  sendMessage: (content: string, source?: 'voice' | 'text') => Promise<ThreadMessage | null>;
  deleteThread: (threadId: string) => Promise<void>;
  renameThread: (threadId: string, title: string) => Promise<void>;
  clearActive: () => void;
}

export const useThreadsStore = create<ThreadsState>((set, get) => ({
  threads: [],
  activeThreadId: null,
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,

  fetchThreads: async (projectId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.getThreads(projectId);
      set({ threads: res.threads, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createThread: async (title?: string, projectId?: string) => {
    const thread = await api.createThread({ title, project_id: projectId });
    set((s) => ({
      threads: [thread, ...s.threads],
      activeThreadId: thread.id,
      messages: [],
    }));
    return thread;
  },

  selectThread: async (threadId: string) => {
    set({ activeThreadId: threadId, isLoading: true, error: null });
    try {
      const res = await api.getThread(threadId);
      set({ messages: res.messages, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  sendMessage: async (content: string, source: 'voice' | 'text' = 'text') => {
    const { activeThreadId } = get();
    if (!activeThreadId) return null;

    set({ isSending: true, error: null });
    try {
      const res = await api.sendMessage(activeThreadId, content, source);

      set((s) => {
        // Update messages
        const messages = [...s.messages, res.user_message, res.assistant_message];

        // Update thread in list
        const threads = s.threads.map((t) =>
          t.id === activeThreadId
            ? {
                ...t,
                message_count: t.message_count + 2,
                last_message_preview:
                  res.assistant_message.content.slice(0, 100),
                updated_at: new Date().toISOString(),
              }
            : t
        );

        // Re-sort so active thread floats to top
        threads.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );

        return { messages, threads, isSending: false };
      });

      return res.assistant_message;
    } catch (err: any) {
      set({ error: err.message, isSending: false });
      return null;
    }
  },

  deleteThread: async (threadId: string) => {
    await api.deleteThread(threadId);
    set((s) => {
      const threads = s.threads.filter((t) => t.id !== threadId);
      const cleared = s.activeThreadId === threadId;
      return {
        threads,
        activeThreadId: cleared ? null : s.activeThreadId,
        messages: cleared ? [] : s.messages,
      };
    });
  },

  renameThread: async (threadId: string, title: string) => {
    const updated = await api.updateThread(threadId, { title });
    set((s) => ({
      threads: s.threads.map((t) => (t.id === threadId ? updated : t)),
    }));
  },

  clearActive: () => {
    set({ activeThreadId: null, messages: [] });
  },
}));
