import { lazy, Suspense, useEffect, useState } from 'react';
import DockNav from '../Dock/DockNav';
import ConversationRail from '../ConversationRail/ConversationRail';
import { useCanvasStore } from '../../stores/canvas';
import { useModeStore, MODE_LABELS } from '../../stores/mode';
import { api } from '../../services/api';

const CanvasRouter = lazy(() => import('../Canvas/CanvasRouter'));
const CommandPalette = lazy(() => import('../CommandPalette/CommandPalette'));

export function NitaraLayout() {
  const { activeCanvas, setCanvas } = useCanvasStore();
  const { activeMode } = useModeStore();
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
            setCanvas('onboarding');
          }
          setCheckedProfile(true);
          return;
        } catch (err: any) {
          const is404 = err?.message?.includes('404');
          if (is404) {
            setCanvas('onboarding');
            setCheckedProfile(true);
            return;
          }
          if (attempt < maxRetries - 1) {
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }
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
      {/* Top bar — mode indicator */}
      {!isOnboarding && (
        <header className="fixed top-0 left-0 right-0 z-40 h-12 flex items-center justify-between px-4 bg-[rgba(15,10,20,0.85)] backdrop-blur-[20px] border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-indigo-400 font-bold text-sm tracking-widest uppercase" style={{ fontFamily: 'var(--font-display, Syncopate, sans-serif)' }}>
              N
            </span>
            <span className="text-slate-400 text-xs font-medium tracking-wider uppercase">
              {MODE_LABELS[activeMode]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">
              Mission Control
            </span>
          </div>
        </header>
      )}

      {/* Canvas Area */}
      <main className={`h-full ${isOnboarding ? '' : 'pt-12 pb-28'} overflow-y-auto`}>
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

      {/* Bottom Dock Navigation — hidden during onboarding */}
      {!isOnboarding && <DockNav />}

      {/* Command Palette — Cmd+K overlay */}
      <Suspense fallback={null}>
        <CommandPalette />
      </Suspense>
    </div>
  );
}
