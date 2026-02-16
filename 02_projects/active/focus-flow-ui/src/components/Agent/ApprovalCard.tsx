import { useState } from 'react';

interface ApprovalCardProps {
  approval: {
    id: string;
    tier: number;
    action: { type: string; description: string; project_id?: string };
    context: string;
    reasoning: string;
    created_at: string;
    expires_at?: string;
    status: string;
  };
  onApprove: (id: string, feedback?: string) => void;
  onReject: (id: string, feedback?: string) => void;
}

export function ApprovalCard({ approval, onApprove, onReject }: ApprovalCardProps) {
  const [feedback, setFeedback] = useState('');
  const [expanded, setExpanded] = useState(false);

  const tierColors: Record<number, string> = {
    1: 'bg-green-500/20 text-green-400 border-green-500/30',
    2: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    3: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const tierLabels: Record<number, string> = {
    1: 'Auto',
    2: 'Delayed',
    3: 'Gate',
  };

  // Tier 2 countdown
  let countdown = '';
  if (approval.tier === 2 && approval.expires_at) {
    const remaining = new Date(approval.expires_at).getTime() - Date.now();
    if (remaining > 0) {
      const mins = Math.floor(remaining / 60000);
      countdown = `${mins}m remaining`;
    } else {
      countdown = 'Auto-executing...';
    }
  }

  return (
    <div className="bg-card-dark rounded-lg border border-gray-700 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded border ${tierColors[approval.tier] || tierColors[3]}`}>
              Tier {approval.tier}: {tierLabels[approval.tier]}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(approval.created_at).toLocaleTimeString()}
            </span>
            {countdown && (
              <span className="text-xs text-yellow-400">{countdown}</span>
            )}
          </div>
          <p className="text-sm text-white font-medium">{approval.action.description}</p>
          <p className="text-xs text-gray-400 mt-1">
            Action: <code className="text-purple-400">{approval.action.type}</code>
            {approval.action.project_id && (
              <> | Project: <code className="text-blue-400">{approval.action.project_id}</code></>
            )}
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-white ml-2"
        >
          <span className="material-symbols-outlined text-[18px]">
            {expanded ? 'expand_less' : 'expand_more'}
          </span>
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          <div>
            <p className="text-xs text-gray-500 uppercase">Context</p>
            <p className="text-sm text-gray-300">{approval.context}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Reasoning</p>
            <p className="text-sm text-gray-300">{approval.reasoning}</p>
          </div>
        </div>
      )}

      {approval.status === 'pending' && (
        <div className="mt-3 space-y-2">
          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Optional feedback..."
            className="w-full bg-background-dark text-sm text-white rounded px-3 py-1.5 border border-gray-600 focus:border-primary focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(approval.id, feedback || undefined)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-1.5 px-3 rounded transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => onReject(approval.id, feedback || undefined)}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-1.5 px-3 rounded transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
