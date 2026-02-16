import * as fs from 'fs/promises';
import * as path from 'path';
import { VaultService } from './vault.service';
import { financialsService } from './financials.service';
import { networkImporterService } from './network-importer.service';
import { cachedInference } from './cached-inference.service';
import { getVaultPath } from '../utils/file-operations';
import { generateId } from '../utils/id-generator';
import type { Project, Task, WeeklyKPI, WeeklyReport } from '../models/types';

const vault = new VaultService();
const REPORTS_DIR = '07_system/reports/weekly';

class WeeklyReportService {
  private async ensureDir() {
    const dir = path.join(getVaultPath(), REPORTS_DIR);
    await fs.mkdir(dir, { recursive: true });
  }

  async generateReport(): Promise<WeeklyReport> {
    await this.ensureDir();

    const now = new Date();
    const weekEnd = new Date(now);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const [projects, tasks, kpis, intelligence, activityVolume] = await Promise.all([
      vault.getProjects(),
      vault.getTasks(),
      this.calculateKPIs(weekStart, weekEnd),
      this.generateIntelligence(weekStart),
      this.calculateActivityVolume(weekStart),
    ]);

    // Calculate momentum: compare this week's task completion to previous week
    const thisWeekCompleted = tasks.filter(t =>
      t.status === 'done' && t.completed_at &&
      new Date(t.completed_at) >= weekStart && new Date(t.completed_at) <= weekEnd
    ).length;
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekCompleted = tasks.filter(t =>
      t.status === 'done' && t.completed_at &&
      new Date(t.completed_at) >= prevWeekStart && new Date(t.completed_at) < weekStart
    ).length;
    const overall_momentum = prevWeekCompleted > 0
      ? Math.round(((thisWeekCompleted - prevWeekCompleted) / prevWeekCompleted) * 100)
      : thisWeekCompleted > 0 ? 100 : 0;

    // Generate retrospective via AI
    let retrospective = 'Weekly report generated successfully.';
    try {
      const result = await cachedInference.infer({
        task_type: 'fast_classification',
        budget_tier: 'economy',
        system_prompt: 'You are a concise business analyst. Write a 2-3 sentence weekly retrospective summary with actionable recommendations.',
        messages: [{
          role: 'user',
          content: `Weekly data:\n- Active projects: ${projects.filter(p => p.status === 'active').length}\n- Tasks completed this week: ${thisWeekCompleted}\n- KPIs: ${kpis.map(k => `${k.label}: ${k.value} (${k.trend_percentage})`).join(', ')}\n- Intelligence: ${intelligence.join('; ')}\n\nWrite a brief retrospective.`,
        }],
      });
      retrospective = result.content;
    } catch {
      // Use default
    }

    const report: WeeklyReport = {
      id: generateId('wr'),
      week_start: weekStart.toISOString().split('T')[0],
      week_end: weekEnd.toISOString().split('T')[0],
      overall_momentum,
      kpis,
      strategic_intelligence: intelligence,
      activity_volume: activityVolume,
      retrospective,
      created_at: now.toISOString(),
    };

    const filePath = path.join(getVaultPath(), REPORTS_DIR, `${report.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(report, null, 2));

    return report;
  }

  async getLatestReport(): Promise<WeeklyReport | null> {
    await this.ensureDir();
    const dir = path.join(getVaultPath(), REPORTS_DIR);
    try {
      const files = await fs.readdir(dir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      if (jsonFiles.length === 0) return null;

      const reports: WeeklyReport[] = [];
      for (const file of jsonFiles) {
        try {
          const data = JSON.parse(await fs.readFile(path.join(dir, file), 'utf-8'));
          reports.push(data);
        } catch {
          // Skip invalid files
        }
      }

      if (reports.length === 0) return null;
      reports.sort((a, b) => b.created_at.localeCompare(a.created_at));
      return reports[0];
    } catch {
      return null;
    }
  }

  async getReports(limit: number = 10): Promise<WeeklyReport[]> {
    await this.ensureDir();
    const dir = path.join(getVaultPath(), REPORTS_DIR);
    try {
      const files = await fs.readdir(dir);
      const reports: WeeklyReport[] = [];
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const data = JSON.parse(await fs.readFile(path.join(dir, file), 'utf-8'));
          reports.push(data);
        } catch {
          // Skip invalid files
        }
      }
      reports.sort((a, b) => b.created_at.localeCompare(a.created_at));
      return reports.slice(0, limit);
    } catch {
      return [];
    }
  }

  private async calculateKPIs(weekStart: Date, weekEnd: Date): Promise<WeeklyKPI[]> {
    const financials = await financialsService.getPortfolioFinancials();
    const contacts = await networkImporterService.getContacts();
    const tasks = await vault.getTasks();

    const thisWeekCompleted = tasks.filter(t =>
      t.status === 'done' && t.completed_at &&
      new Date(t.completed_at) >= weekStart && new Date(t.completed_at) <= weekEnd
    ).length;
    const totalTasks = tasks.filter(t => t.status !== 'done').length + thisWeekCompleted;
    const efficiency = totalTasks > 0 ? Math.round((thisWeekCompleted / Math.max(totalTasks, 1)) * 100) : 0;

    // New contacts this week
    const newContactsThisWeek = contacts.filter(c =>
      new Date(c.created_at) >= weekStart && new Date(c.created_at) <= weekEnd
    ).length;

    const revenueStr = financials.total_monthly_revenue.toLocaleString('en-US');

    return [
      {
        label: 'Monthly Revenue',
        value: revenueStr,
        trend_direction: financials.net_monthly >= 0 ? 'up' : 'down',
        trend_percentage: `${financials.currency} ${financials.net_monthly >= 0 ? '+' : ''}${financials.net_monthly.toLocaleString('en-US')} net`,
        spark_data: [0, 0, 0, 0, financials.total_monthly_revenue],
      },
      {
        label: 'Task Efficiency',
        value: `${efficiency}%`,
        trend_direction: efficiency >= 50 ? 'up' : 'down',
        trend_percentage: `${thisWeekCompleted} completed`,
        spark_data: [0, 0, 0, 0, efficiency],
      },
      {
        label: 'Network Growth',
        value: String(newContactsThisWeek),
        trend_direction: newContactsThisWeek > 0 ? 'up' : 'flat',
        trend_percentage: `+${newContactsThisWeek} new`,
        spark_data: [0, 0, 0, 0, newContactsThisWeek],
      },
      {
        label: 'Active Projects',
        value: String((await vault.getProjects('active')).length),
        trend_direction: 'flat',
        trend_percentage: 'this week',
        spark_data: [0, 0, 0, 0, (await vault.getProjects('active')).length],
      },
    ];
  }

  private async generateIntelligence(weekStart: Date): Promise<string[]> {
    const [projects, tasks] = await Promise.all([
      vault.getProjects(),
      vault.getTasks(),
    ]);

    const activeProjects = projects.filter(p => p.status === 'active');
    const overdueTasks = tasks.filter(t =>
      t.status !== 'done' && t.due_date && new Date(t.due_date) < new Date()
    );

    try {
      const result = await cachedInference.infer({
        task_type: 'fast_classification',
        budget_tier: 'economy',
        system_prompt: 'Generate 3-5 brief strategic intelligence bullet points. Return a JSON array of strings.',
        messages: [{
          role: 'user',
          content: `Active projects: ${activeProjects.map(p => `${p.title} (phase: ${p.phase || 'n/a'})`).join(', ')}\nOverdue tasks: ${overdueTasks.length}\nTotal tasks pending: ${tasks.filter(t => t.status !== 'done').length}\n\nGenerate 3-5 strategic intelligence observations.`,
        }],
      });
      const parsed = JSON.parse(result.content);
      if (Array.isArray(parsed)) return parsed.slice(0, 5);
    } catch {
      // Fallback
    }

    // Fallback intelligence
    const bullets: string[] = [];
    if (activeProjects.length > 0) {
      bullets.push(`${activeProjects.length} active project(s) in progress.`);
    }
    if (overdueTasks.length > 0) {
      bullets.push(`${overdueTasks.length} overdue task(s) require attention.`);
    }
    bullets.push('Review project priorities for the upcoming week.');
    return bullets;
  }

  private async calculateActivityVolume(weekStart: Date): Promise<number[]> {
    const tasks = await vault.getTasks();
    const volume = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun

    for (const task of tasks) {
      if (task.completed_at) {
        const completedDate = new Date(task.completed_at);
        if (completedDate >= weekStart) {
          const dayOfWeek = completedDate.getDay();
          // Convert Sunday=0 to index 6, Mon=1 to index 0, etc.
          const idx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          volume[idx]++;
        }
      }
      // Count created tasks too
      const createdDate = new Date(task.created_at);
      if (createdDate >= weekStart) {
        const dayOfWeek = createdDate.getDay();
        const idx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        volume[idx]++;
      }
    }

    return volume;
  }
}

export const weeklyReportService = new WeeklyReportService();
