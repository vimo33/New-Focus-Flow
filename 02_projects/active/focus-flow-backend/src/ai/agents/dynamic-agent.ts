import { openClawClient } from '../../services/openclaw-client.service';
import { AgentEvaluation, CouncilMember } from '../../models/types';

/**
 * DynamicAgent — generic council agent executor.
 *
 * Takes a CouncilMember definition (name, role, focus, evaluation_criteria)
 * and produces an AgentEvaluation via web-search-enabled OpenClaw call.
 */
export class DynamicAgent {
  private readonly MODEL = 'anthropic/claude-opus-4-6';

  async evaluate(
    member: CouncilMember,
    ideaTitle: string,
    ideaDescription: string
  ): Promise<AgentEvaluation> {
    const criteriaBlock = member.evaluation_criteria?.length
      ? `\nEvaluate specifically on these criteria:\n${member.evaluation_criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
      : '';

    const jsonFormatInstructions = `

After your research, respond ONLY with valid JSON in this exact format:
{
  "score": 0-10,
  "reasoning": "detailed analysis from your perspective, citing specific findings from your research",
  "concerns": ["concern 1", "concern 2", ...]
}

Be constructive but realistic. Ground your assessment in real data from your research.`;

    // If custom system_prompt provided, use it + append scoring format
    // Otherwise, use existing auto-generated prompt from agent_name/role/focus/criteria
    const systemPrompt = member.system_prompt
      ? `${member.system_prompt}${jsonFormatInstructions}`
      : `You are the ${member.agent_name} in the AI Council of Elders for Focus Flow.

Your role: ${member.role}
Your focus: ${member.focus}
${criteriaBlock}

You have access to web search tools. Before evaluating, research key aspects relevant to your focus area:
- Look up technologies, markets, competitors, or patterns related to the concept
- Verify claims and check real-world data
- Research best practices and comparable products

After researching, provide a score from 0-10:
- 0-3: Serious problems in your focus area
- 4-6: Significant concerns but workable
- 7-8: Good with minor issues
- 9-10: Excellent in your focus area
${jsonFormatInstructions}`;

    const userMessage = `Evaluate this concept from your perspective as ${member.role}:

Title: ${ideaTitle}

Description: ${ideaDescription}`;

    try {
      const responseText = await openClawClient.completeWithResearch(
        userMessage,
        systemPrompt,
        {
          model: this.MODEL,
          maxTokens: member.max_tokens || 1500,
          temperature: 0.5,
        }
      );

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error(`${member.agent_name} response contained no JSON object`);
      }
      const response = JSON.parse(jsonMatch[0]);

      return {
        agent_name: member.agent_name,
        score: response.score,
        reasoning: response.reasoning,
        concerns: response.concerns || [],
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error(`[DynamicAgent:${member.agent_name}] JSON parse failed`);
        throw new Error(`Failed to parse ${member.agent_name} response as JSON`);
      }
      throw error;
    }
  }
}
