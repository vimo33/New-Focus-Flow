import { lazy, Suspense } from 'react';
import IconRail from '../Sidebar/IconRail';
import ConversationRail from '../ConversationRail/ConversationRail';

const CanvasRouter = lazy(() => import('../Canvas/CanvasRouter'));
const CommandPalette = lazy(() => import('../CommandPalette/CommandPalette'));

export function NitaraLayout() {
  return (
    <div className="h-screen bg-base text-text-primary overflow-hidden">
      {/* Icon Rail — 48px fixed left sidebar */}
      <IconRail />

      {/* Canvas Area — fills remaining space, with bottom padding for conversation rail */}
      <main className="ml-12 h-full pb-24 overflow-y-auto">
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

      {/* Conversation Rail — persistent bottom bar */}
      <ConversationRail />

      {/* Command Palette — Cmd+K overlay, always mounted but hidden */}
      <Suspense fallback={null}>
        <CommandPalette />
      </Suspense>
    </div>
  );
}
