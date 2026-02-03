# Quick Start - Frontend Testing Guide

## 🚀 Start Both Servers

### Terminal 1: Backend
```bash
cd /srv/focus-flow/02_projects/active/focus-flow-backend
npm run dev
# Server starts on http://localhost:3001
```

### Terminal 2: Frontend
```bash
cd /srv/focus-flow/02_projects/active/focus-flow-ui
npm run dev
# Server starts on http://localhost:5173
```

## ✅ Verify Setup

### Check Backend
```bash
curl http://localhost:3001/health
# Should return: {"status":"healthy",...}
```

### Check Frontend
Open browser: http://localhost:5173
- Dashboard should load
- No errors in console (F12)

## 🧪 Quick Smoke Tests

### Test 1: Capture Item (30 seconds)
1. Navigate to http://localhost:5173/capture
2. Type: "Test item from UI"
3. Click "Capture Item" (or Cmd+Enter)
4. ✅ Success toast appears
5. ✅ Form clears

**Verify in Backend:**
```bash
curl http://localhost:3001/api/inbox | jq '.items[0].text'
# Should return: "Test item from UI"
```

### Test 2: View Inbox (15 seconds)
1. Navigate to http://localhost:5173/inbox
2. ✅ Item appears in list
3. ✅ Tabs show counts
4. ✅ No console errors

### Test 3: Process Item (45 seconds)
1. Click "Process" on any item
2. Select "Convert to Task"
3. Fill in:
   - Category: Work
   - Priority: High
4. Click Submit
5. ✅ Item removed from inbox
6. ✅ Modal closes

**Verify Task Created:**
```bash
curl http://localhost:3001/api/tasks | jq '.tasks | length'
# Count should increase
```

### Test 4: Dashboard (15 seconds)
1. Navigate to http://localhost:5173/
2. ✅ Inbox counts display
3. ✅ Projects widget shows data
4. ✅ Recent activity displays
5. ✅ Quick actions work

## 🐛 Common Issues

### Issue: "Failed to fetch"
**Cause:** Backend not running or wrong port
**Fix:**
1. Verify backend running: `lsof -ti:3001`
2. Check `.env` file has: `VITE_API_URL=http://localhost:3001/api`
3. Restart frontend dev server

### Issue: Inbox counts not updating
**Cause:** API base URL incorrect
**Fix:**
```bash
# Check .env file exists
cat /srv/focus-flow/02_projects/active/focus-flow-ui/.env
# Should contain: VITE_API_URL=http://localhost:3001/api
```

### Issue: CORS errors
**Cause:** Backend CORS not configured
**Fix:** Backend already has `app.use(cors())` - should work

### Issue: Voice input not working
**Cause:** Browser doesn't support Web Speech API
**Note:** Only works in Chrome/Edge, not required for testing

## 📊 Check API Status

```bash
# Health check
curl http://localhost:3001/health

# Inbox counts
curl http://localhost:3001/api/inbox/counts

# All items
curl http://localhost:3001/api/inbox | jq '.count'

# Tasks
curl http://localhost:3001/api/tasks | jq '.count'

# Projects
curl http://localhost:3001/api/projects | jq '.count'

# Ideas
curl http://localhost:3001/api/ideas | jq '.count'
```

## 🔍 Verify Data Persistence

```bash
# Check inbox files
ls -lh /srv/focus-flow/00_inbox/raw/

# Check task files
find /srv/focus-flow/01_tasks -name "*.json"

# Check project files
find /srv/focus-flow/02_projects -name "*.json"

# View a specific item
cat /srv/focus-flow/00_inbox/raw/inbox-*.json | jq .
```

## 📋 Full Testing Checklist

For comprehensive testing, use:
```bash
cd /srv/focus-flow/02_projects/active/focus-flow-ui
cat MANUAL_TEST_CHECKLIST.md
```

For detailed test report:
```bash
cat e2e-manual-test.md
```

## 🎯 Success Criteria

Your setup is working if:
- ✅ Both servers running without errors
- ✅ Dashboard loads and shows data
- ✅ Capture form submits successfully
- ✅ Inbox displays items
- ✅ Processing converts items to tasks
- ✅ No red errors in browser console
- ✅ Files created in `/srv/focus-flow/` vault

## 🚨 Need Help?

1. Check browser console (F12 → Console tab)
2. Check backend terminal logs
3. Check frontend terminal logs
4. Review test report: `e2e-manual-test.md`
5. Review completion report: `/srv/focus-flow/TASK_35_COMPLETION.md`

## 📱 Mobile Testing

To test on mobile device:

1. Find your computer's IP: `ifconfig` or `ipconfig`
2. Update `.env`:
   ```
   VITE_API_URL=http://YOUR_IP:3001/api
   ```
3. Restart frontend dev server
4. Access from phone: `http://YOUR_IP:5173`

**Note:** Ensure firewall allows connections on ports 3001 and 5173

## 🎉 That's It!

You're now ready to test the Focus Flow frontend. The complete system is functional and ready for use.

**Estimated Testing Time:**
- Quick smoke tests: 5 minutes
- Full manual checklist: 30 minutes
- Comprehensive testing: 1 hour

---

**Last Updated:** 2026-02-03
**For:** Task #35 - Frontend UI Integration Testing
