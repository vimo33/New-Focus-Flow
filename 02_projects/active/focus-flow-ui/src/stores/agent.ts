import { create } from 'zustand';
import { api } from '../services/api';

interface AgentState {
  status: string;
  current_briefing_id: string | null;
  active_work_plan: any | null;
  pending_approvals: any[];
  delayed_executions: any[];
  last_briefing_at: string | null;
  last_heartbeat_at: string | null;
  daily_stats: any;
  activityLog?: any[];
  updated_at: string;
}

interface Notification {
  id: string;
  type: string;
  priority: string;
  title: string;
  body: string;
  created_at: string;
  read_at?: string;
  dismissed_at?: string;
  approval_id?: string;
  action_url?: string;
}

interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
}

interface AgentStore {
  // State
  agentState: AgentState | null;
  briefing: any | null;
  notifications: Notification[];
  unreadCount: number;
  connected: boolean;
  loading: boolean;
  error: string | null;

  // Chat
  chatHistory: ChatMessage[];

  // Activity
  activity: any[];

  // Work plan item toggles
  skippedItems: string[];

  // SSE
  eventSource: EventSource | null;
  connectSSE: () => void;
  disconnectSSE: () => void;

  // Actions
  fetchState: () => Promise<void>;
  fetchBriefing: () => Promise<void>;
  generateBriefing: () => Promise<any>;
  approveWorkPlan: (planId: string, edits?: any[]) => Promise<any>;
  approveWorkPlanWithSkips: (planId: string) => Promise<any>;
  approveRequest: (requestId: string, feedback?: string) => Promise<any>;
  rejectRequest: (requestId: string, feedback?: string) => Promise<any>;
  sendMessage: (message: string) => Promise<any>;
  fetchNotifications: (unread?: boolean) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;

  // New actions
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  fetchActivity: (limit?: number) => Promise<void>;
  toggleWorkPlanItem: (itemId: string) => void;
  subscribePush: () => Promise<void>;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const useAgentStore = create<AgentStore>((set, get) => ({
  agentState: null,
  briefing: null,
  notifications: [],
  unreadCount: 0,
  connected: false,
  loading: false,
  error: null,
  eventSource: null,
  chatHistory: [],
  activity: [],
  skippedItems: [],

  connectSSE: () => {
    const existing = get().eventSource;
    if (existing) return;

    const es = new EventSource(`${API_BASE}/agent/events`);

    es.addEventListener('connected', () => {
      set({ connected: true, error: null });
    });

    es.addEventListener('agent_state', (e) => {
      try {
        const data = JSON.parse(e.data);
        set({ agentState: data });
      } catch {}
    });

    es.addEventListener('briefing', (e) => {
      try {
        const data = JSON.parse(e.data);
        set({ briefing: data });
      } catch {}
    });

    es.addEventListener('notification', (e) => {
      try {
        const data = JSON.parse(e.data);
        set(state => ({
          notifications: [data, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));
      } catch {}
    });

    es.addEventListener('notification_read', (e) => {
      try {
        const { id } = JSON.parse(e.data);
        set(state => ({
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, read_at: new Date().toISOString() } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
      } catch {}
    });

    es.addEventListener('activity', (e) => {
      try {
        const data = JSON.parse(e.data);
        set(state => ({
          activity: [data, ...state.activity].slice(0, 50),
        }));
      } catch {}
    });

    es.onerror = () => {
      set({ connected: false });
      // Auto-reconnect after 5s
      setTimeout(() => {
        const store = get();
        if (store.eventSource === es) {
          set({ eventSource: null });
          store.connectSSE();
        }
      }, 5000);
    };

    set({ eventSource: es });
  },

  disconnectSSE: () => {
    const es = get().eventSource;
    if (es) {
      es.close();
      set({ eventSource: null, connected: false });
    }
  },

  fetchState: async () => {
    try {
      const state = await api.post<AgentState>('/agent/state');
      set({ agentState: state });
    } catch (err: any) {
      // Use GET for state endpoint
      try {
        const res = await fetch(`${API_BASE}/agent/state`);
        const state = await res.json();
        set({ agentState: state });
      } catch (e: any) {
        set({ error: e.message });
      }
    }
  },

  fetchBriefing: async () => {
    try {
      const res = await fetch(`${API_BASE}/agent/briefing`);
      if (res.ok) {
        const briefing = await res.json();
        set({ briefing });
      }
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  generateBriefing: async () => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_BASE}/agent/briefing/generate`, { method: 'POST' });
      const data = await res.json();
      if (data.state) set({ agentState: data.state });
      set({ loading: false });
      return data;
    } catch (err: any) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  approveWorkPlan: async (planId, edits) => {
    try {
      const res = await fetch(`${API_BASE}/agent/work-plan/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId, edits }),
      });
      const data = await res.json();
      if (data.state) set({ agentState: data.state, skippedItems: [] });
      return data;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  approveWorkPlanWithSkips: async (planId) => {
    const { skippedItems, approveWorkPlan } = get();
    const edits = skippedItems.map(id => ({ id, action: 'skip' }));
    return approveWorkPlan(planId, edits);
  },

  approveRequest: async (requestId, feedback) => {
    try {
      const res = await fetch(`${API_BASE}/agent/approve/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true, feedback }),
      });
      const data = await res.json();
      if (data.state) set({ agentState: data.state });
      return data;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  rejectRequest: async (requestId, feedback) => {
    try {
      const res = await fetch(`${API_BASE}/agent/approve/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: false, feedback }),
      });
      const data = await res.json();
      if (data.state) set({ agentState: data.state });
      return data;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  sendMessage: async (message) => {
    // Append user message to chat history
    const userMsg: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    set(state => ({ chatHistory: [...state.chatHistory, userMsg], loading: true }));

    try {
      const res = await fetch(`${API_BASE}/agent/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (data.state) set({ agentState: data.state });

      // Append agent response to chat history
      const agentMsg: ChatMessage = {
        role: 'agent',
        content: data.message,
        timestamp: new Date().toISOString(),
      };
      set(state => ({ chatHistory: [...state.chatHistory, agentMsg], loading: false }));
      return data;
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        role: 'agent',
        content: `Error: ${err.message}`,
        timestamp: new Date().toISOString(),
      };
      set(state => ({ chatHistory: [...state.chatHistory, errorMsg], loading: false, error: err.message }));
      throw err;
    }
  },

  fetchNotifications: async (unread = false) => {
    try {
      const qs = unread ? '?unread=true' : '';
      const res = await fetch(`${API_BASE}/agent/notifications${qs}`);
      const data = await res.json();
      const notifications = data.notifications || [];
      set({
        notifications,
        unreadCount: notifications.filter((n: Notification) => !n.read_at && !n.dismissed_at).length,
      });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  markRead: async (id) => {
    try {
      await fetch(`${API_BASE}/agent/notifications/${id}/read`, { method: 'POST' });
      set(state => ({
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {}
  },

  dismissNotification: async (id) => {
    try {
      await fetch(`${API_BASE}/agent/notifications/${id}/dismiss`, { method: 'POST' });
      set(state => ({
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, dismissed_at: new Date().toISOString() } : n
        ),
      }));
    } catch {}
  },

  pause: async () => {
    try {
      const res = await fetch(`${API_BASE}/agent/pause`, { method: 'POST' });
      const data = await res.json();
      if (data.state) set({ agentState: data.state });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  resume: async () => {
    try {
      const res = await fetch(`${API_BASE}/agent/resume`, { method: 'POST' });
      const data = await res.json();
      if (data.state) set({ agentState: data.state });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  fetchActivity: async (limit = 50) => {
    try {
      const res = await fetch(`${API_BASE}/agent/activity?limit=${limit}`);
      const data = await res.json();
      set({ activity: data.activity || [] });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  toggleWorkPlanItem: (itemId) => {
    set(state => {
      const idx = state.skippedItems.indexOf(itemId);
      if (idx >= 0) {
        return { skippedItems: state.skippedItems.filter(id => id !== itemId) };
      }
      return { skippedItems: [...state.skippedItems, itemId] };
    });
  },

  subscribePush: async () => {
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      // Get VAPID public key
      const keyRes = await fetch(`${API_BASE}/agent/push/vapid-public-key`);
      const { key } = await keyRes.json();
      if (!key) return;

      // Subscribe via service worker
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key).buffer as ArrayBuffer,
      });

      // Send subscription to backend
      await fetch(`${API_BASE}/agent/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });
    } catch (err: any) {
      console.error('Push subscription failed:', err);
    }
  },
}));

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
