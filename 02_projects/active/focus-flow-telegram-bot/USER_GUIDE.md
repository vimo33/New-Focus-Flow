# Focus Flow Telegram Bot - User Guide
**Getting Started with Your Telegram Productivity Assistant**

## Welcome!

Focus Flow's Telegram Bot is your personal productivity assistant on Telegram. It helps you quickly capture ideas, tasks, and notes while on the go, and keep your inbox organized.

---

## Getting Started (5 minutes)

### Step 1: Find the Bot on Telegram
1. Open Telegram
2. Search for "Focus Flow Bot" (or your specific bot name)
3. Tap the bot to open it
4. Send `/start` to initialize

### Step 2: First Capture
Send any text message, for example:
```
Buy milk on the way home
```

The bot will capture it immediately and confirm:
```
Captured!

"Buy milk on the way home"

Use /inbox to process it.
```

**That's it! You've made your first capture.**

---

## Core Features

### Feature 1: Quick Capture
The easiest way to capture items is to just send a message.

**Examples:**
- `Call the dentist tomorrow`
- `Fix the kitchen sink`
- `Review Q1 budget report`

The bot will capture instantly and show a confirmation.

### Feature 2: Structured Capture
For more control, use the `/capture` command:

```
/capture Meeting with John at 3pm tomorrow
```

This works exactly like sending text, but shows you it's a capture.

### Feature 3: View Your Inbox
See what you've captured:

```
/inbox
```

The bot shows you:
```
Inbox Summary

All: 12
Work: 5
Personal: 7
Ideas: 0

Use /inbox work, /inbox personal, or /inbox ideas to view items.
```

### Feature 4: Filter by Category
View items in specific categories:

**View work items:**
```
/inbox work
```

**View personal items:**
```
/inbox personal
```

**View ideas:**
```
/inbox ideas
```

**View everything:**
```
/inbox all
```

### Feature 5: Process Items
Convert items into tasks, projects, or save as ideas.

**Get item ID from inbox:**
```
/inbox personal
```

The bot shows items like:
```
ID: inbox-20260203-541907
Buy milk on the way home
[Process]
```

**Process the item:**
```
/process inbox-20260203-541907
```

**Choose an action:**
- **[Task]** - Add to your task list
- **[Project]** - Create a new project
- **[Idea]** - Save as an idea
- **[Archive]** - Remove from inbox
- **[Delete]** - Permanently delete

---

## Common Workflows

### Workflow 1: Quick Daily Capture
Perfect for logging throughout the day

**Morning:**
```
Plan today's meetings
Review emails
```

**Afternoon:**
```
Call accounting about invoice
Send report to manager
```

**Evening:**
```
Prepare for tomorrow
Check personal emails
```

Then batch process with:
```
/inbox work
```

### Workflow 2: Planning Session
Quick capture during brainstorm

```
Redesign homepage
Implement dark mode
Add search functionality
Create admin dashboard
Write API docs
```

Then organize:
```
/inbox all
```

Click [Process] on each and organize by project.

### Workflow 3: Weekly Review
Review and process everything weekly

**Monday morning:**
```
/inbox
```

Check the counts, then:
```
/inbox work
```

Process each item and decide: Task? Project? Archive?

Then:
```
/inbox personal
```

Do the same for personal items.

---

## Tips & Tricks

### Tip 1: Use Buttons for Speed
Instead of typing commands, use the inline buttons:

- [Work] button to view work items
- [Personal] button to view personal items
- [Ideas] button to view idea items
- [All] button to view everything
- [Process] button to process an item

### Tip 2: Text vs Voice
**Use text for:**
- Quick ideas (1-2 seconds to type)
- Precise information
- When you're in a meeting

**Use voice for:**
- Complex thoughts
- Detailed notes
- When typing is inconvenient

### Tip 3: Categories
The bot can learn your categories. Try:

- Work items: "Meeting with team"
- Personal items: "Buy groceries"
- Ideas: "New product concept"

The bot might suggest categories based on what you capture.

### Tip 4: Batch Capture
Capture multiple items quickly, then process them later:

```
Meeting at 2pm
Review Q3 report
Follow up with client
```

Then later:
```
/inbox work
```

### Tip 5: Use with Other Tools
The Focus Flow bot works alongside:
- Your calendar (capture tasks to do)
- Your notes app (capture quick ideas)
- Your email (capture action items)
- Your to-do list (process into projects)

---

## Command Reference

### All Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `/start` | Welcome & help | `/start` |
| `/help` | Show all commands | `/help` |
| `/capture <text>` | Capture text | `/capture Buy milk` |
| `/inbox` | Show inbox counts | `/inbox` |
| `/inbox work` | View work items | `/inbox work` |
| `/inbox personal` | View personal items | `/inbox personal` |
| `/inbox ideas` | View ideas | `/inbox ideas` |
| `/inbox all` | View all items | `/inbox all` |
| `/process <id>` | Process an item | `/process inbox-20260203-541907` |

### Auto-Capture
Any message that doesn't start with `/` is automatically captured:

```
Just type any text and it's captured!
```

---

## Voice Notes (Coming Soon)

Voice notes are coming soon! You'll be able to:

```
Send a voice note
↓
Bot transcribes it
↓
Bot captures the text
↓
Text appears in your inbox
```

Example:
1. Hold microphone button in Telegram
2. Say: "Meeting with John about the quarterly report"
3. Release
4. Bot transcribes and captures
5. Text appears: "Meeting with John about the quarterly report"

---

## Frequently Asked Questions

### Q: How do I capture something?
**A:** Just send a message to the bot. Any text message is automatically captured.

### Q: How do I see what I've captured?
**A:** Send `/inbox` to see counts, then `/inbox work` or `/inbox personal` to see items.

### Q: How do I decide what action to use?
**A:**
- **Task** = Something you need to do (time-bound)
- **Project** = Something bigger that needs planning
- **Idea** = Something to think about or develop later
- **Archive** = Keep but remove from inbox
- **Delete** = You don't need it

### Q: Can I undo a delete?
**A:** Currently no, but you can archive instead if you want to keep items.

### Q: How long does the bot keep my captures?
**A:** Until you process or delete them. They're stored in your inbox.

### Q: Can I use the bot offline?
**A:** No, you need internet to use the bot.

### Q: What if the bot isn't responding?
**A:** Try:
1. Wait a few seconds
2. Send `/start` to reset
3. Check your internet connection
4. Check that the bot is still active

### Q: Where does my data go?
**A:** Your captures are stored in the Focus Flow vault on your device or server. They're not shared with anyone.

### Q: Can I use this on my computer?
**A:** Yes! Use Telegram Web or Telegram Desktop and search for the bot.

### Q: How do I give feedback?
**A:** Use the `/help` command for more info, or contact the Focus Flow team.

### Q: Is my data private?
**A:** Yes. Your captures are only visible to you and stored securely.

---

## Getting Help

### Need Help?
1. Send `/help` in the bot for command list
2. Send `/start` to see feature overview
3. Check this guide for workflows

### Report an Issue
If something isn't working:
1. Note what command you tried
2. Note what happened
3. Try `/start` to reset the bot
4. Try the command again

### Request a Feature
Think of something the bot should do?
Contact the Focus Flow team with your suggestion!

---

## Best Practices

### Practice 1: Capture First, Organize Later
Don't worry about categories or actions. Just capture:
```
Buy milk
```

Then organize it later:
```
/inbox personal
[Process] → [Task]
```

### Practice 2: Regular Reviews
Review your inbox daily or weekly:
```
/inbox work  # Process work items
/inbox personal  # Process personal items
```

### Practice 3: Use Consistent Language
The more consistent you are, the better the bot learns. For example:
- "Meeting with John" (not "John meeting")
- "Fix the bug" (not "need to fix something")
- "Review report" (not "look at report")

### Practice 4: Keep It Simple
Short, clear captures work better:

✅ Good: "Call dentist"
❌ Verbose: "I need to make sure I call the dentist office to book an appointment for my annual checkup"

### Practice 5: Process Regularly
Don't let inbox grow too big:
- Review daily if you capture often
- Process items within 24 hours
- Archive or delete when done

---

## Keyboard Shortcuts

### Telegram Web/Desktop
You can use these shortcuts:

- Type `/` to see commands
- Arrow keys to navigate buttons
- Enter to confirm actions
- Ctrl+Enter to send message

---

## Integration with Focus Flow

The Telegram Bot is part of the larger Focus Flow system:

1. **Telegram Bot** (you are here)
   - Quick capture on mobile
   - Fast inbox review
   - One-tap processing

2. **Web Dashboard** (coming soon)
   - Full calendar view
   - Detailed reporting
   - Advanced filtering
   - Project management

3. **Mobile App** (coming soon)
   - Native push notifications
   - Offline capture
   - Voice notes
   - File attachments

4. **Desktop App** (coming soon)
   - Rich editing
   - Advanced features
   - Keyboard shortcuts
   - Productivity tools

Your captures sync across all platforms!

---

## Troubleshooting

### Bot Not Responding
**What to do:**
1. Refresh Telegram (swipe down)
2. Send `/start`
3. Wait 5 seconds
4. Try again

### Captures Not Appearing
**What to do:**
1. Check internet connection
2. Send `/inbox` to refresh
3. Check if it shows in counts
4. Try capturing a new item

### Buttons Not Working
**What to do:**
1. Close Telegram completely
2. Reopen Telegram
3. Find the bot again
4. Send `/start`

### Lost Item ID
**What to do:**
1. Send `/inbox` to see all items
2. Click the item you want to process
3. Click [Process] button
4. No need to remember ID!

---

## Advanced Tips

### Tip: Voice Notes
(When available in Task #28)
- Hands-free capture
- Great for driving
- Works with headphones
- Faster than typing

### Tip: Bulk Processing
```
/inbox work  # See all work items
[Process] on item 1
[Task] → Item processed
[Process] on item 2
[Task] → Item processed
```

All in one session!

### Tip: Daily Routine
**Morning:**
```
/inbox
```
Check what you have

**Throughout day:**
```
New task appears...
Auto-captured!
```

**Evening:**
```
/inbox personal
/inbox work
```
Process everything

### Tip: Calendar Coordination
Capture tasks from your calendar:
- "Meeting with team" → Task
- "Quarterly review due" → Project
- "Think about Q4 goals" → Idea

---

## Privacy & Security

### Your Data is Safe
- Stored locally in your Focus Flow vault
- End-to-end communication
- No third-party sharing
- You have full control

### What We Collect
- Messages you send (for capturing)
- Actions you take (to improve the bot)
- Metadata (timestamps, sources)

### What We Don't Share
- Your captures
- Your personal information
- Your activity with others
- Your data with third parties

---

## Version Information
- **Bot Version:** 1.0.0
- **Launch Date:** February 3, 2026
- **Last Updated:** February 3, 2026
- **Status:** Production Ready

---

## What's Coming Next

### Near Future (Task #28)
- Voice transcription
- Voice notes processing
- Automatic language detection

### Future Releases
- Image capture with OCR
- Scheduled reminders
- Natural language date parsing
- Multi-language support
- Advanced AI features

---

## Support & Feedback

### Get Support
- Send `/help` for command list
- Send `/start` for overview
- Check this guide for details
- Contact Focus Flow team

### Share Feedback
- What features do you love?
- What could be improved?
- What's missing?
- Any bugs to report?

Your feedback helps us build better tools!

---

## Quick Reference Card

### Most Common Commands
```
Capture:      Just send text
View inbox:   /inbox
View work:    /inbox work
Process item: /process <id>
Get help:     /help
```

### Action Buttons
```
[Work]     → View work items
[Personal] → View personal items
[Ideas]    → View ideas
[All]      → View all items
[Process]  → Process the item
```

### Action Types
```
[Task]    → Add to tasks
[Project] → Create project
[Idea]    → Save as idea
[Archive] → Remove from inbox
[Delete]  → Delete forever
```

---

**Happy capturing! 🎉**

For more information, visit the Focus Flow documentation or contact the team.

---

**Focus Flow Telegram Bot v1.0.0**
*Your productivity companion in your pocket*
