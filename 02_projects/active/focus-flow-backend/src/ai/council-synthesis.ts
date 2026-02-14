import { cachedInference } from '../services/cached-inference.service';
import { councilFramework } from './council-framework';
import {
  CouncilDecisionConfig,
  DimensionScore,
  EnhancedAgentEvaluation,
  EnhancedCouncilVerdict,
  RecommendedAction,
  VerdictLevel,
} from '../models/types';

const LOG_PREFIX = '[CouncilSynthesis]';

class CouncilSynthesis {
  /**
   * Synthesize enhanced verdict from agent evaluations using the decision config.
   */
  async synthesize(
    title: string,
    description: string,
    evaluations: EnhancedAgentEvaluation[],
    config: CouncilDecisionConfig,
    projectId?: string
  ): Promise<EnhancedCouncilVerdict> {
    // 1. Aggregate dimension scores across agents
    const aggregatedDimensions = this.aggregateDimensions(evaluations, config);

    // 2. Compute overall score from aggregated dimensions
    const overallScore = this.computeOverallScore(aggregatedDimensions, config);

    // 3. Find consensus and disagreement areas
    const { consensus, disagreement } = this.findConsensusAndDisagreement(evaluations);

    // 4. Compute average confidence
    const avgConfidence = evaluations.reduce((sum, e) => sum + (e.confidence || 0.7), 0) / evaluations.length;

    // 5. Determine verdict level
    const verdictLevel = councilFramework.mapVerdictLevel(overallScore, config);

    // 6. Generate AI synthesis
    const aiSynthesis = await this.generateSynthesisWithAI(
      title, description, evaluations, aggregatedDimensions, overallScore, verdictLevel, config, projectId
    );

    // 7. Build the enhanced verdict
    const verdictId = councilFramework.generateVerdictId();
    const legacyRecommendation = councilFramework.mapLegacyRecommendation(verdictLevel);

    const verdict: EnhancedCouncilVerdict = {
      id: verdictId,
      decision_type: config.decision_type,
      verdict: verdictLevel,
      confidence: Math.round(avgConfidence * 100) / 100,
      overall_score: Math.round(overallScore * 10) / 10,
      executive_summary: aiSynthesis.executive_summary,
      key_insight: aiSynthesis.key_insight,
      dimension_scores: aggregatedDimensions,
      evaluations,
      recommended_actions: aiSynthesis.recommended_actions,
      risks: aiSynthesis.risks,
      open_questions: aiSynthesis.open_questions,
      consensus_areas: consensus,
      disagreement_areas: disagreement,
      synthesized_reasoning: this.buildSynthesizedReasoning(evaluations, aiSynthesis.executive_summary),
      council_composition: evaluations.map(e => e.agent_name),
      created_at: new Date().toISOString(),
      project_id: projectId,
      subject_title: title,
      subject_description: description,
      // Backward compat
      recommendation: legacyRecommendation,
      next_steps: aiSynthesis.recommended_actions.map(a => a.action),
    };

    return verdict;
  }

  /**
   * Aggregate dimension scores across all agents using config-defined weights.
   */
  private aggregateDimensions(
    evaluations: EnhancedAgentEvaluation[],
    config: CouncilDecisionConfig
  ): DimensionScore[] {
    const dimensionMap = new Map<string, { totalScore: number; totalWeight: number; count: number; reasonings: string[] }>();

    for (const evaluation of evaluations) {
      if (!evaluation.dimension_scores) continue;
      for (const ds of evaluation.dimension_scores) {
        const existing = dimensionMap.get(ds.dimension) || { totalScore: 0, totalWeight: 0, count: 0, reasonings: [] };
        existing.totalScore += ds.score;
        existing.totalWeight += ds.weight;
        existing.count += 1;
        if (ds.reasoning) existing.reasonings.push(ds.reasoning);
        dimensionMap.set(ds.dimension, existing);
      }
    }

    const aggregated: DimensionScore[] = [];
    for (const [dimension, data] of dimensionMap) {
      const configWeight = config.dimension_weights[dimension] || (1 / config.required_dimensions.length);
      aggregated.push({
        dimension,
        score: Math.round((data.totalScore / data.count) * 10) / 10,
        weight: configWeight,
        reasoning: data.reasonings.length > 0
          ? data.reasonings[0] + (data.reasonings.length > 1 ? ` (+${data.reasonings.length - 1} more perspectives)` : '')
          : 'Aggregated from agent evaluations',
      });
    }

    return aggregated;
  }

  /**
   * Compute overall score as weighted average of aggregated dimension scores.
   */
  private computeOverallScore(dimensions: DimensionScore[], config: CouncilDecisionConfig): number {
    if (dimensions.length === 0) return 5.0;

    let weightedSum = 0;
    let totalWeight = 0;

    for (const dim of dimensions) {
      const weight = config.dimension_weights[dim.dimension] || dim.weight;
      weightedSum += dim.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 5.0;
  }

  /**
   * Identify consensus (agents agree, spread <= 2) and disagreement (spread > 4) areas.
   */
  private findConsensusAndDisagreement(
    evaluations: EnhancedAgentEvaluation[]
  ): { consensus: string[]; disagreement: string[] } {
    const dimensionScores = new Map<string, number[]>();

    for (const evaluation of evaluations) {
      if (!evaluation.dimension_scores) continue;
      for (const ds of evaluation.dimension_scores) {
        const scores = dimensionScores.get(ds.dimension) || [];
        scores.push(ds.score);
        dimensionScores.set(ds.dimension, scores);
      }
    }

    const consensus: string[] = [];
    const disagreement: string[] = [];

    for (const [dimension, scores] of dimensionScores) {
      if (scores.length < 2) continue;
      const spread = Math.max(...scores) - Math.min(...scores);
      const label = dimension.replace(/_/g, ' ');
      if (spread <= 2) {
        consensus.push(label);
      } else if (spread > 4) {
        disagreement.push(label);
      }
    }

    return { consensus, disagreement };
  }

  /**
   * Use AI to generate executive summary, key insight, recommended actions, risks, and open questions.
   */
  private async generateSynthesisWithAI(
    title: string,
    description: string,
    evaluations: EnhancedAgentEvaluation[],
    aggregatedDimensions: DimensionScore[],
    overallScore: number,
    verdictLevel: VerdictLevel,
    config: CouncilDecisionConfig,
    projectId?: string
  ): Promise<{
    executive_summary: string;
    key_insight: string;
    recommended_actions: RecommendedAction[];
    risks: string[];
    open_questions: string[];
  }> {
    const evaluationSummary = evaluations
      .map(e => `${e.agent_name} (${e.score}/10, confidence: ${e.confidence || 'N/A'}):\n${e.reasoning}\nKey insight: ${e.key_insight || 'N/A'}\nConcerns: ${e.concerns.join(', ') || 'None'}`)
      .join('\n\n');

    const dimensionSummary = aggregatedDimensions
      .map(d => `${d.dimension}: ${d.score}/10 (weight: ${d.weight})`)
      .join(', ');

    const userMessage = `Synthesize these evaluations for a ${config.display_name} decision:

## Subject: ${title}

## Description
${description}

## Overall Score: ${overallScore}/10
## Verdict: ${verdictLevel}

## Dimension Scores
${dimensionSummary}

## Agent Evaluations
${evaluationSummary}

Provide executive summary, key insight, recommended actions, risks, and open questions.`;

    try {
      const responseText = await cachedInference.complete(
        userMessage,
        config.synthesis_prompt,
        'synthesis',
        'standard',
        { max_tokens: 2000, temperature: 0.5, project_id: projectId }
      );

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const synthesis = JSON.parse(jsonMatch[0]);
        return {
          executive_summary: synthesis.executive_summary || 'Council evaluation complete.',
          key_insight: synthesis.key_insight || 'See individual agent evaluations for details.',
          recommended_actions: this.mergeActions(synthesis.recommended_actions || [], config.action_templates),
          risks: synthesis.risks || [],
          open_questions: synthesis.open_questions || [],
        };
      }
    } catch (error: any) {
      console.error(`${LOG_PREFIX} AI synthesis failed, using fallback:`, error.message);
    }

    // Fallback synthesis
    return this.fallbackSynthesis(evaluations, overallScore, verdictLevel, config);
  }

  /**
   * Merge AI-generated actions with config's action templates, deduplicating.
   */
  private mergeActions(
    aiActions: RecommendedAction[],
    templates: RecommendedAction[]
  ): RecommendedAction[] {
    const merged: RecommendedAction[] = [...aiActions];
    const existingActions = new Set(aiActions.map(a => a.action.toLowerCase()));

    for (const template of templates) {
      if (!existingActions.has(template.action.toLowerCase())) {
        merged.push(template);
      }
    }

    return merged;
  }

  /**
   * Build synthesized reasoning text from individual evaluations.
   */
  private buildSynthesizedReasoning(evaluations: EnhancedAgentEvaluation[], summary: string): string {
    const agentSummaries = evaluations
      .map(e => `${e.agent_name} (${e.score}/10): ${e.reasoning}`)
      .join('\n\n');
    return `${summary}\n\n---\n\n${agentSummaries}`;
  }

  /**
   * Fallback when AI synthesis fails.
   */
  private fallbackSynthesis(
    evaluations: EnhancedAgentEvaluation[],
    overallScore: number,
    verdictLevel: VerdictLevel,
    config: CouncilDecisionConfig
  ): {
    executive_summary: string;
    key_insight: string;
    recommended_actions: RecommendedAction[];
    risks: string[];
    open_questions: string[];
  } {
    const allConcerns = evaluations.flatMap(e => e.concerns);
    const keyInsights = evaluations
      .filter(e => e.key_insight)
      .map(e => e.key_insight as string);

    return {
      executive_summary: `Council evaluated with ${evaluations.length} agents, resulting in a score of ${overallScore}/10 (${verdictLevel.replace(/_/g, ' ')}).`,
      key_insight: keyInsights[0] || 'Review individual agent evaluations for detailed analysis.',
      recommended_actions: config.action_templates,
      risks: allConcerns.slice(0, 5),
      open_questions: ['What additional context would strengthen this evaluation?'],
    };
  }
}

export const councilSynthesis = new CouncilSynthesis();
