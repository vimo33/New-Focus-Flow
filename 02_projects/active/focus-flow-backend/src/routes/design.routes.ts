import { Router, Request, Response } from 'express';
import { designService } from '../services/design.service';
import { VaultService } from '../services/vault.service';

const router = Router();
const vaultService = new VaultService();

// GET /api/designs/:projectId - Get all design screens for a project
router.get('/designs/:projectId', async (req: Request, res: Response) => {
  try {
    const screens = await designService.getScreens(String(req.params.projectId));
    res.json({ screens, count: screens.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/designs/:projectId/generate - Generate a new design screen
router.post('/designs/:projectId/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, model } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const projectId = String(req.params.projectId);
    const screen = await designService.generateScreen(projectId, prompt, model);

    vaultService.logActivity(projectId, {
      type: 'design_generated',
      description: `Design screen generation started: ${prompt.substring(0, 50)}...`,
    }).catch(() => {});

    res.status(201).json({ status: 'generating', screen });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/designs/:projectId/:screenId - Delete a design screen
router.delete('/designs/:projectId/:screenId', async (req: Request, res: Response) => {
  try {
    const deleted = await designService.deleteScreen(
      String(req.params.projectId),
      String(req.params.screenId)
    );
    if (!deleted) return res.status(404).json({ error: 'Screen not found' });
    res.json({ status: 'deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/designs/stitch/projects - List Stitch projects
router.get('/designs/stitch/projects', async (req: Request, res: Response) => {
  try {
    const output = await designService.listStitchProjects();
    res.json({ output });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
