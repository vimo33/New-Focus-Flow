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

    if (task.project_id) {
      vaultService.logActivity(task.project_id, { type: 'task_created', description: `Task created: ${task.title}` }).catch(() => {});
    }

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

    if (task.project_id) {
      const desc = updates.status === 'done' ? `Task completed: ${task.title}` : `Task updated: ${task.title}`;
      vaultService.logActivity(task.project_id, { type: 'task_updated', description: desc }).catch(() => {});
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

// DELETE /api/tasks/:id - Delete task
router.delete('/tasks/:id', async (req: Request, res: Response) => {
  try {
    // Find task first for activity logging
    const allTasks = await vaultService.getTasks();
    const taskToDelete = allTasks.find(t => t.id === String(req.params.id));

    const deleted = await vaultService.deleteTask(String(req.params.id));

    if (!deleted) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (taskToDelete?.project_id) {
      vaultService.logActivity(taskToDelete.project_id, { type: 'task_deleted', description: `Task deleted: ${taskToDelete.title}` }).catch(() => {});
    }

    res.json({ status: 'deleted', id: req.params.id });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
