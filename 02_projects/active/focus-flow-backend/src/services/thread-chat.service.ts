import { ThreadMessage } from '../models/types';
import { ThreadService } from './thread.service';
import { openClawClient, OpenClawMessage } from './openclaw-client.service';

const SYSTEM_PROMPT = `You are Focus Flow, a helpful AI assistant for productivity and life management. You help the user manage their tasks, projects, schedule, and well-being.

Be concise and conversational. Keep responses under 3 sentences unless the user asks for detail. Use a warm, encouraging tone.

You can help with:
- Planning and organizing tasks
- Breaking down projects into steps
- Scheduling and time management
- Brainstorming ideas
- General advice and thinking through problems

When the user asks you to do something specific (create a task, etc.), acknowledge what you'll help with. You don't have direct access to their task system in this conversation, but you can help them think through and plan.`;

const CONTEXT_WINDOW = 20;

export class ThreadChatService {
  private threadService: ThreadService;

  constructor(threadService: ThreadService) {
    this.threadService = threadService;
  }

  async sendMessage(
    threadId: string,
    content: string,
    source: 'voice' | 'text'
  ): Promise<{ user_message: ThreadMessage; assistant_message: ThreadMessage }> {
    // Save user message
    const userMessage = await this.threadService.addMessage(threadId, {
      role: 'user',
      content,
      source,
    });

    // Build conversation context from recent messages
    const recentMessages = await this.threadService.getMessages(threadId, CONTEXT_WINDOW);

    const messages: OpenClawMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...recentMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Call AI
    const response = await openClawClient.chatCompletion({
      model: 'openclaw:main',
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    });

    const assistantContent =
      response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    // Save assistant message
    const assistantMessage = await this.threadService.addMessage(threadId, {
      role: 'assistant',
      content: assistantContent,
      source,
    });

    // Auto-title thread if it's still the default
    const thread = await this.threadService.getThread(threadId);
    if (thread && thread.title === 'New Conversation' && thread.message_count <= 2) {
      await this.autoTitle(threadId, content);
    }

    return { user_message: userMessage, assistant_message: assistantMessage };
  }

  private async autoTitle(threadId: string, firstMessage: string): Promise<void> {
    try {
      const title = await openClawClient.complete(
        `Generate a very short title (3-6 words, no quotes) for a conversation that starts with: "${firstMessage.slice(0, 200)}"`,
        'You generate short conversation titles. Respond with ONLY the title, nothing else.',
        { maxTokens: 30, temperature: 0.5 }
      );
      const cleanTitle = title.trim().replace(/^["']|["']$/g, '').slice(0, 60);
      if (cleanTitle) {
        await this.threadService.updateThread(threadId, { title: cleanTitle });
      }
    } catch (err) {
      // Non-critical, just keep default title
      console.error('[ThreadChat] Auto-title failed:', err);
    }
  }
}
