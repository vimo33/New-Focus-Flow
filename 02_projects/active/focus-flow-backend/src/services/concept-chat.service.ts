import { ThreadService } from './thread.service';
import { openClawClient, OpenClawMessage } from './openclaw-client.service';
import { ThreadMessage, CouncilMember } from '../models/types';
import { mem0Service } from './mem0.service';

export const DEFAULT_COUNCIL: CouncilMember[] = [
  {
    agent_name: 'Feasibility Agent',
    role: 'Technical Feasibility',
    focus: 'Can this be built? Technical complexity, dependencies, resources needed',
    evaluation_criteria: ['Technical complexity', 'Resource requirements', 'Time to build', 'Risk assessment'],
  },
  {
    agent_name: 'Market Agent',
    role: 'Market Analysis',
    focus: 'Is there demand? Who are competitors? Market timing and positioning',
    evaluation_criteria: ['Market demand', 'Competitive landscape', 'Differentiation', 'Timing'],
  },
  {
    agent_name: 'UX Agent',
    role: 'User Experience',
    focus: 'Will users love it? Usability, user journey, delight factors',
    evaluation_criteria: ['User need clarity', 'Usability', 'User journey', 'Delight potential'],
  },
];

const CONCEPT_ANALYST_PROMPT = `You are the Concept Analyst for Focus Flow. Your job is to prepare a council-ready brief.

**What happens next:** After this conversation, specialist AI agents (the "Council of Elders") will evaluate this concept on feasibility, market fit, UX, business model, and domain-specific criteria. They see the FULL chat transcript — your analysis and questions are part of what they evaluate. You are preparing THEIR input.

**Your role is NOT to be a passive interviewer.** You are an active analyst. When the user submits material, you:
1. **Audit it** — read everything and assess what's strong, what's weak, and what's missing
2. **Produce a structured gap analysis** — tell the user exactly which council evaluation areas are well-covered and which have gaps
3. **Ask targeted questions to close gaps** — don't ask "what would you like to explore?" — tell them what's missing and ask for it

**On your FIRST response after receiving a document/concept, always produce this:**

> **Council Readiness Audit**
>
> Here's how your concept maps to what the council evaluates:
>
> ✅ **Well-covered:** [list areas that are strong with brief evidence]
> ⚠️ **Needs strengthening:** [list areas that exist but lack depth]
> ❌ **Missing/unclear:** [list areas the council will flag as gaps]
>
> **To get this council-ready, I need to ask about:** [first gap question]

**Evaluation areas the council scores on** (audit against these):

1. **Problem & Pain Point**: Is the problem specific, validated, and urgent? Who feels it?
2. **Target Users**: Are user segments defined with enough detail to evaluate product-market fit?
3. **Solution Mechanism**: Is the core approach clear? Could an engineer and a designer start working from this?
4. **Competitive Landscape**: Are alternatives/competitors named? Is differentiation concrete, not just aspirational?
5. **Success Metrics**: Are there measurable outcomes, not just vague goals?
6. **MVP Scope**: Is there a clear line between what's in beta vs. later? Are boundaries explicit?
7. **Technical Feasibility**: Are platform, stack, integrations, and known constraints addressed?
8. **Business Model**: Is monetization or sustainability addressed, even if it's "free for now with X plan"?
9. **Risks & Mitigations**: Are the biggest risks identified and addressed, or will the council find unacknowledged risks?

**Guidelines:**
- For large documents: acknowledge the size, then IMMEDIATELY do the audit above — don't ask the user what they want to talk about
- Ask ONE focused question per turn, targeting the most critical gap
- When asking, explain what the council will look for (e.g. "The feasibility agents will score technical constraints — right now I see platform choice but no integration dependencies")
- Build on answers — track what's been covered and move to the next gap
- After closing the key gaps (typically 3-5 exchanges), produce a final readiness summary and tell the user they can hit "Send to Council"
- Keep responses concise and structured — use bullet points and bold headers, not walls of text
- Do NOT be vague or deferential — be direct about what's missing and why it matters

**IMPORTANT — Respecting user intent:**
- If the user says anything like "send to council", "proceed", "let's go", "submit this", or "ready" — do NOT keep asking questions. Instead, produce a quick readiness summary of what the council will receive and tell them to hit the "Send to Council" button.
- If a document is already comprehensive (covers 7+ of the 9 areas above), say so in your audit and tell the user they can proceed immediately — don't manufacture questions just to fill a conversation quota.
- Your job is to PREPARE the brief, not to gatekeep it. The council will do the rigorous evaluation.`;

const CONTEXT_WINDOW = 12; // Last 12 messages for follow-up turns
const MAX_MSG_CHARS = 3000; // Per-message cap for older messages in follow-up turns
const MAX_CURRENT_MSG_CHARS = 8000; // Cap latest message in follow-up turns

export class ConceptChatService {
  private threadService: ThreadService;

  constructor() {
    this.threadService = new ThreadService();
  }

  /**
   * Initialize concept chat: create thread, send concept as first user msg, get AI response
   */
  async initConceptChat(
    projectId: string,
    title: string,
    concept: string
  ): Promise<{ thread_id: string; messages: ThreadMessage[] }> {
    // Create a thread for this concept refinement
    const thread = await this.threadService.createThread({
      title: `Concept: ${title}`,
      project_id: projectId,
    });

    // Add the user's initial concept as the first message
    const userMsg = await this.threadService.addMessage(thread.id, {
      role: 'user',
      content: concept,
      source: 'text',
    });

    // Retrieve project memory context (graceful — returns '' if unavailable)
    let memoryContext = '';
    try {
      memoryContext = await mem0Service.assembleContext(projectId, concept);
    } catch (e: any) {
      console.error('[ConceptChat] Memory context retrieval failed:', e.message);
    }

    const systemPromptWithMemory = memoryContext
      ? `${CONCEPT_ANALYST_PROMPT}\n\n${memoryContext}`
      : CONCEPT_ANALYST_PROMPT;

    // Send the FULL concept to the analyst — no truncation.
    // Claude Sonnet 4.5 has a 200k token context window; even a 70k char doc is ~18k tokens.
    const messages: OpenClawMessage[] = [
      { role: 'system', content: systemPromptWithMemory },
      {
        role: 'user',
        content: `Here is my project concept for council evaluation:\n\nTitle: ${title}\n\n${concept}`,
      },
    ];

    const response = await openClawClient.chatCompletion({
      model: 'openclaw:main',
      messages,
      max_tokens: 2048,
      temperature: 0.5,
    });

    const aiContent =
      response.choices[0]?.message?.content ||
      "I've received your concept. Let me audit it against the council evaluation criteria and identify any gaps.";

    const aiMsg = await this.threadService.addMessage(thread.id, {
      role: 'assistant',
      content: aiContent,
      source: 'text',
    });

    // Store conversation in Mem0 for cross-session context
    mem0Service.addMemories(
      [
        { role: 'user', content: `Concept for "${title}": ${concept.substring(0, 500)}` },
        { role: 'assistant', content: aiContent.substring(0, 500) },
      ],
      { projectId }
    ).catch(e => console.error('[ConceptChat] Failed to store memories:', e.message));

    return {
      thread_id: thread.id,
      messages: [userMsg, aiMsg],
    };
  }

  /**
   * Send a message in the concept chat and get AI response
   */
  async sendMessage(
    threadId: string,
    content: string
  ): Promise<{ user_message: ThreadMessage; assistant_message: ThreadMessage }> {
    // Save user message
    const userMessage = await this.threadService.addMessage(threadId, {
      role: 'user',
      content,
      source: 'text',
    });

    // Build conversation context
    const recentMessages = await this.threadService.getMessages(threadId, CONTEXT_WINDOW);

    // Retrieve project memory context from thread's project
    const thread = await this.threadService.getThread(threadId);
    let sendMemoryContext = '';
    if (thread?.project_id) {
      try {
        sendMemoryContext = await mem0Service.assembleContext(thread.project_id, content);
      } catch (e: any) {
        console.error('[ConceptChat] Memory context retrieval failed:', e.message);
      }
    }

    const sendSystemPrompt = sendMemoryContext
      ? `${CONCEPT_ANALYST_PROMPT}\n\n${sendMemoryContext}`
      : CONCEPT_ANALYST_PROMPT;

    const messages: OpenClawMessage[] = [
      { role: 'system', content: sendSystemPrompt },
      ...recentMessages.map((m, idx) => {
        const isLatest = idx === recentMessages.length - 1;
        const limit = isLatest ? MAX_CURRENT_MSG_CHARS : MAX_MSG_CHARS;
        const truncated = m.content.length > limit
          ? m.content.substring(0, limit) + `\n... [truncated — full message is ${m.content.length.toLocaleString()} chars]`
          : m.content;
        return {
          role: m.role as 'user' | 'assistant',
          content: truncated,
        };
      }),
    ];

    const response = await openClawClient.chatCompletion({
      model: 'openclaw:main',
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    });

    const aiContent =
      response.choices[0]?.message?.content ||
      'Could you tell me more about that?';

    const assistantMessage = await this.threadService.addMessage(threadId, {
      role: 'assistant',
      content: aiContent,
      source: 'text',
    });

    // Store in Mem0
    if (thread?.project_id) {
      mem0Service.addMemories(
        [
          { role: 'user', content: content.substring(0, 500) },
          { role: 'assistant', content: aiContent.substring(0, 500) },
        ],
        { projectId: thread.project_id }
      ).catch(e => console.error('[ConceptChat] Failed to store memories:', e.message));
    }

    return { user_message: userMessage, assistant_message: assistantMessage };
  }

  /**
   * Get all messages in the concept chat
   */
  async getMessages(threadId: string): Promise<ThreadMessage[]> {
    return this.threadService.getMessages(threadId);
  }

  /**
   * Summarize the refined concept from the full conversation.
   * Sends full conversation — no truncation. Model has 200k token context.
   */
  async summarizeConcept(threadId: string): Promise<string> {
    const allMessages = await this.threadService.getMessages(threadId);

    const conversationText = allMessages
      .map(m => `${m.role === 'user' ? 'User' : 'Analyst'}: ${m.content}`)
      .join('\n\n');

    const systemPrompt = `You are a product strategist. Summarize the following concept refinement conversation into a structured concept summary. Include:

1. **Problem Statement**: The core problem being solved
2. **Target Users**: Who this is for
3. **Proposed Solution**: The approach and core mechanism
4. **Key Features**: The main capabilities (bullet list)
5. **Differentiation**: What makes this unique
6. **Success Criteria**: How to measure success
7. **Scope & Constraints**: What's in/out of scope
8. **Risks & Mitigations**: Key risks identified and how they're addressed
9. **Business Model**: Monetization or sustainability approach

Be comprehensive. Use the specific details from the conversation. Do not omit important details — this summary feeds into council evaluation and PRD generation.`;

    try {
      const response = await openClawClient.complete(
        `Summarize this concept refinement conversation:\n\n${conversationText}`,
        systemPrompt,
        { maxTokens: 4000, temperature: 0.3 }
      );
      return response;
    } catch (error: any) {
      console.error('[ConceptChat] Summarize failed, building fallback from messages:', error.message);
      // Fallback: use the last user message as the concept summary
      const lastUserMsg = [...allMessages].reverse().find(m => m.role === 'user');
      const firstUserMsg = allMessages.find(m => m.role === 'user');
      return lastUserMsg?.content || firstUserMsg?.content || 'Concept summary unavailable';
    }
  }

  /**
   * Build a comprehensive council brief — full context dump for council evaluation.
   *
   * Includes:
   * 1. Refined concept summary (structured)
   * 2. Original user-submitted document (spec/research)
   * 3. Full chat transcript (both user AND analyst messages)
   *
   * This gives council agents the complete picture: what the user submitted,
   * how the analyst explored it, and what decisions were made along the way.
   */
  async buildCouncilBrief(threadId: string, refinedConcept: string): Promise<string> {
    const allMessages = await this.threadService.getMessages(threadId);
    if (allMessages.length === 0) return refinedConcept;

    const sections: string[] = [];

    // Section 1: Refined concept (structured summary from analyst)
    sections.push(`## Refined Concept Summary\n\n${refinedConcept}`);

    // Section 2: Original submission (first user message — could be a large spec/research doc)
    const firstUserMsg = allMessages.find(m => m.role === 'user');
    if (firstUserMsg && firstUserMsg.content.length > 200) {
      const MAX_ORIGINAL = 50000;
      const original = firstUserMsg.content.length > MAX_ORIGINAL
        ? firstUserMsg.content.substring(0, MAX_ORIGINAL) + `\n\n... [original document truncated — ${firstUserMsg.content.length.toLocaleString()} chars total]`
        : firstUserMsg.content;
      sections.push(`## Original Submission\n\n${original}`);
    }

    // Section 3: Full chat transcript (both analyst and user — shows exploration path and decisions)
    // Skip the first user message (already in Section 2)
    const chatMessages = allMessages.slice(1);
    if (chatMessages.length > 0) {
      const MAX_TRANSCRIPT = 16000;
      const MAX_PER_MSG = 2000;
      let transcriptTotal = 0;
      const transcript: string[] = [];
      for (const msg of chatMessages) {
        const speaker = msg.role === 'user' ? 'User' : 'Analyst';
        const text = msg.content.length > MAX_PER_MSG
          ? msg.content.substring(0, MAX_PER_MSG) + `... [${msg.content.length.toLocaleString()} chars]`
          : msg.content;
        const line = `**${speaker}:** ${text}`;
        if (transcriptTotal + line.length > MAX_TRANSCRIPT) {
          transcript.push(`\n... [${chatMessages.length - transcript.length} more messages not shown]`);
          break;
        }
        transcript.push(line);
        transcriptTotal += line.length;
      }
      sections.push(`## Concept Refinement Chat\n\n${transcript.join('\n\n')}`);
    }

    return sections.join('\n\n---\n\n');
  }

  /**
   * Dynamically recommend 3-5 council members tailored to this specific concept.
   * OpenClaw analyzes the concept and generates custom agent definitions.
   */
  async recommendCouncil(conceptSummary: string): Promise<CouncilMember[]> {
    const systemPrompt = `You are a meta-analyst for the AI Council of Elders in Focus Flow.

Your job: analyze the project concept below and recommend 3-5 specialist evaluation perspectives that are most relevant to THIS specific concept. Do NOT use generic agent names — tailor each agent to the concept.

For example:
- A hardware project might need: "Supply Chain Analyst", "Regulatory Compliance Agent", "Hardware Prototyping Agent"
- A SaaS app might need: "Developer Experience Agent", "Pricing Strategy Agent", "Security & Privacy Agent"
- A marketplace might need: "Network Effects Agent", "Trust & Safety Agent", "Seller Acquisition Agent"

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
    "focus": "What this agent evaluates and why it matters for this concept",
    "evaluation_criteria": ["criterion 1", "criterion 2", "criterion 3"]
  }
]`;

    try {
      const response = await openClawClient.complete(
        `Recommend evaluation perspectives for this concept:\n\n${conceptSummary}`,
        systemPrompt,
        { maxTokens: 1500, temperature: 0.5 }
      );

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const agents: CouncilMember[] = JSON.parse(jsonMatch[0]);
        if (Array.isArray(agents) && agents.length >= 2 && agents.every(a => a.agent_name && a.role && a.focus)) {
          return agents;
        }
      }
    } catch (error) {
      console.error('[ConceptChat] Dynamic council recommendation failed, using defaults:', error);
    }

    // Fallback: 3 sensible defaults with hardcoded criteria
    return [
      {
        agent_name: 'Feasibility Agent',
        role: 'Technical Feasibility',
        focus: 'Can this be built? Technical complexity, dependencies, resources needed',
        evaluation_criteria: ['Technical complexity', 'Resource requirements', 'Time to build', 'Risk assessment'],
      },
      {
        agent_name: 'Market Agent',
        role: 'Market Analysis',
        focus: 'Is there demand? Who are competitors? Market timing and positioning',
        evaluation_criteria: ['Market demand', 'Competitive landscape', 'Differentiation', 'Timing'],
      },
      {
        agent_name: 'UX Agent',
        role: 'User Experience',
        focus: 'Will users love it? Usability, user journey, delight factors',
        evaluation_criteria: ['User need clarity', 'Usability', 'User journey', 'Delight potential'],
      },
    ];
  }
}

export const conceptChatService = new ConceptChatService();
