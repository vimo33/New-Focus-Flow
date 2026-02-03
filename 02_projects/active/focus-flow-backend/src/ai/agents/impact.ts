import { openClawClient } from '../../services/openclaw-client.service';
import { AgentEvaluation } from '../../models/types';

/**
 * Impact Agent
 *
 * Evaluates the potential impact and ROI of an idea
 * Focuses on: Value creation, usage likelihood, return on investment
 */
export class ImpactAgent {
  private readonly MODEL = 'claude-sonnet-4.5-20250929';

  constructor() {
    // Uses OpenClaw Gateway for Claude access
  }

  async evaluate(ideaTitle: string, ideaDescription: string): Promise<AgentEvaluation> {
    const systemPrompt = `You are the Impact Agent in the AI Council of Elders for Focus Flow.

Your role is to assess the potential impact and return on investment of ideas.

Evaluate ideas based on:
1. Value Creation: How much value will this create?
2. Usage Likelihood: Will this actually get used?
3. ROI: Is the benefit worth the effort/cost?
4. Scale of Impact: Who benefits and how much?
5. Long-term Value: Does this create lasting value or one-time benefit?
6. Opportunity Cost: What are we NOT doing if we pursue this?

Provide a score from 0-10:
- 0-3: Low impact, poor ROI, unlikely to be valuable
- 4-6: Moderate impact, reasonable ROI
- 7-8: High impact, strong ROI, significant value
- 9-10: Exceptional impact, excellent ROI, transformative value

Respond ONLY with valid JSON in this exact format:
{
  "score": 0-10,
  "reasoning": "detailed analysis of impact and ROI",
  "concerns": ["concern 1", "concern 2", ...]
}

Be objective about potential impact. Consider both benefits and opportunity costs.`;

    const userMessage = `Evaluate the impact and ROI of this idea:

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
        agent_name: 'Impact Agent',
        score: response.score,
        reasoning: response.reasoning,
        concerns: response.concerns || [],
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Failed to parse Impact Agent response as JSON');
      }
      throw error;
    }
  }
}
