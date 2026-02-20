import { Router, Request, Response } from 'express';
import { signalsService } from '../services/signals.service';

const router = Router();

// GET /api/signals — List signals, optionally by projectId
router.get('/signals', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string | undefined;
    const signals = await signalsService.list(projectId);
    res.json({ signals, count: signals.length });
  } catch (error: any) {
    console.error('Error listing signals:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/signals — Create a new signal
router.post('/signals', async (req: Request, res: Response) => {
  try {
    const { projectId, experimentId, type, valueJson, source } = req.body;

    if (!projectId || !type) {
      res.status(400).json({ error: 'projectId and type are required' });
      return;
    }

    const signal = await signalsService.create({ projectId, experimentId, type, valueJson, source });
    res.status(201).json({ signal });
  } catch (error: any) {
    console.error('Error creating signal:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
