import { Router, Request, Response } from 'express';
import { voiceCommandService } from '../services/voice-command.service';
import { VoiceCommandRequest } from '../models/types';

const router = Router();

/**
 * POST /api/voice-command/classify
 *
 * Classify a voice command using AI intent recognition.
 * Returns structured intent with action, parameters, and suggested response.
 *
 * Request Body:
 *   - command: string (the voice command text)
 *   - context?: { current_route?: string, recent_items?: string[] }
 *
 * Response:
 *   - 200: Returns intent classification
 *   - 400: Invalid request body
 *   - 500: Server error (e.g., OpenClaw not configured)
 */
router.post('/voice-command/classify', async (req: Request, res: Response) => {
  try {
    const { command, context } = req.body;

    // Validate request
    if (!command || typeof command !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'command field is required and must be a string'
      });
    }

    if (command.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'command cannot be empty'
      });
    }

    // Build classification request
    const request: VoiceCommandRequest = {
      command: command.trim(),
      context
    };

    // Classify the voice command
    console.log(`Classifying voice command: "${command}"`);
    const intent = await voiceCommandService.classifyCommand(request);

    res.status(200).json({
      status: 'classified',
      intent
    });
  } catch (error: any) {
    console.error('Error classifying voice command:', error);

    // Check for OpenClaw configuration error
    if (error.message && (error.message.includes('OpenClaw') || error.message.includes('OPENCLAW'))) {
      return res.status(500).json({
        error: 'AI service not configured',
        message: 'OpenClaw Gateway is not accessible. Ensure it is running and OPENCLAW_AUTH_TOKEN is configured.'
      });
    }

    res.status(500).json({
      error: 'Failed to classify voice command',
      message: error.message
    });
  }
});

/**
 * GET /api/voice-command/status
 *
 * Get voice command service status.
 *
 * Response:
 *   - 200: Returns service status
 */
router.get('/voice-command/status', async (req: Request, res: Response) => {
  try {
    const isHealthy = await voiceCommandService.healthCheck();

    res.status(200).json({
      status: isHealthy ? 'operational' : 'degraded',
      gateway_url: process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789',
      model: 'claude-sonnet-4.5-20250929',
      api_connected: isHealthy,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error checking voice command status:', error);

    res.status(500).json({
      status: 'error',
      error: 'Failed to check voice command status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
