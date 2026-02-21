import { Brain, FlaskConical, Hammer, TrendingUp, Zap, Bell, Mic } from 'lucide-react';
import { useModeStore, MODE_SUB_TABS, SUB_TAB_LABELS, type NitaraMode, MODE_LABELS } from '../../stores/mode';
import { useCanvasStore } from '../../stores/canvas';
import { useApprovalStore } from '../../stores/approval';

const MODE_ICONS: Record<NitaraMode, React.ElementType> = {
  think: Brain,
  validate: FlaskConical,
  build: Hammer,
  grow: TrendingUp,
  leverage: Zap,
};

const MODE_COLORS: Record<NitaraMode, string> = {
  think: 'text-indigo-400',
  validate: 'text-amber-400',
  build: 'text-indigo-400',
  grow: 'text-emerald-400',
  leverage: 'text-cyan-400',
};

const MODE_GLOW: Record<NitaraMode, string> = {
  think: 'shadow-indigo-500/20',
  validate: 'shadow-amber-500/20',
  build: 'shadow-indigo-500/20',
  grow: 'shadow-emerald-500/20',
  leverage: 'shadow-cyan-500/20',
};

const LEFT_MODES: NitaraMode[] = ['think', 'validate'];
const RIGHT_MODES: NitaraMode[] = ['build', 'grow', 'leverage'];

function ModeButton({ mode, isActive, pendingCount, onClick }: {
  mode: NitaraMode;
  isActive: boolean;
  pendingCount: number;
  onClick: () => void;
}) {
  const Icon = MODE_ICONS[mode];
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-200 ${
        isActive
          ? `${MODE_COLORS[mode]} bg-white/10 shadow-lg ${MODE_GLOW[mode]}`
          : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
      }`}
      title={MODE_LABELS[mode]}
    >
      <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
      <span className="text-[9px] mt-0.5 font-medium tracking-wider uppercase">
        {MODE_LABELS[mode]}
      </span>

      {/* Notification badge for Build mode approvals */}
      {mode === 'build' && pendingCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-[8px] font-bold text-black">
          {pendingCount > 9 ? '9+' : pendingCount}
        </span>
      )}
    </button>
  );
}

export default function DockNav() {
  const { activeMode, activeSubTab, setMode, setSubTab } = useModeStore();
  const { activeCanvas, setCanvas } = useCanvasStore();
  const { pendingCount } = useApprovalStore();
  const subTabs = MODE_SUB_TABS[activeMode];
  const isVoiceActive = activeCanvas === 'voice_console';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Sub-tab bar */}
      <div className="flex items-center justify-center gap-1 px-4 py-1.5 bg-[rgba(15,10,20,0.6)] backdrop-blur-sm border-t border-white/5">
        {subTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`px-3 py-1 rounded-md text-xs font-medium tracking-wide uppercase transition-all ${
              activeSubTab === tab
                ? `${MODE_COLORS[activeMode]} bg-white/10`
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            {SUB_TAB_LABELS[tab] || tab}
          </button>
        ))}
      </div>

      {/* Main dock */}
      <nav
        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[rgba(15,10,20,0.85)] backdrop-blur-[40px] border-t border-white/10"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
      >
        {/* Left mode group */}
        {LEFT_MODES.map((mode) => (
          <ModeButton
            key={mode}
            mode={mode}
            isActive={activeMode === mode}
            pendingCount={pendingCount}
            onClick={() => setMode(mode)}
          />
        ))}

        {/* Center Voice button */}
        <button
          onClick={() => setCanvas('voice_console')}
          className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200 ${
            isVoiceActive
              ? 'border-primary bg-primary/20 text-primary shadow-lg shadow-primary/25'
              : 'border-white/20 text-slate-400 hover:text-primary hover:border-primary/50 hover:bg-primary/10'
          }`}
          title="Voice Console"
        >
          <Mic size={20} strokeWidth={isVoiceActive ? 2.5 : 1.5} />
          {isVoiceActive && (
            <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30" />
          )}
        </button>

        {/* Right mode group */}
        {RIGHT_MODES.map((mode) => (
          <ModeButton
            key={mode}
            mode={mode}
            isActive={activeMode === mode}
            pendingCount={pendingCount}
            onClick={() => setMode(mode)}
          />
        ))}

        {/* Notification bell */}
        <button
          className="flex flex-col items-center justify-center w-10 h-14 text-slate-500 hover:text-slate-300 transition-colors"
          title="Notifications"
        >
          <Bell size={18} />
        </button>
      </nav>
    </div>
  );
}
