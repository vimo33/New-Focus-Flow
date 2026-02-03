# Focus Flow OS

**A Personal Productivity & Wellbeing Operating System with Autonomous AI Capabilities**

Focus Flow OS is a comprehensive personal productivity system that combines task management, project planning, idea validation, and health tracking into a unified platform. Built with modern web technologies and powered by AI, it helps you capture, organize, and execute on what matters most.

---

## Quick Start

### Prerequisites
- Node.js 22+
- Docker & Docker Compose
- Linux (Ubuntu 22.04+ recommended)

### Installation

```bash
# Clone repository (if using Git)
git clone <repository-url>
cd /srv/focus-flow

# Install backend
cd 02_projects/active/focus-flow-backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run build
npm start

# Install frontend
cd ../focus-flow-ui
npm install
npm run build
npm run preview

# Start Docker services
cd /srv/focus-flow/07_system/config
docker compose up -d
```

### Quick Test

```bash
# Test backend API
curl http://localhost:3001/health

# Capture an item
curl -X POST http://localhost:3001/api/capture \
  -H "Content-Type: application/json" \
  -d '{"text": "My first quick capture!"}'

# View inbox
curl http://localhost:3001/api/inbox
```

Access the UI at: `http://localhost:3008`

---

## Features

### Core Capabilities

- **Quick Capture**: Capture thoughts instantly via web, Telegram, or API
- **AI Classification**: Automatic categorization of inbox items using Claude AI
- **Task Management**: Organize tasks by category, priority, and due date
- **Project Planning**: Full project lifecycle management with workspaces
- **Idea Validation**: AI Council for evaluating ideas from multiple perspectives
- **Health Tracking**: Log and visualize wellbeing metrics
- **Voice Input**: Web Speech API integration for hands-free capture
- **Telegram Bot**: Mobile quick capture and notifications
- **Real-time Updates**: WebSocket support for live UI updates

### AI Features

- **Auto-classification**: Intelligent categorization of inbox items
- **AI Council**: Multi-agent debate system for idea validation
- **Smart Suggestions**: Context-aware recommendations
- **Personal Memory**: mem0 integration for personalized AI responses
- **Voice Transcription**: Whisper API for voice notes

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  INPUT: Telegram • PWA • Voice • API                       │
├─────────────────────────────────────────────────────────────┤
│  BACKEND: Node.js + Express + TypeScript                   │
├─────────────────────────────────────────────────────────────┤
│  AI: Claude API • Auto-classification • AI Council         │
├─────────────────────────────────────────────────────────────┤
│  SERVICES: OpenClaw • Qdrant • mem0 • Coolify             │
├─────────────────────────────────────────────────────────────┤
│  STORAGE: File-based Vault (/srv/focus-flow)              │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **Zustand** - State management
- **React Router 7** - Navigation

### Backend
- **Node.js 22** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **Anthropic Claude API** - AI capabilities

### Infrastructure
- **Docker** - Containerization
- **Tailscale** - Secure networking
- **UFW** - Firewall
- **Qdrant** - Vector database
- **mem0** - Personal memory layer

---

## Project Structure

```
/srv/focus-flow/
├── 00_inbox/              # Quick capture inbox
│   ├── raw/              # Unprocessed items
│   ├── processing/       # Being classified
│   └── archive/          # Processed items
├── 01_tasks/             # Task management
│   ├── work/            # Work tasks
│   ├── personal/        # Personal tasks
│   └── scheduled/       # Scheduled tasks
├── 02_projects/          # Project management
│   ├── active/          # Active projects
│   │   ├── focus-flow-backend/     # Backend API
│   │   ├── focus-flow-ui/          # Frontend PWA
│   │   └── focus-flow-telegram-bot/ # Telegram bot
│   ├── paused/          # Paused projects
│   └── completed/       # Completed projects
├── 03_ideas/            # Idea validation
│   ├── inbox/          # New ideas
│   ├── validated/      # Approved ideas
│   └── rejected/       # Rejected ideas
├── 04_notes/           # Notes (future)
├── 05_events/          # Calendar (future)
├── 06_health/          # Health tracking
│   └── logs/          # Health metrics
└── 07_system/          # System configuration
    ├── config/        # Docker Compose, configs
    ├── secrets/       # API keys, tokens
    ├── logs/          # System logs
    ├── memory/        # AI memory storage
    └── scripts/       # Automation scripts
```

---

## Usage Examples

### Quick Capture via API

```bash
# Capture a thought
curl -X POST http://localhost:3001/api/capture \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Schedule dentist appointment for next week",
    "prefix": "🦷"
  }'
```

### Process Inbox Item

```bash
# Convert to task
curl -X POST http://localhost:3001/api/inbox/inbox-20260203-001/process \
  -H "Content-Type: application/json" \
  -d '{
    "action": "task",
    "task_data": {
      "category": "personal",
      "priority": "high",
      "due_date": "2026-02-10"
    }
  }'
```

### Create Task Directly

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

### Log Health Metric

```bash
curl -X POST http://localhost:3001/api/health/log \
  -H "Content-Type: application/json" \
  -d '{
    "metric_type": "mood",
    "value": 8,
    "date": "2026-02-03",
    "notes": "Feeling productive"
  }'
```

---

## Telegram Bot Commands

```
/start              - Welcome and setup
/capture <text>     - Quick capture to inbox
/inbox              - Show inbox counts
/inbox work         - Show work items
/process <id>       - Process inbox item
/projects           - List active projects
/task <text>        - Create task quickly
/health mood 8      - Log health metric
/help               - Show all commands
```

---

## Development

### Backend Development

```bash
cd /srv/focus-flow/02_projects/active/focus-flow-backend

# Install dependencies
npm install

# Run in development mode (hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Run tests
npm test
```

### Frontend Development

```bash
cd /srv/focus-flow/02_projects/active/focus-flow-ui

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Docker Services

```bash
cd /srv/focus-flow/07_system/config

# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Check service health
docker compose ps

# Stop all services
docker compose down

# Restart specific service
docker compose restart openclaw
```

---

## API Documentation

**Base URL:** `http://localhost:3001`

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/capture` | Quick capture item |
| GET | `/api/inbox` | List inbox items |
| GET | `/api/inbox/counts` | Get inbox counts |
| POST | `/api/inbox/:id/process` | Process inbox item |
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create task |
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| GET | `/api/ideas` | List ideas |
| POST | `/api/ideas` | Create idea |
| POST | `/api/health/log` | Log health metric |
| GET | `/api/summary` | Dashboard summary |

For complete API reference, see [PRODUCTION.md](PRODUCTION.md#api-reference).

---

## Security

- **Firewall:** UFW configured to allow only Tailscale traffic
- **VPN:** All services accessible via Tailscale only
- **Secrets:** Stored in `/srv/focus-flow/07_system/secrets/` (not in Git)
- **Docker:** Security hardening (no-new-privileges, dropped capabilities)
- **HTTPS:** Automatic via Tailscale serve

---

## Deployment

### Systemd Services

Create service files for each component:

```bash
# Backend API
sudo systemctl enable focus-flow-backend
sudo systemctl start focus-flow-backend

# Frontend UI
sudo systemctl enable focus-flow-ui
sudo systemctl start focus-flow-ui

# Telegram Bot
sudo systemctl enable focus-flow-telegram-bot
sudo systemctl start focus-flow-telegram-bot
```

### Docker Deployment

Build and run with Docker:

```bash
# Backend
cd /srv/focus-flow/02_projects/active/focus-flow-backend
docker build -t focus-flow-backend .
docker run -d -p 3001:3001 focus-flow-backend

# Services
cd /srv/focus-flow/07_system/config
docker compose up -d
```

For detailed deployment instructions, see [PRODUCTION.md](PRODUCTION.md#deployment).

---

## Monitoring

### Health Checks

```bash
# Backend API
curl http://localhost:3001/health

# Docker services
docker compose ps
curl http://localhost:3000/health  # OpenClaw
curl http://localhost:6333/health  # Qdrant
curl http://localhost:8050/health  # mem0
```

### Logs

```bash
# Backend service logs
sudo journalctl -u focus-flow-backend -f

# Docker service logs
docker compose logs -f

# System logs
tail -f /srv/focus-flow/07_system/logs/*.log
```

---

## Backup & Recovery

### Automated Backups

```bash
# Run backup script
/srv/focus-flow/07_system/scripts/backup-vault.sh

# Schedule daily backups (cron)
0 2 * * * /srv/focus-flow/07_system/scripts/backup-vault.sh
```

### Manual Backup

```bash
# Backup entire vault
tar -czf focus-flow-backup-$(date +%Y%m%d).tar.gz /srv/focus-flow

# Restore from backup
tar -xzf focus-flow-backup-20260203.tar.gz -C /
```

For detailed backup strategies, see [PRODUCTION.md](PRODUCTION.md#backup--recovery).

---

## Troubleshooting

### Backend Won't Start

```bash
# Check if port is in use
sudo lsof -i :3001

# View service logs
sudo journalctl -u focus-flow-backend -n 50

# Test manually
cd /srv/focus-flow/02_projects/active/focus-flow-backend
npm run dev
```

### Docker Services Unhealthy

```bash
# Check service logs
docker compose logs openclaw

# Restart service
docker compose restart openclaw

# Verify health
curl http://localhost:3000/health
```

### AI Classification Not Working

```bash
# Verify API key
cat /srv/focus-flow/07_system/secrets/anthropic_api_key.txt

# Check backend logs for API errors
sudo journalctl -u focus-flow-backend | grep -i "anthropic"

# Manually trigger classification
curl -X POST http://localhost:3001/api/inbox/classify-all
```

For complete troubleshooting guide, see [PRODUCTION.md](PRODUCTION.md#troubleshooting).

---

## Roadmap

### Phase 1: Foundation (Complete)
- [x] Vault structure
- [x] Docker services
- [x] Security setup (UFW, Tailscale)
- [x] Agent framework

### Phase 2: Backend API (Complete)
- [x] REST API endpoints
- [x] Vault file operations
- [x] AI classification service
- [x] Background processing

### Phase 3: Frontend (In Progress)
- [x] React + Vite setup
- [x] Tailwind design system
- [x] Basic routing
- [ ] Dashboard screen
- [ ] Inbox processing screen
- [ ] Project workspace

### Phase 4: Telegram Bot (In Progress)
- [x] Bot framework
- [x] Basic commands
- [x] API integration
- [ ] Voice transcription
- [ ] Image OCR

### Phase 5: AI Integration (Planned)
- [x] Claude API client
- [x] Auto-classification
- [ ] AI Council for ideas
- [ ] Project spec generation
- [ ] mem0 integration

### Phase 6: Advanced Features (Future)
- [ ] Calendar integration
- [ ] Advanced analytics
- [ ] Mobile app
- [ ] Collaboration features
- [ ] Plugin system

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Contribution Guide

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

---

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **Anthropic** - Claude AI API
- **Qdrant** - Vector database
- **mem0** - Personal memory layer
- **Tailscale** - Secure networking
- **React Team** - React framework
- **Vite Team** - Build tool

---

## Support

- **Documentation:** [PRODUCTION.md](PRODUCTION.md)
- **API Reference:** [PRODUCTION.md#api-reference](PRODUCTION.md#api-reference)
- **Troubleshooting:** [PRODUCTION.md#troubleshooting](PRODUCTION.md#troubleshooting)

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and release notes.

---

**Built with focus. Powered by AI. Designed for productivity.**
