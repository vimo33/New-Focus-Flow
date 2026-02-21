import { create } from 'zustand';
import { api } from '../services/api';

export interface Approval {
  id: string;
  teamId: string;
  agentRunId?: string;
  actionSummary: string;
  riskTier: 'tier1' | 'tier2' | 'tier3';
  evidence?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  decidedBy?: string;
  decidedAt?: string;
  createdAt: string;
}

interface ApprovalStore {
  approvals: Approval[];
  pendingCount: number;
  loading: boolean;
  setApprovals: (approvals: Approval[]) => void;
  setLoading: (loading: boolean) => void;
  fetchApprovals: () => Promise<void>;
  approveItem: (id: string) => Promise<void>;
  rejectItem: (id: string) => Promise<void>;
}

export const useApprovalStore = create<ApprovalStore>((set, get) => ({
  approvals: [],
  pendingCount: 0,
  loading: false,
  setApprovals: (approvals) =>
    set({
      approvals,
      pendingCount: approvals.filter((a) => a.status === 'pending').length,
    }),
  setLoading: (loading) => set({ loading }),

  fetchApprovals: async () => {
    set({ loading: true });
    try {
      const { approvals } = await api.getApprovals('pending');
      set({
        approvals: approvals || [],
        pendingCount: (approvals || []).length,
        loading: false,
      });
    } catch (err) {
      console.error('Failed to fetch approvals:', err);
      set({ loading: false });
    }
  },

  approveItem: async (id: string) => {
    try {
      await api.decideApproval(id, 'approved');
      get().fetchApprovals();
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  },

  rejectItem: async (id: string) => {
    try {
      await api.decideApproval(id, 'rejected');
      get().fetchApprovals();
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  },
}));
