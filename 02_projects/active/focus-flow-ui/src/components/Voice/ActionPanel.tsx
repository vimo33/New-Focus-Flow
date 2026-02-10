interface SuggestedAction {
  id: string;
  type: 'navigation' | 'create' | 'query' | 'update' | 'delete' | 'conversation' | 'reschedule' | 'focus_block' | 'task' | 'event';
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface ActionPanelProps {
  actions: SuggestedAction[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function ActionPanel({ actions, onApprove, onReject }: ActionPanelProps) {
  const pendingActions = actions.filter((a) => a.status === 'pending');
  const completedActions = actions.filter((a) => a.status !== 'pending');

  // Get action styling based on type (destructive actions are red)
  const getActionStyling = (action: SuggestedAction) => {
    if (action.type === 'delete') {
      return {
        approveClass: 'bg-red-500 hover:bg-red-600 shadow-red-500/20',
        borderClass: 'border-red-700',
        bgClass: 'bg-red-900/20'
      };
    }
    if (action.type === 'update') {
      return {
        approveClass: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
        borderClass: 'border-amber-700',
        bgClass: 'bg-amber-900/20'
      };
    }
    return {
      approveClass: 'bg-primary hover:bg-primary-dark shadow-blue-500/20',
      borderClass: 'border-slate-700',
      bgClass: 'bg-[#1e2936]'
    };
  };

  return (
    <section className="hidden xl:flex flex-col w-72 border-l border-slate-800 bg-[#111a22]/50 p-5 overflow-y-auto shrink-0">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white font-medium text-sm">Suggested Actions</h3>
        {pendingActions.length > 0 && (
          <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-0.5 rounded">
            {pendingActions.length}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {pendingActions.length === 0 && completedActions.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-slate-500 text-[20px]">
                check_circle
              </span>
            </div>
            <p className="text-slate-400 text-xs">No pending actions</p>
            <p className="text-slate-600 text-xs mt-1">
              Actions will appear as you chat
            </p>
          </div>
        ) : (
          <>
            {pendingActions.map((action) => {
              const styling = getActionStyling(action);
              return (
              <div
                key={action.id}
                className={`group relative flex flex-col gap-3 rounded-xl border ${styling.borderClass} ${styling.bgClass} p-4 hover:border-slate-600 transition-colors`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex items-center justify-center w-9 h-9 rounded-lg ${action.iconBg} ${action.iconColor}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {action.icon}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-white text-sm font-semibold leading-tight truncate">
                      {action.title}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">{action.subtitle}</p>
                  </div>
                </div>
                <div className="bg-background-dark rounded-lg p-2.5 border border-slate-800">
                  <p className="text-slate-300 text-xs">{action.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onReject(action.id)}
                    className="flex-1 flex items-center justify-center gap-1 bg-[#2d3b4e] hover:bg-[#38485e] text-slate-200 text-xs font-medium py-2 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                    Reject
                  </button>
                  <button
                    onClick={() => onApprove(action.id)}
                    className={`flex-1 flex items-center justify-center gap-1 ${styling.approveClass} text-white text-xs font-medium py-2 rounded-lg transition-colors shadow-lg`}
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    {action.type === 'delete' ? 'Confirm' : 'Approve'}
                  </button>
                </div>
              </div>
            )})}

            {completedActions.map((action) => (
              <div
                key={action.id}
                className="opacity-50 hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-3 py-2 px-3 border-b border-slate-800">
                  <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-400 text-[12px]">
                      {action.status === 'approved' ? 'check' : 'close'}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-slate-300 text-xs line-through decoration-slate-500 truncate">
                      {action.title}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {action.status === 'approved' ? 'Approved' : 'Rejected'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
