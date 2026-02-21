import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useCanvasStore } from '../../stores/canvas';
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
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [memories, setMemories] = useState<any[]>([]);
  const [voicePreset, setVoicePreset] = useState(() => localStorage.getItem('nitara-voice-preset') || 'nova');
  const [inputMode, setInputMode] = useState<'push-to-talk' | 'voice-active'>(() =>
    (localStorage.getItem('nitara-input-mode') as any) || 'push-to-talk'
  );

  // Load profile on mount
  useEffect(() => {
    api.getProfile().then(p => {
      setProfile(p);
      if (p.preferred_archetype) setSelectedArchetype(p.preferred_archetype);
      if (p.settings) {
        if (p.settings.reasoning_depth !== undefined) setReasoningDepth(p.settings.reasoning_depth);
        if (p.settings.auto_drafting !== undefined) setAutoDrafting(p.settings.auto_drafting);
        if (p.settings.network_alerts !== undefined) setNetworkAlerts(p.settings.network_alerts);
        if (p.settings.risk_monitoring !== undefined) setRiskMonitoring(p.settings.risk_monitoring);
      }
    }).catch(console.error);

    api.getMemories(10).then(res => {
      setMemories(res.memories || []);
    }).catch(console.error);
  }, []);

  const handleArchetypeChange = async (archetype: Archetype) => {
    setSelectedArchetype(archetype);
    await api.setArchetype(archetype).catch(console.error);
  };

  const saveSettings = async () => {
    setSaving(true);
    await api.saveProfile({
      settings: {
        reasoning_depth: reasoningDepth,
        auto_drafting: autoDrafting,
        network_alerts: networkAlerts,
        risk_monitoring: riskMonitoring,
      },
    }).catch(console.error);
    setSaving(false);
  };

  const handleDeleteMemory = async (id: string) => {
    await api.deleteMemory(id).catch(console.error);
    setMemories(m => m.filter(x => x.id !== id));
  };

  const displayName = profile?.name || 'Founder';
  const location = profile?.location || '';
  const skills = profile?.skills?.map((s: any) => s.name || s) || profile?.strategic_focus_tags || [];

  return (
    <div data-testid="canvas-settings" className="p-6 lg:p-8 max-w-6xl mx-auto">
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
                  onClick={() => handleArchetypeChange(arch.id)}
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

            {/* Save button */}
            <button
              onClick={saveSettings}
              disabled={saving}
              className="mt-4 w-full px-3 py-2 rounded-lg text-xs font-medium bg-primary text-base hover:bg-primary/80 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </GlassCard>

          {/* Voice & Audio */}
          <GlassCard>
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Voice & Audio</h3>
            <label className="block text-text-secondary text-sm mb-2">Output Voice</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {[
                { name: 'Nova', key: 'nova', desc: 'Neutral' },
                { name: 'Atlas', key: 'atlas', desc: 'Direct' },
                { name: 'Lyra', key: 'lyra', desc: 'Empathetic' },
              ].map((voice) => (
                <button
                  key={voice.name}
                  onClick={() => { setVoicePreset(voice.key); localStorage.setItem('nitara-voice-preset', voice.key); }}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    voicePreset === voice.key
                      ? 'border-primary bg-primary/5'
                      : 'border-[var(--glass-border)] hover:border-primary'
                  }`}
                >
                  <p className="text-text-primary text-sm">{voice.name}</p>
                  <p className="text-text-tertiary text-[10px]">{voice.desc}</p>
                  {voicePreset === voice.key && (
                    <p className="text-primary text-[9px] mt-1 tracking-wider font-semibold">SELECTED</p>
                  )}
                </button>
              ))}
            </div>
            <label className="block text-text-secondary text-sm mb-2">Input Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => { setInputMode('push-to-talk'); localStorage.setItem('nitara-input-mode', 'push-to-talk'); }}
                className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                  inputMode === 'push-to-talk'
                    ? 'bg-primary/10 border border-primary text-primary'
                    : 'border border-[var(--glass-border)] text-text-secondary hover:border-primary'
                }`}
              >
                Push-to-talk
              </button>
              <button
                onClick={() => { setInputMode('voice-active'); localStorage.setItem('nitara-input-mode', 'voice-active'); }}
                className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                  inputMode === 'voice-active'
                    ? 'bg-primary/10 border border-primary text-primary'
                    : 'border border-[var(--glass-border)] text-text-secondary hover:border-primary'
                }`}
              >
                Voice Active
              </button>
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
                {displayName[0]?.toUpperCase() || 'F'}
              </div>
              <div>
                <p className="text-text-primary font-medium">{displayName}</p>
                {location && <p className="text-text-secondary text-sm">{location}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {skills.slice(0, 5).map((tag: string) => (
                <span key={tag} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs border border-primary/20">
                  {tag}
                </span>
              ))}
            </div>
          </GlassCard>

          {/* System Depth */}
          <GlassCard>
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">System Depth</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-text-secondary text-sm">Model</span>
                <span className="text-text-primary text-sm font-mono">
                  {reasoningDepth < 0.3 ? 'Claude Haiku 4.5' : reasoningDepth < 0.7 ? 'Claude Sonnet 4.5' : 'Claude Opus 4.6'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary text-sm">Context Window</span>
                <span className="text-text-primary text-sm font-mono">200K tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary text-sm">Voice Preset</span>
                <span className="text-text-primary text-sm font-mono capitalize">{voicePreset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary text-sm">Input Mode</span>
                <span className="text-text-primary text-sm font-mono capitalize">{inputMode.replace('-', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary text-sm">Last Sync</span>
                <span className="text-text-primary text-sm font-mono">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </GlassCard>

          {/* UI Kit link */}
          <GlassCard>
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-3">Developer</h3>
            <button
              onClick={() => useCanvasStore.getState().setCanvas('ui_kit')}
              className="w-full px-3 py-2 rounded-lg text-sm font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
            >
              UI Kit
            </button>
          </GlassCard>

          {/* Memory Review — live from API */}
          <GlassCard>
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">Memory Review</h3>
            <p className="text-text-secondary text-xs mb-3">What Nitara has learned about you:</p>
            <div className="space-y-2">
              {memories.length === 0 ? (
                <p className="text-text-tertiary text-sm">No memories stored yet</p>
              ) : (
                memories.map((memory) => (
                  <div key={memory.id} className="flex items-center justify-between py-1.5 border-b border-[var(--glass-border)] last:border-0">
                    <span className="text-text-secondary text-sm">{memory.memory}</span>
                    <button
                      onClick={() => handleDeleteMemory(memory.id)}
                      className="text-text-tertiary hover:text-danger text-xs transition-colors"
                    >
                      {'\u00D7'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
