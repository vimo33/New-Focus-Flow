import { useOnboardingStore } from '../../stores/onboarding';
import type { OnboardingStep } from '../../stores/onboarding';
import OnboardingStep1Profile from './OnboardingStep1Profile';
import OnboardingStep2Archetype from './OnboardingStep2Archetype';
import OnboardingStep3Network from './OnboardingStep3Network';
import OnboardingStep4Financials from './OnboardingStep4Financials';
import OnboardingStep5Activated from './OnboardingStep5Activated';

const steps: OnboardingStep[] = [1, 2, 3, 4, 5];

function StepRenderer({ step }: { step: OnboardingStep }) {
  switch (step) {
    case 1:
      return <OnboardingStep1Profile />;
    case 2:
      return <OnboardingStep2Archetype />;
    case 3:
      return <OnboardingStep3Network />;
    case 4:
      return <OnboardingStep4Financials />;
    case 5:
      return <OnboardingStep5Activated />;
    default:
      return null;
  }
}

export default function OnboardingFlow() {
  const currentStep = useOnboardingStore((s) => s.currentStep);

  return (
    <div className="min-h-screen bg-base flex flex-col">
      {/* Top branding */}
      <div className="pt-6 text-center">
        <span className="text-text-tertiary text-xs font-semibold tracking-[0.3em] uppercase">
          Nitara
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-3 py-6">
        {steps.map((step) => (
          <div
            key={step}
            className={`rounded-full transition-all ${
              step === currentStep
                ? 'bg-primary w-3 h-3'
                : step < currentStep
                  ? 'bg-primary/50 w-2.5 h-2.5'
                  : 'bg-elevated w-2 h-2'
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <StepRenderer step={currentStep} />
      </div>
    </div>
  );
}
