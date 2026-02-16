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
      try {
        await api.getProfile();
        // Profile exists, proceed normally
      } catch {
        // No profile (404) — redirect to onboarding
        setCanvas('onboarding');
      } finally {
        setCheckedProfile(true);
      }
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
    <div className="h-screen bg-base text-text-primary overflow-hidden">
      {/* Icon Rail — hidden during onboarding */}
      {!isOnboarding && <IconRail />}

      {/* Canvas Area */}
      <main className={`h-full ${isOnboarding ? '' : 'ml-12 pb-24'} overflow-y-auto`}>
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
