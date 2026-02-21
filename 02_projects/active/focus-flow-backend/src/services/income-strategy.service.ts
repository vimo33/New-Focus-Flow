import path from 'path';
import {
  getVaultPath,
  ensureDir,
  readJsonFile,
  writeJsonFile,
} from '../utils/file-operations';
import { generateId } from '../utils/id-generator';
import { founderProfileService } from './founder-profile.service';
import { financialsService } from './financials.service';
import { cachedInference } from './cached-inference.service';
import { mem0Service } from './mem0.service';
import type { IncomeStrategy, GoalGapAnalysis, StrategyStatus, StrategyType } from '../models/types';
import fs from 'fs/promises';

const LOG_PREFIX = '[IncomeStrategy]';
const STRATEGIES_DIR = getVaultPath('10_profile', 'financials', 'strategies');

class IncomeStrategyService {
  constructor() {
    ensureDir(STRATEGIES_DIR).catch(err =>
      console.error(`${LOG_PREFIX} Failed to ensure strategies dir:`, err.message)
    );
  }

  async generateStrategies(): Promise<IncomeStrategy[]> {
    const [profile, portfolio, goals] = await Promise.all([
      founderProfileService.getProfile().catch(() => null),
      financialsService.getPortfolioFinancials().catch(() => null),
      financialsService.getGoals().catch(() => null),
    ]);

    const skillsList = profile?.skills?.map((s: any) => s.name || s).join(', ') || 'general consulting';
    const currentRevenue = portfolio?.total_monthly_revenue || 0;
    const currentCosts = portfolio?.total_monthly_costs || 0;
    const incomeGoal = goals?.income_goal || 0;
    const currency = goals?.currency || portfolio?.currency || 'CHF';

    const revenueBreakdown = portfolio?.revenue_streams
      ?.filter((r: any) => r.active)
      ?.map((r: any) => `${r.source}: ${r.amount_monthly} ${currency}/mo (${r.type})`)
      ?.join('\n  ') || 'No current revenue streams';

    const prompt = `You are a strategic income advisor for an indie founder/consultant. Analyze their profile and suggest 3-5 income strategies.

## Founder Skills
${skillsList}

## Current Financials
- Revenue: ${currency} ${currentRevenue}/mo
- Costs: ${currency} ${currentCosts}/mo
- Net: ${currency} ${currentRevenue - currentCosts}/mo
- Income Goal: ${currency} ${incomeGoal}/mo
- Revenue Streams:
  ${revenueBreakdown}

## Strategy Types Available
retainer, productized_service, digital_product, consulting, saas, course, licensing

Respond with a JSON array of 3-5 strategies. Each strategy must have:
- title: string
- description: string (2-3 sentences)
- type: one of the strategy types above
- estimated_monthly_revenue: number
- estimated_effort_hours: number (weekly)
- confidence: number (0-1, how likely to succeed)
- time_to_revenue_weeks: number
- leveraged_skills: string[] (which skills this uses)
- prerequisites: string[] (what's needed first)

Respond ONLY with the JSON array, no markdown fences.`;

    const response = await cachedInference.complete(
      prompt,
      'You are a strategic business advisor. Return only valid JSON arrays.',
      'strategic_reasoning',
      'standard',
      { max_tokens: 2000, temperature: 0.4, caller: 'income-strategy' }
    );

    let strategies: any[];
    try {
      const cleaned = response
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      strategies = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (err: any) {
      console.error(`${LOG_PREFIX} Failed to parse AI response:`, err.message);
      return [];
    }

    if (!Array.isArray(strategies)) return [];

    const validTypes: StrategyType[] = ['retainer', 'productized_service', 'digital_product', 'consulting', 'saas', 'course', 'licensing'];
    const now = new Date().toISOString();
    const result: IncomeStrategy[] = [];

    for (const s of strategies) {
      const strategy: IncomeStrategy = {
        id: generateId('strat'),
        title: s.title || 'Untitled Strategy',
        description: s.description || '',
        type: validTypes.includes(s.type) ? s.type : 'consulting',
        estimated_monthly_revenue: Number(s.estimated_monthly_revenue) || 0,
        estimated_effort_hours: Number(s.estimated_effort_hours) || 0,
        confidence: Math.min(1, Math.max(0, Number(s.confidence) || 0.5)),
        time_to_revenue_weeks: Number(s.time_to_revenue_weeks) || 4,
        leveraged_skills: Array.isArray(s.leveraged_skills) ? s.leveraged_skills : [],
        prerequisites: Array.isArray(s.prerequisites) ? s.prerequisites : [],
        status: 'suggested',
        created_at: now,
        updated_at: now,
      };

      await writeJsonFile(path.join(STRATEGIES_DIR, `${strategy.id}.json`), strategy);
      result.push(strategy);
    }

    console.log(`${LOG_PREFIX} Generated ${result.length} strategies`);
    return result;
  }

  async getStrategies(): Promise<IncomeStrategy[]> {
    try {
      await ensureDir(STRATEGIES_DIR);
      const files = await fs.readdir(STRATEGIES_DIR);
      const strategies: IncomeStrategy[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const data = await readJsonFile<IncomeStrategy>(path.join(STRATEGIES_DIR, file));
        if (data && data.status !== 'dismissed') {
          strategies.push(data);
        }
      }

      return strategies.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    } catch {
      return [];
    }
  }

  async updateStrategyStatus(id: string, status: StrategyStatus): Promise<IncomeStrategy | null> {
    const filePath = path.join(STRATEGIES_DIR, `${id}.json`);
    const strategy = await readJsonFile<IncomeStrategy>(filePath);
    if (!strategy) return null;

    strategy.status = status;
    strategy.updated_at = new Date().toISOString();
    await writeJsonFile(filePath, strategy);

    if (status === 'exploring') {
      mem0Service.addExplicitMemory(
        `Exploring income strategy: "${strategy.title}" (${strategy.type}) — estimated ${strategy.estimated_monthly_revenue}/mo, confidence ${(strategy.confidence * 100).toFixed(0)}%`,
        { metadata: { source: 'income-strategy' }, tags: ['financial', 'strategy'] }
      ).catch(() => {});
    }

    return strategy;
  }

  async getGoalGapAnalysis(): Promise<GoalGapAnalysis> {
    const [portfolio, goals, strategies] = await Promise.all([
      financialsService.getPortfolioFinancials(),
      financialsService.getGoals(),
      this.getStrategies(),
    ]);

    const income_goal = goals?.income_goal || 0;
    const current_revenue = portfolio.total_monthly_revenue;
    const gap = Math.max(0, income_goal - current_revenue);
    const gap_percentage = income_goal > 0 ? (gap / income_goal) * 100 : 0;
    const currency = goals?.currency || portfolio.currency;

    const exploringStrategies = strategies.filter(s => s.status === 'exploring' || s.status === 'active');
    const projected_with_strategies = current_revenue +
      exploringStrategies.reduce((sum, s) => sum + s.estimated_monthly_revenue * s.confidence, 0);

    let analysis_text = '';
    try {
      const stratText = exploringStrategies.length > 0
        ? exploringStrategies.map(s => `- ${s.title}: +${s.estimated_monthly_revenue}/mo (${(s.confidence * 100).toFixed(0)}% confidence)`).join('\n')
        : 'No strategies being explored yet.';

      const prompt = `Write a 2-3 sentence analysis of this income gap situation:
- Goal: ${currency} ${income_goal}/mo
- Current: ${currency} ${current_revenue}/mo
- Gap: ${currency} ${gap}/mo (${gap_percentage.toFixed(0)}%)
- Active strategies:\n${stratText}
- Projected with strategies: ${currency} ${projected_with_strategies.toFixed(0)}/mo

Be concise and actionable.`;

      analysis_text = await cachedInference.complete(
        prompt,
        'You are a concise financial advisor.',
        'summarization',
        'economy',
        { max_tokens: 200, temperature: 0.3, caller: 'income-strategy' }
      );
    } catch {
      analysis_text = gap > 0
        ? `Revenue gap of ${currency} ${gap}/mo to reach goal. ${exploringStrategies.length} strategies in progress.`
        : `Revenue goal met! Currently earning ${currency} ${current_revenue}/mo against a ${currency} ${income_goal}/mo target.`;
    }

    return {
      income_goal,
      current_revenue,
      gap,
      gap_percentage,
      currency,
      strategies_to_close: exploringStrategies,
      projected_with_strategies,
      analysis_text,
    };
  }
}

export const incomeStrategyService = new IncomeStrategyService();
