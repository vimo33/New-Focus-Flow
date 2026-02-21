import { Router, Request, Response } from 'express';
import { agentRunsService } from '../services/agent-runs.service';

const router = Router();

// GET /api/agent-runs — List agent runs with optional filters
router.get('/agent-runs', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const mode = req.query.mode as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const runs = await agentRunsService.list({ status: status as any, mode: mode as any, limit });
    res.json({ runs, count: runs.length });
  } catch (error: any) {
    console.error('Error listing agent runs:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agent-runs/stats — Aggregate stats
router.get('/agent-runs/stats', async (req: Request, res: Response) => {
  try {
    const stats = await agentRunsService.getStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error getting agent run stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agent-runs/:id — Single run detail
router.get('/agent-runs/:id', async (req: Request, res: Response) => {
  try {
    const run = await agentRunsService.getById(req.params.id as string);
    if (!run) {
      res.status(404).json({ error: 'Agent run not found' });
      return;
    }
    res.json(run);
  } catch (error: any) {
    console.error('Error getting agent run:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
