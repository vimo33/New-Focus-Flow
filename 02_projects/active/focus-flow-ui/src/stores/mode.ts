import { create } from 'zustand';

export type NitaraMode = 'think' | 'validate' | 'build' | 'grow' | 'leverage';

export type SubTab = string;

interface ModeSubTabs {
  think: ['ventures', 'insights', 'finance', 'comms'];
  validate: ['stack', 'variant-testing', 'data-sources'];
  build: ['build', 'control', 'agents', 'data', 'tune'];
  grow: ['resources', 'kpis', 'simulation', 'market'];
  leverage: ['network', 'playbooks', 'tools', 'partnerships'];
}

export const MODE_SUB_TABS: ModeSubTabs = {
  think: ['ventures', 'insights', 'finance', 'comms'],
  validate: ['stack', 'variant-testing', 'data-sources'],
  build: ['build', 'control', 'agents', 'data', 'tune'],
  grow: ['resources', 'kpis', 'simulation', 'market'],
  leverage: ['network', 'playbooks', 'tools', 'partnerships'],
};

export const MODE_LABELS: Record<NitaraMode, string> = {
  think: 'Think',
  validate: 'Validate',
  build: 'Build',
  grow: 'Grow',
  leverage: 'Leverage',
};

export const SUB_TAB_LABELS: Record<string, string> = {
  ventures: 'Ventures',
  insights: 'Insights',
  finance: 'Finance',
  comms: 'Comms',
  stack: 'Stack',
  'variant-testing': 'Variant Testing',
  'data-sources': 'Data Sources',
  build: 'Build',
  control: 'Control',
  agents: 'Agents',
  data: 'Data',
  tune: 'Tune',
  resources: 'Resources',
  kpis: 'KPIs',
  simulation: 'Simulation',
  market: 'Market',
  network: 'Network',
  playbooks: 'Playbooks',
  tools: 'Tools',
  partnerships: 'Partnerships',
};

interface ModeStore {
  activeMode: NitaraMode;
  activeSubTab: SubTab;
  canvasParams: Record<string, string>;
  setMode: (mode: NitaraMode) => void;
  setSubTab: (subTab: SubTab) => void;
  setModeAndTab: (mode: NitaraMode, subTab: SubTab, params?: Record<string, string>) => void;
}

export const useModeStore = create<ModeStore>((set) => ({
  activeMode: 'think',
  activeSubTab: 'ventures',
  canvasParams: {},
  setMode: (mode) =>
    set({
      activeMode: mode,
      activeSubTab: MODE_SUB_TABS[mode][0],
      canvasParams: {},
    }),
  setSubTab: (subTab) => set({ activeSubTab: subTab }),
  setModeAndTab: (mode, subTab, params = {}) =>
    set({ activeMode: mode, activeSubTab: subTab, canvasParams: params }),
}));

if (import.meta.env.DEV) {
  (window as any).__ZUSTAND_MODE_STORE__ = useModeStore;
}
