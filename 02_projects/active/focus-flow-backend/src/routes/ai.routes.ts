import { Router, Request, Response } from 'express';
import { AICouncil } from '../ai/ai-council';
import { ClassificationService } from '../services/classification.service';
import { VaultService } from '../services/vault.service';
import { Idea, InboxItem, CouncilVerdict } from '../models/types';

const router = Router();
const aiCouncil = new AICouncil();
const classificationService = new ClassificationService();
const vaultService = new VaultService();

/**
 * POST /api/ideas/:id/validate
 *
 * Runs AI Council on an idea to evaluate it from multiple perspectives.
 * Returns verdict with 3 agent evaluations (Feasibility, Alignment, Impact).
 * Saves the verdict to vault and moves idea to appropriate location.
 *
 * Request Params:
 *   - id: string (idea ID)
 *
 * Request Body (optional):
 *   - userContext?: string (additional user context for alignment evaluation)
 *
 * Response:
 *   - 200: Returns verdict with recommendation, scores, and next steps
 *   - 404: Idea not found
 *   - 500: Server error (e.g., API key not configured)
 */
router.post('/ideas/:id/validate', async (req: Request, res: Response) => {
  try {
    const ideaId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { userContext } = req.body;

    // Fetch the idea from vault
    const idea = await vaultService.getIdea(ideaId);

    if (!idea) {
      return res.status(404).json({
        error: 'Idea not found',
        ideaId
      });
    }

    // Run AI Council validation
    console.log(`Running AI Council validation for idea: ${ideaId}`);
    const { DEFAULT_COUNCIL } = await import('../services/concept-chat.service');
    const verdict = await aiCouncil.validateWithCouncil(
      idea.title,
      idea.description || '',
      DEFAULT_COUNCIL
    );

    res.status(200).json({
      status: 'validated',
      ideaId,
      verdict
    });
  } catch (error: any) {
    console.error('Error validating idea:', error);

    // Check for OpenClaw configuration error
    if (error.message && (error.message.includes('OpenClaw') || error.message.includes('OPENCLAW'))) {
      return res.status(500).json({
        error: 'AI service not configured',
        message: 'OpenClaw Gateway is not accessible. Ensure it is running and OPENCLAW_AUTH_TOKEN is configured.'
      });
    }

    res.status(500).json({
      error: 'Failed to validate idea',
      message: error.message
    });
  }
});

/**
 * POST /api/classify/:id
 *
 * Manually triggers AI classification on an inbox item.
 * Uses Claude AI to analyze the text and determine category, suggested action, etc.
 * Updates the item in vault with classification results.
 *
 * Request Params:
 *   - id: string (inbox item ID)
 *
 * Response:
 *   - 200: Returns updated item with AI classification
 *   - 404: Inbox item not found
 *   - 500: Server error
 */
router.post('/classify/:id', async (req: Request, res: Response) => {
  try {
    const itemId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    // Fetch the inbox item from vault
    const item = await vaultService.getInboxItem(itemId);

    if (!item) {
      return res.status(404).json({
        error: 'Inbox item not found',
        itemId
      });
    }

    // Classify the item
    console.log(`Classifying inbox item: ${itemId}`);
    const updatedItem = await classificationService.classifyInboxItem(item);

    res.status(200).json({
      status: 'classified',
      item: updatedItem
    });
  } catch (error: any) {
    console.error('Error classifying inbox item:', error);

    // Check for OpenClaw configuration error
    if (error.message && (error.message.includes('OpenClaw') || error.message.includes('OPENCLAW'))) {
      return res.status(500).json({
        error: 'AI service not configured',
        message: 'OpenClaw Gateway is not accessible. Ensure it is running and OPENCLAW_AUTH_TOKEN is configured.'
      });
    }

    res.status(500).json({
      error: 'Failed to classify item',
      message: error.message
    });
  }
});

/**
 * GET /api/ai/status
 *
 * Returns AI system status including model info and API connectivity.
 * Performs a health check to verify OpenClaw Gateway is accessible.
 *
 * Response:
 *   - 200: Returns AI system status
 *   - 500: Server error
 */
router.get('/ai/status', async (req: Request, res: Response) => {
  try {
    // Perform health check
    const isHealthy = await aiCouncil.healthCheck();

    res.status(200).json({
      status: isHealthy ? 'operational' : 'degraded',
      auth_method: 'openclaw-subscription',
      gateway_url: process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789',
      model: 'claude-sonnet-4.5-20250929',
      api_connected: isHealthy,
      services: {
        ai_council: {
          status: isHealthy ? 'operational' : 'unavailable',
          agents: [
            'Feasibility Agent',
            'Alignment Agent',
            'Impact Agent'
          ]
        },
        classification_service: {
          status: isHealthy ? 'operational' : 'unavailable'
        }
      },
      hint: isHealthy ? undefined : 'Check: openclaw gateway status',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error checking AI status:', error);

    res.status(500).json({
      status: 'error',
      auth_method: 'openclaw-subscription',
      error: 'Failed to check AI status',
      message: error.message,
      hint: 'Ensure OpenClaw Gateway is running: openclaw gateway start',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
