import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { GlassCard, StatCard, SparkLine, Badge } from '../shared';

interface RevenueEntry {
  id: string;
  project_id?: string;
  project_name?: string;
  description?: string;
  amount: number;
  recurring?: boolean;
}

interface CostEntry {
  id: string;
  category?: string;
  description?: string;
  amount: number;
  recurring?: boolean;
}

export default function FinancialsCanvas() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [goals, setGoals] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline form state
  const [showRevenueForm, setShowRevenueForm] = useState(false);
  const [showCostForm, setShowCostForm] = useState(false);
  const [showGoalsForm, setShowGoalsForm] = useState(false);
  const [revenueForm, setRevenueForm] = useState({ project_name: '', amount: '', description: '' });
  const [costForm, setCostForm] = useState({ category: '', amount: '', description: '' });
  const [goalsForm, setGoalsForm] = useState({ monthly_revenue_target: '', runway_months: '' });

  const loadData = () => {
    Promise.all([
      api.getPortfolioFinancials().catch(() => null),
      api.getFinancialGoals().catch(() => null),
      api.getFinancialSnapshots().catch(() => ({ snapshots: [] })),
    ]).then(([fin, g, snap]) => {
      setPortfolio(fin);
      setGoals(g);
      setSnapshots(snap?.snapshots || []);
      if (g) {
        setGoalsForm({
          monthly_revenue_target: g.monthly_revenue_target?.toString() || '',
          runway_months: g.runway_months?.toString() || '',
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleAddRevenue = async () => {
    if (!revenueForm.amount) return;
    await api.addRevenue({
      project_name: revenueForm.project_name || 'General',
      amount: parseFloat(revenueForm.amount),
      description: revenueForm.description,
    });
    setRevenueForm({ project_name: '', amount: '', description: '' });
    setShowRevenueForm(false);
    loadData();
  };

  const handleAddCost = async () => {
    if (!costForm.amount) return;
    await api.addCost({
      category: costForm.category || 'General',
      amount: parseFloat(costForm.amount),
      description: costForm.description,
    });
    setCostForm({ category: '', amount: '', description: '' });
    setShowCostForm(false);
    loadData();
  };

  const handleSaveGoals = async () => {
    await api.setFinancialGoals({
      monthly_revenue_target: parseFloat(goalsForm.monthly_revenue_target) || 0,
      runway_months: parseInt(goalsForm.runway_months) || 0,
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
  const revenues: RevenueEntry[] = portfolio?.revenues || portfolio?.projects?.flatMap((p: any) => p.revenues || []) || [];
  const costs: CostEntry[] = portfolio?.costs || [];
  const goalProgress = goals?.monthly_revenue_target
    ? Math.min(100, Math.round((totalRevenue / goals.monthly_revenue_target) * 100))
    : null;

  const sparkData = snapshots.map((s: any) => s.net_monthly || s.total_monthly_revenue || 0);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">FINANCIALS</h2>
        <h1 className="text-2xl lg:text-3xl font-bold text-text-primary tracking-tight mt-1"
            style={{ fontFamily: 'var(--font-body)' }}>Money Matters</h1>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <GlassCard>
          <StatCard value={totalRevenue.toLocaleString('en-US')} label="Total Revenue" currency={currency} trend={{ direction: 'up', percentage: '/mo' }} />
        </GlassCard>
        <GlassCard>
          <StatCard value={totalCosts.toLocaleString('en-US')} label="Total Costs" currency={currency} trend={{ direction: 'flat', percentage: '/mo' }} />
        </GlassCard>
        <GlassCard>
          <StatCard value={netIncome.toLocaleString('en-US')} label="Net Income" currency={currency} trend={{ direction: netIncome >= 0 ? 'up' : 'down', percentage: '/mo' }} />
        </GlassCard>
        <GlassCard>
          {goalProgress !== null ? (
            <StatCard value={`${goalProgress}%`} label="Goal Progress" trend={{ direction: goalProgress >= 80 ? 'up' : 'flat', percentage: `of ${currency} ${goals.monthly_revenue_target?.toLocaleString()}` }} />
          ) : (
            <StatCard value="—" label="Goal Progress" trend={{ direction: 'flat', percentage: 'No goal set' }} />
          )}
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">Revenue</h3>
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
                placeholder="Project / Source"
                value={revenueForm.project_name}
                onChange={(e) => setRevenueForm(f => ({ ...f, project_name: e.target.value }))}
                className="w-full px-3 py-2 rounded-md bg-base border border-[var(--glass-border)] text-text-primary text-sm outline-none focus:border-primary"
              />
              <input
                type="number"
                placeholder="Amount"
                value={revenueForm.amount}
                onChange={(e) => setRevenueForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2 rounded-md bg-base border border-[var(--glass-border)] text-text-primary text-sm outline-none focus:border-primary"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={revenueForm.description}
                onChange={(e) => setRevenueForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-md bg-base border border-[var(--glass-border)] text-text-primary text-sm outline-none focus:border-primary"
              />
              <button
                onClick={handleAddRevenue}
                className="w-full px-3 py-2 rounded-md text-xs font-medium bg-primary text-base hover:bg-primary/80 transition-colors"
              >
                Add Revenue
              </button>
            </div>
          )}

          <div className="space-y-2">
            {revenues.length === 0 && (
              <p className="text-text-tertiary text-sm py-4 text-center">No revenue entries yet</p>
            )}
            {revenues.map((r: RevenueEntry) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-[var(--glass-border)] last:border-0">
                <div>
                  <p className="text-text-primary text-sm font-medium">{r.project_name || r.description || 'Revenue'}</p>
                  {r.description && r.project_name && (
                    <p className="text-text-tertiary text-xs">{r.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary font-mono text-sm">{currency} {r.amount?.toLocaleString()}</span>
                  {r.recurring && <Badge label="REC" variant="active" />}
                  <button onClick={() => handleDeleteRevenue(r.id)} className="text-text-tertiary hover:text-danger text-xs ml-1">&times;</button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Costs Breakdown */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">Costs</h3>
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
                placeholder="Category"
                value={costForm.category}
                onChange={(e) => setCostForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 rounded-md bg-base border border-[var(--glass-border)] text-text-primary text-sm outline-none focus:border-primary"
              />
              <input
                type="number"
                placeholder="Amount"
                value={costForm.amount}
                onChange={(e) => setCostForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2 rounded-md bg-base border border-[var(--glass-border)] text-text-primary text-sm outline-none focus:border-primary"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={costForm.description}
                onChange={(e) => setCostForm(f => ({ ...f, description: e.target.value }))}
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

          <div className="space-y-2">
            {costs.length === 0 && (
              <p className="text-text-tertiary text-sm py-4 text-center">No cost entries yet</p>
            )}
            {costs.map((c: CostEntry) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-[var(--glass-border)] last:border-0">
                <div>
                  <p className="text-text-primary text-sm font-medium">{c.category || c.description || 'Cost'}</p>
                  {c.description && c.category && (
                    <p className="text-text-tertiary text-xs">{c.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-danger font-mono text-sm">{currency} {c.amount?.toLocaleString()}</span>
                  {c.recurring && <Badge label="REC" variant="active" />}
                  <button onClick={() => handleDeleteCost(c.id)} className="text-text-tertiary hover:text-danger text-xs ml-1">&times;</button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

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
                <label className="block text-text-secondary text-xs mb-1">Monthly Revenue Target ({currency})</label>
                <input
                  type="number"
                  value={goalsForm.monthly_revenue_target}
                  onChange={(e) => setGoalsForm(f => ({ ...f, monthly_revenue_target: e.target.value }))}
                  className="w-full px-3 py-2 rounded-md bg-base border border-[var(--glass-border)] text-text-primary text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-text-secondary text-xs mb-1">Runway Target (months)</label>
                <input
                  type="number"
                  value={goalsForm.runway_months}
                  onChange={(e) => setGoalsForm(f => ({ ...f, runway_months: e.target.value }))}
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
                <span className="text-text-secondary text-sm">Monthly Revenue Target</span>
                <span className="text-text-primary text-sm font-mono">
                  {goals?.monthly_revenue_target ? `${currency} ${goals.monthly_revenue_target.toLocaleString()}` : 'Not set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary text-sm">Runway Target</span>
                <span className="text-text-primary text-sm font-mono">
                  {goals?.runway_months ? `${goals.runway_months} months` : 'Not set'}
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
