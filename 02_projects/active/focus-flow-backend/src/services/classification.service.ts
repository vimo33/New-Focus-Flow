import { InboxItem, AIClassification } from '../models/types';
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
}

// Export a singleton instance
export const classificationService = new ClassificationService();
