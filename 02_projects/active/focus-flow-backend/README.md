# Focus Flow Backend API

REST API server for Focus Flow OS - Personal productivity and wellbeing system.

## Technology Stack

- **Runtime:** Node.js 22
- **Framework:** Express.js
- **Language:** TypeScript
- **Storage:** File-based vault at `/srv/focus-flow`

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Server will start on `http://localhost:3001`

### Build

```bash
npm run build
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Inbox (Quick Capture)
- `POST /api/capture` - Quick capture text/voice/image
- `GET /api/inbox` - List inbox items (optional: `?filter=work|personal|ideas`)
- `GET /api/inbox/counts` - Get counts by category
- `GET /api/inbox/:id` - Get single inbox item
- `POST /api/inbox/:id/process` - Process item (convert to task/project/idea/archive/delete)

### Tasks
- `GET /api/tasks` - List tasks (optional: `?category=work|personal|scheduled`)
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task

### Projects
- `GET /api/projects` - List projects (optional: `?status=active|paused|completed`)
- `POST /api/projects` - Create project

### Ideas
- `GET /api/ideas` - List ideas (optional: `?status=inbox|validated|rejected`)
- `POST /api/ideas` - Create idea

### Health
- `POST /api/health/log` - Log health metric

### Dashboard
- `GET /api/summary` - Dashboard summary (inbox counts, active projects, etc.)

## Example Requests

### Capture Text

```bash
curl -X POST http://localhost:3001/api/capture \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Schedule dentist appointment for next week",
    "prefix": "🦷",
    "source": "telegram"
  }'
```

### Get Inbox Items

```bash
curl http://localhost:3001/api/inbox?filter=work
```

### Create Task

```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Review Q1 budget",
    "category": "work",
    "priority": "high",
    "due_date": "2026-02-10"
  }'
```

### Process Inbox Item

```bash
curl -X POST http://localhost:3001/api/inbox/inbox-20260203-001/process \
  -H "Content-Type: application/json" \
  -d '{
    "action": "task",
    "task_data": {
      "category": "work",
      "priority": "high"
    }
  }'
```

## File Structure

```
src/
├── index.ts              # Express server entry point
├── routes/               # API route handlers
│   ├── inbox.routes.ts
│   ├── tasks.routes.ts
│   ├── projects.routes.ts
│   ├── ideas.routes.ts
│   └── health.routes.ts
├── services/             # Business logic
│   └── vault.service.ts  # File system operations
├── models/               # TypeScript types
│   └── types.ts
├── middleware/           # Express middleware
└── utils/                # Helper functions
    ├── id-generator.ts
    └── file-operations.ts
```

## Vault Storage

All data is stored in `/srv/focus-flow`:

```
/srv/focus-flow/
├── 00_inbox/
│   ├── raw/              # Unprocessed items (.json)
│   ├── processing/       # Being classified
│   └── archive/          # Processed items
├── 01_tasks/
│   ├── work/             # Work tasks (.json)
│   ├── personal/         # Personal tasks
│   └── scheduled/        # Scheduled tasks
├── 02_projects/
│   ├── active/           # Active projects (.json)
│   ├── paused/           # Paused projects
│   └── completed/        # Completed projects
├── 03_ideas/
│   ├── inbox/            # New ideas (.json)
│   ├── validated/        # Approved ideas
│   └── rejected/         # Rejected ideas
├── 04_notes/             # Notes (not yet implemented)
├── 05_events/            # Calendar events (not yet implemented)
├── 06_health/
│   └── logs/             # Health metrics (.csv + .json)
└── 07_system/            # System config and logs
```

## Development

### Run in Development Mode

```bash
npm run dev
```

Uses `nodemon` and `ts-node` for hot reloading.

### Build for Production

```bash
npm run build
```

Compiles TypeScript to JavaScript in `dist/` directory.

### Run in Production

```bash
npm start
```

Runs the compiled JavaScript from `dist/`.

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `PORT` - Server port (default: 3001)
- `VAULT_PATH` - Path to Focus Flow vault (default: /srv/focus-flow)

Optional:
- `ANTHROPIC_API_KEY` - For AI features
- `TELEGRAM_BOT_TOKEN` - For Telegram integration

## CORS Configuration

By default, CORS is enabled for all origins. In production, configure `CORS_ORIGINS` environment variable:

```
CORS_ORIGINS=https://focus-flow.example.com,https://app.example.com
```

## Next Steps

- [ ] Add authentication/authorization
- [ ] Implement WebSocket for real-time updates
- [ ] Add AI classification service
- [ ] Integrate with mem0 for memory
- [ ] Add background job queue for AI processing
- [ ] Implement search across all vault items
- [ ] Add export/import functionality
- [ ] Create API documentation with Swagger/OpenAPI

## License

MIT
