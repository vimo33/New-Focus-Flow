import { TrendingUp, RefreshCw, GitBranch, ParkingSquare, Skull } from 'lucide-react';

type DecisionAction = 'scale' | 'iterate' | 'pivot' | 'park' | 'kill';

interface DecisionGateCardProps {
  onDecide: (action: DecisionAction) => void;
  disabled?: boolean;
  compact?: boolean;
}

const ACTIONS: { action: DecisionAction; icon: React.ElementType; label: string; color: string; bgColor: string }[] = [
  { action: 'scale', icon: TrendingUp, label: 'Scale', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/20' },
  { action: 'iterate', icon: RefreshCw, label: 'Iterate', color: 'text-indigo-400', bgColor: 'bg-indigo-500/20 hover:bg-indigo-500/30 border-indigo-500/20' },
  { action: 'pivot', icon: GitBranch, label: 'Pivot', color: 'text-amber-400', bgColor: 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/20' },
  { action: 'park', icon: ParkingSquare, label: 'Park', color: 'text-slate-400', bgColor: 'bg-slate-500/20 hover:bg-slate-500/30 border-slate-500/20' },
  { action: 'kill', icon: Skull, label: 'Kill', color: 'text-red-400', bgColor: 'bg-red-500/20 hover:bg-red-500/30 border-red-500/20' },
];

export default function DecisionGateCard({ onDecide, disabled, compact }: DecisionGateCardProps) {
  return (
    <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
      {ACTIONS.map(({ action, icon: Icon, label, color, bgColor }) => (
        <button
          key={action}
          onClick={() => onDecide(action)}
          disabled={disabled}
          className={`flex items-center gap-1 rounded-lg border font-medium transition-all ${color} ${bgColor} ${
            disabled ? 'opacity-40 cursor-not-allowed' : ''
          } ${compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'}`}
        >
          <Icon size={compact ? 10 : 12} />
          {label}
        </button>
      ))}
    </div>
  );
}
