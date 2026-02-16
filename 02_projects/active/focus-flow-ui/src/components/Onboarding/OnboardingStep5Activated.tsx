import { useState } from 'react';
import { useOnboardingStore } from '../../stores/onboarding';
import { useCanvasStore } from '../../stores/canvas';
import { api } from '../../services/api';
import { GlassCard } from '../shared';

export default function OnboardingStep5Activated() {
  const { profileData, archetypeChoice, importJobId, reset } = useOnboardingStore();
  const setCanvas = useCanvasStore((s) => s.setCanvas);
  const [activating, setActivating] = useState(false);

  const archetypeLabels: Record<string, string> = {
    strategist: 'The Strategist',
    cofounder: 'The Co-Founder',
    critic: 'The Critic',
  };

  const handleActivate = async () => {
    if (activating) return;
    setActivating(true);

    try {
      await api.post('/profile', { onboarding_completed: true });
    } catch {
      // Continue anyway; we can mark onboarding completed later
    }

    setCanvas('morning_briefing');
    reset();
  };

  return (
    <div className="w-full max-w-2xl space-y-8 text-center">
      {/* Pulsing glow */}
      <div className="animate-pulse bg-primary/20 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
        <span className="text-primary text-4xl">{'\u2726'}</span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-text-primary text-3xl font-bold">System Activated</h2>
        <p className="text-text-secondary text-sm">
          Nitara is now calibrated to your world.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="text-center space-y-1">
          <p className="text-text-tertiary text-xs uppercase tracking-wider font-semibold">
            Profile
          </p>
          <p className="text-text-primary font-semibold">
            {profileData?.name || 'Set up'}
          </p>
          <p className="text-text-secondary text-sm">
            {archetypeChoice
              ? archetypeLabels[archetypeChoice] || archetypeChoice
              : 'No archetype'}
          </p>
        </GlassCard>

        <GlassCard className="text-center space-y-1">
          <p className="text-text-tertiary text-xs uppercase tracking-wider font-semibold">
            Network
          </p>
          <p className="text-text-primary font-semibold">
            {importJobId ? 'Imported' : 'Skipped'}
          </p>
          <p className="text-text-secondary text-sm">
            {importJobId ? 'Contacts mapped' : 'Can add later'}
          </p>
        </GlassCard>

        <GlassCard className="text-center space-y-1">
          <p className="text-text-tertiary text-xs uppercase tracking-wider font-semibold">
            Financials
          </p>
          <p className="text-text-primary font-semibold">Configured</p>
          <p className="text-text-secondary text-sm">Revenue streams mapped</p>
        </GlassCard>
      </div>

      {/* Activate button */}
      <div className="pt-4">
        <button
          onClick={handleActivate}
          disabled={activating}
          className="bg-primary text-base px-8 py-3 rounded-xl font-semibold text-lg hover:bg-primary/80 transition-colors disabled:opacity-50"
        >
          {activating ? 'Activating...' : 'Enter Morning Briefing'}
        </button>
      </div>
    </div>
  );
}
