import { cachedInference } from '../services/cached-inference.service';
import { mem0Service } from '../services/mem0.service';
import { councilFramework } from './council-framework';
import {
  CouncilDecisionType,
  CouncilMember,
  CouncilPanelProposal,
  PanelModification,
} from '../models/types';

const LOG_PREFIX = '[CouncilComposer]';

class CouncilComposer {
  /**
   * Flow A: Auto-compose a panel of agents based on the decision type config.
   * Uses the config's agent_selection_prompt with AI to generate tailored agents.
   */
  async autoCompose(
    decisionType: CouncilDecisionType,
    subject: string,
    context?: string,
    projectId?: string
  ): Promise<CouncilMember[]> {
    const config = await councilFramework.getConfig(decisionType);
    if (!config) {
      console.warn(`${LOG_PREFIX} No config for '${decisionType}', using generic composition`);
      return this.genericCompose(subject, context);
    }

    const prompt = config.agent_selection_prompt
      .replace('{subject}', subject)
      .replace('{context}', context || 'No additional context provided');

    const systemPrompt = `You are a meta-analyst for the AI Council of Elders.
Your job: recommend ${config.default_agent_count} specialist evaluation agents for a ${config.display_name} decision.

The agents must evaluate these required dimensions: ${config.required_dimensions.join(', ')}.

Respond ONLY with a valid JSON array of agent definitions.`;

    try {
      const response = await cachedInference.complete(
        prompt,
        systemPrompt,
        'evaluation',
        'standard',
        { max_tokens: 1500, temperature: 0.5, project_id: projectId }
      );

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const agents: CouncilMember[] = JSON.parse(jsonMatch[0]);
        if (Array.isArray(agents) && agents.length >= 2 && agents.every(a => a.agent_name && a.role && a.focus)) {
          return agents;
        }
      }
    } catch (error: any) {
      console.error(`${LOG_PREFIX} Auto-compose failed, using fallback:`, error.message);
    }

    // Fallback: generate agents from required dimensions
    return this.fallbackFromDimensions(config);
  }

  /**
   * Flow B step 1: Propose a panel with reasoning for interactive curation.
   */
  async propose(
    decisionType: CouncilDecisionType,
    subject: string,
    context?: string,
    projectId?: string
  ): Promise<CouncilPanelProposal> {
    const config = await councilFramework.getConfig(decisionType);
    if (!config) {
      const agents = await this.genericCompose(subject, context);
      return {
        decision_type: decisionType,
        proposed_agents: agents,
        reasoning: 'No config found for this decision type. Using generic composition based on subject analysis.',
        context_summary: subject,
      };
    }

    const systemPrompt = `You are a meta-analyst for the AI Council of Elders.
Analyze this subject and propose a tailored panel of ${config.default_agent_count} evaluation agents for a ${config.display_name} decision.

Required evaluation dimensions: ${config.required_dimensions.join(', ')}.
Optional dimensions to consider: ${config.optional_dimensions.join(', ')}.

Respond ONLY with valid JSON:
{
  "proposed_agents": [
    {
      "agent_name": "Specific Name",
      "role": "Area of Expertise",
      "focus": "What this agent evaluates",
      "evaluation_criteria": ["criterion 1", "criterion 2"]
    }
  ],
  "reasoning": "Why these specific agents were chosen for this subject",
  "context_summary": "Brief summary of the evaluation context"
}`;

    const prompt = `Propose an evaluation panel for this ${config.display_name}:

Subject: ${subject}

Context: ${context || 'No additional context'}`;

    try {
      const response = await cachedInference.complete(
        prompt,
        systemPrompt,
        'evaluation',
        'standard',
        { max_tokens: 2000, temperature: 0.5, project_id: projectId }
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.proposed_agents && Array.isArray(parsed.proposed_agents)) {
          return {
            decision_type: decisionType,
            proposed_agents: parsed.proposed_agents,
            reasoning: parsed.reasoning || 'AI-generated panel recommendation',
            context_summary: parsed.context_summary || subject,
          };
        }
      }
    } catch (error: any) {
      console.error(`${LOG_PREFIX} Propose failed, using fallback:`, error.message);
    }

    const agents = this.fallbackFromDimensions(config);
    return {
      decision_type: decisionType,
      proposed_agents: agents,
      reasoning: 'Fallback: agents generated from required dimensions',
      context_summary: subject,
    };
  }

  /**
   * Flow B step 2: Apply user modifications to a proposed panel.
   */
  applyModifications(
    proposedAgents: CouncilMember[],
    modifications: PanelModification[]
  ): CouncilMember[] {
    let panel = [...proposedAgents];

    for (const mod of modifications) {
      switch (mod.action) {
        case 'add':
          if (mod.new_agent) {
            panel.push(mod.new_agent);
          }
          break;

        case 'remove':
          if (mod.agent_name) {
            panel = panel.filter(a => a.agent_name !== mod.agent_name);
          }
          break;

        case 'swap':
          if (mod.agent_name && mod.new_agent) {
            const idx = panel.findIndex(a => a.agent_name === mod.agent_name);
            if (idx !== -1) {
              panel[idx] = mod.new_agent;
            } else {
              panel.push(mod.new_agent);
            }
          }
          break;

        case 'custom':
          if (mod.new_agent) {
            panel.push(mod.new_agent);
          }
          break;
      }
    }

    return panel;
  }

  /**
   * Persist a custom agent definition to Mem0 for future reuse.
   */
  async persistCustomAgent(agent: CouncilMember, projectId?: string): Promise<void> {
    try {
      const content = `Council agent: ${agent.agent_name} — Role: ${agent.role}, Focus: ${agent.focus}`;
      await mem0Service.addExplicitMemory(content, {
        projectId,
        tags: ['council_agent', 'custom'],
        metadata: { source: 'council_composer', agent_definition: JSON.stringify(agent) },
      });
      console.log(`${LOG_PREFIX} Persisted custom agent '${agent.agent_name}' to Mem0`);
    } catch (error: any) {
      console.error(`${LOG_PREFIX} Failed to persist custom agent:`, error.message);
    }
  }

  /**
   * Generic composition when no config exists — mirrors concept-chat.service.ts:recommendCouncil()
   */
  private async genericCompose(subject: string, context?: string): Promise<CouncilMember[]> {
    const systemPrompt = `You are a meta-analyst for the AI Council of Elders.

Analyze the subject and recommend 3-5 specialist evaluation agents tailored to it.

For each agent, provide:
- agent_name: A specific, descriptive name
- role: Their area of expertise (2-5 words)
- focus: What they evaluate (1-2 sentences)
- evaluation_criteria: 3-5 specific scoring dimensions

Respond ONLY with valid JSON — an array of 3-5 agent definitions:
[
  {
    "agent_name": "Agent Name",
    "role": "Area of Expertise",
    "focus": "What this agent evaluates",
    "evaluation_criteria": ["criterion 1", "criterion 2", "criterion 3"]
  }
]`;

    try {
      const response = await cachedInference.complete(
        `Recommend evaluation perspectives for:\n\nSubject: ${subject}\n\nContext: ${context || 'None'}`,
        systemPrompt,
        'evaluation',
        'standard',
        { max_tokens: 1500, temperature: 0.5 }
      );

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const agents: CouncilMember[] = JSON.parse(jsonMatch[0]);
        if (Array.isArray(agents) && agents.length >= 2 && agents.every(a => a.agent_name && a.role && a.focus)) {
          return agents;
        }
      }
    } catch (error: any) {
      console.error(`${LOG_PREFIX} Generic compose failed:`, error.message);
    }

    // Hard fallback
    return [
      { agent_name: 'Feasibility Agent', role: 'Technical Feasibility', focus: 'Can this be built? Technical complexity, dependencies, resources needed', evaluation_criteria: ['Technical complexity', 'Resource requirements', 'Time to build', 'Risk assessment'] },
      { agent_name: 'Market Agent', role: 'Market Analysis', focus: 'Is there demand? Who are competitors? Market timing and positioning', evaluation_criteria: ['Market demand', 'Competitive landscape', 'Differentiation', 'Timing'] },
      { agent_name: 'Impact Agent', role: 'Impact Analysis', focus: 'Will this create meaningful value? Potential reach and significance', evaluation_criteria: ['Value creation', 'Reach potential', 'Long-term significance', 'User benefit'] },
    ];
  }

  /**
   * Generate agents from config's required dimensions when AI composition fails.
   */
  private fallbackFromDimensions(config: { required_dimensions: string[]; default_agent_count: number; display_name: string }): CouncilMember[] {
    return config.required_dimensions.slice(0, config.default_agent_count).map(dimension => {
      const name = dimension.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return {
        agent_name: `${name} Agent`,
        role: name,
        focus: `Evaluate ${dimension.replace(/_/g, ' ')} for this ${config.display_name.toLowerCase()}`,
        evaluation_criteria: [dimension.replace(/_/g, ' ')],
      };
    });
  }
}

export const councilComposer = new CouncilComposer();
