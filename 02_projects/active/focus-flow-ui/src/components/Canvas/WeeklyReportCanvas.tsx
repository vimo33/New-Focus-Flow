import { useEffect, useState } from 'react';
import { GlassCard, StatCard } from '../shared';
import { api } from '../../services/api';

interface WeeklyKPI {
  label: string;
  value: string;
  trend_direction: 'up' | 'down' | 'flat';
  trend_percentage: string;
  spark_data: number[];
}

interface Report {
  id: string;
  week_start: string;
  week_end: string;
  overall_momentum: number;
  kpis: WeeklyKPI[];
  strategic_intelligence: string[];
  activity_volume: number[];
  retrospective: string;
  created_at: string;
}

export default function WeeklyReportCanvas() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api.getLatestWeeklyReport()
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const newReport = await api.generateWeeklyReport();
      setReport(newReport);
    } catch (e) {
      console.error('Failed to generate report:', e);
    } finally {
      setGenerating(false);
    }
  };

  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-tertiary">Loading weekly report...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">
            WEEKLY PERFORMANCE REPORT
          </h2>
          <p className="text-text-secondary text-sm mt-2">No reports generated yet.</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-6 py-3 rounded-lg text-sm font-medium bg-primary text-base hover:bg-primary/80 transition-colors disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate Weekly Report'}
        </button>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const activityData = report.activity_volume;
  const maxActivity = Math.max(...activityData, 1);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">
              WEEKLY PERFORMANCE REPORT
            </h2>
            <p className="text-text-secondary text-sm mt-1">{formatDate(report.week_start)} — {formatDate(report.week_end)}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-text-primary text-sm font-medium">Overall Momentum</span>
              <span className={`font-mono text-sm ${report.overall_momentum >= 0 ? 'text-success' : 'text-danger'}`}>
                {report.overall_momentum >= 0 ? '\u2191' : '\u2193'} {report.overall_momentum >= 0 ? '+' : ''}{report.overall_momentum}%
              </span>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 rounded-lg text-xs font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Regenerate'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {report.kpis.map((kpi, i) => (
          <StatCard
            key={i}
            value={kpi.value}
            label={kpi.label}
            trend={{ direction: kpi.trend_direction, percentage: kpi.trend_percentage }}
            sparkData={kpi.spark_data}
          />
        ))}
      </div>

      {/* Strategic Intelligence */}
      <GlassCard className="mb-8">
        <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Strategic Intelligence</h3>
        <div className="space-y-3">
          {report.strategic_intelligence.map((item, i) => (
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
            <p className="text-text-secondary text-sm">{report.retrospective}</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
