import { Router, Request, Response } from 'express';
import { decisionLogService } from '../services/decision-log.service';

const router = Router();

// POST /api/decisions - Create a new decision
router.post('/decisions', async (req: Request, res: Response) => {
  try {
    const { project_id, decision_type, context, decision, reasoning, alternatives, outcome, source } = req.body;

    if (!project_id || !decision_type || !context || !decision || !reasoning) {
      return res.status(400).json({
        error: 'Missing required fields: project_id, decision_type, context, decision, reasoning',
      });
    }

    const entry = await decisionLogService.createDecision({
      project_id,
      decision_type,
      context,
      decision,
      reasoning,
      alternatives,
      outcome,
      source,
    });

    res.status(201).json(entry);
  } catch (error: any) {
    console.error('Error creating decision:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/decisions - List decisions, optionally filtered by project
router.get('/decisions', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.project_id as string | undefined;
    const decisions = await decisionLogService.getDecisions(projectId);
    res.json({ decisions, count: decisions.length });
  } catch (error: any) {
    console.error('Error listing decisions:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/decisions/:id - Get a single decision
router.get('/decisions/:id', async (req: Request, res: Response) => {
  try {
    const entry = await decisionLogService.getDecision(String(req.params.id));
    if (!entry) {
      return res.status(404).json({ error: 'Decision not found' });
    }
    res.json(entry);
  } catch (error: any) {
    console.error('Error getting decision:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/decisions/:id - Update a decision
router.put('/decisions/:id', async (req: Request, res: Response) => {
  try {
    const { outcome, reasoning, decision } = req.body;
    const updated = await decisionLogService.updateDecision(String(req.params.id), {
      outcome,
      reasoning,
      decision,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Decision not found' });
    }
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating decision:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/decisions/:id - Delete a decision
router.delete('/decisions/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await decisionLogService.deleteDecision(String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Decision not found' });
    }
    res.json({ status: 'deleted' });
  } catch (error: any) {
    console.error('Error deleting decision:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
