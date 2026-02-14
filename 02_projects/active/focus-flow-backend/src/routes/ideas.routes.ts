import { Router, Request, Response } from 'express';
import { VaultService } from '../services/vault.service';
import { Idea } from '../models/types';
import { ideaExpansionService } from '../services/idea-expansion.service';

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

// GET /api/ideas/:id - Get single idea with full details
router.get('/ideas/:id', async (req: Request, res: Response) => {
  try {
    const idea = await vaultService.getIdea(String(req.params.id));
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }
    res.json(idea);
  } catch (error: any) {
    console.error('Error fetching idea:', error);
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

// POST /api/ideas/:id/expand - AI expansion of an idea
router.post('/ideas/:id/expand', async (req: Request, res: Response) => {
  try {
    const expanded = await ideaExpansionService.expandIdea(String(req.params.id));
    res.json({ status: 'expanded', idea: expanded });
  } catch (error: any) {
    console.error('Error expanding idea:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ideas/:id/promote - Promote idea to project (with artifact carry-over)
router.post('/ideas/:id/promote', async (req: Request, res: Response) => {
  try {
    const idea = await vaultService.getIdea(String(req.params.id));
    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    // Build artifacts from idea data
    const artifacts: Record<string, any> = {};
    if (idea.prd) {
      artifacts.prd = idea.prd;
    }

    const project = await vaultService.createProject({
      title: idea.title,
      description: idea.description,
      phase: 'idea',
      idea_id: idea.id,
      artifacts: Object.keys(artifacts).length > 0 ? artifacts : undefined,
      pipeline: {
        current_phase: 'idea',
        phases: {},
        updated_at: new Date().toISOString(),
      },
      metadata: {
        expanded: idea.expanded,
        council_verdict: idea.council_verdict,
      },
    } as any);

    // Link idea back to project
    await vaultService.updateIdea(idea.id, {
      project_id: project.id,
      status: 'in_development' as any,
    });

    res.status(201).json({
      status: 'promoted',
      project,
      idea_id: idea.id,
    });
  } catch (error: any) {
    console.error('Error promoting idea:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
