import { create } from 'zustand';

export type CanvasState =
  | 'morning_briefing'
  | 'portfolio'
  | 'network'
  | 'financials'
  | 'project_detail'
  | 'calendar'
  | 'settings'
  | 'council_evaluation'
  | 'weekly_report'
  | 'onboarding'
  | 'marketing';

interface CanvasStore {
  activeCanvas: CanvasState;
  canvasParams: Record<string, string>;
  previousCanvas: CanvasState | null;
  setCanvas: (canvas: CanvasState, params?: Record<string, string>) => void;
  goBack: () => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  activeCanvas: 'morning_briefing',
  canvasParams: {},
  previousCanvas: null,
  setCanvas: (canvas, params = {}) => {
    const current = get().activeCanvas;
    set({
      activeCanvas: canvas,
      canvasParams: params,
      previousCanvas: current,
    });
  },
  goBack: () => {
    const prev = get().previousCanvas;
    if (prev) {
      set({
        activeCanvas: prev,
        previousCanvas: null,
        canvasParams: {},
      });
    }
  },
}));
