# Quick Start Guide - Focus Flow Telegram Bot

## Prerequisites

1. **Backend API Running**
   - The Focus Flow backend must be running on `localhost:3001`
   - Start it with:
     ```bash
     cd /srv/focus-flow/02_projects/active/focus-flow-backend
     npm run dev
     ```

2. **Telegram Bot Token**
   - Get a bot token from [@BotFather](https://t.me/botfather) on Telegram
   - Save it in the `.env` file

3. **Environment Variables**
   - Configure `.env` file with required variables

## Setup (5 minutes)

### Step 1: Configure Environment

Edit `/srv/focus-flow/02_projects/active/focus-flow-telegram-bot/.env`:

```bash
# Required
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Backend API (default is correct if backend is on localhost:3001)
BACKEND_API_URL=http://localhost:3001

# Optional
BACKEND_API_KEY=
ANTHROPIC_API_KEY=
NODE_ENV=development
LOG_LEVEL=debug
```

### Step 2: Install Dependencies (if not already done)

```bash
cd /srv/focus-flow/02_projects/active/focus-flow-telegram-bot
npm install
```

### Step 3: Build the Bot

```bash
npm run build
```

### Step 4: Start the Bot

**Development Mode (with auto-reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

**Watch Mode (auto-restart on changes):**
```bash
npm run watch
```

You should see:
```
==========================================
Focus Flow Telegram Bot
==========================================
✅ Bot started successfully
🤖 Bot is polling for messages...
==========================================
Available commands:
  /start - Welcome message
  /capture <text> - Quick capture
  /inbox - Show inbox counts
  /inbox <filter> - Show filtered items
  /process <id> - Process item
  /help - Command list
==========================================
```

## Testing the Bot

### Test 1: Start Command

1. Open Telegram and find your bot
2. Send: `/start`
3. Expected: Welcome message with command list

```
Welcome to Focus Flow, [Your Name]!

I'm your personal productivity assistant. Here's what I can help you with:

/capture <text> - Quick capture your thoughts
/inbox - Check your inbox counts
/inbox work - View work items
/inbox personal - View personal items
/inbox ideas - View ideas
/process <id> - Process a specific item
/help - Get help and command list

You can also just send me a message to capture a note!
```

### Test 2: Capture Command

1. Send: `/capture Buy groceries tomorrow`
2. Expected: Loading indicator, then confirmation

```
Captured successfully!

"Buy groceries tomorrow"

ID: abc123
Use /inbox to process your captured items.
```

### Test 3: Auto-Capture

1. Send any text (not a command): `Remember to call mom tonight`
2. Expected: Loading indicator, then confirmation

```
Captured!

"Remember to call mom tonight"

Use /inbox to process it.
```

### Test 4: Inbox Counts

1. Send: `/inbox`
2. Expected: Summary with category counts

```
📥 Inbox Summary

All: 2
Work: 0
Personal: 2
Ideas: 0

Use /inbox work, /inbox personal, or /inbox ideas to view items.
[Work] [Personal] [Ideas] [All]
```

### Test 5: Filtered Inbox

1. Click the `[Personal]` button or send: `/inbox personal`
2. Expected: List of personal items

```
Personal Inbox (2 items)

Use /process <id> to process an item.

─────────────────────
ID: abc123 [personal]
Buy groceries tomorrow
[Process]

─────────────────────
ID: def456 [personal]
Remember to call mom tonight
[Process]
```

### Test 6: Process Item

1. Click the `[Process]` button or send: `/process abc123`
2. Expected: Item details with action buttons

```
Processing Item [personal]

Buy groceries tomorrow

Choose an action:
[Task] [Project]
[Idea] [Archive]
[Delete]
```

### Test 7: Execute Action

1. Click the `[Task]` button
2. Expected: Confirmation message

```
Item processed as task! ✅

The item has been moved to your tasks list.
```

### Test 8: Help Command

1. Send: `/help`
2. Expected: Complete command list with examples

## Troubleshooting

### Bot Not Responding

**Check 1: Bot is running**
```bash
# In the terminal where you started the bot, you should see:
🤖 Bot is polling for messages...
```

**Check 2: Backend API is running**
```bash
cd /srv/focus-flow/02_projects/active/focus-flow-backend
npm run dev

# You should see:
🚀 Focus Flow Backend API Server
Server running on port 3001
```

**Check 3: Test backend API directly**
```bash
curl http://localhost:3001/health
# Expected: {"status":"healthy","timestamp":"...","service":"focus-flow-backend","version":"1.0.0"}
```

### "Failed to capture" Error

**Possible causes:**
1. Backend API not running
2. Backend API on wrong port
3. Network issues

**Solution:**
```bash
# Check backend is running on port 3001
curl http://localhost:3001/health

# Check .env file has correct BACKEND_API_URL
cat .env | grep BACKEND_API_URL
# Should be: BACKEND_API_URL=http://localhost:3001
```

### "Invalid filter" Error

**Cause:** Using invalid filter name

**Valid filters:**
- `work`
- `personal`
- `ideas`
- `all`

**Examples:**
```
✅ /inbox work
✅ /inbox personal
❌ /inbox tasks     (invalid)
❌ /inbox projects  (invalid)
```

### "Item not found" Error

**Cause:** Using incorrect item ID

**Solution:**
1. Get valid item IDs from `/inbox` command
2. Copy the ID exactly as shown
3. Use with `/process <id>`

### TypeScript Compilation Errors

**Solution:**
```bash
# Clean build directory
rm -rf dist/

# Rebuild
npm run build

# Check for errors
# If successful, you should see no error messages
```

### Environment Variable Not Loading

**Check 1: .env file exists**
```bash
ls -la .env
```

**Check 2: .env file format**
```bash
cat .env
# Should not have spaces around =
# ✅ TELEGRAM_BOT_TOKEN=123456
# ❌ TELEGRAM_BOT_TOKEN = 123456
```

**Check 3: Restart bot after changing .env**
```bash
# Stop bot (Ctrl+C)
# Restart bot
npm run dev
```

## Advanced Testing

### Test API Client Directly

Run the test script:
```bash
cd /srv/focus-flow/02_projects/active/focus-flow-telegram-bot
npx ts-node test-api-client.ts
```

Expected output:
```
==========================================
Testing API Client
==========================================

Test 1: Sending capture...
✅ Capture successful!
   Item ID: abc123
   Status: created

Test 2: Fetching inbox counts...
✅ Inbox counts retrieved!
   All: 1
   Work: 0
   Personal: 1
   Ideas: 0

Test 3: Fetching all inbox items...
✅ Inbox items retrieved!
   Count: 1
   First item: Test capture from Telegram bot...

Test 4: Fetching work items...
✅ Work items retrieved!
   Count: 0

Test 5: Fetching specific item...
✅ Item retrieved!
   ID: abc123
   Text: Test capture from Telegram bot
   Category: none

==========================================
All tests passed! ✅
==========================================
```

### Monitor Logs

**Watch bot logs:**
```bash
# Terminal 1: Start bot with debug logging
LOG_LEVEL=debug npm run dev
```

**Watch backend logs:**
```bash
# Terminal 2: Start backend
cd /srv/focus-flow/02_projects/active/focus-flow-backend
npm run dev
```

**Send commands in Telegram and watch both terminals for activity.**

## Common Workflows

### Workflow 1: Quick Capture and Process

1. Capture: `Buy groceries`
2. View inbox: `/inbox`
3. Click `[Personal]` or `/inbox personal`
4. Click `[Process]` on the item
5. Click `[Task]` to convert to task
6. Done! Item is now in your tasks list

### Workflow 2: Bulk Capture

1. Send: `Prepare presentation`
2. Send: `Review Q3 report`
3. Send: `Schedule team meeting`
4. View all: `/inbox all`
5. Process each item individually

### Workflow 3: Filter and Process Work Items

1. View work items: `/inbox work`
2. Click `[Process]` on first item
3. Click `[Task]` or `[Project]` as appropriate
4. Repeat for remaining items

## Performance Tips

1. **Use Auto-Capture** for speed
   - Just send text instead of `/capture` command
   - Faster typing, same result

2. **Use Inline Buttons**
   - Tap buttons instead of typing commands
   - Quicker workflow

3. **Batch Capture First**
   - Capture multiple items quickly
   - Process them later in batch

4. **Use Filters**
   - Focus on one category at a time
   - Less overwhelming

## Next Steps

1. ✅ Test all basic commands
2. ✅ Verify backend integration
3. ✅ Practice common workflows
4. 📋 Set up for daily use
5. 🎤 Wait for voice transcription feature (Task #28)
6. 🖼️ Wait for image capture feature

## Getting Help

**Check documentation:**
- `README.md` - Full documentation
- `ARCHITECTURE.md` - System architecture
- `IMPLEMENTATION_SUMMARY.md` - Implementation details

**Check logs:**
- Bot logs show all commands received
- Backend logs show all API calls
- Error messages include helpful hints

**Test individual components:**
- Use `test-api-client.ts` to test API
- Test backend directly with `curl`
- Check Obsidian vault for created files

## Success Checklist

Before considering setup complete, verify:

- [ ] Bot responds to `/start`
- [ ] Bot responds to `/help`
- [ ] `/capture` command works
- [ ] Auto-capture works
- [ ] `/inbox` shows counts
- [ ] `/inbox work` shows items
- [ ] `/process` command works
- [ ] Action buttons work
- [ ] Items appear in Obsidian vault
- [ ] No error messages in console

**When all items are checked, you're ready to use the bot! 🎉**
