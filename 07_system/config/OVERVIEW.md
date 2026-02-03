# Focus Flow Full Stack - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Focus Flow Ecosystem                         │
└─────────────────────────────────────────────────────────────────┘

User Interfaces:
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Frontend   │  │   Telegram   │  │   Coolify    │
│   (React)    │  │     Bot      │  │  Dashboard   │
│   Port 5173  │  │  (Webhook)   │  │  Port 8000   │
└──────┬───────┘  └──────┬───────┘  └──────────────┘
       │                 │
       └────────┬────────┘
                │
        ┌───────▼────────┐
        │    Backend     │
        │   (Node.js)    │
        │   Port 3001    │
        └───────┬────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───▼───┐  ┌───▼───┐  ┌───▼────┐
│OpenClaw│ │  Mem0  │ │ Qdrant │
│ Port   │ │ Port   │ │ Port   │
│ 3000   │ │ 8050   │ │ 6333   │
└────────┘ └────────┘ └────────┘

Infrastructure:
    All services share:
    - /srv/focus-flow (vault)
    - focus-flow-network (Docker network)
    - Secrets via Docker secrets
```

## Service Roles

### Application Layer

**Frontend (focus-flow-ui)**
- Technology: React + Vite + TypeScript
- Port: 5173 (public via Tailscale)
- Purpose: Progressive Web App interface
- Build: Multi-stage (Node build → Nginx serve)
- Access: User-facing web interface

**Backend (focus-flow-backend)**
- Technology: Node.js + TypeScript + Express
- Port: 3001 (localhost only)
- Purpose: REST API, business logic, integrations
- Features: Task management, notes, vault access
- Database: File-based vault system

**Telegram Bot (focus-flow-telegram-bot)**
- Technology: Node.js + TypeScript + Telegraf
- Port: None (webhook/polling)
- Purpose: Voice-to-text, task creation via Telegram
- Features: OpenAI Whisper integration, Claude AI

### AI & Memory Layer

**OpenClaw**
- Technology: Anthropic official AI gateway
- Port: 3000 (localhost only)
- Purpose: Secure Claude AI access
- Security: Hardened container, read-only vault
- Features: Session management, prompt caching

**Mem0**
- Technology: Memory layer for AI
- Port: 8050 (localhost only)
- Purpose: Persistent memory across conversations
- Storage: Backed by Qdrant vector DB
- Features: Context retention, semantic memory

**Qdrant**
- Technology: Vector database
- Ports: 6333 (HTTP), 6334 (gRPC)
- Purpose: Vector embeddings storage
- Use cases: Semantic search, memory storage
- Persistence: Named Docker volume

### Infrastructure

**Coolify**
- Technology: Self-hosted PaaS
- Port: 8000 (public via Tailscale)
- Purpose: Deployment and management
- Features: Container orchestration, monitoring
- Access: Docker socket for management

## Network Architecture

### Network: focus-flow-network (172.28.0.0/16)

All services communicate via internal bridge network.

**Public Access (via Tailscale):**
- Frontend: 5173
- Coolify: 8000

**Localhost Only:**
- Backend: 127.0.0.1:3001
- OpenClaw: 127.0.0.1:3000
- Qdrant: 127.0.0.1:6333, 127.0.0.1:6334
- Mem0: 127.0.0.1:8050

**No External Ports:**
- Telegram Bot (uses Telegram API)

### Internal Service Discovery

Services use Docker DNS for internal communication:
- `http://backend:3001` - Backend API
- `http://qdrant:6333` - Qdrant HTTP
- `http://mem0:8050` - Mem0 API
- `http://openclaw:3000` - OpenClaw gateway

## Data Flow

### User Interaction Flow

```
User (Web) → Frontend:5173 → Backend:3001 → {
    - OpenClaw:3000 → Claude API
    - Mem0:8050 → Qdrant:6333
    - Vault (/srv/focus-flow)
}

User (Telegram) → Telegram Bot → Backend:3001 → {
    - OpenAI Whisper (voice transcription)
    - Claude API (via backend)
    - Vault (/srv/focus-flow)
}
```

### Memory Flow

```
User Request → Backend
    ↓
    Mem0 (retrieve context)
    ↓
    Qdrant (vector search)
    ↓
    OpenClaw (AI processing with context)
    ↓
    Response → User
    ↓
    Mem0 (store new memory)
    ↓
    Qdrant (persist vectors)
```

## Storage Architecture

### Volumes

**Named Volumes (Docker-managed):**
- `openclaw-sessions` - AI session data
- `qdrant-data` - Vector database
- `mem0-data` - Memory layer data
- `coolify-data` - Coolify config/db

**Bind Mounts:**
- `/srv/focus-flow` - Shared vault structure
  - Read-write: backend, telegram-bot
  - Read-only: openclaw, coolify

### Vault Structure (/srv/focus-flow)

```
/srv/focus-flow/
├── 01_inbox/              # New items
├── 02_projects/           # Active projects
│   └── active/
│       ├── focus-flow-backend/
│       ├── focus-flow-ui/
│       └── focus-flow-telegram-bot/
├── 03_areas/              # Ongoing responsibilities
├── 04_resources/          # Reference materials
├── 05_archive/            # Completed items
├── 06_media/              # Images, audio, video
└── 07_system/
    ├── config/            # System configuration
    │   ├── docker-compose-full.yml
    │   ├── docker-compose-full-README.md
    │   ├── QUICK-START.md
    │   └── validate-setup.sh
    ├── secrets/           # API keys, tokens
    ├── logs/              # Application logs
    └── templates/         # Document templates
```

## Security Architecture

### Secrets Management

All secrets stored in `/srv/focus-flow/07_system/secrets/` with 600 permissions:
- `anthropic_api_key.txt` - Claude API access
- `openai_api_key.txt` - Whisper transcription
- `telegram_bot_token.txt` - Telegram integration

Secrets mounted via Docker secrets (not environment variables).

### Container Security

**OpenClaw Hardening:**
- Read-only filesystem
- All capabilities dropped (`cap_drop: ALL`)
- No new privileges
- Tmpfs for temporary files
- Read-only vault access

**All Services:**
- Restart policy: `unless-stopped`
- Health checks with timeouts
- Network isolation
- Minimal port exposure

### Network Security

- Internal bridge network (172.28.0.0/16)
- Services isolated from host network
- Public access only via Tailscale
- No direct internet exposure

## Dependency Graph

```
Startup Order:
1. qdrant (base layer)
   └─> 2. mem0 (depends on qdrant)
       └─> 3. backend (depends on mem0, qdrant)
           ├─> 4a. frontend (depends on backend)
           └─> 4b. telegram-bot (depends on backend)

Independent:
- openclaw (parallel with mem0)
- coolify (independent)
```

Health check dependencies ensure proper startup order.

## Technology Stack

### Frontend
- React 18
- Vite (build tool)
- TypeScript
- Nginx (production server)
- PWA capabilities

### Backend
- Node.js 18
- TypeScript
- Express.js
- File-based vault storage

### Telegram Bot
- Node.js 18
- TypeScript
- Telegraf (Telegram framework)
- OpenAI Whisper integration

### Infrastructure
- Docker & Docker Compose
- Qdrant (vector DB)
- Mem0 (memory layer)
- OpenClaw (AI gateway)
- Coolify (PaaS)

## Monitoring & Health

### Health Endpoints

All services provide health checks:
- Backend: `http://localhost:3001/health`
- Frontend: `http://localhost:5173`
- OpenClaw: `http://localhost:3000/health`
- Qdrant: `http://localhost:6333/health`
- Mem0: `http://localhost:8050/health`
- Coolify: `http://localhost:8000/api/health`

### Health Check Parameters

- **Interval**: 30-60s
- **Timeout**: 10s
- **Retries**: 3
- **Start Period**: 20-60s (grace period)

### Monitoring Commands

```bash
# Service status
docker compose -f docker-compose-full.yml ps

# Resource usage
docker stats

# Logs
docker compose -f docker-compose-full.yml logs -f

# Health status
docker inspect focus-flow-backend --format='{{.State.Health.Status}}'
```

## Backup Strategy

### Critical Data

1. **Qdrant Data** (`qdrant-data` volume)
   - Vector embeddings
   - Backup frequency: Daily

2. **Mem0 Data** (`mem0-data` volume)
   - AI memory state
   - Backup frequency: Daily

3. **Vault** (`/srv/focus-flow`)
   - All user data
   - Backup frequency: Continuous (version control)

4. **Coolify Data** (`coolify-data` volume)
   - Deployment config
   - Backup frequency: Weekly

### Backup Commands

See `docker-compose-full-README.md` for detailed backup procedures.

## Scaling Considerations

### Current Architecture
- Single-node deployment
- Suitable for individual/small team use
- All services on one host

### Future Scaling Options
1. **Multi-container**: Add read replicas for Qdrant
2. **Load balancing**: Multiple backend instances
3. **Database**: Migrate vault to PostgreSQL
4. **Caching**: Add Redis for sessions
5. **CDN**: Static asset distribution

## Development Workflow

1. **Code changes**: Edit in `/srv/focus-flow/02_projects/active/`
2. **Rebuild**: `docker compose -f docker-compose-full.yml build service-name`
3. **Deploy**: `docker compose -f docker-compose-full.yml up -d service-name`
4. **Test**: Check logs and health endpoints
5. **Commit**: Version control via git

## Production Deployment

### Prerequisites
- Valid API keys in secrets directory
- Environment variables configured
- Tailscale for secure access
- Regular backup schedule

### Deployment Steps
1. Run validation: `./validate-setup.sh`
2. Start services: `docker compose -f docker-compose-full.yml up -d`
3. Verify health: Check all health endpoints
4. Monitor logs: Watch for errors
5. Access via Tailscale: Test frontend and Coolify

## Troubleshooting

See `docker-compose-full-README.md` for detailed troubleshooting guides.

## Documentation

- **Main README**: `docker-compose-full-README.md`
- **Quick Start**: `QUICK-START.md`
- **This Overview**: `OVERVIEW.md`
- **Validation**: `validate-setup.sh`
- **Secrets Guide**: `/srv/focus-flow/07_system/secrets/README.md`

## Contact & Support

For issues with Focus Flow:
1. Check service logs
2. Review health check status
3. Consult project-specific READMEs
4. Run validation script
