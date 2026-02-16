import { useEffect } from 'react';
import { useAgentStore } from '../../stores/agent';

const typeConfig: Record<string, { color: string; icon: string }> = {
  action_executed: { color: 'bg-green-500', icon: 'check_circle' },
  auto_executed: { color: 'bg-green-500', icon: 'bolt' },
  tool_executed: { color: 'bg-green-500', icon: 'build' },
  action_approved: { color: 'bg-green-500', icon: 'thumb_up' },
  action_rejected: { color: 'bg-red-500', icon: 'thumb_down' },
  briefing_generated: { color: 'bg-blue-500', icon: 'summarize' },
  message_sent: { color: 'bg-blue-500', icon: 'chat' },
  work_plan_approved: { color: 'bg-yellow-500', icon: 'task_alt' },
  state_change: { color: 'bg-yellow-500', icon: 'swap_horiz' },
};

export function ActivityTimeline() {
  const { activity, fetchActivity } = useAgentStore();

  useEffect(() => {
    fetchActivity(50);
  }, []);

  if (activity.length === 0) {
    return (
      <div className="bg-card-dark rounded-xl p-6 text-center">
        <span className="material-symbols-outlined text-[48px] text-gray-600">timeline</span>
        <p className="text-gray-400 mt-3">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="bg-card-dark rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Activity Timeline</h2>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gray-700" />

        <div className="space-y-3">
          {activity.map((entry: any) => {
            const config = typeConfig[entry.type] || { color: 'bg-gray-500', icon: 'circle' };
            const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const date = new Date(entry.timestamp).toLocaleDateString();

            return (
              <div key={entry.id} className="flex items-start gap-3 relative">
                {/* Time */}
                <div className="w-10 text-right flex-shrink-0">
                  <p className="text-xs text-gray-500 leading-none mt-1">{time}</p>
                </div>

                {/* Dot */}
                <div className={`w-3 h-3 rounded-full ${config.color} flex-shrink-0 mt-1 ring-2 ring-card-dark z-10`} />

                {/* Content */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[16px] ${
                      config.color.replace('bg-', 'text-').replace('-500', '-400')
                    }`}>
                      {config.icon}
                    </span>
                    <p className="text-sm text-gray-200 truncate">{entry.description}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-600">{date}</span>
                    {entry.action_type && (
                      <code className="text-xs text-purple-400">{entry.action_type}</code>
                    )}
                    {entry.tier && (
                      <span className={`text-xs ${
                        entry.tier === 1 ? 'text-green-400' :
                        entry.tier === 2 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        T{entry.tier}
                      </span>
                    )}
                    {entry.result && (
                      <span className={`text-xs ${
                        entry.result === 'success' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {entry.result}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
