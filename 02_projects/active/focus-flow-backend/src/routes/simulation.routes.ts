import { Router, Request, Response } from 'express';
import { simulationService } from '../services/simulation.service';

const router = Router();

// POST /api/simulations/run — Run a what-if simulation
router.post('/simulations/run', async (req: Request, res: Response) => {
  try {
    const {
      projects = [],
      budgetPerDay = 20,
      founderHoursPerWeek = 20,
      riskTolerance = 'medium',
      timeHorizonWeeks = 12,
    } = req.body;

    const result = await simulationService.run({
      projects,
      budgetPerDay,
      founderHoursPerWeek,
      riskTolerance,
      timeHorizonWeeks,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error running simulation:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
