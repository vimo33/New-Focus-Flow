import { create } from 'zustand';
import { api } from '../services/api';
import type {
  SignalStrengthScore,
  PruningRecommendation,
  EnjoymentEntry,
  ValidationEngineOverview,
} from '../services/api';

interface ValidationStore {
  overview: ValidationEngineOverview | null;
  scores: Map<string, SignalStrengthScore>;
  pruningRecs: PruningRecommendation[];
  enjoyment: Map<string, EnjoymentEntry[]>;
  loading: boolean;
  computing: boolean;

  fetchOverview: () => Promise<void>;
  fetchScore: (projectId: string) => Promise<void>;
  fetchPruningRecommendations: () => Promise<void>;
  fetchEnjoyment: (projectId: string) => Promise<void>;
  computeScores: (projectId?: string) => Promise<void>;
  recordEnjoyment: (projectId: string, score: number, note?: string) => Promise<void>;
}

export const useValidationStore = create<ValidationStore>((set, get) => ({
  overview: null,
  scores: new Map(),
  pruningRecs: [],
  enjoyment: new Map(),
  loading: false,
  computing: false,

  fetchOverview: async () => {
    set({ loading: true });
    try {
      const overview = await api.getValidationOverview();
      set({ overview, loading: false });
    } catch (err) {
      console.error('Failed to fetch validation overview:', err);
      set({ loading: false });
    }
  },

  fetchScore: async (projectId: string) => {
    try {
      const score = await api.getSignalStrength(projectId);
      const scores = new Map(get().scores);
      scores.set(projectId, score);
      set({ scores });
    } catch {
      // No score yet — that's OK
    }
  },

  fetchPruningRecommendations: async () => {
    try {
      const { recommendations } = await api.getPruningRecommendations();
      set({ pruningRecs: recommendations });
    } catch (err) {
      console.error('Failed to fetch pruning recommendations:', err);
    }
  },

  fetchEnjoyment: async (projectId: string) => {
    try {
      const { history } = await api.getEnjoymentHistory(projectId);
      const enjoyment = new Map(get().enjoyment);
      enjoyment.set(projectId, history);
      set({ enjoyment });
    } catch (err) {
      console.error('Failed to fetch enjoyment:', err);
    }
  },

  computeScores: async (projectId?: string) => {
    set({ computing: true });
    try {
      await api.computeSignalStrength(projectId);
      // Refresh overview and pruning after compute
      await get().fetchOverview();
      await get().fetchPruningRecommendations();
      if (projectId) {
        await get().fetchScore(projectId);
      }
    } catch (err) {
      console.error('Failed to compute scores:', err);
    } finally {
      set({ computing: false });
    }
  },

  recordEnjoyment: async (projectId: string, score: number, note?: string) => {
    try {
      await api.recordEnjoyment(projectId, score, note);
      await get().fetchEnjoyment(projectId);
    } catch (err) {
      console.error('Failed to record enjoyment:', err);
    }
  },
}));
