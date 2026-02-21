import { useState } from 'react';
import { useOnboardingStore } from '../../stores/onboarding';
import { api } from '../../services/api';
import { GlassCard, NitaraInsightCard } from '../shared';

interface RevenueStream {
  id?: string;
  source: string;
  amount_monthly: number;
  type: 'recurring' | 'one_time' | 'retainer';
  currency: string;
  active: boolean;
}

export default function OnboardingStep4Financials() {
  const { nextStep } = useOnboardingStore();
  const [revenues, setRevenues] = useState<RevenueStream[]>([]);
  const [newSource, setNewSource] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState<'recurring' | 'one_time' | 'retainer'>('recurring');
  const [incomeGoal, setIncomeGoal] = useState('');
  const [saving, setSaving] = useState(false);
  const [goalSaved, setGoalSaved] = useState(false);

  const totalRevenue = revenues.reduce((sum, r) => sum + r.amount_monthly, 0);
  const maxAmount = Math.max(...revenues.map((r) => r.amount_monthly), 1);
  const goalNum = parseFloat(incomeGoal) || 0;
  const gap = goalNum > 0 ? goalNum - totalRevenue : 0;

  const handleAddRevenue = async () => {
    if (!newSource.trim() || !newAmount.trim()) return;

    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) return;

    const stream: RevenueStream = {
      source: newSource.trim(),
      amount_monthly: amount,
      type: newType,
      currency: 'CHF',
      active: true,
    };

    try {
      const result = await api.post('/financials/revenue', stream);
      setRevenues((prev) => [...prev, { ...stream, id: result.id || String(Date.now()) }]);
    } catch {
      // Add locally even if API fails
      setRevenues((prev) => [...prev, { ...stream, id: String(Date.now()) }]);
    }

    setNewSource('');
    setNewAmount('');
    setNewType('recurring');
  };

  const handleRemoveRevenue = (index: number) => {
    setRevenues((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveGoal = async () => {
    if (!goalNum || saving) return;
    setSaving(true);

    try {
      await api.post('/financials/goals', {
        income_goal: goalNum,
        safety_net_months: 6,
        currency: 'CHF',
      });
      setGoalSaved(true);
    } catch {
      // Goal will be retried on continue
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    try {
      if (goalNum > 0 && !goalSaved) {
        await api.post('/financials/goals', {
          income_goal: goalNum,
          safety_net_months: 6,
          currency: 'CHF',
        });
      }
    } catch {
      // Continue anyway
    }
    nextStep();
  };

  const typeLabels: Record<string, string> = {
    recurring: 'Recurring',
    one_time: 'One-time',
    retainer: 'Retainer',
  };

  return (
    <div className="w-full max-w-3xl space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-text-primary text-2xl font-bold">Financial Gravity</h2>
        <p className="text-text-secondary text-sm">
          Map your income sources to understand your financial orbit.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Add revenue form + list */}
        <div className="space-y-4">
          {/* Add form */}
          <GlassCard className="space-y-3">
            <h3 className="text-text-primary font-semibold text-sm uppercase tracking-wider">
              Add Revenue Stream
            </h3>
            <input
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder="Source name (e.g., Consulting)"
              className="w-full bg-surface border border-[var(--glass-border)] rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary/50 placeholder:text-text-tertiary"
            />
            <div className="flex gap-2">
              <input
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="Monthly CHF"
                type="number"
                className="flex-1 bg-surface border border-[var(--glass-border)] rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary/50 placeholder:text-text-tertiary"
              />
              <select
                value={newType}
                onChange={(e) =>
                  setNewType(e.target.value as 'recurring' | 'one_time' | 'retainer')
                }
                className="bg-surface border border-[var(--glass-border)] rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary/50"
              >
                <option value="recurring">Recurring</option>
                <option value="one_time">One-time</option>
                <option value="retainer">Retainer</option>
              </select>
            </div>
            <button
              onClick={handleAddRevenue}
              disabled={!newSource.trim() || !newAmount.trim()}
              className="w-full bg-primary/20 text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/30 transition-colors disabled:opacity-50"
            >
              Add Stream
            </button>
          </GlassCard>

          {/* Revenue list */}
          {revenues.length > 0 && (
            <GlassCard className="space-y-2">
              {revenues.map((r, i) => (
                <div
                  key={r.id || i}
                  className="flex items-center justify-between py-2 border-b border-[var(--glass-border)] last:border-0"
                >
                  <div>
                    <p className="text-text-primary text-sm font-medium">{r.source}</p>
                    <p className="text-text-tertiary text-xs">{typeLabels[r.type]}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-text-primary font-mono text-sm">
                      CHF {r.amount_monthly.toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleRemoveRevenue(i)}
                      className="text-text-tertiary hover:text-danger text-xs transition-colors"
                    >
                      {'\u2715'}
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between pt-2">
                <span className="text-text-secondary text-sm font-semibold">Total</span>
                <span className="text-primary font-mono text-sm font-bold">
                  CHF {totalRevenue.toLocaleString()}/mo
                </span>
              </div>
            </GlassCard>
          )}

          {/* Goal input */}
          <GlassCard className="space-y-3">
            <h3 className="text-text-primary font-semibold text-sm uppercase tracking-wider">
              Income Goal
            </h3>
            <div className="flex gap-2">
              <input
                value={incomeGoal}
                onChange={(e) => {
                  setIncomeGoal(e.target.value);
                  setGoalSaved(false);
                }}
                placeholder="Monthly income goal (CHF)"
                type="number"
                className="flex-1 bg-surface border border-[var(--glass-border)] rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary/50 placeholder:text-text-tertiary"
              />
              <button
                onClick={handleSaveGoal}
                disabled={!incomeGoal || saving}
                className="bg-primary/20 text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/30 transition-colors disabled:opacity-50"
              >
                {goalSaved ? 'Saved' : 'Set'}
              </button>
            </div>
          </GlassCard>

          {/* Gap insight */}
          {gap > 0 && revenues.length > 0 && (
            <NitaraInsightCard>
              There is a gap of <strong>CHF {gap.toLocaleString()}/mo</strong> between your
              current revenue and your goal. We will work on closing this together.
            </NitaraInsightCard>
          )}
        </div>

        {/* Right: Orbital visualization */}
        <div className="flex items-center justify-center">
          <div className="space-y-4 text-center">
            <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto">
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="var(--glass-border)"
                strokeWidth="1"
              />
              <circle
                cx="100"
                cy="100"
                r="50"
                fill="none"
                stroke="var(--glass-border)"
                strokeWidth="1"
              />
              <circle
                cx="100"
                cy="100"
                r="20"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2"
              />
              {revenues.map((r, i) => {
                const angle = (i / revenues.length) * Math.PI * 2;
                const radius = 30 + (r.amount_monthly / maxAmount) * 50;
                const cx = 100 + Math.cos(angle) * radius;
                const cy = 100 + Math.sin(angle) * radius;
                return (
                  <circle
                    key={r.id || i}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill="var(--color-primary)"
                  >
                    <title>
                      {r.source}: CHF {r.amount_monthly.toLocaleString()}
                    </title>
                  </circle>
                );
              })}
              {/* Center label */}
              {revenues.length > 0 && (
                <text
                  x="100"
                  y="105"
                  textAnchor="middle"
                  fill="var(--color-primary)"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {totalRevenue.toLocaleString()}
                </text>
              )}
              {revenues.length === 0 && (
                <text
                  x="100"
                  y="105"
                  textAnchor="middle"
                  fill="var(--color-text-tertiary)"
                  fontSize="9"
                >
                  Add streams
                </text>
              )}
            </svg>
            <p className="text-text-tertiary text-xs">
              {revenues.length > 0
                ? `${revenues.length} revenue stream${revenues.length > 1 ? 's' : ''} mapped`
                : 'Your financial orbit'}
            </p>
          </div>
        </div>
      </div>

      {/* Continue */}
      <div className="flex justify-center gap-4">
        {revenues.length === 0 && (
          <button
            onClick={() => nextStep()}
            className="text-text-tertiary text-sm hover:text-text-secondary transition-colors"
          >
            Skip for now
          </button>
        )}
        <button
          onClick={handleContinue}
          className="bg-primary text-base px-6 py-2 rounded-lg font-medium hover:bg-primary/80 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
