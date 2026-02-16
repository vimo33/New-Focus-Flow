import { useEffect, useRef, useState } from 'react';
import { useAgentStore } from '../../stores/agent';
import { ApprovalCard } from './ApprovalCard';

interface AgentPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AgentPanel({ open, onClose }: AgentPanelProps) {
  const {
    agentState,
    notifications,
    unreadCount,
    connected,
    loading,
    chatHistory,
    skippedItems,
    connectSSE,
    fetchState,
    fetchNotifications,
    generateBriefing,
    approveRequest,
    rejectRequest,
    approveWorkPlanWithSkips,
    sendMessage,
    markRead,
    pause,
    resume,
    toggleWorkPlanItem,
    subscribePush,
  } = useAgentStore();

  const [message, setMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      connectSSE();
      fetchState();
      fetchNotifications();
    }
    return () => {
      // Don't disconnect on panel close — keep SSE for badge count
    };
  }, [open]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const statusColors: Record<string, string> = {
    idle: 'bg-gray-500',
    generating_briefing: 'bg-blue-500 animate-pulse',
    awaiting_approval: 'bg-yellow-500',
    executing: 'bg-green-500 animate-pulse',
    paused: 'bg-orange-500',
    end_of_day: 'bg-purple-500',
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    const msg = message;
    setMessage('');
    try {
      await sendMessage(msg);
    } catch {}
  };

  const handleGenerateBriefing = async () => {
    try {
      await generateBriefing();
    } catch {}
  };

  const isPaused = agentState?.status === 'paused';

  if (!open) return null;

  const pendingApprovals = agentState?.pending_approvals?.filter(a => a.status === 'pending') || [];
  const recentNotifications = notifications.filter(n => !n.dismissed_at).slice(0, 10);
  const workPlan = agentState?.active_work_plan;
  const showWorkPlanToggles = workPlan && !workPlan.approved;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-surface-dark border-l border-gray-700 z-50 flex flex-col shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${statusColors[agentState?.status || 'idle']}`} />
          <div>
            <h2 className="text-white font-semibold text-sm">Co-CEO Agent</h2>
            <p className="text-xs text-gray-400 capitalize">{agentState?.status?.replace(/_/g, ' ') || 'initializing'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Push notification enable */}
          <button
            onClick={subscribePush}
            className="text-gray-400 hover:text-white p-1 rounded"
            title="Enable push notifications"
          >
            <span className="material-symbols-outlined text-[18px]">notifications_active</span>
          </button>
          {/* Pause/Resume */}
          <button
            onClick={isPaused ? resume : pause}
            className="text-gray-400 hover:text-white p-1 rounded"
            title={isPaused ? 'Resume agent' : 'Pause agent'}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isPaused ? 'play_arrow' : 'pause'}
            </span>
          </button>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} title={connected ? 'Connected' : 'Disconnected'} />
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick Actions */}
        <div className="space-y-2">
          <h3 className="text-xs text-gray-500 uppercase font-medium">Quick Actions</h3>
          <button
            onClick={handleGenerateBriefing}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/80 disabled:opacity-50 text-white text-sm py-2 px-3 rounded flex items-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">summarize</span>
            {loading ? 'Generating...' : 'Generate Briefing'}
          </button>
        </div>

        {/* Daily Stats */}
        {agentState?.daily_stats && (
          <div>
            <h3 className="text-xs text-gray-500 uppercase font-medium mb-2">Today</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-card-dark rounded p-2 text-center">
                <p className="text-lg font-bold text-white">{agentState.daily_stats.actions_executed}</p>
                <p className="text-xs text-gray-400">Executed</p>
              </div>
              <div className="bg-card-dark rounded p-2 text-center">
                <p className="text-lg font-bold text-white">{agentState.daily_stats.briefings_generated}</p>
                <p className="text-xs text-gray-400">Briefings</p>
              </div>
              <div className="bg-card-dark rounded p-2 text-center">
                <p className="text-lg font-bold text-white">{agentState.daily_stats.ai_calls_made}</p>
                <p className="text-xs text-gray-400">AI Calls</p>
              </div>
            </div>
          </div>
        )}

        {/* Work Plan Item Toggles */}
        {showWorkPlanToggles && (
          <div>
            <h3 className="text-xs text-gray-500 uppercase font-medium mb-2">
              Work Plan ({workPlan.items.length} items)
            </h3>
            <div className="space-y-1">
              {workPlan.items.map((item: any) => {
                const isSkipped = skippedItems.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
                      isSkipped ? 'bg-card-dark/30 opacity-50' : 'bg-card-dark'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!isSkipped}
                      onChange={() => toggleWorkPlanItem(item.id)}
                      className="mt-0.5 accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${isSkipped ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {item.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <code className="text-xs text-purple-400">{item.action}</code>
                        <span className={`text-xs ${
                          item.trust_tier === 1 ? 'text-green-400' :
                          item.trust_tier === 2 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          T{item.trust_tier}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <button
              onClick={() => approveWorkPlanWithSkips(workPlan.id)}
              className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded flex items-center justify-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Approve Plan {skippedItems.length > 0 && `(${skippedItems.length} skipped)`}
            </button>
          </div>
        )}

        {/* Pending Approvals */}
        {pendingApprovals.length > 0 && (
          <div>
            <h3 className="text-xs text-gray-500 uppercase font-medium mb-2">
              Pending Approvals ({pendingApprovals.length})
            </h3>
            <div className="space-y-2">
              {pendingApprovals.map(approval => (
                <ApprovalCard
                  key={approval.id}
                  approval={approval}
                  onApprove={(id, fb) => approveRequest(id, fb)}
                  onReject={(id, fb) => rejectRequest(id, fb)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Notifications */}
        <div>
          <h3 className="text-xs text-gray-500 uppercase font-medium mb-2">
            Notifications {unreadCount > 0 && <span className="text-primary">({unreadCount})</span>}
          </h3>
          {recentNotifications.length === 0 ? (
            <p className="text-sm text-gray-500">No notifications yet</p>
          ) : (
            <div className="space-y-1">
              {recentNotifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.read_at && markRead(n.id)}
                  className={`p-2 rounded cursor-pointer transition-colors ${
                    n.read_at ? 'bg-card-dark/50' : 'bg-card-dark border border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <p className={`text-sm ${n.read_at ? 'text-gray-400' : 'text-white'}`}>{n.title}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      n.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                      n.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {n.priority}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{n.body.slice(0, 100)}</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {new Date(n.created_at).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat History */}
        {chatHistory.length > 0 && (
          <div>
            <h3 className="text-xs text-gray-500 uppercase font-medium mb-2">Chat</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 ${
                      msg.role === 'user'
                        ? 'bg-primary text-white'
                        : 'bg-card-dark text-gray-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs mt-1 opacity-50">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask the agent..."
            className="flex-1 bg-card-dark text-sm text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-primary focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={loading || !message.trim()}
            className="bg-primary hover:bg-primary/80 disabled:opacity-50 text-white px-3 py-2 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
