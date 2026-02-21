import { Router, Request, Response } from 'express';
import { portfolioDashboardService } from '../services/portfolio-dashboard.service';

const router = Router();

// GET /api/portfolio/dashboard
router.get('/portfolio/dashboard', async (req: Request, res: Response) => {
  try {
    const dashboard = await portfolioDashboardService.getDashboard();
    res.json(dashboard);
  } catch (error: any) {
    console.error('Error fetching portfolio dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/portfolio/ideas/ranked
router.get('/portfolio/ideas/ranked', async (req: Request, res: Response) => {
  try {
    const ideas = await portfolioDashboardService.getRankedIdeas();
    res.json({ ideas, count: ideas.length });
  } catch (error: any) {
    console.error('Error fetching ranked ideas:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/portfolio/ideas/:id/evaluate
router.post('/portfolio/ideas/:id/evaluate', async (req: Request, res: Response) => {
  try {
    const ranked = await portfolioDashboardService.evaluateIdea(String(req.params.id));
    res.json(ranked);
  } catch (error: any) {
    console.error('Error evaluating idea:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
