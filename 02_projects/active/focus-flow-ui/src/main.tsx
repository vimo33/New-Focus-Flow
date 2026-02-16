import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
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

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[SW] New service worker available. Refresh to update.');
                // Optionally show a notification to the user
                if (confirm('A new version of Nitara is available. Reload to update?')) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
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

    // Handle controller change (new service worker activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] Controller changed, reloading page...');
      window.location.reload();
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
