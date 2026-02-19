import { create } from 'zustand';

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
  setExperiments: (experiments: Experiment[]) => void;
  setHypotheses: (hypotheses: Hypothesis[]) => void;
  setDecisions: (decisions: Decision[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useExperimentStore = create<ExperimentStore>((set) => ({
  experiments: [],
  hypotheses: [],
  decisions: [],
  loading: false,
  setExperiments: (experiments) => set({ experiments }),
  setHypotheses: (hypotheses) => set({ hypotheses }),
  setDecisions: (decisions) => set({ decisions }),
  setLoading: (loading) => set({ loading }),
}));
