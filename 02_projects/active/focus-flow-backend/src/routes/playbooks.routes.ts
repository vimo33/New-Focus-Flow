import { Router, Request, Response } from 'express';
import { playbooksService } from '../services/playbooks.service';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// POST /api/playbooks — Create a new playbook
router.post('/playbooks', requireAuth, async (req: Request, res: Response) => {
  try {
    const { projectId, title, context, steps, successMetrics, failureModes, sourceExperimentId } = req.body;

    if (!title || !context || !steps) {
      return res.status(400).json({
        error: 'Missing required fields: title, context, steps',
      });
    }

    if (!Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: 'Steps must be a non-empty array' });
    }

    const playbook = await playbooksService.create({
      projectId,
      title,
      context,
      steps,
      successMetrics,
      failureModes,
      sourceExperimentId,
      teamId: req.teamId!,
      createdBy: req.user!.id,
    });

    res.status(201).json(playbook);
  } catch (error: any) {
    console.error('Error creating playbook:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/playbooks — List team's playbooks
router.get('/playbooks', requireAuth, async (req: Request, res: Response) => {
  try {
    const playbooks = await playbooksService.listByTeam(req.teamId!);
    res.json({ playbooks, count: playbooks.length });
  } catch (error: any) {
    console.error('Error listing playbooks:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/playbooks/:id — Get a single playbook
router.get('/playbooks/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const playbook = await playbooksService.getById(
      String(req.params.id),
      req.teamId!
    );
    if (!playbook) {
      return res.status(404).json({ error: 'Playbook not found' });
    }
    res.json(playbook);
  } catch (error: any) {
    console.error('Error getting playbook:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
