# Focus Flow Telegram Bot

A Telegram bot for the Focus Flow OS that enables quick capture and inbox management through Telegram.

## Features

- **Quick Capture**: Send tasks and thoughts directly via Telegram
- **Voice Transcription**: Record voice messages and transcribe them to text using OpenAI Whisper
- **Inbox Management**: Process your inbox items directly from Telegram
- **AI-Powered**: Backend integration with Claude for intelligent features

## Project Structure

```
focus-flow-telegram-bot/
├── src/
│   ├── bot.ts                 # Main bot entry point
│   ├── handlers/
│   │   ├── capture.ts        # Capture command handlers
│   │   └── inbox.ts          # Inbox management handlers
│   └── services/
│       ├── api-client.ts     # Backend API client
│       └── transcription.ts  # Voice transcription service
├── .env                       # Environment configuration
├── package.json              # Project dependencies
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## Setup

### Prerequisites

- Node.js 16+
- npm or yarn
- Telegram Bot Token (from @BotFather)
- OpenAI API Key (for Whisper voice transcription)

### Installation

1. Clone and navigate to the project:
```bash
cd focus-flow-telegram-bot
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

### Environment Variables

- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token from @BotFather
- `BACKEND_API_URL`: Focus Flow backend API URL (default: http://localhost:3001)
- `BACKEND_API_KEY`: Backend API authentication key
- `OPENAI_API_KEY`: OpenAI API key for Whisper voice transcription
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging level (debug/info/warn/error)
- `WEBHOOK_URL`: Optional webhook URL for production deployment
- `WEBHOOK_PORT`: Optional webhook port (default: 3002)

**Note:** This bot uses OpenAI for voice transcription. Claude AI features are handled by the backend API service.

## Development

### Start the bot in development mode:
```bash
npm run dev
```

### Watch mode (auto-restart on file changes):
```bash
npm run watch
```

### Build TypeScript to JavaScript:
```bash
npm run build
```

### Start production build:
```bash
npm start
```

## Commands

### Implemented Commands

1. **`/start`** - Welcome message with instructions
   - Displays available commands
   - Provides quick overview of bot capabilities

2. **`/capture <text>`** - Quick capture thoughts and tasks
   - Example: `/capture Buy groceries tomorrow`
   - Posts to backend API `/api/capture`
   - Shows loading indicator while processing
   - Confirms successful capture with item ID

3. **`/inbox`** - View inbox summary with counts
   - GET `/api/inbox/counts`
   - Displays counts for: all, work, personal, ideas
   - Provides inline buttons to filter by category

4. **`/inbox <filter>`** - View filtered inbox items
   - Filters: `work`, `personal`, `ideas`, `all`
   - GET `/api/inbox?filter=<filter>`
   - Displays up to 5 items with details
   - Shows AI classification suggestions if available
   - Provides "Process" button for each item

5. **`/process <id>`** - Interactive processing with inline keyboard
   - Example: `/process abc123`
   - Fetches specific item details
   - Shows AI classification and reasoning
   - Provides action buttons:
     - **Task** - Convert to task
     - **Project** - Convert to project
     - **Idea** - Save as idea
     - **Archive** - Archive item
     - **Delete** - Delete item
   - POST to `/api/inbox/:id/process`

6. **`/help`** - Complete command list with examples
   - Detailed usage instructions
   - Command examples
   - Quick tips

### Additional Features

- **Auto-capture text messages** - Just send any text message to capture it
- **Voice message transcription** - Send voice notes for automatic transcription using OpenAI Whisper
- **Loading indicators** - Visual feedback during API calls
- **Error handling** - User-friendly error messages
- **Inline keyboards** - Interactive buttons for quick actions
- **Success confirmations** - Clear feedback after actions

## Usage Examples

### Quick Capture
```
User: /capture Meeting with John at 3pm tomorrow
Bot: Captured successfully!
     "Meeting with John at 3pm tomorrow"
     ID: abc123
     Use /inbox to process your captured items.
```

### View Inbox Counts
```
User: /inbox
Bot: Inbox Summary

     All: 5
     Work: 3
     Personal: 1
     Ideas: 1

     Use /inbox work, /inbox personal, or /inbox ideas to view items.
     [Work] [Personal] [Ideas] [All]
```

### View Work Items
```
User: /inbox work
Bot: Work Inbox (3 items)
     Use /process <id> to process an item.

     ID: abc123 [work]
     Meeting with John at 3pm tomorrow
     AI suggests: task (85% confident)
     [Process]
```

### Process Item
```
User: /process abc123
Bot: Processing Item [work]

     Meeting with John at 3pm tomorrow

     AI Classification:
     Category: work
     Suggested: task
     Confidence: 85%
     Reasoning: This appears to be a scheduled meeting...

     Choose an action:
     [Task] [Project]
     [Idea] [Archive]
     [Delete]
```

### Auto-capture
```
User: Remember to call mom tonight
Bot: Captured!
     "Remember to call mom tonight"
     Use /inbox to process it.
```

### Voice Message Transcription
```
User: [Sends voice message: "Remind me to review the quarterly report before Friday's meeting"]
Bot: 🎤 Received voice message (4s)
     🔄 Transcribing with Whisper AI...

Bot: ✅ Voice note captured!

     📝 Transcription:
     "Remind me to review the quarterly report before Friday's meeting"

     🎤 Duration: 4s
     🌐 Language: en
     🆔 ID: xyz789

     Use /inbox to process your captured items.
```

## Voice Transcription Details

The bot uses OpenAI's Whisper API for high-quality voice transcription:

- **Supported Formats**: OGG, MP3, MP4, MPEG, MPGA, M4A, WAV, WEBM
- **Audio Processing**:
  - Downloads voice message from Telegram
  - Saves to temporary file
  - Sends to Whisper API for transcription
  - Automatically cleans up temporary files
- **Features**:
  - Automatic language detection
  - High accuracy transcription
  - Duration tracking
  - Real-time progress feedback
- **Error Handling**:
  - Graceful fallback if API key is missing
  - User-friendly error messages
  - Retry logic for transient failures

### How Voice Transcription Works

1. User sends a voice message to the bot
2. Bot acknowledges receipt and shows "Transcribing..." status
3. Bot downloads the voice file from Telegram servers
4. Voice file is sent to OpenAI Whisper API
5. Transcription is returned with detected language
6. Transcribed text is sent to backend API for storage
7. User receives confirmation with full transcription details
8. Temporary audio files are automatically cleaned up

## Implementation Status

### Completed
- [x] Bot scaffolding and setup
- [x] Command handlers (/start, /help, /capture, /inbox, /process)
- [x] API client integration with backend
- [x] Error handling and user feedback
- [x] Inline keyboards for actions
- [x] Auto-capture text messages
- [x] Voice message transcription with OpenAI Whisper API
- [x] TypeScript type definitions

### Planned
- [ ] Image capture with OCR
- [ ] Scheduled reminders
- [ ] Natural language processing for auto-tagging
- [ ] Unit tests
- [ ] Integration tests

## Contributing

This is part of the Focus Flow OS project. Follow the project guidelines for contributions.

## License

ISC
