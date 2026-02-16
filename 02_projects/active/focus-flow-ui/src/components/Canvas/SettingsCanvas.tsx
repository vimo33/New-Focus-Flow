import { useState } from 'react';
import { GlassCard } from '../shared';

type Archetype = 'strategist' | 'cofounder' | 'critic';

interface ArchetypeOption {
  id: Archetype;
  name: string;
  description: string;
  tone: string;
  confidence: string;
}

const archetypes: ArchetypeOption[] = [
  { id: 'strategist', name: 'The Strategist', description: 'Direct, data-driven, ruthlessly efficient. Focuses on margins and ROI.', tone: 'Professional', confidence: 'HIGH' },
  { id: 'cofounder', name: 'The Co-Founder', description: 'Balanced, collaborative, creative. Focuses on vision and long-term growth.', tone: 'Encouraging', confidence: 'HIGH' },
  { id: 'critic', name: 'The Critic', description: 'Skeptical, risk-averse, thorough. Focuses on edge cases and failure points.', tone: 'Sharp', confidence: 'HIGHEST' },
];

export default function SettingsCanvas() {
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype>('cofounder');
  const [reasoningDepth, setReasoningDepth] = useState(0.5);
  const [autoDrafting, setAutoDrafting] = useState(true);
  const [networkAlerts, setNetworkAlerts] = useState(true);
  const [riskMonitoring, setRiskMonitoring] = useState(true);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <h2 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-8">SETTINGS</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel */}
        <div className="space-y-6">
          {/* Nitara Core */}
          <GlassCard>
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Nitara Core</h3>

            {/* Archetype Selection */}
            <label className="block text-text-secondary text-sm mb-2">Partner Archetype</label>
            <div className="space-y-2 mb-6">
              {archetypes.map((arch) => (
                <button
                  key={arch.id}
                  onClick={() => setSelectedArchetype(arch.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedArchetype === arch.id
                      ? 'border-primary bg-primary/5'
                      : 'border-[var(--glass-border)] hover:border-text-tertiary'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-text-primary text-sm font-medium">{arch.name}</span>
                    {selectedArchetype === arch.id && (
                      <span className="text-primary text-[10px] tracking-wider font-semibold">SELECTED</span>
                    )}
                  </div>
                  <p className="text-text-secondary text-xs">{arch.description}</p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-text-tertiary text-[10px]">Tone: {arch.tone}</span>
                    <span className="text-text-tertiary text-[10px]">Confidence: {arch.confidence}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Reasoning Depth */}
            <label className="block text-text-secondary text-sm mb-2">
              Reasoning Depth: <span className="font-mono text-primary">{reasoningDepth.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={reasoningDepth}
              onChange={(e) => setReasoningDepth(parseFloat(e.target.value))}
              className="w-full h-1 bg-elevated rounded-full appearance-none cursor-pointer accent-primary mb-6"
            />
            <p className="text-text-tertiary text-xs mb-6">
              {reasoningDepth < 0.3 ? 'Quick responses (Haiku)' : reasoningDepth < 0.7 ? 'Balanced analysis (Sonnet)' : 'Deep reasoning (Opus)'}
            </p>

            {/* Proactivity Toggles */}
            <label className="block text-text-secondary text-sm mb-3">Proactivity Protocol</label>
            {[
              { label: 'Auto-drafting', value: autoDrafting, setter: setAutoDrafting },
              { label: 'Network Alerts', value: networkAlerts, setter: setNetworkAlerts },
              { label: 'Risk Monitoring', value: riskMonitoring, setter: setRiskMonitoring },
            ].map((toggle) => (
              <div key={toggle.label} className="flex items-center justify-between py-2">
                <span className="text-text-secondary text-sm">{toggle.label}</span>
                <button
                  onClick={() => toggle.setter(!toggle.value)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    toggle.value ? 'bg-primary' : 'bg-elevated'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    toggle.value ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            ))}
          </GlassCard>

          {/* Voice & Audio */}
          <GlassCard>
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Voice & Audio</h3>
            <label className="block text-text-secondary text-sm mb-2">Output Voice</label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { name: 'Nova', desc: 'Neutral' },
                { name: 'Atlas', desc: 'Direct' },
                { name: 'Lyra', desc: 'Empathetic' },
              ].map((voice) => (
                <button key={voice.name} className="p-2 rounded-lg border border-[var(--glass-border)] hover:border-primary text-center transition-colors">
                  <p className="text-text-primary text-sm">{voice.name}</p>
                  <p className="text-text-tertiary text-[10px]">{voice.desc}</p>
                </button>
              ))}
            </div>
            <label className="block text-text-secondary text-sm mb-2">Input Mode</label>
            <div className="flex gap-2">
              <button className="flex-1 py-2 rounded-lg bg-primary/10 border border-primary text-primary text-sm">Push-to-talk</button>
              <button className="flex-1 py-2 rounded-lg border border-[var(--glass-border)] text-text-secondary text-sm">Voice Active</button>
            </div>
          </GlassCard>
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Identity Card */}
          <GlassCard>
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Identity</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-elevated flex items-center justify-center text-text-secondary text-lg font-medium">
                V
              </div>
              <div>
                <p className="text-text-primary font-medium">Founder</p>
                <p className="text-text-secondary text-sm">Zurich, Switzerland</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {['AI Strategy', 'Consulting', 'Product Dev'].map((tag) => (
                <span key={tag} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs border border-primary/20">
                  {tag}
                </span>
              ))}
              <button className="px-2 py-1 rounded-full border border-dashed border-text-tertiary text-text-tertiary text-xs hover:border-primary hover:text-primary transition-colors">
                + Add Tag
              </button>
            </div>
          </GlassCard>

          {/* System Depth */}
          <GlassCard>
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">System Depth</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-text-secondary text-sm">Model</span>
                <span className="text-text-primary text-sm font-mono">Claude Sonnet 4.5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary text-sm">Context Window</span>
                <span className="text-text-primary text-sm font-mono">200K tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary text-sm">Last Sync</span>
                <span className="text-text-primary text-sm font-mono">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </GlassCard>

          {/* Memory Review */}
          <GlassCard>
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Memory Review</h3>
            <p className="text-text-secondary text-xs mb-3">What Nitara has learned about you:</p>
            <div className="space-y-2">
              {[
                'Prefers morning deep work sessions',
                'AI consulting is primary revenue stream',
                'Risk tolerance: moderate',
                'Preferred currency: CHF',
              ].map((memory, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-[var(--glass-border)] last:border-0">
                  <span className="text-text-secondary text-sm">{memory}</span>
                  <button className="text-text-tertiary hover:text-danger text-xs transition-colors">{'\u00D7'}</button>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
