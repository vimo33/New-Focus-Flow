import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { GlassCard, StatCard, ActionCard, Badge } from '../shared';
import { api } from '../../services/api';
import { useConversationStore } from '../../stores/conversation';
import { useCanvasStore } from '../../stores/canvas';

interface TaskItem {
  id: string;
  title: string;
  project: string;
  status: 'active' | 'blocked' | 'completed';
}

interface ApprovalItem {
  id: string;
  title: string;
  description: string;
  type: 'edit' | 'approve';
}

interface NetworkLead {
  id?: string;
  contact_name?: string;
  name?: string;
  company?: string;
  opportunity_type?: string;
  description?: string;
  score?: number;
}

interface ContentItem {
  id: string;
  title: string;
  status: string;
}

export default function MorningBriefing() {
  const [clockTime, setClockTime] = useState(new Date());
  const hour = clockTime.getHours();
  const greeting = hour < 12 ? 'GOOD MORNING' : hour < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING';
  const timeStr = clockTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dayStr = clockTime.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const dateStr = clockTime.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const [userName, setUserName] = useState('');
  const [financials, setFinancials] = useState<{ revenue: string; costs: string; net: string; currency: string } | null>(null);
  const [priorities, setPriorities] = useState<TaskItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [networkLeads, setNetworkLeads] = useState<NetworkLead[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const { setCanvas } = useCanvasStore();
  const lastNitaraMsg = useConversationStore(s => [...s.messages].reverse().find(m => m.role === 'nitara'));

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setClockTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Fetch user name
    api.getProfile().then(p => {
      const name = p?.name || p?.display_name || '';
      if (name) setUserName(name.split(' ')[0].toUpperCase());
    }).catch(console.error);

    // Financial pulse
    api.getPortfolioFinancials().then(fin => {
      if (fin) {
        setFinancials({
          revenue: fin.total_monthly_revenue?.toLocaleString('en-US') || '0',
          costs: fin.total_monthly_costs?.toLocaleString('en-US') || '0',
          net: fin.net_monthly?.toLocaleString('en-US') || '0',
          currency: fin.currency || 'CHF',
        });
      }
    }).catch(console.error);

    // Priorities from tasks API
    api.getTasks('work').then(res => {
      const mapped = (res.tasks || []).slice(0, 5).map(t => ({
        id: t.id,
        title: t.title,
        project: t.project_id || 'General',
        status: (t.status === 'done' ? 'completed' : 'active') as TaskItem['status'],
      }));
      setPriorities(mapped);
    }).catch(console.error);

    // Pending approvals from agent state
    api.getAgentState().then(state => {
      const mapped = (state.pending_approvals || []).map((a: any) => ({
        id: a.request_id || a.id,
        title: a.title || a.action_type || 'Pending Action',
        description: a.description || '',
        type: (a.action_type === 'edit' ? 'edit' : 'approve') as ApprovalItem['type'],
      }));
      setApprovals(mapped);
    }).catch(console.error);

    // Network intel
    api.getNetworkOpportunities().then(data => {
      setNetworkLeads((data.opportunities || []).slice(0, 3));
    }).catch(console.error);

    // Content calendar from scheduled/content tasks
    api.getTasks('scheduled').then(res => {
      setContentItems((res.tasks || []).slice(0, 4).map(t => ({
        id: t.id,
        title: t.title,
        status: t.status === 'done' ? 'DONE' : t.status === 'in_progress' ? 'DRAFTED' : 'PLANNED',
      })));
    }).catch(console.error);

    // Recent reports
    api.getReports(undefined, 5).then(data => {
      setRecentReports(data.reports || []);
    }).catch(console.error);
  }, []);

  const activePriorities = priorities.filter(p => p.status !== 'completed');

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto relative" data-testid="canvas-morning-briefing">
      {/* Clock Widget — stacked on mobile, absolute on desktop */}
      <div className="static md:absolute md:top-6 md:right-6 lg:top-8 lg:right-8 text-left md:text-right mb-4 md:mb-0">
        <p className="font-mono text-2xl md:text-3xl lg:text-4xl text-text-primary tabular-nums tracking-tight" style={{ fontFeatureSettings: "'tnum'" }}>
          {timeStr}
        </p>
        <p className="text-text-tertiary text-xs tracking-wider uppercase mt-1">
          {dayStr} &middot; {dateStr}
        </p>
      </div>

      {/* Greeting Header */}
      <div className="mb-8">
        <h1
          className="text-2xl sm:text-3xl lg:text-5xl font-bold text-text-primary tracking-[0.1em] md:tracking-[0.15em] uppercase break-words"
          style={{ fontFamily: 'Syncopate, var(--font-display), sans-serif' }}
        >
          {greeting}{userName ? `, ${userName}` : ''}.
        </h1>
      </div>

      {/* Summary Line */}
      <p className="text-text-secondary text-sm mb-8">
        {activePriorities.length > 0 && (
          <>You have <span className="text-primary font-medium">{activePriorities.length} priorit{activePriorities.length === 1 ? 'y' : 'ies'}</span> today</>
        )}
        {approvals.length > 0 && (
          <>{activePriorities.length > 0 ? ', ' : 'You have '}<span className="text-secondary font-medium">{approvals.length} approval{approvals.length !== 1 ? 's' : ''}</span> pending</>
        )}
        {networkLeads.length > 0 && (
          <>{(activePriorities.length > 0 || approvals.length > 0) ? ', and ' : ''}a warm lead from your network</>
        )}
        {activePriorities.length === 0 && approvals.length === 0 && networkLeads.length === 0 && (
          <>All clear — no urgent items right now.</>
        )}
        .
      </p>

      {/* Widget Grid — asymmetric */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        {/* Today's Focus — spans 2 cols */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">Today's Focus</h3>
            <Badge label={`${activePriorities.length} ACTIVE`} variant="active" />
          </div>
          <div className="space-y-3">
            {priorities.length === 0 && (
              <p className="text-text-tertiary text-sm py-2">No work tasks yet — capture some ideas to get started.</p>
            )}
            {priorities.map((task) => (
              <div key={task.id} className="flex items-center gap-3 py-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  task.status === 'active' ? 'bg-primary' : task.status === 'blocked' ? 'bg-secondary' : 'bg-success'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-medium truncate">{task.title}</p>
                </div>
                <Badge label={task.project} variant="playbook" />
                {task.status === 'blocked' && <Badge label="BLOCKED" variant="blocked" />}
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Pending Approvals */}
        <GlassCard>
          <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Pending Approvals</h3>
          <div className="space-y-3">
            {approvals.length === 0 && (
              <p className="text-text-tertiary text-sm py-2">No pending approvals</p>
            )}
            {approvals.map((item) => (
              <ActionCard key={item.id} accent="amber">
                <p className="text-text-primary text-sm font-medium">{item.title}</p>
                <p className="text-text-secondary text-xs mt-1">{item.description}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => api.rejectAction(item.id).then(() => setApprovals(a => a.filter(x => x.id !== item.id))).catch(console.error)}
                    className="px-3 py-1 rounded-md text-xs font-medium border border-[var(--glass-border)] text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => api.approveAction(item.id).then(() => setApprovals(a => a.filter(x => x.id !== item.id))).catch(console.error)}
                    className="px-3 py-1 rounded-md text-xs font-medium bg-secondary text-base hover:bg-secondary/80 transition-colors"
                  >
                    Approve
                  </button>
                </div>
              </ActionCard>
            ))}
          </div>
        </GlassCard>

        {/* Financial Pulse */}
        <GlassCard>
          <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Financial Pulse</h3>
          <div className="space-y-3">
            <StatCard
              value={financials?.revenue || '...'}
              label="Monthly Revenue"
              currency={financials?.currency || 'CHF'}
              trend={{ direction: 'up', percentage: 'this month' }}
            />
            <StatCard
              value={financials?.costs || '...'}
              label="Monthly Costs"
              currency={financials?.currency || 'CHF'}
              trend={{ direction: 'flat', percentage: 'this month' }}
            />
            <StatCard
              value={financials?.net || '...'}
              label="Net Income"
              currency={financials?.currency || 'CHF'}
              trend={{ direction: Number(financials?.net?.replace(/,/g, '') || 0) >= 0 ? 'up' : 'down', percentage: 'net' }}
            />
          </div>
        </GlassCard>

        {/* Network Intel */}
        <GlassCard>
          <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Network Intel</h3>
          {networkLeads.length === 0 ? (
            <p className="text-text-tertiary text-sm py-2">No network opportunities right now</p>
          ) : (
            networkLeads.map((lead, i) => {
              const name = lead.contact_name || lead.name || 'Contact';
              const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
              return (
                <div key={lead.id || i} className="mb-4 last:mb-0">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-elevated flex items-center justify-center text-text-secondary text-sm font-medium flex-shrink-0">
                      {initials}
                    </div>
                    <div>
                      <p className="text-text-primary text-sm font-medium">{name}</p>
                      {lead.company && <p className="text-text-secondary text-xs">{lead.company}</p>}
                    </div>
                  </div>
                  {lead.description && (
                    <p className="text-text-secondary text-sm mb-2">{lead.description}</p>
                  )}
                </div>
              );
            })
          )}
        </GlassCard>

        {/* Content Calendar */}
        <GlassCard>
          <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Content Calendar</h3>
          <div className="space-y-3">
            {contentItems.length === 0 ? (
              <p className="text-text-tertiary text-sm py-2">No content scheduled</p>
            ) : (
              contentItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-1">
                  <span className="text-text-primary text-sm truncate flex-1 mr-2">{item.title}</span>
                  <Badge
                    label={item.status}
                    variant={item.status === 'DONE' ? 'completed' : item.status === 'DRAFTED' ? 'active' : 'paused'}
                  />
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* Recent Reports */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">Recent Reports</h3>
            <button
              onClick={() => setCanvas('reports')}
              className="text-primary text-xs hover:text-primary/80 transition-colors"
            >
              View All &rarr;
            </button>
          </div>
          <div className="space-y-3">
            {recentReports.length === 0 ? (
              <p className="text-text-tertiary text-sm py-2">No reports generated yet</p>
            ) : (
              recentReports.map((report: any) => (
                <button
                  key={report.id}
                  onClick={() => setCanvas('reports')}
                  className="w-full flex items-center gap-3 py-1 text-left hover:bg-elevated/30 -mx-1 px-1 rounded-lg transition-colors"
                >
                  <FileText size={14} className="text-primary flex-shrink-0" />
                  <span className="text-text-primary text-sm truncate flex-1">{report.title}</span>
                  <span className="text-text-tertiary text-xs flex-shrink-0">
                    {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </button>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      {/* Nitara Proactive Strip */}
      {lastNitaraMsg && (
        <div className="mt-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20">
          <span className="text-primary text-lg">{'\u2726'}</span>
          <p className="text-text-secondary text-sm flex-1 truncate">
            {lastNitaraMsg.content}
          </p>
          <span className="text-text-tertiary text-xs tracking-wider uppercase flex-shrink-0">NITARA</span>
        </div>
      )}
    </div>
  );
}
