/**
 * Agent Memory Service — Structured Mem0 wrapper for autonomous agents
 *
 * Bridges the validation engine (Postgres) and semantic memory layer (Qdrant).
 * Provides typed memory write/read methods that agents call after completing work.
 *
 * Memory types:
 * - experiment_outcome: what was tested, result, positive/negative
 * - pattern: cross-project learning from multiple experiments
 * - validation_insight: market signal, customer quote, competitor move
 * - decision_context: why a kill/scale/iterate decision was made
 * - network_insight: contact-related learning
 * - playbook_step: reusable step that worked in a specific context
 */

import { mem0Service } from './mem0.service';

const LOG_PREFIX = '[AgentMemory]';

export type AgentMemoryType =
  | 'experiment_outcome'
  | 'pattern'
  | 'validation_insight'
  | 'decision_context'
  | 'network_insight'
  | 'playbook_step';

interface RecordOptions {
  projectId?: string;
  tags?: string[];
}

class AgentMemoryService {
  /**
   * Record an experiment outcome as semantic memory.
   * Called after experiment decisions (scale/iterate/pivot/park/kill).
   */
  async recordExperimentOutcome(
    experimentId: string,
    projectId: string,
    outcome: 'positive' | 'negative' | 'inconclusive',
    learnings: string
  ): Promise<void> {
    const content = `Experiment ${experimentId} (project: ${projectId}) — Outcome: ${outcome}. ${learnings}`;
    const tags = ['experiment', outcome, projectId];

    try {
      await mem0Service.addExplicitMemory(content, {
        projectId,
        tags,
        metadata: {
          source: 'agent',
          memory_type: 'experiment_outcome',
          experiment_id: experimentId,
          confidence: outcome === 'positive' ? 0.8 : outcome === 'negative' ? 0.7 : 0.5,
          category: outcome,
        },
      });
      console.log(`${LOG_PREFIX} Recorded experiment outcome: ${experimentId} → ${outcome}`);
    } catch (error: any) {
      console.error(`${LOG_PREFIX} Failed to record experiment outcome:`, error.message);
    }
  }

  /**
   * Record a cross-project pattern extracted from experiments.
   * Called by pattern-memory.service.ts after extracting patterns.
   */
  async recordPattern(
    pattern: string,
    category: 'success_pattern' | 'failure_pattern' | 'market_signal' | 'timing_pattern',
    relatedProjects: string[],
    confidence: number
  ): Promise<void> {
    const tags = ['pattern', category, ...relatedProjects];

    try {
      await mem0Service.addExplicitMemory(pattern, {
        tags,
        metadata: {
          source: 'agent',
          memory_type: 'pattern',
          related_projects: relatedProjects,
          confidence,
          category,
        },
      });
      console.log(`${LOG_PREFIX} Recorded pattern: ${category} (confidence: ${confidence})`);
    } catch (error: any) {
      console.error(`${LOG_PREFIX} Failed to record pattern:`, error.message);
    }
  }

  /**
   * Record why a decision was made (kill/scale/iterate/etc).
   * Called after validation decisions for future reference.
   */
  async recordDecisionContext(
    projectId: string,
    decision: string,
    rationale: string,
    signals: string[]
  ): Promise<void> {
    const content = `Decision for project ${projectId}: ${decision}. Rationale: ${rationale}. Key signals: ${signals.join('; ')}`;
    const tags = ['decision', decision, projectId];

    try {
      await mem0Service.addExplicitMemory(content, {
        projectId,
        tags,
        metadata: {
          source: 'agent',
          memory_type: 'decision_context',
          decision,
          confidence: 0.9,
          category: decision,
        },
      });
      console.log(`${LOG_PREFIX} Recorded decision context: ${projectId} → ${decision}`);
    } catch (error: any) {
      console.error(`${LOG_PREFIX} Failed to record decision context:`, error.message);
    }
  }

  /**
   * Record a network-related insight.
   * Called after network analysis, career leverage, or contact interactions.
   */
  async recordNetworkInsight(
    contactId: string,
    projectId: string | null,
    insight: string
  ): Promise<void> {
    const content = `Network insight (contact: ${contactId}${projectId ? `, project: ${projectId}` : ''}): ${insight}`;
    const tags = ['network', contactId];
    if (projectId) tags.push(projectId);

    try {
      await mem0Service.addExplicitMemory(content, {
        projectId: projectId || undefined,
        tags,
        metadata: {
          source: 'agent',
          memory_type: 'network_insight',
          contact_id: contactId,
          confidence: 0.7,
          category: 'network',
        },
      });
      console.log(`${LOG_PREFIX} Recorded network insight for contact: ${contactId}`);
    } catch (error: any) {
      console.error(`${LOG_PREFIX} Failed to record network insight:`, error.message);
    }
  }

  /**
   * Record a validation insight (market signal, customer quote, competitor move).
   */
  async recordValidationInsight(
    projectId: string,
    insight: string,
    options: RecordOptions = {}
  ): Promise<void> {
    const tags = ['validation', projectId, ...(options.tags || [])];

    try {
      await mem0Service.addExplicitMemory(insight, {
        projectId,
        tags,
        metadata: {
          source: 'agent',
          memory_type: 'validation_insight',
          confidence: 0.6,
          category: 'validation',
        },
      });
      console.log(`${LOG_PREFIX} Recorded validation insight for: ${projectId}`);
    } catch (error: any) {
      console.error(`${LOG_PREFIX} Failed to record validation insight:`, error.message);
    }
  }

  /**
   * Record a reusable playbook step that worked in a specific context.
   */
  async recordPlaybookStep(
    projectId: string,
    step: string,
    context: string,
    options: RecordOptions = {}
  ): Promise<void> {
    const content = `Playbook step (project: ${projectId}): ${step}. Context: ${context}`;
    const tags = ['playbook', projectId, ...(options.tags || [])];

    try {
      await mem0Service.addExplicitMemory(content, {
        projectId,
        tags,
        metadata: {
          source: 'agent',
          memory_type: 'playbook_step',
          confidence: 0.8,
          category: 'playbook',
        },
      });
      console.log(`${LOG_PREFIX} Recorded playbook step for: ${projectId}`);
    } catch (error: any) {
      console.error(`${LOG_PREFIX} Failed to record playbook step:`, error.message);
    }
  }

  /**
   * Semantic search filtered by memory types.
   * Returns memories that match the query AND belong to specified types.
   */
  async getRelevantMemories(
    projectId: string | null,
    query: string,
    types: AgentMemoryType[] = [],
    limit = 10
  ): Promise<Array<{ memory: string; type: string; score: number; metadata: Record<string, any> }>> {
    try {
      const results = await mem0Service.searchMemories(query, {
        projectId: projectId || undefined,
        limit: limit * 2, // fetch extra to filter by type
      });

      let filtered = results;
      if (types.length > 0) {
        filtered = results.filter(r =>
          types.includes(r.metadata?.memory_type as AgentMemoryType)
        );
      }

      return filtered.slice(0, limit).map(r => ({
        memory: r.memory,
        type: r.metadata?.memory_type || 'unknown',
        score: r.score || 0,
        metadata: r.metadata || {},
      }));
    } catch (error: any) {
      console.error(`${LOG_PREFIX} Failed to get relevant memories:`, error.message);
      return [];
    }
  }

  /**
   * Get all experiment outcome memories for reporting.
   */
  async getExperimentOutcomes(limit = 20): Promise<Array<{ memory: string; metadata: Record<string, any> }>> {
    return this.getRelevantMemories(null, 'experiment outcome result learning', ['experiment_outcome'], limit);
  }

  /**
   * Get all pattern memories for the knowledge digest.
   */
  async getPatterns(limit = 10): Promise<Array<{ memory: string; confidence: number; category: string }>> {
    const results = await this.getRelevantMemories(null, 'pattern learning cross-project', ['pattern'], limit);
    return results.map(r => ({
      memory: r.memory,
      confidence: r.metadata?.confidence || 0,
      category: r.metadata?.category || 'unknown',
    }));
  }

  /**
   * Get failure patterns that agents should avoid repeating.
   */
  async getFailurePatterns(limit = 5): Promise<string[]> {
    const results = await this.getRelevantMemories(null, 'failure pattern avoid mistake', ['pattern'], limit * 2);
    return results
      .filter(r => r.metadata?.category === 'failure_pattern')
      .slice(0, limit)
      .map(r => r.memory);
  }

  /**
   * Get network insights for knowledge digest.
   */
  async getNetworkInsights(limit = 10): Promise<Array<{ memory: string; metadata: Record<string, any> }>> {
    return this.getRelevantMemories(null, 'network contact warm intro opportunity', ['network_insight'], limit);
  }
}

export const agentMemoryService = new AgentMemoryService();
