import { openClawClient } from './openclaw-client.service';
import { Idea, ExpandedIdea } from '../models/types';
import { VaultService } from './vault.service';
import { getVaultPath, writeJsonFile, readJsonFile } from '../utils/file-operations';

const vaultService = new VaultService();

export class IdeaExpansionService {
  /**
   * Expand a rough idea into a structured document.
   * Updates the idea in vault with the expansion.
   */
  async expandIdea(ideaId: string): Promise<Idea> {
    const idea = await vaultService.getIdea(ideaId);
    if (!idea) {
      throw new Error(`Idea ${ideaId} not found`);
    }

    if (idea.expanded) {
      return idea; // Already expanded
    }

    const systemPrompt = `You are a product strategist expanding raw ideas into structured analyses.

Given a rough idea, produce a comprehensive expansion. Be realistic and specific.

Respond ONLY with valid JSON in this exact format:
{
  "problem_statement": "What problem does this solve?",
  "proposed_solution": "How does this solve it?",
  "target_users": "Who is this for?",
  "value_proposition": "Why would someone use this?",
  "key_features": ["feature 1", "feature 2", "feature 3"],
  "risks": ["risk 1", "risk 2"],
  "success_metrics": ["metric 1", "metric 2"],
  "competitive_landscape": "What else exists in this space?",
  "estimated_effort": "Rough effort estimate (hours/days/weeks)"
}`;

    const userMessage = `Expand this idea:

Title: ${idea.title}
Description: ${idea.description}`;

    const responseText = await openClawClient.complete(
      userMessage,
      systemPrompt,
      { maxTokens: 2000, temperature: 0.6 }
    );

    // Parse the expansion
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse idea expansion response');
    }

    const expanded: ExpandedIdea = JSON.parse(jsonMatch[0]);

    // Update the idea
    const updatedIdea: Idea = {
      ...idea,
      status: 'expanded',
      expanded_at: new Date().toISOString(),
      expanded,
    };

    // Determine which directory the idea is in and save it there
    for (const dir of ['inbox', 'validated', 'rejected']) {
      const filePath = getVaultPath('03_ideas', dir, `${ideaId}.json`);
      const existing = await readJsonFile(filePath);
      if (existing) {
        await writeJsonFile(filePath, updatedIdea);
        break;
      }
    }

    return updatedIdea;
  }
}

export const ideaExpansionService = new IdeaExpansionService();
