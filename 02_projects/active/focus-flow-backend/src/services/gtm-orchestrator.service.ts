import path from 'path';
import {
  GTMStrategy,
  GTMStrategyStatus,
  ContentCalendarEntry,
  CalendarEntryStatus,
  ContentChannel,
  GTMDashboard,
} from '../models/types';
import { contentEngine } from './content-engine.service';
import { cachedInference } from './cached-inference.service';
import {
  getVaultPath,
  ensureDir,
  readJsonFile,
  writeJsonFile,
  listFiles,
  deleteFile,
} from '../utils/file-operations';
import { generateId } from '../utils/id-generator';

const LOG_PREFIX = '[GTMOrchestrator]';

function strategyPath(projectId: string): string {
  return getVaultPath('11_marketing', projectId, 'strategy.json');
}

function calendarDir(projectId: string): string {
  return getVaultPath('11_marketing', projectId, 'calendar');
}

function calendarEntryPath(projectId: string, entryId: string): string {
  return path.join(calendarDir(projectId), `${entryId}.json`);
}

class GTMOrchestratorService {
  // ============================================================================
  // Strategy CRUD
  // ============================================================================

  async getStrategy(projectId: string): Promise<GTMStrategy | null> {
    return readJsonFile<GTMStrategy>(strategyPath(projectId));
  }

  async createStrategy(projectId: string, data: Partial<GTMStrategy>): Promise<GTMStrategy> {
    const strategy: GTMStrategy = {
      id: generateId('gtm'),
      project_id: projectId,
      status: (data.status as GTMStrategyStatus) || 'planned',
      council_verdict_id: data.council_verdict_id,
      target_audience: data.target_audience || '',
      value_proposition: data.value_proposition || '',
      channels: data.channels || [],
      messaging_pillars: data.messaging_pillars || [],
      launch_date: data.launch_date,
      kpis: data.kpis || [],
      playbook_notes: data.playbook_notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await writeJsonFile(strategyPath(projectId), strategy);
    console.log(`${LOG_PREFIX} Created strategy for project ${projectId}`);
    return strategy;
  }

  async updateStrategy(projectId: string, updates: Partial<GTMStrategy>): Promise<GTMStrategy | null> {
    const strategy = await this.getStrategy(projectId);
    if (!strategy) return null;

    const updated = {
      ...strategy,
      ...updates,
      id: strategy.id,
      project_id: strategy.project_id,
      updated_at: new Date().toISOString(),
    };

    await writeJsonFile(strategyPath(projectId), updated);
    return updated;
  }

  // ============================================================================
  // AI Strategy Generation
  // ============================================================================

  async generateStrategy(
    projectId: string,
    title: string,
    description: string,
    councilVerdictId?: string
  ): Promise<GTMStrategy> {
    console.log(`${LOG_PREFIX} Generating GTM strategy for "${title}"`);

    const result = await cachedInference.infer({
      task_type: 'content_creation',
      budget_tier: 'standard',
      system_prompt: `You are a GTM (Go-to-Market) strategist. Given a product/project description, generate a comprehensive GTM strategy. Respond with valid JSON only, no markdown fences.`,
      messages: [{
        role: 'user',
        content: `Generate a GTM strategy for this project:

Title: ${title}
Description: ${description}

Respond with JSON:
{
  "target_audience": "description of ideal customer/user",
  "value_proposition": "core value proposition",
  "channels": ["blog", "twitter", "linkedin", "email", "newsletter"],
  "messaging_pillars": ["pillar1", "pillar2", "pillar3"],
  "kpis": [{"name": "kpi name", "target": 100}],
  "playbook_notes": "strategic notes and recommendations"
}

Pick 2-4 channels most relevant to this project. Include 3-5 KPIs with realistic targets. Keep messaging_pillars to 3-4 items.`,
      }],
      project_id: projectId,
      max_tokens: 2000,
      temperature: 0.7,
    });

    let parsed: any;
    try {
      const cleaned = result.content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.error(`${LOG_PREFIX} Failed to parse AI response:`, err);
      parsed = {
        target_audience: 'Tech-savvy professionals',
        value_proposition: description || title,
        channels: ['blog', 'linkedin'],
        messaging_pillars: ['Innovation', 'Efficiency', 'Quality'],
        kpis: [{ name: 'Monthly visitors', target: 1000 }],
        playbook_notes: result.content,
      };
    }

    return this.createStrategy(projectId, {
      ...parsed,
      status: 'active',
      council_verdict_id: councilVerdictId,
    });
  }

  // ============================================================================
  // Calendar CRUD
  // ============================================================================

  async getCalendarEntries(
    projectId: string,
    filters?: { status?: CalendarEntryStatus; channel?: ContentChannel }
  ): Promise<ContentCalendarEntry[]> {
    const dir = calendarDir(projectId);
    const files = await listFiles(dir);
    const entries: ContentCalendarEntry[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const entry = await readJsonFile<ContentCalendarEntry>(path.join(dir, file));
      if (!entry) continue;

      if (filters?.status && entry.status !== filters.status) continue;
      if (filters?.channel && entry.channel !== filters.channel) continue;

      entries.push(entry);
    }

    return entries.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  }

  async createCalendarEntry(
    projectId: string,
    data: Partial<ContentCalendarEntry>
  ): Promise<ContentCalendarEntry> {
    const entry: ContentCalendarEntry = {
      id: generateId('cal'),
      project_id: projectId,
      title: data.title || 'Untitled',
      content_type: data.content_type || 'blog_post',
      brief: data.brief || '',
      tone: data.tone || 'professional',
      channel: data.channel || 'blog',
      scheduled_date: data.scheduled_date || new Date().toISOString().split('T')[0],
      status: (data.status as CalendarEntryStatus) || 'planned',
      draft_content: data.draft_content,
      published_url: data.published_url,
      published_at: data.published_at,
      approval_id: data.approval_id,
      metadata: data.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await writeJsonFile(calendarEntryPath(projectId, entry.id), entry);
    return entry;
  }

  async updateCalendarEntry(
    projectId: string,
    entryId: string,
    updates: Partial<ContentCalendarEntry>
  ): Promise<ContentCalendarEntry | null> {
    const entryPath = calendarEntryPath(projectId, entryId);
    const entry = await readJsonFile<ContentCalendarEntry>(entryPath);
    if (!entry) return null;

    const updated = {
      ...entry,
      ...updates,
      id: entry.id,
      project_id: entry.project_id,
      updated_at: new Date().toISOString(),
    };

    await writeJsonFile(entryPath, updated);
    return updated;
  }

  async deleteCalendarEntry(projectId: string, entryId: string): Promise<boolean> {
    try {
      await deleteFile(calendarEntryPath(projectId, entryId));
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // AI Calendar Generation
  // ============================================================================

  async generateCalendar(
    projectId: string,
    strategy: GTMStrategy,
    weeksAhead: number = 4
  ): Promise<ContentCalendarEntry[]> {
    console.log(`${LOG_PREFIX} Generating ${weeksAhead}-week content calendar`);

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + weeksAhead * 7);

    const result = await cachedInference.infer({
      task_type: 'content_creation',
      budget_tier: 'standard',
      system_prompt: `You are a content calendar planner. Generate a content calendar as a JSON array. Respond with valid JSON only, no markdown fences.`,
      messages: [{
        role: 'user',
        content: `Create a content calendar for ${weeksAhead} weeks (${today.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}).

Strategy context:
- Target Audience: ${strategy.target_audience}
- Value Proposition: ${strategy.value_proposition}
- Channels: ${strategy.channels.join(', ')}
- Messaging Pillars: ${strategy.messaging_pillars.join(', ')}

Generate 2-3 entries per week mixing the available channels. Respond with a JSON array:
[{
  "title": "content title",
  "content_type": "blog_post|social_post|email|marketing_copy",
  "brief": "brief description of what to write",
  "tone": "professional|casual|technical|persuasive",
  "channel": "blog|twitter|linkedin|email|newsletter",
  "scheduled_date": "YYYY-MM-DD"
}]

Distribute evenly across weeks and channels. Make titles specific and actionable.`,
      }],
      project_id: projectId,
      max_tokens: 4000,
      temperature: 0.7,
    });

    let parsed: any[];
    try {
      const cleaned = result.content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) parsed = [];
    } catch (err) {
      console.error(`${LOG_PREFIX} Failed to parse calendar response:`, err);
      parsed = [];
    }

    const entries: ContentCalendarEntry[] = [];
    for (const item of parsed) {
      const entry = await this.createCalendarEntry(projectId, {
        title: item.title,
        content_type: item.content_type || 'blog_post',
        brief: item.brief || item.title,
        tone: item.tone || 'professional',
        channel: item.channel || 'blog',
        scheduled_date: item.scheduled_date,
        status: 'planned',
      });
      entries.push(entry);
    }

    console.log(`${LOG_PREFIX} Generated ${entries.length} calendar entries`);
    return entries;
  }

  // ============================================================================
  // Auto-Draft Due Entries
  // ============================================================================

  async draftDueEntries(projectId: string): Promise<ContentCalendarEntry[]> {
    const today = new Date().toISOString().split('T')[0];
    const entries = await this.getCalendarEntries(projectId, { status: 'planned' });
    const dueEntries = entries.filter(e => e.scheduled_date <= today);
    const drafted: ContentCalendarEntry[] = [];

    const maxLengths: Record<string, number> = {
      twitter: 280,
      linkedin: 500,
      blog: 2000,
      email: 1000,
      newsletter: 1500,
    };

    for (const entry of dueEntries) {
      try {
        const maxLength = maxLengths[entry.channel] || 1000;
        const contentType = entry.channel === 'twitter' || entry.channel === 'linkedin'
          ? 'social_post' : entry.channel === 'email' || entry.channel === 'newsletter'
          ? 'email' : 'blog_post';

        const result = await contentEngine.generate({
          content_type: contentType as any,
          brief: entry.brief,
          project_id: projectId,
          tone: (entry.tone as any) || 'professional',
          max_length: maxLength,
        });

        const updated = await this.updateCalendarEntry(projectId, entry.id, {
          status: 'drafted',
          draft_content: result.content,
        });

        if (updated) drafted.push(updated);
      } catch (err: any) {
        console.error(`${LOG_PREFIX} Failed to draft entry ${entry.id}:`, err.message);
      }
    }

    console.log(`${LOG_PREFIX} Drafted ${drafted.length}/${dueEntries.length} due entries`);
    return drafted;
  }

  // ============================================================================
  // Dashboard
  // ============================================================================

  async getDashboard(projectId: string): Promise<GTMDashboard> {
    const strategy = await this.getStrategy(projectId);
    const entries = await this.getCalendarEntries(projectId);

    const today = new Date().toISOString().split('T')[0];

    return {
      strategy,
      calendar_entries: entries,
      upcoming_count: entries.filter(e => e.status === 'planned' && e.scheduled_date > today).length,
      drafted_count: entries.filter(e => e.status === 'drafted').length,
      published_count: entries.filter(e => e.status === 'published').length,
      leads_generated: 0,
    };
  }

  // ============================================================================
  // Pipeline Hook
  // ============================================================================

  async onProjectLive(projectId: string, title: string, description: string): Promise<void> {
    const existing = await this.getStrategy(projectId);
    if (existing) {
      console.log(`${LOG_PREFIX} Strategy already exists for ${projectId}, skipping init`);
      return;
    }

    await this.createStrategy(projectId, {
      status: 'planned',
      target_audience: '',
      value_proposition: description || title,
      channels: [],
      messaging_pillars: [],
      kpis: [],
      playbook_notes: `Auto-created when project "${title}" reached live phase.`,
    });

    console.log(`${LOG_PREFIX} Initialized skeleton GTM strategy for ${projectId}`);
  }
}

export const gtmOrchestrator = new GTMOrchestratorService();
