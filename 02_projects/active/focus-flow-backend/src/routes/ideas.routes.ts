import { Router, Request, Response } from 'express';
import { VaultService } from '../services/vault.service';
import { Idea } from '../models/types';

const router = Router();
const vaultService = new VaultService();

// GET /api/ideas - List ideas
router.get('/ideas', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const ideas = await vaultService.getIdeas(status);

    res.json({
      ideas,
      count: ideas.length
    });
  } catch (error: any) {
    console.error('Error fetching ideas:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ideas - Create idea
router.post('/ideas', async (req: Request, res: Response) => {
  try {
    const ideaData: Partial<Idea> = req.body;

    if (!ideaData.title || !ideaData.description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const idea = await vaultService.createIdea(ideaData);

    res.status(201).json({
      status: 'created',
      idea
    });
  } catch (error: any) {
    console.error('Error creating idea:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
