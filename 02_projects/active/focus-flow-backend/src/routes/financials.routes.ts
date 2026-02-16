import { Router, Request, Response } from 'express';
import { financialsService } from '../services/financials.service';
import { opportunityScanner } from '../services/opportunity-scanner.service';

const router = Router();

// GET /api/financials/portfolio
router.get('/financials/portfolio', async (req: Request, res: Response) => {
  try {
    const portfolio = await financialsService.getPortfolioFinancials();
    res.json(portfolio);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/financials/goals
router.get('/financials/goals', async (req: Request, res: Response) => {
  try {
    const goals = await financialsService.getGoals();
    res.json(goals || {});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/financials/goals
router.put('/financials/goals', async (req: Request, res: Response) => {
  try {
    const goals = await financialsService.setGoals(req.body);
    res.json(goals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/financials/revenue
router.post('/financials/revenue', async (req: Request, res: Response) => {
  try {
    const stream = await financialsService.addRevenue(req.body);
    res.status(201).json({ status: 'created', revenue: stream });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/financials/revenue/:id
router.put('/financials/revenue/:id', async (req: Request, res: Response) => {
  try {
    const stream = await financialsService.updateRevenue(String(req.params.id), req.body);
    if (!stream) return res.status(404).json({ error: 'Revenue stream not found' });
    res.json({ status: 'updated', revenue: stream });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/financials/revenue/:id
router.delete('/financials/revenue/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await financialsService.deleteRevenue(String(req.params.id));
    if (!deleted) return res.status(404).json({ error: 'Revenue stream not found' });
    res.json({ status: 'deleted', id: req.params.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/financials/cost
router.post('/financials/cost', async (req: Request, res: Response) => {
  try {
    const item = await financialsService.addCost(req.body);
    res.status(201).json({ status: 'created', cost: item });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/financials/cost/:id
router.put('/financials/cost/:id', async (req: Request, res: Response) => {
  try {
    const item = await financialsService.updateCost(String(req.params.id), req.body);
    if (!item) return res.status(404).json({ error: 'Cost item not found' });
    res.json({ status: 'updated', cost: item });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/financials/cost/:id
router.delete('/financials/cost/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await financialsService.deleteCost(String(req.params.id));
    if (!deleted) return res.status(404).json({ error: 'Cost item not found' });
    res.json({ status: 'deleted', id: req.params.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/financials/snapshot
router.post('/financials/snapshot', async (req: Request, res: Response) => {
  try {
    const snapshot = await financialsService.createSnapshot();
    res.status(201).json({ status: 'created', snapshot });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/financials/snapshots
router.get('/financials/snapshots', async (req: Request, res: Response) => {
  try {
    const snapshots = await financialsService.getSnapshots();
    res.json({ snapshots, count: snapshots.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/financials/scan-opportunities — trigger opportunity scan
router.post('/financials/scan-opportunities', async (req: Request, res: Response) => {
  try {
    const result = await opportunityScanner.scan();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/financials/opportunities — get latest scan results
router.get('/financials/opportunities', async (req: Request, res: Response) => {
  try {
    const result = await opportunityScanner.getLatestScan();
    res.json(result || { opportunities: [], scanned_at: null, summary: 'No scan data available' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/financials/inference-costs
router.get('/financials/inference-costs', async (req: Request, res: Response) => {
  try {
    const days = parseInt(String(req.query.days)) || 30;
    const costs = await financialsService.getInferenceCosts(days);
    res.json(costs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/financials/:projectId — MUST be last to avoid catching named routes
router.get('/financials/:projectId', async (req: Request, res: Response) => {
  try {
    const result = await financialsService.getProjectFinancials(String(req.params.projectId));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
