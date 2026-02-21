import path from 'path';
import { readJsonFile, writeJsonFile, listFiles, getVaultPath } from '../utils/file-operations';
import { generateVerdictId } from '../utils/id-generator';
import {
  CouncilDecisionConfig,
  CouncilDecisionType,
  EnhancedCouncilVerdict,
  VerdictLevel,
  Project,
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
    // Try standalone file first
    const filePath = path.join(this.verdictsDir, `${id}.json`);
    const verdict = await readJsonFile<EnhancedCouncilVerdict>(filePath);
    if (verdict) return verdict;

    // Check if it's an embedded verdict (id = "embedded-{projectId}")
    if (id.startsWith('embedded-')) {
      const projectId = id.replace('embedded-', '');
      const verdicts = await this.listVerdicts(projectId);
      return verdicts.find(v => v.id === id) || verdicts[0] || null;
    }

    return null;
  }

  async listVerdicts(projectId?: string): Promise<EnhancedCouncilVerdict[]> {
    const verdictIds = new Set<string>();
    const verdicts: EnhancedCouncilVerdict[] = [];

    // 1. Scan standalone verdict files
    const files = await listFiles(this.verdictsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    for (const file of jsonFiles) {
      const filePath = path.join(this.verdictsDir, file);
      const verdict = await readJsonFile<EnhancedCouncilVerdict>(filePath);
      if (verdict) {
        if (!projectId || verdict.project_id === projectId) {
          verdicts.push(verdict);
          if (verdict.id) verdictIds.add(verdict.id);
        }
      }
    }

    // 2. Scan project artifacts for embedded council verdicts
    const projectsDir = getVaultPath('02_projects', 'active');
    const projectFiles = await listFiles(projectsDir);
    const projectJsons = projectFiles.filter(f => f.startsWith('project-') && f.endsWith('.json'));
    for (const file of projectJsons) {
      const filePath = path.join(projectsDir, file);
      const project = await readJsonFile<Project>(filePath);
      if (!project?.artifacts?.council_verdict) continue;
      if (projectId && project.id !== projectId) continue;

      // Cast to any for flexible access — project artifacts may have extra fields
      const cv: any = project.artifacts.council_verdict;
      // Skip if we already have this verdict from standalone files
      if (cv.id && verdictIds.has(cv.id)) continue;

      // Normalize project artifact verdict to EnhancedCouncilVerdict shape
      const normalized: EnhancedCouncilVerdict = {
        id: cv.id || `embedded-${project.id}`,
        decision_type: cv.decision_type || 'idea_validation',
        verdict: cv.verdict || (cv.recommendation === 'approve' ? 'proceed_with_caution' : cv.recommendation === 'reject' ? 'reconsider' : 'needs_more_info'),
        confidence: cv.confidence ?? 0.5,
        overall_score: cv.overall_score || 0,
        executive_summary: cv.executive_summary || cv.synthesized_reasoning || '',
        key_insight: cv.key_insight || '',
        dimension_scores: cv.dimension_scores || [],
        evaluations: (cv.evaluations || []).map((e: any) => ({
          agent_name: e.agent_name || e.evaluator_name || 'Agent',
          role: e.role || e.perspective || '',
          score: e.score || 0,
          reasoning: e.reasoning || e.analysis || '',
          concerns: e.concerns || [],
          dimension_scores: e.dimension_scores || [],
          confidence: e.confidence ?? 0.5,
          key_insight: e.key_insight || '',
        })),
        recommended_actions: cv.recommended_actions || [],
        risks: cv.risks || [],
        open_questions: cv.open_questions || [],
        consensus_areas: cv.consensus_areas || [],
        disagreement_areas: cv.disagreement_areas || [],
        synthesized_reasoning: cv.synthesized_reasoning || '',
        council_composition: cv.council_composition || (cv.evaluations || []).map((e: any) => e.agent_name || e.evaluator_name || 'Agent'),
        created_at: cv.created_at || project.updated_at || new Date().toISOString(),
        project_id: project.id,
        subject_title: cv.subject_title || project.title,
        subject_description: cv.subject_description || project.description || '',
        recommendation: cv.recommendation || 'needs-info',
        next_steps: cv.next_steps || [],
      };

      verdicts.push(normalized);
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
