import { openClawClient } from '../services/openclaw-client.service';
import { Idea, CouncilVerdict, AgentEvaluation } from '../models/types';
import { FeasibilityAgent } from './agents/feasibility';
import { AlignmentAgent } from './agents/alignment';
import { ImpactAgent } from './agents/impact';
import { VaultService } from '../services/vault.service';
import { getVaultPath, writeJsonFile, deleteFile } from '../utils/file-operations';

/**
 * AI Council of Elders
 *
 * Orchestrates 3 specialized agents to evaluate ideas from multiple perspectives:
 * - Feasibility Agent: Can this be built?
 * - Alignment Agent: Does this align with user goals?
 * - Impact Agent: What's the ROI?
 *
 * Synthesizes their evaluations into a final verdict with recommendation.
 */
export class AICouncil {
  private feasibilityAgent: FeasibilityAgent;
  private alignmentAgent: AlignmentAgent;
  private impactAgent: ImpactAgent;
  private vaultService: VaultService;
  private readonly SONNET_MODEL = 'claude-sonnet-4.5-20250929';

  constructor() {
    // Uses OpenClaw Gateway for Claude access
    // Ensure OpenClaw is running: openclaw gateway start
    this.feasibilityAgent = new FeasibilityAgent();
    this.alignmentAgent = new AlignmentAgent();
    this.impactAgent = new ImpactAgent();
    this.vaultService = new VaultService();
  }

  /**
   * Validate an idea by running it through the AI Council
   * Returns a comprehensive verdict with recommendation
   */
  async validateIdea(idea: Idea, userContext?: string): Promise<CouncilVerdict> {
    console.log(`AI Council evaluating idea: ${idea.title}`);

    // Run all 3 agents in parallel for efficiency
    const [feasibilityEval, alignmentEval, impactEval] = await Promise.all([
      this.feasibilityAgent.evaluate(idea.title, idea.description),
      this.alignmentAgent.evaluate(idea.title, idea.description, userContext),
      this.impactAgent.evaluate(idea.title, idea.description),
    ]);

    console.log('Agent evaluations complete');
    console.log(`- Feasibility: ${feasibilityEval.score}/10`);
    console.log(`- Alignment: ${alignmentEval.score}/10`);
    console.log(`- Impact: ${impactEval.score}/10`);

    // Synthesize the verdict
    const verdict = await this.synthesizeVerdict(
      idea,
      [feasibilityEval, alignmentEval, impactEval]
    );

    // Write verdict to vault
    await this.writeVerdictToVault(idea, verdict);

    console.log(`Verdict: ${verdict.recommendation.toUpperCase()} (Score: ${verdict.overall_score}/10)`);

    return verdict;
  }

  /**
   * Synthesize individual agent evaluations into a final verdict
   * Uses Claude to create a coherent, balanced recommendation
   */
  private async synthesizeVerdict(
    idea: Idea,
    evaluations: AgentEvaluation[]
  ): Promise<CouncilVerdict> {
    // Calculate overall score (weighted average)
    const totalScore = evaluations.reduce((sum, evaluation) => sum + evaluation.score, 0);
    const overallScore = Math.round((totalScore / evaluations.length) * 10) / 10;

    // Determine recommendation based on scores and concerns
    let recommendation: 'approve' | 'reject' | 'needs-info';
    const allConcerns = evaluations.flatMap(e => e.concerns);
    const hasBlockingConcerns = evaluations.some(e => e.score < 4);

    if (overallScore >= 7 && !hasBlockingConcerns) {
      recommendation = 'approve';
    } else if (overallScore < 5 || hasBlockingConcerns) {
      recommendation = 'reject';
    } else {
      recommendation = 'needs-info';
    }

    // Use Claude to synthesize reasoning and next steps
    const systemPrompt = `You are the Head of the AI Council of Elders for Focus Flow.

Your role is to synthesize evaluations from 3 specialized agents into a coherent verdict.

The agents are:
1. Feasibility Agent: Assesses technical viability
2. Alignment Agent: Assesses goal alignment
3. Impact Agent: Assesses ROI and value

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
        e => `${e.agent_name}:
Score: ${e.score}/10
Reasoning: ${e.reasoning}
Concerns: ${e.concerns.join(', ') || 'None'}`
      )
      .join('\n\n');

    const userMessage = `Synthesize these evaluations into a final verdict:

Idea: ${idea.title}
Description: ${idea.description}

Overall Score: ${overallScore}/10
Recommendation: ${recommendation}

Agent Evaluations:
${evaluationSummary}

Provide synthesized reasoning and next steps.`;

    try {
      const responseText = await openClawClient.complete(
        userMessage,
        systemPrompt,
        {
          model: this.SONNET_MODEL,
          maxTokens: 1000,
          temperature: 0.5,
        }
      );

      const synthesis = JSON.parse(responseText);

      return {
        recommendation,
        overall_score: overallScore,
        evaluations,
        synthesized_reasoning: synthesis.synthesized_reasoning,
        next_steps: synthesis.next_steps || [],
      };
    } catch (error) {
      // Fallback to basic synthesis if Claude fails
      console.error('Failed to synthesize with Claude, using fallback:', error);

      return {
        recommendation,
        overall_score: overallScore,
        evaluations,
        synthesized_reasoning: this.generateFallbackReasoning(evaluations),
        next_steps: this.generateFallbackNextSteps(recommendation),
      };
    }
  }

  /**
   * Write the verdict to the appropriate vault location
   * Approved/needs-info -> validated/, Rejected -> rejected/
   */
  private async writeVerdictToVault(idea: Idea, verdict: CouncilVerdict): Promise<void> {
    // Update the idea with the verdict
    const updatedIdea: Idea = {
      ...idea,
      status: verdict.recommendation === 'reject' ? 'rejected' : 'validated',
      validated_at: new Date().toISOString(),
      council_verdict: verdict,
    };

    // Determine target directory based on recommendation
    const targetDir = verdict.recommendation === 'reject' ? 'rejected' : 'validated';

    // Write to target directory
    const targetPath = getVaultPath('03_ideas', targetDir, `${idea.id}.json`);
    await writeJsonFile(targetPath, updatedIdea);

    // Remove from inbox if it exists there
    try {
      const inboxPath = getVaultPath('03_ideas', 'inbox', `${idea.id}.json`);
      await deleteFile(inboxPath);
    } catch (error) {
      // Inbox file may not exist, that's okay
    }

    console.log(`Verdict written to: ${targetPath}`);
  }

  /**
   * Generate fallback reasoning if Claude synthesis fails
   */
  private generateFallbackReasoning(evaluations: AgentEvaluation[]): string {
    const summaries = evaluations.map(e => `${e.agent_name} (${e.score}/10): ${e.reasoning}`);
    return summaries.join('\n\n');
  }

  /**
   * Generate fallback next steps if Claude synthesis fails
   */
  private generateFallbackNextSteps(recommendation: 'approve' | 'reject' | 'needs-info'): string[] {
    switch (recommendation) {
      case 'approve':
        return [
          'Create a project plan with milestones',
          'Identify required resources and dependencies',
          'Set a timeline for implementation',
          'Begin execution',
        ];
      case 'needs-info':
        return [
          'Address the concerns raised by the council',
          'Gather additional information',
          'Refine the idea and resubmit for evaluation',
        ];
      case 'reject':
        return [
          'Consider alternative approaches',
          'Archive this idea for future reference',
          'Focus on higher-impact opportunities',
        ];
    }
  }

  /**
   * Health check to verify all agents are operational
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await openClawClient.healthCheck();
    } catch (error) {
      console.error('AI Council health check failed:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const aiCouncil = new AICouncil();
