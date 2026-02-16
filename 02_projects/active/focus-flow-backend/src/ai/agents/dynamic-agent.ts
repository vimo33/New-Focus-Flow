import { cachedInference } from '../../services/cached-inference.service';
import { AgentEvaluation, CouncilMember, DimensionScore } from '../../models/types';

/**
 * DynamicAgent — generic council agent executor.
 *
 * Takes a CouncilMember definition (name, role, focus, evaluation_criteria)
 * and produces an AgentEvaluation via web-search-enabled OpenClaw call.
 * Enhanced in Phase 4 to return dimension_scores, confidence, and key_insight.
 */
export class DynamicAgent {
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
  "concerns": ["concern 1", "concern 2", ...],
  "confidence": 0.0-1.0,
  "key_insight": "single most important finding from your analysis",
  "dimension_scores": [
    { "dimension": "dimension_name", "score": 0-10, "weight": 0.0-1.0, "reasoning": "brief justification" }
  ]
}

The dimension_scores should cover each of your evaluation criteria as a scored dimension.
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
      const responseText = await cachedInference.completeWithResearch(
        userMessage,
        systemPrompt,
        'evaluation',
        'standard',
        {
          max_tokens: member.max_tokens || 1500,
          temperature: 0.5,
        }
      );

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error(`${member.agent_name} response contained no JSON object`);
      }
      const response = JSON.parse(jsonMatch[0]);

      // Build dimension_scores: use model's response or synthesize from criteria + overall score
      const dimensionScores: DimensionScore[] = response.dimension_scores
        && Array.isArray(response.dimension_scores)
        && response.dimension_scores.length > 0
        ? response.dimension_scores
        : this.synthesizeDimensionScores(response.score, member.evaluation_criteria);

      return {
        agent_name: member.agent_name,
        score: response.score,
        reasoning: response.reasoning,
        concerns: response.concerns || [],
        // Enhanced fields (EnhancedAgentEvaluation extends AgentEvaluation)
        dimension_scores: dimensionScores,
        confidence: typeof response.confidence === 'number' ? response.confidence : 0.7,
        key_insight: response.key_insight || undefined,
      } as AgentEvaluation;
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error(`[DynamicAgent:${member.agent_name}] JSON parse failed`);
        throw new Error(`Failed to parse ${member.agent_name} response as JSON`);
      }
      throw error;
    }
  }

  /**
   * Fallback: synthesize dimension scores from the overall score and evaluation criteria.
   * Used when the model doesn't return structured dimension_scores.
   */
  private synthesizeDimensionScores(
    overallScore: number,
    criteria?: string[]
  ): DimensionScore[] {
    if (!criteria || criteria.length === 0) {
      return [{ dimension: 'overall', score: overallScore, weight: 1.0, reasoning: 'Single overall assessment' }];
    }
    const weight = 1.0 / criteria.length;
    return criteria.map(criterion => ({
      dimension: criterion.toLowerCase().replace(/\s+/g, '_'),
      score: overallScore,
      weight: Math.round(weight * 100) / 100,
      reasoning: `Derived from overall score for ${criterion}`,
    }));
  }
}
