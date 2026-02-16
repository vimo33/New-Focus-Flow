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
  previousCanvasParams: Record<string, string>;
  setCanvas: (canvas: CanvasState, params?: Record<string, string>) => void;
  goBack: () => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  activeCanvas: 'morning_briefing',
  canvasParams: {},
  previousCanvas: null,
  previousCanvasParams: {},
  setCanvas: (canvas, params = {}) => {
    const current = get().activeCanvas;
    const currentParams = get().canvasParams;
    set({
      activeCanvas: canvas,
      canvasParams: params,
      previousCanvas: current,
      previousCanvasParams: currentParams,
    });
  },
  goBack: () => {
    const prev = get().previousCanvas;
    const prevParams = get().previousCanvasParams;
    if (prev) {
      set({
        activeCanvas: prev,
        previousCanvas: null,
        canvasParams: prevParams,
        previousCanvasParams: {},
      });
    }
  },
}));
