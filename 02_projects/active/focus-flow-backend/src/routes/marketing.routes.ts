import { Router, Request, Response } from 'express';
import { gtmOrchestrator } from '../services/gtm-orchestrator.service';
import { blogPublisher } from '../services/blog-publisher.service';
import { socialPublisher } from '../services/social-publisher.service';
import { VaultService } from '../services/vault.service';
import type { CalendarEntryStatus, ContentChannel } from '../models/types';

const router = Router();
const vault = new VaultService();

// GET /api/marketing/:projectId/strategy
router.get('/marketing/:projectId/strategy', async (req: Request, res: Response) => {
  try {
    const strategy = await gtmOrchestrator.getStrategy(String(req.params.projectId));
    res.json(strategy || { status: 'none' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/marketing/:projectId/strategy
router.post('/marketing/:projectId/strategy', async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);

    if (req.body.generate) {
      const project = await vault.getProjectById(projectId);
      const title = project?.title || projectId;
      const description = project?.description || '';
      const strategy = await gtmOrchestrator.generateStrategy(
        projectId,
        title,
        description,
        req.body.council_verdict_id
      );
      return res.json({ status: 'generated', strategy });
    }

    const strategy = await gtmOrchestrator.createStrategy(projectId, req.body);
    res.json({ status: 'created', strategy });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/marketing/:projectId/strategy
router.patch('/marketing/:projectId/strategy', async (req: Request, res: Response) => {
  try {
    const strategy = await gtmOrchestrator.updateStrategy(String(req.params.projectId), req.body);
    if (!strategy) return res.status(404).json({ error: 'Strategy not found' });
    res.json({ status: 'updated', strategy });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/marketing/:projectId/calendar
router.get('/marketing/:projectId/calendar', async (req: Request, res: Response) => {
  try {
    const filters: { status?: CalendarEntryStatus; channel?: ContentChannel } = {};
    if (req.query.status) filters.status = req.query.status as CalendarEntryStatus;
    if (req.query.channel) filters.channel = req.query.channel as ContentChannel;

    const entries = await gtmOrchestrator.getCalendarEntries(String(req.params.projectId), filters);
    res.json({ entries, count: entries.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/marketing/:projectId/calendar
router.post('/marketing/:projectId/calendar', async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);

    if (req.body.generate) {
      const strategy = await gtmOrchestrator.getStrategy(projectId);
      if (!strategy) return res.status(400).json({ error: 'No strategy found. Generate a strategy first.' });

      const entries = await gtmOrchestrator.generateCalendar(
        projectId,
        strategy,
        req.body.weeks_ahead || 4
      );
      return res.json({ status: 'generated', entries, count: entries.length });
    }

    const entry = await gtmOrchestrator.createCalendarEntry(projectId, req.body);
    res.json({ status: 'created', entry });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/marketing/:projectId/calendar/:entryId
router.patch('/marketing/:projectId/calendar/:entryId', async (req: Request, res: Response) => {
  try {
    const entry = await gtmOrchestrator.updateCalendarEntry(
      String(req.params.projectId),
      String(req.params.entryId),
      req.body
    );
    if (!entry) return res.status(404).json({ error: 'Calendar entry not found' });
    res.json({ status: 'updated', entry });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/marketing/:projectId/calendar/:entryId
router.delete('/marketing/:projectId/calendar/:entryId', async (req: Request, res: Response) => {
  try {
    const deleted = await gtmOrchestrator.deleteCalendarEntry(
      String(req.params.projectId),
      String(req.params.entryId)
    );
    if (!deleted) return res.status(404).json({ error: 'Calendar entry not found' });
    res.json({ status: 'deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/marketing/:projectId/draft-due
router.post('/marketing/:projectId/draft-due', async (req: Request, res: Response) => {
  try {
    const drafted = await gtmOrchestrator.draftDueEntries(String(req.params.projectId));
    res.json({ status: 'drafted', entries: drafted, count: drafted.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/marketing/:projectId/publish/:entryId
router.post('/marketing/:projectId/publish/:entryId', async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const entryId = String(req.params.entryId);
    const entries = await gtmOrchestrator.getCalendarEntries(projectId);
    const entry = entries.find(e => e.id === entryId);

    if (!entry) return res.status(404).json({ error: 'Calendar entry not found' });
    if (!entry.draft_content) return res.status(400).json({ error: 'Entry has no draft content' });

    let result;
    if (entry.channel === 'blog') {
      result = await blogPublisher.publish(entry);
    } else if (entry.channel === 'twitter' || entry.channel === 'linkedin') {
      result = await socialPublisher.publish(entry, entry.channel);
    } else {
      return res.status(400).json({ error: `Unsupported channel: ${entry.channel}` });
    }

    if (result.approval_required) {
      await gtmOrchestrator.updateCalendarEntry(projectId, entryId, {
        approval_id: result.approval_id,
      });
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/marketing/:projectId/dashboard
router.get('/marketing/:projectId/dashboard', async (req: Request, res: Response) => {
  try {
    const dashboard = await gtmOrchestrator.getDashboard(String(req.params.projectId));
    res.json(dashboard);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
