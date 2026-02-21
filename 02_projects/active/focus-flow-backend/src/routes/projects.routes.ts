import { Router, Request, Response } from 'express';
import { VaultService } from '../services/vault.service';
import { pipelineService } from '../services/pipeline.service';
import { conceptChatService } from '../services/concept-chat.service';
import { partnerAnalysisService } from '../services/partner-analysis.service';
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
// If body contains `concept` field, auto-initialize pipeline at concept/refining
router.post('/projects', async (req: Request, res: Response) => {
  try {
    const { concept, ...projectData } = req.body as Partial<Project> & { concept?: string };

    if (!projectData.title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Use concept as description if no separate description provided
    if (concept && !projectData.description) {
      projectData.description = concept;
    }

    const project = await vaultService.createProject(projectData);

    // If concept provided, auto-initialize pipeline and create concept chat
    if (concept) {
      // Start pipeline at concept/refining
      await pipelineService.startPipeline(project.id);

      // Create concept chat thread with AI analyst
      const chatResult = await conceptChatService.initConceptChat(
        project.id,
        project.title,
        concept
      );

      // Save concept_thread_id on project
      const updatedProject = await vaultService.updateProject(project.id, {
        concept_thread_id: chatResult.thread_id,
      });

      res.status(201).json({
        status: 'created',
        project: updatedProject,
        concept_chat: {
          thread_id: chatResult.thread_id,
          messages: chatResult.messages,
        },
      });
      return;
    }

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

    // If status changed, remove old file
    const oldStatus = existing.status || 'active';
    const newStatus = updatedProject.status || 'active';
    if (oldStatus !== newStatus) {
      await vaultService.deleteData(`02_projects/${oldStatus}/${existing.id}.json`);
    }

    await vaultService.saveData(
      `02_projects/${newStatus}/${updatedProject.id}.json`,
      JSON.stringify(updatedProject, null, 2)
    );

    if (updates.phase && updates.phase !== existing.phase) {
      vaultService.logActivity(existing.id, { type: 'phase_changed', description: `Phase changed to ${updates.phase}` }).catch(() => {});
    }
    if (oldStatus !== newStatus) {
      vaultService.logActivity(existing.id, { type: 'status_changed', description: `Status changed to ${newStatus}` }).catch(() => {});
    }

    res.json({ status: 'updated', project: updatedProject });
  } catch (error: any) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/projects/:id', async (req: Request, res: Response) => {
  try {
    const allProjects = await vaultService.getProjects();
    const existing = allProjects.find(p => p.id === String(req.params.id));

    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const status = existing.status || 'active';
    await vaultService.deleteData(`02_projects/${status}/${existing.id}.json`);

    res.json({ status: 'deleted', id: existing.id });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/activity - Get project activity log
router.get('/projects/:id/activity', async (req: Request, res: Response) => {
  try {
    const entries = await vaultService.getActivity(String(req.params.id));
    res.json({ entries });
  } catch (error: any) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/notes - Get project notes
router.get('/projects/:id/notes', async (req: Request, res: Response) => {
  try {
    const content = await vaultService.getProjectNotes(String(req.params.id));
    res.json({ content });
  } catch (error: any) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:id/notes - Save project notes
router.put('/projects/:id/notes', async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Content must be a string' });
    }
    await vaultService.saveProjectNotes(String(req.params.id), content);
    vaultService.logActivity(String(req.params.id), { type: 'notes_saved', description: 'Project notes updated' }).catch(() => {});
    res.json({ status: 'saved' });
  } catch (error: any) {
    console.error('Error saving notes:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Collaborator Routes
// ============================================================================

// POST /api/projects/:id/collaborators
router.post('/projects/:id/collaborators', async (req: Request, res: Response) => {
  try {
    const collaborator = await partnerAnalysisService.addCollaborator(String(req.params.id), req.body);
    res.status(201).json(collaborator);
  } catch (error: any) {
    console.error('Error adding collaborator:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id/collaborators
router.get('/projects/:id/collaborators', async (req: Request, res: Response) => {
  try {
    const collaborators = await partnerAnalysisService.getCollaborators(String(req.params.id));
    res.json({ collaborators, count: collaborators.length });
  } catch (error: any) {
    console.error('Error fetching collaborators:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/projects/:id/collaborators/:cid
router.delete('/projects/:id/collaborators/:cid', async (req: Request, res: Response) => {
  try {
    const removed = await partnerAnalysisService.removeCollaborator(String(req.params.id), String(req.params.cid));
    if (!removed) {
      return res.status(404).json({ error: 'Collaborator not found' });
    }
    res.json({ status: 'removed' });
  } catch (error: any) {
    console.error('Error removing collaborator:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:id/collaborators/:cid/analyze
router.post('/projects/:id/collaborators/:cid/analyze', async (req: Request, res: Response) => {
  try {
    const analysis = await partnerAnalysisService.analyzePartner(String(req.params.cid));
    res.json(analysis);
  } catch (error: any) {
    console.error('Error analyzing partner:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
