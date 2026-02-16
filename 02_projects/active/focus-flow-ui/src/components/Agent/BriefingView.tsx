import { useEffect } from 'react';
import { useAgentStore } from '../../stores/agent';
import { ActivityTimeline } from './ActivityTimeline';

export function BriefingView() {
  const { briefing, agentState, loading, fetchBriefing, generateBriefing, approveWorkPlan } = useAgentStore();

  useEffect(() => {
    fetchBriefing();
  }, []);

  const handleApproveWorkPlan = async () => {
    if (agentState?.active_work_plan?.id) {
      await approveWorkPlan(agentState.active_work_plan.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Co-CEO Briefing</h1>
          <p className="text-gray-400 text-sm mt-1">
            {briefing ? `Generated ${new Date(briefing.generated_at).toLocaleString()}` : 'No briefing generated today'}
          </p>
        </div>
        <button
          onClick={generateBriefing}
          disabled={loading}
          className="bg-primary hover:bg-primary/80 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          {loading ? 'Generating...' : 'Generate Briefing'}
        </button>
      </div>

      {!briefing ? (
        <div className="bg-card-dark rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-[48px] text-gray-600">summarize</span>
          <p className="text-gray-400 mt-3">No briefing yet. Click "Generate Briefing" to get started.</p>
        </div>
      ) : (
        <>
          {/* AI Summary */}
          <div className="bg-card-dark rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">Executive Summary</h2>
            <p className="text-gray-300 leading-relaxed">{briefing.ai_summary}</p>
          </div>

          {/* Portfolio Overview */}
          <div className="bg-card-dark rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">
              Portfolio ({briefing.portfolio_overview.total_projects} projects)
            </h2>
            <div className="space-y-2">
              {briefing.portfolio_overview.active_projects.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm text-white font-medium">{p.title}</p>
                    <p className="text-xs text-gray-400">
                      {p.phase} / {p.sub_state}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {briefing.portfolio_overview.active_projects.length === 0 && (
                <p className="text-sm text-gray-500">No active projects</p>
              )}
            </div>
          </div>

          {/* Overdue Tasks */}
          {briefing.portfolio_overview.overdue_tasks.length > 0 && (
            <div className="bg-card-dark rounded-xl p-6 border border-red-500/20">
              <h2 className="text-lg font-semibold text-red-400 mb-3">
                Overdue Tasks ({briefing.portfolio_overview.overdue_tasks.length})
              </h2>
              <div className="space-y-2">
                {briefing.portfolio_overview.overdue_tasks.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                    <p className="text-sm text-white">{t.title}</p>
                    <span className="text-xs text-red-400">Due: {t.due_date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Work Plan */}
          <div className="bg-card-dark rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Work Plan ({briefing.work_plan.length} items)</h2>
              {agentState?.active_work_plan && !agentState.active_work_plan.approved && (
                <button
                  onClick={handleApproveWorkPlan}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-1.5 rounded transition-colors"
                >
                  Approve Plan
                </button>
              )}
            </div>
            <div className="space-y-2">
              {briefing.work_plan.map((item: any) => {
                const tierColors: Record<number, string> = {
                  1: 'text-green-400',
                  2: 'text-yellow-400',
                  3: 'text-red-400',
                };
                const priorityColors: Record<string, string> = {
                  critical: 'bg-red-500/20 text-red-400',
                  high: 'bg-orange-500/20 text-orange-400',
                  medium: 'bg-blue-500/20 text-blue-400',
                  low: 'bg-gray-500/20 text-gray-400',
                };
                return (
                  <div key={item.id} className="flex items-start justify-between py-2 border-b border-gray-700 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm text-white">{item.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs text-purple-400">{item.action}</code>
                        <span className={`text-xs ${tierColors[item.trust_tier] || ''}`}>
                          Tier {item.trust_tier}
                        </span>
                        {item.estimated_cost && (
                          <span className="text-xs text-gray-500">{item.estimated_cost}</span>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${priorityColors[item.priority] || ''}`}>
                      {item.priority}
                    </span>
                  </div>
                );
              })}
              {briefing.work_plan.length === 0 && (
                <p className="text-sm text-gray-500">No items in work plan</p>
              )}
            </div>
          </div>

          {/* Stalled Items */}
          {briefing.stalled_items.length > 0 && (
            <div className="bg-card-dark rounded-xl p-6 border border-yellow-500/20">
              <h2 className="text-lg font-semibold text-yellow-400 mb-3">
                Stalled ({briefing.stalled_items.length})
              </h2>
              <div className="space-y-2">
                {briefing.stalled_items.map((s: any, i: number) => (
                  <div key={i} className="py-2 border-b border-gray-700 last:border-0">
                    <p className="text-sm text-white">{s.title}</p>
                    <p className="text-xs text-gray-400">{s.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cost Estimate */}
          <div className="bg-card-dark rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-3">Cost Estimate</h2>
            <div className="flex gap-6">
              <div>
                <p className="text-2xl font-bold text-white">{briefing.cost_estimate.estimated_tokens.toLocaleString()}</p>
                <p className="text-xs text-gray-400">Estimated Tokens</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">${briefing.cost_estimate.estimated_cost_usd.toFixed(4)}</p>
                <p className="text-xs text-gray-400">Estimated Cost</p>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <ActivityTimeline />
        </>
      )}

      {/* Always show timeline even without briefing */}
      {!briefing && <ActivityTimeline />}
    </div>
  );
}
