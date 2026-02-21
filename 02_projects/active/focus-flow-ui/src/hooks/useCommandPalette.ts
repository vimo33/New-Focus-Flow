import { useState, useEffect, useCallback } from 'react';
import type { CanvasState } from '../stores/canvas';

interface RecentItem {
  id: string;
  label: string;
  type: 'project' | 'contact' | 'canvas';
  timestamp: Date;
}

const suggestedActionsMap: Partial<Record<CanvasState, string[]>> = {
  morning_briefing: ['Run revenue forecast', 'Draft outreach email', 'Review pending approvals', 'Show weekly report'],
  portfolio: ['Create new project', 'Evaluate idea backlog', 'Run council evaluation', 'Show financial overview'],
  network: ['Import LinkedIn contacts', 'Find warm leads', 'Draft outreach message'],
  settings: ['Change archetype', 'Update profile', 'Review memory'],
  financials: ['Run opportunity scan', 'Generate income strategies', 'Export report'],
};

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const trackNavigation = useCallback((item: Omit<RecentItem, 'timestamp'>) => {
    setRecentItems((prev) => {
      const filtered = prev.filter((r) => r.id !== item.id);
      return [{ ...item, timestamp: new Date() }, ...filtered].slice(0, 5);
    });
  }, []);

  const getSuggestedActions = useCallback((canvasState: CanvasState): string[] => {
    return suggestedActionsMap[canvasState] || ['Show morning briefing', 'Open portfolio'];
  }, []);

  return { open, setOpen, recentItems, trackNavigation, getSuggestedActions };
}
