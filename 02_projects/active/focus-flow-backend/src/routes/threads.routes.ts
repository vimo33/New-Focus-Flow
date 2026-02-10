import { Router, Request, Response } from 'express';
import { ThreadService } from '../services/thread.service';
import { ThreadChatService } from '../services/thread-chat.service';

const router = Router();
const threadService = new ThreadService();
const chatService = new ThreadChatService(threadService);

// POST /api/threads - Create a new thread
router.post('/threads', async (req: Request, res: Response) => {
  try {
    const { title, project_id } = req.body;
    const thread = await threadService.createThread({ title, project_id });
    res.status(201).json(thread);
  } catch (error: any) {
    console.error('Error creating thread:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/threads - List all threads
router.get('/threads', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.project_id as string | undefined;
    const threads = await threadService.listThreads(projectId);
    res.json({ threads, count: threads.length });
  } catch (error: any) {
    console.error('Error listing threads:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/threads/:id - Get thread with messages
router.get('/threads/:id', async (req: Request, res: Response) => {
  try {
    const thread = await threadService.getThread(String(req.params.id));
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const messages = await threadService.getMessages(String(req.params.id));
    res.json({ thread, messages });
  } catch (error: any) {
    console.error('Error fetching thread:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/threads/:id/messages - Send a message and get AI response
router.post('/threads/:id/messages', async (req: Request, res: Response) => {
  try {
    const { content, source } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'content is required' });
    }

    const result = await chatService.sendMessage(
      String(req.params.id),
      content,
      source || 'text'
    );

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/threads/:id - Update thread
router.put('/threads/:id', async (req: Request, res: Response) => {
  try {
    const { title, project_id } = req.body;
    const thread = await threadService.updateThread(String(req.params.id), {
      title,
      project_id,
    });

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    res.json(thread);
  } catch (error: any) {
    console.error('Error updating thread:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/threads/:id - Delete thread
router.delete('/threads/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await threadService.deleteThread(String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    res.json({ status: 'deleted', id: String(req.params.id) });
  } catch (error: any) {
    console.error('Error deleting thread:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
