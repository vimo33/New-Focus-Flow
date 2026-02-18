import { useEffect, useState } from 'react';
import { useCanvasStore } from '../../stores/canvas';
import { api } from '../../services/api';
import { GlassCard, StatCard, Badge } from '../shared';

interface KPI {
  name: string;
  target: number;
  current?: number;
}

interface GTMStrategy {
  id: string;
  project_id: string;
  status: string;
  target_audience: string;
  value_proposition: string;
  channels: string[];
  messaging_pillars: string[];
  kpis: KPI[];
  playbook_notes?: string;
}

interface CalendarEntry {
  id: string;
  title: string;
  channel: string;
  status: string;
  scheduled_date: string;
  draft_content?: string;
  published_url?: string;
  brief: string;
}

interface Dashboard {
  strategy: GTMStrategy | null;
  calendar_entries: CalendarEntry[];
  upcoming_count: number;
  drafted_count: number;
  published_count: number;
  leads_generated: number;
}

const CHANNEL_COLORS: Record<string, 'active' | 'playbook' | 'council' | 'completed' | 'paused'> = {
  blog: 'active',
  twitter: 'playbook',
  linkedin: 'council',
  email: 'completed',
  newsletter: 'paused',
};

const STATUS_COLORS: Record<string, 'active' | 'playbook' | 'council' | 'completed' | 'paused' | 'blocked'> = {
  planned: 'paused',
  drafted: 'playbook',
  approved: 'active',
  published: 'completed',
  skipped: 'blocked',
};

export default function MarketingCanvas() {
  const { canvasParams, goBack } = useCanvasStore();
  const projectId = canvasParams.projectId;

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingStrategy, setGeneratingStrategy] = useState(false);
  const [generatingCalendar, setGeneratingCalendar] = useState(false);
  const [draftingEntries, setDraftingEntries] = useState(false);

  const loadDashboard = async () => {
    if (!projectId) return;
    try {
      const data = await api.getMarketingDashboard(projectId);
      setDashboard(data);
    } catch (err) {
      console.error('Failed to load marketing dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [projectId]);

  const handleGenerateStrategy = async () => {
    if (!projectId) return;
    setGeneratingStrategy(true);
    try {
      await api.generateGTMStrategy(projectId);
      await loadDashboard();
    } catch (err) {
      console.error('Failed to generate strategy:', err);
    } finally {
      setGeneratingStrategy(false);
    }
  };

  const handleGenerateCalendar = async () => {
    if (!projectId) return;
    setGeneratingCalendar(true);
    try {
      await api.generateCalendar(projectId, 4);
      await loadDashboard();
    } catch (err) {
      console.error('Failed to generate calendar:', err);
    } finally {
      setGeneratingCalendar(false);
    }
  };

  const handleDraftDue = async () => {
    if (!projectId) return;
    setDraftingEntries(true);
    try {
      await api.draftDueEntries(projectId);
      await loadDashboard();
    } catch (err) {
      console.error('Failed to draft entries:', err);
    } finally {
      setDraftingEntries(false);
    }
  };

  const handleApprove = async (entryId: string) => {
    if (!projectId) return;
    try {
      await api.updateCalendarEntry(projectId, entryId, { status: 'approved' });
      await loadDashboard();
    } catch (err) {
      console.error('Failed to approve entry:', err);
    }
  };

  const handlePublish = async (entryId: string) => {
    if (!projectId) return;
    try {
      await api.publishCalendarEntry(projectId, entryId);
      await loadDashboard();
    } catch (err) {
      console.error('Failed to publish entry:', err);
    }
  };

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-tertiary">No project selected.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-tertiary">Loading marketing data...</div>
      </div>
    );
  }

  const strategy = dashboard?.strategy;
  const entries = dashboard?.calendar_entries || [];
  const hasStrategy = strategy && strategy.id;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={goBack}
          className="text-text-tertiary hover:text-text-primary text-sm mb-3 flex items-center gap-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <p className="text-text-tertiary text-xs tracking-widest uppercase mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
          Nitara Observatory
        </p>
        <h1 className="text-2xl lg:text-3xl font-bold text-text-primary tracking-tight" style={{ fontFamily: 'var(--font-body)' }}>
          GTM & Marketing
        </h1>
      </div>

      {/* Strategy Overview */}
      {hasStrategy ? (
        <GlassCard className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">Strategy</h3>
            <Badge label={strategy.status.toUpperCase()} variant={strategy.status === 'active' ? 'active' : 'paused'} />
          </div>
          {strategy.target_audience && (
            <div className="mb-2">
              <span className="text-text-tertiary text-xs">Target Audience:</span>
              <p className="text-text-primary text-sm">{strategy.target_audience}</p>
            </div>
          )}
          {strategy.value_proposition && (
            <div className="mb-3">
              <span className="text-text-tertiary text-xs">Value Proposition:</span>
              <p className="text-text-primary text-sm">{strategy.value_proposition}</p>
            </div>
          )}
          {strategy.channels.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-3">
              {strategy.channels.map((ch: string) => (
                <Badge key={ch} label={ch.toUpperCase()} variant={CHANNEL_COLORS[ch] || 'paused'} />
              ))}
            </div>
          )}
          {strategy.messaging_pillars.length > 0 && (
            <div>
              <span className="text-text-tertiary text-xs">Messaging Pillars:</span>
              <div className="flex gap-2 flex-wrap mt-1">
                {strategy.messaging_pillars.map((p: string, i: number) => (
                  <span key={i} className="text-text-secondary text-xs bg-elevated px-2 py-0.5 rounded">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      ) : (
        <GlassCard className="mb-6">
          <div className="text-center py-4">
            <p className="text-text-secondary text-sm mb-3">No GTM strategy yet.</p>
            <button
              onClick={handleGenerateStrategy}
              disabled={generatingStrategy}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-base hover:bg-primary/80 transition-colors disabled:opacity-50"
            >
              {generatingStrategy ? 'Generating...' : 'Generate Strategy'}
            </button>
          </div>
        </GlassCard>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <GlassCard>
          <StatCard value={String(dashboard?.upcoming_count || 0)} label="Upcoming" />
        </GlassCard>
        <GlassCard>
          <StatCard value={String(dashboard?.drafted_count || 0)} label="Drafted" />
        </GlassCard>
        <GlassCard>
          <StatCard value={String(dashboard?.published_count || 0)} label="Published" />
        </GlassCard>
        <GlassCard>
          <StatCard value={String(dashboard?.leads_generated || 0)} label="Leads" />
        </GlassCard>
      </div>

      {/* Content Calendar */}
      <GlassCard className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">Content Calendar</h3>
          <span className="text-text-tertiary text-xs">{entries.length} entries</span>
        </div>

        {entries.length === 0 ? (
          <p className="text-text-tertiary text-sm text-center py-4">
            No calendar entries yet. Generate a calendar to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 py-2 px-3 rounded-lg bg-elevated/50 hover:bg-elevated transition-colors"
              >
                <span className="text-text-tertiary text-xs font-mono flex-shrink-0 w-20">
                  {entry.scheduled_date}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm truncate">{entry.title}</p>
                </div>
                <Badge
                  label={entry.channel.toUpperCase()}
                  variant={CHANNEL_COLORS[entry.channel] || 'paused'}
                />
                <Badge
                  label={entry.status.toUpperCase()}
                  variant={STATUS_COLORS[entry.status] || 'paused'}
                />
                <div className="flex gap-1 flex-shrink-0">
                  {entry.status === 'drafted' && (
                    <button
                      onClick={() => handleApprove(entry.id)}
                      className="px-2 py-1 rounded text-xs font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                    >
                      Approve
                    </button>
                  )}
                  {entry.status === 'approved' && (
                    <button
                      onClick={() => handlePublish(entry.id)}
                      className="px-2 py-1 rounded text-xs font-medium bg-success/20 text-success hover:bg-success/30 transition-colors"
                    >
                      Publish
                    </button>
                  )}
                  {entry.status === 'published' && entry.published_url && (
                    <span className="text-xs text-success">Published</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Quick Actions */}
      <GlassCard>
        <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Quick Actions</h3>
        <div className="flex gap-3 flex-wrap">
          {hasStrategy && (
            <button
              onClick={handleGenerateCalendar}
              disabled={generatingCalendar}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--glass-border)] text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors disabled:opacity-50"
            >
              {generatingCalendar ? 'Generating...' : 'Generate Calendar (4 weeks)'}
            </button>
          )}
          <button
            onClick={handleDraftDue}
            disabled={draftingEntries}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--glass-border)] text-text-secondary hover:text-text-primary hover:bg-elevated transition-colors disabled:opacity-50"
          >
            {draftingEntries ? 'Drafting...' : 'Draft Due Entries'}
          </button>
          {!hasStrategy && (
            <button
              onClick={handleGenerateStrategy}
              disabled={generatingStrategy}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-base hover:bg-primary/80 transition-colors disabled:opacity-50"
            >
              {generatingStrategy ? 'Generating...' : 'Generate Strategy'}
            </button>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
