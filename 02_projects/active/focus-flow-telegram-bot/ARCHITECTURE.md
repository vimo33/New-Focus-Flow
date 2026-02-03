# Telegram Bot Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Telegram Client                           │
│                     (User's Telegram App)                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ Telegram Bot API
                      │ (HTTPS)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Focus Flow Telegram Bot                       │
│                    (Telegraf Framework)                          │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    bot.ts (Main Entry)                   │   │
│  │  - Command Registration                                  │   │
│  │  - Middleware Setup                                      │   │
│  │  - Error Handling                                        │   │
│  │  - Graceful Shutdown                                     │   │
│  └─────────────┬───────────────────────┬───────────────────┘   │
│                │                       │                         │
│                ▼                       ▼                         │
│  ┌──────────────────────┐   ┌──────────────────────┐          │
│  │  handlers/capture.ts  │   │  handlers/inbox.ts   │          │
│  │                       │   │                       │          │
│  │  - handleCapture()    │   │  - handleInboxView() │          │
│  │  - handleTextMessage()│   │  - handleProcess()   │          │
│  │  - handleVoiceCapture│   │  - handleItemAction()│          │
│  │  - handleImageCapture│   │                       │          │
│  └──────────┬────────────┘   └──────────┬───────────┘          │
│             │                           │                        │
│             └───────────┬───────────────┘                        │
│                         │                                        │
│                         ▼                                        │
│             ┌───────────────────────┐                           │
│             │ services/api-client.ts│                           │
│             │                        │                           │
│             │  - sendCapture()      │                           │
│             │  - fetchInbox()       │                           │
│             │  - getInboxCounts()   │                           │
│             │  - getInboxItem()     │                           │
│             │  - processInboxItem() │                           │
│             └───────────┬───────────┘                           │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                          │ HTTP/REST API
                          │ (localhost:3001)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Focus Flow Backend API                        │
│                    (Node.js + Express)                           │
│                                                                   │
│  POST   /api/capture                                            │
│  GET    /api/inbox                                              │
│  GET    /api/inbox/counts                                       │
│  GET    /api/inbox/:id                                          │
│  POST   /api/inbox/:id/process                                  │
│                                                                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
                   Obsidian Vault
                   (File System)
```

## Command Flow Diagrams

### /capture Command Flow

```
User: /capture Meeting at 3pm
        │
        ▼
   bot.command('capture')
        │
        ▼
   handleCapture()
        │
        ├─> Parse command text
        ├─> Show loading message
        │
        ▼
   apiClient.sendCapture()
        │
        ├─> POST /api/capture
        │   {
        │     text: "Meeting at 3pm",
        │     source: "telegram",
        │     metadata: { userId, username, ... }
        │   }
        │
        ▼
   Backend creates inbox item
        │
        ▼
   Response: { id, status, item }
        │
        ▼
   Delete loading message
        │
        ▼
   Reply with confirmation
        │
        ▼
   User sees: "Captured successfully! ✅"
```

### /inbox Command Flow

```
User: /inbox work
        │
        ▼
   bot.command('inbox')
        │
        ▼
   handleInboxView()
        │
        ├─> Parse filter argument
        ├─> Show loading message
        │
        ▼
   apiClient.fetchInbox('work')
        │
        ├─> GET /api/inbox?filter=work
        │
        ▼
   Backend returns work items
        │
        ▼
   Response: { items: [...], count: 3 }
        │
        ▼
   Delete loading message
        │
        ▼
   Format items with inline keyboards
        │
        ▼
   Display items (max 5)
   Each with [Process] button
        │
        ▼
   User sees work inbox items
```

### /process Command Flow

```
User: /process abc123
        │
        ▼
   bot.command('process')
        │
        ▼
   handleProcess()
        │
        ├─> Parse item ID
        ├─> Show loading message
        │
        ▼
   apiClient.getInboxItem('abc123')
        │
        ├─> GET /api/inbox/abc123
        │
        ▼
   Backend returns item details
        │
        ▼
   Delete loading message
        │
        ▼
   Display item with action buttons:
   [Task] [Project] [Idea] [Archive] [Delete]
        │
        ▼
   User clicks [Task]
        │
        ▼
   Callback query: "action:task:abc123"
        │
        ▼
   handleItemAction()
        │
        ├─> Parse callback data
        ├─> Show "Processing..." feedback
        │
        ▼
   apiClient.processInboxItem()
        │
        ├─> POST /api/inbox/abc123/process
        │   { action: "task" }
        │
        ▼
   Backend processes item
        │
        ▼
   Update message inline:
   "Item processed as task! ✅"
```

### Auto-Capture Flow

```
User: Remember to call mom
        │
        ▼
   bot.on(message('text'))
        │
        ├─> Check if not a command
        │
        ▼
   handleTextMessage()
        │
        ├─> Show loading message
        │
        ▼
   apiClient.sendCapture()
        │
        ├─> POST /api/capture
        │   {
        │     text: "Remember to call mom",
        │     source: "telegram",
        │     metadata: { ... }
        │   }
        │
        ▼
   Backend creates inbox item
        │
        ▼
   Delete loading message
        │
        ▼
   Reply: "Captured! ✅"
        │
        ▼
   User sees confirmation
```

## Inline Keyboard Callback Flow

```
User clicks inline button
        │
        ▼
   Callback Query Event
   Data: "inbox:work" or "process:abc123" or "action:task:abc123"
        │
        ▼
   bot.on('callback_query')
        │
        ▼
   handleItemAction()
        │
        ├─> Parse callback data
        │   Split by ":"
        │
        ├─> Route to appropriate handler:
        │
        ├─> "inbox:*"    → Filter inbox view
        │
        ├─> "process:*"  → Show item with actions
        │
        └─> "action:*:*" → Process item
                │
                ▼
            Execute action
            Update message inline
            Show confirmation
```

## Data Flow

### Capture Data Flow

```
Telegram Message
    │
    ▼
Capture Payload
{
  text: string,
  source: 'telegram',
  metadata: {
    userId: number,
    username: string,
    firstName: string
  }
}
    │
    ▼
Backend API
    │
    ▼
Inbox Item
{
  id: string,
  text: string,
  source: 'telegram',
  created_at: string,
  metadata: { ... }
}
    │
    ▼
Obsidian Vault
00_inbox/YYYYMMDD-HHMMSS-[id].md
```

### Process Data Flow

```
User Action (e.g., "Task")
    │
    ▼
Process Request
{
  action: 'task',
  task_data?: { ... }
}
    │
    ▼
Backend API
    │
    ├─> Moves from inbox to tasks
    ├─> Updates file location
    └─> Updates metadata
    │
    ▼
Obsidian Vault
03_tasks/[category]/YYYYMMDD-HHMMSS-[id].md
```

## Error Handling Flow

```
User Action
    │
    ▼
Handler tries operation
    │
    ├─> Success → Show confirmation
    │
    └─> Error
        │
        ├─> Network Error
        │   └─> "Failed. Check if backend is running."
        │
        ├─> Validation Error
        │   └─> "Invalid input. Please check and try again."
        │
        ├─> Not Found Error
        │   └─> "Item not found. Please check the ID."
        │
        └─> Unknown Error
            └─> "An error occurred. Please try again."
```

## Component Responsibilities

### bot.ts (Main Entry)
- Initialize Telegraf bot
- Register command handlers
- Set up middleware
- Configure error handling
- Handle graceful shutdown
- Log bot startup information

### handlers/capture.ts
**Responsibilities:**
- Handle `/capture` command
- Auto-capture text messages
- Show loading indicators
- Send captures to backend
- Confirm receipt to user
- Handle voice/image (stubs)

**Functions:**
- `handleCapture()` - Process /capture command
- `handleTextMessage()` - Auto-capture text
- `handleVoiceCapture()` - Voice capture (placeholder)
- `handleImageCapture()` - Image capture (placeholder)

### handlers/inbox.ts
**Responsibilities:**
- Handle `/inbox` command
- Display inbox counts
- Show filtered items
- Handle `/process` command
- Process inline keyboard callbacks
- Update items inline

**Functions:**
- `handleInboxView()` - Main inbox command
- `handleInboxCounts()` - Show counts
- `handleFilteredInbox()` - Show filtered items
- `handleProcess()` - Process specific item
- `handleItemAction()` - Handle button clicks

### services/api-client.ts
**Responsibilities:**
- Communicate with backend API
- Make HTTP requests
- Handle responses
- Manage authentication
- Parse errors
- Type-safe interfaces

**Methods:**
- `sendCapture()` - POST capture
- `fetchInbox()` - GET inbox items
- `getInboxCounts()` - GET counts
- `getInboxItem()` - GET specific item
- `processInboxItem()` - POST process action
- `getHeaders()` - Build request headers

### types/index.ts
**Responsibilities:**
- Define TypeScript interfaces
- Ensure type safety
- Document data structures
- Enable IDE autocomplete

**Types:**
- `InboxItem`
- `AIClassification`
- `InboxCounts`
- `CapturePayload`
- `ProcessInboxRequest`
- `CaptureResponse`
- `ProcessResponse`

## State Management

The bot is **stateless** - no client-side state management:
- Each request is independent
- Item IDs encoded in callback data
- Backend maintains all state
- Simple and reliable

## Security Considerations

1. **Environment Variables**
   - Bot token stored in .env
   - API keys not in code
   - No hardcoded secrets

2. **API Authentication**
   - Optional API key support
   - Bearer token authentication
   - Configurable per environment

3. **Error Messages**
   - No sensitive data in errors
   - User-friendly messages
   - Detailed logging for debugging

4. **Input Validation**
   - Command parameter validation
   - Filter whitelist checking
   - ID format validation

## Performance Optimizations

1. **Loading Indicators**
   - Immediate user feedback
   - Perceived performance improvement

2. **Message Cleanup**
   - Delete loading messages
   - Keep chat clean
   - Reduce clutter

3. **Batch Display**
   - Show 5 items at a time
   - Prevent overwhelming user
   - Reduce API load

4. **Inline Updates**
   - Update messages in place
   - No new message spam
   - Smooth UX

## Future Extensions

1. **Voice Transcription**
   - Use Claude API
   - Download voice files
   - Transcribe to text
   - Auto-capture result

2. **Image Capture**
   - Download images
   - OCR text extraction
   - Caption processing
   - Multi-modal analysis

3. **Advanced NLP**
   - Due date extraction
   - Priority detection
   - Auto-categorization
   - Smart suggestions

4. **Scheduled Reminders**
   - Parse time expressions
   - Set Telegram reminders
   - Follow-up prompts
   - Daily summaries
