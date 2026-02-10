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

    // Calculate progress for each project in parallel
    const projectsWithProgress = await Promise.all(
      projects.map(async (project) => ({
        ...project,
        progress: await vaultService.calculateProjectProgress(project.id)
      }))
    );

    res.json({
      projects: projectsWithProgress,
      count: projectsWithProgress.length
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

// GET /api/projects/:id - Get single project with tasks
router.get('/projects/:id', async (req: Request, res: Response) => {
  try {
    const allProjects = await vaultService.getProjects();
    const project = allProjects.find(p => p.id === String(req.params.id));

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const [tasks, progress] = await Promise.all([
      vaultService.getTasksByProject(project.id),
      vaultService.calculateProjectProgress(project.id),
    ]);

    res.json({ ...project, tasks, progress });
  } catch (error: any) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:id - Update project
router.put('/projects/:id', async (req: Request, res: Response) => {
  try {
    const allProjects = await vaultService.getProjects();
    const existing = allProjects.find(p => p.id === String(req.params.id));

    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const updates = req.body;
    const updatedProject: Project = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID override
      updated_at: new Date().toISOString(),
    };

    await vaultService.saveData(
      `02_projects/${updatedProject.status || 'active'}/${updatedProject.id}.json`,
      JSON.stringify(updatedProject, null, 2)
    );

    res.json({ status: 'updated', project: updatedProject });
  } catch (error: any) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
