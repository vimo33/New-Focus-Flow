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

## Authentication

Focus Flow uses Claude CLI authentication for AI features:

### Setup

1. Authenticate with your Claude subscription:
   ```bash
   claude auth
   ```

2. Verify authentication:
   ```bash
   claude auth status
   ```

3. Start the service:
   ```bash
   npm run dev
   ```

## AI Configuration

Focus Flow uses OpenClaw Gateway to access Claude via your Claude subscription.

### Prerequisites

1. **Claude Subscription** (Pro or higher)
2. **OpenClaw CLI** installed

### Setup Steps

1. Install OpenClaw:
   ```bash
   npm install -g openclaw
   ```

2. Generate Claude setup token:
   ```bash
   claude setup-token
   # Copy the generated token
   ```

3. Initialize OpenClaw:
   ```bash
   openclaw setup
   ```

4. Configure Claude authentication:
   ```bash
   openclaw models auth paste-token --provider anthropic
   # Paste the token from step 2

   # Verify
   openclaw models status
   ```

5. Generate secure auth token:
   ```bash
   openssl rand -hex 32 > /tmp/token.txt
   mkdir -p /srv/focus-flow/07_system/secrets
   echo "OPENCLAW_AUTH_TOKEN=$(cat /tmp/token.txt)" > /srv/focus-flow/07_system/secrets/.openclaw.env
   chmod 600 /srv/focus-flow/07_system/secrets/.openclaw.env
   shred -u /tmp/token.txt
   ```

6. Start OpenClaw Gateway (SECURITY: localhost-only binding):
   ```bash
   openclaw gateway --host 127.0.0.1 --port 18789 --require-auth

   # Or install as system service
   openclaw gateway install --host 127.0.0.1 --require-auth
   openclaw gateway start

   # Verify localhost-only binding
   netstat -tuln | grep 18789
   # Expected: 127.0.0.1:18789 (NOT 0.0.0.0:18789)
   ```

7. Set up firewall:
   ```bash
   sudo ufw deny 18789/tcp
   sudo ufw status | grep 18789
   ```

8. Start Focus Flow backend:
   ```bash
   cd /srv/focus-flow/02_projects/active/focus-flow-backend
   npm run dev
   ```

### Security Best Practices

⚠️ **CRITICAL**: OpenClaw has inherent security risks. Follow these practices:

1. **Localhost Only**: Gateway MUST bind to 127.0.0.1 (never 0.0.0.0)
2. **Authentication Required**: Always use auth tokens
3. **Firewall Rules**: Block port 18789 from external access
4. **Audit Logging**: Enable and monitor security audit logs
5. **Input Sanitization**: All user input is sanitized before AI processing
6. **Least Privilege**: Limit what data OpenClaw can access
7. **No Sensitive Data**: Do not process financial, health, or client data
8. **Regular Monitoring**: Check `/api/security/status` daily

### Troubleshooting

- **Gateway not starting**: Check `openclaw gateway status`
- **Auth errors**: Re-run `claude setup-token` and update OpenClaw
- **Connection refused**: Ensure Gateway is on port 18789
- **API errors**: Check Gateway logs: `openclaw gateway logs`
- **Security alerts**: Check `/srv/focus-flow/07_system/logs/security-audit.log`

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `PORT` - Server port (default: 3001)
- `VAULT_PATH` - Path to Focus Flow vault (default: /srv/focus-flow)
- `OPENCLAW_GATEWAY_URL` - OpenClaw Gateway URL (default: http://localhost:18789)
- `OPENCLAW_AUTH_TOKEN` - Loaded from `/srv/focus-flow/07_system/secrets/.openclaw.env`

Optional:
- `OPENCLAW_MAX_TOKENS` - Max tokens per request (default: 4000)
- `OPENCLAW_TIMEOUT_MS` - Request timeout (default: 60000)
- `OPENCLAW_ENABLE_AUDIT_LOG` - Enable security logging (default: true)
- `TELEGRAM_BOT_TOKEN` - For Telegram integration
- `CORS_ORIGINS` - Allowed CORS origins

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
