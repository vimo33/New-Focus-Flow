import { openClawClient } from '../../services/openclaw-client.service';
import { AgentEvaluation } from '../../models/types';

/**
 * Alignment Agent
 *
 * Evaluates whether an idea aligns with user priorities and goals
 * Focuses on: Strategic fit, goal alignment, priority matching
 */
export class AlignmentAgent {
  private readonly MODEL = 'claude-sonnet-4.5-20250929';

  constructor() {
    // Uses OpenClaw Gateway for Claude access
  }

  async evaluate(ideaTitle: string, ideaDescription: string, userContext?: string): Promise<AgentEvaluation> {
    const systemPrompt = `You are the Alignment Agent in the AI Council of Elders for Focus Flow.

Your role is to assess whether ideas align with user goals, priorities, and values.

Evaluate ideas based on:
1. Strategic Alignment: Does this support long-term goals?
2. Priority Fit: Is this a priority right now?
3. Value Alignment: Does this match user values and principles?
4. Focus: Does this distract from or support current initiatives?
5. Coherence: Does this fit with the user's overall life/work strategy?

Provide a score from 0-10:
- 0-3: Misaligned with goals, likely a distraction
- 4-6: Somewhat aligned but not a clear priority
- 7-8: Well-aligned with current goals and priorities
- 9-10: Perfectly aligned, strategic and timely

Respond ONLY with valid JSON in this exact format:
{
  "score": 0-10,
  "reasoning": "detailed analysis of alignment",
  "concerns": ["concern 1", "concern 2", ...]
}

Be honest about alignment issues. Help users stay focused on what matters.`;

    const contextNote = userContext
      ? `\n\nUser Context:\n${userContext}`
      : '\n\nNote: No user context provided. Base evaluation on general productivity principles.';

    const userMessage = `Evaluate the alignment of this idea:

Title: ${ideaTitle}

Description: ${ideaDescription}${contextNote}`;

    try {
      const responseText = await openClawClient.complete(
        userMessage,
        systemPrompt,
        {
          model: this.MODEL,
          maxTokens: 1000,
          temperature: 0.5,
        }
      );

      const response = JSON.parse(responseText);

      // Validate and return
      return {
        agent_name: 'Alignment Agent',
        score: response.score,
        reasoning: response.reasoning,
        concerns: response.concerns || [],
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Failed to parse Alignment Agent response as JSON');
      }
      throw error;
    }
  }
}
