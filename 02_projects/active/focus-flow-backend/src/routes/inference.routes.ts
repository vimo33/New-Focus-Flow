import { Router, Request, Response } from 'express';
import { cachedInference } from '../services/cached-inference.service';
import { inferenceLogger } from '../services/inference-logger.service';
import { modelRouter } from '../services/model-router.service';

const router = Router();

/**
 * GET /api/inference/stats
 * Aggregated cost/usage stats from logger + live cache stats
 */
router.get('/inference/stats', async (_req: Request, res: Response) => {
  try {
    const days = parseInt(_req.query.days as string) || 7;
    const logStats = await inferenceLogger.getStats(days);
    const cacheStats = cachedInference.getStats();

    res.json({
      cache: cacheStats,
      log: logStats.totals,
      daily: logStats.daily,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/inference/routes
 * Current routing table
 */
router.get('/inference/routes', (_req: Request, res: Response) => {
  try {
    const table = modelRouter.getRoutingTable();
    res.json(table);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/inference/routes/reload
 * Hot-reload model-routes.json
 */
router.post('/inference/routes/reload', async (_req: Request, res: Response) => {
  try {
    await modelRouter.reloadConfig();
    const table = modelRouter.getRoutingTable();
    res.json({ status: 'reloaded', ...table });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
