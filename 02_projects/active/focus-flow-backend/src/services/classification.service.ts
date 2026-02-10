import { InboxItem, AIClassification, AutoRouteResult } from '../models/types';
import { claudeClient } from '../ai/claude-client';
import { VaultService } from './vault.service';

export class ClassificationService {
  private vaultService: VaultService;

  constructor() {
    this.vaultService = new VaultService();
  }

  /**
   * Classify an inbox item using Claude AI
   * Updates the item with category and AI classification data
   * Saves the updated item back to the vault
   */
  async classifyInboxItem(item: InboxItem): Promise<InboxItem> {
    try {
      // Call Claude AI to classify the item
      const classification = await claudeClient.classifyInboxItem(item.text);

      // Create the AI classification object
      const aiClassification: AIClassification = {
        category: classification.category,
        confidence: classification.confidence,
        suggested_action: classification.suggested_action,
        suggested_project: classification.suggested_project,
        reasoning: classification.reasoning
      };

      // Update the item with classification results
      const updatedItem: InboxItem = {
        ...item,
        category: classification.category,
        ai_classification: aiClassification
      };

      // Save the updated item to vault
      await this.vaultService.createInboxItem(updatedItem);

      return updatedItem;
    } catch (error) {
      console.error('Error classifying inbox item:', error);

      // Return the original item if classification fails
      // This ensures the capture flow doesn't break
      return item;
    }
  }

  /**
   * Classify an inbox item in the background (non-blocking)
   * This is used for async classification after item creation
   */
  async classifyInboxItemAsync(itemId: string): Promise<void> {
    try {
      // Retrieve the item from the vault
      const item = await this.vaultService.getInboxItem(itemId);

      if (!item) {
        console.error(`Cannot classify: Item ${itemId} not found`);
        return;
      }

      // Skip if already classified
      if (item.ai_classification) {
        console.log(`Item ${itemId} already classified, skipping`);
        return;
      }

      // Classify the item
      const classification = await claudeClient.classifyInboxItem(item.text);

      // Create the AI classification object
      const aiClassification: AIClassification = {
        category: classification.category,
        confidence: classification.confidence,
        suggested_action: classification.suggested_action,
        suggested_project: classification.suggested_project,
        reasoning: classification.reasoning
      };

      // Update the item with classification results
      const updatedItem: InboxItem = {
        ...item,
        category: classification.category,
        ai_classification: aiClassification
      };

      // Save the updated item to vault (overwrites the existing file)
      await this.vaultService.createInboxItem(updatedItem);

      console.log(`Successfully classified item ${itemId} as ${classification.category} (confidence: ${classification.confidence})`);
    } catch (error) {
      console.error(`Error in async classification for item ${itemId}:`, error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Batch classify multiple inbox items
   * Useful for processing existing unclassified items
   */
  async classifyMultipleItems(itemIds: string[]): Promise<void> {
    console.log(`Starting batch classification for ${itemIds.length} items`);

    for (const itemId of itemIds) {
      await this.classifyInboxItemAsync(itemId);
    }

    console.log(`Completed batch classification for ${itemIds.length} items`);
  }

  /**
   * Classify all unclassified inbox items
   * Useful for retroactive classification
   */
  async classifyAllUnclassified(): Promise<void> {
    try {
      const allItems = await this.vaultService.getInboxItems();
      const unclassifiedItems = allItems.filter(item => !item.ai_classification);

      console.log(`Found ${unclassifiedItems.length} unclassified items`);

      for (const item of unclassifiedItems) {
        await this.classifyInboxItemAsync(item.id);
      }

      console.log(`Completed classification of all unclassified items`);
    } catch (error) {
      console.error('Error classifying all unclassified items:', error);
      throw error;
    }
  }

  /**
   * Auto-route an inbox item based on its classification.
   * Creates the appropriate entity (task, idea, etc.) and marks the item as routed.
   */
  async autoRouteItem(item: InboxItem): Promise<AutoRouteResult> {
    try {
      // Ensure the item is classified
      if (!item.ai_classification) {
        item = await this.classifyInboxItem(item);
      }

      const classification = item.ai_classification;
      if (!classification || !classification.auto_routable) {
        return { routed: false, reason: 'Not auto-routable' };
      }

      if ((classification.smart_confidence || classification.confidence) < 0.7) {
        return { routed: false, reason: 'Confidence too low for auto-routing' };
      }

      const smartType = classification.smart_type || classification.suggested_action;
      let entityId: string | undefined;
      let vaultPath: string | undefined;

      switch (smartType) {
        case 'task': {
          const task = await this.vaultService.createTask({
            title: item.text,
            category: classification.category === 'work' ? 'work' : 'personal',
          });
          entityId = task.id;
          vaultPath = `01_tasks/${task.category}/${task.id}.json`;
          break;
        }
        case 'idea': {
          const idea = await this.vaultService.createIdea({
            title: item.text.substring(0, 100),
            description: item.text,
          });
          entityId = idea.id;
          vaultPath = `03_ideas/inbox/${idea.id}.json`;
          break;
        }
        default:
          return {
            routed: false,
            reason: `Auto-routing not supported for type: ${smartType}`,
          };
      }

      // Mark the inbox item as routed
      const routedItem: InboxItem = {
        ...item,
        auto_routed: true,
        routed_to: {
          entity_type: smartType as any,
          entity_id: entityId!,
          vault_path: vaultPath!,
        },
      };
      // Save updated item (with routing info) then archive it
      await this.vaultService.processInboxItem(item.id, { action: 'archive' });

      return {
        routed: true,
        entity_type: smartType as any,
        entity_id: entityId,
        vault_path: vaultPath,
        confidence: classification.smart_confidence || classification.confidence,
      };
    } catch (error: any) {
      console.error(`[AutoRoute] Error routing item ${item.id}:`, error.message);
      return { routed: false, reason: error.message };
    }
  }
}

// Export a singleton instance
export const classificationService = new ClassificationService();
