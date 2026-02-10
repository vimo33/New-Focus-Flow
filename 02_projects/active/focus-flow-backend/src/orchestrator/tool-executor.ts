/**
 * Tool Executor - Maps orchestrator tool calls to service methods
 *
 * Each tool name maps to an existing service. The executor validates
 * inputs, calls the appropriate service, and returns structured results.
 */

import { VaultService } from '../services/vault.service';
import { memoryService } from '../services/memory.service';
import { aiCouncil } from '../ai/ai-council';
import { classificationService } from '../services/classification.service';
import { crmService } from '../services/crm.service';
import { salesService } from '../services/sales.service';
import { specKitService } from '../services/spec-kit.service';
import { coolifyService } from '../services/coolify.service';

const vaultService = new VaultService();
const DEFAULT_USER = 'focus-flow-user';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  /** If the tool triggers a frontend navigation */
  navigate_to?: string;
}

export async function executeTool(
  toolName: string,
  input: Record<string, any>
): Promise<ToolResult> {
  try {
    switch (toolName) {
      // ==================== Capture & Inbox ====================
      case 'capture_item': {
        const item = await vaultService.createInboxItem({
          text: input.text,
          source: input.source || 'api',
        });
        // Background classification
        classificationService.classifyInboxItemAsync(item.id).catch(err =>
          console.error('[ToolExecutor] classification error:', err.message)
        );
        return {
          success: true,
          data: {
            id: item.id,
            text: item.text,
            message: `Captured: "${item.text.substring(0, 60)}${item.text.length > 60 ? '...' : ''}"`,
          },
        };
      }

      case 'list_inbox': {
        const items = await vaultService.getInboxItems(input.filter);
        const limit = input.limit || 10;
        const sliced = items.slice(0, limit);
        return {
          success: true,
          data: {
            items: sliced.map(i => ({
              id: i.id,
              text: i.text.substring(0, 100),
              category: i.category,
              source: i.source,
              created_at: i.created_at,
              classification: i.ai_classification?.suggested_action,
            })),
            total: items.length,
            showing: sliced.length,
          },
        };
      }

      case 'process_inbox_item': {
        const actionMap: Record<string, any> = {
          task: { action: 'task', task_data: { title: input.title } },
          project: { action: 'project', project_data: { title: input.title } },
          idea: { action: 'idea', idea_data: { title: input.title, description: input.title } },
          archive: { action: 'archive' },
          delete: { action: 'delete' },
        };
        await vaultService.processInboxItem(input.id, actionMap[input.action]);
        return {
          success: true,
          data: { message: `Inbox item processed as ${input.action}` },
        };
      }

      // ==================== Tasks ====================
      case 'create_task': {
        const task = await vaultService.createTask({
          title: input.title,
          description: input.description,
          category: input.category || 'personal',
          priority: input.priority,
          due_date: input.due_date,
          project_id: input.project_id,
        });
        return {
          success: true,
          data: {
            id: task.id,
            title: task.title,
            category: task.category,
            priority: task.priority,
            message: `Task created: "${task.title}"`,
          },
        };
      }

      case 'list_tasks': {
        let tasks = await vaultService.getTasks(input.category);
        if (input.status) {
          tasks = tasks.filter(t => t.status === input.status);
        }
        const limit = input.limit || 10;
        const sliced = tasks.slice(0, limit);
        return {
          success: true,
          data: {
            tasks: sliced.map(t => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
              category: t.category,
              due_date: t.due_date,
            })),
            total: tasks.length,
            showing: sliced.length,
          },
        };
      }

      case 'update_task': {
        const updated = await vaultService.updateTask(input.id, {
          status: input.status,
          priority: input.priority,
          title: input.title,
          ...(input.status === 'done' ? { completed_at: new Date().toISOString() } : {}),
        });
        if (!updated) {
          return { success: false, error: `Task ${input.id} not found` };
        }
        return {
          success: true,
          data: {
            id: updated.id,
            title: updated.title,
            status: updated.status,
            message: `Task updated: "${updated.title}" → ${updated.status}`,
          },
        };
      }

      // ==================== Projects ====================
      case 'create_project': {
        const project = await vaultService.createProject({
          title: input.title,
          description: input.description,
          phase: input.phase || 'idea',
        });
        return {
          success: true,
          data: {
            id: project.id,
            title: project.title,
            message: `Project created: "${project.title}"`,
          },
        };
      }

      case 'list_projects': {
        const projects = await vaultService.getProjects(input.status);
        return {
          success: true,
          data: {
            projects: projects.map(p => ({
              id: p.id,
              title: p.title,
              status: p.status,
              phase: p.phase,
              updated_at: p.updated_at,
            })),
            total: projects.length,
          },
        };
      }

      case 'get_project': {
        const allProjects = await vaultService.getProjects();
        const proj = allProjects.find(p => p.id === input.id);
        if (!proj) {
          return { success: false, error: `Project ${input.id} not found` };
        }
        const projectTasks = await vaultService.getTasksByProject(input.id);
        const progress = await vaultService.calculateProjectProgress(input.id);
        return {
          success: true,
          data: { ...proj, tasks: projectTasks, progress },
        };
      }

      case 'update_project': {
        // Find project, update, and save
        const allProjs = await vaultService.getProjects();
        const existing = allProjs.find(p => p.id === input.id);
        if (!existing) {
          return { success: false, error: `Project ${input.id} not found` };
        }
        const updates: any = { updated_at: new Date().toISOString() };
        if (input.phase) updates.phase = input.phase;
        if (input.status) updates.status = input.status;
        if (input.title) updates.title = input.title;
        if (input.description) updates.description = input.description;

        const updatedProj = { ...existing, ...updates };
        await vaultService.saveData(
          `02_projects/${updatedProj.status || 'active'}/${updatedProj.id}.json`,
          JSON.stringify(updatedProj, null, 2)
        );
        return {
          success: true,
          data: {
            id: updatedProj.id,
            title: updatedProj.title,
            phase: updatedProj.phase,
            message: `Project updated: "${updatedProj.title}"`,
          },
        };
      }

      // ==================== Ideas ====================
      case 'create_idea': {
        const idea = await vaultService.createIdea({
          title: input.title,
          description: input.description,
        });
        return {
          success: true,
          data: {
            id: idea.id,
            title: idea.title,
            message: `Idea created: "${idea.title}"`,
          },
        };
      }

      case 'list_ideas': {
        const ideas = await vaultService.getIdeas(input.status);
        return {
          success: true,
          data: {
            ideas: ideas.map(i => ({
              id: i.id,
              title: i.title,
              status: i.status,
              created_at: i.created_at,
              has_verdict: !!i.council_verdict,
              score: i.council_verdict?.overall_score,
            })),
            total: ideas.length,
          },
        };
      }

      case 'get_idea': {
        const idea = await vaultService.getIdea(input.id);
        if (!idea) {
          return { success: false, error: `Idea ${input.id} not found` };
        }
        return { success: true, data: idea };
      }

      case 'validate_idea': {
        const ideaToValidate = await vaultService.getIdea(input.id);
        if (!ideaToValidate) {
          return { success: false, error: `Idea ${input.id} not found` };
        }
        const verdict = await aiCouncil.validateIdea(ideaToValidate);
        return {
          success: true,
          data: {
            recommendation: verdict.recommendation,
            overall_score: verdict.overall_score,
            reasoning: verdict.synthesized_reasoning,
            next_steps: verdict.next_steps,
            evaluations: verdict.evaluations.map(e => ({
              agent: e.agent_name,
              score: e.score,
            })),
            message: `Council verdict: ${verdict.recommendation.toUpperCase()} (${verdict.overall_score}/10)`,
          },
        };
      }

      case 'promote_idea_to_project': {
        const ideaToPromote = await vaultService.getIdea(input.id);
        if (!ideaToPromote) {
          return { success: false, error: `Idea ${input.id} not found` };
        }
        const newProject = await vaultService.createProject({
          title: ideaToPromote.title,
          description: ideaToPromote.description,
          phase: 'idea',
          idea_id: ideaToPromote.id,
        });
        return {
          success: true,
          data: {
            project_id: newProject.id,
            title: newProject.title,
            message: `Idea promoted to project: "${newProject.title}"`,
          },
        };
      }

      // ==================== Health ====================
      case 'log_health': {
        const metric = await vaultService.logHealthMetric({
          metric_type: input.metric_type,
          value: input.value,
          notes: input.notes,
        });
        return {
          success: true,
          data: {
            id: metric.id,
            metric_type: metric.metric_type,
            value: metric.value,
            message: `Health logged: ${metric.metric_type} = ${metric.value}`,
          },
        };
      }

      // ==================== Memory ====================
      case 'search_memory': {
        const memories = await memoryService.searchMemory(input.query, DEFAULT_USER);
        return {
          success: true,
          data: {
            memories: memories.map(m => ({
              memory: m.memory,
              score: m.score,
            })),
            count: memories.length,
          },
        };
      }

      // ==================== System ====================
      case 'get_dashboard_summary': {
        const [inboxCounts, projects, tasks] = await Promise.all([
          vaultService.getInboxCounts(),
          vaultService.getProjects('active'),
          vaultService.getTasks(),
        ]);
        const pendingTasks = tasks.filter(t => t.status !== 'done');
        return {
          success: true,
          data: {
            inbox: inboxCounts,
            active_projects: projects.length,
            pending_tasks: pendingTasks.length,
            top_projects: projects.slice(0, 3).map(p => ({
              title: p.title,
              phase: p.phase,
            })),
            urgent_tasks: pendingTasks
              .filter(t => t.priority === 'high')
              .slice(0, 5)
              .map(t => ({ title: t.title, due: t.due_date })),
          },
        };
      }

      case 'navigate': {
        return {
          success: true,
          navigate_to: input.route,
          data: { message: `Navigating to ${input.route}` },
        };
      }

      // ==================== CRM ====================
      case 'create_contact': {
        const tags = input.tags ? input.tags.split(',').map((t: string) => t.trim()) : [];
        const contact = await crmService.createContact({
          name: input.name,
          email: input.email,
          company: input.company,
          phone: input.phone,
          tags,
        });
        return {
          success: true,
          data: {
            id: contact.id,
            name: contact.name,
            message: `Contact created: "${contact.name}"`,
          },
        };
      }

      case 'list_contacts': {
        const contacts = await crmService.getContacts(input.search);
        return {
          success: true,
          data: {
            contacts: contacts.map(c => ({
              id: c.id,
              name: c.name,
              email: c.email,
              company: c.company,
              tags: c.tags,
            })),
            total: contacts.length,
          },
        };
      }

      // ==================== Sales ====================
      case 'create_deal': {
        const deal = await salesService.createDeal({
          title: input.title,
          stage: input.stage || 'lead',
          value: input.value,
          contact_id: input.contact_id,
          project_id: input.project_id,
        });
        return {
          success: true,
          data: {
            id: deal.id,
            title: deal.title,
            stage: deal.stage,
            message: `Deal created: "${deal.title}" (${deal.stage})`,
          },
        };
      }

      case 'list_deals': {
        const deals = await salesService.getDeals(input.stage);
        return {
          success: true,
          data: {
            deals: deals.map(d => ({
              id: d.id,
              title: d.title,
              stage: d.stage,
              value: d.value,
              currency: d.currency,
            })),
            total: deals.length,
          },
        };
      }

      case 'update_deal': {
        const updatedDeal = await salesService.updateDeal(input.id, {
          stage: input.stage,
          value: input.value,
        });
        if (!updatedDeal) {
          return { success: false, error: `Deal ${input.id} not found` };
        }
        return {
          success: true,
          data: {
            id: updatedDeal.id,
            title: updatedDeal.title,
            stage: updatedDeal.stage,
            message: `Deal updated: "${updatedDeal.title}" → ${updatedDeal.stage}`,
          },
        };
      }

      case 'get_sales_pipeline': {
        const pipeline = await salesService.getPipelineSummary();
        return { success: true, data: pipeline };
      }

      // ==================== Dev Flow ====================
      case 'scaffold_project': {
        const result = await specKitService.scaffoldProject(input.project_id);
        return {
          success: true,
          data: {
            path: result.path,
            files: result.files_created,
            message: `Project scaffolded at ${result.path}`,
          },
        };
      }

      case 'generate_specs': {
        const specResult = await specKitService.generateSpecs(input.project_id);
        return {
          success: true,
          data: {
            spec_count: specResult.spec_count,
            spec_path: specResult.spec_path,
            message: `Generated ${specResult.spec_count} specifications`,
          },
        };
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (error: any) {
    console.error(`[ToolExecutor] Error executing ${toolName}:`, error.message);
    return { success: false, error: error.message };
  }
}
