import { create } from 'zustand';
import { api } from '../services/api';

export interface Hypothesis {
  id: string;
  projectId: string;
  statement: string;
  type: 'problem' | 'solution' | 'channel' | 'pricing' | 'moat';
  confidence: number;
  evidenceRefs: string[];
  ownerAgent?: string;
  createdAt: string;
}

export interface ExperimentResults {
  baseline?: number;
  variant?: number;
  lift?: number;
  p_value?: number;
  sample_size?: number;
  confidence_interval?: [number, number];
}

export interface Experiment {
  id: string;
  projectId: string;
  hypothesisId?: string;
  metricName: string;
  metricDefinition?: string;
  successRule: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  resultsJson?: ExperimentResults;
  decision?: 'scale' | 'iterate' | 'pivot' | 'park' | 'kill';
  decisionRationale?: string;
  startAt?: string;
  endAt?: string;
  createdAt: string;
}

export interface Decision {
  id: string;
  projectId: string;
  experimentId?: string;
  action: 'scale' | 'iterate' | 'pivot' | 'park' | 'kill';
  rationale: string;
  evidenceJson: string[];
  assumptionsJson: string[];
  confidence: number;
  counterargumentsJson: string[];
  createdBy?: string;
  createdAt: string;
}

interface ExperimentStore {
  experiments: Experiment[];
  hypotheses: Hypothesis[];
  decisions: Decision[];
  loading: boolean;
  activeProjectId: string | null;

  setExperiments: (experiments: Experiment[]) => void;
  setHypotheses: (hypotheses: Hypothesis[]) => void;
  setDecisions: (decisions: Decision[]) => void;
  setLoading: (loading: boolean) => void;

  fetchExperiments: (projectId: string) => Promise<void>;
  fetchHypotheses: (projectId: string) => Promise<void>;
  createExperiment: (data: {
    projectId: string;
    hypothesisId?: string;
    metricName: string;
    metricDefinition?: string;
    successRule: string;
  }) => Promise<void>;
  recordDecision: (experimentId: string, decision: string, rationale: string) => Promise<void>;
}

export const useExperimentStore = create<ExperimentStore>((set, get) => ({
  experiments: [],
  hypotheses: [],
  decisions: [],
  loading: false,
  activeProjectId: null,

  setExperiments: (experiments) => set({ experiments }),
  setHypotheses: (hypotheses) => set({ hypotheses }),
  setDecisions: (decisions) => set({ decisions }),
  setLoading: (loading) => set({ loading }),

  fetchExperiments: async (projectId: string) => {
    set({ loading: true, activeProjectId: projectId });
    try {
      const { experiments } = await api.getExperimentsV2(projectId);
      set({ experiments: experiments || [], loading: false });
    } catch (err) {
      console.error('Failed to fetch experiments:', err);
      set({ loading: false });
    }
  },

  fetchHypotheses: async (projectId: string) => {
    try {
      const { hypotheses } = await api.getHypotheses(projectId);
      set({ hypotheses: hypotheses || [] });
    } catch (err) {
      console.error('Failed to fetch hypotheses:', err);
    }
  },

  createExperiment: async (data) => {
    try {
      await api.createExperimentV2(data);
      // Refresh the list
      const projectId = get().activeProjectId;
      if (projectId) {
        const { experiments } = await api.getExperimentsV2(projectId);
        set({ experiments: experiments || [] });
      }
    } catch (err) {
      console.error('Failed to create experiment:', err);
    }
  },

  recordDecision: async (experimentId: string, decision: string, rationale: string) => {
    try {
      await api.recordExperimentDecision(experimentId, {
        decision: decision as any,
        rationale,
      });
      // Refresh
      const projectId = get().activeProjectId;
      if (projectId) {
        const { experiments } = await api.getExperimentsV2(projectId);
        set({ experiments: experiments || [] });
      }
    } catch (err) {
      console.error('Failed to record decision:', err);
    }
  },
}));
