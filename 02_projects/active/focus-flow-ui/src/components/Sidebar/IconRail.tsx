import { useState, useEffect } from 'react';
import { Sparkles, LayoutGrid, Network, Clock, Settings } from 'lucide-react';
import { useCanvasStore, type CanvasState } from '../../stores/canvas';

interface SidebarItem {
  id: CanvasState;
  icon: React.ElementType;
  label: string;
}

const items: SidebarItem[] = [
  { id: 'morning_briefing', icon: Sparkles, label: 'Nitara' },
  { id: 'portfolio', icon: LayoutGrid, label: 'Portfolio' },
  { id: 'network', icon: Network, label: 'Network' },
  { id: 'calendar', icon: Clock, label: 'Calendar' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export default function IconRail() {
  const { activeCanvas, setCanvas } = useCanvasStore();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+\ or [ to toggle rail
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setCollapsed(prev => !prev);
      }
      if (e.key === '[' && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        setCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (collapsed) return null;

  // Map some canvas states to their sidebar item
  const activeItem = (() => {
    switch (activeCanvas) {
      case 'morning_briefing':
      case 'financials':
      case 'council_evaluation':
      case 'weekly_report':
        return 'morning_briefing';
      case 'portfolio':
      case 'project_detail':
        return 'portfolio';
      default:
        return activeCanvas;
    }
  })();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-12 flex flex-col items-center py-4 bg-surface border-r border-[var(--glass-border)]">
      {items.map((item) => {
        const isActive = activeItem === item.id;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            onClick={() => setCanvas(item.id)}
            className={`relative w-10 h-10 flex items-center justify-center rounded-lg mb-2 transition-all duration-150 group ${
              isActive
                ? 'text-primary glow-cyan'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-elevated/50'
            }`}
            title={item.label}
          >
            {/* Active left accent bar */}
            {isActive && (
              <div className="absolute left-0 top-1 bottom-1 w-1 rounded-r bg-primary" />
            )}
            <Icon size={20} />

            {/* Tooltip */}
            <div className="absolute left-14 px-2 py-1 bg-elevated rounded-md text-xs text-text-primary whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
              {item.label}
            </div>
          </button>
        );
      })}
    </aside>
  );
}
