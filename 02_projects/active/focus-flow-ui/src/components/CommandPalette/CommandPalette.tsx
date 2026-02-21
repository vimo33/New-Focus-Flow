import { Command } from 'cmdk';
import { useCommandPalette } from '../../hooks/useCommandPalette';
import { useCanvasStore } from '../../stores/canvas';
import { api } from '../../services/api';
import { Sparkles, LayoutGrid, Network, Clock, Settings, DollarSign, FolderKanban, User, Plus, CornerDownLeft, Radio } from 'lucide-react';

import './command-palette.css';

const ENTITY_ICON_MAP: Record<string, { Icon: typeof FolderKanban; bg: string; color: string }> = {
  project: { Icon: FolderKanban, bg: 'bg-primary/15', color: 'text-primary' },
  contact: { Icon: User, bg: 'bg-tertiary/15', color: 'text-tertiary' },
  idea: { Icon: Sparkles, bg: 'bg-secondary/15', color: 'text-secondary' },
};

export default function CommandPalette() {
  const { open, setOpen, recentItems, getSuggestedActions } = useCommandPalette();
  const { activeCanvas, setCanvas } = useCanvasStore();
  const suggestedActions = getSuggestedActions(activeCanvas);

  if (!open) return null;

  const handleQuickAction = async (action: string) => {
    setOpen(false);
    switch (action) {
      case 'New Project': {
        const res = await api.createProject({ title: 'Untitled Project' }).catch(console.error);
        if (res?.project?.id) {
          setCanvas('project_detail', { projectId: res.project.id });
        }
        break;
      }
      case 'New Idea': {
        await api.createIdea({ title: 'New Idea', description: '' }).catch(console.error);
        setCanvas('portfolio');
        break;
      }
      case 'Import LinkedIn contacts': {
        setCanvas('network');
        break;
      }
      case 'Run council evaluation': {
        setCanvas('portfolio');
        break;
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-base/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Palette */}
      <div className="absolute top-[10%] md:top-[20%] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[580px] max-h-[520px] bg-surface border border-[var(--glass-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <Command className="flex flex-col h-full" label="Command palette">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--glass-border)]">
            <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Sparkles size={13} className="text-primary" />
            </div>
            <Command.Input
              placeholder="Search projects, partners, or ask a question..."
              className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder-text-tertiary"
              autoFocus
            />
            <kbd className="px-2 py-0.5 bg-elevated rounded text-[10px] text-text-tertiary font-mono border border-[var(--glass-border)]">{'\u2318'}K</kbd>
          </div>

          {/* Results */}
          <Command.List className="flex-1 overflow-y-auto px-2 py-2 max-h-[400px]">
            <Command.Empty className="px-4 py-8 text-center text-text-tertiary text-sm">
              No results found.
            </Command.Empty>

            {/* Recent Context */}
            {recentItems.length > 0 && (
              <Command.Group heading="RECENT CONTEXT" className="mb-2">
                {recentItems.map((item) => {
                  const entity = ENTITY_ICON_MAP[item.type] || ENTITY_ICON_MAP.idea;
                  return (
                    <Command.Item
                      key={item.id}
                      value={item.label}
                      className="cmd-item flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm text-text-secondary data-[selected=true]:bg-[rgba(0,229,255,0.08)] data-[selected=true]:text-text-primary group"
                    >
                      <div className={`w-6 h-6 rounded-md ${entity.bg} flex items-center justify-center flex-shrink-0`}>
                        <entity.Icon size={13} className={entity.color} />
                      </div>
                      <span className="flex-1 truncate">{item.label}</span>
                      <span className="text-text-tertiary text-[10px] group-data-[selected=true]:hidden">
                        {Math.round((Date.now() - item.timestamp.getTime()) / 60000)}m ago
                      </span>
                      <CornerDownLeft size={12} className="text-primary hidden group-data-[selected=true]:block flex-shrink-0" />
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}

            {/* Suggested Actions — chip layout */}
            <Command.Group heading="SUGGESTED ACTIONS" className="mb-2">
              <div className="flex flex-wrap gap-2 px-3 py-1">
                {suggestedActions.map((action) => (
                  <Command.Item
                    key={action}
                    value={action}
                    onSelect={() => setOpen(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs text-text-secondary cursor-pointer hover:bg-primary/10 hover:text-text-primary data-[selected=true]:bg-primary/15 data-[selected=true]:text-primary data-[selected=true]:border-primary/40 transition-colors"
                  >
                    <Sparkles size={11} className="text-primary flex-shrink-0" />
                    <span>{action}</span>
                  </Command.Item>
                ))}
              </div>
            </Command.Group>

            {/* Navigation */}
            <Command.Group heading="NAVIGATION" className="mb-2">
              {[
                { label: 'Morning Briefing', icon: Sparkles, canvas: 'morning_briefing' as const },
                { label: 'Voice Console', icon: Radio, canvas: 'voice_console' as const },
                { label: 'Portfolio', icon: LayoutGrid, canvas: 'portfolio' as const },
                { label: 'Network', icon: Network, canvas: 'network' as const },
                { label: 'Financials', icon: DollarSign, canvas: 'financials' as const },
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
                  className="cmd-item flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm text-text-secondary data-[selected=true]:bg-[rgba(0,229,255,0.08)] data-[selected=true]:text-text-primary group"
                >
                  <div className="w-6 h-6 rounded-md bg-elevated flex items-center justify-center flex-shrink-0">
                    <item.icon size={13} className="text-text-tertiary" />
                  </div>
                  <span className="flex-1">{item.label}</span>
                  <CornerDownLeft size={12} className="text-primary hidden group-data-[selected=true]:block flex-shrink-0" />
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
                  onSelect={() => handleQuickAction(action)}
                  className="cmd-item flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm text-text-secondary data-[selected=true]:bg-[rgba(0,229,255,0.08)] data-[selected=true]:text-text-primary group"
                >
                  <div className="w-6 h-6 rounded-md bg-success/15 flex items-center justify-center flex-shrink-0">
                    <Plus size={13} className="text-success" />
                  </div>
                  <span className="flex-1">{action}</span>
                  <CornerDownLeft size={12} className="text-primary hidden group-data-[selected=true]:block flex-shrink-0" />
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          {/* Bottom hint bar — structured kbd elements */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-t border-[var(--glass-border)] text-[10px] text-text-tertiary">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-elevated rounded border border-[var(--glass-border)] font-mono">{'\u2191\u2193'}</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-elevated rounded border border-[var(--glass-border)] font-mono">{'\u21B5'}</kbd>
              jump
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-elevated rounded border border-[var(--glass-border)] font-mono">/</kbd>
              ask Nitara
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-elevated rounded border border-[var(--glass-border)] font-mono">#</kbd>
              projects
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-elevated rounded border border-[var(--glass-border)] font-mono">@</kbd>
              people
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
