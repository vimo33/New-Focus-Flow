import { Router, Request, Response } from 'express';
import { coreAgent } from '../services/core-agent.service';
import { briefingGenerator } from '../services/briefing-generator.service';
import { notificationRouter } from '../services/notification-router.service';
import { sseManager } from '../services/sse-manager.service';
import { pushNotificationService } from '../services/push-notification.service';

const router = Router();

/**
 * GET /api/agent/state
 * Current agent state
 */
router.get('/agent/state', (req: Request, res: Response) => {
  try {
    const state = coreAgent.getState();
    res.json(state);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get agent state', message: error.message });
  }
});

/**
 * POST /api/agent/message
 * Send free-form message to Core Agent
 */
router.post('/agent/message', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing required field: message (string)' });
    }

    const response = await coreAgent.sendMessage(message);
    res.json(response);
  } catch (error: any) {
    console.error('[AgentRoutes] Message error:', error);
    res.status(500).json({ error: 'Failed to process message', message: error.message });
  }
});

/**
 * POST /api/agent/approve/:requestId
 * Approve or reject a pending action
 * Body: { approved: boolean, feedback?: string }
 */
router.post('/agent/approve/:requestId', async (req: Request, res: Response) => {
  try {
    const requestId = Array.isArray(req.params.requestId) ? req.params.requestId[0] : req.params.requestId;
    const { approved, feedback } = req.body;

    if (typeof approved !== 'boolean') {
      return res.status(400).json({ error: 'Missing required field: approved (boolean)' });
    }

    const response = await coreAgent.processApproval(requestId as string, approved, feedback);
    res.json(response);
  } catch (error: any) {
    console.error('[AgentRoutes] Approve error:', error);
    res.status(500).json({ error: 'Failed to process approval', message: error.message });
  }
});

/**
 * GET /api/agent/briefing
 * Get latest briefing
 */
router.get('/agent/briefing', async (req: Request, res: Response) => {
  try {
    const briefing = await briefingGenerator.getLatestBriefing();
    if (!briefing) {
      return res.status(404).json({ error: 'No briefing found for today' });
    }
    res.json(briefing);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get briefing', message: error.message });
  }
});

/**
 * POST /api/agent/briefing/generate
 * Force-generate a new briefing
 */
router.post('/agent/briefing/generate', async (req: Request, res: Response) => {
  try {
    const response = await coreAgent.generateBriefing();
    res.json(response);
  } catch (error: any) {
    console.error('[AgentRoutes] Briefing generate error:', error);
    res.status(500).json({ error: 'Failed to generate briefing', message: error.message });
  }
});

/**
 * POST /api/agent/work-plan/approve
 * Approve work plan
 * Body: { plan_id: string, edits?: any[] }
 */
router.post('/agent/work-plan/approve', async (req: Request, res: Response) => {
  try {
    const { plan_id, edits } = req.body;
    if (!plan_id) {
      return res.status(400).json({ error: 'Missing required field: plan_id' });
    }

    const response = await coreAgent.approveWorkPlan(plan_id, edits);
    res.json(response);
  } catch (error: any) {
    console.error('[AgentRoutes] Work plan approve error:', error);
    res.status(500).json({ error: 'Failed to approve work plan', message: error.message });
  }
});

/**
 * GET /api/agent/notifications
 * List notifications with optional ?unread=true filter
 */
router.get('/agent/notifications', async (req: Request, res: Response) => {
  try {
    const unread = req.query.unread === 'true';
    const notifications = unread
      ? await notificationRouter.getUnread()
      : await notificationRouter.getAll();

    res.json({ notifications, count: notifications.length });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get notifications', message: error.message });
  }
});

/**
 * POST /api/agent/notifications/:id/read
 * Mark notification as read
 */
router.post('/agent/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const notification = await notificationRouter.markRead(id as string);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(notification);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to mark notification read', message: error.message });
  }
});

/**
 * POST /api/agent/notifications/:id/dismiss
 * Dismiss notification
 */
router.post('/agent/notifications/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const notification = await notificationRouter.dismiss(id as string);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(notification);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to dismiss notification', message: error.message });
  }
});

/**
 * GET /api/agent/events
 * SSE stream endpoint
 */
router.get('/agent/events', (req: Request, res: Response) => {
  // Disable request timeout for SSE
  req.socket.setTimeout(0);

  const clientId = sseManager.register(res);

  // Send initial state
  const state = coreAgent.getState();
  sseManager.send(clientId, 'agent_state', state);
});

/**
 * POST /api/agent/pause
 * Pause the agent
 */
router.post('/agent/pause', async (req: Request, res: Response) => {
  try {
    await coreAgent.pause();
    res.json({ message: 'Agent paused', state: coreAgent.getState() });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to pause agent', message: error.message });
  }
});

/**
 * POST /api/agent/resume
 * Resume the agent
 */
router.post('/agent/resume', async (req: Request, res: Response) => {
  try {
    await coreAgent.resume();
    res.json({ message: 'Agent resumed', state: coreAgent.getState() });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to resume agent', message: error.message });
  }
});

/**
 * GET /api/agent/activity
 * Get activity timeline
 */
router.get('/agent/activity', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const activity = coreAgent.getActivity(limit);
    res.json({ activity, count: activity.length });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get activity', message: error.message });
  }
});

/**
 * POST /api/agent/push/subscribe
 * Store push subscription
 */
router.post('/agent/push/subscribe', async (req: Request, res: Response) => {
  try {
    const subscription = req.body;
    if (!subscription?.endpoint) {
      return res.status(400).json({ error: 'Invalid push subscription' });
    }
    await pushNotificationService.subscribe(subscription);
    res.json({ message: 'Push subscription stored' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to store push subscription', message: error.message });
  }
});

/**
 * GET /api/agent/push/vapid-public-key
 * Return VAPID public key
 */
router.get('/agent/push/vapid-public-key', (req: Request, res: Response) => {
  try {
    const key = pushNotificationService.getVapidPublicKey();
    res.json({ key });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get VAPID key', message: error.message });
  }
});

export default router;
