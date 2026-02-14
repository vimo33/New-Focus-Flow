import path from 'path';
import { readJsonFile, writeJsonFile, listFiles, getVaultPath } from '../utils/file-operations';
import { generateVerdictId } from '../utils/id-generator';
import {
  CouncilDecisionConfig,
  CouncilDecisionType,
  EnhancedCouncilVerdict,
  VerdictLevel,
} from '../models/types';

const LOG_PREFIX = '[CouncilFramework]';

class CouncilFramework {
  private configs: Map<string, CouncilDecisionConfig> = new Map();
  private configsDir: string;
  private verdictsDir: string;
  private loaded = false;

  constructor() {
    this.configsDir = getVaultPath('07_system', 'council-configs');
    this.verdictsDir = getVaultPath('07_system', 'council-verdicts');
    this.loadConfigs().catch(err => {
      console.error(`${LOG_PREFIX} Failed to load configs on init:`, err.message);
    });
  }

  async loadConfigs(): Promise<void> {
    const files = await listFiles(this.configsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const loaded = new Map<string, CouncilDecisionConfig>();
    for (const file of jsonFiles) {
      const filePath = path.join(this.configsDir, file);
      const config = await readJsonFile<CouncilDecisionConfig>(filePath);
      if (config && config.decision_type) {
        loaded.set(config.decision_type, config);
      }
    }

    this.configs = loaded;
    this.loaded = true;
    console.log(`${LOG_PREFIX} Loaded ${this.configs.size} decision type configs`);
  }

  async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      await this.loadConfigs();
    }
  }

  async getConfig(type: CouncilDecisionType): Promise<CouncilDecisionConfig | null> {
    await this.ensureLoaded();
    return this.configs.get(type) || null;
  }

  async listConfigs(): Promise<CouncilDecisionConfig[]> {
    await this.ensureLoaded();
    return Array.from(this.configs.values());
  }

  async persistVerdict(verdict: EnhancedCouncilVerdict): Promise<void> {
    const filePath = path.join(this.verdictsDir, `${verdict.id}.json`);
    await writeJsonFile(filePath, verdict);
    console.log(`${LOG_PREFIX} Persisted verdict ${verdict.id}`);
  }

  async getVerdict(id: string): Promise<EnhancedCouncilVerdict | null> {
    const filePath = path.join(this.verdictsDir, `${id}.json`);
    return readJsonFile<EnhancedCouncilVerdict>(filePath);
  }

  async listVerdicts(projectId?: string): Promise<EnhancedCouncilVerdict[]> {
    const files = await listFiles(this.verdictsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const verdicts: EnhancedCouncilVerdict[] = [];
    for (const file of jsonFiles) {
      const filePath = path.join(this.verdictsDir, file);
      const verdict = await readJsonFile<EnhancedCouncilVerdict>(filePath);
      if (verdict) {
        if (!projectId || verdict.project_id === projectId) {
          verdicts.push(verdict);
        }
      }
    }

    // Sort newest first
    verdicts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return verdicts;
  }

  mapVerdictLevel(score: number, config: CouncilDecisionConfig): VerdictLevel {
    const t = config.verdict_thresholds;
    if (score >= t.strong_proceed) return 'strong_proceed';
    if (score >= t.proceed_with_caution) return 'proceed_with_caution';
    if (score >= t.needs_more_info) return 'needs_more_info';
    if (score >= t.reconsider) return 'reconsider';
    return 'strong_reject';
  }

  mapLegacyRecommendation(verdictLevel: VerdictLevel): 'approve' | 'reject' | 'needs-info' {
    switch (verdictLevel) {
      case 'strong_proceed':
      case 'proceed_with_caution':
        return 'approve';
      case 'needs_more_info':
        return 'needs-info';
      case 'reconsider':
      case 'strong_reject':
        return 'reject';
    }
  }

  generateVerdictId(): string {
    return generateVerdictId();
  }

  async reload(): Promise<number> {
    await this.loadConfigs();
    return this.configs.size;
  }
}

export const councilFramework = new CouncilFramework();
