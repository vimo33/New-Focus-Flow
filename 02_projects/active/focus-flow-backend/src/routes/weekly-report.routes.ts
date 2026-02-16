import { Router, Request, Response } from 'express';
import { weeklyReportService } from '../services/weekly-report.service';

const router = Router();

// POST /api/reports/weekly/generate
router.post('/reports/weekly/generate', async (req: Request, res: Response) => {
  try {
    const report = await weeklyReportService.generateReport();
    res.status(201).json(report);
  } catch (error: any) {
    console.error('Error generating weekly report:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/weekly/latest
router.get('/reports/weekly/latest', async (req: Request, res: Response) => {
  try {
    const report = await weeklyReportService.getLatestReport();
    if (!report) {
      return res.status(404).json({ error: 'No weekly reports found' });
    }
    res.json(report);
  } catch (error: any) {
    console.error('Error fetching latest weekly report:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/weekly
router.get('/reports/weekly', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const reports = await weeklyReportService.getReports(limit);
    res.json({ reports, count: reports.length });
  } catch (error: any) {
    console.error('Error fetching weekly reports:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
