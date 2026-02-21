import { useState } from 'react';
import { Cpu, Settings2, DollarSign } from 'lucide-react';
import { GlassCard, StatCard } from '../shared';

// Known model configurations (mirrors model-router.service.ts)
const MODEL_CONFIGS = [
  { id: 'opus', name: 'Claude Opus 4.6', cost: '$15/MTok', speed: 'Slow', quality: 'Highest', agents: ['nitara-portfolio-analyst', 'nitara-builder', 'nitara-meta'] },
  { id: 'sonnet', name: 'Claude Sonnet 4.6', cost: '$3/MTok', speed: 'Fast', quality: 'High', agents: ['nitara-researcher', 'nitara-network-analyst'] },
  { id: 'haiku', name: 'Claude Haiku 4.5', cost: '$0.25/MTok', speed: 'Very Fast', quality: 'Good', agents: [] },
];

export default function ModelTuning() {
  const [configs] = useState(MODEL_CONFIGS);

  const totalAgents = configs.reduce((s, c) => s + c.agents.length, 0);

  return (
    <div data-testid="canvas-model-tuning" className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Cpu size={20} className="text-tertiary" />
          Model Tuning
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Model assignments per agent and cost optimization
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard value={String(configs.length)} label="Available Models" />
        <StatCard value={String(totalAgents)} label="Agent Assignments" />
        <StatCard value="$3-15" label="Cost Range (MTok)" />
      </div>

      {/* Model Cards */}
      <div className="space-y-4">
        {configs.map(config => (
          <GlassCard key={config.id}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">{config.name}</h3>
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <DollarSign size={10} /> {config.cost}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Settings2 size={10} /> {config.speed}
                  </span>
                </div>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                config.quality === 'Highest' ? 'bg-success/20 text-success' :
                config.quality === 'High' ? 'bg-primary/20 text-primary' :
                'bg-tertiary/20 text-tertiary'
              }`}>
                {config.quality}
              </span>
            </div>

            {config.agents.length > 0 ? (
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">Assigned Agents</p>
                <div className="flex flex-wrap gap-2">
                  {config.agents.map(agent => (
                    <span
                      key={agent}
                      className="text-xs px-2.5 py-1 rounded-full bg-white/[0.03] text-slate-400 border border-white/5"
                    >
                      {agent}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600">No agents assigned — available as fallback</p>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
