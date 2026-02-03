# Telegram Bot End-to-End Test Plan
**Date:** February 3, 2026
**Status:** Test Plan Created

## Test Objectives
1. Verify all commands respond correctly
2. Verify items are created in backend API
3. Verify integration between Telegram bot and backend API
4. Verify user-friendly error messages
5. Verify no bot crashes during operations

## Prerequisites Checklist
- [ ] Backend API running on port 3001
- [ ] Bot token configured in .env
- [ ] Telegram client ready for testing
- [ ] Test environment prepared

## Test Scenarios

### Test 1: /start Command
**Expected Behavior:**
- Bot responds with welcome message
- Message includes bot name greeting
- All available commands are listed

**Verification Points:**
- [ ] Welcome message appears
- [ ] Message includes user's first name
- [ ] Command list is displayed
- [ ] No errors in console

---

### Test 2: /help Command
**Expected Behavior:**
- Bot displays complete command list
- Includes usage examples
- Shows quick tips

**Verification Points:**
- [ ] Help message displays all commands
- [ ] Examples are clear and accurate
- [ ] Quick tips section appears
- [ ] No errors in console

---

### Test 3: /capture Command
**Expected Behavior:**
- Bot accepts text to capture
- Shows loading indicator
- Creates item in backend
- Confirms success with item ID

**Test Cases:**
1. `/capture Buy groceries`
   - Expected: Item created in backend
   - Verify in API response

2. `/capture Remember to call mom`
   - Expected: Item created in backend
   - Verify item appears in inbox

**Verification Points:**
- [ ] Loading message appears and disappears
- [ ] Item ID is returned
- [ ] Items appear in backend database
- [ ] Error handling works if backend offline

---

### Test 4: Auto-Capture (Text Messages)
**Expected Behavior:**
- Plain text (non-command) is captured automatically
- Shows loading indicator
- Confirms success

**Test Cases:**
1. Send: `Remember to call mom tonight`
   - Expected: Auto-captured
   - Verify in inbox

2. Send: `Prepare presentation slides`
   - Expected: Auto-captured
   - Verify in inbox

**Verification Points:**
- [ ] Any text message is captured
- [ ] Loading indicator appears
- [ ] No error messages
- [ ] Items appear in inbox

---

### Test 5: /inbox Command (Counts View)
**Expected Behavior:**
- Shows inbox summary with category counts
- Displays buttons for filtering
- All counts are accurate

**Verification Points:**
- [ ] All count is correct
- [ ] Work count is correct
- [ ] Personal count is correct
- [ ] Ideas count is correct
- [ ] Filter buttons appear
- [ ] No errors in console

---

### Test 6: /inbox work - Filtered View
**Expected Behavior:**
- Shows work items only
- Displays item IDs and text
- Shows AI classification suggestions (if available)
- Process buttons appear

**Verification Points:**
- [ ] Only work items displayed
- [ ] Item count is accurate
- [ ] Item text is truncated correctly if long
- [ ] Process buttons work
- [ ] No pagination errors

---

### Test 7: /inbox personal - Filtered View
**Expected Behavior:**
- Shows personal items only
- Same layout as work items
- Accurate item count

**Verification Points:**
- [ ] Only personal items displayed
- [ ] Item count accurate
- [ ] Process buttons functional

---

### Test 8: /inbox ideas - Filtered View
**Expected Behavior:**
- Shows ideas items only
- Accurate item count

**Verification Points:**
- [ ] Only ideas items displayed
- [ ] Item count accurate

---

### Test 9: /inbox all - All Items View
**Expected Behavior:**
- Shows all items regardless of category
- Accurate total count

**Verification Points:**
- [ ] All items displayed
- [ ] Total count accurate

---

### Test 10: /process Command
**Expected Behavior:**
- Takes item ID as parameter
- Shows item details
- Displays AI classification (if available)
- Provides action buttons

**Test Case:**
1. Get item ID from `/inbox`
2. Send: `/process <id>`
   - Expected: Item details displayed
   - Verify action buttons appear

**Verification Points:**
- [ ] Item text displayed
- [ ] Item ID shown
- [ ] Category shown
- [ ] Action buttons appear (Task, Project, Idea, Archive, Delete)
- [ ] Error message if invalid ID

---

### Test 11: Inline Button: Process Item
**Expected Behavior:**
- Clicking [Process] button from inbox
- Shows item details and actions

**Verification Points:**
- [ ] Button click handled
- [ ] Item loads correctly
- [ ] No error messages

---

### Test 12: Inline Button: Filter Inbox
**Expected Behavior:**
- Clicking [Work] / [Personal] / [Ideas] / [All] buttons
- Filters inbox correctly
- Shows appropriate items

**Verification Points:**
- [ ] Filter buttons work correctly
- [ ] Items filtered properly
- [ ] No error messages

---

### Test 13: Action: Convert to Task
**Expected Behavior:**
- Clicking [Task] button processes item as task
- Backend receives action
- Confirmation message shown

**Verification Points:**
- [ ] Confirmation message appears
- [ ] Action sent to backend
- [ ] Item status updated in database

---

### Test 14: Action: Convert to Project
**Expected Behavior:**
- Clicking [Project] button processes item as project

**Verification Points:**
- [ ] Confirmation message appears
- [ ] Action sent to backend

---

### Test 15: Action: Save as Idea
**Expected Behavior:**
- Clicking [Idea] button processes item as idea

**Verification Points:**
- [ ] Confirmation message appears
- [ ] Action sent to backend

---

### Test 16: Action: Archive Item
**Expected Behavior:**
- Clicking [Archive] button archives item

**Verification Points:**
- [ ] Confirmation message appears
- [ ] Item archived in backend

---

### Test 17: Action: Delete Item
**Expected Behavior:**
- Clicking [Delete] button removes item

**Verification Points:**
- [ ] Confirmation message appears
- [ ] Item deleted from backend

---

### Test 18: Voice Transcription (If OPENAI_API_KEY available)
**Expected Behavior:**
- Send voice note to bot
- Shows transcription progress
- Transcribes to text
- Creates capture from transcription
- Shows results

**Verification Points:**
- [ ] Voice message is accepted
- [ ] Loading message shows duration
- [ ] Transcription completes
- [ ] Text is captured
- [ ] Language detected
- [ ] Item appears in inbox

---

### Test 19: Error Handling - Backend Offline
**Expected Behavior:**
- Bot handles backend unavailable gracefully
- Shows user-friendly error message
- Suggests solution

**Test Case:**
1. Stop backend API
2. Try to capture or view inbox
   - Expected: Error message shown
   - Message should suggest checking backend

**Verification Points:**
- [ ] No bot crash
- [ ] Error message is helpful
- [ ] User knows how to fix

---

### Test 20: Error Handling - Invalid Item ID
**Expected Behavior:**
- `/process invalid123` returns error
- Shows helpful message

**Verification Points:**
- [ ] Error message appears
- [ ] User knows ID is invalid
- [ ] No bot crash

---

### Test 21: Error Handling - Invalid Filter
**Expected Behavior:**
- `/inbox invalid` returns error
- Shows valid filter options

**Verification Points:**
- [ ] Error message clear
- [ ] Valid options listed
- [ ] No bot crash

---

## Integration Tests

### Test 22: Backend API Integration
**Expected Behavior:**
- Bot can communicate with backend on port 3001
- API responses are handled correctly
- Data persists in backend database

**Verification Points:**
- [ ] Health check endpoint works
- [ ] Capture endpoint works
- [ ] Inbox endpoints work
- [ ] Process endpoint works

---

### Test 23: File Creation in Vault
**Expected Behavior:**
- Captured items create files in /srv/focus-flow/00_inbox/raw/

**Verification Points:**
- [ ] Files are created for captures
- [ ] File format is correct
- [ ] File contents match captured text

---

### Test 24: Voice File Handling
**Expected Behavior:**
- Voice files are downloaded from Telegram
- Temporary files are cleaned up
- No orphaned files left

**Verification Points:**
- [ ] Voice files are downloaded
- [ ] Transcription works correctly
- [ ] Temp files are cleaned up on shutdown

---

## Performance Tests

### Test 25: Response Time
**Expected Behavior:**
- /start responds within 2 seconds
- /inbox responds within 3 seconds
- /capture responds within 5 seconds

**Verification Points:**
- [ ] Commands respond quickly
- [ ] No timeout errors
- [ ] UI remains responsive

---

### Test 26: Bulk Capture
**Expected Behavior:**
- Can capture multiple items in sequence
- No rate limiting issues
- All items are created

**Test Case:**
1. Capture 5 items in rapid succession
2. Verify all appear in inbox

**Verification Points:**
- [ ] All items captured
- [ ] No duplicates
- [ ] No timeouts

---

## Stability Tests

### Test 27: Long-Running Session
**Expected Behavior:**
- Bot continues working after extended use
- No memory leaks
- No connection loss

**Verification Points:**
- [ ] Bot responsive after 30 minutes
- [ ] Multiple operations work
- [ ] No gradual slowdown

---

### Test 28: Graceful Shutdown
**Expected Behavior:**
- Ctrl+C stops bot cleanly
- Temp files are cleaned up
- No error messages

**Verification Points:**
- [ ] Bot stops gracefully
- [ ] No orphaned processes
- [ ] Temp files cleaned

---

## Reporting

### Pass/Fail Criteria
- **PASS:** All test cases pass with no critical errors
- **FAIL:** Any critical test fails or bot crashes
- **CONDITIONAL PASS:** Some features require external APIs (voice transcription)

### Test Result Summary
Will be updated after execution.

---

## Notes
- Tests require valid Telegram bot token
- Tests require backend API running on localhost:3001
- Voice transcription tests require OPENAI_API_KEY
- Test data will be created in backend database
- Test documentation will be updated with results
