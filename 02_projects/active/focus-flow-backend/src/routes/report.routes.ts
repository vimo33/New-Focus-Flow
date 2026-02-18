import { Router, Request, Response, NextFunction } from 'express';
import { reportService } from '../services/report.service';

const router = Router();

// GET /api/reports/types — list available report types
router.get('/reports/types', async (req: Request, res: Response) => {
  try {
    const types = await reportService.getReportTypes();
    res.json({ types });
  } catch (error: any) {
    console.error('Error fetching report types:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/:id — get specific report
// Skip 'weekly' to avoid conflict with weekly-report.routes.ts
router.get('/reports/:id', async (req: Request, res: Response, next: NextFunction) => {
  const id = req.params.id as string;

  // Let weekly-report.routes.ts handle /reports/weekly/*
  if (id === 'weekly') {
    return next();
  }

  try {
    const report = await reportService.getReport(id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (error: any) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports — list all reports (optional ?type= filter)
// Must be AFTER /reports/types and /reports/:id to not shadow them
router.get('/reports', async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const reports = await reportService.listReports(type, limit);
    res.json({ reports, count: reports.length });
  } catch (error: any) {
    console.error('Error listing reports:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
