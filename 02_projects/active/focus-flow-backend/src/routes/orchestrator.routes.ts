import { Router, Request, Response } from 'express';
import { OrchestratorService } from '../services/orchestrator.service';

const router = Router();
const orchestratorService = new OrchestratorService();

/**
 * POST /api/orchestrator/prd/:ideaId
 * Start autonomous PRD-to-Code processing for an idea
 *
 * Returns 202 Accepted with run_id for tracking
 */
router.post('/prd/:ideaId', async (req: Request, res: Response) => {
  try {
    const ideaId = String(req.params.ideaId);

    console.log(`Starting orchestrator for idea: ${ideaId}`);

    // Start processing asynchronously (don't await - return immediately)
    orchestratorService.processPRD(ideaId).catch((error) => {
      console.error(`Orchestrator failed for ${ideaId}:`, error);
    });

    // Create a temporary run ID for tracking
    const run = await orchestratorService.getRun(
      (await orchestratorService.getAllRuns())[0]?.id || 'pending'
    ).catch(() => null);

    res.status(202).json({
      status: 'processing',
      message: 'PRD processing started',
      idea_id: ideaId,
    });
  } catch (error: any) {
    console.error('Error starting orchestrator:', error);
    res.status(500).json({
      error: 'Failed to start orchestrator',
      details: error.message,
    });
  }
});

/**
 * GET /api/orchestrator/runs/:runId
 * Get status of a specific orchestrator run
 */
router.get('/runs/:runId', async (req: Request, res: Response) => {
  try {
    const runId = String(req.params.runId);
    const run = await orchestratorService.getRun(runId);

    res.json({ run });
  } catch (error: any) {
    console.error('Error fetching run:', error);
    res.status(404).json({
      error: 'Run not found',
      details: error.message,
    });
  }
});

/**
 * GET /api/orchestrator/runs
 * List all orchestrator runs
 */
router.get('/runs', async (req: Request, res: Response) => {
  try {
    const runs = await orchestratorService.getAllRuns();

    res.json({
      runs,
      count: runs.length,
    });
  } catch (error: any) {
    console.error('Error listing runs:', error);
    res.status(500).json({
      error: 'Failed to list runs',
      details: error.message,
    });
  }
});

export default router;
