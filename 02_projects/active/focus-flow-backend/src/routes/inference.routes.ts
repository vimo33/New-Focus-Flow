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

/**
 * GET /api/usage/summary
 * Aggregated usage with cost breakdowns by model, caller, and day
 */
router.get('/usage/summary', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const caller = req.query.caller as string | undefined;
    const logStats = await inferenceLogger.getStats(days);

    // If caller filter specified, re-aggregate from raw entries
    if (caller) {
      const raw = await inferenceLogger.getRawEntries({ days, caller });
      const filtered = raw.entries;
      let total_input_tokens = 0, total_output_tokens = 0, total_estimated_cost_usd = 0;
      for (const e of filtered) {
        total_input_tokens += e.prompt_tokens;
        total_output_tokens += e.completion_tokens;
        total_estimated_cost_usd += e.estimated_cost_usd || 0;
      }
      res.json({
        total_calls: raw.total,
        total_input_tokens,
        total_output_tokens,
        total_estimated_cost_usd,
        caller_filter: caller,
      });
      return;
    }

    const { totals, daily } = logStats;

    // Build daily_breakdown array sorted by date
    const daily_breakdown = Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date,
        calls: d.total_requests,
        input_tokens: d.total_input_tokens,
        output_tokens: d.total_output_tokens,
        cost_usd: Math.round(d.total_cost_usd * 1_000_000) / 1_000_000,
      }));

    res.json({
      total_calls: totals.total_requests,
      total_input_tokens: totals.total_input_tokens,
      total_output_tokens: totals.total_output_tokens,
      total_estimated_cost_usd: Math.round(totals.total_cost_usd * 1_000_000) / 1_000_000,
      cache_hits: totals.cache_hits,
      by_model: totals.by_model,
      by_caller: totals.by_caller,
      daily_breakdown,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/usage/raw
 * Raw log entries, newest-first, with optional filters
 */
router.get('/usage/raw', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const offset = parseInt(req.query.offset as string) || 0;
    const caller = req.query.caller as string | undefined;
    const days = parseInt(req.query.days as string) || 30;

    const result = await inferenceLogger.getRawEntries({ limit, offset, caller, days });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
