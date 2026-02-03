import { Router, Request, Response } from 'express';
import { VaultService } from '../services/vault.service';
import { HealthMetric } from '../models/types';

const router = Router();
const vaultService = new VaultService();

// POST /api/health/log - Log health metric
router.post('/health/log', async (req: Request, res: Response) => {
  try {
    const metricData: Partial<HealthMetric> = req.body;

    if (!metricData.metric_type || metricData.value === undefined) {
      return res.status(400).json({ error: 'Metric type and value are required' });
    }

    const metric = await vaultService.logHealthMetric(metricData);

    res.status(201).json({
      status: 'logged',
      metric
    });
  } catch (error: any) {
    console.error('Error logging health metric:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
