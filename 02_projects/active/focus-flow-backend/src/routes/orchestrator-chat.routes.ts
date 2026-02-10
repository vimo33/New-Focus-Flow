import { Router, Request, Response } from 'express';
import { orchestratorService } from '../orchestrator/orchestrator.service';

const router = Router();

// POST /api/orchestrator/chat - Send message to orchestrator
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { content, thread_id, source } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    const response = await orchestratorService.chat(
      content,
      thread_id,
      source || 'text'
    );

    res.json(response);
  } catch (error: any) {
    console.error('Orchestrator chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/orchestrator/threads - List orchestrator threads
router.get('/threads', async (req: Request, res: Response) => {
  try {
    const threads = await orchestratorService.listThreads();
    res.json({ threads, count: threads.length });
  } catch (error: any) {
    console.error('Error listing orchestrator threads:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/orchestrator/threads - Create new thread
router.post('/threads', async (req: Request, res: Response) => {
  try {
    const thread = await orchestratorService.createThread(req.body.title);
    res.status(201).json(thread);
  } catch (error: any) {
    console.error('Error creating orchestrator thread:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/orchestrator/threads/:id - Get thread with messages
router.get('/threads/:id', async (req: Request, res: Response) => {
  try {
    const thread = await orchestratorService.getThread(String(req.params.id));
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    res.json(thread);
  } catch (error: any) {
    console.error('Error getting orchestrator thread:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
