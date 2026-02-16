/**
 * Tool Executor - Maps orchestrator tool calls to service methods
 *
 * Each tool name maps to an existing service. The executor validates
 * inputs, calls the appropriate service, and returns structured results.
 */

import * as fs from 'fs';
import * as path from 'path';
import { VaultService } from '../services/vault.service';
import { mem0Service } from '../services/mem0.service';
import { cachedInference } from '../services/cached-inference.service';
import { aiCouncil } from '../ai/ai-council';
import { classificationService } from '../services/classification.service';
import { crmService } from '../services/crm.service';
import { salesService } from '../services/sales.service';
import { specKitService } from '../services/spec-kit.service';
import { coolifyService } from '../services/coolify.service';
import { financialsService } from '../services/financials.service';
import { incomeStrategyService } from '../services/income-strategy.service';
import { weeklyReportService } from '../services/weekly-report.service';
import { briefingGenerator } from '../services/briefing-generator.service';
import { pipelineService } from '../services/pipeline.service';
import { networkGraphService } from '../services/network-graph.service';
import { contentEngine } from '../services/content-engine.service';
import { gtmOrchestrator } from '../services/gtm-orchestrator.service';

const vaultService = new VaultService();
const DEFAULT_USER = 'nitara-user';

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
        const { DEFAULT_COUNCIL } = await import('../services/concept-chat.service');
        const verdict = await aiCouncil.validateWithCouncil(
          ideaToValidate.title,
          ideaToValidate.description || '',
          DEFAULT_COUNCIL
        );
        return {
          success: true,
          data: {
            recommendation: verdict.recommendation,
            overall_score: verdict.overall_score,
            reasoning: verdict.synthesized_reasoning,
            next_steps: verdict.next_steps,
            evaluations: verdict.evaluations.map((e: any) => ({
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
          phase: 'concept',
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
        const memories = await mem0Service.searchMemories(input.query, {
          userId: DEFAULT_USER,
          limit: input.limit || 10,
        });
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

      // ==================== Financials ====================
      case 'get_financials_summary': {
        const portfolio = await financialsService.getPortfolioFinancials();
        return {
          success: true,
          data: {
            total_monthly_revenue: portfolio.total_monthly_revenue,
            total_monthly_costs: portfolio.total_monthly_costs,
            net_monthly: portfolio.net_monthly,
            currency: portfolio.currency,
            runway_months: portfolio.runway_months,
            revenue_streams: portfolio.revenue_streams?.length || 0,
            cost_items: portfolio.cost_items?.length || 0,
            goals: portfolio.goals ? {
              income_goal: portfolio.goals.income_goal,
              safety_net_months: portfolio.goals.safety_net_months,
            } : null,
            inference_costs: portfolio.inference_costs,
            message: `Portfolio: ${portfolio.total_monthly_revenue} revenue, ${portfolio.total_monthly_costs} costs, net ${portfolio.net_monthly} ${portfolio.currency}`,
          },
        };
      }

      case 'get_income_strategies': {
        const [strategies, gapAnalysis] = await Promise.all([
          incomeStrategyService.getStrategies(),
          incomeStrategyService.getGoalGapAnalysis(),
        ]);
        return {
          success: true,
          data: {
            strategies: strategies.slice(0, 5).map(s => ({
              id: s.id,
              title: s.title,
              type: s.type,
              confidence: s.confidence,
              estimated_monthly_revenue: s.estimated_monthly_revenue,
              status: s.status,
            })),
            gap_analysis: gapAnalysis,
            total_strategies: strategies.length,
          },
        };
      }

      // ==================== Intelligence & Reports ====================
      case 'get_weekly_report': {
        const report = input.generate
          ? await weeklyReportService.generateReport()
          : await weeklyReportService.getLatestReport();
        if (!report) {
          return { success: true, data: { message: 'No weekly report available yet. Use generate=true to create one.' } };
        }
        return {
          success: true,
          data: {
            week: report.week_start,
            kpis: report.kpis,
            strategic_intelligence: report.strategic_intelligence,
            momentum: report.overall_momentum,
            message: `Weekly report for ${report.week_start}`,
          },
        };
      }

      case 'get_morning_briefing': {
        const briefing = input.generate
          ? await briefingGenerator.generateBriefing()
          : await briefingGenerator.getLatestBriefing();
        if (!briefing) {
          return { success: true, data: { message: 'No briefing available yet. Use generate=true to create one.' } };
        }
        return {
          success: true,
          data: briefing,
        };
      }

      // ==================== Pipeline ====================
      case 'start_pipeline': {
        const project = await pipelineService.startPipeline(input.project_id);
        return {
          success: true,
          data: {
            id: project.id,
            title: project.title,
            phase: project.phase,
            message: `Pipeline started for "${project.title}" at concept phase`,
          },
        };
      }

      case 'get_pipeline_status': {
        const status = await pipelineService.getStatus(input.project_id);
        return {
          success: true,
          data: {
            project: { id: status.project.id, title: status.project.title, phase: status.project.phase },
            pipeline: status.pipeline,
            current_phase: status.current_phase_state,
          },
        };
      }

      // ==================== Network ====================
      case 'get_network_contacts': {
        const graphSummary = await networkGraphService.getGraphSummary();
        return {
          success: true,
          data: graphSummary,
        };
      }

      case 'get_network_opportunities': {
        const opportunities = await networkGraphService.getOpportunities();
        return {
          success: true,
          data: {
            opportunities: opportunities.slice(0, 5),
            total: opportunities.length,
          },
        };
      }

      // ==================== Content & GTM ====================
      case 'draft_content': {
        const result = await contentEngine.generate({
          content_type: input.content_type,
          brief: input.brief,
          project_id: input.project_id,
          tone: input.tone,
        });
        return {
          success: true,
          data: {
            content: result.content,
            content_type: result.content_type,
            word_count: result.word_count,
            message: `Drafted ${input.content_type}: "${input.brief.substring(0, 40)}"`,
          },
        };
      }

      case 'get_calendar_entries': {
        const entries = await gtmOrchestrator.getCalendarEntries(input.project_id);
        return {
          success: true,
          data: {
            entries: entries.slice(0, 10).map(e => ({
              id: e.id,
              title: e.title,
              channel: e.channel,
              status: e.status,
              scheduled_date: e.scheduled_date,
            })),
            total: entries.length,
          },
        };
      }

      // ==================== Capabilities Registry ====================
      case 'update_capabilities': {
        const capPath = path.resolve('/srv/focus-flow/07_system/capabilities.json');
        try {
          const raw = fs.readFileSync(capPath, 'utf-8');
          const caps = JSON.parse(raw);
          if (!caps.domains[input.domain]) {
            caps.domains[input.domain] = { description: '', tools: [] };
          }
          const existing = caps.domains[input.domain].tools.findIndex(
            (t: any) => t.name === input.tool_name
          );
          const entry = { name: input.tool_name, description: input.description, tier: input.tier || 1 };
          if (existing >= 0) {
            caps.domains[input.domain].tools[existing] = entry;
          } else {
            caps.domains[input.domain].tools.push(entry);
          }
          caps.last_updated = new Date().toISOString().split('T')[0];
          fs.writeFileSync(capPath, JSON.stringify(caps, null, 2));
          return {
            success: true,
            data: { message: `Capability "${input.tool_name}" updated in domain "${input.domain}"` },
          };
        } catch (e: any) {
          return { success: false, error: `Failed to update capabilities: ${e.message}` };
        }
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

      // ==================== Research & Search ====================
      case 'web_search': {
        const query = input.query;
        const context = input.context || '';
        const researchPrompt = `Research this topic: ${query}. ${context ? `Context: ${context}.` : ''} Provide a thorough summary of findings with sources.`;

        const result = await cachedInference.completeWithResearch(
          researchPrompt,
          'You are a research assistant. Provide factual, well-sourced findings.',
          'strategic_reasoning',
          'premium'
        );

        return {
          success: true,
          data: {
            query,
            findings: result,
            message: `Research completed for: "${query}"`,
          },
        };
      }

      case 'deep_search': {
        const query = input.query;
        const scope = input.scope || 'all';

        // Use Mem0 semantic search as primary mechanism
        const results: any[] = [];
        let memoryResults: any[] = [];

        if (mem0Service.isAvailable) {
          try {
            memoryResults = await mem0Service.searchMemories(query, { limit: 20 });
          } catch {
            // Fall through to vault search
          }
        }

        if (memoryResults.length > 0) {
          results.push(...memoryResults.map(m => ({
            type: 'memory',
            content: m.memory,
            score: m.score,
            metadata: m.metadata,
          })));
        }

        // Supplement with vault listing when scope is specific or memory results are sparse
        if (results.length < 5 || scope !== 'all') {
          try {
            if (scope === 'all' || scope === 'projects') {
              const projects = await vaultService.getProjects();
              const matching = projects.filter(p =>
                p.title?.toLowerCase().includes(query.toLowerCase()) ||
                p.description?.toLowerCase().includes(query.toLowerCase())
              );
              results.push(...matching.slice(0, 5).map(p => ({
                type: 'project', id: p.id, title: p.title, phase: p.phase, status: p.status,
              })));
            }
            if (scope === 'all' || scope === 'tasks') {
              const tasks = await vaultService.getTasks();
              const matching = tasks.filter(t =>
                t.title?.toLowerCase().includes(query.toLowerCase())
              );
              results.push(...matching.slice(0, 5).map(t => ({
                type: 'task', id: t.id, title: t.title, status: t.status, priority: t.priority,
              })));
            }
            if (scope === 'all' || scope === 'contacts') {
              const contacts = await crmService.getContacts(query);
              results.push(...contacts.slice(0, 5).map(c => ({
                type: 'contact', id: c.id, name: c.name, company: c.company, tags: c.tags,
              })));
            }
            if (scope === 'all' || scope === 'deals') {
              const deals = await salesService.getDeals();
              const matching = deals.filter(d =>
                d.title?.toLowerCase().includes(query.toLowerCase())
              );
              results.push(...matching.slice(0, 5).map(d => ({
                type: 'deal', id: d.id, title: d.title, stage: d.stage, value: d.value,
              })));
            }
            if (scope === 'all' || scope === 'ideas') {
              const ideas = await vaultService.getIdeas();
              const matching = ideas.filter(i =>
                i.title?.toLowerCase().includes(query.toLowerCase()) ||
                i.description?.toLowerCase().includes(query.toLowerCase())
              );
              results.push(...matching.slice(0, 5).map(i => ({
                type: 'idea', id: i.id, title: i.title, status: i.status,
              })));
            }
          } catch (e: any) {
            console.error('[ToolExecutor] deep_search vault fallback error:', e.message);
          }
        }

        return {
          success: true,
          data: {
            query,
            scope,
            results: results.slice(0, 20),
            total: results.length,
            message: `Found ${results.length} results for "${query}" in ${scope}`,
          },
        };
      }

      // ==================== Profiling ====================
      case 'get_profiling_gaps': {
        const checklistPath = path.resolve('/srv/focus-flow/07_system/agent/profiling-checklist.json');
        try {
          const raw = fs.readFileSync(checklistPath, 'utf-8');
          const checklist = JSON.parse(raw);
          const domain = input.domain || 'all';

          const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
          const gapsByDomain: any[] = [];
          const allGaps: any[] = [];

          for (const [domainKey, domainData] of Object.entries(checklist.domains) as any[]) {
            if (domain !== 'all' && domainKey !== domain) continue;

            const gaps = domainData.items.filter((i: any) => i.status !== 'known');
            if (gaps.length > 0) {
              gapsByDomain.push({
                domain: domainKey,
                label: domainData.label,
                priority: domainData.priority,
                completeness: domainData.completeness,
                gaps: gaps.map((g: any) => ({ key: g.key, label: g.label, status: g.status })),
              });
              for (const g of gaps) {
                allGaps.push({
                  domain: domainKey,
                  domain_priority: domainData.priority,
                  ...g,
                });
              }
            }
          }

          // Sort gaps: critical domains first, then unknown before partial
          allGaps.sort((a, b) => {
            const pDiff = (priorityOrder[a.domain_priority] || 3) - (priorityOrder[b.domain_priority] || 3);
            if (pDiff !== 0) return pDiff;
            if (a.status === 'unknown' && b.status !== 'unknown') return -1;
            if (b.status === 'unknown' && a.status !== 'unknown') return 1;
            return 0;
          });

          const topGaps = allGaps.slice(0, 5);
          const topGap = topGaps[0];
          const suggestedTopic = topGap
            ? `Ask about: "${topGap.label}" (${topGap.domain.replace(/_/g, ' ')} — ${topGap.domain_priority} priority)`
            : 'All profiling items are complete!';

          return {
            success: true,
            data: {
              overall_completeness: checklist.overall_completeness,
              gaps_by_domain: gapsByDomain,
              top_gaps: topGaps.map((g: any) => ({
                domain: g.domain,
                key: g.key,
                label: g.label,
                status: g.status,
                priority: g.domain_priority,
              })),
              suggested_next_topic: suggestedTopic,
              message: `Profiling is ${checklist.overall_completeness}% complete. ${allGaps.length} items need data.`,
            },
          };
        } catch (e: any) {
          return { success: false, error: `Failed to read profiling checklist: ${e.message}` };
        }
      }

      case 'update_profile_data': {
        const checklistPath = path.resolve('/srv/focus-flow/07_system/agent/profiling-checklist.json');
        try {
          const raw = fs.readFileSync(checklistPath, 'utf-8');
          const checklist = JSON.parse(raw);

          const domainKey = input.domain;
          const itemKey = input.item_key;
          const domain = checklist.domains[domainKey];
          if (!domain) {
            return { success: false, error: `Unknown domain: ${domainKey}` };
          }

          const item = domain.items.find((i: any) => i.key === itemKey);
          if (!item) {
            return { success: false, error: `Unknown item key: ${itemKey} in domain ${domainKey}` };
          }

          // Update the checklist item
          item.status = input.status;
          item.notes = input.notes;
          item.source = 'conversation';

          // Recalculate domain completeness
          const known = domain.items.filter((i: any) => i.status === 'known').length;
          const partial = domain.items.filter((i: any) => i.status === 'partial').length;
          domain.completeness = Math.round(((known + partial * 0.5) / domain.items.length) * 100);

          // Recalculate overall completeness
          let totalKnown = 0, totalItems = 0;
          for (const d of Object.values(checklist.domains) as any[]) {
            const k = d.items.filter((i: any) => i.status === 'known').length;
            const p = d.items.filter((i: any) => i.status === 'partial').length;
            totalKnown += k + p * 0.5;
            totalItems += d.items.length;
          }
          checklist.overall_completeness = Math.round((totalKnown / totalItems) * 100);
          checklist.last_updated = new Date().toISOString().split('T')[0];

          // Write updated checklist
          fs.writeFileSync(checklistPath, JSON.stringify(checklist, null, 2));

          // Write structured data to appropriate vault location
          const vaultRoot = '/srv/focus-flow';
          if (input.data) {
            if (domainKey === 'founder_identity' || domainKey === 'skills_expertise' || domainKey === 'strategic_context' || domainKey === 'operational_reality') {
              // Merge into founder profile
              const profilePath = path.join(vaultRoot, '10_profile/founder.json');
              try {
                const profileRaw = fs.readFileSync(profilePath, 'utf-8');
                const profile = JSON.parse(profileRaw);
                if (!profile.profiling_data) profile.profiling_data = {};
                if (!profile.profiling_data[domainKey]) profile.profiling_data[domainKey] = {};
                profile.profiling_data[domainKey][itemKey] = input.data;
                profile.updated_at = new Date().toISOString();
                fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
              } catch {
                // Profile write failed, non-critical
              }
            }
          }

          // Also store to Mem0 for semantic search
          if (mem0Service.isAvailable) {
            try {
              await mem0Service.addExplicitMemory(
                `[Profiling: ${domainKey}/${itemKey}] ${input.notes}`,
                { userId: DEFAULT_USER, tags: ['profiling', domainKey] }
              );
            } catch {
              // Mem0 write failed, non-critical
            }
          }

          return {
            success: true,
            data: {
              domain: domainKey,
              item_key: itemKey,
              status: input.status,
              domain_completeness: domain.completeness,
              overall_completeness: checklist.overall_completeness,
              message: `Updated ${domain.label}: "${item.label}" → ${input.status} (${checklist.overall_completeness}% overall)`,
            },
          };
        } catch (e: any) {
          return { success: false, error: `Failed to update profile data: ${e.message}` };
        }
      }

      case 'get_profiling_summary': {
        const checklistPath = path.resolve('/srv/focus-flow/07_system/agent/profiling-checklist.json');
        try {
          const raw = fs.readFileSync(checklistPath, 'utf-8');
          const checklist = JSON.parse(raw);

          const domainSummaries: any[] = [];
          let totalKnown = 0, totalPartial = 0, totalUnknown = 0;

          for (const [key, domain] of Object.entries(checklist.domains) as any[]) {
            const known = domain.items.filter((i: any) => i.status === 'known').length;
            const partial = domain.items.filter((i: any) => i.status === 'partial').length;
            const unknown = domain.items.filter((i: any) => i.status === 'unknown').length;
            const stale = domain.items.filter((i: any) => i.status === 'stale').length;

            totalKnown += known;
            totalPartial += partial;
            totalUnknown += unknown;

            domainSummaries.push({
              domain: key,
              label: domain.label,
              priority: domain.priority,
              completeness: domain.completeness,
              known,
              partial,
              unknown,
              stale,
              total: domain.items.length,
            });
          }

          // Generate natural language summary
          const strongDomains = domainSummaries.filter(d => d.completeness >= 50).map(d => `${d.label} (${d.completeness}%)`);
          const weakDomains = domainSummaries.filter(d => d.completeness < 20).map(d => `${d.label} (${d.completeness}%)`);

          let narrative = `My knowledge of your business is at ${checklist.overall_completeness}%.`;
          if (strongDomains.length > 0) {
            narrative += ` Strongest areas: ${strongDomains.join(', ')}.`;
          }
          if (weakDomains.length > 0) {
            narrative += ` Biggest gaps: ${weakDomains.join(', ')}.`;
          }

          return {
            success: true,
            data: {
              overall_completeness: checklist.overall_completeness,
              last_updated: checklist.last_updated,
              domains: domainSummaries,
              counts: { known: totalKnown, partial: totalPartial, unknown: totalUnknown },
              narrative,
              message: narrative,
            },
          };
        } catch (e: any) {
          return { success: false, error: `Failed to read profiling summary: ${e.message}` };
        }
      }

      // ==================== Strategic Directive ====================
      case 'update_directive': {
        const directivePath = path.resolve('/srv/focus-flow/07_system/directives/active-directive.md');
        const now = new Date().toISOString().split('T')[0];
        const content = `# ACTIVE STRATEGIC DIRECTIVE
Updated: ${now}

## Primary Focus: ${input.focus}
${input.details || `Your core responsibility right now is helping Vimo with: ${input.focus}. Evaluate every conversation, project review, and strategic decision through this lens.`}
`;

        try {
          const dir = path.dirname(directivePath);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(directivePath, content);
          return {
            success: true,
            data: {
              focus: input.focus,
              message: `Strategic directive updated: focus is now "${input.focus}"`,
            },
          };
        } catch (e: any) {
          return { success: false, error: `Failed to update directive: ${e.message}` };
        }
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (error: any) {
    console.error(`[ToolExecutor] Error executing ${toolName}:`, error.message);
    return { success: false, error: error.message };
  }
}
