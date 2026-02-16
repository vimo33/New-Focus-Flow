import crypto from 'crypto';
import { openClawClient, OpenClawMessage, OpenClawResponse } from './openclaw-client.service';
import { modelRouter, TaskType, BudgetTier } from './model-router.service';
import { inferenceLogger, InferenceLogEntry, estimateCost } from './inference-logger.service';
import { mem0Service } from './mem0.service';

export interface InferenceRequest {
  task_type: TaskType;
  budget_tier: BudgetTier;
  system_prompt: string;
  messages: OpenClawMessage[];
  project_id?: string;
  tools?: Array<any>;
  max_tokens?: number;
  temperature?: number;
  model?: string;
  _internal?: boolean;
  caller?: string;
}

export interface InferenceResult {
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cached: boolean;
  latency_ms: number;
  tool_calls?: OpenClawResponse['choices'][0]['message']['tool_calls'];
}

interface CacheEntry<T> {
  value: T;
  expires: number;
}

const RESPONSE_CACHE_TTL_MS = 30_000;
const CONTEXT_CACHE_TTL_MS = 60_000;
const CLEANUP_INTERVAL_MS = 60_000;

class CachedInferenceClient {
  private responseCache = new Map<string, CacheEntry<InferenceResult>>();
  private contextCache = new Map<string, CacheEntry<string>>();
  private totalRequests = 0;
  private cacheHits = 0;
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  async infer(request: InferenceRequest): Promise<InferenceResult> {
    this.totalRequests++;
    const startTime = Date.now();

    // Resolve model via router (unless explicitly overridden)
    const route = modelRouter.resolve(request.task_type, request.budget_tier);
    const model = request.model || route.model;
    const max_tokens = request.max_tokens ?? route.max_tokens;
    const temperature = request.temperature ?? route.temperature;

    // Build messages array with system prompt
    const messages: OpenClawMessage[] = [
      { role: 'system', content: request.system_prompt },
      ...request.messages,
    ];

    // Inject Mem0 context if project_id provided
    if (request.project_id) {
      const contextContent = await this.getContextCached(request.project_id, request.messages);
      if (contextContent) {
        // Append memory context to system prompt
        messages[0] = {
          role: 'system',
          content: `${request.system_prompt}\n\n${contextContent}`,
        };
      }
    }

    // If tools present, skip response cache (tool calls are non-deterministic)
    if (request.tools && request.tools.length > 0) {
      try {
        const result = await this.callWithTools(model, messages, max_tokens, temperature, request.tools, request._internal);
        const latency_ms = Date.now() - startTime;
        this.logRequest(request, model, result, latency_ms, false, true);
        return { ...result, latency_ms, cached: false };
      } catch (err: any) {
        const latency_ms = Date.now() - startTime;
        const failResult: InferenceResult = { content: '', model, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, cached: false, latency_ms };
        this.logRequest(request, model, failResult, latency_ms, false, false, err.message);
        throw err;
      }
    }

    // Check response cache
    const cacheKey = this.hashRequest(model, messages, temperature, max_tokens);
    const cached = this.responseCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      this.cacheHits++;
      const latency_ms = Date.now() - startTime;
      this.logRequest(request, model, cached.value, latency_ms, true, true);
      return { ...cached.value, latency_ms, cached: true };
    }

    // Call OpenClaw
    try {
      const result = await this.callOpenClaw(model, messages, max_tokens, temperature, request._internal);
      const latency_ms = Date.now() - startTime;

      // Store in cache
      this.responseCache.set(cacheKey, {
        value: result,
        expires: Date.now() + RESPONSE_CACHE_TTL_MS,
      });

      this.logRequest(request, model, result, latency_ms, false, true);
      return { ...result, latency_ms, cached: false };
    } catch (err: any) {
      const latency_ms = Date.now() - startTime;
      const failResult: InferenceResult = { content: '', model, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, cached: false, latency_ms };
      this.logRequest(request, model, failResult, latency_ms, false, false, err.message);
      throw err;
    }
  }

  /**
   * Simple text completion — convenience wrapper matching openClawClient.complete() signature.
   */
  async complete(
    prompt: string,
    systemPrompt: string,
    taskType: TaskType,
    budgetTier: BudgetTier,
    options?: { max_tokens?: number; temperature?: number; model?: string; project_id?: string; caller?: string }
  ): Promise<string> {
    const result = await this.infer({
      task_type: taskType,
      budget_tier: budgetTier,
      system_prompt: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.max_tokens,
      temperature: options?.temperature,
      model: options?.model,
      project_id: options?.project_id,
      caller: options?.caller,
      _internal: true,
    });
    return result.content;
  }

  /**
   * Chat completion — convenience wrapper for multi-message conversations.
   */
  async chat(
    systemPrompt: string,
    messages: OpenClawMessage[],
    taskType: TaskType,
    budgetTier: BudgetTier,
    options?: { max_tokens?: number; temperature?: number; model?: string; project_id?: string; _internal?: boolean; caller?: string }
  ): Promise<InferenceResult> {
    return this.infer({
      task_type: taskType,
      budget_tier: budgetTier,
      system_prompt: systemPrompt,
      messages,
      max_tokens: options?.max_tokens,
      temperature: options?.temperature,
      model: options?.model,
      project_id: options?.project_id,
      _internal: options?._internal,
      caller: options?.caller,
    });
  }

  /**
   * Completion with web search tools — convenience wrapper for research-enabled calls.
   */
  async completeWithResearch(
    prompt: string,
    systemPrompt: string,
    taskType: TaskType,
    budgetTier: BudgetTier,
    options?: { max_tokens?: number; temperature?: number; model?: string; project_id?: string; caller?: string }
  ): Promise<string> {
    const result = await this.infer({
      task_type: taskType,
      budget_tier: budgetTier,
      system_prompt: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      tools: [
        { type: 'web_search_20250305' as any, name: 'web_search', max_uses: 5 } as any,
      ],
      max_tokens: options?.max_tokens,
      temperature: options?.temperature,
      model: options?.model,
      project_id: options?.project_id,
      caller: options?.caller,
      _internal: true,
    });
    return result.content;
  }

  getStats(): {
    total_requests: number;
    cache_hits: number;
    cache_hit_rate: number;
    response_cache_size: number;
    context_cache_size: number;
  } {
    return {
      total_requests: this.totalRequests,
      cache_hits: this.cacheHits,
      cache_hit_rate: this.totalRequests > 0 ? this.cacheHits / this.totalRequests : 0,
      response_cache_size: this.responseCache.size,
      context_cache_size: this.contextCache.size,
    };
  }

  private async getContextCached(projectId: string, messages: OpenClawMessage[]): Promise<string> {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const query = lastUserMsg.slice(0, 200);
    const cacheKey = this.hashString(`ctx:${projectId}:${query}`);

    const cached = this.contextCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }

    try {
      const context = await mem0Service.assembleContext(projectId, query);
      if (context) {
        this.contextCache.set(cacheKey, {
          value: context,
          expires: Date.now() + CONTEXT_CACHE_TTL_MS,
        });
      }
      return context;
    } catch (err: any) {
      console.error('[CachedInference] Context assembly failed:', err.message);
      return '';
    }
  }

  private async callOpenClaw(
    model: string,
    messages: OpenClawMessage[],
    max_tokens: number,
    temperature: number,
    _internal?: boolean
  ): Promise<InferenceResult> {
    const response = await openClawClient.chatCompletion({
      model,
      messages,
      max_tokens,
      temperature,
      _internal: _internal ?? true,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      model: response.model || model,
      usage: response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      cached: false,
      latency_ms: 0,
    };
  }

  private async callWithTools(
    model: string,
    messages: OpenClawMessage[],
    max_tokens: number,
    temperature: number,
    tools: Array<any>,
    _internal?: boolean
  ): Promise<InferenceResult> {
    const response = await openClawClient.chatCompletionWithTools({
      model,
      messages,
      max_tokens,
      temperature,
      tools,
      _internal: _internal ?? true,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      model: response.model || model,
      usage: response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      cached: false,
      latency_ms: 0,
      tool_calls: response.choices[0]?.message?.tool_calls,
    };
  }

  private logRequest(
    request: InferenceRequest,
    model: string,
    result: InferenceResult,
    latency_ms: number,
    cached: boolean,
    success: boolean = true,
    error?: string
  ): void {
    const entry: InferenceLogEntry = {
      timestamp: new Date().toISOString(),
      task_type: request.task_type,
      budget_tier: request.budget_tier,
      model,
      prompt_tokens: result.usage.prompt_tokens,
      completion_tokens: result.usage.completion_tokens,
      total_tokens: result.usage.total_tokens,
      latency_ms,
      cached,
      project_id: request.project_id,
      caller: request.caller,
      estimated_cost_usd: cached ? 0 : estimateCost(model, result.usage.prompt_tokens, result.usage.completion_tokens),
      success,
      error,
    };
    inferenceLogger.log(entry);
  }

  private hashRequest(model: string, messages: OpenClawMessage[], temperature: number, max_tokens: number): string {
    const payload = JSON.stringify({ model, messages, temperature, max_tokens });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  private hashString(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.responseCache) {
      if (entry.expires <= now) this.responseCache.delete(key);
    }
    for (const [key, entry] of this.contextCache) {
      if (entry.expires <= now) this.contextCache.delete(key);
    }
  }
}

export const cachedInference = new CachedInferenceClient();
