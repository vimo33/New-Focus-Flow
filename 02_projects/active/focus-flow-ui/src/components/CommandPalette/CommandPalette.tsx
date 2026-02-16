import { Command } from 'cmdk';
import { useCommandPalette } from '../../hooks/useCommandPalette';
import { useCanvasStore } from '../../stores/canvas';
import { Sparkles, LayoutGrid, Network, Clock, Settings, Hash, AtSign, Slash } from 'lucide-react';

import './command-palette.css';

export default function CommandPalette() {
  const { open, setOpen, recentItems, getSuggestedActions } = useCommandPalette();
  const { activeCanvas, setCanvas } = useCanvasStore();
  const suggestedActions = getSuggestedActions(activeCanvas);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-base/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Palette */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[580px] max-h-[520px] bg-surface border border-[var(--glass-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <Command className="flex flex-col h-full" label="Command palette">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--glass-border)]">
            <span className="text-primary">✦</span>
            <Command.Input
              placeholder="Search projects, partners, or ask a question..."
              className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder-text-tertiary"
              autoFocus
            />
            <kbd className="px-2 py-0.5 bg-elevated rounded text-[10px] text-text-tertiary font-mono">⌘K</kbd>
          </div>

          {/* Results */}
          <Command.List className="flex-1 overflow-y-auto px-2 py-2 max-h-[400px]">
            <Command.Empty className="px-4 py-8 text-center text-text-tertiary text-sm">
              No results found.
            </Command.Empty>

            {/* Recent Context */}
            {recentItems.length > 0 && (
              <Command.Group heading="RECENT CONTEXT" className="mb-2">
                {recentItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.label}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm text-text-secondary data-[selected=true]:bg-[rgba(0,229,255,0.08)] data-[selected=true]:text-text-primary"
                  >
                    <span className="text-text-tertiary text-xs">
                      {item.type === 'project' ? '#' : item.type === 'contact' ? '@' : '✦'}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    <span className="text-text-tertiary text-[10px]">
                      {Math.round((Date.now() - item.timestamp.getTime()) / 60000)}m ago
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Suggested Actions */}
            <Command.Group heading="SUGGESTED ACTIONS" className="mb-2">
              {suggestedActions.map((action) => (
                <Command.Item
                  key={action}
                  value={action}
                  onSelect={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm text-text-secondary data-[selected=true]:bg-[rgba(0,229,255,0.08)] data-[selected=true]:text-text-primary"
                >
                  <Sparkles size={14} className="text-primary" />
                  <span>{action}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Navigation */}
            <Command.Group heading="NAVIGATION" className="mb-2">
              {[
                { label: 'Morning Briefing', icon: Sparkles, canvas: 'morning_briefing' as const },
                { label: 'Portfolio', icon: LayoutGrid, canvas: 'portfolio' as const },
                { label: 'Network', icon: Network, canvas: 'network' as const },
                { label: 'Calendar', icon: Clock, canvas: 'calendar' as const },
                { label: 'Settings', icon: Settings, canvas: 'settings' as const },
              ].map((item) => (
                <Command.Item
                  key={item.canvas}
                  value={item.label}
                  onSelect={() => {
                    setCanvas(item.canvas);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm text-text-secondary data-[selected=true]:bg-[rgba(0,229,255,0.08)] data-[selected=true]:text-text-primary"
                >
                  <item.icon size={14} className="text-text-tertiary" />
                  <span>{item.label}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Quick Actions */}
            <Command.Group heading="QUICK ACTIONS">
              {[
                'New Project',
                'New Idea',
                'Import LinkedIn contacts',
                'Run council evaluation',
              ].map((action) => (
                <Command.Item
                  key={action}
                  value={action}
                  onSelect={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm text-text-secondary data-[selected=true]:bg-[rgba(0,229,255,0.08)] data-[selected=true]:text-text-primary"
                >
                  <span className="text-text-tertiary text-xs">+</span>
                  <span>{action}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          {/* Bottom hint bar */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--glass-border)] text-[10px] text-text-tertiary">
            <span>↑↓ navigate</span>
            <span>↵ jump</span>
            <span><Slash size={10} className="inline" /> ask Nitara</span>
            <span><Hash size={10} className="inline" /> projects</span>
            <span><AtSign size={10} className="inline" /> people</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
