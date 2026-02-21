import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Calendar, Tag, BookOpen } from 'lucide-react';
import { api } from '../../services/api';
import { GlassCard, StatCard, NitaraInsightCard, Badge } from '../shared';
import { MarkdownContent } from '../shared/MarkdownContent';

interface ReportSummary {
  id: string;
  type: string;
  title: string;
  status: string;
  created_at: string;
  project_id?: string;
}

// ─── Type Badge Mapping ─────────────────────────────────────────────────────

type BadgeVariant = 'active' | 'paused' | 'blocked' | 'completed' | 'council' | 'playbook';

function typeToBadge(type: string): { label: string; variant: BadgeVariant } {
  switch (type) {
    case 'weekly': return { label: 'Weekly', variant: 'council' };
    case 'portfolio-analysis': return { label: 'Portfolio', variant: 'active' };
    case 'research': return { label: 'Research', variant: 'playbook' };
    case 'network': return { label: 'Network', variant: 'completed' };
    default: return { label: type.replace(/-/g, ' '), variant: 'paused' };
  }
}

// ─── Report Renderers ────────────────────────────────────────────────────────

function WeeklyReportRenderer({ report }: { report: any }) {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      {report.kpis && report.kpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {report.kpis.map((kpi: any, i: number) => (
            <StatCard
              key={i}
              value={kpi.value}
              label={kpi.label}
              trend={kpi.trend_direction ? {
                direction: kpi.trend_direction,
                percentage: kpi.trend_percentage || '',
              } : undefined}
              sparkData={kpi.spark_data}
            />
          ))}
        </div>
      )}

      {/* Strategic Intelligence */}
      {report.strategic_intelligence && report.strategic_intelligence.length > 0 && (
        <NitaraInsightCard title="STRATEGIC INTELLIGENCE">
          <ul className="space-y-1">
            {report.strategic_intelligence.map((insight: string, i: number) => (
              <li key={i}>{insight}</li>
            ))}
          </ul>
        </NitaraInsightCard>
      )}

      {/* Retrospective */}
      {report.retrospective && (
        <GlassCard>
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Retrospective</h3>
          <MarkdownContent content={report.retrospective} />
        </GlassCard>
      )}
    </div>
  );
}

function PortfolioReportRenderer({ report }: { report: any }) {
  const recommendations = report.recommendations || report.projects || [];

  return (
    <div className="space-y-6">
      {/* Summary stats if available */}
      {report.summary && (
        <NitaraInsightCard title="PORTFOLIO SUMMARY">
          {typeof report.summary === 'string' ? (
            <MarkdownContent content={report.summary} />
          ) : (
            <p>{JSON.stringify(report.summary)}</p>
          )}
        </NitaraInsightCard>
      )}

      {/* Project recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-3">
          {recommendations.map((item: any, i: number) => {
            const action = (item.recommendation || item.action || '').toUpperCase();
            const actionVariant: BadgeVariant =
              action === 'BUILD' || action === 'INVEST' ? 'active' :
              action === 'PARK' ? 'paused' :
              action === 'KILL' ? 'blocked' : 'council';

            return (
              <GlassCard key={i}>
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-text-primary font-medium">{item.name || item.project || `Project ${i + 1}`}</h4>
                  {action && <Badge label={action} variant={actionVariant} />}
                </div>
                {item.score !== undefined && (
                  <div className="text-primary text-2xl font-bold font-mono mb-2">{item.score}/100</div>
                )}
                {item.reasoning && <p className="text-text-secondary text-sm">{item.reasoning}</p>}
                {item.insights && (
                  <NitaraInsightCard title="NITARA INSIGHT" className="mt-3">
                    {item.insights}
                  </NitaraInsightCard>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Fallback: render raw */}
      {recommendations.length === 0 && <GenericReportRenderer report={report} />}
    </div>
  );
}

function GenericReportRenderer({ report }: { report: any }) {
  // Filter out metadata keys
  const skip = new Set(['id', 'type', 'created_at', 'updated_at', 'status', 'report_type']);

  return (
    <div className="space-y-4">
      {Object.entries(report).map(([key, value]) => {
        if (skip.has(key)) return null;
        if (value === null || value === undefined) return null;

        const label = key.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        // String values — render as markdown
        if (typeof value === 'string') {
          return (
            <GlassCard key={key}>
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">{label}</h3>
              <MarkdownContent content={value} />
            </GlassCard>
          );
        }

        // Number values
        if (typeof value === 'number') {
          return (
            <StatCard key={key} value={String(value)} label={label} />
          );
        }

        // Arrays
        if (Array.isArray(value)) {
          if (value.length === 0) return null;

          // Array of strings
          if (typeof value[0] === 'string') {
            return (
              <GlassCard key={key}>
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">{label}</h3>
                <ul className="space-y-1 text-text-secondary text-sm">
                  {value.map((item: string, i: number) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary shrink-0">-</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            );
          }

          // Array of objects — render as cards
          return (
            <div key={key} className="space-y-3">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">{label}</h3>
              {value.map((item: any, i: number) => (
                <GlassCard key={i}>
                  <GenericReportRenderer report={item} />
                </GlassCard>
              ))}
            </div>
          );
        }

        // Objects
        if (typeof value === 'object') {
          return (
            <GlassCard key={key}>
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">{label}</h3>
              <GenericReportRenderer report={value} />
            </GlassCard>
          );
        }

        return null;
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface ReportsCanvasProps {
  filterProjectId?: string;
}

export default function ReportsCanvas({ filterProjectId }: ReportsCanvasProps = {}) {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [types, setTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [guideContent, setGuideContent] = useState<string | null>(null);
  const [loadingGuide, setLoadingGuide] = useState(false);

  useEffect(() => {
    loadReports();
    loadTypes();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await api.getReports(filterType || undefined, 50);
      let filtered = data.reports || [];
      if (filterProjectId) {
        filtered = filtered.filter((r: ReportSummary) => r.project_id === filterProjectId);
      }
      setReports(filtered);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTypes = async () => {
    try {
      const data = await api.getReportTypes();
      setTypes(data.types || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadReports();
  }, [filterType]);

  const openReport = async (id: string) => {
    setLoadingDetail(true);
    setSelectedId(id);
    try {
      const report = await api.getReport(id);
      setSelectedReport(report);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const goBack = () => {
    setSelectedReport(null);
    setSelectedId(null);
    setShowGuide(false);
  };

  const openGuide = async () => {
    setLoadingGuide(true);
    setShowGuide(true);
    try {
      const data = await api.getNitaraGuide();
      setGuideContent(data.content);
    } catch (err) {
      console.error('Failed to load Nitara guide:', err);
    } finally {
      setLoadingGuide(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // ─── Guide View ──────────────────────────────────────────────────────────

  if (showGuide) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={goBack}
            className="p-2 rounded-lg hover:bg-elevated/50 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-text-primary">Nitara System Guide</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge label="Guide" variant="council" />
              <span className="text-text-tertiary text-xs">Reference documentation</span>
            </div>
          </div>
        </div>
        {loadingGuide ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-text-tertiary">Loading guide...</div>
          </div>
        ) : guideContent ? (
          <GlassCard>
            <MarkdownContent content={guideContent} />
          </GlassCard>
        ) : (
          <GlassCard className="text-center py-12">
            <p className="text-text-secondary">Failed to load guide</p>
          </GlassCard>
        )}
      </div>
    );
  }

  // ─── Detail View ─────────────────────────────────────────────────────────

  if (selectedReport) {
    const type = selectedReport.type || selectedReport.report_type || 'general';
    const title = selectedReport.title || selectedReport.report_title || selectedId;

    return (
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={goBack}
            className="p-2 rounded-lg hover:bg-elevated/50 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-text-primary truncate">{title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge label={typeToBadge(type).label} variant={typeToBadge(type).variant} />
              <span className="text-text-tertiary text-xs">
                {formatDate(selectedReport.created_at || '')}
              </span>
            </div>
          </div>
        </div>

        {/* Report Content */}
        {loadingDetail ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-text-tertiary">Loading report...</div>
          </div>
        ) : (
          <div>
            {type === 'weekly' ? (
              <WeeklyReportRenderer report={selectedReport} />
            ) : type === 'portfolio-analysis' ? (
              <PortfolioReportRenderer report={selectedReport} />
            ) : (
              <GenericReportRenderer report={selectedReport} />
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── List View ──────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            {filterProjectId ? 'Project Reports' : 'Reports'}
          </h1>
          <p className="text-text-tertiary text-sm mt-1">
            {reports.length} report{reports.length !== 1 ? 's' : ''} available
          </p>
        </div>
      </div>

      {/* Type filter tabs */}
      {types.length > 1 && !filterProjectId && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterType(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              !filterType
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'text-text-tertiary hover:text-text-secondary border border-transparent'
            }`}
          >
            All
          </button>
          {types.map(t => {
            const badge = typeToBadge(t);
            return (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  filterType === t
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'text-text-tertiary hover:text-text-secondary border border-transparent'
                }`}
              >
                {badge.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="text-text-tertiary">Loading reports...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && reports.length === 0 && (
        <GlassCard className="text-center py-12">
          <FileText size={32} className="mx-auto text-text-tertiary mb-3" />
          <p className="text-text-secondary">No reports yet</p>
          <p className="text-text-tertiary text-sm mt-1">
            Reports will appear here as Nitara generates them.
          </p>
        </GlassCard>
      )}

      {/* Pinned: Nitara System Guide */}
      {!loading && !filterProjectId && (
        <GlassCard className="cursor-pointer hover:border-primary/30 transition-colors mb-3 border-primary/20 bg-primary/5">
          <button onClick={openGuide} className="w-full text-left">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge label="Guide" variant="council" />
                </div>
                <h3 className="text-text-primary font-medium flex items-center gap-2">
                  <BookOpen size={16} className="text-primary shrink-0" />
                  Nitara System Guide
                </h3>
                <p className="text-text-tertiary text-xs mt-1">
                  Architecture, commands, safety controls, and day-to-day usage reference
                </p>
              </div>
            </div>
          </button>
        </GlassCard>
      )}

      {/* Report cards */}
      {!loading && reports.length > 0 && (
        <div className="space-y-3">
          {reports.map(report => {
            const badge = typeToBadge(report.type);
            return (
              <GlassCard
                key={report.id}
                className="cursor-pointer hover:border-primary/30 transition-colors"
              >
                <button
                  onClick={() => openReport(report.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge label={badge.label} variant={badge.variant} />
                        {report.project_id && (
                          <span className="text-text-tertiary text-xs flex items-center gap-1">
                            <Tag size={10} />
                            {report.project_id}
                          </span>
                        )}
                      </div>
                      <h3 className="text-text-primary font-medium truncate">{report.title}</h3>
                    </div>
                    <span className="text-text-tertiary text-xs whitespace-nowrap ml-3 flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(report.created_at)}
                    </span>
                  </div>
                </button>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
