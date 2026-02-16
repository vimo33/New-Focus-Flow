import path from 'path';
import {
  TrustTier,
  AgentAction,
  PendingApproval,
} from '../models/types';
import {
  getVaultPath,
  ensureDir,
  readJsonFile,
  writeJsonFile,
  listFiles,
  deleteFile,
} from '../utils/file-operations';
import { generateApprovalId } from '../utils/id-generator';

const LOG_PREFIX = '[TrustGate]';

const APPROVALS_DIR = getVaultPath('07_system', 'agent', 'approvals');
const CONFIG_PATH = getVaultPath('07_system', 'agent', 'config.json');

// Deterministic tier classification — hardcoded lookup for auditability
const TIER_MAP: Record<string, TrustTier> = {
  // Tier 1: Auto-Execute
  read_vault: 1,
  assemble_context: 1,
  run_inference_analysis: 1,
  generate_briefing: 1,
  generate_summary: 1,
  monitor_services: 1,
  search_memory: 1,

  // Tier 2: Delayed-Execute (announce, wait, execute if not cancelled)
  create_tasks_from_verdict: 2,
  advance_approved_gate: 2,
  run_test_suite: 2,
  send_status_update: 2,

  // Tier 3: Hard-Gate (explicit approval required)
  deploy_production: 3,
  send_external_comms: 3,
  council_evaluation: 3,
  merge_to_main: 3,
  advance_pipeline: 3,
  high_cost_operation: 3,
};

interface AgentConfig {
  tier2_delay_minutes: number;
  tier_overrides: Record<string, TrustTier>;
}

class TrustGateService {
  private config: AgentConfig = { tier2_delay_minutes: 30, tier_overrides: {} };

  constructor() {
    ensureDir(APPROVALS_DIR).catch(err =>
      console.error(`${LOG_PREFIX} Failed to ensure approvals dir:`, err.message)
    );
    this.loadConfig().catch(err =>
      console.error(`${LOG_PREFIX} Failed to load config:`, err.message)
    );
  }

  private async loadConfig(): Promise<void> {
    const config = await readJsonFile<any>(CONFIG_PATH);
    if (config) {
      this.config.tier2_delay_minutes = config.tier2_delay_minutes ?? 30;
      this.config.tier_overrides = config.tier_overrides ?? {};
    }
  }

  classify(actionType: string): TrustTier {
    // Check config overrides first
    if (this.config.tier_overrides[actionType] !== undefined) {
      return this.config.tier_overrides[actionType];
    }
    // Then hardcoded lookup
    return TIER_MAP[actionType] ?? 3; // Default to Tier 3 (safest)
  }

  async createApproval(
    action: AgentAction,
    context: string,
    reasoning: string
  ): Promise<PendingApproval> {
    const tier = this.classify(action.type);
    const now = new Date();

    const approval: PendingApproval = {
      id: generateApprovalId(),
      tier,
      action,
      context,
      reasoning,
      created_at: now.toISOString(),
      status: 'pending',
    };

    // Add expiry for Tier 2
    if (tier === 2) {
      const expiresAt = new Date(now.getTime() + this.config.tier2_delay_minutes * 60 * 1000);
      approval.expires_at = expiresAt.toISOString();
    }

    await writeJsonFile(path.join(APPROVALS_DIR, `${approval.id}.json`), approval);
    console.log(`${LOG_PREFIX} Created approval ${approval.id} (Tier ${tier}) for ${action.type}`);
    return approval;
  }

  async getApproval(id: string): Promise<PendingApproval | null> {
    return readJsonFile<PendingApproval>(path.join(APPROVALS_DIR, `${id}.json`));
  }

  async resolveApproval(
    id: string,
    approved: boolean,
    feedback?: string
  ): Promise<PendingApproval | null> {
    const approval = await this.getApproval(id);
    if (!approval || approval.status !== 'pending') return null;

    approval.status = approved ? 'approved' : 'rejected';
    approval.resolved_at = new Date().toISOString();
    if (feedback) approval.feedback = feedback;

    await writeJsonFile(path.join(APPROVALS_DIR, `${id}.json`), approval);
    console.log(`${LOG_PREFIX} Resolved approval ${id}: ${approval.status}`);
    return approval;
  }

  async cancelApproval(id: string): Promise<PendingApproval | null> {
    const approval = await this.getApproval(id);
    if (!approval || approval.status !== 'pending') return null;

    approval.status = 'cancelled';
    approval.resolved_at = new Date().toISOString();

    await writeJsonFile(path.join(APPROVALS_DIR, `${id}.json`), approval);
    console.log(`${LOG_PREFIX} Cancelled approval ${id}`);
    return approval;
  }

  async getPendingApprovals(): Promise<PendingApproval[]> {
    const files = await listFiles(APPROVALS_DIR);
    const approvals: PendingApproval[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const approval = await readJsonFile<PendingApproval>(path.join(APPROVALS_DIR, file));
      if (approval && approval.status === 'pending') {
        approvals.push(approval);
      }
    }

    approvals.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return approvals;
  }

  async checkExpiredDelays(): Promise<PendingApproval[]> {
    const now = Date.now();
    const expired: PendingApproval[] = [];
    const pending = await this.getPendingApprovals();

    for (const approval of pending) {
      if (approval.tier === 2 && approval.expires_at) {
        if (new Date(approval.expires_at).getTime() <= now) {
          approval.status = 'auto_executed';
          approval.resolved_at = new Date().toISOString();
          await writeJsonFile(path.join(APPROVALS_DIR, `${approval.id}.json`), approval);
          console.log(`${LOG_PREFIX} Auto-executing expired Tier 2 approval ${approval.id}`);
          expired.push(approval);
        }
      }
    }

    return expired;
  }

  async getAllApprovals(limit = 50): Promise<PendingApproval[]> {
    const files = await listFiles(APPROVALS_DIR);
    const approvals: PendingApproval[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const approval = await readJsonFile<PendingApproval>(path.join(APPROVALS_DIR, file));
      if (approval) approvals.push(approval);
    }

    approvals.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return approvals.slice(0, limit);
  }
}

export const trustGate = new TrustGateService();
