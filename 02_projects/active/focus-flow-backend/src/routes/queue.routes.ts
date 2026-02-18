import { Router, Request, Response } from 'express';
import { taskQueueService } from '../services/task-queue.service';

const router = Router();

// Enqueue a new task
router.post('/queue/enqueue', async (req: Request, res: Response) => {
  try {
    const {
      skill,
      arguments: args,
      priority,
      trust_tier,
      parent_task_id,
      depends_on,
      max_duration_minutes,
      hitl_timeout_hours,
      created_by,
      scheduled_at,
    } = req.body;

    if (!skill) {
      res.status(400).json({ error: 'skill is required' });
      return;
    }

    const task = await taskQueueService.enqueue({
      skill,
      arguments: args,
      priority,
      trust_tier,
      parent_task_id,
      depends_on,
      max_duration_minutes,
      hitl_timeout_hours,
      created_by: created_by || 'user',
      scheduled_at,
    });

    res.status(201).json(task);
  } catch (error: any) {
    console.error('Error enqueuing task:', error);
    res.status(500).json({ error: error.message });
  }
});

// List tasks (with optional status filter)
router.get('/queue/tasks', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const tasks = await taskQueueService.getAllTasks(status);
    res.json({ tasks, count: tasks.length });
  } catch (error: any) {
    console.error('Error listing tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific task
router.get('/queue/tasks/:id', async (req: Request, res: Response) => {
  try {
    const taskId = req.params.id as string;
    const task = await taskQueueService.getTask(taskId);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(task);
  } catch (error: any) {
    console.error('Error getting task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Kill a running task
router.post('/queue/tasks/:id/kill', async (req: Request, res: Response) => {
  try {
    const taskId = req.params.id as string;
    const killed = await taskQueueService.killTask(taskId);
    if (!killed) {
      res.status(404).json({ error: 'Task not found or not running' });
      return;
    }
    res.json({ status: 'killed', task_id: taskId });
  } catch (error: any) {
    console.error('Error killing task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete a task (called by task-result-writer.sh hook)
router.post('/queue/complete', async (req: Request, res: Response) => {
  try {
    const { task_id, result_file } = req.body;

    if (!task_id) {
      // Try to find the running task by skill from the report
      const { task_type } = req.body;
      if (task_type) {
        const tasks = await taskQueueService.getAllTasks('running');
        const match = tasks.find(t => t.skill === task_type);
        if (match) {
          await taskQueueService.completeTask(match.id, result_file);
          res.json({ status: 'completed', task_id: match.id });
          return;
        }
      }
      res.status(400).json({ error: 'task_id or task_type required' });
      return;
    }

    await taskQueueService.completeTask(task_id, result_file);
    res.json({ status: 'completed', task_id });
  } catch (error: any) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get queue stats
router.get('/queue/stats', async (req: Request, res: Response) => {
  try {
    const stats = await taskQueueService.getStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Schedule a recurring task
router.post('/queue/schedule', async (req: Request, res: Response) => {
  try {
    const { skill, arguments: args, cron, priority, trust_tier, description } = req.body;

    if (!skill || !cron) {
      res.status(400).json({ error: 'skill and cron are required' });
      return;
    }

    const { readJsonFile, writeJsonFile, getVaultPath } = await import('../utils/file-operations');
    const schedulePath = getVaultPath('07_system/agent/schedule.json');
    const schedule = await readJsonFile<any[]>(schedulePath) || [];

    schedule.push({
      skill,
      arguments: args || '',
      cron,
      priority: priority || 'medium',
      trust_tier: trust_tier || 2,
      description: description || `Scheduled /${skill}`,
    });

    await writeJsonFile(schedulePath, schedule);
    res.status(201).json({ status: 'scheduled', schedule_count: schedule.length });
  } catch (error: any) {
    console.error('Error scheduling task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Kill switch — activate
router.post('/queue/kill-switch', async (req: Request, res: Response) => {
  try {
    await taskQueueService.activateKillSwitch();
    res.json({ status: 'activated', message: 'All autonomous operations paused' });
  } catch (error: any) {
    console.error('Error activating kill switch:', error);
    res.status(500).json({ error: error.message });
  }
});

// Kill switch — deactivate
router.delete('/queue/kill-switch', async (req: Request, res: Response) => {
  try {
    await taskQueueService.deactivateKillSwitch();
    res.json({ status: 'deactivated', message: 'Autonomous operations resumed' });
  } catch (error: any) {
    console.error('Error deactivating kill switch:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
