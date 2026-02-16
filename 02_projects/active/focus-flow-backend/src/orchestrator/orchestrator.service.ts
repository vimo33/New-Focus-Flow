/**
 * Orchestrator Service - Central AI brain for Nitara
 *
 * Since OpenClaw doesn't forward tool definitions natively, we use
 * prompt-based tool invocation: tools are described in the system prompt,
 * Claude responds with JSON tool calls, we execute them, and loop.
 */

import { cachedInference } from '../services/cached-inference.service';
import { OpenClawMessage } from '../services/openclaw-client.service';
import { ThreadService } from '../services/thread.service';
import { mem0Service } from '../services/mem0.service';
import { PromptSanitizer } from '../utils/prompt-sanitizer';
import { ORCHESTRATOR_TOOLS } from './tools';
import { executeTool, ToolResult } from './tool-executor';

const threadService = new ThreadService();
const DEFAULT_USER = 'nitara-user';
const MAX_TOOL_ROUNDS = 5;
const CONTEXT_WINDOW = 20;

function buildToolDescriptions(): string {
  return ORCHESTRATOR_TOOLS.map(t => {
    const f = t.function;
    const params = Object.entries(f.parameters.properties)
      .map(([name, schema]: [string, any]) => {
        const req = f.parameters.required?.includes(name) ? ' (required)' : '';
        const enumStr = schema.enum ? ` [${schema.enum.join('|')}]` : '';
        return `    - ${name}: ${schema.type}${enumStr}${req} — ${schema.description || ''}`;
      })
      .join('\n');
    return `  ${f.name}: ${f.description}\n${params || '    (no parameters)'}`;
  }).join('\n\n');
}

const TOOL_DESCRIPTIONS = buildToolDescriptions();

const SYSTEM_PROMPT = `You are Nitara, a productivity AI assistant and central orchestrator.

## Your Tools
You have tools to interact with all Nitara systems. To use a tool, respond with ONLY a JSON block:

\`\`\`tool
{"tool": "tool_name", "input": {param1: "value1"}}
\`\`\`

After I execute the tool, I'll give you the result. Then respond to the user naturally.

You may call ONE tool per response. If you need multiple tools, call them one at a time.

If you don't need a tool, just respond normally with text (no JSON).

## Available Tools

${TOOL_DESCRIPTIONS}

## Behavior
- Be concise and action-oriented. Prefer doing over describing.
- When the user asks to create/do something, USE the tool immediately.
- When listing items, use the appropriate list tool and format results nicely.
- Never fabricate data. Only report what tools return.
- For destructive actions (delete), confirm with the user first.
- Keep responses under 3 sentences unless the user asks for detail.`;

export interface OrchestratorResponse {
  thread_id: string;
  content: string;
  tool_calls?: Array<{
    tool: string;
    input: Record<string, any>;
    result: ToolResult;
  }>;
  navigate_to?: string;
}

export class OrchestratorService {
  async chat(
    content: string,
    threadId?: string,
    source: 'voice' | 'text' = 'text'
  ): Promise<OrchestratorResponse> {
    // 1. Ensure thread exists
    if (!threadId) {
      const thread = await threadService.createThread({
        title: 'Orchestrator Chat',
      });
      threadId = thread.id;
    }

    // 2. Sanitize input & check for injection
    const sanitized = PromptSanitizer.sanitize(content);
    const injection = PromptSanitizer.detectInjection(sanitized);
    if (injection.isSuspicious) {
      console.warn(`[Orchestrator] Prompt injection detected: ${injection.reasons.join(', ')}`);
    }
    const safeContent = PromptSanitizer.wrapUserContent(sanitized);

    // Save user message
    await threadService.addMessage(threadId, {
      role: 'user',
      content: sanitized,
      source,
    });

    // 3. Load conversation history
    const messages = await threadService.getMessages(threadId, CONTEXT_WINDOW);
    const conversationHistory: OpenClawMessage[] = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // 4. Search mem0 for relevant context (project-scoped when available)
    let memoryContext = '';
    try {
      const threadData = await threadService.getThread(threadId);
      const projectId = threadData?.project_id;

      if (projectId) {
        memoryContext = await mem0Service.assembleContext(projectId, content);
      } else if (mem0Service.isAvailable) {
        const memories = await mem0Service.searchMemories(content, { limit: 5 });
        if (memories.length > 0) {
          memoryContext =
            '\n\nRelevant context from your memory:\n' +
            memories.map(m => `- ${m.memory}`).join('\n');
        }
      }
    } catch (e: any) {
      console.error('[Orchestrator] Memory retrieval failed:', e.message);
    }

    // 5. Build messages
    const systemPrompt = SYSTEM_PROMPT + memoryContext;
    const apiMessages: OpenClawMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
    ];

    // 6. Tool execution loop
    const allToolCalls: OrchestratorResponse['tool_calls'] = [];
    let navigateTo: string | undefined;
    let finalContent = '';

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const responseText = await cachedInference.complete(
        apiMessages[apiMessages.length - 1].content,
        systemPrompt,
        'conversation',
        'standard',
        { max_tokens: 2048, temperature: 0.5 }
      );

      // Check if response contains a tool call
      const toolMatch = responseText.match(/```tool\s*\n?([\s\S]*?)\n?```/);

      if (toolMatch) {
        try {
          const toolCall = JSON.parse(toolMatch[1].trim());
          const toolName = toolCall.tool;
          const toolInput = toolCall.input || {};

          console.log(`[Orchestrator] Tool call: ${toolName}`, toolInput);

          const result = await executeTool(toolName, toolInput);

          allToolCalls.push({
            tool: toolName,
            input: toolInput,
            result,
          });

          if (result.navigate_to) {
            navigateTo = result.navigate_to;
          }

          // Add assistant's tool call and the result to conversation
          apiMessages.push({
            role: 'assistant',
            content: responseText,
          });
          apiMessages.push({
            role: 'user',
            content: `[Tool result for ${toolName}]: ${JSON.stringify(result.data || { error: result.error })}\n\nNow respond to the user based on this result. Do NOT use another tool unless necessary.`,
          });

          continue;
        } catch (parseError: any) {
          console.error('[Orchestrator] Failed to parse tool call:', parseError.message);
          finalContent = responseText.replace(/```tool[\s\S]*?```/, '').trim() ||
            'I tried to use a tool but encountered an error. Could you rephrase?';
          break;
        }
      }

      // No tool call — this is the final response. Sanitize output.
      const { sanitized: cleanOutput, leaked } = PromptSanitizer.sanitizeOutput(responseText);
      if (leaked.length > 0) {
        console.warn('[Orchestrator] Sensitive data detected in AI output:', leaked);
      }
      finalContent = cleanOutput;
      break;
    }

    // 7. Save assistant response to thread
    if (finalContent) {
      await threadService.addMessage(threadId, {
        role: 'assistant',
        content: finalContent,
        source,
      });
    }

    // 8. Auto-title thread
    const thread = await threadService.getThread(threadId);
    if (thread && thread.title === 'Orchestrator Chat' && thread.message_count >= 2) {
      const title = content.length > 50 ? content.substring(0, 50) + '...' : content;
      await threadService.updateThread(threadId, { title });
    }

    // 9. Store in mem0 (project-scoped when available)
    try {
      const threadForMemory = await threadService.getThread(threadId);
      const summary = allToolCalls.length > 0
        ? `User: "${content}" → Tools: ${allToolCalls.map(tc => tc.tool).join(', ')}`
        : `User: "${content}"`;

      mem0Service.addMemories(
        [
          { role: 'user', content: content.substring(0, 500) },
          { role: 'assistant', content: (finalContent || summary).substring(0, 500) },
        ],
        { projectId: threadForMemory?.project_id }
      ).catch(err =>
        console.error('[Orchestrator] Failed to store memory:', err.message)
      );
    } catch (err: any) {
      console.error('[Orchestrator] Failed to store memory:', err.message);
    }

    return {
      thread_id: threadId,
      content: finalContent,
      tool_calls: allToolCalls.length > 0 ? allToolCalls : undefined,
      navigate_to: navigateTo,
    };
  }

  async listThreads() {
    return threadService.listThreads();
  }

  async createThread(title?: string) {
    return threadService.createThread({ title: title || 'New Chat' });
  }

  async getThread(threadId: string) {
    const thread = await threadService.getThread(threadId);
    if (!thread) return null;
    const messages = await threadService.getMessages(threadId);
    return { ...thread, messages };
  }
}

export const orchestratorService = new OrchestratorService();
