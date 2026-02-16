import path from 'path';
import {
  getVaultPath,
  ensureDir,
  readJsonFile,
  writeJsonFile,
} from '../utils/file-operations';
import { generateId } from '../utils/id-generator';
import { financialsService } from './financials.service';
import { founderProfileService } from './founder-profile.service';
import { cachedInference } from './cached-inference.service';
import type { Opportunity, OpportunityType, ScanResult } from '../models/types';

const LOG_PREFIX = '[OpportunityScanner]';
const SCANS_DIR = getVaultPath('10_profile', 'financials', 'scans');

class OpportunityScannerService {
  constructor() {
    ensureDir(SCANS_DIR).catch(err =>
      console.error(`${LOG_PREFIX} Failed to ensure scans dir:`, err.message)
    );
  }

  async scan(): Promise<ScanResult> {
    console.log(`${LOG_PREFIX} Starting opportunity scan...`);

    const [portfolio, snapshots, profile] = await Promise.all([
      financialsService.getPortfolioFinancials().catch(() => null),
      financialsService.getSnapshots().catch(() => []),
      founderProfileService.getProfile().catch(() => null),
    ]);

    const ruleBasedOpps: Partial<Opportunity>[] = [];

    // Rule: High cost ratios (>40% of total)
    if (portfolio && portfolio.total_monthly_costs > 0) {
      const costByCategory: Record<string, number> = {};
      for (const c of portfolio.cost_items.filter(c => c.active)) {
        costByCategory[c.category] = (costByCategory[c.category] || 0) + c.amount_monthly;
      }
      for (const [category, amount] of Object.entries(costByCategory)) {
        const ratio = amount / portfolio.total_monthly_costs;
        if (ratio > 0.4) {
          ruleBasedOpps.push({
            type: 'high_cost_ratio',
            title: `High ${category} costs (${(ratio * 100).toFixed(0)}% of total)`,
            description: `${category} costs are ${portfolio.currency} ${amount}/mo, representing ${(ratio * 100).toFixed(0)}% of total costs. Consider renegotiating or finding alternatives.`,
            suggested_action: `Review ${category} expenses for optimization opportunities`,
          });
        }
      }
    }

    // Rule: Stagnant or declining revenue
    if (snapshots.length >= 2) {
      const sorted = [...snapshots].sort((a, b) => a.created_at.localeCompare(b.created_at));
      const latest = sorted[sorted.length - 1];
      const previous = sorted[sorted.length - 2];

      if (latest.total_revenue <= previous.total_revenue) {
        const change = latest.total_revenue - previous.total_revenue;
        ruleBasedOpps.push({
          type: 'stagnant_revenue',
          title: change < 0 ? 'Declining revenue trend' : 'Stagnant revenue',
          description: `Revenue ${change < 0 ? 'decreased' : 'unchanged'} from ${previous.total_revenue} to ${latest.total_revenue} between snapshots. Action needed to grow income.`,
          suggested_action: 'Explore new revenue streams or increase pricing on existing services',
        });
      }
    }

    // Rule: Underutilized skills
    if (profile?.skills && portfolio?.revenue_streams) {
      const revenueSourceNames = portfolio.revenue_streams
        .filter(r => r.active)
        .map(r => r.source.toLowerCase());
      const unusedSkills = (profile.skills as any[])
        .filter((s: any) => {
          const name = (s.name || s).toLowerCase();
          return !revenueSourceNames.some(src => src.includes(name) || name.includes(src));
        })
        .slice(0, 3);

      if (unusedSkills.length > 0) {
        ruleBasedOpps.push({
          type: 'underutilized_skill',
          title: `Underutilized skills: ${unusedSkills.map((s: any) => s.name || s).join(', ')}`,
          description: `Skills not directly tied to current revenue streams. These could be monetized through consulting, courses, or productized services.`,
          suggested_action: 'Consider creating offerings around underutilized skills',
        });
      }
    }

    // AI enhancement pass
    let opportunities: Opportunity[] = [];
    try {
      const ruleContext = ruleBasedOpps.length > 0
        ? `Rule-based findings:\n${ruleBasedOpps.map(o => `- [${o.type}] ${o.title}: ${o.description}`).join('\n')}`
        : 'No rule-based findings.';

      const prompt = `You are a financial opportunity analyst. Review these findings and enhance them with scores. Also add any opportunities you identify.

${ruleContext}

## Current Financials
- Revenue: ${portfolio?.currency || 'CHF'} ${portfolio?.total_monthly_revenue || 0}/mo
- Costs: ${portfolio?.currency || 'CHF'} ${portfolio?.total_monthly_costs || 0}/mo
- Revenue streams: ${portfolio?.revenue_streams?.filter(r => r.active)?.map(r => `${r.source} (${r.type}): ${r.amount_monthly}`).join(', ') || 'none'}

## Founder Skills
${profile?.skills?.map((s: any) => s.name || s).join(', ') || 'unknown'}

Respond with a JSON array of opportunities. Each must have:
- type: "pricing_gap" | "high_cost_ratio" | "stagnant_revenue" | "underutilized_skill" | "network_leverage"
- title: string
- description: string
- impact_score: 1-10
- effort_score: 1-10 (lower = easier)
- confidence: 0-1
- suggested_action: string

Return ONLY the JSON array, no markdown fences.`;

      const response = await cachedInference.complete(
        prompt,
        'You are a financial analyst. Return only valid JSON arrays.',
        'strategic_reasoning',
        'economy',
        { max_tokens: 1500, temperature: 0.3, caller: 'opportunity-scanner' }
      );

      const cleaned = response
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      if (Array.isArray(parsed)) {
        const validTypes: OpportunityType[] = ['pricing_gap', 'high_cost_ratio', 'stagnant_revenue', 'underutilized_skill', 'network_leverage'];
        const now = new Date().toISOString();

        opportunities = parsed.map((o: any) => ({
          id: generateId('opp'),
          type: validTypes.includes(o.type) ? o.type : 'pricing_gap',
          title: o.title || 'Opportunity',
          description: o.description || '',
          impact_score: Math.min(10, Math.max(1, Number(o.impact_score) || 5)),
          effort_score: Math.min(10, Math.max(1, Number(o.effort_score) || 5)),
          confidence: Math.min(1, Math.max(0, Number(o.confidence) || 0.5)),
          related_project_id: o.related_project_id,
          suggested_action: o.suggested_action || '',
          created_at: now,
        }));
      }
    } catch (err: any) {
      console.error(`${LOG_PREFIX} AI enhancement failed, using rule-based only:`, err.message);
      const now = new Date().toISOString();
      opportunities = ruleBasedOpps.map(o => ({
        id: generateId('opp'),
        type: o.type as OpportunityType,
        title: o.title || 'Opportunity',
        description: o.description || '',
        impact_score: 5,
        effort_score: 5,
        confidence: 0.5,
        suggested_action: o.suggested_action || '',
        created_at: now,
      }));
    }

    // Sort by impact desc
    opportunities.sort((a, b) => b.impact_score - a.impact_score);

    const summary = opportunities.length > 0
      ? `Found ${opportunities.length} opportunities. Top: ${opportunities[0].title} (impact: ${opportunities[0].impact_score}/10).`
      : 'No significant opportunities identified in this scan.';

    const result: ScanResult = {
      opportunities,
      scanned_at: new Date().toISOString(),
      summary,
    };

    // Persist
    await ensureDir(SCANS_DIR);
    await writeJsonFile(path.join(SCANS_DIR, 'latest.json'), result);
    const dateBackup = new Date().toISOString().split('T')[0];
    await writeJsonFile(path.join(SCANS_DIR, `${dateBackup}.json`), result);

    console.log(`${LOG_PREFIX} Scan complete: ${opportunities.length} opportunities found`);
    return result;
  }

  async getLatestScan(): Promise<ScanResult | null> {
    return readJsonFile<ScanResult>(path.join(SCANS_DIR, 'latest.json'));
  }

  async getBriefingInsights(): Promise<{ top_opportunities: Opportunity[]; summary: string }> {
    const scan = await this.getLatestScan();
    if (!scan || scan.opportunities.length === 0) {
      return { top_opportunities: [], summary: 'No opportunity scan data available.' };
    }

    return {
      top_opportunities: scan.opportunities.slice(0, 3),
      summary: scan.summary,
    };
  }
}

export const opportunityScanner = new OpportunityScannerService();
