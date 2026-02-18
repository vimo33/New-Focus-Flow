---
name: monitor-project
description: Quick health checks, cost tracking, stale task detection, queue depth monitoring
model: haiku
allowed-tools: Bash, Read, Glob, Grep, Write
---

# /monitor-project

Fast, cheap health sweep across Nitara infrastructure. Designed for frequent haiku-model execution.

## HITL Resumption

If this is a resumed task, first check `07_system/agent/answered-questions/` for prior answers matching your task ID before proceeding.

## Checks

1. **Systemd services**: `focus-flow-backend` (must be active), `focus-flow-frontend` (must be active), `focus-flow-telegram`, `openclaw-gateway`
2. **API health**: `curl -sf http://localhost:3001/health`, `curl -sf http://localhost:5173/`
3. **Disk usage**: `df -h /` — alert if >85%
4. **Today's costs**: Sum `07_system/logs/inference/{YYYY-MM-DD}.jsonl` entries. Compare to budget in `07_system/agent/cost-budget.json`.
5. **Stale tasks**: Check `01_tasks/` for tasks not updated in >7 days
6. **Queue depth**: Count files in `07_system/agent/queue/` by status

## Alert Severity

- **critical**: Core service down, disk >95%, budget exceeded
- **warning**: Disk >85%, budget >80%, queue >20, >5 stale tasks
- **info**: Telegram not configured, queue >10, any stale tasks

## Output

Write to `07_system/reports/monitor-project-YYYY-MM-DD.json`:

```json
{
  "task_type": "monitor-project",
  "status": "healthy|degraded|critical",
  "checked_at": "ISO-8601",
  "service_status": { "focus-flow-backend": "active|inactive|failed", "...": "..." },
  "disk": { "usage_percent": 0, "log_size": "" },
  "inference_costs": { "total_today": 0.0, "budget": 0.0, "utilization_pct": 0 },
  "stale_tasks": [],
  "queue": { "pending": 0, "in_progress": 0 },
  "alerts": [{ "severity": "critical|warning|info", "message": "" }]
}
```
