import { VaultService } from './vault.service';
import { PRDParserService } from './prd-parser.service';
import { SpecGeneratorService } from './spec-generator.service';
import { DesignParserService } from './design-parser.service';
import { CodeGeneratorService } from './code-generator.service';
import { ValidatorService } from './validator.service';
import { DeployerService } from './deployer.service';
import { OrchestratorRun, OrchestratorState, Idea } from '../models/types';

/**
 * OrchestratorService - Autonomous PRD-to-Code Pipeline Orchestrator
 *
 * State machine that coordinates the entire pipeline:
 * intake → spec_generation → design_parsing → code_generation → validation → deployment → complete
 *
 * Each run is tracked in the vault with full audit trail.
 */
export class OrchestratorService {
  private vaultService: VaultService;
  private prdParser: PRDParserService;
  private specGenerator: SpecGeneratorService;
  private designParser: DesignParserService;
  private codeGenerator: CodeGeneratorService;
  private validator: ValidatorService;
  private deployer: DeployerService;

  private runsPath = '07_system/orchestrator/runs';

  constructor() {
    this.vaultService = new VaultService();
    this.prdParser = new PRDParserService();
    this.specGenerator = new SpecGeneratorService();
    this.designParser = new DesignParserService();
    this.codeGenerator = new CodeGeneratorService();
    this.validator = new ValidatorService();
    this.deployer = new DeployerService();
  }

  /**
   * Process a PRD from an Idea through the entire pipeline
   */
  async processPRD(ideaId: string): Promise<OrchestratorRun> {
    const run = await this.createRun(ideaId);

    try {
      // State: INTAKE
      await this.updateRunState(run.id, 'intake');
      console.log(`[${run.id}] State: intake`);

      const idea = await this.loadIdea(ideaId);
      const prd = await this.prdParser.parseFromIdea(idea);

      // Validate PRD format
      const validation = this.prdParser.validatePRD(idea);
      if (!validation.valid) {
        throw new Error(`Invalid PRD format: ${validation.errors.join(', ')}`);
      }

      // State: SPEC_GENERATION
      await this.updateRunState(run.id, 'spec_generation');
      console.log(`[${run.id}] State: spec_generation`);

      const specs = await this.specGenerator.generateFromPRD(prd);
      run.outputs.specs = specs;
      await this.saveRun(run);

      console.log(`[${run.id}] Generated ${specs.length} specifications`);

      // State: DESIGN_PARSING
      await this.updateRunState(run.id, 'design_parsing');
      console.log(`[${run.id}] State: design_parsing`);

      const designs = await this.designParser.parseStitchExports(specs);
      run.outputs.designs = designs;
      await this.saveRun(run);

      console.log(`[${run.id}] Parsed ${designs.length} designs`);

      // State: CODE_GENERATION
      await this.updateRunState(run.id, 'code_generation');
      console.log(`[${run.id}] State: code_generation`);

      const code = await this.codeGenerator.generate(specs, designs);
      run.outputs.code = code;
      await this.saveRun(run);

      console.log(
        `[${run.id}] Generated ${code.frontend.length} frontend, ${code.backend.length} backend, ${code.tests.length} test files`
      );

      // State: VALIDATION
      await this.updateRunState(run.id, 'validation');
      console.log(`[${run.id}] State: validation`);

      const validationResult = await this.validator.validate(code);
      run.outputs.validation = validationResult;
      await this.saveRun(run);

      if (!validationResult.passed) {
        throw new Error(
          `Validation failed:\n${validationResult.errors.join('\n')}`
        );
      }

      console.log(`[${run.id}] Validation passed`);

      // State: DEPLOYMENT
      await this.updateRunState(run.id, 'deployment');
      console.log(`[${run.id}] State: deployment`);

      const deployResult = await this.deployer.deploy(code);
      run.outputs.deployment = deployResult;
      await this.saveRun(run);

      console.log(
        `[${run.id}] Deployed ${deployResult.frontend_files.length + deployResult.backend_files.length} files`
      );

      // State: COMPLETE
      await this.updateRunState(run.id, 'complete');
      console.log(`[${run.id}] State: complete ✓`);

      return run;
    } catch (error: any) {
      console.error(`[${run.id}] Error:`, error.message);

      await this.updateRunState(run.id, 'failed', {
        message: error.message,
        stack: error.stack,
        state_when_failed: run.state,
      });

      throw error;
    }
  }

  /**
   * Create a new orchestrator run
   */
  private async createRun(ideaId: string): Promise<OrchestratorRun> {
    const idea = await this.loadIdea(ideaId);

    const run: OrchestratorRun = {
      id: this.generateRunId(),
      idea_id: ideaId,
      state: 'intake',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        prd_title: idea.title,
      },
      outputs: {},
    };

    await this.saveRun(run);
    return run;
  }

  /**
   * Update run state
   */
  private async updateRunState(
    runId: string,
    state: OrchestratorState,
    error?: { message: string; stack: string; state_when_failed: string }
  ): Promise<void> {
    const run = await this.getRun(runId);
    run.state = state;
    run.updated_at = new Date().toISOString();

    if (error) {
      run.error = error;
    }

    await this.saveRun(run);
  }

  /**
   * Get a run by ID
   */
  async getRun(runId: string): Promise<OrchestratorRun> {
    const filePath = `${this.runsPath}/${runId}.json`;
    const data = await this.vaultService.getData(filePath);

    if (!data) {
      throw new Error(`Run not found: ${runId}`);
    }

    return JSON.parse(data);
  }

  /**
   * Get all runs
   */
  async getAllRuns(): Promise<OrchestratorRun[]> {
    const runs = await this.vaultService.listFiles(this.runsPath);

    const runData = await Promise.all(
      runs.map(async (fileName) => {
        const data = await this.vaultService.getData(`${this.runsPath}/${fileName}`);
        return JSON.parse(data);
      })
    );

    // Sort by created_at descending
    return runData.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Save run to vault
   */
  private async saveRun(run: OrchestratorRun): Promise<void> {
    const filePath = `${this.runsPath}/${run.id}.json`;
    await this.vaultService.saveData(filePath, JSON.stringify(run, null, 2));
  }

  /**
   * Load idea from vault
   */
  private async loadIdea(ideaId: string): Promise<Idea> {
    const ideasPath = '05_ideas';
    const ideas = await this.vaultService.getIdeas();

    const idea = ideas.find((i) => i.id === ideaId);

    if (!idea) {
      throw new Error(`Idea not found: ${ideaId}`);
    }

    return idea;
  }

  /**
   * Generate unique run ID
   */
  private generateRunId(): string {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const random = Math.random().toString(36).substring(2, 6);
    return `orch-${timestamp}-${random}`;
  }
}
