import path from 'path';
import {
  TrustTier,
  AgentAction,
  ConfidenceOutcome,
  ConfidenceRecord,
  CalibrationBucket,
  CalibrationReport,
  TrustEvolutionCandidate,
} from '../models/types';
import {
  getVaultPath,
  ensureDir,
  readJsonFile,
  writeJsonFile,
  listFiles,
} from '../utils/file-operations';
import { generateId } from '../utils/id-generator';

const LOG_PREFIX = '[Confidence]';

const CONFIDENCE_DIR = getVaultPath('07_system', 'agent', 'confidence');
const CALIBRATION_PATH = path.join(CONFIDENCE_DIR, 'calibration.json');

// Thresholds
const ESCALATION_THRESHOLD = 0.4;
const SHORT_DELAY_THRESHOLD = 0.8;
const SHORT_DELAY_MINUTES = 10;

// Evolution criteria
const MIN_INSTANCES = 50;
const MIN_CONFIDENCE = 0.75;
const MIN_APPROVAL_RATE = 0.90;
const MIN_CALIBRATION = 0.80;

class ConfidenceService {
  constructor() {
    ensureDir(CONFIDENCE_DIR).catch(err =>
      console.error(`${LOG_PREFIX} Failed to ensure confidence dir:`, err.message)
    );
  }

  async recordAction(action: AgentAction, predictedConfidence: number): Promise<ConfidenceRecord> {
    const record: ConfidenceRecord = {
      id: generateId('conf'),
      action_id: action.id,
      action_type: action.type,
      predicted_confidence: predictedConfidence,
      outcome: 'pending',
      created_at: new Date().toISOString(),
    };

    await writeJsonFile(path.join(CONFIDENCE_DIR, `${record.id}.json`), record);
    console.log(`${LOG_PREFIX} Recorded action ${action.id} with confidence ${predictedConfidence.toFixed(2)}`);
    return record;
  }

  async recordOutcome(actionId: string, outcome: ConfidenceOutcome): Promise<ConfidenceRecord | null> {
    const record = await this.findByActionId(actionId);
    if (!record) {
      console.warn(`${LOG_PREFIX} No confidence record found for action ${actionId}`);
      return null;
    }

    record.outcome = outcome;
    record.resolved_at = new Date().toISOString();
    record.actual_confidence = outcome === 'success' ? 1.0 : outcome === 'failure' ? 0.0 : undefined;

    await writeJsonFile(path.join(CONFIDENCE_DIR, `${record.id}.json`), record);
    console.log(`${LOG_PREFIX} Recorded outcome for ${actionId}: ${outcome}`);
    return record;
  }

  async findByActionId(actionId: string): Promise<ConfidenceRecord | null> {
    const files = await listFiles(CONFIDENCE_DIR);
    for (const file of files) {
      if (!file.startsWith('conf-') || !file.endsWith('.json')) continue;
      const record = await readJsonFile<ConfidenceRecord>(path.join(CONFIDENCE_DIR, file));
      if (record && record.action_id === actionId) {
        return record;
      }
    }
    return null;
  }

  async getAllRecords(actionType?: string): Promise<ConfidenceRecord[]> {
    const files = await listFiles(CONFIDENCE_DIR);
    const records: ConfidenceRecord[] = [];

    for (const file of files) {
      if (!file.startsWith('conf-') || !file.endsWith('.json')) continue;
      const record = await readJsonFile<ConfidenceRecord>(path.join(CONFIDENCE_DIR, file));
      if (record) {
        if (actionType && record.action_type !== actionType) continue;
        records.push(record);
      }
    }

    records.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return records;
  }

  async getConfidenceForActionType(actionType: string): Promise<number> {
    const records = await this.getAllRecords(actionType);
    const resolved = records.filter(r => r.outcome !== 'pending');

    if (resolved.length === 0) return 0.5; // Default when no historical data

    const successes = resolved.filter(r => r.outcome === 'success').length;
    return successes / resolved.length;
  }

  shouldEscalate(tier: TrustTier, confidence: number): boolean {
    return tier === 2 && confidence < ESCALATION_THRESHOLD;
  }

  getAdjustedDelay(tier: TrustTier, confidence: number, defaultDelayMinutes: number): number {
    if (tier === 2 && confidence > SHORT_DELAY_THRESHOLD) {
      return SHORT_DELAY_MINUTES;
    }
    return defaultDelayMinutes;
  }

  async getCalibrationReport(): Promise<CalibrationReport | null> {
    return readJsonFile<CalibrationReport>(CALIBRATION_PATH);
  }

  async runMonthlyCalibration(): Promise<CalibrationReport> {
    const allRecords = await this.getAllRecords();
    const resolved = allRecords.filter(r => r.outcome !== 'pending');

    // Group by action_type
    const groups = new Map<string, ConfidenceRecord[]>();
    for (const record of allRecords) {
      const existing = groups.get(record.action_type) || [];
      existing.push(record);
      groups.set(record.action_type, existing);
    }

    const buckets: CalibrationBucket[] = [];
    const candidates: TrustEvolutionCandidate[] = [];

    for (const [actionType, records] of groups) {
      const successes = records.filter(r => r.outcome === 'success').length;
      const failures = records.filter(r => r.outcome === 'failure').length;
      const cancelled = records.filter(r => r.outcome === 'cancelled').length;
      const pending = records.filter(r => r.outcome === 'pending').length;
      const resolvedRecords = records.filter(r => r.outcome !== 'pending');

      const avgPredicted = records.reduce((sum, r) => sum + r.predicted_confidence, 0) / records.length;
      const actualSuccessRate = resolvedRecords.length > 0
        ? successes / resolvedRecords.length
        : 0;
      const calibrationScore = resolvedRecords.length > 0
        ? 1 - Math.abs(avgPredicted - actualSuccessRate)
        : 0;

      const qualifies = records.length >= MIN_INSTANCES
        && avgPredicted >= MIN_CONFIDENCE
        && actualSuccessRate >= MIN_APPROVAL_RATE
        && calibrationScore >= MIN_CALIBRATION;

      buckets.push({
        action_type: actionType,
        total_instances: records.length,
        successes,
        failures,
        cancelled,
        pending,
        avg_predicted_confidence: avgPredicted,
        actual_success_rate: actualSuccessRate,
        calibration_score: calibrationScore,
        qualifies_for_evolution: qualifies,
      });

      if (qualifies) {
        candidates.push(this.buildEvolutionCandidate(actionType, records, avgPredicted, actualSuccessRate, calibrationScore));
      }
    }

    // Overall calibration
    const overallCalibration = resolved.length > 0
      ? buckets.reduce((sum, b) => sum + b.calibration_score * b.total_instances, 0) / allRecords.length
      : 0;

    const now = new Date();
    const periodEnd = now.toISOString();
    const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const report: CalibrationReport = {
      generated_at: now.toISOString(),
      period_start: periodStart,
      period_end: periodEnd,
      total_records: allRecords.length,
      buckets,
      overall_calibration: overallCalibration,
      trust_evolution_candidates: candidates,
    };

    await writeJsonFile(CALIBRATION_PATH, report);
    console.log(`${LOG_PREFIX} Calibration report generated: ${allRecords.length} records, ${buckets.length} buckets, ${candidates.length} evolution candidates`);
    return report;
  }

  async checkTrustEvolution(actionType: string): Promise<TrustEvolutionCandidate> {
    const records = await this.getAllRecords(actionType);
    const resolvedRecords = records.filter(r => r.outcome !== 'pending');

    const avgPredicted = records.length > 0
      ? records.reduce((sum, r) => sum + r.predicted_confidence, 0) / records.length
      : 0;
    const successes = resolvedRecords.filter(r => r.outcome === 'success').length;
    const actualSuccessRate = resolvedRecords.length > 0
      ? successes / resolvedRecords.length
      : 0;
    const calibrationScore = resolvedRecords.length > 0
      ? 1 - Math.abs(avgPredicted - actualSuccessRate)
      : 0;

    return this.buildEvolutionCandidate(actionType, records, avgPredicted, actualSuccessRate, calibrationScore);
  }

  private buildEvolutionCandidate(
    actionType: string,
    records: ConfidenceRecord[],
    avgPredicted: number,
    actualSuccessRate: number,
    calibrationScore: number
  ): TrustEvolutionCandidate {
    // Determine current and proposed tiers
    // Import would be circular; use a simple heuristic based on data
    const currentTier: TrustTier = 3; // Default assumption — actual tier comes from trust gate
    const proposedTier: TrustTier = currentTier === 3 ? 2 : 1;

    const failingCriteria: string[] = [];
    if (records.length < MIN_INSTANCES) failingCriteria.push(`instances (${records.length} < ${MIN_INSTANCES})`);
    if (avgPredicted < MIN_CONFIDENCE) failingCriteria.push(`confidence (${avgPredicted.toFixed(2)} < ${MIN_CONFIDENCE})`);
    if (actualSuccessRate < MIN_APPROVAL_RATE) failingCriteria.push(`approval_rate (${actualSuccessRate.toFixed(2)} < ${MIN_APPROVAL_RATE})`);
    if (calibrationScore < MIN_CALIBRATION) failingCriteria.push(`calibration (${calibrationScore.toFixed(2)} < ${MIN_CALIBRATION})`);

    return {
      action_type: actionType,
      current_tier: currentTier,
      proposed_tier: proposedTier,
      instance_count: records.length,
      avg_confidence: avgPredicted,
      approval_rate: actualSuccessRate,
      calibration_score: calibrationScore,
      meets_all_criteria: failingCriteria.length === 0,
      failing_criteria: failingCriteria,
    };
  }
}

export const confidenceService = new ConfidenceService();
