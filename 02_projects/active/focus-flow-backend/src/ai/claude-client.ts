import { openClawClient, OpenClawMessage } from '../services/openclaw-client.service';
import { AIClassification } from '../models/types';

// Type definitions for Claude AI responses
export interface ClassificationResponse {
  category: 'work' | 'personal' | 'ideas';
  confidence: number;
  suggested_action: 'task' | 'project' | 'idea' | 'note';
  suggested_project?: string;
  reasoning: string;
}

export interface GenerateResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface IdeaEvaluationResponse {
  score: number;
  reasoning: string;
  recommendation: 'approve' | 'reject' | 'revise';
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export class ClaudeClient {
  private readonly HAIKU_MODEL = 'claude-haiku-4.5-20250514';
  private readonly SONNET_MODEL = 'claude-sonnet-4.5-20250929';

  constructor() {
    // Uses OpenClaw Gateway for Claude access
    // Ensure OpenClaw is running: openclaw gateway start
  }

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
   * Classify an inbox item using Claude Haiku 4.5
   * Determines category, confidence, and suggested action
   */
  async classifyInboxItem(text: string): Promise<ClassificationResponse> {
    try {
      const systemPrompt = `You are an AI assistant that classifies inbox items for a productivity system called Focus Flow.

Your task is to analyze the text and classify it into one of three categories:
- "work": Professional tasks, meetings, work-related items
- "personal": Personal tasks, errands, personal goals
- "ideas": Creative ideas, project proposals, innovations

You must also suggest an action:
- "task": A single actionable item that can be completed
- "project": A larger effort requiring multiple tasks
- "idea": A creative concept that needs validation
- "note": Information to store for reference

Provide a confidence score (0-1) and reasoning for your classification.

Respond ONLY with valid JSON in this exact format:
{
  "category": "work" | "personal" | "ideas",
  "confidence": 0.0-1.0,
  "suggested_action": "task" | "project" | "idea" | "note",
  "suggested_project": "optional project name if relevant",
  "reasoning": "brief explanation"
}`;

      const userMessage = `Classify this inbox item:\n\n"${text}"`;

      const responseText = await openClawClient.complete(
        userMessage,
        systemPrompt,
        {
          model: this.HAIKU_MODEL,
          maxTokens: 500,
          temperature: 0.3,
        }
      );

      // Parse the JSON response (model may wrap in markdown code fences)
      const jsonText = this.extractJSON(responseText);
      const response = JSON.parse(jsonText) as ClassificationResponse;

      // Validate the response
      this.validateClassificationResponse(response);

      return response;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Failed to parse Claude response as JSON');
      }
      throw error;
    }
  }

  /**
   * Generate a response using Claude with optional context
   */
  async generateResponse(prompt: string, context?: string): Promise<GenerateResponse> {
    try {
      const systemPrompt = `You are a helpful AI assistant for Focus Flow, a productivity and personal management system.
Provide clear, concise, and actionable responses.`;

      const userMessage = context
        ? `Context:\n${context}\n\nQuestion:\n${prompt}`
        : prompt;

      const responseText = await openClawClient.complete(
        userMessage,
        systemPrompt,
        {
          model: this.SONNET_MODEL,
          maxTokens: 2000,
          temperature: 0.7,
        }
      );

      return {
        content: responseText,
        usage: {
          input_tokens: 0, // OpenClaw doesn't provide token usage in simple mode
          output_tokens: 0,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Evaluate an idea against given criteria using Claude Sonnet 4.5
   * Returns a score, reasoning, and recommendation
   */
  async evaluateIdea(idea: string, criteria: string): Promise<IdeaEvaluationResponse> {
    try {
      const systemPrompt = `You are a member of the "AI Council of Elders" for Focus Flow, a productivity system.
Your role is to evaluate ideas critically and constructively.

Evaluate ideas based on:
- Feasibility: Can this be realistically accomplished?
- Value: What impact will this have?
- Alignment: Does this fit with the user's goals and context?
- Resource Requirements: What will this require in terms of time, money, effort?

Provide:
- A score from 0-100
- A recommendation: "approve", "reject", or "revise"
- Detailed reasoning
- Specific strengths of the idea
- Specific weaknesses or concerns
- Actionable suggestions for improvement

Respond ONLY with valid JSON in this exact format:
{
  "score": 0-100,
  "reasoning": "detailed evaluation",
  "recommendation": "approve" | "reject" | "revise",
  "strengths": ["strength 1", "strength 2", ...],
  "weaknesses": ["weakness 1", "weakness 2", ...],
  "suggestions": ["suggestion 1", "suggestion 2", ...]
}`;

      const userMessage = `Evaluate this idea:\n\n"${idea}"\n\nCriteria:\n${criteria}`;

      const responseText = await openClawClient.complete(
        userMessage,
        systemPrompt,
        {
          model: this.SONNET_MODEL,
          maxTokens: 1500,
          temperature: 0.5,
        }
      );

      // Parse the JSON response (model may wrap in markdown code fences)
      const jsonText = this.extractJSON(responseText);
      const response = JSON.parse(jsonText) as IdeaEvaluationResponse;

      // Validate the response
      this.validateIdeaEvaluationResponse(response);

      return response;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Failed to parse Claude response as JSON');
      }
      throw error;
    }
  }

  /**
   * Validate classification response structure
   */
  private validateClassificationResponse(response: any): asserts response is ClassificationResponse {
    if (!response.category || !['work', 'personal', 'ideas'].includes(response.category)) {
      throw new Error('Invalid category in classification response');
    }

    if (typeof response.confidence !== 'number' || response.confidence < 0 || response.confidence > 1) {
      throw new Error('Invalid confidence score in classification response');
    }

    if (!response.suggested_action || !['task', 'project', 'idea', 'note'].includes(response.suggested_action)) {
      throw new Error('Invalid suggested_action in classification response');
    }

    if (!response.reasoning || typeof response.reasoning !== 'string') {
      throw new Error('Invalid reasoning in classification response');
    }
  }

  /**
   * Validate idea evaluation response structure
   */
  private validateIdeaEvaluationResponse(response: any): asserts response is IdeaEvaluationResponse {
    if (typeof response.score !== 'number' || response.score < 0 || response.score > 100) {
      throw new Error('Invalid score in idea evaluation response');
    }

    if (!response.recommendation || !['approve', 'reject', 'revise'].includes(response.recommendation)) {
      throw new Error('Invalid recommendation in idea evaluation response');
    }

    if (!response.reasoning || typeof response.reasoning !== 'string') {
      throw new Error('Invalid reasoning in idea evaluation response');
    }

    if (!Array.isArray(response.strengths) || !Array.isArray(response.weaknesses) || !Array.isArray(response.suggestions)) {
      throw new Error('Invalid strengths, weaknesses, or suggestions arrays in idea evaluation response');
    }
  }

  /**
   * Health check to verify API connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await openClawClient.healthCheck();
    } catch (error) {
      console.error('OpenClaw health check failed:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const claudeClient = new ClaudeClient();
