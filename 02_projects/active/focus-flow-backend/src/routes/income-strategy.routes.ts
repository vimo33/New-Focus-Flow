import { Router, Request, Response } from 'express';
import { incomeStrategyService } from '../services/income-strategy.service';

const router = Router();

// GET /api/income/strategies — list all non-dismissed strategies
router.get('/income/strategies', async (req: Request, res: Response) => {
  try {
    const strategies = await incomeStrategyService.getStrategies();
    res.json({ strategies, count: strategies.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/income/strategies/generate — trigger AI generation
router.post('/income/strategies/generate', async (req: Request, res: Response) => {
  try {
    const strategies = await incomeStrategyService.generateStrategies();
    res.json({ strategies, count: strategies.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/income/strategies/:id/status — update strategy status
router.put('/income/strategies/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });
    const strategy = await incomeStrategyService.updateStrategyStatus(String(req.params.id), status);
    if (!strategy) return res.status(404).json({ error: 'Strategy not found' });
    res.json({ status: 'updated', strategy });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/income/strategies/:id/evaluate — re-evaluate single (re-generates all for now)
router.post('/income/strategies/:id/evaluate', async (req: Request, res: Response) => {
  try {
    const strategies = await incomeStrategyService.generateStrategies();
    const found = strategies.find(s => s.id === req.params.id);
    res.json({ strategy: found || strategies[0] || null });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/income/goal-gap — goal-gap analysis
router.get('/income/goal-gap', async (req: Request, res: Response) => {
  try {
    const analysis = await incomeStrategyService.getGoalGapAnalysis();
    res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
