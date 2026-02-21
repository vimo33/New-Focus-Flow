import { create } from 'zustand';

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

interface OnboardingStore {
  currentStep: OnboardingStep;
  profileData: any;
  archetypeChoice: string | null;
  importJobId: string | null;
  setStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setProfileData: (data: any) => void;
  setArchetypeChoice: (archetype: string) => void;
  setImportJobId: (id: string) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  currentStep: 1,
  profileData: null,
  archetypeChoice: null,
  importJobId: null,
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => {
    const current = get().currentStep;
    if (current < 5) set({ currentStep: (current + 1) as OnboardingStep });
  },
  prevStep: () => {
    const current = get().currentStep;
    if (current > 1) set({ currentStep: (current - 1) as OnboardingStep });
  },
  setProfileData: (data) => set({ profileData: data }),
  setArchetypeChoice: (archetype) => set({ archetypeChoice: archetype }),
  setImportJobId: (id) => set({ importJobId: id }),
  reset: () => set({ currentStep: 1, profileData: null, archetypeChoice: null, importJobId: null }),
}));
