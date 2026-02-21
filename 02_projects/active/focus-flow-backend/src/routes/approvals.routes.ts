import { Router, Request, Response } from 'express';
import { approvalsService } from '../services/approvals.service';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

const VALID_DECISIONS = ['approved', 'rejected'];

// GET /api/approvals — List pending approvals for team
router.get('/approvals', requireAuth, async (req: Request, res: Response) => {
  try {
    const approvals = await approvalsService.listPending(req.teamId!);
    res.json({ approvals, count: approvals.length });
  } catch (error: any) {
    console.error('Error listing approvals:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/approvals/:id — Get a single approval
router.get('/approvals/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const approval = await approvalsService.getById(
      String(req.params.id),
      req.teamId!
    );
    if (!approval) {
      return res.status(404).json({ error: 'Approval not found' });
    }
    res.json(approval);
  } catch (error: any) {
    console.error('Error getting approval:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/approvals/:id/decide — Approve or reject
router.post('/approvals/:id/decide', requireAuth, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Missing required field: status' });
    }

    if (!VALID_DECISIONS.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_DECISIONS.join(', ')}`,
      });
    }

    const updated = await approvalsService.decide(
      String(req.params.id),
      req.teamId!,
      { status, decidedBy: req.user!.id }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Error deciding approval:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
