import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useThreadsStore } from '../../stores/threads';
import { useVoiceCommands } from '../../hooks/useVoiceCommands';
import { ThreadSidebar } from './ThreadSidebar';
import { ChatPanel } from './ChatPanel';
import { ActionPanel } from './ActionPanel';

export function Voice() {
  const { threadId } = useParams<{ threadId?: string }>();
  const navigate = useNavigate();
  const { activeThreadId, selectThread } = useThreadsStore();
  const { suggestedActions, approveAction, rejectAction } = useVoiceCommands();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ttsEnabled] = useState(true);

  // Sync URL param to store
  useEffect(() => {
    if (threadId && threadId !== activeThreadId) {
      selectThread(threadId);
    } else if (!threadId && activeThreadId) {
      // URL has no threadId but store does — update URL
      navigate(`/voice/${activeThreadId}`, { replace: true });
    }
  }, [threadId]);

  // When active thread changes in store, update URL
  useEffect(() => {
    if (activeThreadId && activeThreadId !== threadId) {
      navigate(`/voice/${activeThreadId}`, { replace: true });
    } else if (!activeThreadId && threadId) {
      navigate('/voice', { replace: true });
    }
  }, [activeThreadId]);


  return (
    <div className="h-screen flex" data-testid="voice-cockpit">
      <ThreadSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <ChatPanel
        onToggleSidebar={() => setSidebarOpen((p) => !p)}
        ttsEnabled={ttsEnabled}
      />

      <ActionPanel
        actions={suggestedActions}
        onApprove={approveAction}
        onReject={rejectAction}
      />
    </div>
  );
}
