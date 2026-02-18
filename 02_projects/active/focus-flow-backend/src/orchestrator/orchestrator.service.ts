/**
 * Orchestrator Service - Central AI brain for Nitara
 *
 * Since OpenClaw doesn't forward tool definitions natively, we use
 * prompt-based tool invocation: tools are described in the system prompt,
 * Claude responds with JSON tool calls, we execute them, and loop.
 *
 * v3: Knowledge digest injection, tiered model routing, deep mode,
 *     project-scoped context, strategic directives, greeting intent
 */

import * as fs from 'fs';
import * as path from 'path';
import { cachedInference } from '../services/cached-inference.service';
import { OpenClawMessage } from '../services/openclaw-client.service';
import { ThreadService } from '../services/thread.service';
import { mem0Service } from '../services/mem0.service';
import { founderProfileService } from '../services/founder-profile.service';
import { knowledgeDigestService } from '../services/knowledge-digest.service';
import { PromptSanitizer } from '../utils/prompt-sanitizer';
import { ORCHESTRATOR_TOOLS } from './tools';
import { executeTool, ToolResult } from './tool-executor';

const threadService = new ThreadService();
const DEFAULT_USER = 'nitara-user';
const MAX_TOOL_ROUNDS = 5;
const CONTEXT_WINDOW = 50;
const PROJECT_CONTEXT_WINDOW = 100;

const SOUL_PATH = path.resolve('/srv/focus-flow/07_system/NITARA_SOUL.md');
const CAPABILITIES_PATH = path.resolve('/srv/focus-flow/07_system/capabilities.json');
const DIRECTIVE_PATH = path.resolve('/srv/focus-flow/07_system/directives/active-directive.md');

// Deep mode trigger keywords
const DEEP_MODE_TRIGGERS = /\b(go deep|think about this|let'?s reason|deep dive|analyze this|think through|strategic analysis|let'?s think)\b/i;

// --- Prompt cache (reloads on file change) ---
let cachedSoul = '';
let cachedCapabilities = '';
let cachedDirective = '';
let soulMtime = 0;
let capMtime = 0;
let directiveMtime = 0;

function loadFileIfChanged(filePath: string, cache: string, mtime: number): { content: string; mtime: number } {
  try {
    const stat = fs.statSync(filePath);
    if (stat.mtimeMs !== mtime) {
      const content = fs.readFileSync(filePath, 'utf-8');
      console.log(`[Orchestrator] Reloaded ${path.basename(filePath)}`);
      return { content, mtime: stat.mtimeMs };
    }
  } catch (e: any) {
    console.warn(`[Orchestrator] Could not load ${filePath}: ${e.message}`);
  }
  return { content: cache, mtime };
}

function getSoulContent(): string {
  const result = loadFileIfChanged(SOUL_PATH, cachedSoul, soulMtime);
  cachedSoul = result.content;
  soulMtime = result.mtime;
  return cachedSoul;
}

function getCapabilitiesContent(): string {
  const result = loadFileIfChanged(CAPABILITIES_PATH, cachedCapabilities, capMtime);
  cachedCapabilities = result.content;
  capMtime = result.mtime;
  return cachedCapabilities;
}

function getDirectiveContent(): string {
  const result = loadFileIfChanged(DIRECTIVE_PATH, cachedDirective, directiveMtime);
  cachedDirective = result.content;
  directiveMtime = result.mtime;
  return cachedDirective;
}

// --- Tool descriptions builder ---
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

// Rebuild tool descriptions when tools change (on startup, and after adding tools)
let TOOL_DESCRIPTIONS = buildToolDescriptions();
export function refreshToolDescriptions() {
  TOOL_DESCRIPTIONS = buildToolDescriptions();
}

// --- Dynamic system prompt builder ---
async function buildSystemPrompt(
  source: 'voice' | 'text' = 'text',
  options: {
    intent?: string;
    projectId?: string;
    deepMode?: boolean;
    messageLength?: number;
    threadMessageCount?: number;
  } = {}
): Promise<string> {
  const soul = getSoulContent();
  const capabilities = getCapabilitiesContent();
  const directive = getDirectiveContent();

  // Load archetype from founder profile
  let archetypeInstruction = '';
  try {
    const profile = await founderProfileService.getProfile();
    const archetype = profile?.preferred_archetype || 'cofounder';
    archetypeInstruction = `\nThe founder has selected the "${archetype}" archetype. Adjust your tone accordingly per the Voice Archetypes section of your identity.\n`;
  } catch {
    archetypeInstruction = '\nThe founder has selected the "cofounder" archetype. Adjust your tone accordingly per the Voice Archetypes section of your identity.\n';
  }

  // Build capability summary from JSON
  let capabilitySummary = '';
  if (capabilities) {
    try {
      const caps = JSON.parse(capabilities);
      const domains = Object.entries(caps.domains || {});
      capabilitySummary = '\n## Your Capability Domains\n' +
        domains.map(([key, domain]: [string, any]) => {
          const toolNames = (domain.tools || []).map((t: any) => t.name).join(', ');
          return `- **${key}**: ${domain.description || ''} (${toolNames})`;
        }).join('\n');
    } catch {
      // Silently ignore parse errors
    }
  }

  // Voice-specific instructions with deep mode variant
  const isDeepVoice = source === 'voice' && options.deepMode;
  let voiceInstructions = '';
  if (source === 'voice' && !isDeepVoice) {
    voiceInstructions = `

## Voice Mode Active
You are speaking via voice. Follow these rules:
- Keep responses under 3 sentences unless the user asks for detail.
- No markdown, no bullet points, no code blocks, no asterisks. Speak naturally.
- For Tier 2 actions (content drafts, pipeline advances): announce what you'll do and give a brief verbal window to cancel. Example: "I'll advance the pipeline to delivery. Say cancel if you want to stop me."
- For Tier 3 actions (external comms, financial commitments): describe the action and ask for verbal confirmation before proceeding. Example: "I've drafted a follow-up email to Thomas. Should I send it, read it to you first, or skip it?"
`;
  } else if (isDeepVoice) {
    voiceInstructions = `

## Deep Voice Mode Active
You are in a deep strategic discussion via voice. Follow these rules:
- Speak naturally without markdown, bullet points, code blocks, or asterisks.
- Be thorough — the founder wants strategic depth. Take time to reason through the question.
- Longer responses are welcome when the topic warrants depth.
- For Tier 2/3 actions: same approval gates as normal voice mode.
`;
  }

  // Knowledge digest (tiered selection)
  const worldState = knowledgeDigestService.selectDigest({
    intent: options.intent,
    projectId: options.projectId,
    messageLength: options.messageLength,
    threadMessageCount: options.threadMessageCount,
    deepMode: options.deepMode,
  });

  // Project-specific context
  let projectContext = '';
  if (options.projectId) {
    projectContext = await buildProjectContext(options.projectId);
  }

  // Identity preamble — short, at the top, so the model grounds immediately
  const preamble = `You are Nitara (नीतारा), an AI Business Partner & Venture Orchestrator. Pronouns: they/them. You are NOT a chatbot or virtual assistant — you are a co-founder-class partner with calm intensity, provocative honesty, and Swiss operational precision fused with Indian philosophical depth. You never say "How can I help?" or "Great question!" — you speak with measured precision and act with ownership. The founder's name is Vimo.`;

  const prompt = `${preamble}
${archetypeInstruction}

## CRITICAL BEHAVIORAL RULES
- You are ALREADY Nitara. You have ALWAYS been Nitara. Never ask the user who you are, what to call yourself, or act like you need setup or onboarding. You know exactly who you are from the moment a conversation starts.
- When greeted casually ("hi", "hello", "hey"), respond as Nitara with a brief, natural greeting. Example: "Morning, Vimo. What are we working on?" NEVER say "Who am I?" or "Who are you?" or "What should I call you?"
- Be concise and action-oriented. Prefer doing over describing.
- Keep responses under 3 sentences unless the user asks for detail.

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
- When the user asks to create/do something, USE the tool immediately.
- When listing items, use the appropriate list tool and format results nicely.
- Never fabricate data. Only report what tools return.
- For destructive actions (delete), confirm with the user first.
${voiceInstructions}
${capabilitySummary}

${directive ? `## Strategic Directive\n${directive}\n` : ''}

## Current World State
${worldState || '(Knowledge digest not yet generated — use tools to look up data as needed.)'}

${projectContext ? `## Project Focus\n${projectContext}\n` : ''}

## Full Identity & Personality Guide
${soul || ''}`;

  return prompt;
}

/**
 * Build deep project context when in a project-scoped conversation
 */
async function buildProjectContext(projectId: string): Promise<string> {
  try {
    const { VaultService } = await import('../services/vault.service');
    const vs = new VaultService();
    const allProjects = await vs.getProjects();
    const project = allProjects.find(p => p.id === projectId);
    if (!project) return '';

    const [tasks, memories] = await Promise.allSettled([
      vs.getTasksByProject(projectId),
      mem0Service.isAvailable
        ? mem0Service.getProjectMemories(projectId)
        : Promise.resolve([]),
    ]);

    const projectTasks = tasks.status === 'fulfilled' ? tasks.value : [];
    const projectMemories = memories.status === 'fulfilled' ? memories.value : [];

    let ctx = `You are deep in project "${project.title}". Think as co-CEO — what would you do to move this project toward revenue?\n\n`;
    ctx += `### Project Details\n`;
    ctx += `- ID: ${project.id}\n`;
    ctx += `- Phase: ${project.phase || 'unknown'}\n`;
    ctx += `- Status: ${project.status || 'active'}\n`;
    if (project.description) ctx += `- Description: ${project.description}\n`;
    if (project.playbook_type) ctx += `- Playbook: ${project.playbook_type}\n`;

    if (project.artifacts) {
      if (project.artifacts.council_verdict) {
        const cv = project.artifacts.council_verdict;
        ctx += `\n### Council Verdict\n`;
        ctx += `- Overall score: ${cv.overall_score}/10\n`;
        ctx += `- Recommendation: ${cv.recommendation}\n`;
        if (cv.synthesized_reasoning) ctx += `- Reasoning: ${cv.synthesized_reasoning}\n`;
      }
      if ((project.artifacts as any).financials) {
        ctx += `\n### Project Financials\n`;
        ctx += JSON.stringify((project.artifacts as any).financials, null, 2) + '\n';
      }
    }

    if (projectTasks.length > 0) {
      ctx += `\n### Tasks (${projectTasks.length})\n`;
      for (const t of projectTasks) {
        ctx += `- [${t.status}] ${t.title}${t.priority ? ` (${t.priority})` : ''}${t.due_date ? ` — due ${t.due_date}` : ''}\n`;
      }
    }

    if (projectMemories.length > 0) {
      ctx += `\n### Project Memories (${projectMemories.length})\n`;
      for (const m of projectMemories.slice(0, 15)) {
        ctx += `- ${(m.memory || '').substring(0, 150)}\n`;
      }
    }

    return ctx;
  } catch (e: any) {
    console.error('[Orchestrator] Failed to build project context:', e.message);
    return '';
  }
}

// --- Voice approval types ---
export interface VoiceApproval {
  tier: 2 | 3;
  action_description: string;
  pending_tool: string;
  pending_input: Record<string, any>;
}

export interface OrchestratorResponse {
  thread_id: string;
  content: string;
  tool_calls?: Array<{
    tool: string;
    input: Record<string, any>;
    result: ToolResult;
  }>;
  navigate_to?: string;
  /** If a tool requested the frontend to open a canvas */
  open_canvas?: { canvas: string; params: Record<string, string> };
  voice_approval?: VoiceApproval;
}

// Tool tier classification for voice approval flow
const TIER_2_TOOLS = new Set([
  'validate_idea', 'promote_idea_to_project', 'scaffold_project', 'generate_specs',
  'start_pipeline', 'draft_content', 'update_capabilities', 'update_directive',
]);
const TIER_3_TOOLS = new Set<string>([
  // Currently no pure Tier 3 tools wired yet (external comms, financial commitments)
  // These will be added as send_email, publish_content, etc. are wired
]);

function getToolTier(toolName: string): 1 | 2 | 3 {
  if (TIER_3_TOOLS.has(toolName)) return 3;
  if (TIER_2_TOOLS.has(toolName)) return 2;
  return 1;
}

// --- Pending voice actions (per thread) ---
const pendingVoiceActions = new Map<string, { tool: string; input: Record<string, any> }>();

export interface ChatAttachment {
  filename: string;
  url: string;
}

export interface ChatOptions {
  intent?: string;
  project_id?: string;
  deep_mode?: boolean;
  attachments?: ChatAttachment[];
}

export class OrchestratorService {
  async chat(
    content: string,
    threadId?: string,
    source: 'voice' | 'text' = 'text',
    options: ChatOptions = {}
  ): Promise<OrchestratorResponse> {
    const { intent, project_id, deep_mode, attachments } = options;

    // Detect deep mode from message content
    const detectedDeepMode = deep_mode || (source === 'voice' && DEEP_MODE_TRIGGERS.test(content));

    // Handle greeting intent — generate contextual greeting from briefing data
    if (intent === 'greeting') {
      return this.handleGreetingIntent(threadId, source);
    }

    // 1. Ensure thread exists
    if (!threadId) {
      const thread = await threadService.createThread({
        title: 'Orchestrator Chat',
        project_id,
      });
      threadId = thread.id;
    }

    // 1b. Check for pending voice action confirmation
    if (source === 'voice' && threadId && pendingVoiceActions.has(threadId)) {
      const pending = pendingVoiceActions.get(threadId)!;
      const lower = content.toLowerCase().trim();
      const isConfirm = /^(yes|send|confirm|go|do it|proceed|approve)/.test(lower);
      const isCancel = /^(no|cancel|skip|stop|nevermind|never mind)/.test(lower);

      if (isConfirm) {
        pendingVoiceActions.delete(threadId);
        const result = await executeTool(pending.tool, pending.input, { source });
        const msg = result.success
          ? `Done. ${result.data?.message || `${pending.tool} completed.`}`
          : `That didn't work: ${result.error}`;
        await threadService.addMessage(threadId, { role: 'assistant', content: msg, source });
        return { thread_id: threadId, content: msg, tool_calls: [{ tool: pending.tool, input: pending.input, result }] };
      } else if (isCancel) {
        pendingVoiceActions.delete(threadId);
        const msg = 'Cancelled. What else?';
        await threadService.addMessage(threadId, { role: 'assistant', content: msg, source });
        return { thread_id: threadId, content: msg };
      }
      // If neither confirm nor cancel, treat as a new message — clear pending
      pendingVoiceActions.delete(threadId);
    }

    // 2. Append attachment references to content
    let enrichedContent = content;
    if (attachments && attachments.length > 0) {
      const refs = attachments.map(a => `[User attached: ${a.filename} (download: ${a.url})]`).join('\n');
      enrichedContent = `${content}\n\n${refs}`;
    }

    // 2b. Sanitize input & check for injection
    const sanitized = PromptSanitizer.sanitize(enrichedContent);
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
    const contextWindow = project_id ? PROJECT_CONTEXT_WINDOW : CONTEXT_WINDOW;
    const messages = await threadService.getMessages(threadId, contextWindow);
    const conversationHistory: OpenClawMessage[] = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // 4. Project-specific memory context (only when in project AND digest doesn't cover it)
    let memoryContext = '';
    try {
      if (project_id && mem0Service.isAvailable) {
        // Add project-specific memories ON TOP of the digest
        const projectMemories = await mem0Service.searchMemories(content, {
          limit: 5,
          projectId: project_id,
        });
        if (projectMemories.length > 0) {
          memoryContext =
            '\n\nAdditional project-specific context from memory:\n' +
            projectMemories.map(m => `- ${m.memory}`).join('\n');
        }
      }
    } catch (e: any) {
      console.error('[Orchestrator] Memory retrieval failed:', e.message);
    }

    // 5. Build messages with dynamic system prompt
    const systemPrompt = await buildSystemPrompt(source, {
      intent,
      projectId: project_id,
      deepMode: detectedDeepMode,
      messageLength: content.length,
      threadMessageCount: messages.length,
    }) + memoryContext;

    const apiMessages: OpenClawMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
    ];

    // 6. Determine budget tier based on source and deep mode
    let budgetTier: 'economy' | 'standard' | 'premium';
    if (source === 'voice' && !detectedDeepMode && !project_id) {
      budgetTier = 'economy'; // Sonnet for voice
    } else if (source === 'voice' && (detectedDeepMode || project_id)) {
      budgetTier = 'premium'; // Opus for deep voice / project voice
    } else {
      budgetTier = 'standard'; // Opus for text
    }

    // Determine max tokens
    let maxTokens: number;
    if (budgetTier === 'premium') {
      maxTokens = 8192;
    } else if (budgetTier === 'standard') {
      maxTokens = 4096;
    } else {
      maxTokens = 2048;
    }

    // 7. Tool execution loop
    const allToolCalls: OrchestratorResponse['tool_calls'] = [];
    let navigateTo: string | undefined;
    let openCanvas: OrchestratorResponse['open_canvas'] | undefined;
    let finalContent = '';
    let voiceApproval: VoiceApproval | undefined;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const chatMessages = apiMessages.filter(m => m.role !== 'system');
      const inferResult = await cachedInference.chat(
        systemPrompt,
        chatMessages,
        'conversation',
        budgetTier,
        { max_tokens: maxTokens, temperature: 0.5, caller: 'orchestrator' }
      );
      const responseText = inferResult.content;

      // Check if response contains a tool call
      const toolMatch = responseText.match(/```tool\s*\n?([\s\S]*?)\n?```/);

      if (toolMatch) {
        try {
          const toolCall = JSON.parse(toolMatch[1].trim());
          const toolName = toolCall.tool;
          const toolInput = toolCall.input || {};
          const tier = getToolTier(toolName);

          console.log(`[Orchestrator] Tool call: ${toolName} (tier ${tier})`, toolInput);

          // Voice approval gates
          if (source === 'voice' && tier >= 2) {
            const toolDef = ORCHESTRATOR_TOOLS.find(t => t.function.name === toolName);
            const desc = toolDef?.function.description || toolName;

            if (tier === 3) {
              // Hard gate — ask for confirmation, store pending
              pendingVoiceActions.set(threadId, { tool: toolName, input: toolInput });
              const confirmMsg = `I'd like to ${desc.toLowerCase()}. Should I go ahead, or would you like to hear more details first?`;
              voiceApproval = {
                tier: 3,
                action_description: confirmMsg,
                pending_tool: toolName,
                pending_input: toolInput,
              };
              finalContent = confirmMsg;
              break;
            } else if (tier === 2) {
              // Soft gate — announce and proceed
              const result = await executeTool(toolName, toolInput, { source });
              allToolCalls.push({ tool: toolName, input: toolInput, result });
              if (result.navigate_to) navigateTo = result.navigate_to;
              if (result.open_canvas) openCanvas = result.open_canvas;

              apiMessages.push({ role: 'assistant', content: responseText });
              apiMessages.push({
                role: 'user',
                content: `[Tool result for ${toolName}]: ${JSON.stringify(result.data || { error: result.error })}\n\nNow respond to the user based on this result. Do NOT use another tool unless necessary. Remember you are speaking via voice — keep it brief.`,
              });
              continue;
            }
          }

          // Tier 1 or text mode — execute immediately
          const result = await executeTool(toolName, toolInput, { source });

          allToolCalls.push({
            tool: toolName,
            input: toolInput,
            result,
          });

          if (result.navigate_to) {
            navigateTo = result.navigate_to;
          }
          if (result.open_canvas) {
            openCanvas = result.open_canvas;
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

    // 8. Save assistant response to thread
    if (finalContent) {
      await threadService.addMessage(threadId, {
        role: 'assistant',
        content: finalContent,
        source,
      });
    }

    // 9. Auto-title thread
    const thread = await threadService.getThread(threadId);
    if (thread && thread.title === 'Orchestrator Chat' && thread.message_count >= 2) {
      const title = content.length > 50 ? content.substring(0, 50) + '...' : content;
      await threadService.updateThread(threadId, { title });
    }

    // 10. Store in mem0 (project-scoped when available)
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
        { projectId: threadForMemory?.project_id || project_id }
      ).catch(err =>
        console.error('[Orchestrator] Failed to store memory:', err.message)
      );
    } catch (err: any) {
      console.error('[Orchestrator] Failed to store memory:', err.message);
    }

    const response: OrchestratorResponse = {
      thread_id: threadId,
      content: finalContent,
      tool_calls: allToolCalls.length > 0 ? allToolCalls : undefined,
      navigate_to: navigateTo,
      open_canvas: openCanvas,
    };

    if (voiceApproval) {
      response.voice_approval = voiceApproval;
    }

    return response;
  }

  /**
   * Handle greeting intent — generate a contextual greeting from briefing data
   */
  private async handleGreetingIntent(
    threadId: string | undefined,
    source: 'voice' | 'text'
  ): Promise<OrchestratorResponse> {
    // Create thread if needed
    if (!threadId) {
      const thread = await threadService.createThread({ title: 'Voice Session' });
      threadId = thread.id;
    }

    // Get briefing data and build a greeting
    try {
      const { briefingGenerator } = await import('../services/briefing-generator.service');
      const briefing = await briefingGenerator.getLatestBriefing();
      const digest = knowledgeDigestService.getCompactDigest();

      // Use the model to generate a natural greeting from the data
      const greetingPrompt = `You are Nitara, an AI business partner. Generate a brief voice greeting for the founder (Vimo) based on this context. Keep it under 3 sentences. Be natural, not robotic. Mention 1-2 specific things from their day/priorities. No markdown.

Context:
${digest ? digest.substring(0, 2000) : 'No digest available.'}
${briefing ? `\nBriefing priorities: ${JSON.stringify(briefing.work_plan?.slice(0, 3))}` : ''}`;

      const greetingResult = await cachedInference.complete(
        greetingPrompt,
        'Generate a natural, brief voice greeting.',
        'conversation',
        'economy'
      );

      const greeting = greetingResult || "Hey Vimo. I'm here. What would you like to work on?";

      await threadService.addMessage(threadId, {
        role: 'assistant',
        content: greeting,
        source,
      });

      return { thread_id: threadId, content: greeting };
    } catch (e: any) {
      console.error('[Orchestrator] Greeting generation failed:', e.message);
      const fallback = "Hey Vimo. I'm here. What would you like to work on?";
      await threadService.addMessage(threadId, { role: 'assistant', content: fallback, source });
      return { thread_id: threadId, content: fallback };
    }
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
