import { openClawClient } from '../../services/openclaw-client.service';
import { AgentEvaluation } from '../../models/types';

/**
 * Feasibility Agent
 *
 * Evaluates whether an idea can be realistically built
 * Focuses on: Technical complexity, dependencies, resource requirements
 */
export class FeasibilityAgent {
  private readonly MODEL = 'claude-sonnet-4.5-20250929';

  constructor() {
    // Uses OpenClaw Gateway for Claude access
  }

  async evaluate(ideaTitle: string, ideaDescription: string): Promise<AgentEvaluation> {
    const systemPrompt = `You are the Feasibility Agent in the AI Council of Elders for Focus Flow.

Your role is to assess whether ideas can be realistically built and executed.

Evaluate ideas based on:
1. Technical Complexity: How difficult is this to implement?
2. Dependencies: What external resources, tools, or skills are required?
3. Time Requirements: How long would this realistically take?
4. Resource Availability: Can this be done with available resources?
5. Risk Assessment: What technical risks or blockers exist?

Provide a score from 0-10:
- 0-3: Not feasible with current resources
- 4-6: Challenging but possible with significant effort
- 7-8: Feasible with moderate effort
- 9-10: Highly feasible, straightforward to implement

Respond ONLY with valid JSON in this exact format:
{
  "score": 0-10,
  "reasoning": "detailed analysis of feasibility",
  "concerns": ["concern 1", "concern 2", ...]
}

Be constructive but realistic. Identify blockers early.`;

    const userMessage = `Evaluate the feasibility of this idea:

Title: ${ideaTitle}

Description: ${ideaDescription}`;

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
        agent_name: 'Feasibility Agent',
        score: response.score,
        reasoning: response.reasoning,
        concerns: response.concerns || [],
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Failed to parse Feasibility Agent response as JSON');
      }
      throw error;
    }
  }
}
