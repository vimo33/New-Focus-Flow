import { Router, Request, Response } from 'express';
import { VaultService } from '../services/vault.service';
import { Task } from '../models/types';

const router = Router();
const vaultService = new VaultService();

// GET /api/tasks - List tasks
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const tasks = await vaultService.getTasks(category);

    res.json({
      tasks,
      count: tasks.length
    });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tasks - Create task
router.post('/tasks', async (req: Request, res: Response) => {
  try {
    const taskData: Partial<Task> = req.body;

    if (!taskData.title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const task = await vaultService.createTask(taskData);

    res.status(201).json({
      status: 'created',
      task
    });
  } catch (error: any) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const updates: Partial<Task> = req.body;
    const task = await vaultService.updateTask(String(req.params.id), updates);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
      status: 'updated',
      task
    });
  } catch (error: any) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
