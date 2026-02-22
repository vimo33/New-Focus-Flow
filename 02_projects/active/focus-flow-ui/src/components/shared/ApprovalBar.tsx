interface ApprovalBarProps {
  message: string;
  agentName?: string;
  onApprove?: () => void;
  onReject?: () => void;
  onViewThread?: () => void;
}

export function ApprovalBar({ message, agentName = 'Nitara', onApprove, onReject, onViewThread }: ApprovalBarProps) {
  return (
    <div className="bg-tertiary/10 border border-tertiary/20 border-l-2 border-l-tertiary rounded-xl p-4 flex items-center gap-4">
      {/* Agent avatar */}
      <div className="w-10 h-10 rounded-full bg-tertiary/20 flex items-center justify-center flex-shrink-0">
        <span className="text-tertiary text-lg">{'\u2726'}</span>
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-tertiary text-xs font-semibold tracking-wider uppercase">{agentName}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
        </div>
        <p className="text-text-secondary text-sm mt-0.5 truncate">
          {'\u00BB'} {message}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {onViewThread && (
          <button
            onClick={onViewThread}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-tertiary/30 text-tertiary hover:bg-tertiary/10 transition-colors"
          >
            View Thread
          </button>
        )}
        {onReject && (
          <button
            onClick={onReject}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-danger/30 text-danger hover:bg-danger/10 transition-colors"
          >
            Reject
          </button>
        )}
        {onApprove && (
          <button
            onClick={onApprove}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-base hover:bg-primary/80 transition-colors"
          >
            Apply Actions
          </button>
        )}
      </div>
    </div>
  );
}
