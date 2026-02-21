import { Brain, FlaskConical, Hammer, TrendingUp, Zap, Bell } from 'lucide-react';
import { useModeStore, MODE_SUB_TABS, SUB_TAB_LABELS, type NitaraMode, MODE_LABELS } from '../../stores/mode';
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

export default function DockNav() {
  const { activeMode, activeSubTab, setMode, setSubTab } = useModeStore();
  const { pendingCount } = useApprovalStore();
  const subTabs = MODE_SUB_TABS[activeMode];

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
        {(Object.keys(MODE_ICONS) as NitaraMode[]).map((mode) => {
          const Icon = MODE_ICONS[mode];
          const isActive = activeMode === mode;

          return (
            <button
              key={mode}
              onClick={() => setMode(mode)}
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
        })}

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
