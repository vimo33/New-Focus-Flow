import path from 'path';
import { readJsonFile, listFiles, getVaultPath } from '../utils/file-operations';

export interface ToolManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  execution_type: 'in-process' | 'docker' | 'cli' | 'api';
  invocation: {
    service?: string;
    method?: string;
    docker_image?: string;
    command?: string;
    base_url?: string;
    endpoint?: string;
  };
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
  trust_level: 'sandboxed' | 'trusted' | 'privileged';
  requires_approval: boolean;
  max_execution_seconds: number;
  cost_estimate: 'free' | 'low' | 'medium' | 'high';
}

class ToolRegistryService {
  private manifests: Map<string, ToolManifest> = new Map();
  private toolsDir: string;

  constructor() {
    this.toolsDir = getVaultPath('07_system', 'tools');
    this.loadManifests().catch(err => {
      console.error('[ToolRegistry] Failed to load manifests on init:', err.message);
    });
  }

  async loadManifests(): Promise<void> {
    const files = await listFiles(this.toolsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const loaded = new Map<string, ToolManifest>();
    for (const file of jsonFiles) {
      const filePath = path.join(this.toolsDir, file);
      const manifest = await readJsonFile<ToolManifest>(filePath);
      if (manifest && manifest.id) {
        loaded.set(manifest.id, manifest);
      }
    }

    this.manifests = loaded;
    console.log(`[ToolRegistry] Loaded ${this.manifests.size} tool manifests`);
  }

  getAll(): ToolManifest[] {
    return Array.from(this.manifests.values());
  }

  getById(id: string): ToolManifest | null {
    return this.manifests.get(id) || null;
  }

  findByCapability(capability: string): ToolManifest[] {
    return this.getAll().filter(m => m.capabilities.includes(capability));
  }

  async reload(): Promise<number> {
    await this.loadManifests();
    return this.manifests.size;
  }
}

export const toolRegistry = new ToolRegistryService();
