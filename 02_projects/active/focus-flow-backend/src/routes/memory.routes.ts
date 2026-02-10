import { Router, Request, Response } from 'express';
import { memoryService } from '../services/memory.service';

const router = Router();
const DEFAULT_USER = 'focus-flow-user';

// GET /api/memory/search - Search memories
router.get('/memory/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.query as string;
    const userId = (req.query.user_id as string) || DEFAULT_USER;
    const limit = parseInt(req.query.limit as string) || 5;

    if (!query) {
      return res.status(400).json({ error: 'query parameter is required' });
    }

    const results = await memoryService.searchMemory(query, userId, limit);
    res.json({ results, count: results.length });
  } catch (error: any) {
    console.error('Error searching memories:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/memory - List memories
router.get('/memory', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.user_id as string) || DEFAULT_USER;
    const memories = await memoryService.getMemories(userId);
    res.json({ memories, count: memories.length });
  } catch (error: any) {
    console.error('Error fetching memories:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/memory/health - Memory service health
router.get('/memory/health', async (req: Request, res: Response) => {
  const healthy = await memoryService.healthCheck();
  res.json({
    status: healthy ? 'healthy' : 'unavailable',
    available: memoryService.isAvailable,
  });
});

// DELETE /api/memory/:id - Delete a memory
router.delete('/memory/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await memoryService.deleteMemory(String(req.params.id));
    if (deleted) {
      res.json({ status: 'deleted' });
    } else {
      res.status(404).json({ error: 'Memory not found or service unavailable' });
    }
  } catch (error: any) {
    console.error('Error deleting memory:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
