import { Router, Request, Response } from 'express';
import { pipelineService } from '../services/pipeline.service';
import { conceptChatService } from '../services/concept-chat.service';
import { VaultService } from '../services/vault.service';

const router = Router();
const vaultService = new VaultService();

// POST /api/pipeline/:projectId/start — Initialize pipeline, run first phase
router.post('/pipeline/:projectId/start', async (req: Request, res: Response) => {
  try {
    const project = await pipelineService.startPipeline(String(req.params.projectId));
    res.json({
      status: 'started',
      project,
      pipeline: project.pipeline,
    });
  } catch (error: any) {
    console.error('Error starting pipeline:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pipeline/:projectId/status — Current phase, sub_state, artifacts
router.get('/pipeline/:projectId/status', async (req: Request, res: Response) => {
  try {
    const status = await pipelineService.getStatus(String(req.params.projectId));
    res.json(status);
  } catch (error: any) {
    console.error('Error getting pipeline status:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pipeline/:projectId/review — { action: 'approve'|'reject', feedback? }
router.post('/pipeline/:projectId/review', async (req: Request, res: Response) => {
  try {
    const { action, feedback } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action must be "approve" or "reject"' });
    }

    if (action === 'reject' && !feedback) {
      return res.status(400).json({ error: 'feedback is required when rejecting' });
    }

    const project = await pipelineService.reviewPhase(
      String(req.params.projectId),
      action,
      feedback
    );

    res.json({
      status: action === 'approve' ? 'approved' : 'rejected',
      project,
      pipeline: project.pipeline,
    });
  } catch (error: any) {
    console.error('Error reviewing pipeline:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Concept Chat Endpoints
// ============================================================================

// POST /api/pipeline/:projectId/concept/chat — Send message in concept chat
router.post('/pipeline/:projectId/concept/chat', async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'content is required' });
    }

    const status = await pipelineService.getStatus(String(req.params.projectId));
    const project = status.project;
    const threadId = project.concept_thread_id;

    if (!threadId) {
      return res.status(400).json({ error: 'No concept thread found. Create project with concept first.' });
    }

    const result = await conceptChatService.sendMessage(threadId, content);

    res.json({
      user_message: result.user_message,
      assistant_message: result.assistant_message,
    });
  } catch (error: any) {
    console.error('Error in concept chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pipeline/:projectId/concept/messages — Get all concept chat messages
router.get('/pipeline/:projectId/concept/messages', async (req: Request, res: Response) => {
  try {
    const status = await pipelineService.getStatus(String(req.params.projectId));
    const threadId = status.project.concept_thread_id;

    if (!threadId) {
      return res.json({ messages: [] });
    }

    const messages = await conceptChatService.getMessages(threadId);
    res.json({ messages });
  } catch (error: any) {
    console.error('Error getting concept messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pipeline/:projectId/concept/ready — Trigger concept summary + council recommendation
router.post('/pipeline/:projectId/concept/ready', async (req: Request, res: Response) => {
  try {
    const project = await pipelineService.advanceConceptStep(
      String(req.params.projectId),
      'council_selection'
    );

    res.json({
      status: 'council_selection',
      project,
      pipeline: project.pipeline,
      refined_concept: project.artifacts?.refined_concept,
      suggested_council: project.artifacts?.selected_council,
    });
  } catch (error: any) {
    console.error('Error preparing concept for council:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Council Endpoints
// ============================================================================

// POST /api/pipeline/:projectId/council/approve — Start council evaluation (non-blocking)
router.post('/pipeline/:projectId/council/approve', async (req: Request, res: Response) => {
  try {
    const { agents } = req.body;

    if (!agents || !Array.isArray(agents) || agents.length === 0) {
      return res.status(400).json({ error: 'agents array is required (list of CouncilMember objects)' });
    }

    // Update selected council on project before running
    const currentStatus = await pipelineService.getStatus(String(req.params.projectId));
    const project = currentStatus.project;

    if (!project.artifacts) project.artifacts = {};
    project.artifacts.selected_council = agents;

    await vaultService.updateProject(project.id, project);

    // Advance to council_running (fires agents in background, returns immediately)
    const updatedProject = await pipelineService.advanceConceptStep(
      String(req.params.projectId),
      'council_running'
    );

    res.json({
      status: 'council_started',
      project: updatedProject,
      pipeline: updatedProject.pipeline,
      council_progress: updatedProject.artifacts?.council_progress,
    });
  } catch (error: any) {
    console.error('Error starting council:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/pipeline/:projectId/council/retry — Retry a stuck/failed council evaluation
router.post('/pipeline/:projectId/council/retry', async (req: Request, res: Response) => {
  try {
    const project = await pipelineService.retryCouncil(String(req.params.projectId));
    res.json({
      status: 'council_started',
      project,
      pipeline: project.pipeline,
      council_progress: project.artifacts?.council_progress,
    });
  } catch (error: any) {
    console.error('Error retrying council:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
