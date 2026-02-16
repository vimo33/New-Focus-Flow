import { GlassCard, StatCard } from '../shared';

export default function WeeklyReportCanvas() {
  const periodStart = 'Feb 10';
  const periodEnd = 'Feb 16, 2026';

  // TODO: Pull from API
  const kpis = [
    { value: '2,400', label: 'Revenue (New Wins)', currency: 'CHF', trend: { direction: 'up' as const, percentage: '+18%' }, sparkData: [1800, 2000, 2100, 2200, 2400] },
    { value: '87%', label: 'Efficiency', trend: { direction: 'up' as const, percentage: '+5%' }, sparkData: [78, 80, 82, 85, 87] },
    { value: '12', label: 'New Network Nodes', trend: { direction: 'up' as const, percentage: '+3' }, sparkData: [5, 7, 8, 10, 12] },
    { value: '6.5h', label: 'Time Saved (AI)', trend: { direction: 'up' as const, percentage: '+1.2h' }, sparkData: [4, 4.5, 5, 5.8, 6.5] },
  ];

  const intelligence = [
    'AI Consulting project advanced from Spec to Dev phase — on track for March delivery.',
    'Network expanded by 12 nodes this week. 3 identified as high-value connectors in Zurich fintech.',
    'Monthly burn rate decreased 3% — infrastructure optimization from last sprint paying off.',
  ];

  // Activity data for chart (Mon-Sun)
  const activityData = [4, 7, 6, 8, 5, 3, 2];
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const maxActivity = Math.max(...activityData);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">
          WEEKLY PERFORMANCE REPORT
        </h2>
        <p className="text-text-secondary text-sm mt-1">{periodStart} — {periodEnd}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-text-primary text-sm font-medium">Overall Momentum</span>
          <span className="text-success font-mono text-sm">{'\u2191'} +14%</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi, i) => (
          <StatCard key={i} {...kpi} />
        ))}
      </div>

      {/* Strategic Intelligence */}
      <GlassCard className="mb-8">
        <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Strategic Intelligence</h3>
        <div className="space-y-3">
          {intelligence.map((item, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="w-0.5 h-full min-h-[20px] bg-primary rounded-full flex-shrink-0 mt-1" />
              <p className="text-text-secondary text-sm">{item}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Activity Volume Chart */}
      <GlassCard className="mb-8">
        <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Activity Volume</h3>
        <div className="flex items-end gap-2 h-32">
          {activityData.map((val, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-sm bg-success/60 transition-all duration-300"
                style={{ height: `${(val / maxActivity) * 100}%` }}
              />
              <span className="text-text-tertiary text-[10px] font-mono">{days[i]}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Nitara Retrospective */}
      <GlassCard>
        <div className="flex items-start gap-3">
          <span className="text-primary text-lg">{'\u2726'}</span>
          <div>
            <p className="text-text-tertiary text-[10px] font-semibold tracking-wider uppercase mb-1">NITARA RETROSPECTIVE</p>
            <p className="text-text-secondary text-sm">
              Strong week with meaningful progress across all projects. The network expansion in Zurich fintech opens
              three potential consulting opportunities worth exploring next week. I recommend scheduling discovery calls
              with the high-value connectors and finalizing the Q1 pricing proposal before the month closes.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
