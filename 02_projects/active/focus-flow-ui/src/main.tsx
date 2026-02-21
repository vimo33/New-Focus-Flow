import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Error boundary to catch React crashes and display a visible error instead of white screen
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ background: '#06080F', color: '#E8ECF1', minHeight: '100vh', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ color: '#EF4444', fontSize: '1.25rem', marginBottom: '1rem' }}>Something went wrong</h1>
          <pre style={{ color: '#7B8FA3', fontSize: '0.875rem', maxWidth: '90vw', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '1.5rem', padding: '0.5rem 1.5rem', background: '#00E5FF', color: '#06080F', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// ============================================================================
// Service Worker Registration
// ============================================================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('[SW] Service Worker registered successfully:', registration.scope);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute

        // Listen for updates — silently activate new SW without prompting
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[SW] New service worker available, activating silently.');
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });

        // Sync offline captures when back online
        if ('sync' in registration && registration.sync) {
          window.addEventListener('online', () => {
            console.log('[SW] Back online, syncing offline captures...');
            (registration as any).sync.register('sync-captures').catch((error: Error) => {
              console.error('[SW] Background sync registration failed:', error);
              // Fallback: trigger sync manually via message
              triggerManualSync();
            });
          });
        } else {
          // Fallback for browsers without background sync
          window.addEventListener('online', () => {
            console.log('[SW] Back online, triggering manual sync...');
            triggerManualSync();
          });
        }
      })
      .catch((error) => {
        console.error('[SW] Service Worker registration failed:', error);
      });

    // Handle controller change — log only, no forced reload
    // Navigation requests use network-first so next navigation gets fresh content
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] Controller changed. Fresh content will load on next navigation.');
    });
  });
}

/**
 * Trigger manual sync of offline captures
 */
function triggerManualSync() {
  if (navigator.serviceWorker.controller) {
    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = (event) => {
      if (event.data.success) {
        console.log('[SW] Offline captures synced successfully');
      } else {
        console.error('[SW] Offline sync failed:', event.data.error);
      }
    };

    navigator.serviceWorker.controller.postMessage(
      { type: 'SYNC_CAPTURES' },
      [messageChannel.port2]
    );
  }
}
