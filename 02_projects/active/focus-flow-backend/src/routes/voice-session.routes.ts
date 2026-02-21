import { Router, Request, Response } from 'express';
import { voiceSessionService } from '../services/voice-session.service';

const router = Router();

// POST /api/voice/call — initiate an outbound call
router.post('/voice/call', async (req: Request, res: Response) => {
  try {
    const { phone_number, persona, reason, priority, metadata } = req.body;

    if (!phone_number) {
      return res.status(400).json({ error: 'phone_number is required' });
    }

    const session = await voiceSessionService.makeOutboundCall({
      phone_number,
      persona: persona || 'nitara-main',
      reason: reason || 'manual',
      priority: priority || 'medium',
      metadata,
    });

    res.json(session);
  } catch (error: any) {
    console.error('[VoiceRoutes] Outbound call error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/voice/sessions — list recent voice sessions
router.get('/voice/sessions', async (_req: Request, res: Response) => {
  try {
    const sessions = await voiceSessionService.getRecentSessions();
    res.json({ sessions, count: sessions.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/voice/sessions/:id — get a specific session
router.get('/voice/sessions/:id', async (req: Request, res: Response) => {
  try {
    const session = await voiceSessionService.getSession(req.params.id as string);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/voice/dnd — check DND status
router.get('/voice/dnd', async (_req: Request, res: Response) => {
  try {
    const dailyCount = await voiceSessionService.getDailyCallCount();
    res.json({
      dnd_active: voiceSessionService.isDndActive(),
      daily_calls: dailyCount,
      ...voiceSessionService.getStatus(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/voice/status — overall voice system status
router.get('/voice/status', (_req: Request, res: Response) => {
  res.json(voiceSessionService.getStatus());
});

export default router;
