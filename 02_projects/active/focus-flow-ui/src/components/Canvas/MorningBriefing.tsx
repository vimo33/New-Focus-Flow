import { GlassCard, StatCard, ActionCard, Badge } from '../shared';

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

export default function MorningBriefing() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'GOOD MORNING' : hour < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING';
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // TODO: Replace with real API data
  const priorities: TaskItem[] = [
    { id: '1', title: 'Finalize Q1 pricing proposal', project: 'AI Consulting', status: 'active' },
    { id: '2', title: 'Review design system components', project: 'Nitara', status: 'active' },
    { id: '3', title: 'Schedule call with Zurich partners', project: 'Network', status: 'blocked' },
  ];

  const approvals: ApprovalItem[] = [
    { id: '1', title: 'Blog post: "AI Strategy for SMBs"', description: 'Draft ready for review — 1,200 words', type: 'edit' },
    { id: '2', title: 'Outreach email to Thomas Weber', description: 'Follow-up on consulting proposal', type: 'approve' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Greeting Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-text-primary tracking-tight" style={{ fontFamily: 'var(--font-body)' }}>
          {greeting}.
        </h1>
        <div className="flex items-center gap-4 mt-2">
          <span className="font-mono text-text-secondary text-lg tabular-nums" style={{ fontFeatureSettings: "'tnum'" }}>
            {timeStr}
          </span>
          <span className="text-text-tertiary text-sm">{dateStr}</span>
        </div>
      </div>

      {/* Summary Line */}
      <p className="text-text-secondary text-sm mb-8">
        You have <span className="text-primary font-medium">3 priorities</span> today,{' '}
        <span className="text-secondary font-medium">2 approvals</span> pending, and a warm lead from your network.
      </p>

      {/* Widget Grid — asymmetric */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Focus — spans 2 cols */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">Today's Focus</h3>
            <Badge label="3 ACTIVE" variant="active" />
          </div>
          <div className="space-y-3">
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
            {approvals.map((item) => (
              <ActionCard key={item.id} accent="amber">
                <p className="text-text-primary text-sm font-medium">{item.title}</p>
                <p className="text-text-secondary text-xs mt-1">{item.description}</p>
                <div className="flex gap-2 mt-3">
                  <button className="px-3 py-1 rounded-md text-xs font-medium border border-[var(--glass-border)] text-text-secondary hover:text-text-primary transition-colors">
                    Edit
                  </button>
                  <button className="px-3 py-1 rounded-md text-xs font-medium bg-secondary text-base hover:bg-secondary/80 transition-colors">
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
              value="4,200"
              label="Monthly Revenue"
              currency="CHF"
              trend={{ direction: 'up', percentage: '+12%' }}
              sparkData={[3200, 3400, 3800, 3600, 4000, 4200]}
            />
            <StatCard
              value="1,850"
              label="Monthly Costs"
              currency="CHF"
              trend={{ direction: 'down', percentage: '-3%' }}
              sparkData={[2100, 2000, 1950, 1900, 1870, 1850]}
            />
            <StatCard
              value="2,350"
              label="Net Income"
              currency="CHF"
              trend={{ direction: 'up', percentage: '+28%' }}
              sparkData={[1100, 1400, 1850, 1700, 2130, 2350]}
            />
          </div>
        </GlassCard>

        {/* Network Intel */}
        <GlassCard>
          <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Network Intel</h3>
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-elevated flex items-center justify-center text-text-secondary text-sm font-medium flex-shrink-0">
              TW
            </div>
            <div>
              <p className="text-text-primary text-sm font-medium">Thomas Weber</p>
              <p className="text-text-secondary text-xs">CTO, Alpine Digital</p>
            </div>
          </div>
          <p className="text-text-secondary text-sm mb-3">
            Mentioned budget approval for Q2 consulting. <span className="text-primary">High-value warm lead</span> — last contact 3 days ago.
          </p>
          <button className="w-full px-3 py-2 rounded-lg text-xs font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
            Draft Message
          </button>
        </GlassCard>

        {/* Content Calendar */}
        <GlassCard>
          <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Content Calendar</h3>
          <div className="space-y-3">
            {[
              { title: 'AI Strategy for SMBs', status: 'DRAFTED' as const },
              { title: 'Newsletter: Feb Edition', status: 'PLANNED' as const },
              { title: 'LinkedIn: Case Study Post', status: 'QUEUE' as const },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <span className="text-text-primary text-sm truncate flex-1 mr-2">{item.title}</span>
                <Badge
                  label={item.status}
                  variant={item.status === 'DRAFTED' ? 'completed' : item.status === 'PLANNED' ? 'active' : 'paused'}
                />
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
