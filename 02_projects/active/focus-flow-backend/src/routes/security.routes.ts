import { Router, Request, Response } from 'express';
import { SecurityAuditService } from '../services/security-audit.service';

const router = Router();

/**
 * GET /api/security/status
 * Check security health
 */
router.get('/security/status', async (req: Request, res: Response) => {
  try {
    const threats = SecurityAuditService.analyzeThreats();

    const status = threats.criticalEvents > 0 ? 'critical' : threats.suspiciousRequests > 10 ? 'warning' : 'healthy';

    res.status(200).json({
      status,
      threats,
      recommendations:
        status === 'critical'
          ? ['Review critical events immediately', 'Check OpenClaw gateway logs', 'Verify firewall rules']
          : status === 'warning'
          ? ['Monitor suspicious activity', 'Review recent audit logs']
          : ['Security posture is healthy'],
      lastChecked: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
});

/**
 * GET /api/security/audit-log
 * Get recent security audit events
 */
router.get('/security/audit-log', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const events = SecurityAuditService.getRecentEvents(limit);

    res.status(200).json({
      count: events.length,
      events,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
});

export default router;
