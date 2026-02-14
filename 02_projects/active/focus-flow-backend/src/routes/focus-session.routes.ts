import { Router, Request, Response } from 'express';
import { VaultService } from '../services/vault.service';

const router = Router();
const vaultService = new VaultService();

// POST /api/focus-sessions - Start a focus session
router.post('/focus-sessions', async (req: Request, res: Response) => {
  try {
    const { project_id, session_type, work_duration, break_duration } = req.body;
    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required' });
    }
    const session = await vaultService.createFocusSession({ project_id, session_type, work_duration, break_duration });
    vaultService.logActivity(project_id, { type: 'focus_session_started', description: `Focus session started (${session.work_duration}min)` }).catch(() => {});
    res.status(201).json({ status: 'created', session });
  } catch (error: any) {
    console.error('Error creating focus session:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/focus-sessions/:id - Update/stop a focus session
router.put('/focus-sessions/:id', async (req: Request, res: Response) => {
  try {
    const session = await vaultService.updateFocusSession(String(req.params.id), req.body);
    if (!session) {
      return res.status(404).json({ error: 'Focus session not found' });
    }
    if (req.body.status === 'completed' && session.project_id) {
      vaultService.logActivity(session.project_id, {
        type: 'focus_session_ended',
        description: `Focus session completed (${session.duration_minutes || 0}min)`,
      }).catch(() => {});
    }
    res.json({ status: 'updated', session });
  } catch (error: any) {
    console.error('Error updating focus session:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/focus-sessions - List focus sessions
router.get('/focus-sessions', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.project_id as string | undefined;
    const sessions = await vaultService.getFocusSessions(projectId);
    res.json({ sessions, count: sessions.length });
  } catch (error: any) {
    console.error('Error fetching focus sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
