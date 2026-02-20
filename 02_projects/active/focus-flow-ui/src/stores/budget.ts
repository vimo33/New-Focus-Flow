import { create } from 'zustand';
import { api } from '../services/api';
import type { BudgetStatus, BudgetConfig } from '../services/api';

interface BudgetStore {
  budget: BudgetStatus | null;
  loading: boolean;
  error: string | null;

  fetchBudget: () => Promise<void>;
  updateBudget: (updates: Partial<BudgetConfig>) => Promise<void>;
}

export const useBudgetStore = create<BudgetStore>((set) => ({
  budget: null,
  loading: false,
  error: null,

  fetchBudget: async () => {
    set({ loading: true, error: null });
    try {
      const status = await api.getBudget();
      set({ budget: status, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  updateBudget: async (updates) => {
    set({ loading: true, error: null });
    try {
      await api.updateBudget(updates);
      // Re-fetch to get updated spend calculations
      const status = await api.getBudget();
      set({ budget: status, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
}));
