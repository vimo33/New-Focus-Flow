import { create } from 'zustand';

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
}

export const useApprovalStore = create<ApprovalStore>((set) => ({
  approvals: [],
  pendingCount: 0,
  loading: false,
  setApprovals: (approvals) =>
    set({
      approvals,
      pendingCount: approvals.filter((a) => a.status === 'pending').length,
    }),
  setLoading: (loading) => set({ loading }),
}));
