import fs from 'fs/promises';
import path from 'path';
import { getVaultPath, ensureDir, listFiles } from '../utils/file-operations';

const REPORTS_DIR = getVaultPath('07_system', 'reports');

export interface BriefingSection {
  title: string;
  detail: string;
  source: string;
}

export interface BriefingReport {
  task_type: string;
  status: string;
  generated_at: string;
  sections: {
    what_changed: BriefingSection[];
    focus_today: BriefingSection[];
    decisions_needed: BriefingSection[];
    insight: string;
  };
  narrative: string;
  word_count: number;
  sources_consulted: string[];
  confidence: number;
}

class BriefingService {
  async getToday(): Promise<BriefingReport | null> {
    const today = new Date().toISOString().slice(0, 10);
    return this.getBriefingForDate(today);
  }

  async getBriefingForDate(date: string): Promise<BriefingReport | null> {
    await ensureDir(REPORTS_DIR);
    const files = await listFiles(REPORTS_DIR);
    const matching = files
      .filter(f => f.startsWith(`morning-briefing-${date}`) && f.endsWith('.json'))
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

  async getHistory(days: number = 7): Promise<BriefingReport[]> {
    await ensureDir(REPORTS_DIR);
    const files = await listFiles(REPORTS_DIR);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const reports: BriefingReport[] = [];
    for (const file of files.sort().reverse()) {
      if (!file.startsWith('morning-briefing-') || !file.endsWith('.json')) continue;

      const dateStr = file.replace('morning-briefing-', '').replace('.json', '');
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

  async getNarrative(): Promise<string | null> {
    const briefing = await this.getToday();
    if (!briefing) return null;
    return briefing.narrative;
  }
}

export const briefingService = new BriefingService();
