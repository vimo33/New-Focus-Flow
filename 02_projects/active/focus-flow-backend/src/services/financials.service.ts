import * as fs from 'fs/promises';
import * as path from 'path';
import { getVaultPath } from '../utils/file-operations';
import { generateId } from '../utils/id-generator';

export type RevenueType = 'recurring' | 'one_time' | 'retainer' | 'royalty' | 'equity';
export type CostCategory = 'tools' | 'hosting' | 'contractors' | 'marketing' | 'office' | 'insurance' | 'other';

export interface RevenueStream {
  id: string;
  project_id?: string;
  source: string;
  type: RevenueType;
  amount_monthly: number;
  currency: string;
  start_date?: string;
  end_date?: string;
  active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CostItem {
  id: string;
  name: string;
  category: CostCategory;
  amount_monthly: number;
  currency: string;
  active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialGoals {
  income_goal: number;
  safety_net_months: number;
  runway_months?: number;
  currency: string;
  updated_at: string;
}

export interface PortfolioFinancials {
  total_monthly_revenue: number;
  total_monthly_costs: number;
  net_monthly: number;
  currency: string;
  revenue_streams: RevenueStream[];
  cost_items: CostItem[];
  goals: FinancialGoals | null;
  runway_months: number | null;
}

export interface FinancialSnapshot {
  id: string;
  month: string;
  year: number;
  total_revenue: number;
  total_costs: number;
  net: number;
  currency: string;
  revenue_breakdown: { source: string; amount: number }[];
  cost_breakdown: { category: string; amount: number }[];
  created_at: string;
}

const FINANCIALS_DIR = '10_profile/financials';
const REVENUE_DIR = path.join(FINANCIALS_DIR, 'revenue');
const COSTS_DIR = path.join(FINANCIALS_DIR, 'costs');
const SNAPSHOTS_DIR = path.join(FINANCIALS_DIR, 'snapshots');
const GOALS_FILE = path.join(FINANCIALS_DIR, 'goals.json');

export class FinancialsService {
  private async ensureDirs() {
    const base = getVaultPath();
    await fs.mkdir(path.join(base, REVENUE_DIR), { recursive: true });
    await fs.mkdir(path.join(base, COSTS_DIR), { recursive: true });
    await fs.mkdir(path.join(base, SNAPSHOTS_DIR), { recursive: true });
  }

  private async getAllRevenue(): Promise<RevenueStream[]> {
    await this.ensureDirs();
    const dir = path.join(getVaultPath(), REVENUE_DIR);
    try {
      const files = await fs.readdir(dir);
      const streams: RevenueStream[] = [];
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const data = JSON.parse(await fs.readFile(path.join(dir, file), 'utf-8'));
        streams.push(data);
      }
      return streams;
    } catch {
      return [];
    }
  }

  private async getAllCosts(): Promise<CostItem[]> {
    await this.ensureDirs();
    const dir = path.join(getVaultPath(), COSTS_DIR);
    try {
      const files = await fs.readdir(dir);
      const items: CostItem[] = [];
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const data = JSON.parse(await fs.readFile(path.join(dir, file), 'utf-8'));
        items.push(data);
      }
      return items;
    } catch {
      return [];
    }
  }

  async getPortfolioFinancials(): Promise<PortfolioFinancials> {
    const revenue_streams = await this.getAllRevenue();
    const cost_items = await this.getAllCosts();
    const goals = await this.getGoals();

    const activeRevenue = revenue_streams.filter(r => r.active);
    const activeCosts = cost_items.filter(c => c.active);

    const total_monthly_revenue = activeRevenue.reduce((sum, r) => sum + r.amount_monthly, 0);
    const total_monthly_costs = activeCosts.reduce((sum, c) => sum + c.amount_monthly, 0);
    const net_monthly = total_monthly_revenue - total_monthly_costs;

    let runway_months: number | null = null;
    if (goals && goals.safety_net_months && net_monthly > 0) {
      runway_months = goals.safety_net_months;
    } else if (total_monthly_costs > 0 && net_monthly > 0) {
      runway_months = null;
    } else if (total_monthly_costs > 0 && total_monthly_revenue > 0 && net_monthly <= 0) {
      runway_months = 0;
    }

    return {
      total_monthly_revenue,
      total_monthly_costs,
      net_monthly,
      currency: goals?.currency || 'USD',
      revenue_streams,
      cost_items,
      goals,
      runway_months,
    };
  }

  async getGoals(): Promise<FinancialGoals | null> {
    try {
      const filePath = path.join(getVaultPath(), GOALS_FILE);
      const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      return data;
    } catch {
      return null;
    }
  }

  async setGoals(goals: Partial<FinancialGoals>): Promise<FinancialGoals> {
    await this.ensureDirs();
    const existing = await this.getGoals();
    const updated: FinancialGoals = {
      income_goal: goals.income_goal ?? existing?.income_goal ?? 0,
      safety_net_months: goals.safety_net_months ?? existing?.safety_net_months ?? 6,
      runway_months: goals.runway_months ?? existing?.runway_months,
      currency: goals.currency ?? existing?.currency ?? 'USD',
      updated_at: new Date().toISOString(),
    };

    const filePath = path.join(getVaultPath(), GOALS_FILE);
    await fs.writeFile(filePath, JSON.stringify(updated, null, 2));
    return updated;
  }

  async getProjectFinancials(projectId: string): Promise<{ revenue: RevenueStream[]; costs: CostItem[] }> {
    const allRevenue = await this.getAllRevenue();
    const allCosts = await this.getAllCosts();

    return {
      revenue: allRevenue.filter(r => r.project_id === projectId),
      costs: allCosts.filter(c => (c as any).project_id === projectId),
    };
  }

  async addRevenue(data: Partial<RevenueStream>): Promise<RevenueStream> {
    await this.ensureDirs();
    const stream: RevenueStream = {
      id: generateId('rev'),
      project_id: data.project_id,
      source: data.source || 'Unknown',
      type: data.type || 'one_time',
      amount_monthly: data.amount_monthly || 0,
      currency: data.currency || 'USD',
      start_date: data.start_date,
      end_date: data.end_date,
      active: data.active !== undefined ? data.active : true,
      notes: data.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const filePath = path.join(getVaultPath(), REVENUE_DIR, `${stream.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(stream, null, 2));
    return stream;
  }

  async updateRevenue(id: string, data: Partial<RevenueStream>): Promise<RevenueStream | null> {
    try {
      const filePath = path.join(getVaultPath(), REVENUE_DIR, `${id}.json`);
      const existing = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      const updated = { ...existing, ...data, id: existing.id, updated_at: new Date().toISOString() };
      await fs.writeFile(filePath, JSON.stringify(updated, null, 2));
      return updated;
    } catch {
      return null;
    }
  }

  async deleteRevenue(id: string): Promise<boolean> {
    try {
      const filePath = path.join(getVaultPath(), REVENUE_DIR, `${id}.json`);
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async addCost(data: Partial<CostItem>): Promise<CostItem> {
    await this.ensureDirs();
    const item: CostItem = {
      id: generateId('cost'),
      name: data.name || 'Unknown',
      category: data.category || 'other',
      amount_monthly: data.amount_monthly || 0,
      currency: data.currency || 'USD',
      active: data.active !== undefined ? data.active : true,
      notes: data.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const filePath = path.join(getVaultPath(), COSTS_DIR, `${item.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(item, null, 2));
    return item;
  }

  async updateCost(id: string, data: Partial<CostItem>): Promise<CostItem | null> {
    try {
      const filePath = path.join(getVaultPath(), COSTS_DIR, `${id}.json`);
      const existing = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      const updated = { ...existing, ...data, id: existing.id, updated_at: new Date().toISOString() };
      await fs.writeFile(filePath, JSON.stringify(updated, null, 2));
      return updated;
    } catch {
      return null;
    }
  }

  async deleteCost(id: string): Promise<boolean> {
    try {
      const filePath = path.join(getVaultPath(), COSTS_DIR, `${id}.json`);
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async createSnapshot(): Promise<FinancialSnapshot> {
    await this.ensureDirs();
    const revenue = await this.getAllRevenue();
    const costs = await this.getAllCosts();

    const activeRevenue = revenue.filter(r => r.active);
    const activeCosts = costs.filter(c => c.active);

    const total_revenue = activeRevenue.reduce((sum, r) => sum + r.amount_monthly, 0);
    const total_costs = activeCosts.reduce((sum, c) => sum + c.amount_monthly, 0);

    const revenue_breakdown: { source: string; amount: number }[] = [];
    for (const r of activeRevenue) {
      const existing = revenue_breakdown.find(b => b.source === r.source);
      if (existing) {
        existing.amount += r.amount_monthly;
      } else {
        revenue_breakdown.push({ source: r.source, amount: r.amount_monthly });
      }
    }

    const cost_breakdown: { category: string; amount: number }[] = [];
    for (const c of activeCosts) {
      const existing = cost_breakdown.find(b => b.category === c.category);
      if (existing) {
        existing.amount += c.amount_monthly;
      } else {
        cost_breakdown.push({ category: c.category, amount: c.amount_monthly });
      }
    }

    const now = new Date();
    const snapshot: FinancialSnapshot = {
      id: generateId('snap'),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      year: now.getFullYear(),
      total_revenue,
      total_costs,
      net: total_revenue - total_costs,
      currency: 'USD',
      revenue_breakdown,
      cost_breakdown,
      created_at: now.toISOString(),
    };

    const filePath = path.join(getVaultPath(), SNAPSHOTS_DIR, `${snapshot.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2));
    return snapshot;
  }

  async getSnapshots(): Promise<FinancialSnapshot[]> {
    await this.ensureDirs();
    const dir = path.join(getVaultPath(), SNAPSHOTS_DIR);
    try {
      const files = await fs.readdir(dir);
      const snapshots: FinancialSnapshot[] = [];
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const data = JSON.parse(await fs.readFile(path.join(dir, file), 'utf-8'));
        snapshots.push(data);
      }
      return snapshots.sort((a, b) => b.created_at.localeCompare(a.created_at));
    } catch {
      return [];
    }
  }
}

export const financialsService = new FinancialsService();
