import { cachedInference } from './cached-inference.service';
import { VoiceCommandIntent, VoiceCommandRequest } from '../models/types';

export class VoiceCommandService {
  /**
   * Extract JSON from a response that may be wrapped in markdown code fences
   */
  private extractJSON(text: string): string {
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (fenceMatch) {
      return fenceMatch[1].trim();
    }
    return text.trim();
  }

  /**
   * Classify a voice command using Claude Sonnet 4.5
   * Returns intent classification with action, parameters, and suggested response
   */
  async classifyCommand(request: VoiceCommandRequest): Promise<VoiceCommandIntent> {
    try {
      const systemPrompt = `You are an AI assistant for Focus Flow, a productivity system with voice control capabilities.

Your task is to analyze voice commands and classify them into structured intents for execution.

## Available Actions:

### Navigation (type: "navigation")
- navigate_inbox: Go to inbox page
- navigate_projects: Go to projects page
- navigate_calendar: Go to calendar page
- navigate_tasks: Go to tasks page
- navigate_ideas: Go to ideas page
- navigate_voice: Go to voice assistant page
- navigate_wellbeing: Go to wellbeing/health page

### Create (type: "create")
- create_task: Create a new task
  Parameters: { title: string, project_id?: string, due_date?: string, priority?: "low"|"medium"|"high" }
- create_project: Create a new project
  Parameters: { title: string, description?: string }
- create_idea: Create a new idea
  Parameters: { title: string, description?: string }
- capture_quick: Quick capture to inbox
  Parameters: { text: string, category?: "work"|"personal"|"ideas" }

### Query (type: "query")
- query_inbox_count: Get inbox item counts
  Parameters: {}
- query_agenda: Get today's agenda/summary
  Parameters: {}
- query_projects: List active projects
  Parameters: { status?: "active"|"paused"|"completed" }
- query_tasks: List tasks
  Parameters: { category?: "work"|"personal"|"scheduled", status?: "todo"|"in_progress"|"done" }

### Update (type: "update")
- update_task_status: Mark a task as done/in_progress/todo
  Parameters: { task_title: string, status: "todo"|"in_progress"|"done" }

### Delete (type: "delete", always requires_confirmation: true)
- delete_item: Delete an item (task, project, idea)
  Parameters: { item_type: "task"|"project"|"idea", title: string }

### Conversation (type: "conversation")
- conversation: Natural conversation or unclear intent
  Parameters: { topic: string }

## Rules:
1. confidence: 0.0-1.0 (how confident you are in the classification)
2. requires_confirmation: true for destructive actions (delete, update critical data)
3. suggested_response: Brief TTS-friendly response to confirm action
4. Extract parameters from natural language (e.g., "by Friday" → due_date: "2026-02-14")
5. If command is ambiguous or conversational, classify as "conversation"

Respond ONLY with valid JSON in this exact format:
{
  "type": "navigation" | "create" | "query" | "update" | "delete" | "conversation",
  "confidence": 0.0-1.0,
  "action": "<action_name>",
  "parameters": {},
  "requires_confirmation": boolean,
  "suggested_response": "brief TTS response"
}`;

      const contextInfo = request.context
        ? `Current context: ${JSON.stringify(request.context)}\n\n`
        : '';

      const userMessage = `${contextInfo}Classify this voice command:\n\n"${request.command}"`;

      const responseText = await cachedInference.complete(
        userMessage,
        systemPrompt,
        'fast_classification',
        'standard',
        { max_tokens: 800, temperature: 0.3 }
      );

      // Parse the JSON response
      const jsonText = this.extractJSON(responseText);
      const intent = JSON.parse(jsonText) as VoiceCommandIntent;

      // Validate the response
      this.validateIntent(intent);

      return intent;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Failed to parse Claude response as JSON');
      }
      throw error;
    }
  }

  /**
   * Validate intent structure
   */
  private validateIntent(intent: any): asserts intent is VoiceCommandIntent {
    const validTypes = ['navigation', 'create', 'query', 'update', 'delete', 'conversation'];
    if (!intent.type || !validTypes.includes(intent.type)) {
      throw new Error('Invalid intent type');
    }

    if (typeof intent.confidence !== 'number' || intent.confidence < 0 || intent.confidence > 1) {
      throw new Error('Invalid confidence score');
    }

    if (!intent.action || typeof intent.action !== 'string') {
      throw new Error('Invalid action');
    }

    if (typeof intent.requires_confirmation !== 'boolean') {
      throw new Error('Invalid requires_confirmation flag');
    }

    if (!intent.parameters || typeof intent.parameters !== 'object') {
      throw new Error('Invalid parameters');
    }
  }

  /**
   * Health check to verify OpenClaw connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { openClawClient } = await import('./openclaw-client.service');
      return await openClawClient.healthCheck();
    } catch (error) {
      console.error('Voice command service health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const voiceCommandService = new VoiceCommandService();
