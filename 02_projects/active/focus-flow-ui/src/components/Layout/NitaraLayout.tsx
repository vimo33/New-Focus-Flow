import { lazy, Suspense, useEffect, useState } from 'react';
import IconRail from '../Sidebar/IconRail';
import ConversationRail from '../ConversationRail/ConversationRail';
import { useCanvasStore } from '../../stores/canvas';
import { api } from '../../services/api';

const CanvasRouter = lazy(() => import('../Canvas/CanvasRouter'));
const CommandPalette = lazy(() => import('../CommandPalette/CommandPalette'));

export function NitaraLayout() {
  const { activeCanvas, setCanvas } = useCanvasStore();
  const [checkedProfile, setCheckedProfile] = useState(false);
  const isOnboarding = activeCanvas === 'onboarding';

  // First-run detection: check if profile exists on mount
  useEffect(() => {
    const checkProfile = async () => {
      const maxRetries = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const profile = await api.getProfile();
          if (profile && !profile.onboarding_completed) {
            // Profile exists but onboarding not completed — redirect
            setCanvas('onboarding');
          }
          // Profile exists and onboarding completed — proceed normally
          setCheckedProfile(true);
          return;
        } catch (err: any) {
          const is404 = err?.message?.includes('404');
          if (is404) {
            // No profile — redirect to onboarding
            setCanvas('onboarding');
            setCheckedProfile(true);
            return;
          }
          // Network / server error — retry after brief delay
          if (attempt < maxRetries - 1) {
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }
      // All retries exhausted — proceed to app rather than blocking user
      setCheckedProfile(true);
    };
    checkProfile();
  }, []);

  if (!checkedProfile) {
    return (
      <div className="h-screen bg-base text-text-primary flex items-center justify-center">
        <div className="text-text-tertiary text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-base text-text-primary overflow-hidden">
      {/* Icon Rail — hidden during onboarding */}
      {!isOnboarding && <IconRail />}

      {/* Canvas Area */}
      <main className={`h-full ${isOnboarding ? '' : 'md:ml-12 pb-20 md:pb-24'} overflow-y-auto`}>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64">
              <div className="text-text-tertiary text-sm">Loading...</div>
            </div>
          }
        >
          <CanvasRouter />
        </Suspense>
      </main>

      {/* Conversation Rail — hidden during onboarding */}
      {!isOnboarding && <ConversationRail />}

      {/* Command Palette — Cmd+K overlay, always mounted but hidden */}
      <Suspense fallback={null}>
        <CommandPalette />
      </Suspense>
    </div>
  );
}
