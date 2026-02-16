import { cachedInference } from '../services/cached-inference.service';
import { CouncilVerdict, AgentEvaluation, CouncilMember } from '../models/types';
import { DynamicAgent } from './agents/dynamic-agent';
import { mem0Service } from '../services/mem0.service';
import { decisionLogService } from '../services/decision-log.service';

/**
 * AI Council of Elders
 *
 * Orchestrates dynamically-defined agents to evaluate project concepts
 * from multiple perspectives. Agent definitions come from the meta-agent
 * recommendation step, not a hardcoded pool.
 */
export class AICouncil {
  private dynamicAgent: DynamicAgent;

  constructor() {
    this.dynamicAgent = new DynamicAgent();
  }

  /**
   * Run a single agent using its full CouncilMember definition.
   */
  async runSingleAgent(
    member: CouncilMember,
    title: string,
    description: string
  ): Promise<AgentEvaluation> {
    return this.dynamicAgent.evaluate(member, title, description);
  }

  /**
   * Validate with a set of council members (runs all in parallel, then synthesizes).
   * When projectId is provided, injects project memory context and auto-logs the decision.
   */
  async validateWithCouncil(
    title: string,
    description: string,
    members: CouncilMember[],
    projectId?: string
  ): Promise<CouncilVerdict> {
    console.log(`AI Council evaluating: ${title} with agents: ${members.map(m => m.agent_name).join(', ')}`);

    // Inject project memory context if available
    let enrichedDescription = description;
    if (projectId) {
      try {
        const memoryContext = await mem0Service.assembleContext(projectId, title);
        if (memoryContext) {
          enrichedDescription = `${description}\n\n---\n\n${memoryContext}`;
        }
      } catch (e: any) {
        console.error('[AICouncil] Memory context retrieval failed:', e.message);
      }
    }

    const evaluationPromises = members.map((m) => this.runSingleAgent(m, title, enrichedDescription));
    const evaluations = await Promise.all(evaluationPromises);

    evaluations.forEach((e) => console.log(`- ${e.agent_name}: ${e.score}/10`));

    const verdict = await this.synthesizeVerdict(title, enrichedDescription, evaluations);
    console.log(`Verdict: ${verdict.recommendation.toUpperCase()} (Score: ${verdict.overall_score}/10)`);

    // Auto-log as a decision entry
    if (projectId) {
      try {
        await decisionLogService.createDecision({
          project_id: projectId,
          decision_type: 'council_response',
          context: `Council evaluated "${title}" with ${members.length} agents`,
          decision: `${verdict.recommendation} (score: ${verdict.overall_score}/10)`,
          reasoning: verdict.synthesized_reasoning.substring(0, 1000),
          alternatives: verdict.next_steps || [],
          outcome: verdict.recommendation === 'approve' ? 'succeeded' : 'pending',
          source: 'council',
        });
      } catch (e: any) {
        console.error('[AICouncil] Failed to log decision:', e.message);
      }
    }

    return verdict;
  }

  /**
   * Synthesize verdict from pre-collected evaluations (public wrapper)
   */
  async synthesizeFromEvaluations(
    title: string,
    description: string,
    evaluations: AgentEvaluation[]
  ): Promise<CouncilVerdict> {
    return this.synthesizeVerdict(title, description, evaluations);
  }

  /**
   * Synthesize individual agent evaluations into a final verdict
   */
  private async synthesizeVerdict(
    title: string,
    description: string,
    evaluations: AgentEvaluation[]
  ): Promise<CouncilVerdict> {
    const totalScore = evaluations.reduce((sum, e) => sum + e.score, 0);
    const overallScore = Math.round((totalScore / evaluations.length) * 10) / 10;

    let recommendation: 'approve' | 'reject' | 'needs-info';
    const hasBlockingConcerns = evaluations.some((e) => e.score < 4);

    if (overallScore >= 7 && !hasBlockingConcerns) {
      recommendation = 'approve';
    } else if (overallScore < 5 || hasBlockingConcerns) {
      recommendation = 'reject';
    } else {
      recommendation = 'needs-info';
    }

    const systemPrompt = `You are the Head of the AI Council of Elders for Nitara.

Your role is to synthesize evaluations from specialized agents into a coherent verdict.

Provide:
1. A synthesized reasoning that balances all perspectives
2. Clear next steps based on the recommendation

Be concise but thorough. Highlight key insights and any critical concerns.

Respond ONLY with valid JSON in this exact format:
{
  "synthesized_reasoning": "balanced summary of all evaluations",
  "next_steps": ["step 1", "step 2", ...]
}`;

    const evaluationSummary = evaluations
      .map(
        (e) => `${e.agent_name}:
Score: ${e.score}/10
Reasoning: ${e.reasoning}
Concerns: ${e.concerns.join(', ') || 'None'}`
      )
      .join('\n\n');

    const userMessage = `Synthesize these evaluations into a final verdict:

## Project: ${title}

## Council Brief
${description}

## Scores
Overall Score: ${overallScore}/10
Recommendation: ${recommendation}

## Agent Evaluations
${evaluationSummary}

Provide synthesized reasoning and actionable next steps. Ground your synthesis in the full context above — reference specific details from the original submission and chat refinement, not just the agent scores.`;

    try {
      const responseText = await cachedInference.complete(
        userMessage,
        systemPrompt,
        'synthesis',
        'standard',
        { max_tokens: 2000, temperature: 0.5 }
      );

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const synthesis = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);

      return {
        recommendation,
        overall_score: overallScore,
        evaluations,
        synthesized_reasoning: synthesis.synthesized_reasoning,
        next_steps: synthesis.next_steps || [],
        council_composition: evaluations.map((e) => e.agent_name),
      };
    } catch (error) {
      console.error('Failed to synthesize with Claude, using fallback:', error);

      return {
        recommendation,
        overall_score: overallScore,
        evaluations,
        synthesized_reasoning: evaluations
          .map((e) => `${e.agent_name} (${e.score}/10): ${e.reasoning}`)
          .join('\n\n'),
        next_steps: this.generateFallbackNextSteps(recommendation),
        council_composition: evaluations.map((e) => e.agent_name),
      };
    }
  }

  private generateFallbackNextSteps(recommendation: 'approve' | 'reject' | 'needs-info'): string[] {
    switch (recommendation) {
      case 'approve':
        return ['Proceed to PRD generation', 'Define core requirements', 'Set timeline'];
      case 'needs-info':
        return ['Address concerns raised by council', 'Refine concept and resubmit'];
      case 'reject':
        return ['Consider alternative approaches', 'Focus on higher-impact opportunities'];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const { openClawClient } = await import('../services/openclaw-client.service');
      return await openClawClient.healthCheck();
    } catch (error) {
      console.error('AI Council health check failed:', error);
      return false;
    }
  }
}

export const aiCouncil = new AICouncil();
