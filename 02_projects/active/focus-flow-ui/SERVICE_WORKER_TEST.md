# Service Worker Testing Guide

This document explains how to test the offline functionality of Focus Flow.

## Features Implemented

### 1. Service Worker Registration
- **Location**: `/srv/focus-flow/02_projects/active/focus-flow-ui/public/service-worker.js`
- **Registration**: `/srv/focus-flow/02_projects/active/focus-flow-ui/src/main.tsx`

### 2. Caching Strategies

#### Cache-First Strategy (Static Assets)
- Used for: HTML, CSS, JS, images, fonts
- Behavior: Serves from cache if available, falls back to network
- Benefits: Instant loading, works offline after first visit

#### Network-First Strategy (API Calls)
- Used for: All `/api/*` endpoints
- Behavior: Tries network first, falls back to cache if offline
- Benefits: Always fresh data when online, graceful degradation when offline

### 3. Offline Fallback Page
- **Location**: `/srv/focus-flow/02_projects/active/focus-flow-ui/public/offline.html`
- Displayed when navigating to uncached pages while offline
- Auto-detects when back online and redirects

### 4. Offline Capture Queueing
- Captures made while offline are queued in IndexedDB
- Automatically synced when connection is restored
- Uses Background Sync API when available
- Falls back to manual sync on 'online' event

### 5. Cache Versioning
- Cache version: `focus-flow-v1`
- Separate caches for static and API content
- Old caches automatically cleaned up on activation

## Testing Instructions

### Test 1: Install and Cache Static Assets

1. Start the dev server:
   ```bash
   cd /srv/focus-flow/02_projects/active/focus-flow-ui
   npm run dev
   ```

2. Open Chrome DevTools (F12)
3. Go to Application > Service Workers
4. Verify service worker is registered and activated
5. Go to Application > Cache Storage
6. Verify `focus-flow-v1-static` cache exists with assets

### Test 2: Offline Page Loading

1. With the app loaded, open DevTools
2. Go to Network tab
3. Check "Offline" checkbox to simulate offline mode
4. Refresh the page
5. Verify the app loads from cache
6. Navigate around - cached pages should work
7. Try to navigate to a new route
8. Should see offline.html page

### Test 3: API Caching

1. Start with app online
2. Navigate to inbox, tasks, etc. to load data
3. Open DevTools > Application > Cache Storage
4. Verify `focus-flow-v1-api` cache has API responses
5. Go offline (Network tab > Offline checkbox)
6. Navigate to pages - should see cached data
7. Look for "X-From-Cache: true" header in responses

### Test 4: Offline Capture Queueing

1. Make sure app is loaded
2. Go offline (DevTools > Network > Offline)
3. Try to create a quick capture
4. Should receive 202 status with "queued" message
5. Open DevTools > Application > IndexedDB
6. Verify `focus-flow-offline` database exists
7. Check `offline-captures` store has the queued item
8. Go back online
9. Service worker should sync automatically
10. Verify item appears in inbox
11. Check IndexedDB - queued item should be removed

### Test 5: Background Sync (Chrome/Edge only)

1. Load app online
2. Go offline
3. Create a capture (gets queued)
4. Close the browser tab
5. Go back online (on device level, not just DevTools)
6. Browser should trigger background sync
7. Open app again - capture should be synced

### Test 6: Manual Sync Fallback

1. Load app
2. Go offline
3. Create a capture (gets queued)
4. In DevTools Console, run:
   ```javascript
   const channel = new MessageChannel();
   channel.port1.onmessage = (e) => console.log('Sync result:', e.data);
   navigator.serviceWorker.controller.postMessage(
     { type: 'SYNC_CAPTURES' },
     [channel.port2]
   );
   ```
5. Should trigger manual sync

### Test 7: Service Worker Updates

1. Modify service-worker.js (e.g., change cache version)
2. Refresh the page
3. Should see console message about new version
4. Click "OK" on update prompt
5. Page reloads with new service worker

## Chrome DevTools Tips

### View Service Worker State
1. F12 > Application > Service Workers
2. Check status: Installing, Waiting, or Activated
3. Use "Update" button to manually check for updates
4. Use "Unregister" to remove service worker

### View Caches
1. F12 > Application > Cache Storage
2. Expand cache names to see cached resources
3. Right-click to delete individual items or entire caches

### View IndexedDB
1. F12 > Application > IndexedDB
2. Expand `focus-flow-offline` database
3. View `offline-captures` object store
4. See queued captures waiting to sync

### Simulate Offline
1. F12 > Network tab
2. Check "Offline" checkbox
3. Or use throttling dropdown: "Offline"

### Service Worker Console
1. F12 > Application > Service Workers
2. Click "Console" link next to service worker
3. Opens dedicated console showing SW logs

## Expected Behaviors

### When Online
- Service worker registers successfully
- Static assets cached on first load
- API responses cached after fetching
- Updates check every minute
- Captures sync immediately

### When Going Offline
- Previously loaded pages work from cache
- API calls return cached data with X-From-Cache header
- New captures are queued in IndexedDB
- Offline page shown for uncached navigation

### When Coming Back Online
- Automatic sync of queued captures
- Service worker checks for updates
- Fresh API data fetched
- Cache updated with new responses

## Troubleshooting

### Service Worker Not Registering
- Check browser console for errors
- Verify service-worker.js is accessible at /service-worker.js
- Service workers require HTTPS (or localhost)

### Caching Not Working
- Check if service worker is activated
- Verify network requests in DevTools
- Look for "(ServiceWorker)" in Size column
- Check cache storage for entries

### Offline Captures Not Syncing
- Check IndexedDB for queued items
- Look for sync errors in service worker console
- Verify API endpoint is accessible when online
- Check network tab for sync requests

### Cache Not Clearing
- Manually unregister service worker
- Clear site data: DevTools > Application > Clear Storage
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

## Browser Compatibility

### Full Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 15.4+

### Background Sync
- Chrome/Edge only
- Falls back to manual sync in other browsers

### IndexedDB
- All modern browsers

## Performance Notes

- Static assets load instantly from cache
- API calls are fast when cached
- Offline queue is lightweight (IndexedDB)
- Cache cleanup runs on activation
- Update checks run every 60 seconds

## Files Modified

1. `/srv/focus-flow/02_projects/active/focus-flow-ui/public/service-worker.js` - Main service worker
2. `/srv/focus-flow/02_projects/active/focus-flow-ui/public/offline.html` - Offline fallback page
3. `/srv/focus-flow/02_projects/active/focus-flow-ui/src/main.tsx` - Service worker registration

## Next Steps

To enable in production:
1. Fix TypeScript errors in other components
2. Run `npm run build`
3. Deploy dist folder to hosting
4. Ensure HTTPS is enabled
5. Verify service-worker.js is served with correct MIME type
