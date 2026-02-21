import { Router, Request, Response } from 'express';
import { experimentsService } from '../services/experiments.service';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

const VALID_STATUSES = ['draft', 'running', 'completed'];

// POST /api/experiments — Create a new experiment
router.post('/experiments', requireAuth, async (req: Request, res: Response) => {
  try {
    const { projectId, hypothesisId, metricName, metricDefinition, successRule } = req.body;

    if (!projectId || !metricName || !successRule) {
      return res.status(400).json({
        error: 'Missing required fields: projectId, metricName, successRule',
      });
    }

    const experiment = await experimentsService.create({
      projectId,
      hypothesisId,
      metricName,
      metricDefinition,
      successRule,
      teamId: req.teamId!,
      createdBy: req.user!.id,
    });

    res.status(201).json(experiment);
  } catch (error: any) {
    console.error('Error creating experiment:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/experiments — List all experiments for the team
router.get('/experiments', requireAuth, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const experiments = await experimentsService.listByTeam(req.teamId!, status);
    res.json({ experiments, count: experiments.length });
  } catch (error: any) {
    console.error('Error listing all experiments:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:projectId/experiments — List experiments for a project
router.get('/projects/:projectId/experiments', requireAuth, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status filter. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const experiments = await experimentsService.listByProject(
      String(req.params.projectId),
      req.teamId!,
      status
    );
    res.json({ experiments, count: experiments.length });
  } catch (error: any) {
    console.error('Error listing experiments:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/experiments/:id — Get a single experiment
router.get('/experiments/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const experiment = await experimentsService.getById(
      String(req.params.id),
      req.teamId!
    );
    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }
    res.json(experiment);
  } catch (error: any) {
    console.error('Error getting experiment:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/experiments/:id/results — Record experiment results
router.patch('/experiments/:id/results', requireAuth, async (req: Request, res: Response) => {
  try {
    const { baseline, variant, lift, p_value, sample_size } = req.body;

    if (baseline === undefined || variant === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: baseline, variant',
      });
    }

    const updated = await experimentsService.recordResults(
      String(req.params.id),
      req.teamId!,
      { baseline, variant, lift, p_value, sample_size, updatedBy: req.user!.id }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Error recording experiment results:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/experiments/:id/status — Update experiment status
router.patch('/experiments/:id/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Missing required field: status' });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const updated = await experimentsService.updateStatus(
      String(req.params.id),
      req.teamId!,
      { status, updatedBy: req.user!.id }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating experiment status:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/experiments/:id/decide — Record a decision on experiment outcome
router.post('/experiments/:id/decide', requireAuth, async (req: Request, res: Response) => {
  try {
    const { decision, rationale } = req.body;

    if (!decision || !rationale) {
      return res.status(400).json({
        error: 'Missing required fields: decision, rationale',
      });
    }

    const updated = await experimentsService.recordDecision(
      String(req.params.id),
      req.teamId!,
      { decision, rationale, decidedBy: req.user!.id }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Error recording experiment decision:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
