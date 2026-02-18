import fs from 'fs/promises';
import path from 'path';
import { getVaultPath, ensureDir, listFiles } from '../utils/file-operations';

const REPORTS_DIR = getVaultPath('07_system', 'reports');

export interface DetectedEvent {
  category: string;
  entity_name: string;
  title: string;
  description: string;
  evidence_url?: string;
  project_relevance: string[];
  urgency: 'this-week' | 'this-month' | 'this-quarter';
  suggested_action: string;
}

export interface EventReport {
  task_type: string;
  status: string;
  generated_at: string;
  previous_scan?: string;
  events: DetectedEvent[];
  events_new: number;
  events_carried_over: number;
  scan_coverage: {
    competitors_checked: number;
    markets_checked: number;
    contacts_checked: number;
    projects_checked: number;
  };
  confidence: number;
}

class EventDetectionService {
  async getLatestEvents(): Promise<EventReport | null> {
    const report = await this.findLatestReport('event-detect');
    return report;
  }

  async getUrgentEvents(): Promise<DetectedEvent[]> {
    const report = await this.getLatestEvents();
    if (!report) return [];
    return report.events.filter(e => e.urgency === 'this-week');
  }

  async getEventHistory(days: number = 7): Promise<EventReport[]> {
    await ensureDir(REPORTS_DIR);
    const files = await listFiles(REPORTS_DIR);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const reports: EventReport[] = [];
    for (const file of files.sort().reverse()) {
      if (!file.startsWith('event-detect-') || !file.endsWith('.json')) continue;

      const dateStr = file.replace('event-detect-', '').replace('.json', '');
      if (dateStr < cutoff.toISOString().slice(0, 10)) break;

      try {
        const content = await fs.readFile(path.join(REPORTS_DIR, file), 'utf-8');
        reports.push(JSON.parse(content));
      } catch {
        // Skip malformed files
      }
    }

    return reports;
  }

  async getEventsByProject(projectId: string, days: number = 14): Promise<DetectedEvent[]> {
    const history = await this.getEventHistory(days);
    const events: DetectedEvent[] = [];
    const seen = new Set<string>();

    for (const report of history) {
      for (const event of report.events) {
        if (event.project_relevance.includes(projectId)) {
          const key = `${event.category}:${event.entity_name}:${event.title}`;
          if (!seen.has(key)) {
            seen.add(key);
            events.push(event);
          }
        }
      }
    }

    return events;
  }

  private async findLatestReport(prefix: string): Promise<EventReport | null> {
    await ensureDir(REPORTS_DIR);
    const files = await listFiles(REPORTS_DIR);
    const matching = files
      .filter(f => f.startsWith(`${prefix}-`) && f.endsWith('.json'))
      .sort()
      .reverse();

    if (matching.length === 0) return null;

    try {
      const content = await fs.readFile(path.join(REPORTS_DIR, matching[0]), 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}

export const eventDetectionService = new EventDetectionService();
