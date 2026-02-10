import { Router, Request, Response } from 'express';
import { salesService } from '../services/sales.service';
import type { DealStage } from '../services/sales.service';

const router = Router();

// GET /api/sales/deals
router.get('/sales/deals', async (req: Request, res: Response) => {
  try {
    const stage = req.query.stage as DealStage | undefined;
    const deals = await salesService.getDeals(stage);
    res.json({ deals, count: deals.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sales/pipeline
router.get('/sales/pipeline', async (req: Request, res: Response) => {
  try {
    const summary = await salesService.getPipelineSummary();
    res.json({ pipeline: summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sales/deals/:id
router.get('/sales/deals/:id', async (req: Request, res: Response) => {
  try {
    const deal = await salesService.getDeal(String(req.params.id));
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    res.json(deal);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sales/deals
router.post('/sales/deals', async (req: Request, res: Response) => {
  try {
    const deal = await salesService.createDeal(req.body);
    res.status(201).json({ status: 'created', deal });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/sales/deals/:id
router.put('/sales/deals/:id', async (req: Request, res: Response) => {
  try {
    const deal = await salesService.updateDeal(String(req.params.id), req.body);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    res.json({ status: 'updated', deal });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
