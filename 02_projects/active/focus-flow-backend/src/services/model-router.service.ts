import { readJsonFile } from '../utils/file-operations';

export type TaskType =
  | 'fast_classification'
  | 'memory_extraction'
  | 'conversation'
  | 'summarization'
  | 'content_creation'
  | 'code_generation'
  | 'evaluation'
  | 'synthesis'
  | 'strategic_reasoning';

export type BudgetTier = 'economy' | 'standard' | 'premium';

export type ModelAlias = 'haiku' | 'sonnet' | 'opus';

export interface ModelRoute {
  model: string;       // resolved model ID (e.g. 'openclaw:main')
  max_tokens: number;
  temperature: number;
}

interface RouteEntry {
  model: ModelAlias;
  max_tokens: number;
  temperature: number;
}

interface RoutingConfig {
  version: number;
  updated_at: string;
  models: Record<ModelAlias, string>;
  routes: Record<string, Record<string, RouteEntry>>;
}

const CONFIG_PATH = '/srv/focus-flow/07_system/config/model-routes.json';

const DEFAULT_MODELS: Record<ModelAlias, string> = {
  haiku: 'openclaw:main',
  sonnet: 'openclaw:main',
  opus: 'anthropic/claude-opus-4-6',
};

const DEFAULT_ROUTES: Record<TaskType, Record<BudgetTier, RouteEntry>> = {
  fast_classification: {
    economy:  { model: 'haiku',  max_tokens: 500,  temperature: 0.3 },
    standard: { model: 'haiku',  max_tokens: 500,  temperature: 0.3 },
    premium:  { model: 'sonnet', max_tokens: 800,  temperature: 0.3 },
  },
  memory_extraction: {
    economy:  { model: 'haiku',  max_tokens: 1000, temperature: 0.3 },
    standard: { model: 'haiku',  max_tokens: 1000, temperature: 0.3 },
    premium:  { model: 'haiku',  max_tokens: 1000, temperature: 0.3 },
  },
  conversation: {
    economy:  { model: 'sonnet', max_tokens: 2048, temperature: 0.7 },
    standard: { model: 'opus',   max_tokens: 4096, temperature: 0.7 },
    premium:  { model: 'opus',   max_tokens: 8192, temperature: 0.7 },
  },
  summarization: {
    economy:  { model: 'haiku',  max_tokens: 2000, temperature: 0.3 },
    standard: { model: 'sonnet', max_tokens: 4000, temperature: 0.3 },
    premium:  { model: 'sonnet', max_tokens: 4000, temperature: 0.3 },
  },
  content_creation: {
    economy:  { model: 'sonnet', max_tokens: 2000, temperature: 0.5 },
    standard: { model: 'sonnet', max_tokens: 3000, temperature: 0.5 },
    premium:  { model: 'opus',   max_tokens: 4000, temperature: 0.5 },
  },
  code_generation: {
    economy:  { model: 'sonnet', max_tokens: 3000, temperature: 0.3 },
    standard: { model: 'sonnet', max_tokens: 4000, temperature: 0.3 },
    premium:  { model: 'opus',   max_tokens: 4000, temperature: 0.3 },
  },
  evaluation: {
    economy:  { model: 'sonnet', max_tokens: 1500, temperature: 0.5 },
    standard: { model: 'opus',   max_tokens: 2000, temperature: 0.5 },
    premium:  { model: 'opus',   max_tokens: 2000, temperature: 0.5 },
  },
  synthesis: {
    economy:  { model: 'sonnet', max_tokens: 2000, temperature: 0.5 },
    standard: { model: 'opus',   max_tokens: 2000, temperature: 0.5 },
    premium:  { model: 'opus',   max_tokens: 3000, temperature: 0.5 },
  },
  strategic_reasoning: {
    economy:  { model: 'opus',   max_tokens: 2000, temperature: 0.5 },
    standard: { model: 'opus',   max_tokens: 3000, temperature: 0.5 },
    premium:  { model: 'opus',   max_tokens: 4000, temperature: 0.5 },
  },
};

class ModelRouter {
  private models: Record<ModelAlias, string> = { ...DEFAULT_MODELS };
  private routes: Record<string, Record<string, RouteEntry>> = { ...DEFAULT_ROUTES };
  private configLoaded = false;

  constructor() {
    this.loadConfig().catch((err) =>
      console.warn('[ModelRouter] Config load failed, using defaults:', err.message)
    );
  }

  async loadConfig(): Promise<void> {
    const config = await readJsonFile<RoutingConfig>(CONFIG_PATH);
    if (config && config.routes) {
      this.models = { ...DEFAULT_MODELS, ...config.models };
      this.routes = config.routes;
      this.configLoaded = true;
      console.log('[ModelRouter] Loaded config from', CONFIG_PATH);
    }
  }

  async reloadConfig(): Promise<void> {
    await this.loadConfig();
  }

  resolve(taskType: TaskType, budgetTier: BudgetTier): ModelRoute {
    const taskRoutes = this.routes[taskType];
    if (!taskRoutes) {
      // Fall back to conversation/standard
      const fallback = this.routes['conversation']?.['standard'] || DEFAULT_ROUTES.conversation.standard;
      return this.resolveEntry(fallback);
    }

    const entry = taskRoutes[budgetTier];
    if (!entry) {
      // Fall back to standard tier within the same task type
      const fallback = taskRoutes['standard'] || Object.values(taskRoutes)[0];
      return this.resolveEntry(fallback);
    }

    return this.resolveEntry(entry);
  }

  resolveModelId(alias: ModelAlias | string): string {
    if (alias in this.models) {
      return this.models[alias as ModelAlias];
    }
    return alias; // already a model ID
  }

  private resolveEntry(entry: RouteEntry): ModelRoute {
    return {
      model: this.resolveModelId(entry.model),
      max_tokens: entry.max_tokens,
      temperature: entry.temperature,
    };
  }

  getRoutingTable(): { models: Record<string, string>; routes: Record<string, Record<string, RouteEntry>>; configLoaded: boolean } {
    return {
      models: { ...this.models },
      routes: this.routes,
      configLoaded: this.configLoaded,
    };
  }
}

export const modelRouter = new ModelRouter();
