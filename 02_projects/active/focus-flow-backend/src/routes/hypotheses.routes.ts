import { Router, Request, Response } from 'express';
import { hypothesesService } from '../services/hypotheses.service';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// POST /api/hypotheses — Create a new hypothesis
router.post('/hypotheses', requireAuth, async (req: Request, res: Response) => {
  try {
    const { projectId, statement, type, confidence, evidenceRefs } = req.body;

    if (!projectId || !statement || !type) {
      return res.status(400).json({
        error: 'Missing required fields: projectId, statement, type',
      });
    }

    const hypothesis = await hypothesesService.create({
      projectId,
      statement,
      type,
      confidence,
      evidenceRefs,
      teamId: req.teamId!,
      createdBy: req.user!.id,
    });

    res.status(201).json(hypothesis);
  } catch (error: any) {
    console.error('Error creating hypothesis:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:projectId/hypotheses — List hypotheses for a project
router.get('/projects/:projectId/hypotheses', requireAuth, async (req: Request, res: Response) => {
  try {
    const hypotheses = await hypothesesService.listByProject(
      String(req.params.projectId),
      req.teamId!
    );
    res.json({ hypotheses, count: hypotheses.length });
  } catch (error: any) {
    console.error('Error listing hypotheses:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/hypotheses/:id — Get a single hypothesis
router.get('/hypotheses/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const hypothesis = await hypothesesService.getById(
      String(req.params.id),
      req.teamId!
    );
    if (!hypothesis) {
      return res.status(404).json({ error: 'Hypothesis not found' });
    }
    res.json(hypothesis);
  } catch (error: any) {
    console.error('Error getting hypothesis:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/hypotheses/:id/confidence — Update confidence score
router.patch('/hypotheses/:id/confidence', requireAuth, async (req: Request, res: Response) => {
  try {
    const { confidence, newEvidence } = req.body;

    if (confidence === undefined || confidence === null) {
      return res.status(400).json({ error: 'Missing required field: confidence' });
    }

    if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
      return res.status(400).json({ error: 'Confidence must be a number between 0 and 1' });
    }

    const updated = await hypothesesService.updateConfidence(
      String(req.params.id),
      req.teamId!,
      { confidence, newEvidence, updatedBy: req.user!.id }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Hypothesis not found' });
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating hypothesis confidence:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
