import { Router, Request, Response } from 'express';
import { VaultService } from '../services/vault.service';
import { Project } from '../models/types';

const router = Router();
const vaultService = new VaultService();

// GET /api/projects - List projects
router.get('/projects', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const projects = await vaultService.getProjects(status);

    res.json({
      projects,
      count: projects.length
    });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects - Create project
router.post('/projects', async (req: Request, res: Response) => {
  try {
    const projectData: Partial<Project> = req.body;

    if (!projectData.title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const project = await vaultService.createProject(projectData);

    res.status(201).json({
      status: 'created',
      project
    });
  } catch (error: any) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
