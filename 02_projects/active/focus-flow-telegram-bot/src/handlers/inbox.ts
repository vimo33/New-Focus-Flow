import { Context } from 'telegraf';
import { Markup } from 'telegraf';
import apiClient from '../services/api-client';

/**
 * Inbox Handler - Handles inbox processing and management
 *
 * Responsibilities:
 * - Fetch inbox items from backend
 * - Present items to user for processing
 * - Handle user actions (categorize, prioritize, delete)
 * - Update backend with user decisions
 */

export async function handleInboxView(ctx: Context): Promise<void> {
  try {
    const text = ctx.text || '';
    const args = text.split(' ').slice(1); // Remove /inbox command
    const filter = args[0]; // 'work', 'personal', 'ideas', or undefined

    // Show loading indicator
    const loadingMsg = await ctx.reply('Loading inbox...');

    if (filter) {
      // Show filtered inbox items
      await handleFilteredInbox(ctx, filter, loadingMsg.message_id);
    } else {
      // Show inbox counts
      await handleInboxCounts(ctx, loadingMsg.message_id);
    }
  } catch (error) {
    console.error('Error in inbox view handler:', error);
    await ctx.reply('Failed to fetch inbox. Please check if the backend is running and try again.');
  }
}

async function handleInboxCounts(ctx: Context, loadingMsgId: number): Promise<void> {
  try {
    const counts = await apiClient.getInboxCounts();

    // Delete loading message
    await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsgId);

    // Display counts
    await ctx.reply(
      `Inbox Summary\n\n` +
      `All: ${counts.all}\n` +
      `Work: ${counts.work}\n` +
      `Personal: ${counts.personal}\n` +
      `Ideas: ${counts.ideas}\n\n` +
      `Use /inbox work, /inbox personal, or /inbox ideas to view items.`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback('Work', 'inbox:work'),
          Markup.button.callback('Personal', 'inbox:personal')
        ],
        [
          Markup.button.callback('Ideas', 'inbox:ideas'),
          Markup.button.callback('All', 'inbox:all')
        ]
      ])
    );
  } catch (error) {
    console.error('Error fetching inbox counts:', error);
    throw error;
  }
}

async function handleFilteredInbox(ctx: Context, filter: string, loadingMsgId: number): Promise<void> {
  try {
    const validFilters = ['work', 'personal', 'ideas', 'all'];
    const normalizedFilter = filter.toLowerCase();

    if (!validFilters.includes(normalizedFilter)) {
      await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsgId);
      await ctx.reply(
        `Invalid filter: ${filter}\n\n` +
        `Valid filters: work, personal, ideas, all`
      );
      return;
    }

    const items = await apiClient.fetchInbox(normalizedFilter === 'all' ? undefined : normalizedFilter);

    // Delete loading message
    await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsgId);

    if (items.length === 0) {
      await ctx.reply(
        `No items in ${normalizedFilter} inbox.\n\n` +
        `Capture something with /capture or send a message!`
      );
      return;
    }

    // Display items
    await ctx.reply(
      `${normalizedFilter.charAt(0).toUpperCase() + normalizedFilter.slice(1)} Inbox (${items.length} items)\n\n` +
      `Use /process <id> to process an item.`
    );

    // Show first 5 items
    const displayItems = items.slice(0, 5);
    for (const item of displayItems) {
      const category = item.category ? ` [${item.category}]` : '';
      const aiSuggestion = item.ai_classification
        ? `\nAI suggests: ${item.ai_classification.suggested_action} (${Math.round(item.ai_classification.confidence * 100)}% confident)`
        : '';

      await ctx.reply(
        `ID: ${item.id}${category}\n` +
        `${item.text}${aiSuggestion}`,
        Markup.inlineKeyboard([
          [Markup.button.callback('Process', `process:${item.id}`)]
        ])
      );
    }

    if (items.length > 5) {
      await ctx.reply(`... and ${items.length - 5} more items.`);
    }
  } catch (error) {
    console.error('Error fetching filtered inbox:', error);
    throw error;
  }
}

export async function handleProcess(ctx: Context): Promise<void> {
  try {
    const text = ctx.text || '';
    const args = text.split(' ').slice(1); // Remove /process command
    const itemId = args[0];

    if (!itemId) {
      await ctx.reply('Please provide an item ID.\n\nExample: /process abc123');
      return;
    }

    // Show loading indicator
    const loadingMsg = await ctx.reply('Loading item...');

    // Fetch item
    const item = await apiClient.getInboxItem(itemId);

    // Delete loading message
    await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id);

    // Display item with action buttons
    const category = item.category ? ` [${item.category}]` : '';
    const aiSuggestion = item.ai_classification
      ? `\n\nAI Classification:\n` +
        `Category: ${item.ai_classification.category}\n` +
        `Suggested: ${item.ai_classification.suggested_action}\n` +
        `Confidence: ${Math.round(item.ai_classification.confidence * 100)}%\n` +
        `Reasoning: ${item.ai_classification.reasoning}`
      : '';

    await ctx.reply(
      `Processing Item${category}\n\n` +
      `${item.text}${aiSuggestion}\n\n` +
      `Choose an action:`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback('Task', `action:task:${itemId}`),
          Markup.button.callback('Project', `action:project:${itemId}`)
        ],
        [
          Markup.button.callback('Idea', `action:idea:${itemId}`),
          Markup.button.callback('Archive', `action:archive:${itemId}`)
        ],
        [
          Markup.button.callback('Delete', `action:delete:${itemId}`)
        ]
      ])
    );
  } catch (error) {
    console.error('Error in process handler:', error);
    await ctx.reply('Failed to load item. Please check the ID and try again.');
  }
}

export async function handleItemAction(ctx: Context): Promise<void> {
  try {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
      return;
    }

    const data = ctx.callbackQuery.data;
    const parts = data.split(':');

    if (parts[0] === 'inbox') {
      // Handle inbox filter button
      const filter = parts[1];
      await ctx.answerCbQuery();

      // Show loading
      const loadingMsg = await ctx.reply('Loading inbox...');
      await handleFilteredInbox(ctx, filter, loadingMsg.message_id);
      return;
    }

    if (parts[0] === 'process') {
      // Handle process button
      const itemId = parts[1];
      await ctx.answerCbQuery();

      // Show loading
      const loadingMsg = await ctx.reply('Loading item...');

      // Fetch and display item
      const item = await apiClient.getInboxItem(itemId);
      await ctx.telegram.deleteMessage(ctx.chat!.id, loadingMsg.message_id);

      const category = item.category ? ` [${item.category}]` : '';
      const aiSuggestion = item.ai_classification
        ? `\n\nAI suggests: ${item.ai_classification.suggested_action} (${Math.round(item.ai_classification.confidence * 100)}% confident)`
        : '';

      await ctx.reply(
        `Processing Item${category}\n\n` +
        `${item.text}${aiSuggestion}\n\n` +
        `Choose an action:`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback('Task', `action:task:${itemId}`),
            Markup.button.callback('Project', `action:project:${itemId}`)
          ],
          [
            Markup.button.callback('Idea', `action:idea:${itemId}`),
            Markup.button.callback('Archive', `action:archive:${itemId}`)
          ],
          [
            Markup.button.callback('Delete', `action:delete:${itemId}`)
          ]
        ])
      );
      return;
    }

    if (parts[0] === 'action') {
      // Handle action button
      const action = parts[1];
      const itemId = parts[2];

      await ctx.answerCbQuery('Processing...');

      // Send action to backend
      await apiClient.processInboxItem(itemId, {
        action: action as any
      });

      // Show confirmation
      await ctx.editMessageText(
        `Item processed as ${action}!\n\n` +
        `The item has been moved to your ${action === 'task' ? 'tasks' : action === 'project' ? 'projects' : action} list.`
      );
      return;
    }
  } catch (error) {
    console.error('Error in item action handler:', error);
    await ctx.answerCbQuery('Failed to process action. Please try again.');
  }
}
