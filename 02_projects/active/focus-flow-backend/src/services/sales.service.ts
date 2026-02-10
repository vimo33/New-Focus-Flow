import * as fs from 'fs/promises';
import * as path from 'path';
import { getVaultPath } from '../utils/file-operations';
import { generateId } from '../utils/id-generator';

export type DealStage = 'lead' | 'qualified' | 'demo' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

export interface Deal {
  id: string;
  title: string;
  contact_id?: string;
  project_id?: string;
  stage: DealStage;
  value?: number;
  currency: string;
  description?: string;
  expected_close_date?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  metadata?: Record<string, any>;
}

const SALES_DIR = '09_crm/deals';

export class SalesService {
  private async ensureDir() {
    await fs.mkdir(path.join(getVaultPath(), SALES_DIR), { recursive: true });
  }

  async createDeal(data: Partial<Deal>): Promise<Deal> {
    await this.ensureDir();
    const deal: Deal = {
      id: generateId('deal'),
      title: data.title || 'Untitled Deal',
      contact_id: data.contact_id,
      project_id: data.project_id,
      stage: data.stage || 'lead',
      value: data.value,
      currency: data.currency || 'USD',
      description: data.description,
      expected_close_date: data.expected_close_date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: data.metadata,
    };

    const filePath = path.join(getVaultPath(), SALES_DIR, `${deal.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(deal, null, 2));
    return deal;
  }

  async getDeals(stage?: DealStage): Promise<Deal[]> {
    await this.ensureDir();
    const dir = path.join(getVaultPath(), SALES_DIR);
    try {
      const files = await fs.readdir(dir);
      const deals: Deal[] = [];
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const data = JSON.parse(await fs.readFile(path.join(dir, file), 'utf-8'));
        if (stage && data.stage !== stage) continue;
        deals.push(data);
      }
      return deals.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    } catch {
      return [];
    }
  }

  async getDeal(id: string): Promise<Deal | null> {
    try {
      const filePath = path.join(getVaultPath(), SALES_DIR, `${id}.json`);
      return JSON.parse(await fs.readFile(filePath, 'utf-8'));
    } catch {
      return null;
    }
  }

  async updateDeal(id: string, data: Partial<Deal>): Promise<Deal | null> {
    const deal = await this.getDeal(id);
    if (!deal) return null;

    const updated: Deal = {
      ...deal,
      ...data,
      id: deal.id,
      updated_at: new Date().toISOString(),
    };

    // Track stage transitions
    if (data.stage && data.stage !== deal.stage) {
      if (data.stage === 'closed_won' || data.stage === 'closed_lost') {
        updated.closed_at = new Date().toISOString();
      }
    }

    const filePath = path.join(getVaultPath(), SALES_DIR, `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(updated, null, 2));
    return updated;
  }

  async getPipelineSummary(): Promise<Record<DealStage, { count: number; total_value: number }>> {
    const deals = await this.getDeals();
    const stages: DealStage[] = ['lead', 'qualified', 'demo', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
    const summary: Record<string, { count: number; total_value: number }> = {};

    for (const stage of stages) {
      const stageDeals = deals.filter(d => d.stage === stage);
      summary[stage] = {
        count: stageDeals.length,
        total_value: stageDeals.reduce((sum, d) => sum + (d.value || 0), 0),
      };
    }

    return summary as Record<DealStage, { count: number; total_value: number }>;
  }
}

export const salesService = new SalesService();
