import axios, { AxiosInstance } from 'axios';
import { SecurityAuditService } from './security-audit.service';
import { PromptSanitizer } from '../utils/prompt-sanitizer';

export interface OpenClawMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenClawRequest {
  model: string;
  messages: OpenClawMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  /** Skip prompt sanitization — use for internal AI-to-AI calls (summarize, council, etc.) */
  _internal?: boolean;
}

export interface OpenClawToolFunction {
  name: string;
  arguments: string | Record<string, any>;
}

export interface OpenClawToolCall {
  id: string;
  type: 'function';
  function: OpenClawToolFunction;
}

export interface OpenClawRequestWithTools extends OpenClawRequest {
  tools?: Array<{
    type: 'function' | string;
    function?: {
      name: string;
      description: string;
      parameters: Record<string, any>;
    };
    [key: string]: any;
  }>;
}

export interface OpenClawResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
      tool_calls?: OpenClawToolCall[];
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenClawClient {
  private client: AxiosInstance;
  private readonly GATEWAY_URL: string;
  private readonly HAIKU_MODEL = 'openclaw:main';
  private readonly SONNET_MODEL = 'openclaw:main';
  private readonly OPUS_MODEL = 'anthropic/claude-opus-4-6';
  private requestCount = 0;
  private errorCount = 0;

  constructor() {
    // SECURITY: Only allow localhost URLs
    const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';

    if (!this.isLocalhostUrl(gatewayUrl)) {
      throw new Error('SECURITY: OpenClaw Gateway MUST be localhost-only. Refusing to connect to: ' + gatewayUrl);
    }

    this.GATEWAY_URL = gatewayUrl;

    this.client = axios.create({
      baseURL: this.GATEWAY_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 360000, // 6 minute timeout - Opus agents with web search on large docs need time
      maxRedirects: 0, // SECURITY: Disable redirects to prevent SSRF
    });

    // SECURITY: Require auth token
    const authToken = process.env.OPENCLAW_AUTH_TOKEN;
    if (!authToken) {
      console.warn('[OpenClaw] WARNING: OPENCLAW_AUTH_TOKEN not configured. Requests may fail.');
      console.warn('[OpenClaw] To fix: Generate token with "openssl rand -hex 32" and add to secrets file');
    } else {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    }

    // Add request/response interceptors for security logging
    this.setupInterceptors();
  }

  /**
   * SECURITY: Validate that URL is localhost-only
   */
  private isLocalhostUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const allowedHosts = ['localhost', '127.0.0.1', '::1'];
      return allowedHosts.includes(parsed.hostname);
    } catch {
      return false;
    }
  }

  /**
   * Normalize usage data from different API formats.
   * OpenClaw may return Anthropic (input_tokens/output_tokens) or OpenAI (prompt_tokens/completion_tokens) format.
   */
  private normalizeUsage(usage: any): { prompt_tokens: number; completion_tokens: number; total_tokens: number } {
    if (!usage) return { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    // Anthropic format: input_tokens / output_tokens
    const input = usage.input_tokens || usage.prompt_tokens || 0;
    const output = usage.output_tokens || usage.completion_tokens || 0;
    const total = usage.total_tokens || (input + output);

    return { prompt_tokens: input, completion_tokens: output, total_tokens: total };
  }

  /**
   * SECURITY: Set up logging and monitoring
   */
  private setupInterceptors(): void {
    // Request interceptor - log all outgoing requests
    this.client.interceptors.request.use(
      (config) => {
        this.requestCount++;
        console.log(`[OpenClaw] Request #${this.requestCount}: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[OpenClaw] Request error:', error.message);
        return Promise.reject(error);
      }
    );

    // Response interceptor - log errors and detect attacks
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.errorCount++;
        console.error('[OpenClaw] Error:', {
          message: error.message,
          status: error.response?.status,
          errorCount: this.errorCount,
        });

        // SECURITY: Alert if error rate is suspiciously high
        const errorRate = this.errorCount / Math.max(this.requestCount, 1);
        if (errorRate > 0.5 && this.requestCount > 10) {
          console.error('[OpenClaw] SECURITY ALERT: High error rate detected. Possible attack or misconfiguration.');
          SecurityAuditService.log({
            timestamp: new Date().toISOString(),
            type: 'suspicious_activity',
            severity: 'high',
            details: {
              reason: 'High error rate in OpenClaw requests',
              errorRate,
              requestCount: this.requestCount,
              errorCount: this.errorCount,
            },
          });
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Send a chat completion request to OpenClaw Gateway
   */
  async chatCompletion(request: OpenClawRequest): Promise<OpenClawResponse> {
    // Skip sanitization for internal AI-to-AI calls (summarize, council, etc.)
    // Sanitization is only relevant for direct user input from the chat UI
    if (!request._internal) {
      const userMessage = request.messages.find((m) => m.role === 'user')?.content || '';
      const sanitized = PromptSanitizer.sanitize(userMessage);
      const detection = PromptSanitizer.detectInjection(sanitized);

      SecurityAuditService.logAIRequest({
        model: request.model,
        promptLength: sanitized.length,
        userInput: sanitized,
        wasSanitized: sanitized !== userMessage,
        wasSuspicious: detection.isSuspicious,
        suspiciousReasons: detection.reasons,
      });

      if (detection.isSuspicious && detection.reasons.length >= 2) {
        SecurityAuditService.log({
          timestamp: new Date().toISOString(),
          type: 'prompt_injection',
          severity: 'high',
          details: {
            userInput: sanitized,
            reasons: detection.reasons,
          },
        });
        throw new Error('Security: Potential prompt injection detected. Request blocked.');
      }
    }

    // Send request to OpenClaw Gateway (strip _internal flag before sending)
    const { _internal, ...apiRequest } = request;
    try {
      const response = await this.client.post<OpenClawResponse>(
        '/v1/chat/completions',
        apiRequest
      );
      // Normalize usage from Anthropic/OpenAI format
      if (response.data) {
        response.data.usage = this.normalizeUsage(response.data.usage);
      }
      return response.data;
    } catch (error: any) {
      if (error.response) {
        // Log auth failures
        if (error.response.status === 401 || error.response.status === 403) {
          SecurityAuditService.log({
            timestamp: new Date().toISOString(),
            type: 'auth_failure',
            severity: 'high',
            details: {
              status: error.response.status,
              message: 'OpenClaw authentication failed',
              hint: 'Check OPENCLAW_AUTH_TOKEN configuration',
            },
          });
        }

        throw new Error(
          `OpenClaw API Error: ${error.response.status} - ${error.response.data?.error || error.message}`
        );
      }
      throw new Error(`OpenClaw Connection Error: ${error.message}`);
    }
  }

  /**
   * Chat completion with tool definitions
   * OpenClaw proxies to Claude which natively supports tool use.
   */
  async chatCompletionWithTools(
    request: OpenClawRequestWithTools
  ): Promise<OpenClawResponse> {
    // Skip sanitization for internal AI-to-AI calls
    if (!request._internal) {
      const userMessage = request.messages.find((m) => m.role === 'user')?.content || '';
      const sanitized = PromptSanitizer.sanitize(userMessage);
      const detection = PromptSanitizer.detectInjection(sanitized);

      SecurityAuditService.logAIRequest({
        model: request.model,
        promptLength: sanitized.length,
        userInput: sanitized,
        wasSanitized: sanitized !== userMessage,
        wasSuspicious: detection.isSuspicious,
        suspiciousReasons: detection.reasons,
      });

      if (detection.isSuspicious && detection.reasons.length >= 2) {
        SecurityAuditService.log({
          timestamp: new Date().toISOString(),
          type: 'prompt_injection',
          severity: 'high',
          details: {
            userInput: sanitized,
            reasons: detection.reasons,
          },
        });
        throw new Error('Security: Potential prompt injection detected. Request blocked.');
      }
    }

    // Strip _internal flag before sending
    const { _internal, ...apiRequest } = request;
    try {
      const response = await this.client.post<OpenClawResponse>(
        '/v1/chat/completions',
        apiRequest
      );
      // Normalize usage from Anthropic/OpenAI format
      if (response.data) {
        response.data.usage = this.normalizeUsage(response.data.usage);
      }
      return response.data;
    } catch (error: any) {
      if (error.response) {
        if (error.response.status === 401 || error.response.status === 403) {
          SecurityAuditService.log({
            timestamp: new Date().toISOString(),
            type: 'auth_failure',
            severity: 'high',
            details: {
              status: error.response.status,
              message: 'OpenClaw authentication failed (tool use)',
            },
          });
        }
        throw new Error(
          `OpenClaw API Error: ${error.response.status} - ${error.response.data?.error || error.message}`
        );
      }
      throw new Error(`OpenClaw Connection Error: ${error.message}`);
    }
  }

  /**
   * Simple text completion helper
   */
  async complete(
    prompt: string,
    systemPrompt?: string,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<string> {
    const messages: OpenClawMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const response = await this.chatCompletion({
      model: options?.model || this.SONNET_MODEL,
      messages,
      max_tokens: options?.maxTokens || 2000,
      temperature: options?.temperature || 0.7,
      _internal: true,
    });

    return response.choices[0].message.content;
  }

  /**
   * Completion with Claude's native web search tool.
   * OpenClaw passes through Anthropic's built-in web_search tool —
   * Claude handles searching and reading pages internally, no custom loop needed.
   */
  async completeWithResearch(
    prompt: string,
    systemPrompt?: string,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<string> {
    const messages: OpenClawMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const response = await this.chatCompletionWithTools({
      model: options?.model || this.SONNET_MODEL,
      messages,
      max_tokens: options?.maxTokens || 4000,
      temperature: options?.temperature || 0.7,
      _internal: true,
      tools: [
        { type: 'web_search_20250305' as any, name: 'web_search', max_uses: 5 } as any,
      ],
    });

    return response.choices[0].message.content;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('[OpenClaw] Health check failed:', error);
      return false;
    }
  }

  /**
   * Get model names for compatibility
   */
  get models() {
    return {
      haiku: this.HAIKU_MODEL,
      sonnet: this.SONNET_MODEL,
      opus: this.OPUS_MODEL,
    };
  }
}

// Export singleton instance
export const openClawClient = new OpenClawClient();
