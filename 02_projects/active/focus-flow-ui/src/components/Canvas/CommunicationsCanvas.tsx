import { useEffect, useState } from 'react';
import { MessageSquare, Bell, Send, Activity } from 'lucide-react';
import { useAgentStore } from '../../stores/agent';
import { api } from '../../services/api';
import { GlassCard, StatCard } from '../shared';

export default function CommunicationsCanvas() {
  const { notifications, unreadCount, connectSSE, fetchNotifications, markRead, sendMessage, chatHistory, loading } = useAgentStore();
  const [threads, setThreads] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');

  useEffect(() => {
    connectSSE();
    fetchNotifications();
    loadThreads();
  }, []);

  async function loadThreads() {
    try {
      const res = await api.getThreads();
      setThreads(res.threads || []);
    } catch {}
  }

  async function handleSend() {
    if (!messageInput.trim()) return;
    const msg = messageInput;
    setMessageInput('');
    try {
      await sendMessage(msg);
    } catch {}
  }

  return (
    <div data-testid="canvas-comms" className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <MessageSquare size={20} className="text-primary" />
          Communications
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Notifications, agent messages, and activity
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard value={String(unreadCount)} label="Unread" />
        <StatCard value={String(notifications.length)} label="Total Notifications" />
        <StatCard value={String(threads.length)} label="Threads" />
      </div>

      {/* Quick Compose */}
      <GlassCard className="mb-6">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
          <Send size={14} className="text-primary" />
          Message Agent
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Send a message to the agent..."
            value={messageInput}
            onChange={e => setMessageInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-surface border border-white/10 rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600"
          />
          <button
            onClick={handleSend}
            disabled={loading || !messageInput.trim()}
            className="px-4 py-2.5 rounded-lg bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </div>
        {chatHistory.length > 0 && (
          <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
            {chatHistory.slice(-10).map((msg, i) => (
              <div key={i} className={`p-2 rounded text-xs ${
                msg.role === 'user' ? 'bg-primary/5 text-primary ml-8' : 'bg-white/[0.02] text-slate-300 mr-8'
              }`}>
                <span className="font-medium">{msg.role === 'user' ? 'You' : 'Agent'}:</span>{' '}
                {msg.content}
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Notification Center */}
      <GlassCard className="mb-6">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
          <Bell size={14} className="text-warning" />
          Notifications
          {unreadCount > 0 && (
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-warning/20 text-warning">
              {unreadCount} unread
            </span>
          )}
        </h2>
        {notifications.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No notifications yet</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {notifications.slice(0, 30).map(n => (
              <div
                key={n.id}
                onClick={() => !n.read_at && markRead(n.id)}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  n.read_at ? 'bg-white/[0.01]' : 'bg-primary/5 border border-primary/10'
                } hover:bg-white/[0.03]`}
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.read_at ? 'bg-slate-600' : 'bg-primary'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{n.title}</p>
                  <p className="text-xs text-slate-500 truncate">{n.body}</p>
                </div>
                <span className="text-[10px] text-slate-600 whitespace-nowrap">
                  {new Date(n.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Recent Threads */}
      <GlassCard>
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
          <Activity size={14} className="text-tertiary" />
          Recent Threads
        </h2>
        {threads.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No threads yet</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {threads.slice(0, 15).map((thread: any) => (
              <div key={thread.id} className="flex items-center gap-3 p-2 rounded hover:bg-white/[0.02]">
                <MessageSquare size={12} className="text-slate-500 shrink-0" />
                <p className="text-sm text-slate-300 flex-1 truncate">{thread.title || 'Untitled'}</p>
                <span className="text-[10px] text-slate-600">
                  {new Date(thread.updated_at || thread.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
