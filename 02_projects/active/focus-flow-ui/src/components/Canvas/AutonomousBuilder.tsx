import { useEffect, useState } from 'react';
import { Bot, Zap, ListTodo, Play, AlertTriangle, Activity } from 'lucide-react';
import { useAgentStore } from '../../stores/agent';
import { api } from '../../services/api';
import { StatCard, GlassCard, KillSwitchToggle } from '../shared';

export default function AutonomousBuilder() {
  const { agentState, notifications, connected, connectSSE, fetchState, fetchNotifications } = useAgentStore();
  const [tasks, setTasks] = useState<any[]>([]);
  const [killSwitchActive, setKillSwitchActive] = useState(false);

  useEffect(() => {
    connectSSE();
    fetchState();
    fetchNotifications();
    loadQueueData();
  }, []);

  async function loadQueueData() {
    try {
      const [stats, taskRes] = await Promise.all([
        api.getQueueStats(),
        api.getQueueTasks(),
      ]);
      setTasks(taskRes.tasks || []);
      if (stats.kill_switch_active) setKillSwitchActive(true);
    } catch {}
  }

  const dailyStats = agentState?.daily_stats || {};
  const workPlan = agentState?.active_work_plan;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const runningCount = tasks.filter(t => t.status === 'running').length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Bot size={20} className="text-primary" />
            Autonomous Builder
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Agent orchestration and task execution
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Kill Switch</span>
          <KillSwitchToggle
            initialActive={killSwitchActive}
            onToggle={(active) => setKillSwitchActive(active)}
          />
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-success' : 'bg-danger'}`} />
          <span className="text-xs text-slate-500">{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          value={String(dailyStats.tool_calls || 0)}
          label="Tool Calls Today"
        />
        <StatCard
          value={String(runningCount)}
          label="Active Agents"
        />
        <StatCard
          value={String(pendingCount)}
          label="Queue Depth"
        />
        <StatCard
          value={String(agentState?.pending_approvals?.length || 0)}
          label="Pending Approvals"
        />
      </div>

      {/* Execution Preview */}
      {(runningCount > 0 || pendingCount > 0) && (
        <GlassCard className="mb-6">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
            <Play size={14} className="text-success" />
            Execution Preview
          </h2>
          <div className="space-y-2">
            {tasks.filter(t => t.status === 'running').map((task: any) => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20">
                <Activity size={14} className="text-success animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm text-slate-200">{task.skill}</p>
                  <p className="text-xs text-slate-500">{task.arguments || 'No args'}</p>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-success/20 text-success">running</span>
              </div>
            ))}
            {tasks.filter(t => t.status === 'pending').slice(0, 3).map((task: any) => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <ListTodo size={14} className="text-slate-500" />
                <div className="flex-1">
                  <p className="text-sm text-slate-300">{task.skill}</p>
                  <p className="text-xs text-slate-500">Priority: {task.priority || 'medium'}</p>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400">queued</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Work Plan */}
      {workPlan && (
        <GlassCard className="mb-6">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
            <Zap size={14} className="text-primary" />
            Active Work Plan
          </h2>
          <div className="space-y-2">
            {(workPlan.items || []).map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded bg-white/[0.02]">
                <span className="text-xs text-slate-500 font-mono w-6">{i + 1}</span>
                <p className="text-sm text-slate-300 flex-1">{item.title || item.description || String(item)}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Agent Activity Feed */}
      <GlassCard>
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
          <Activity size={14} className="text-tertiary" />
          Activity Feed
        </h2>
        {notifications.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No recent activity</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {notifications.slice(0, 20).map((n) => (
              <div key={n.id} className="flex items-start gap-3 p-2 rounded hover:bg-white/[0.02]">
                <AlertTriangle size={12} className="text-slate-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 truncate">{n.title}</p>
                  <p className="text-xs text-slate-500 truncate">{n.body}</p>
                </div>
                <span className="text-[10px] text-slate-600 whitespace-nowrap">
                  {new Date(n.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
