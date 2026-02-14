import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { getVaultPath, ensureDir, readJsonFile, writeJsonFile, listFiles } from '../utils/file-operations';

const router = Router();

interface HealthLog {
  id: string;
  mood: number;
  energy: number;
  sleep_hours: number;
  exercise_minutes: number;
  date: string;
  notes?: string;
  created_at: string;
}

interface HealthExperiment {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date?: string;
  status: 'active' | 'completed' | 'paused';
  metrics_tracked: string[];
}

function getLogsDir(): string {
  return getVaultPath('06_health', 'logs');
}

function getExperimentsDir(): string {
  return getVaultPath('06_health', 'experiments');
}

async function getAllLogs(): Promise<HealthLog[]> {
  const dir = getLogsDir();
  const files = await listFiles(dir);
  const logs: HealthLog[] = [];
  for (const file of files) {
    if (!file.endsWith('.json') || file === 'health-log.csv') continue;
    const log = await readJsonFile<HealthLog>(path.join(dir, file));
    if (log && log.date) logs.push(log);
  }
  return logs.sort((a, b) => b.date.localeCompare(a.date));
}

// POST /api/health/log - Save a daily health log (new unified format)
router.post('/health/log', async (req: Request, res: Response) => {
  try {
    const { mood, energy, sleep_hours, exercise_minutes, date, notes, metric_type, value } = req.body;

    // Support both old format (metric_type/value) and new format (mood/energy/sleep_hours/exercise_minutes)
    if (metric_type !== undefined && value !== undefined) {
      // Legacy single-metric format — store in old format for backwards compat
      const id = `health-${Date.now()}`;
      const logDir = getLogsDir();
      await ensureDir(logDir);
      await writeJsonFile(path.join(logDir, `${id}.json`), {
        id,
        metric_type,
        value,
        date: date || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
      });
      return res.status(201).json({ status: 'logged', metric: { id, metric_type, value } });
    }

    const logDate = date || new Date().toISOString().split('T')[0];
    const logDir = getLogsDir();
    await ensureDir(logDir);

    // Check if log already exists for this date — update it
    const existingFiles = await listFiles(logDir);
    for (const file of existingFiles) {
      if (!file.endsWith('.json')) continue;
      const existing = await readJsonFile<HealthLog>(path.join(logDir, file));
      if (existing && existing.date === logDate) {
        const updated = {
          ...existing,
          mood: mood ?? existing.mood,
          energy: energy ?? existing.energy,
          sleep_hours: sleep_hours ?? existing.sleep_hours,
          exercise_minutes: exercise_minutes ?? existing.exercise_minutes,
          notes: notes ?? existing.notes,
        };
        await writeJsonFile(path.join(logDir, file), updated);
        return res.json({ status: 'updated', log: updated });
      }
    }

    // Create new log
    const id = `health-${Date.now()}`;
    const log: HealthLog = {
      id,
      mood: mood || 5,
      energy: energy || 5,
      sleep_hours: sleep_hours || 7,
      exercise_minutes: exercise_minutes || 0,
      date: logDate,
      notes,
      created_at: new Date().toISOString(),
    };
    await writeJsonFile(path.join(logDir, `${id}.json`), log);
    res.status(201).json({ status: 'created', log });
  } catch (error: any) {
    console.error('Error logging health metric:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/health/logs - Get health logs with optional date range
router.get('/health/logs', async (req: Request, res: Response) => {
  try {
    let logs = await getAllLogs();
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    if (startDate) logs = logs.filter((l) => l.date >= startDate);
    if (endDate) logs = logs.filter((l) => l.date <= endDate);

    res.json({ logs, count: logs.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/health/logs/today - Get today's log
router.get('/health/logs/today', async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const logs = await getAllLogs();
    const todayLog = logs.find((l) => l.date === today) || null;
    res.json({ log: todayLog });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/health/trends - Get trends for the last N days
router.get('/health/trends', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 14;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const allLogs = await getAllLogs();
    const trends = allLogs.filter((l) => l.date >= cutoffStr);

    const averages: Record<string, number> = { mood: 0, energy: 0, sleep_hours: 0, exercise_minutes: 0 };
    if (trends.length > 0) {
      for (const log of trends) {
        averages.mood += log.mood || 0;
        averages.energy += log.energy || 0;
        averages.sleep_hours += log.sleep_hours || 0;
        averages.exercise_minutes += log.exercise_minutes || 0;
      }
      for (const key of Object.keys(averages)) {
        averages[key] = Math.round((averages[key] / trends.length) * 10) / 10;
      }
    }

    // Sort ascending for chart display
    trends.sort((a, b) => a.date.localeCompare(b.date));

    res.json({ trends, averages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/health/experiments - List experiments
router.get('/health/experiments', async (req: Request, res: Response) => {
  try {
    const dir = getExperimentsDir();
    await ensureDir(dir);
    const files = await listFiles(dir);
    const experiments: HealthExperiment[] = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const exp = await readJsonFile<HealthExperiment>(path.join(dir, file));
      if (exp) experiments.push(exp);
    }
    res.json({ experiments, count: experiments.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/health/experiments - Create experiment
router.post('/health/experiments', async (req: Request, res: Response) => {
  try {
    const { title, description, metrics_tracked } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const dir = getExperimentsDir();
    await ensureDir(dir);
    const id = `exp-${Date.now()}`;
    const experiment: HealthExperiment = {
      id,
      title,
      description: description || '',
      start_date: new Date().toISOString().split('T')[0],
      status: 'active',
      metrics_tracked: metrics_tracked || [],
    };
    await writeJsonFile(path.join(dir, `${id}.json`), experiment);
    res.status(201).json({ status: 'created', experiment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/health/experiments/:id - Update experiment
router.put('/health/experiments/:id', async (req: Request, res: Response) => {
  try {
    const dir = getExperimentsDir();
    const filePath = path.join(dir, `${req.params.id}.json`);
    const existing = await readJsonFile<HealthExperiment>(filePath);
    if (!existing) return res.status(404).json({ error: 'Experiment not found' });

    const updated = { ...existing, ...req.body, id: existing.id };
    await writeJsonFile(filePath, updated);
    res.json({ status: 'updated', experiment: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
