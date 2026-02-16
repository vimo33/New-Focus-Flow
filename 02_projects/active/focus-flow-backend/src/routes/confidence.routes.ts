import { Router, Request, Response } from 'express';
import { confidenceService } from '../services/confidence.service';

const router = Router();

// GET /confidence/report — latest calibration report
router.get('/confidence/report', async (req: Request, res: Response) => {
  try {
    const report = await confidenceService.getCalibrationReport();
    if (!report) {
      return res.json({ report: null, message: 'No calibration report yet. Run POST /confidence/calibrate first.' });
    }
    res.json({ report });
  } catch (error: any) {
    console.error('[ConfidenceRoutes] Error fetching report:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /confidence/records — list confidence records
router.get('/confidence/records', async (req: Request, res: Response) => {
  try {
    const actionType = req.query.action_type as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const records = await confidenceService.getAllRecords(actionType);
    res.json({ records: records.slice(0, limit), count: records.length });
  } catch (error: any) {
    console.error('[ConfidenceRoutes] Error fetching records:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /confidence/calibrate — trigger calibration
router.post('/confidence/calibrate', async (req: Request, res: Response) => {
  try {
    const report = await confidenceService.runMonthlyCalibration();
    res.json({ status: 'calibrated', report });
  } catch (error: any) {
    console.error('[ConfidenceRoutes] Error running calibration:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /confidence/trust-evolution — check evolution candidates
router.get('/confidence/trust-evolution', async (req: Request, res: Response) => {
  try {
    const actionType = req.query.action_type as string | undefined;

    if (actionType) {
      const candidate = await confidenceService.checkTrustEvolution(actionType);
      res.json({ candidates: [candidate] });
    } else {
      // Return from latest calibration report
      const report = await confidenceService.getCalibrationReport();
      res.json({ candidates: report?.trust_evolution_candidates || [] });
    }
  } catch (error: any) {
    console.error('[ConfidenceRoutes] Error checking trust evolution:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
