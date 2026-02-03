# PWA Setup Documentation

## Overview

Focus Flow is now configured as a Progressive Web App (PWA), allowing it to be installed on mobile devices and desktop computers as a standalone application.

## Configuration Files Created

### 1. `/public/manifest.json`
The Web App Manifest file that defines the PWA properties:
- **Name**: "Focus Flow OS" (full app name)
- **Short Name**: "Focus Flow" (display on home screen)
- **Description**: "Personal productivity and wellbeing system"
- **Start URL**: "/" (where the app launches)
- **Display Mode**: "standalone" (full-screen app experience)
- **Colors**:
  - Background: #101922 (dark navy)
  - Theme: #137fec (bright blue)
- **Icons**: 8 different sizes (72, 96, 128, 144, 152, 192, 384, 512px)
- **Shortcuts**:
  - Quick Capture (/capture)
  - Inbox (/inbox)
- **Screenshots**: Responsive screenshots for app stores

### 2. `/public/service-worker.js`
Service Worker for offline support:
- Caches essential assets during installation
- Serves cached content when offline
- Falls back to network for fresh content
- Handles cache updates and cleanup
- Supports "Update on Reload" functionality

### 3. `/public/icons/`
Icon assets directory containing:
- **Icon Sizes**: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512 PNG files
- **Base SVG**: icon-base.svg (can be used to regenerate icons)
- **Screenshots**: 540x720 and 1280x720 for app store listings

### 4. Updated `/index.html`
Added PWA-specific meta tags:
```html
<!-- PWA Manifest -->
<link rel="manifest" href="/manifest.json" />

<!-- iOS Meta Tags -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Focus Flow" />
<link rel="apple-touch-icon" href="/icons/icon-192x192.png" />

<!-- General Meta -->
<meta name="description" content="Personal productivity and wellbeing system" />
<meta name="theme-color" content="#137fec" />
```

## Installation Steps

### Browser Installation (Chrome/Edge/Firefox)
1. Open the app in a supported browser
2. Look for "Install app" or "Add to Home screen" prompt
3. Click to install
4. App appears as a standalone application

### iOS Installation
1. Open in Safari
2. Tap Share button
3. Select "Add to Home Screen"
4. Choose icon and name
5. App installs with custom icon and status bar styling

### Android Installation
1. Open in Chrome/Firefox
2. Tap menu → "Install app"
3. Confirm installation
4. App appears on home screen with full PWA features

## Features Enabled by PWA

### Installability
- Users can install Focus Flow directly from the browser
- App appears as a standalone application (no browser UI)
- Custom icons and splash screens
- Home screen shortcuts to Quick Capture and Inbox

### Offline Support
- Service Worker caches essential assets
- App loads offline if previously visited
- Automatic cache updates when online
- Graceful fallback to network requests

### iOS Support
- Custom status bar styling
- Web app mode with custom title
- Apple touch icon for home screen
- Proper viewport and meta tag configuration

### Web App Features
- Portrait orientation default
- Dark theme color (#101922) for browser chrome
- Proper categorization ("productivity")
- Responsive screenshots for app stores

## Customization Guide

### Updating Icons
To replace the placeholder icons with custom designs:

1. **Option A: Use SVG**
   - Edit `/public/icons/icon-base.svg`
   - Run: `python3 create_icons.py`
   - Icons regenerate from the SVG template

2. **Option B: Use PNG files directly**
   - Replace individual PNG files in `/public/icons/`
   - Ensure proper sizes: 72, 96, 128, 144, 152, 192, 384, 512px
   - Use PNG format with transparency support

3. **Option C: Use icon generation tools**
   - PWA Image Generator: https://www.pwa-asset-generator.com
   - Favicon Generator: https://realfavicongenerator.net
   - Place generated files in `/public/icons/`

### Updating Colors
Edit `/public/manifest.json`:
```json
"background_color": "#YOUR_HEX_COLOR",
"theme_color": "#YOUR_HEX_COLOR"
```

And update `/index.html`:
```html
<meta name="theme-color" content="#YOUR_HEX_COLOR" />
```

### Adding More Shortcuts
Edit the `shortcuts` array in `/public/manifest.json`:
```json
"shortcuts": [
  {
    "name": "Your Shortcut Name",
    "short_name": "Short",
    "description": "What this shortcut does",
    "url": "/path",
    "icons": [
      {
        "src": "/icons/icon-192x192.png",
        "sizes": "192x192"
      }
    ]
  }
]
```

## Testing

### Desktop Testing
1. **Chrome DevTools**:
   - Open DevTools → Application tab
   - Check "Manifest" section for valid manifest
   - Check "Service Workers" for worker registration
   - Test offline mode in "Network" tab

2. **Browser Installation**:
   - Look for install prompt
   - Test installing and running as app
   - Verify standalone mode (no browser UI)

### Mobile Testing
1. **Android (Chrome)**:
   - Visit the app URL
   - Open menu → "Install app"
   - Verify home screen icon and app behavior

2. **iOS (Safari)**:
   - Visit the app URL
   - Tap Share → "Add to Home Screen"
   - Verify icon, title, and status bar styling
   - Test offline functionality

### Validation Tools
- PWA Builder: https://www.pwabuilder.com
- Lighthouse in Chrome DevTools
- PWA Checklist: https://web.dev/pwa-checklist/

## Service Worker Registration

The service worker must be registered in your app's main JavaScript file. Add this code to your main entry point:

```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered:', registration);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}
```

Or for Vite/React apps, add to your main.tsx:
```typescript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js');
  });
}
```

## Troubleshooting

### App won't install
- Check manifest.json is valid (use validation tools)
- Ensure icons are accessible and valid PNG files
- Verify HTTPS is enabled (required for PWA)
- Check browser console for manifest errors

### Icons not showing correctly
- Verify icon file paths in manifest.json match actual files
- Ensure PNG files are valid and properly formatted
- Check file sizes match declarations in manifest
- Try clearing browser cache and reinstalling

### Service Worker issues
- Check that `/service-worker.js` is accessible
- Verify registration code is in your main app file
- Clear service workers in DevTools and re-register
- Check browser console for registration errors

### iOS specific issues
- Verify all iOS meta tags are present in index.html
- Check that apple-touch-icon path is correct
- Safari caches aggressively; clear Safari data to see updates
- Some features require HTTPS on iOS

## File Structure

```
/public/
├── manifest.json              # PWA manifest
├── service-worker.js          # Service worker for offline support
└── icons/
    ├── icon-base.svg          # SVG source for icons
    ├── icon-72x72.png         # Icon sizes
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    ├── icon-512x512.png
    ├── screenshot-540x720.png # Store listing screenshots
    └── screenshot-1280x720.png

/index.html                     # Updated with PWA meta tags
scripts/
├── generate-icons.js          # Icon generation script
└── create-placeholder-pngs.js  # Placeholder PNG generator

create_icons.py                 # Python script to generate PNG icons
```

## Resources

- [Web App Manifest (MDN)](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Service Workers (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [iOS PWA Limitations](https://www.goodbarry.com/pwa-on-ios/)

## Next Steps

1. **Register Service Worker**: Add registration code to your main app file
2. **Custom Icons**: Replace placeholder icons with your brand design
3. **Test Thoroughly**: Validate across different browsers and devices
4. **Deploy with HTTPS**: PWAs require HTTPS (except localhost)
5. **Monitor Performance**: Use Lighthouse to audit PWA compliance
