import { toolRegistry, ToolManifest } from './tool-registry.service';
import { contentEngine } from './content-engine.service';
import { aiCouncil } from '../ai/ai-council';
import { designService } from './design.service';
import { councilComposer } from '../ai/council-composer';

export interface ToolExecutionResult {
  tool_id: string;
  success: boolean;
  data?: any;
  error?: string;
  execution_ms: number;
  requires_approval?: boolean;
}

class ToolRunnerService {
  async execute(toolId: string, input: Record<string, any>): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    const manifest = toolRegistry.getById(toolId);
    if (!manifest) {
      return {
        tool_id: toolId,
        success: false,
        error: `Tool '${toolId}' not found in registry`,
        execution_ms: Date.now() - startTime,
      };
    }

    if (manifest.requires_approval) {
      // Flag for callers — actual approval enforcement is handled upstream (Phase 5 Core Agent)
    }

    try {
      const data = await this.dispatch(manifest, input);
      return {
        tool_id: toolId,
        success: true,
        data,
        execution_ms: Date.now() - startTime,
        requires_approval: manifest.requires_approval,
      };
    } catch (err: any) {
      console.error(`[ToolRunner] Error executing '${toolId}':`, err.message);
      return {
        tool_id: toolId,
        success: false,
        error: err.message,
        execution_ms: Date.now() - startTime,
        requires_approval: manifest.requires_approval,
      };
    }
  }

  private async dispatch(manifest: ToolManifest, input: Record<string, any>): Promise<any> {
    switch (manifest.execution_type) {
      case 'in-process':
        return this.executeInProcess(manifest, input);
      case 'docker':
      case 'cli':
      case 'api':
        throw new Error('Tool not yet implemented (Phase 5)');
      default:
        throw new Error(`Unknown execution_type: ${manifest.execution_type}`);
    }
  }

  private async executeInProcess(manifest: ToolManifest, input: Record<string, any>): Promise<any> {
    switch (manifest.id) {
      case 'ai-council': {
        // If decision_type provided, auto-compose panel from config
        let members = input.members;
        if (input.decision_type && !members) {
          members = await councilComposer.autoCompose(
            input.decision_type, input.title, input.description, input.project_id
          );
        }
        return aiCouncil.validateWithCouncil(
          input.title,
          input.description,
          members,
          input.project_id
        );
      }

      case 'content-engine':
        return contentEngine.generate(input as any);

      case 'design-studio':
        return designService.generateScreen(
          input.project_id,
          input.prompt,
          input.model
        );

      case 'blog-publisher': {
        const { blogPublisher } = await import('./blog-publisher.service');
        const { gtmOrchestrator } = await import('./gtm-orchestrator.service');
        const entries = await gtmOrchestrator.getCalendarEntries(input.project_id);
        const entry = entries.find(e => e.id === input.entry_id);
        if (!entry) throw new Error(`Calendar entry '${input.entry_id}' not found`);
        return blogPublisher.publish(entry);
      }

      case 'social-publisher': {
        const { socialPublisher } = await import('./social-publisher.service');
        const { gtmOrchestrator: gtm } = await import('./gtm-orchestrator.service');
        const calEntries = await gtm.getCalendarEntries(input.project_id);
        const calEntry = calEntries.find(e => e.id === input.entry_id);
        if (!calEntry) throw new Error(`Calendar entry '${input.entry_id}' not found`);
        return socialPublisher.publish(calEntry, input.channel || calEntry.channel);
      }

      default:
        throw new Error(`No in-process handler for tool '${manifest.id}'`);
    }
  }
}

export const toolRunner = new ToolRunnerService();
