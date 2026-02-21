/**
 * Budget Service - Read/write cost-budget.json, calculate spend
 */

import { readJsonFile, writeJsonFile, getVaultPath } from '../utils/file-operations';
import fs from 'fs/promises';

interface BudgetConfig {
  daily_budget_usd: number;
  weekly_budget_usd: number;
  alert_threshold_pct: number;
  hard_stop: boolean;
  [key: string]: unknown;
}

interface SpendEntry {
  date: string;
  cost_usd: number;
  model?: string;
  caller?: string;
}

const BUDGET_PATH = () => getVaultPath('07_system/agent/cost-budget.json');
const SPEND_LOG_DIR = () => getVaultPath('07_system/agent/cost-logs');

const DEFAULT_BUDGET: BudgetConfig = {
  daily_budget_usd: 20,
  weekly_budget_usd: 100,
  alert_threshold_pct: 80,
  hard_stop: true,
};

async function getBudget(): Promise<BudgetConfig> {
  const config = await readJsonFile<BudgetConfig>(BUDGET_PATH());
  return config ?? DEFAULT_BUDGET;
}

async function updateBudget(updates: Partial<BudgetConfig>): Promise<BudgetConfig> {
  const current = await getBudget();
  const merged = { ...current, ...updates };
  await writeJsonFile(BUDGET_PATH(), merged);
  return merged;
}

async function getTodaySpend(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  return getSpendForDate(today);
}

async function getSpendForDate(date: string): Promise<number> {
  // Try to read cost-tracker log for the given date
  const logPath = getVaultPath(`07_system/agent/cost-logs/${date}.json`);
  const entries = await readJsonFile<SpendEntry[]>(logPath);
  if (!entries) return 0;
  return entries.reduce((sum, e) => sum + (e.cost_usd || 0), 0);
}

async function getWeekSpend(): Promise<number> {
  const now = new Date();
  const dayOfWeek = now.getDay();
  let total = 0;

  for (let i = 0; i <= dayOfWeek; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    total += await getSpendForDate(dateStr);
  }

  return total;
}

async function getFullBudgetStatus() {
  const config = await getBudget();
  const todaySpend = await getTodaySpend();
  const weekSpend = await getWeekSpend();

  return {
    config,
    today: {
      spent: Math.round(todaySpend * 100) / 100,
      budget: config.daily_budget_usd,
      pct: config.daily_budget_usd > 0 ? Math.round((todaySpend / config.daily_budget_usd) * 100) : 0,
    },
    week: {
      spent: Math.round(weekSpend * 100) / 100,
      budget: config.weekly_budget_usd,
      pct: config.weekly_budget_usd > 0 ? Math.round((weekSpend / config.weekly_budget_usd) * 100) : 0,
    },
    alert_threshold_pct: config.alert_threshold_pct,
  };
}

export const budgetService = {
  getBudget,
  updateBudget,
  getTodaySpend,
  getWeekSpend,
  getFullBudgetStatus,
};
