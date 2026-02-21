import { Router, Request, Response } from 'express';
import { briefingService } from '../services/briefing.service';
import { eventDetectionService } from '../services/event-detection.service';

const router = Router();

// GET /api/briefing/today
router.get('/briefing/today', async (req: Request, res: Response) => {
  try {
    const briefing = await briefingService.getToday();
    if (!briefing) {
      res.status(404).json({ error: 'No briefing generated for today yet' });
      return;
    }
    res.json(briefing);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/briefing/narrative — just the TTS-ready text
router.get('/briefing/narrative', async (req: Request, res: Response) => {
  try {
    const narrative = await briefingService.getNarrative();
    if (!narrative) {
      res.status(404).json({ error: 'No briefing available today' });
      return;
    }
    res.json({ narrative });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/briefing/history?days=7
router.get('/briefing/history', async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
    const history = await briefingService.getHistory(days);
    res.json({ count: history.length, briefings: history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/latest
router.get('/events/latest', async (req: Request, res: Response) => {
  try {
    const report = await eventDetectionService.getLatestEvents();
    if (!report) {
      res.status(404).json({ error: 'No event scan available' });
      return;
    }
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/urgent
router.get('/events/urgent', async (req: Request, res: Response) => {
  try {
    const urgent = await eventDetectionService.getUrgentEvents();
    res.json({ count: urgent.length, events: urgent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/history?days=7
router.get('/events/history', async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
    const history = await eventDetectionService.getEventHistory(days);
    res.json({ count: history.length, reports: history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/project/:projectId
router.get('/events/project/:projectId', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId as string;
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 14;
    const events = await eventDetectionService.getEventsByProject(projectId, days);
    res.json({ project_id: projectId, count: events.length, events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
