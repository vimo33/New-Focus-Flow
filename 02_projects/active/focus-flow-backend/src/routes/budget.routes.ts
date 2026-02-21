import { Router, Request, Response } from 'express';
import { budgetService } from '../services/budget.service';

const router = Router();

// GET /api/budget — Full budget status with spend data
router.get('/budget', async (req: Request, res: Response) => {
  try {
    const status = await budgetService.getFullBudgetStatus();
    res.json(status);
  } catch (error: any) {
    console.error('Error getting budget:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/budget — Update budget config fields
router.patch('/budget', async (req: Request, res: Response) => {
  try {
    const { daily_budget_usd, weekly_budget_usd, alert_threshold_pct, hard_stop } = req.body;
    const updates: Record<string, unknown> = {};

    if (daily_budget_usd !== undefined) updates.daily_budget_usd = Number(daily_budget_usd);
    if (weekly_budget_usd !== undefined) updates.weekly_budget_usd = Number(weekly_budget_usd);
    if (alert_threshold_pct !== undefined) updates.alert_threshold_pct = Number(alert_threshold_pct);
    if (hard_stop !== undefined) updates.hard_stop = Boolean(hard_stop);

    const config = await budgetService.updateBudget(updates);
    res.json({ status: 'updated', config });
  } catch (error: any) {
    console.error('Error updating budget:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
