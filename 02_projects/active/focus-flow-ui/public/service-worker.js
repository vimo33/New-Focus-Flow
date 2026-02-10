// Focus Flow Service Worker
// Provides offline functionality with caching strategies

const CACHE_VERSION = 'focus-flow-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const OFFLINE_SYNC_QUEUE = 'offline-captures';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/vite.svg',
];

// ============================================================================
// Installation - Cache static assets
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// ============================================================================
// Activation - Clean up old caches
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches that don't match current version
            if (cacheName.startsWith('focus-flow-') && cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// ============================================================================
// Fetch - Implement caching strategies
// ============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests for caching
  if (request.method !== 'GET') {
    // Handle POST requests for offline capture queueing
    if (url.pathname.includes('/api/capture') && request.method === 'POST') {
      event.respondWith(handleOfflineCapture(request));
    }
    return;
  }

  // API requests - Network first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Static assets - Cache first with network fallback
  event.respondWith(cacheFirstStrategy(request));
});

// ============================================================================
// Caching Strategies
// ============================================================================

/**
 * Cache-first strategy: Try cache first, fall back to network
 * Used for static assets (HTML, CSS, JS, images)
 */
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }

    console.log('[SW] Cache miss, fetching from network:', request.url);
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache-first strategy failed:', error);

    // If offline and navigating to a page, show offline page
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/offline.html');
      if (offlineResponse) {
        return offlineResponse;
      }
    }

    // Return a basic error response
    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    });
  }
}

/**
 * Network-first strategy: Try network first, fall back to cache
 * Used for API calls
 */
async function networkFirstStrategy(request) {
  try {
    console.log('[SW] Fetching from network:', request.url);
    const networkResponse = await fetch(request);

    // Cache successful GET responses from API
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      console.log('[SW] Serving API response from cache:', request.url);
      // Add a custom header to indicate this is from cache
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-From-Cache', 'true');

      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers,
      });
    }

    // No cache available, return error
    console.error('[SW] No cache available for:', request.url);
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'No network connection and no cached data available'
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    });
  }
}

// ============================================================================
// Offline Capture Queueing
// ============================================================================

/**
 * Handle capture requests when offline
 * Queue them for later sync when connection is restored
 */
async function handleOfflineCapture(request) {
  try {
    // Try network first
    return await fetch(request.clone());
  } catch (error) {
    console.log('[SW] Offline, queueing capture for later sync');

    try {
      // Clone the request and read the body
      const requestClone = request.clone();
      const body = await requestClone.json();

      // Store in IndexedDB for background sync
      await queueOfflineCapture(body);

      // Return a response indicating queued status
      return new Response(JSON.stringify({
        status: 'queued',
        message: 'Capture queued for sync when online',
        data: body,
        offline: true,
      }), {
        status: 202,
        statusText: 'Accepted',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      });
    } catch (queueError) {
      console.error('[SW] Failed to queue offline capture:', queueError);
      return new Response(JSON.stringify({
        error: 'Failed to queue offline capture',
        message: queueError.message
      }), {
        status: 500,
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      });
    }
  }
}

/**
 * Queue an offline capture in IndexedDB
 */
function queueOfflineCapture(captureData) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('focus-flow-offline', 1);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(OFFLINE_SYNC_QUEUE)) {
        const objectStore = db.createObjectStore(OFFLINE_SYNC_QUEUE, {
          keyPath: 'id',
          autoIncrement: true
        });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([OFFLINE_SYNC_QUEUE], 'readwrite');
      const objectStore = transaction.objectStore(OFFLINE_SYNC_QUEUE);

      const data = {
        ...captureData,
        timestamp: new Date().toISOString(),
        synced: false,
      };

      const addRequest = objectStore.add(data);

      addRequest.onsuccess = () => {
        console.log('[SW] Capture queued successfully');
        resolve();
      };

      addRequest.onerror = () => reject(addRequest.error);

      transaction.oncomplete = () => db.close();
    };
  });
}

// ============================================================================
// Background Sync (if supported)
// ============================================================================

if ('sync' in self.registration) {
  self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync event:', event.tag);

    if (event.tag === 'sync-captures') {
      event.waitUntil(syncOfflineCaptures());
    }
  });
}

/**
 * Sync queued offline captures when back online
 */
async function syncOfflineCaptures() {
  console.log('[SW] Syncing offline captures...');

  return new Promise((resolve, reject) => {
    const request = indexedDB.open('focus-flow-offline', 1);

    request.onerror = () => {
      console.error('[SW] Failed to open IndexedDB for sync');
      reject(request.error);
    };

    request.onsuccess = async (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(OFFLINE_SYNC_QUEUE)) {
        console.log('[SW] No offline queue found');
        db.close();
        resolve();
        return;
      }

      const transaction = db.transaction([OFFLINE_SYNC_QUEUE], 'readonly');
      const objectStore = transaction.objectStore(OFFLINE_SYNC_QUEUE);
      const getAllRequest = objectStore.getAll();

      getAllRequest.onsuccess = async () => {
        const captures = getAllRequest.result;
        console.log(`[SW] Found ${captures.length} captures to sync`);

        if (captures.length === 0) {
          db.close();
          resolve();
          return;
        }

        // Sync each capture
        const syncPromises = captures.map(async (capture) => {
          try {
            const response = await fetch('/api/capture', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: capture.text,
                prefix: capture.prefix,
                source: capture.source || 'pwa',
                metadata: capture.metadata,
              }),
            });

            if (response.ok) {
              console.log('[SW] Successfully synced capture:', capture.id);
              // Mark as synced and remove from queue
              const deleteTransaction = db.transaction([OFFLINE_SYNC_QUEUE], 'readwrite');
              const deleteStore = deleteTransaction.objectStore(OFFLINE_SYNC_QUEUE);
              deleteStore.delete(capture.id);
              return true;
            } else {
              console.error('[SW] Failed to sync capture:', capture.id, response.status);
              return false;
            }
          } catch (error) {
            console.error('[SW] Error syncing capture:', capture.id, error);
            return false;
          }
        });

        await Promise.all(syncPromises);
        db.close();
        resolve();
      };

      getAllRequest.onerror = () => {
        console.error('[SW] Failed to get captures for sync');
        db.close();
        reject(getAllRequest.error);
      };
    };
  });
}

// ============================================================================
// Message Handling
// ============================================================================

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'SYNC_CAPTURES') {
    syncOfflineCaptures()
      .then(() => {
        event.ports[0].postMessage({ success: true });
      })
      .catch((error) => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
  }
});

console.log('[SW] Service worker script loaded');
