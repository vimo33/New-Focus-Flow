# Manual Testing Checklist - Focus Flow Frontend

Use this checklist to manually verify all features in a browser.

**Prerequisites:**
- ✅ Backend running: `http://localhost:3001`
- ✅ Frontend running: `http://localhost:5173`
- ✅ Browser console open (F12)

---

## 🏠 Dashboard Page (`http://localhost:5173/`)

### Visual Elements
- [ ] Page loads without errors
- [ ] Dark theme is active
- [ ] Sidebar visible on desktop (>768px)
- [ ] Bottom nav visible on mobile (<768px)
- [ ] Greeting shows correct time-based message
- [ ] Date displays current day/month/date

### Widgets
- [ ] **Today's Brief**: Shows project count and tasks
- [ ] **Inbox Widget**: Shows counts for Work/Personal/Ideas
- [ ] **Active Projects**: Shows projects with progress bars
- [ ] **Recent Activity**: Shows recent items with timestamps

### Interactions
- [ ] Click "Quick capture" → navigates to `/capture`
- [ ] Click "View Inbox" → navigates to `/inbox`
- [ ] Click "New Project" → navigates to `/projects`
- [ ] Click inbox categories → navigates to `/inbox`
- [ ] Click projects → navigates to `/projects` (not implemented yet)
- [ ] Sidebar links work
- [ ] Browser back button works

### Console
- [ ] No red errors in console
- [ ] API calls succeed (check Network tab)
- [ ] `GET /api/summary` returns data
- [ ] `GET /api/projects` returns data
- [ ] `GET /api/inbox/counts` returns data

---

## ✨ Quick Capture Page (`http://localhost:5173/capture`)

### Visual Elements
- [ ] Page loads with large textarea
- [ ] Textarea autofocuses
- [ ] Placeholder text visible
- [ ] Voice button visible
- [ ] Submit button visible
- [ ] Keyboard hint visible (desktop)

### Form Functionality
- [ ] Typing in textarea works
- [ ] Submit button enabled when text entered
- [ ] Submit button disabled when empty
- [ ] Click "Add prefix emoji" shows dropdown
- [ ] Click emoji adds prefix
- [ ] Click "Remove" removes prefix
- [ ] Prefix emoji displays above textarea

### Voice Input (if supported)
- [ ] Click microphone button starts recording
- [ ] Button shows ring animation when active
- [ ] Speak into microphone
- [ ] Transcript appears in textarea
- [ ] Click again to stop recording

### Submit Flow
- [ ] Click "Capture Item" or press Cmd+Enter
- [ ] Button shows "Capturing..." state
- [ ] Success toast appears at bottom
- [ ] Toast shows "Capture saved to Inbox"
- [ ] Toast has "Undo" button
- [ ] Toast auto-dismisses after 5 seconds
- [ ] Textarea clears after submit
- [ ] Focus returns to textarea

### AI Classification (if enabled)
- [ ] Badge appears above form after submit
- [ ] Shows category (Work/Personal/Ideas)
- [ ] Confidence dot shows (green/yellow/orange)
- [ ] Hover confidence dot shows tooltip

### Recent Captures
- [ ] List shows last 5 captures
- [ ] Items show text preview
- [ ] Items show date
- [ ] Items show AI category badges (if available)
- [ ] List updates after new capture

### Console
- [ ] No errors in console
- [ ] `POST /api/capture` succeeds
- [ ] Response includes item ID
- [ ] `GET /api/inbox` succeeds for recent list

---

## 📥 Inbox Processing Page (`http://localhost:5173/inbox`)

### Visual Elements
- [ ] Page loads with header
- [ ] Tab bar shows All/Work/Personal/Ideas
- [ ] Count badges show numbers
- [ ] Search/Filter/Sort buttons visible
- [ ] Item list displays

### Filter Tabs
- [ ] Click "All" tab → shows all items
- [ ] Click "Work" tab → filters to work items
- [ ] Click "Personal" tab → filters to personal items
- [ ] Click "Ideas" tab → filters to ideas items
- [ ] Active tab highlighted in blue
- [ ] Count badges update per tab

### Search Functionality
- [ ] Click search icon → search bar appears
- [ ] Type in search bar → filters items
- [ ] Search works for item text
- [ ] Search works for category
- [ ] Clear search → shows all items again

### Item Cards
- [ ] Each item shows checkbox
- [ ] Each item shows text (truncated if long)
- [ ] Category badge shows with color
- [ ] Urgency label shows (Quick/Deep Work)
- [ ] AI reasoning or source shows
- [ ] Date/time shows correctly
- [ ] "Process" button visible on hover (desktop)
- [ ] Menu button (three dots) visible on hover

### Selection
- [ ] Click checkbox → selects item
- [ ] Click header checkbox → selects all
- [ ] Selected items highlight
- [ ] Batch action bar appears when items selected
- [ ] Bar shows count of selected items

### Batch Actions
- [ ] Click "Archive" → archives selected items
- [ ] Confirmation dialog appears (if implemented)
- [ ] Items removed from list
- [ ] Click "Delete" → deletes selected items
- [ ] Confirmation dialog appears
- [ ] Items removed from list
- [ ] Click X → clears selection

### Process Modal
- [ ] Click "Process" button → modal opens
- [ ] Modal shows item details
- [ ] Options: Task/Project/Idea/Archive/Delete
- [ ] Select "Convert to Task"
- [ ] Fill in task details (optional)
- [ ] Click submit
- [ ] Modal closes
- [ ] Item removed from inbox
- [ ] Success feedback (toast or message)

### Individual Actions
- [ ] Click menu (three dots) → dropdown appears
- [ ] Click "Archive" → archives item
- [ ] Click "Delete" → confirms and deletes item

### Empty States
- [ ] When no items → shows "Inbox is empty"
- [ ] When search no results → shows "No results found"
- [ ] Empty state has icon and message

### Console
- [ ] No errors in console
- [ ] `GET /api/inbox` succeeds
- [ ] `GET /api/inbox/counts` succeeds
- [ ] `POST /api/inbox/:id/process` succeeds
- [ ] List refreshes after actions

---

## 🎨 Layout & Navigation

### Sidebar (Desktop)
- [ ] Sidebar fixed on left
- [ ] "Focus Flow" logo at top
- [ ] All nav items visible:
  - Dashboard
  - Capture
  - Inbox
  - Projects
  - Ideas
  - Calendar
  - Wellbeing
  - Voice
- [ ] Active page highlighted
- [ ] Hover effects work
- [ ] Dark mode toggle at bottom
- [ ] Click dark mode toggle → theme changes

### Mobile Navigation (< 768px)
- [ ] Bottom nav bar appears
- [ ] Shows first 5 items
- [ ] Icons display
- [ ] Labels display
- [ ] Active item highlighted
- [ ] Tap navigation works

### Theme Toggle
- [ ] Click toggle in sidebar
- [ ] Theme switches (dark ↔ light)
- [ ] Preference saved (refresh page)
- [ ] Theme persists across pages

---

## 🔗 Integration Tests

### End-to-End Flow #1: Capture → Inbox → Task
1. [ ] Go to `/capture`
2. [ ] Type: "Buy groceries for dinner"
3. [ ] Add emoji prefix: 🏠
4. [ ] Submit
5. [ ] Success toast appears
6. [ ] Go to `/inbox`
7. [ ] Find "Buy groceries" in list
8. [ ] Click "Process"
9. [ ] Select "Convert to Task"
10. [ ] Set category: Personal
11. [ ] Set priority: High
12. [ ] Submit
13. [ ] Item removed from inbox
14. [ ] Check `/api/tasks` → item exists

### End-to-End Flow #2: Voice Capture
1. [ ] Go to `/capture`
2. [ ] Click microphone button
3. [ ] Say: "Meeting with team tomorrow at 3pm"
4. [ ] Text appears in textarea
5. [ ] Submit
6. [ ] Success toast appears
7. [ ] Go to `/inbox`
8. [ ] Item appears in list

### End-to-End Flow #3: Bulk Archive
1. [ ] Go to `/inbox`
2. [ ] Select 3 items
3. [ ] Batch action bar appears
4. [ ] Click "Archive"
5. [ ] Items removed from list
6. [ ] Inbox count decreases

---

## 🐛 Error Scenarios

### Network Errors
- [ ] Stop backend server
- [ ] Refresh dashboard
- [ ] Error banner appears
- [ ] Click "Retry" → attempts reload
- [ ] Start backend server
- [ ] Retry succeeds

### Form Validation
- [ ] Try to submit empty capture
- [ ] Submit button disabled
- [ ] Try to process inbox without selection
- [ ] Appropriate error message

### Browser Compatibility
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari (if available)
- [ ] Test in Edge

---

## 📊 Performance Checks

### Loading States
- [ ] Dashboard shows skeletons while loading
- [ ] Inbox shows spinner while loading
- [ ] Capture shows "Capturing..." while submitting
- [ ] No infinite loops
- [ ] No memory leaks (check Memory tab in DevTools)

### Responsiveness
- [ ] Test at 375px width (mobile)
- [ ] Test at 768px width (tablet)
- [ ] Test at 1024px width (laptop)
- [ ] Test at 1920px width (desktop)
- [ ] No horizontal scrollbars
- [ ] Text readable at all sizes

---

## ✅ Console Check (Critical)

Open browser console and verify:

### No Errors
- [ ] No red errors on page load
- [ ] No errors on navigation
- [ ] No errors on form submit
- [ ] No 404s in Network tab
- [ ] No CORS errors

### Expected Console Output
```
GET http://localhost:3001/api/summary 200 OK
GET http://localhost:3001/api/projects 200 OK
GET http://localhost:3001/api/inbox/counts 200 OK
```

### Known Warnings (OK to ignore)
- React StrictMode warnings (development only)
- HMR (Hot Module Replacement) messages from Vite

---

## 📸 Visual Regression (Optional)

Take screenshots of:
- [ ] Dashboard (full page)
- [ ] Capture page (empty)
- [ ] Capture page (with success toast)
- [ ] Inbox (full list)
- [ ] Inbox (empty state)
- [ ] Process modal (open)
- [ ] Mobile view (all pages)

---

## Summary

**Total Checks:** 150+
**Time Estimate:** 20-30 minutes

After completing this checklist, you should have confidence that:
1. All implemented features work correctly
2. API integration is functional
3. UI is responsive and accessible
4. Error handling is in place
5. Data persists correctly

**Report Issues:**
- Note any unchecked items
- Screenshot any visual bugs
- Copy console errors (if any)
- Test on multiple browsers/devices

---

**Last Updated:** 2026-02-03
**Version:** 1.0
