import { useState } from 'react';
import { useOnboardingStore } from '../../stores/onboarding';
import { api } from '../../services/api';
import { GlassCard, Badge } from '../shared';

interface Archetype {
  id: string;
  name: string;
  icon: string;
  description: string;
  traits: string[];
}

const archetypes: Archetype[] = [
  {
    id: 'strategist',
    name: 'The Strategist',
    icon: '\u265F',
    description:
      'Big-picture thinking. Nitara focuses on long-term strategy, market positioning, and growth frameworks.',
    traits: ['Strategic Planning', 'Market Analysis', 'Growth Focus'],
  },
  {
    id: 'cofounder',
    name: 'The Co-Founder',
    icon: '\uD83E\uDD1D',
    description:
      'Balanced partner. Nitara helps across operations, strategy, and execution \u2014 like a true co-founder.',
    traits: ['Operations', 'Strategy', 'Execution'],
  },
  {
    id: 'critic',
    name: 'The Critic',
    icon: '\uD83D\uDD0D',
    description:
      "Devil's advocate. Nitara challenges assumptions, stress-tests ideas, and identifies blind spots.",
    traits: ['Risk Assessment', 'Due Diligence', 'Critical Analysis'],
  },
];

export default function OnboardingStep2Archetype() {
  const { archetypeChoice, setArchetypeChoice, nextStep } = useOnboardingStore();
  const [selected, setSelected] = useState<string | null>(archetypeChoice);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (id: string) => {
    setSelected(id);
    setArchetypeChoice(id);

    try {
      await api.post('/profile/archetype', { archetype: id });
    } catch (err) {
      // Archetype will be saved on continue if this fails
    }
  };

  const handleContinue = async () => {
    if (!selected || saving) return;
    setSaving(true);

    try {
      await api.post('/profile/archetype', { archetype: selected });
      nextStep();
    } catch (err) {
      // Continue anyway; archetype can be re-set later
      nextStep();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-3xl space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-text-primary text-2xl font-bold">
          Choose Your AI Partner Style
        </h2>
        <p className="text-text-secondary text-sm">
          This shapes how Nitara communicates and prioritizes for you.
        </p>
      </div>

      {/* Archetype cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {archetypes.map((arch) => (
          <GlassCard
            key={arch.id}
            className={`cursor-pointer transition-all hover:scale-[1.02] ${
              selected === arch.id
                ? 'border-primary bg-primary/5'
                : 'border-[var(--glass-border)]'
            }`}
          >
            <button
              onClick={() => handleSelect(arch.id)}
              className="w-full text-left space-y-3"
            >
              <span className="text-3xl block">{arch.icon}</span>
              <h3 className="text-text-primary font-semibold text-lg">{arch.name}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                {arch.description}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {arch.traits.map((trait) => (
                  <Badge
                    key={trait}
                    label={trait}
                    variant={selected === arch.id ? 'active' : 'paused'}
                  />
                ))}
              </div>
            </button>
          </GlassCard>
        ))}
      </div>

      {/* Continue */}
      <div className="flex justify-center">
        <button
          onClick={handleContinue}
          disabled={!selected || saving}
          className="bg-primary text-base px-6 py-2 rounded-lg font-medium hover:bg-primary/80 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
