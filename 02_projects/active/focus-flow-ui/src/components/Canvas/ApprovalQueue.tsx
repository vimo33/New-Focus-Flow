import { useEffect } from 'react';
import { Shield, Check, X, AlertTriangle, Clock } from 'lucide-react';
import { useApprovalStore, type Approval } from '../../stores/approval';

const TIER_STYLES: Record<string, { bg: string; text: string; label: string; icon: React.ElementType }> = {
  tier1: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Tier 1 · Auto', icon: Check },
  tier2: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Tier 2 · Soft Gate', icon: AlertTriangle },
  tier3: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Tier 3 · Hard Gate', icon: Shield },
};

function ApprovalCard({ approval }: { approval: Approval }) {
  const tier = TIER_STYLES[approval.riskTier] || TIER_STYLES.tier2;
  const TierIcon = tier.icon;
  const { approveItem, rejectItem } = useApprovalStore();

  return (
    <div className="bg-[rgba(15,10,20,0.65)] backdrop-blur-[20px] border border-white/8 rounded-xl p-5 transition-all hover:border-white/15">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <TierIcon size={14} className={tier.text} />
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${tier.bg} ${tier.text}`}>
              {tier.label}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-slate-200 mt-2">{approval.actionSummary}</h3>
        </div>
        <div className="flex items-center gap-1 text-slate-500 text-xs">
          <Clock size={12} />
          {new Date(approval.createdAt).toLocaleString()}
        </div>
      </div>

      {approval.evidence && (
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">{approval.evidence}</p>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-white/5">
        <button
          onClick={() => approveItem(approval.id)}
          className="flex items-center gap-1 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/30 transition-colors"
        >
          <Check size={14} /> Approve
        </button>
        <button
          onClick={() => rejectItem(approval.id)}
          className="flex items-center gap-1 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 transition-colors"
        >
          <X size={14} /> Reject
        </button>
      </div>
    </div>
  );
}

export default function ApprovalQueue() {
  const { approvals, pendingCount, loading, fetchApprovals } = useApprovalStore();
  const pending = approvals.filter(a => a.status === 'pending');

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Shield size={20} className="text-amber-400" />
          Approval Queue
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {pendingCount} pending approvals
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-slate-500 text-sm">Loading approvals...</p>
        </div>
      ) : pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <Shield size={32} className="text-slate-600 mb-2" />
          <p className="text-slate-400 text-sm">No pending approvals</p>
          <p className="text-slate-600 text-xs mt-1">Agent actions requiring approval will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((approval) => (
            <ApprovalCard key={approval.id} approval={approval} />
          ))}
        </div>
      )}
    </div>
  );
}
