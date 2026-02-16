import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { GlassCard, StatCard, SparkLine, Badge, ActionCard, NitaraInsightCard, ConfidenceRing } from '../shared';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface RevenueStream {
  id: string;
  project_id?: string;
  source: string;
  type: string;
  amount_monthly: number;
  currency: string;
  active: boolean;
  notes?: string;
}

interface CostItem {
  id: string;
  name: string;
  category: string;
  amount_monthly: number;
  currency: string;
  active: boolean;
}

interface IncomeStrategy {
  id: string;
  title: string;
  description: string;
  type: string;
  estimated_monthly_revenue: number;
  estimated_effort_hours: number;
  confidence: number;
  time_to_revenue_weeks: number;
  leveraged_skills: string[];
  prerequisites: string[];
  status: string;
}

interface GoalGapAnalysis {
  income_goal: number;
  current_revenue: number;
  gap: number;
  gap_percentage: number;
  currency: string;
  strategies_to_close: IncomeStrategy[];
  projected_with_strategies: number;
  analysis_text: string;
}

const DONUT_COLORS = [
  'var(--color-primary)',
  'var(--color-secondary)',
  'var(--color-tertiary)',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
];

const TYPE_LABELS: Record<string, string> = {
  recurring: 'RECURRING',
  one_time: 'ONE-TIME',
  retainer: 'RETAINER',
  royalty: 'ROYALTY',
  equity: 'EQUITY',
};

const STRATEGY_TYPE_LABELS: Record<string, string> = {
  retainer: 'RETAINER',
  productized_service: 'PRODUCTIZED',
  digital_product: 'DIGITAL',
  consulting: 'CONSULTING',
  saas: 'SAAS',
  course: 'COURSE',
  licensing: 'LICENSING',
};

function formatCHF(val: number, currency = 'CHF'): string {
  return `${currency} ${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function FinancialsCanvas() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [goals, setGoals] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [strategies, setStrategies] = useState<IncomeStrategy[]>([]);
  const [goalGap, setGoalGap] = useState<GoalGapAnalysis | null>(null);
  const [inferenceCosts, setInferenceCosts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingStrategies, setGeneratingStrategies] = useState(false);

  // Inline form state
  const [showRevenueForm, setShowRevenueForm] = useState(false);
  const [showCostForm, setShowCostForm] = useState(false);
  const [showGoalsForm, setShowGoalsForm] = useState(false);
  const [revenueForm, setRevenueForm] = useState({ source: '', amount: '', type: 'recurring' });
  const [costForm, setCostForm] = useState({ name: '', category: '', amount: '' });
  const [goalsForm, setGoalsForm] = useState({ income_goal: '', safety_net_months: '' });

  const loadData = () => {
    Promise.all([
      api.getPortfolioFinancials().catch(() => null),
      api.getFinancialGoals().catch(() => null),
      api.getFinancialSnapshots().catch(() => ({ snapshots: [] })),
      api.getIncomeStrategies().catch(() => ({ strategies: [] })),
      api.getGoalGapAnalysis().catch(() => null),
      api.getInferenceCosts(30).catch(() => null),
    ]).then(([fin, g, snap, strats, gap, costs]) => {
      setPortfolio(fin);
      setGoals(g);
      setSnapshots(snap?.snapshots || []);
      setStrategies(strats?.strategies || []);
      setGoalGap(gap);
      setInferenceCosts(costs);
      if (g) {
        setGoalsForm({
          income_goal: g.income_goal?.toString() || '',
          safety_net_months: g.safety_net_months?.toString() || '',
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleAddRevenue = async () => {
    if (!revenueForm.amount) return;
    await api.addRevenue({
      source: revenueForm.source || 'General',
      amount_monthly: parseFloat(revenueForm.amount),
      type: revenueForm.type,
    });
    setRevenueForm({ source: '', amount: '', type: 'recurring' });
    setShowRevenueForm(false);
    loadData();
  };

  const handleAddCost = async () => {
    if (!costForm.amount) return;
    await api.addCost({
      name: costForm.name || 'Cost',
      category: costForm.category || 'other',
      amount_monthly: parseFloat(costForm.amount),
    });
    setCostForm({ name: '', category: '', amount: '' });
    setShowCostForm(false);
    loadData();
  };

  const handleSaveGoals = async () => {
    await api.setFinancialGoals({
      income_goal: parseFloat(goalsForm.income_goal) || 0,
      safety_net_months: parseInt(goalsForm.safety_net_months) || 6,
    });
    setShowGoalsForm(false);
    loadData();
  };

  const handleSnapshot = async () => {
    await api.createFinancialSnapshot();
    loadData();
  };

  const handleDeleteRevenue = async (id: string) => {
    await api.deleteRevenue(id);
    loadData();
  };

  const handleDeleteCost = async (id: string) => {
    await api.deleteCost(id);
    loadData();
  };

  const handleGenerateStrategies = async () => {
    setGeneratingStrategies(true);
    try {
      await api.generateIncomeStrategies();
      loadData();
    } finally {
      setGeneratingStrategies(false);
    }
  };

  const handleStrategyAction = async (id: string, status: string) => {
    await api.updateStrategyStatus(id, status);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-tertiary">Loading financials...</div>
      </div>
    );
  }

  const totalRevenue = portfolio?.total_monthly_revenue || 0;
  const totalCosts = portfolio?.total_monthly_costs || 0;
  const netIncome = portfolio?.net_monthly || 0;
  const currency = portfolio?.currency || 'CHF';
  const revenues: RevenueStream[] = portfolio?.revenue_streams?.filter((r: RevenueStream) => r.active) || [];
  const costs: CostItem[] = portfolio?.cost_items?.filter((c: CostItem) => c.active) || [];

  const goalProgress = goals?.income_goal
    ? Math.min(100, Math.round((totalRevenue / goals.income_goal) * 100))
    : null;

  const sparkData = snapshots.map((s: any) => s.net || s.total_revenue || 0);

  // Bar chart data: revenue by source
  const barData = revenues.map(r => ({
    name: r.source.length > 12 ? r.source.slice(0, 12) + '...' : r.source,
    amount: r.amount_monthly,
  }));

  // Donut chart data: costs by category
  const costByCategory: Record<string, number> = {};
  for (const c of costs) {
    costByCategory[c.category] = (costByCategory[c.category] || 0) + c.amount_monthly;
  }
  const donutData = Object.entries(costByCategory).map(([name, value]) => ({ name, value }));

  // Inference cost display (USD to CHF approximate)
  const usdToChf = 0.88; // approximate conversion factor
  const inferenceTotalUSD = inferenceCosts?.total_cost_usd || 0;
  const inferenceMonthlyUSD = inferenceCosts?.daily_average_usd ? inferenceCosts.daily_average_usd * 30 : 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          NITARA OBSERVATORY / FINANCIAL INTELLIGENCE UNIT // V2.5
        </h2>
        <h1 className="text-2xl lg:text-3xl font-bold text-text-primary tracking-tight mt-1"
            style={{ fontFamily: 'var(--font-body)' }}>Financials & Income</h1>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          value={totalRevenue.toLocaleString('en-US')}
          label="Monthly Revenue"
          currency={currency}
          trend={{ direction: 'up', percentage: '/mo' }}
        />
        <StatCard
          value={totalCosts.toLocaleString('en-US')}
          label="Monthly Costs"
          currency={currency}
          trend={{ direction: 'flat', percentage: '/mo' }}
        />
        <StatCard
          value={netIncome.toLocaleString('en-US')}
          label="Net Income"
          currency={currency}
          trend={{ direction: netIncome >= 0 ? 'up' : 'down', percentage: '/mo' }}
        />
        {goalProgress !== null ? (
          <StatCard
            value={`${goalProgress}%`}
            label="Goal Progress"
            trend={{ direction: goalProgress >= 80 ? 'up' : 'flat', percentage: `of ${formatCHF(goals.income_goal, currency)}` }}
          />
        ) : (
          <StatCard
            value="—"
            label="Goal Progress"
            trend={{ direction: 'flat', percentage: 'No goal set' }}
          />
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Bar Chart */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">Revenue Breakdown</h3>
            <button
              onClick={() => setShowRevenueForm(!showRevenueForm)}
              className="px-3 py-1 rounded-md text-xs font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
            >
              {showRevenueForm ? 'Cancel' : '+ Add Revenue'}
            </button>
          </div>

          {showRevenueForm && (
            <div className="mb-4 p-3 rounded-lg bg-elevated/50 space-y-2">
              <input
                type="text"
                placeholder="Source name"
                value={revenueForm.source}
                onChange={(e) => setRevenueForm(f => ({ ...f, source: e.target.value }))}
                className="w-full px-3 py-2 rounded-md bg-base border border-[var(--glass-border)] text-text-primary text-sm outline-none focus:border-primary"
              />
              <input
                type="number"
                placeholder="Monthly amount"
                value={revenueForm.amount}
                onChange={(e) => setRevenueForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2 rounded-md bg-base border border-[var(--glass-border)] text-text-primary text-sm outline-none focus:border-primary"
              />
              <select
                value={revenueForm.type}
                onChange={(e) => setRevenueForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2 rounded-md bg-base border border-[var(--glass-border)] text-text-primary text-sm outline-none focus:border-primary"
              >
                <option value="recurring">Recurring</option>
                <option value="retainer">Retainer</option>
                <option value="one_time">One-time</option>
                <option value="royalty">Royalty</option>
                <option value="equity">Equity</option>
              </select>
              <button
                onClick={handleAddRevenue}
                className="w-full px-3 py-2 rounded-md text-xs font-medium bg-primary text-base hover:bg-primary/80 transition-colors"
              >
                Add Revenue
              </button>
            </div>
          )}

          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val: number | undefined) => formatCHF(val ?? 0, currency)}
                  contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-primary)' }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                />
                <Bar dataKey="amount" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-text-tertiary text-sm py-8 text-center">No revenue data to chart</p>
          )}

          {/* Revenue list with type badges and % of target */}
          <div className="space-y-2 mt-3">
            {revenues.map((r) => (
              <div key={r.id} className="py-2 border-b border-[var(--glass-border)] last:border-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-text-primary text-sm font-medium">{r.source}</p>
                    <Badge label={TYPE_LABELS[r.type] || r.type.toUpperCase()} variant="active" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-mono text-sm">{formatCHF(r.amount_monthly, currency)}</span>
                    <button onClick={() => handleDeleteRevenue(r.id)} className="text-text-tertiary hover:text-danger text-xs ml-1">&times;</button>
                  </div>
                </div>
                {/* % of target bar */}
                {goals?.income_goal > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-text-tertiary/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/40 rounded-full"
                        style={{ width: `${Math.min(100, (r.amount_monthly / goals.income_goal) * 100)}%` }}
                      />
                    </div>
                    <span className="text-text-tertiary text-[10px] font-mono">
                      {Math.round((r.amount_monthly / goals.income_goal) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Cost Donut Chart */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">Cost Breakdown</h3>
            <button
              onClick={() => setShowCostForm(!showCostForm)}
              className="px-3 py-1 rounded-md text-xs font-medium border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors"
            >
              {showCostForm ? 'Cancel' : '+ Add Cost'}
            </button>
          </div>

          {showCostForm && (
            <div className="mb-4 p-3 rounded-lg bg-elevated/50 space-y-2">
              <input
                type="text"
                placeholder="Cost name"
                value={costForm.name}
                onChange={(e) => setCostForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-md bg-base border border-[var(--glass-border)] text-text-primary text-sm outline-none focus:border-primary"
              />
              <select
                value={costForm.category}
                onChange={(e) => setCostForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 rounded-md bg-base border border-[var(--glass-border)] text-text-primary text-sm outline-none focus:border-primary"
              >
                <option value="">Select category</option>
                <option value="tools">Tools</option>
                <option value="hosting">Hosting</option>
                <option value="contractors">Contractors</option>
                <option value="marketing">Marketing</option>
                <option value="office">Office</option>
                <option value="insurance">Insurance</option>
                <option value="other">Other</option>
              </select>
              <input
                type="number"
                placeholder="Monthly amount"
                value={costForm.amount}
                onChange={(e) => setCostForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2 rounded-md bg-base border border-[var(--glass-border)] text-text-primary text-sm outline-none focus:border-primary"
              />
              <button
                onClick={handleAddCost}
                className="w-full px-3 py-2 rounded-md text-xs font-medium bg-secondary text-base hover:bg-secondary/80 transition-colors"
              >
                Add Cost
              </button>
            </div>
          )}

          {donutData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number | undefined) => formatCHF(val ?? 0, currency)}
                    contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-primary)' }}
                  />
                  <Legend
                    formatter={(value: string) => <span className="text-text-secondary text-xs">{value}</span>}
                    iconSize={10}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-text-tertiary text-sm py-8 text-center">No cost data to chart</p>
          )}

          {/* Costs list */}
          <div className="space-y-2 mt-3">
            {costs.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-[var(--glass-border)] last:border-0">
                <div>
                  <p className="text-text-primary text-sm font-medium">{c.name}</p>
                  <p className="text-text-tertiary text-xs">{c.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-danger font-mono text-sm">{formatCHF(c.amount_monthly, currency)}</span>
                  <button onClick={() => handleDeleteCost(c.id)} className="text-text-tertiary hover:text-danger text-xs ml-1">&times;</button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Income Strategy Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">Income Strategies</h3>
          <button
            onClick={handleGenerateStrategies}
            disabled={generatingStrategies}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-base hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingStrategies ? 'Generating...' : 'Generate Strategies'}
          </button>
        </div>

        {strategies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {strategies.map((s) => {
              const accent = s.confidence > 0.7 ? 'cyan' : s.confidence > 0.4 ? 'amber' : 'violet';
              return (
                <ActionCard
                  key={s.id}
                  accent={accent}
                  actions={[
                    ...(s.status !== 'exploring' ? [{
                      label: 'EXPLORE STRATEGY',
                      onClick: () => handleStrategyAction(s.id, 'exploring'),
                      variant: 'primary' as const,
                    }] : []),
                    {
                      label: 'DISMISS',
                      onClick: () => handleStrategyAction(s.id, 'dismissed'),
                      variant: 'secondary' as const,
                    },
                  ]}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-text-primary text-sm font-semibold">{s.title}</h4>
                        <Badge label={STRATEGY_TYPE_LABELS[s.type] || s.type.toUpperCase()} variant="council" />
                      </div>
                      <p className="text-text-secondary text-xs leading-relaxed">{s.description}</p>
                    </div>
                    <ConfidenceRing score={s.confidence * 10} size="sm" />
                  </div>
                  <div className="flex gap-3 text-xs text-text-tertiary mt-2">
                    <span>{formatCHF(s.estimated_monthly_revenue, currency)}/mo</span>
                    <span>{s.estimated_effort_hours}h/wk</span>
                    <span>{s.time_to_revenue_weeks}wk to rev</span>
                  </div>
                  {s.leveraged_skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.leveraged_skills.slice(0, 3).map((skill, i) => (
                        <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-elevated text-text-secondary">{skill}</span>
                      ))}
                    </div>
                  )}
                  {s.status === 'exploring' && (
                    <Badge label="EXPLORING" variant="active" className="mt-2" />
                  )}
                </ActionCard>
              );
            })}
          </div>
        ) : (
          <GlassCard>
            <p className="text-text-tertiary text-sm py-4 text-center">
              No strategies yet. Click "Generate Strategies" to get AI-powered income suggestions.
            </p>
          </GlassCard>
        )}
      </div>

      {/* Goal Gap Analysis + AI Inference Costs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Goal Gap Analysis */}
        <div className="lg:col-span-2">
          {goalGap ? (
            <NitaraInsightCard title="GOAL GAP ANALYSIS">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                <div>
                  <p className="text-text-tertiary text-xs">Income Goal</p>
                  <p className="text-text-primary font-mono text-lg">{formatCHF(goalGap.income_goal, goalGap.currency)}</p>
                </div>
                <div>
                  <p className="text-text-tertiary text-xs">Current Revenue</p>
                  <p className="text-text-primary font-mono text-lg">{formatCHF(goalGap.current_revenue, goalGap.currency)}</p>
                </div>
                <div>
                  <p className="text-text-tertiary text-xs">Gap</p>
                  <p className="text-danger font-mono text-lg">{formatCHF(goalGap.gap, goalGap.currency)}</p>
                </div>
                <div>
                  <p className="text-text-tertiary text-xs">Projected</p>
                  <p className="text-primary font-mono text-lg">{formatCHF(Math.round(goalGap.projected_with_strategies), goalGap.currency)}</p>
                </div>
              </div>
              <p className="text-text-secondary text-sm leading-relaxed">{goalGap.analysis_text}</p>
            </NitaraInsightCard>
          ) : (
            <GlassCard>
              <p className="text-text-tertiary text-sm py-4 text-center">Set financial goals to see gap analysis</p>
            </GlassCard>
          )}
        </div>

        {/* AI Inference Costs */}
        <GlassCard>
          <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-3">AI Inference Costs</h3>
          <div className="space-y-3">
            <div>
              <p className="text-text-tertiary text-xs">30-Day Total</p>
              <p className="text-text-primary font-mono text-lg">
                ${inferenceTotalUSD.toFixed(2)} USD
              </p>
              {/* ~CHF {(inferenceTotalUSD * usdToChf).toFixed(2)} */}
              <p className="text-text-tertiary text-xs">~{currency} {(inferenceTotalUSD * usdToChf).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-text-tertiary text-xs">Monthly Estimate</p>
              <p className="text-text-primary font-mono text-lg">
                ${inferenceMonthlyUSD.toFixed(2)} USD
              </p>
              <p className="text-text-tertiary text-xs">~{currency} {(inferenceMonthlyUSD * usdToChf).toFixed(2)}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Bottom Row: Goals + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Goals */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">Financial Goals</h3>
            <button
              onClick={() => setShowGoalsForm(!showGoalsForm)}
              className="px-3 py-1 rounded-md text-xs font-medium border border-[var(--glass-border)] text-text-secondary hover:text-text-primary transition-colors"
            >
              {showGoalsForm ? 'Cancel' : 'Edit Goals'}
            </button>
          </div>

          {showGoalsForm ? (
            <div className="space-y-3">
              <div>
                <label className="block text-text-secondary text-xs mb-1">Monthly Income Goal ({currency})</label>
                <input
                  type="number"
                  value={goalsForm.income_goal}
                  onChange={(e) => setGoalsForm(f => ({ ...f, income_goal: e.target.value }))}
                  className="w-full px-3 py-2 rounded-md bg-base border border-[var(--glass-border)] text-text-primary text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-text-secondary text-xs mb-1">Safety Net (months)</label>
                <input
                  type="number"
                  value={goalsForm.safety_net_months}
                  onChange={(e) => setGoalsForm(f => ({ ...f, safety_net_months: e.target.value }))}
                  className="w-full px-3 py-2 rounded-md bg-base border border-[var(--glass-border)] text-text-primary text-sm outline-none focus:border-primary"
                />
              </div>
              <button
                onClick={handleSaveGoals}
                className="w-full px-3 py-2 rounded-md text-xs font-medium bg-primary text-base hover:bg-primary/80 transition-colors"
              >
                Save Goals
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-text-secondary text-sm">Monthly Income Goal</span>
                <span className="text-text-primary text-sm font-mono">
                  {goals?.income_goal ? formatCHF(goals.income_goal, currency) : 'Not set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary text-sm">Safety Net Target</span>
                <span className="text-text-primary text-sm font-mono">
                  {goals?.safety_net_months ? `${goals.safety_net_months} months` : 'Not set'}
                </span>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Trend Sparkline */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">Trend</h3>
            <button
              onClick={handleSnapshot}
              className="px-3 py-1 rounded-md text-xs font-medium border border-[var(--glass-border)] text-text-secondary hover:text-text-primary transition-colors"
            >
              Take Snapshot
            </button>
          </div>
          {sparkData.length > 1 ? (
            <div className="flex items-center justify-center py-4">
              <SparkLine data={sparkData} width={280} height={60} />
            </div>
          ) : (
            <p className="text-text-tertiary text-sm py-4 text-center">
              {sparkData.length === 1 ? 'Need at least 2 snapshots for trend' : 'No snapshots yet — take one to start tracking'}
            </p>
          )}
          <p className="text-text-tertiary text-xs text-center mt-2">{snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} recorded</p>
        </GlassCard>
      </div>
    </div>
  );
}
