import { Router, Request, Response } from 'express';
import { memoryService } from '../services/memory.service';
import { mem0Service } from '../services/mem0.service';

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

// ============================================================================
// Project-scoped Mem0 endpoints
// ============================================================================

// GET /api/memory/project/:projectId - Get all memories for a project
router.get('/memory/project/:projectId', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const memories = await mem0Service.getProjectMemories(String(req.params.projectId), limit);
    res.json({ memories, count: memories.length });
  } catch (error: any) {
    console.error('Error getting project memories:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/memory/project/:projectId/context - Get assembled context for AI prompts
router.get('/memory/project/:projectId/context', async (req: Request, res: Response) => {
  try {
    const query = (req.query.query as string) || '';
    const budget = parseInt(req.query.budget as string) || 4000;

    if (!query) {
      return res.status(400).json({ error: 'query parameter is required' });
    }

    const context = await mem0Service.assembleContext(String(req.params.projectId), query, budget);
    res.json({ context, length: context.length });
  } catch (error: any) {
    console.error('Error assembling context:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/memory/project/:projectId - Add a memory to a project
router.post('/memory/project/:projectId', async (req: Request, res: Response) => {
  try {
    const { content, tags, metadata } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    const result = await mem0Service.addExplicitMemory(content, {
      projectId: String(req.params.projectId),
      tags,
      metadata,
    });

    res.status(201).json({ result, status: result ? 'stored' : 'unavailable' });
  } catch (error: any) {
    console.error('Error adding project memory:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
