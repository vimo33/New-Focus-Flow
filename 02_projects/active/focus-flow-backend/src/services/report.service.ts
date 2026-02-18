import fs from 'fs/promises';
import path from 'path';
import { getVaultPath, readJsonFile } from '../utils/file-operations';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReportSummary {
  id: string;
  type: string;
  title: string;
  status: string;
  created_at: string;
  project_id?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const REPORTS_DIR = '07_system/reports';

// ─── Service ─────────────────────────────────────────────────────────────────

class ReportService {
  async listReports(type?: string, limit = 20): Promise<ReportSummary[]> {
    const summaries: ReportSummary[] = [];
    const baseDir = getVaultPath(REPORTS_DIR);

    // Scan top-level JSON files
    await this.scanDirectory(baseDir, summaries);

    // Scan subdirectories (weekly/, etc.)
    try {
      const entries = await fs.readdir(baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await this.scanDirectory(path.join(baseDir, entry.name), summaries, entry.name);
        }
      }
    } catch {
      // Reports directory may not exist yet
    }

    // Sort by date descending
    summaries.sort((a, b) => b.created_at.localeCompare(a.created_at));

    // Filter by type if specified
    const filtered = type ? summaries.filter(s => s.type === type) : summaries;

    return filtered.slice(0, limit);
  }

  async getReport(id: string): Promise<any | null> {
    const baseDir = getVaultPath(REPORTS_DIR);

    // Search top-level
    const topLevel = path.join(baseDir, `${id}.json`);
    const topReport = await readJsonFile<any>(topLevel);
    if (topReport) return topReport;

    // Search subdirectories
    try {
      const entries = await fs.readdir(baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subPath = path.join(baseDir, entry.name, `${id}.json`);
          const report = await readJsonFile<any>(subPath);
          if (report) return report;
        }
      }
    } catch {
      // ignore
    }

    return null;
  }

  async getReportTypes(): Promise<string[]> {
    const reports = await this.listReports(undefined, 1000);
    const types = new Set(reports.map(r => r.type));
    return Array.from(types).sort();
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async scanDirectory(dir: string, summaries: ReportSummary[], subType?: string): Promise<void> {
    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        if (!stat.isFile()) continue;

        try {
          const content = await readJsonFile<any>(filePath);
          if (!content) continue;

          const id = content.id || path.basename(file, '.json');
          const type = subType || this.inferType(file);
          const title = content.title || content.report_title || this.titleFromFilename(file);
          const status = content.status || 'completed';
          const created_at = content.created_at || stat.mtime.toISOString();

          summaries.push({ id, type, title, status, created_at, project_id: content.project_id });
        } catch {
          // Skip malformed JSON files
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
  }

  private inferType(filename: string): string {
    // portfolio-analysis-2026-02-17.json → portfolio-analysis
    const base = path.basename(filename, '.json');
    const match = base.match(/^(.+?)-\d{4}-\d{2}-\d{2}/);
    if (match) return match[1];

    // wr-20260216-090068.json → weekly
    if (base.startsWith('wr-')) return 'weekly';

    return 'general';
  }

  private titleFromFilename(filename: string): string {
    const base = path.basename(filename, '.json');
    return base
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
}

export const reportService = new ReportService();
