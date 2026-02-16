import { VaultService } from './vault.service';
import { PRDParserService } from './prd-parser.service';
import { SpecGeneratorService } from './spec-generator.service';
import { DesignParserService } from './design-parser.service';
import { CodeGeneratorService } from './code-generator.service';
import { ValidatorService } from './validator.service';
import { DeployerService } from './deployer.service';
import { cachedInference } from './cached-inference.service';
import { designService } from './design.service';
import { conceptChatService } from './concept-chat.service';
import { aiCouncil } from '../ai/ai-council';
import {
  Project,
  ProjectPhase,
  PhaseSubState,
  PhaseState,
  PipelineState,
  PRDDocument,
  Specification,
  DesignSystem,
  ConceptStep,
  AgentProgressEntry,
  CouncilProgress,
  CouncilMember,
  AgentEvaluation,
} from '../models/types';

// Ordered phases for the pipeline
const PHASE_ORDER: ProjectPhase[] = ['concept', 'spec', 'design', 'dev', 'test', 'deploy', 'live'];

/**
 * PipelineService - HITL Pipeline Orchestrator
 *
 * Manages the project lifecycle as a state machine with human-in-the-loop
 * approval gates at each phase boundary.
 *
 * The concept phase is interactive (user-driven chat), while other phases
 * are AI-driven with review gates.
 */
export class PipelineService {
  private vaultService: VaultService;
  private prdParser: PRDParserService;
  private specGenerator: SpecGeneratorService;
  private designParser: DesignParserService;
  private codeGenerator: CodeGeneratorService;
  private validator: ValidatorService;
  private deployer: DeployerService;
  // Per-project mutex to prevent concurrent file writes during council background work
  private projectMutex: Map<string, Promise<void>> = new Map();

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
   * Acquire a per-project write lock. Returns a release function.
   */
  private async acquireProjectLock(projectId: string): Promise<() => void> {
    let release: () => void;
    const prev = this.projectMutex.get(projectId) || Promise.resolve();
    const next = new Promise<void>((resolve) => { release = resolve; });
    this.projectMutex.set(projectId, prev.then(() => next));
    await prev;
    return release!;
  }

  /**
   * Initialize the pipeline for a project at concept/refining.
   * Called automatically when a project is created with a concept.
   */
  async startPipeline(projectId: string): Promise<Project> {
    const project = await this.getProject(projectId);

    if (project.pipeline && project.pipeline.current_phase !== 'concept') {
      throw new Error('Pipeline already started. Use reviewPhase to continue.');
    }

    const now = new Date().toISOString();
    const pipeline: PipelineState = {
      current_phase: 'concept',
      phases: {
        concept: {
          phase: 'concept',
          sub_state: 'working',
          started_at: now,
          step: 'refining',
        },
      },
      run_id: `pipeline-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      updated_at: now,
    };

    project.pipeline = pipeline;
    project.phase = 'concept';
    await this.saveProject(project);

    return project;
  }

  /**
   * Start (or restart) a specific phase. Runs AI work, then sets sub_state='review'.
   */
  async startPhase(projectId: string, phase: ProjectPhase, feedback?: string): Promise<Project> {
    const project = await this.getProject(projectId);
    const pipeline = project.pipeline!;
    const now = new Date().toISOString();

    // Initialize phase state
    const phaseState: PhaseState = {
      phase,
      sub_state: 'working',
      started_at: now,
      feedback,
      step: pipeline.phases[phase]?.step, // preserve step for multi-step phases
    };
    pipeline.phases[phase] = phaseState;
    pipeline.current_phase = phase;
    pipeline.updated_at = now;
    project.phase = phase;
    await this.saveProject(project);

    // Run phase-specific work
    try {
      await this.runPhase(project, phase, feedback);
    } catch (error: any) {
      console.error(`[Pipeline] Phase ${phase} failed:`, error.message);
      const p = await this.getProject(projectId);
      if (p.pipeline?.phases[phase]) {
        p.pipeline.phases[phase]!.sub_state = 'review';
        p.pipeline.phases[phase]!.feedback = `Error: ${error.message}`;
        p.pipeline.updated_at = new Date().toISOString();
        await this.saveProject(p);
      }
      return p;
    }

    return this.getProject(projectId);
  }

  /**
   * Handle user review: approve or reject with feedback.
   */
  async reviewPhase(
    projectId: string,
    action: 'approve' | 'reject',
    feedback?: string
  ): Promise<Project> {
    const project = await this.getProject(projectId);
    const pipeline = project.pipeline;

    if (!pipeline) {
      throw new Error('Pipeline not initialized. Call startPipeline first.');
    }

    const currentPhase = pipeline.current_phase;
    const phaseState = pipeline.phases[currentPhase];

    if (!phaseState || phaseState.sub_state !== 'review') {
      throw new Error(`Phase ${currentPhase} is not in review state (current: ${phaseState?.sub_state || 'none'})`);
    }

    if (action === 'approve') {
      return this.approvePhase(project, currentPhase, phaseState);
    } else {
      return this.rejectPhase(project, currentPhase, feedback);
    }
  }

  /**
   * Get current pipeline status.
   */
  async getStatus(projectId: string): Promise<{
    project: Project;
    pipeline: PipelineState | null;
    current_phase_state: PhaseState | null;
  }> {
    const project = await this.getProject(projectId);
    const pipeline = project.pipeline || null;
    const currentPhaseState = pipeline
      ? pipeline.phases[pipeline.current_phase] || null
      : null;

    return { project, pipeline, current_phase_state: currentPhaseState };
  }

  // ============================================================================
  // Concept Phase — Interactive Steps
  // ============================================================================

  /**
   * Transition the concept phase to a specific step.
   * Called by route handlers, not by runPhase.
   */
  async advanceConceptStep(projectId: string, toStep: ConceptStep): Promise<Project> {
    const project = await this.getProject(projectId);
    const pipeline = project.pipeline;

    if (!pipeline || pipeline.current_phase !== 'concept') {
      throw new Error('Project is not in concept phase');
    }

    const phaseState = pipeline.phases['concept']!;
    phaseState.step = toStep;
    pipeline.updated_at = new Date().toISOString();

    switch (toStep) {
      case 'council_selection': {
        // Summarize concept from full conversation, then recommend council
        phaseState.sub_state = 'working';
        await this.saveProject(project);

        try {
          if (!project.artifacts) project.artifacts = {};

          // ALWAYS re-summarize — the user may have added critical content since last time
          const threadId = project.concept_thread_id;
          if (!threadId) throw new Error('No concept thread found');
          const summary = await conceptChatService.summarizeConcept(threadId);
          project.artifacts.refined_concept = summary;

          // Send full refined concept — model has 200k token context, no need to truncate
          const suggested = await conceptChatService.recommendCouncil(project.artifacts.refined_concept);
          project.artifacts.selected_council = suggested;

          phaseState.sub_state = 'review';
          pipeline.updated_at = new Date().toISOString();
          await this.saveProject(project);
        } catch (err: any) {
          console.error(`[Pipeline] Council selection failed: ${err.message}`);
          // Reset to refining so user isn't stuck at working
          phaseState.step = 'refining';
          phaseState.sub_state = 'working';
          phaseState.feedback = `Council selection failed: ${err.message}. Please try again.`;
          pipeline.updated_at = new Date().toISOString();
          await this.saveProject(project);
          throw err;
        }
        break;
      }

      case 'council_running': {
        phaseState.sub_state = 'working';

        const agents = project.artifacts?.selected_council;
        if (!agents || agents.length === 0) throw new Error('No council agents selected');

        // Initialize council_progress with all agents pending
        if (!project.artifacts) project.artifacts = {};
        const councilProgress: CouncilProgress = {
          started_at: new Date().toISOString(),
          agents: agents.map((a) => ({
            agent_name: a.agent_name,
            status: 'pending' as const,
          })),
          synthesis_status: 'pending',
          completed_count: 0,
          total_count: agents.length,
        };
        project.artifacts.council_progress = councilProgress;
        await this.saveProject(project);

        // Build rich council brief from refined concept + original spec + chat history
        const refined = project.artifacts?.refined_concept || '';
        let councilBrief: string;
        if (project.concept_thread_id && refined) {
          try {
            councilBrief = await conceptChatService.buildCouncilBrief(project.concept_thread_id, refined);
          } catch (err: any) {
            console.warn(`[Pipeline] Failed to build council brief, using refined concept:`, err.message);
            councilBrief = refined || project.description || '';
          }
        } else {
          councilBrief = refined || project.description || '';
        }

        // Persist the council brief as an artifact for later phases (PRD, audit trail)
        project.artifacts.council_brief = councilBrief;
        await this.saveProject(project);

        // Fire-and-forget: run council in background
        this.runCouncilInBackground(projectId, project.title, councilBrief, agents);
        break;
      }

      case 'prd_generation': {
        phaseState.sub_state = 'working';
        await this.saveProject(project);

        // Use the full council brief (includes spec, chat, refined concept) for richer PRD context
        const concept = project.artifacts?.council_brief || project.artifacts?.refined_concept || project.description || '';
        const verdict = project.artifacts?.council_verdict;

        const prd = await this.generatePRDFromConcept(project, concept, verdict);
        if (!project.artifacts) project.artifacts = {};
        project.artifacts.prd = prd;

        phaseState.step = 'prd_review';
        phaseState.sub_state = 'review';
        pipeline.updated_at = new Date().toISOString();
        await this.saveProject(project);
        break;
      }

      default:
        phaseState.sub_state = toStep === 'refining' ? 'working' : 'review';
        await this.saveProject(project);
    }

    return this.getProject(projectId);
  }

  /**
   * Retry a stuck council evaluation. Clears old progress and re-runs.
   */
  async retryCouncil(projectId: string): Promise<Project> {
    const project = await this.getProject(projectId);
    const pipeline = project.pipeline;

    if (!pipeline || pipeline.current_phase !== 'concept') {
      throw new Error('Project is not in concept phase');
    }

    const phaseState = pipeline.phases['concept']!;
    const agents = project.artifacts?.selected_council;
    if (!agents || agents.length === 0) throw new Error('No council agents selected');

    // Reset progress
    if (!project.artifacts) project.artifacts = {};
    const councilProgress: CouncilProgress = {
      started_at: new Date().toISOString(),
      agents: agents.map((a) => ({
        agent_name: a.agent_name,
        status: 'pending' as const,
      })),
      synthesis_status: 'pending',
      completed_count: 0,
      total_count: agents.length,
    };
    project.artifacts.council_progress = councilProgress;
    delete project.artifacts.council_verdict;
    phaseState.step = 'council_running';
    phaseState.sub_state = 'working';
    pipeline.updated_at = new Date().toISOString();
    await this.saveProject(project);

    // Build rich council brief
    const refined = project.artifacts?.refined_concept || '';
    let councilBrief: string;
    if (project.concept_thread_id && refined) {
      try {
        councilBrief = await conceptChatService.buildCouncilBrief(project.concept_thread_id, refined);
      } catch (err: any) {
        console.warn(`[Pipeline] Failed to build council brief for retry:`, err.message);
        councilBrief = refined || project.description || '';
      }
    } else {
      councilBrief = refined || project.description || '';
    }
    // Persist the council brief
    if (!project.artifacts) project.artifacts = {};
    project.artifacts.council_brief = councilBrief;
    await this.saveProject(project);
    this.runCouncilInBackground(projectId, project.title, councilBrief, agents);

    return this.getProject(projectId);
  }

  /**
   * Run council agents in the background with per-agent progress tracking.
   * Uses a per-project mutex to prevent concurrent file writes.
   * 3-minute timeout marks remaining agents as failed and synthesizes partial results.
   */
  private runCouncilInBackground(
    projectId: string,
    title: string,
    description: string,
    agents: CouncilMember[]
  ): void {
    const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes (Opus agents with web research)
    let timedOut = false;

    console.log(`[Council Background] Starting ${agents.length} agents for project ${projectId}`);

    // Timeout handler
    const timeoutHandle = setTimeout(async () => {
      timedOut = true;
      console.warn(`[Council Background] Timeout reached for project ${projectId}`);
      const release = await this.acquireProjectLock(projectId);
      try {
        const p = await this.getProject(projectId);
        const progress = p.artifacts?.council_progress;
        if (!progress) return;

        // Mark remaining pending/running agents as failed
        for (const agent of progress.agents) {
          if (agent.status === 'pending' || agent.status === 'running') {
            agent.status = 'failed';
            agent.error = 'Timeout: agent did not respond within 3 minutes';
            agent.completed_at = new Date().toISOString();
          }
        }
        progress.completed_count = progress.agents.filter(
          a => a.status === 'completed' || a.status === 'failed'
        ).length;
        await this.saveProject(p);

        // Synthesize with whatever we have
        await this.finishCouncilSynthesis(projectId, title, description);
      } finally {
        release();
      }
    }, TIMEOUT_MS);

    // Run all agents in parallel via Promise.allSettled
    const agentPromises = agents.map(async (agent) => {
      const agentName = agent.agent_name;

      // Mark agent as running
      const releaseStart = await this.acquireProjectLock(projectId);
      try {
        const p = await this.getProject(projectId);
        const progress = p.artifacts?.council_progress;
        if (!progress) return;
        const entry = progress.agents.find(a => a.agent_name === agentName);
        if (entry) {
          entry.status = 'running';
          entry.started_at = new Date().toISOString();
        }
        await this.saveProject(p);
      } finally {
        releaseStart();
      }

      // Actually run the agent
      try {
        if (timedOut) return;
        const evaluation = await aiCouncil.runSingleAgent(agent, title, description);

        // Mark agent as completed
        const releaseDone = await this.acquireProjectLock(projectId);
        try {
          const p = await this.getProject(projectId);
          const progress = p.artifacts?.council_progress;
          if (!progress) return;
          const entry = progress.agents.find(a => a.agent_name === agentName);
          if (entry) {
            entry.status = 'completed';
            entry.completed_at = new Date().toISOString();
            entry.evaluation = evaluation;
          }
          progress.completed_count = progress.agents.filter(a => a.status === 'completed').length;
          await this.saveProject(p);
          console.log(`[Council Background] ${agentName}: ${evaluation.score}/10`);
        } finally {
          releaseDone();
        }
      } catch (err: any) {
        // Mark agent as failed
        const releaseFail = await this.acquireProjectLock(projectId);
        try {
          const p = await this.getProject(projectId);
          const progress = p.artifacts?.council_progress;
          if (!progress) return;
          const entry = progress.agents.find(a => a.agent_name === agentName);
          if (entry) {
            entry.status = 'failed';
            entry.completed_at = new Date().toISOString();
            entry.error = err.message || 'Unknown error';
          }
          progress.completed_count = progress.agents.filter(
            a => a.status === 'completed' || a.status === 'failed'
          ).length;
          await this.saveProject(p);
          console.error(`[Council Background] ${agentName} failed:`, err.message);
        } finally {
          releaseFail();
        }
      }
    });

    // After all agents settle, run synthesis (unless already timed out)
    Promise.allSettled(agentPromises).then(async () => {
      clearTimeout(timeoutHandle);
      if (timedOut) return; // Timeout handler already did synthesis

      await this.finishCouncilSynthesis(projectId, title, description);
    }).catch((err) => {
      console.error(`[Council Background] Unexpected error in allSettled:`, err);
    });
  }

  /**
   * Synthesize verdict from completed agent evaluations and finalize the council step.
   */
  private async finishCouncilSynthesis(
    projectId: string,
    title: string,
    description: string
  ): Promise<void> {
    const release = await this.acquireProjectLock(projectId);
    try {
      const p = await this.getProject(projectId);
      const progress = p.artifacts?.council_progress;
      if (!progress) return;

      // Collect completed evaluations
      const evaluations: AgentEvaluation[] = progress.agents
        .filter(a => a.status === 'completed' && a.evaluation)
        .map(a => a.evaluation!);

      if (evaluations.length === 0) {
        // All agents failed — mark synthesis failed, stay in council_running for retry
        progress.synthesis_status = 'failed';
        await this.saveProject(p);
        console.error(`[Council Background] All agents failed for project ${projectId}`);
        return;
      }

      // Run synthesis
      progress.synthesis_status = 'running';
      await this.saveProject(p);
    } finally {
      release();
    }

    // Do synthesis outside the lock (it's a long API call)
    let verdict;
    try {
      const p = await this.getProject(projectId);
      const progress = p.artifacts?.council_progress!;
      const evaluations = progress.agents
        .filter(a => a.status === 'completed' && a.evaluation)
        .map(a => a.evaluation!);

      verdict = await aiCouncil.synthesizeFromEvaluations(title, description, evaluations);
    } catch (err: any) {
      console.error(`[Council Background] Synthesis failed:`, err.message);
      const release2 = await this.acquireProjectLock(projectId);
      try {
        const p = await this.getProject(projectId);
        const progress = p.artifacts?.council_progress;
        if (progress) {
          progress.synthesis_status = 'failed';
        }
        await this.saveProject(p);
      } finally {
        release2();
      }
      return;
    }

    // Save verdict and advance to council_review
    const release3 = await this.acquireProjectLock(projectId);
    try {
      const p = await this.getProject(projectId);
      if (!p.artifacts) p.artifacts = {};
      p.artifacts.council_verdict = verdict;
      const progress = p.artifacts.council_progress;
      if (progress) {
        progress.synthesis_status = 'completed';
      }

      const pipeline = p.pipeline!;
      const phaseState = pipeline.phases['concept']!;
      phaseState.step = 'council_review';
      phaseState.sub_state = 'review';
      pipeline.updated_at = new Date().toISOString();
      await this.saveProject(p);
      console.log(`[Council Background] Council complete for ${projectId}: ${verdict.recommendation} (${verdict.overall_score}/10)`);
    } finally {
      release3();
    }
  }

  // ============================================================================
  // Phase Handlers
  // ============================================================================

  private async runPhase(project: Project, phase: ProjectPhase, feedback?: string): Promise<void> {
    switch (phase) {
      case 'concept':
        // Concept phase is interactive — handled by advanceConceptStep and routes
        // On startPhase, just set to working/refining (already done)
        return;
      case 'spec':
        return this.runSpecPhase(project, feedback);
      case 'design':
        return this.runDesignPhase(project, feedback);
      case 'dev':
        return this.runDevPhase(project, feedback);
      case 'test':
        return this.runTestPhase(project, feedback);
      case 'deploy':
        return this.runDeployPhase(project, feedback);
      default:
        throw new Error(`Unknown phase: ${phase}`);
    }
  }

  /**
   * Spec Phase: Generate technical specifications from PRD.
   */
  private async runSpecPhase(project: Project, feedback?: string): Promise<void> {
    const prd = project.artifacts?.prd;
    if (!prd) {
      throw new Error('No PRD found. Complete concept phase first.');
    }

    let specs: Specification[];

    if (feedback && project.artifacts?.specs) {
      specs = await this.refineSpecs(project.artifacts.specs, feedback, prd);
    } else {
      specs = await this.specGenerator.generateFromPRD(prd);
    }

    if (!project.artifacts) project.artifacts = {};
    project.artifacts.specs = specs;

    project.pipeline!.phases['spec']!.sub_state = 'review';
    project.pipeline!.updated_at = new Date().toISOString();
    await this.saveProject(project);
  }

  /**
   * Design Phase: Multi-step - generates design system, then main screens, then all screens.
   */
  private async runDesignPhase(project: Project, feedback?: string): Promise<void> {
    const phaseState = project.pipeline!.phases['design']!;
    const step = phaseState.step || 'system';

    switch (step) {
      case 'system':
        await this.runDesignSystemStep(project, feedback);
        break;
      case 'main_screens':
        await this.runMainScreensStep(project, feedback);
        break;
      case 'all_screens':
        await this.runAllScreensStep(project, feedback);
        break;
      default:
        await this.runDesignSystemStep(project, feedback);
    }
  }

  private async runDesignSystemStep(project: Project, feedback?: string): Promise<void> {
    const prd = project.artifacts?.prd;
    const specs = project.artifacts?.specs;
    if (!prd || !specs) {
      throw new Error('PRD and specs required for design phase.');
    }

    let designSystem: DesignSystem;

    if (feedback && project.artifacts?.design_system) {
      designSystem = await this.refineDesignSystem(project.artifacts.design_system, feedback, prd);
    } else {
      designSystem = await this.generateDesignSystem(project, prd, specs);
    }

    if (!project.artifacts) project.artifacts = {};
    project.artifacts.design_system = designSystem;

    project.pipeline!.phases['design']!.step = 'system';
    project.pipeline!.phases['design']!.sub_state = 'review';
    project.pipeline!.updated_at = new Date().toISOString();
    await this.saveProject(project);
  }

  private async runMainScreensStep(project: Project, feedback?: string): Promise<void> {
    const specs = project.artifacts?.specs;
    const designSystem = project.artifacts?.design_system;
    if (!specs || !designSystem) {
      throw new Error('Specs and design system required for screen generation.');
    }

    const mainSpecs = specs.slice(0, 2);
    for (const spec of mainSpecs) {
      const prompt = `${spec.feature_name}: ${spec.description}. Use design system: colors=${JSON.stringify(designSystem.color_palette?.slice(0, 3))}, typography=${designSystem.typography?.[0]?.font || 'Inter'}`;
      await designService.generateScreen(project.id, prompt);
    }

    project.pipeline!.phases['design']!.step = 'main_screens';
    project.pipeline!.phases['design']!.sub_state = 'review';
    project.pipeline!.updated_at = new Date().toISOString();
    await this.saveProject(project);
  }

  private async runAllScreensStep(project: Project, feedback?: string): Promise<void> {
    const specs = project.artifacts?.specs;
    const designSystem = project.artifacts?.design_system;
    if (!specs || !designSystem) {
      throw new Error('Specs and design system required for screen generation.');
    }

    const remainingSpecs = specs.slice(2);
    for (const spec of remainingSpecs) {
      const prompt = `${spec.feature_name}: ${spec.description}. Use design system: colors=${JSON.stringify(designSystem.color_palette?.slice(0, 3))}, typography=${designSystem.typography?.[0]?.font || 'Inter'}`;
      await designService.generateScreen(project.id, prompt);
    }

    project.pipeline!.phases['design']!.step = 'all_screens';
    project.pipeline!.phases['design']!.sub_state = 'review';
    project.pipeline!.updated_at = new Date().toISOString();
    await this.saveProject(project);
  }

  private async runDevPhase(project: Project, _feedback?: string): Promise<void> {
    const workspace = await this.prepareDevWorkspace(project);

    if (!project.metadata) project.metadata = {};
    project.metadata.dev_workspace = workspace;

    project.pipeline!.phases['dev']!.sub_state = 'review';
    project.pipeline!.updated_at = new Date().toISOString();
    await this.saveProject(project);
  }

  private async runTestPhase(project: Project, _feedback?: string): Promise<void> {
    const specs = project.artifacts?.specs;
    if (!project.metadata) project.metadata = {};

    const checklist = (specs || []).flatMap(spec =>
      spec.acceptance_criteria.map(criteria => ({
        feature: spec.feature_name,
        criteria,
        passed: false,
      }))
    );
    project.metadata.test_checklist = checklist;

    project.pipeline!.phases['test']!.sub_state = 'review';
    project.pipeline!.updated_at = new Date().toISOString();
    await this.saveProject(project);
  }

  private async runDeployPhase(project: Project, _feedback?: string): Promise<void> {
    if (!project.metadata) project.metadata = {};
    project.metadata.deploy_status = 'ready_for_review';

    project.pipeline!.phases['deploy']!.sub_state = 'review';
    project.pipeline!.updated_at = new Date().toISOString();
    await this.saveProject(project);
  }

  // ============================================================================
  // Phase Approve/Reject
  // ============================================================================

  private async approvePhase(
    project: Project,
    phase: ProjectPhase,
    phaseState: PhaseState
  ): Promise<Project> {
    const now = new Date().toISOString();

    // Handle multi-step concept phase
    if (phase === 'concept') {
      const currentStep = phaseState.step as ConceptStep;

      if (currentStep === 'council_selection') {
        // User approved council -> run council
        return this.advanceConceptStep(project.id, 'council_running');
      }

      if (currentStep === 'council_review') {
        // User approved verdict -> generate PRD
        return this.advanceConceptStep(project.id, 'prd_generation');
      }

      if (currentStep === 'prd_review') {
        // User approved PRD -> advance to spec phase
        phaseState.sub_state = 'approved';
        phaseState.completed_at = now;
        project.pipeline!.updated_at = now;
        await this.saveProject(project);
        return this.advancePhase(project);
      }

      // Other concept steps: shouldn't reach approve
      throw new Error(`Cannot approve concept at step: ${currentStep}`);
    }

    // Handle multi-step design phase
    if (phase === 'design') {
      const currentStep = phaseState.step || 'system';
      if (currentStep === 'system') {
        phaseState.step = 'main_screens';
        phaseState.sub_state = 'working';
        project.pipeline!.updated_at = now;
        await this.saveProject(project);
        return this.startPhase(project.id, 'design');
      } else if (currentStep === 'main_screens') {
        phaseState.step = 'all_screens';
        phaseState.sub_state = 'working';
        project.pipeline!.updated_at = now;
        await this.saveProject(project);
        return this.startPhase(project.id, 'design');
      }
      // all_screens approved -> advance
    }

    // Mark phase as approved and advance
    phaseState.sub_state = 'approved';
    phaseState.completed_at = now;
    project.pipeline!.updated_at = now;
    await this.saveProject(project);

    return this.advancePhase(project);
  }

  private async rejectPhase(
    project: Project,
    phase: ProjectPhase,
    feedback?: string
  ): Promise<Project> {
    const phaseState = project.pipeline!.phases[phase]!;

    // For concept phase, handle step-specific rejection
    if (phase === 'concept') {
      const currentStep = phaseState.step as ConceptStep;

      if (currentStep === 'council_review') {
        // Reject verdict -> go back to refining
        phaseState.step = 'refining';
        phaseState.sub_state = 'working';
        phaseState.feedback = feedback;
        project.pipeline!.updated_at = new Date().toISOString();
        await this.saveProject(project);
        return project;
      }

      if (currentStep === 'prd_review') {
        // Reject PRD -> regenerate with feedback
        phaseState.feedback = feedback;
        project.pipeline!.updated_at = new Date().toISOString();
        await this.saveProject(project);
        return this.advanceConceptStep(project.id, 'prd_generation');
      }

      if (currentStep === 'council_selection') {
        // Reject council selection -> go back to refining, clear concept so it regenerates
        phaseState.step = 'refining';
        phaseState.sub_state = 'working';
        phaseState.feedback = feedback;
        if (project.artifacts) {
          delete project.artifacts.refined_concept;
          delete project.artifacts.selected_council;
        }
        project.pipeline!.updated_at = new Date().toISOString();
        await this.saveProject(project);
        return project;
      }
    }

    phaseState.sub_state = 'rejected';
    phaseState.feedback = feedback;
    project.pipeline!.updated_at = new Date().toISOString();
    await this.saveProject(project);

    // Re-run the phase with feedback
    return this.startPhase(project.id, phase, feedback);
  }

  private async advancePhase(project: Project): Promise<Project> {
    const currentPhase = project.pipeline!.current_phase;
    const currentIdx = PHASE_ORDER.indexOf(currentPhase);

    if (currentIdx === -1 || currentIdx >= PHASE_ORDER.length - 1) {
      // Pipeline complete
      project.pipeline!.current_phase = 'live';
      project.phase = 'live';
      project.pipeline!.phases['live'] = {
        phase: 'live',
        sub_state: 'approved',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      };
      project.pipeline!.updated_at = new Date().toISOString();
      await this.saveProject(project);
      return project;
    }

    const nextPhase = PHASE_ORDER[currentIdx + 1];
    return this.startPhase(project.id, nextPhase);
  }

  // ============================================================================
  // AI Generation Helpers
  // ============================================================================

  private async generatePRDFromConcept(
    project: Project,
    conceptSummary: string,
    verdict?: any
  ): Promise<PRDDocument> {
    const verdictContext = verdict
      ? `\n\nCouncil Verdict (score: ${verdict.overall_score}/10, recommendation: ${verdict.recommendation}):\n${verdict.synthesized_reasoning}\nNext steps: ${verdict.next_steps?.join(', ')}`
      : '';

    const feedbackContext = project.pipeline?.phases['concept']?.feedback
      ? `\n\nPrevious feedback to address: ${project.pipeline.phases['concept'].feedback}`
      : '';

    const systemPrompt = `You are a product manager creating a PRD from a refined concept and council evaluation. Output valid JSON only.`;
    const userMessage = `Create a PRD for this project:

Title: ${project.title}
Refined Concept: ${conceptSummary}${verdictContext}${feedbackContext}

Respond with JSON:
{
  "id": "${project.id}",
  "title": "${project.title}",
  "description": "Comprehensive description",
  "requirements": ["requirement 1", "requirement 2", ...],
  "user_stories": ["As a user, I want...", ...],
  "constraints": ["constraint 1", ...],
  "success_metrics": ["metric 1", ...]
}`;

    try {
      const response = await cachedInference.complete(
        userMessage,
        systemPrompt,
        'content_creation',
        'standard',
        { max_tokens: 3000, temperature: 0.4 }
      );
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as PRDDocument;
      }
    } catch (error) {
      console.error('[Pipeline] PRD generation failed, using basic PRD:', error);
    }

    return {
      id: project.id,
      title: project.title,
      description: conceptSummary || project.description || '',
      requirements: ['Define core requirements'],
    };
  }

  private async refineSpecs(
    specs: Specification[],
    feedback: string,
    prd: PRDDocument
  ): Promise<Specification[]> {
    const systemPrompt = `You are a Senior Technical Architect refining specifications based on user feedback. Output valid JSON array only.`;
    const userMessage = `Refine these technical specifications based on feedback:

PRD Title: ${prd.title}
PRD Requirements: ${prd.requirements.join(', ')}

Current Specs:
${JSON.stringify(specs, null, 2)}

User Feedback: ${feedback}

Respond with the updated specs array in the same JSON format.`;

    try {
      const response = await cachedInference.complete(
        userMessage,
        systemPrompt,
        'code_generation',
        'standard',
        { max_tokens: 4000, temperature: 0.3 }
      );
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as Specification[];
      }
    } catch (error) {
      console.error('[Pipeline] Spec refinement failed:', error);
    }
    return specs;
  }

  private async generateDesignSystem(
    project: Project,
    prd: PRDDocument,
    specs: Specification[]
  ): Promise<DesignSystem> {
    const systemPrompt = `You are a UI/UX designer creating a design system. Output valid JSON only.`;
    const featureList = specs.map(s => s.feature_name).join(', ');
    const componentList = specs.flatMap(s => s.frontend.components);

    const userMessage = `Create a design system for this project:

Title: ${prd.title}
Description: ${prd.description}
Features: ${featureList}
Components needed: ${componentList.join(', ')}

Respond with JSON:
{
  "color_palette": [{"name": "primary", "hex": "#...", "usage": "Main actions and links"}, ...],
  "typography": [{"role": "heading", "font": "Inter", "size": "24px", "weight": "700"}, ...],
  "spacing_scale": {"xs": "4px", "sm": "8px", "md": "16px", "lg": "24px", "xl": "32px"},
  "component_inventory": ["Button", "Card", "Input", ...],
  "brand_guidelines": "Brief brand description"
}`;

    try {
      const response = await cachedInference.complete(
        userMessage,
        systemPrompt,
        'content_creation',
        'standard',
        { max_tokens: 3000, temperature: 0.5 }
      );
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as DesignSystem;
      }
    } catch (error) {
      console.error('[Pipeline] Design system generation failed:', error);
    }

    return {
      color_palette: [
        { name: 'primary', hex: '#137fec', usage: 'Main actions and links' },
        { name: 'background', hex: '#101922', usage: 'Page background' },
        { name: 'surface', hex: '#1a2632', usage: 'Card surfaces' },
        { name: 'text', hex: '#ffffff', usage: 'Primary text' },
        { name: 'muted', hex: '#92adc9', usage: 'Secondary text' },
      ],
      typography: [
        { role: 'heading', font: 'Inter', size: '24px', weight: '700' },
        { role: 'body', font: 'Inter', size: '16px', weight: '400' },
        { role: 'caption', font: 'Inter', size: '12px', weight: '500' },
      ],
      spacing_scale: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' },
      component_inventory: componentList,
    };
  }

  private async refineDesignSystem(
    ds: DesignSystem,
    feedback: string,
    prd: PRDDocument
  ): Promise<DesignSystem> {
    const systemPrompt = `You are a UI/UX designer refining a design system. Output valid JSON only.`;
    const userMessage = `Refine this design system based on feedback:

Project: ${prd.title}
Current Design System:
${JSON.stringify(ds, null, 2)}

Feedback: ${feedback}

Respond with the updated design system as JSON.`;

    try {
      const response = await cachedInference.complete(
        userMessage,
        systemPrompt,
        'content_creation',
        'standard',
        { max_tokens: 3000, temperature: 0.5 }
      );
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as DesignSystem;
      }
    } catch (error) {
      console.error('[Pipeline] Design system refinement failed:', error);
    }
    return ds;
  }

  // ============================================================================
  // Dev Workspace
  // ============================================================================

  private async prepareDevWorkspace(project: Project): Promise<string> {
    const { getVaultPath, ensureDir } = await import('../utils/file-operations');
    const fs = await import('fs/promises');
    const path = await import('path');

    const workspaceDir = getVaultPath('07_system', 'dev-workspaces', project.id);
    await ensureDir(workspaceDir);

    const prd = project.artifacts?.prd;
    const specs = project.artifacts?.specs;
    const designSystem = project.artifacts?.design_system;

    const claudeMd = `# ${project.title} - Development Context

## Project Overview
${prd?.description || project.description || 'No description available.'}

## PRD Summary
${prd ? `### Requirements\n${prd.requirements.map(r => `- ${r}`).join('\n')}` : 'No PRD available.'}
${prd?.user_stories ? `\n### User Stories\n${prd.user_stories.map(s => `- ${s}`).join('\n')}` : ''}
${prd?.constraints ? `\n### Constraints\n${prd.constraints.map(c => `- ${c}`).join('\n')}` : ''}

## Technical Specifications
${specs ? specs.map(s => `### ${s.feature_name}
${s.description}
- **Frontend Components**: ${s.frontend.components.join(', ')}
- **Routes**: ${s.frontend.routes.join(', ')}
- **API Endpoints**: ${s.backend.endpoints.map(e => `${e.method} ${e.path}`).join(', ')}
- **Complexity**: ${s.complexity}
- **Acceptance Criteria**:
${s.acceptance_criteria.map(c => `  - ${c}`).join('\n')}`).join('\n\n') : 'No specs available.'}

## Design System
${designSystem ? `- **Colors**: ${designSystem.color_palette?.map(c => `${c.name}: ${c.hex}`).join(', ') || 'Default'}
- **Typography**: ${designSystem.typography?.[0]?.font || 'Inter'}
- **Components**: ${designSystem.component_inventory?.join(', ') || 'Standard'}` : 'No design system available.'}

## Implementation Order
${specs ? specs.map((s, i) => `${i + 1}. ${s.feature_name} (${s.complexity})`).join('\n') : 'Define in TASKS.md'}
`;

    await fs.writeFile(path.join(workspaceDir, 'CLAUDE.md'), claudeMd, 'utf-8');

    const tasksMd = `# ${project.title} - Task Breakdown

${specs ? specs.map((s, i) => `## Task ${i + 1}: ${s.feature_name}
- **Complexity**: ${s.complexity}
- **Description**: ${s.description}
- **Done Criteria**:
${s.acceptance_criteria.map(c => `  - [ ] ${c}`).join('\n')}
- **Dependencies**: ${s.dependencies.length > 0 ? s.dependencies.join(', ') : 'None'}
`).join('\n') : '## No specs defined yet\nDefine tasks manually.'}
`;

    await fs.writeFile(path.join(workspaceDir, 'TASKS.md'), tasksMd, 'utf-8');

    return workspaceDir;
  }

  // ============================================================================
  // Project I/O Helpers
  // ============================================================================

  private async getProject(projectId: string): Promise<Project> {
    const project = await this.vaultService.getProjectById(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    return project;
  }

  private async saveProject(project: Project): Promise<void> {
    await this.vaultService.updateProject(project.id, project);
  }
}

export const pipelineService = new PipelineService();
