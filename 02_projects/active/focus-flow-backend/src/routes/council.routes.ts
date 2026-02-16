import { Router, Request, Response } from 'express';
import { councilFramework } from '../ai/council-framework';
import { councilComposer } from '../ai/council-composer';
import { councilSynthesis } from '../ai/council-synthesis';
import { aiCouncil } from '../ai/ai-council';
import { VaultService } from '../services/vault.service';
import { EnhancedAgentEvaluation } from '../models/types';

const router = Router();
const vaultService = new VaultService();

/**
 * POST /api/council/evaluate
 *
 * Invoke a full council evaluation. If `panel` is omitted, auto-composes
 * agents from the decision type config (Flow A).
 *
 * Body: { decision_type, title, description, project_id?, panel? }
 * Returns: { verdict: EnhancedCouncilVerdict }
 */
router.post('/council/evaluate', async (req: Request, res: Response) => {
  try {
    const { decision_type, title, description, project_id, panel } = req.body;

    if (!decision_type || !title || !description) {
      return res.status(400).json({ error: 'Missing required fields: decision_type, title, description' });
    }

    // Load config
    const config = await councilFramework.getConfig(decision_type);
    if (!config) {
      return res.status(404).json({ error: `No config found for decision type '${decision_type}'` });
    }

    // Compose panel: use provided panel or auto-compose
    const members = panel && Array.isArray(panel) && panel.length > 0
      ? panel
      : await councilComposer.autoCompose(decision_type, title, description, project_id);

    console.log(`[Council] Evaluating '${title}' (${decision_type}) with ${members.length} agents`);

    // Run agents via existing AICouncil engine (parallel execution)
    const rawVerdict = await aiCouncil.validateWithCouncil(title, description, members, project_id);

    // Cast evaluations to enhanced (DynamicAgent now returns enhanced fields)
    const enhancedEvaluations = rawVerdict.evaluations as EnhancedAgentEvaluation[];

    // Synthesize enhanced verdict
    const verdict = await councilSynthesis.synthesize(
      title, description, enhancedEvaluations, config, project_id
    );

    // Persist verdict
    await councilFramework.persistVerdict(verdict);

    res.status(200).json({ verdict });
  } catch (error: any) {
    console.error('[Council] Evaluate error:', error);
    if (error.message?.includes('OpenClaw') || error.message?.includes('OPENCLAW')) {
      return res.status(500).json({
        error: 'AI service not configured',
        message: 'OpenClaw Gateway is not accessible.',
      });
    }
    res.status(500).json({ error: 'Council evaluation failed', message: error.message });
  }
});

/**
 * POST /api/council/propose
 *
 * Flow B step 1: Propose a panel for interactive curation.
 *
 * Body: { decision_type, title, description, project_id? }
 * Returns: { proposal: CouncilPanelProposal }
 */
router.post('/council/propose', async (req: Request, res: Response) => {
  try {
    const { decision_type, title, description, project_id } = req.body;

    if (!decision_type || !title || !description) {
      return res.status(400).json({ error: 'Missing required fields: decision_type, title, description' });
    }

    const proposal = await councilComposer.propose(decision_type, title, description, project_id);
    res.status(200).json({ proposal });
  } catch (error: any) {
    console.error('[Council] Propose error:', error);
    res.status(500).json({ error: 'Panel proposal failed', message: error.message });
  }
});

/**
 * POST /api/council/compose
 *
 * Flow B step 2: Apply modifications to a proposed panel.
 *
 * Body: { proposed_agents, modifications, persist_custom_agents? }
 * Returns: { final_panel: CouncilMember[] }
 */
router.post('/council/compose', async (req: Request, res: Response) => {
  try {
    const { proposed_agents, modifications, persist_custom_agents } = req.body;

    if (!proposed_agents || !Array.isArray(proposed_agents)) {
      return res.status(400).json({ error: 'Missing required field: proposed_agents (array)' });
    }

    const finalPanel = councilComposer.applyModifications(
      proposed_agents,
      modifications || []
    );

    // Optionally persist custom agents to Mem0
    if (persist_custom_agents && modifications) {
      for (const mod of modifications) {
        if ((mod.action === 'add' || mod.action === 'custom') && mod.new_agent) {
          await councilComposer.persistCustomAgent(mod.new_agent);
        }
      }
    }

    res.status(200).json({ final_panel: finalPanel });
  } catch (error: any) {
    console.error('[Council] Compose error:', error);
    res.status(500).json({ error: 'Panel composition failed', message: error.message });
  }
});

/**
 * GET /api/council/configs
 *
 * List all available decision type configs (summary view).
 */
router.get('/council/configs', async (req: Request, res: Response) => {
  try {
    const configs = await councilFramework.listConfigs();
    const summaries = configs.map(c => ({
      decision_type: c.decision_type,
      display_name: c.display_name,
      description: c.description,
      default_agent_count: c.default_agent_count,
      required_dimensions: c.required_dimensions,
    }));
    res.status(200).json({ configs: summaries });
  } catch (error: any) {
    console.error('[Council] List configs error:', error);
    res.status(500).json({ error: 'Failed to list configs', message: error.message });
  }
});

/**
 * GET /api/council/configs/:type
 *
 * Get full config for a specific decision type.
 */
router.get('/council/configs/:type', async (req: Request, res: Response) => {
  try {
    const type = Array.isArray(req.params.type) ? req.params.type[0] : req.params.type;
    const config = await councilFramework.getConfig(type as string);
    if (!config) {
      return res.status(404).json({ error: `Config not found for type '${type}'` });
    }
    res.status(200).json({ config });
  } catch (error: any) {
    console.error('[Council] Get config error:', error);
    res.status(500).json({ error: 'Failed to get config', message: error.message });
  }
});

/**
 * GET /api/council/verdicts
 *
 * List verdicts, with optional ?project_id= filter.
 */
router.get('/council/verdicts', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.project_id as string | undefined;
    const verdicts = await councilFramework.listVerdicts(projectId);
    // Return summary view
    const summaries = verdicts.map(v => ({
      id: v.id,
      decision_type: v.decision_type,
      verdict: v.verdict,
      overall_score: v.overall_score,
      subject_title: v.subject_title,
      recommendation: v.recommendation,
      created_at: v.created_at,
      project_id: v.project_id,
      council_composition: v.council_composition,
    }));
    res.status(200).json({ verdicts: summaries });
  } catch (error: any) {
    console.error('[Council] List verdicts error:', error);
    res.status(500).json({ error: 'Failed to list verdicts', message: error.message });
  }
});

/**
 * GET /api/council/verdicts/:verdictId
 *
 * Get a single verdict by ID.
 */
router.get('/council/verdicts/:verdictId', async (req: Request, res: Response) => {
  try {
    const verdictId = Array.isArray(req.params.verdictId) ? req.params.verdictId[0] : req.params.verdictId;
    const verdict = await councilFramework.getVerdict(verdictId as string);
    if (!verdict) {
      return res.status(404).json({ error: `Verdict '${verdictId}' not found` });
    }
    res.status(200).json({ verdict });
  } catch (error: any) {
    console.error('[Council] Get verdict error:', error);
    res.status(500).json({ error: 'Failed to get verdict', message: error.message });
  }
});

/**
 * POST /api/council/:verdictId/apply-actions
 *
 * Create tasks from verdict recommended actions.
 *
 * Body: { action_indices, project_id }
 * Returns: { created_tasks }
 */
router.post('/council/:verdictId/apply-actions', async (req: Request, res: Response) => {
  try {
    const verdictId = Array.isArray(req.params.verdictId) ? req.params.verdictId[0] : req.params.verdictId;
    const { action_indices, project_id } = req.body;

    const verdict = await councilFramework.getVerdict(verdictId as string);
    if (!verdict) {
      return res.status(404).json({ error: `Verdict '${verdictId}' not found` });
    }

    if (!action_indices || !Array.isArray(action_indices) || action_indices.length === 0) {
      return res.status(400).json({ error: 'Missing required field: action_indices (non-empty array)' });
    }

    const createdTasks = [];

    for (const idx of action_indices) {
      const action = verdict.recommended_actions[idx];
      if (!action) {
        console.warn(`[Council] Action index ${idx} out of bounds, skipping`);
        continue;
      }
      if (!action.can_auto_create_task) {
        console.warn(`[Council] Action '${action.action}' not auto-creatable, skipping`);
        continue;
      }

      const template = action.task_template || {
        title: action.action,
        description: `Created from council verdict ${verdictId}: ${action.action}`,
        category: 'work' as const,
        priority: action.priority,
      };

      const task = await vaultService.createTask({
        title: template.title,
        description: template.description,
        category: template.category,
        priority: template.priority,
        project_id: project_id || verdict.project_id,
        metadata: {
          source: 'council_verdict',
          verdict_id: verdictId,
          decision_type: verdict.decision_type,
        },
      });

      createdTasks.push(task);
    }

    res.status(200).json({ created_tasks: createdTasks });
  } catch (error: any) {
    console.error('[Council] Apply actions error:', error);
    res.status(500).json({ error: 'Failed to apply actions', message: error.message });
  }
});

export default router;
