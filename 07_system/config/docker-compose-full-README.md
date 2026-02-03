# Focus Flow Full Stack Docker Compose

Comprehensive Docker Compose configuration for the entire Focus Flow productivity system.

## Services Overview

### Application Services

1. **backend** - Focus Flow API (Node.js/TypeScript)
   - Port: `127.0.0.1:3001`
   - Health endpoint: `/health`
   - Manages tasks, notes, and integrations
   - Full access to vault at `/srv/focus-flow`

2. **frontend** - React PWA with Nginx
   - Port: `5173` (exposed via Tailscale)
   - Nginx-served static files
   - Progressive Web App capabilities
   - Auto-redirects to backend API

3. **telegram-bot** - Telegram Bot Service
   - No exposed ports (uses Telegram API)
   - Provides voice-to-text and task management via Telegram
   - Connects to backend API internally

### Infrastructure Services

4. **openclaw** - Anthropic AI Gateway
   - Port: `127.0.0.1:3000`
   - Read-only vault access
   - Hardened security (read-only filesystem, dropped capabilities)
   - Session persistence via named volume

5. **qdrant** - Vector Database
   - Ports: `127.0.0.1:6333` (HTTP), `127.0.0.1:6334` (gRPC)
   - Persistent vector storage
   - Used for semantic search and embeddings

6. **mem0** - Memory Layer
   - Port: `127.0.0.1:8050`
   - Persistent memory for AI interactions
   - Connects to Qdrant for storage

7. **coolify** - Deployment Platform
   - Port: `8000` (exposed via Tailscale)
   - Self-hosted deployment management
   - Docker socket access for container management
   - Read-only access to project directories

## Network Architecture

All services run on the `focus-flow-network` internal bridge network (172.28.0.0/16).

### Port Exposure Strategy

**Exposed Publicly (via Tailscale):**
- Frontend: `5173` - PWA interface
- Coolify: `8000` - Deployment dashboard

**Localhost Only:**
- Backend: `127.0.0.1:3001`
- OpenClaw: `127.0.0.1:3000`
- Qdrant: `127.0.0.1:6333`, `127.0.0.1:6334`
- Mem0: `127.0.0.1:8050`

**No External Ports:**
- Telegram Bot (uses Telegram API webhooks/polling)

## Secrets Management

Secrets are managed via Docker secrets, stored in `/srv/focus-flow/07_system/secrets/`:

```
/srv/focus-flow/07_system/secrets/
├── anthropic_api_key.txt      # Anthropic Claude API key
├── openai_api_key.txt         # OpenAI API key (for Whisper)
└── telegram_bot_token.txt     # Telegram bot token
```

### Creating Secret Files

```bash
# Anthropic API Key
echo "sk-ant-api-..." > /srv/focus-flow/07_system/secrets/anthropic_api_key.txt
chmod 600 /srv/focus-flow/07_system/secrets/anthropic_api_key.txt

# OpenAI API Key
echo "sk-..." > /srv/focus-flow/07_system/secrets/openai_api_key.txt
chmod 600 /srv/focus-flow/07_system/secrets/openai_api_key.txt

# Telegram Bot Token
echo "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz" > /srv/focus-flow/07_system/secrets/telegram_bot_token.txt
chmod 600 /srv/focus-flow/07_system/secrets/telegram_bot_token.txt
```

## Environment Files

Each application service requires a `.env` file in its project directory:

- `/srv/focus-flow/02_projects/active/focus-flow-backend/.env`
- `/srv/focus-flow/02_projects/active/focus-flow-ui/.env`
- `/srv/focus-flow/02_projects/active/focus-flow-telegram-bot/.env`

See `.env.example` files in each project for required variables.

## Usage

### Starting All Services

```bash
cd /srv/focus-flow/07_system/config
docker compose -f docker-compose-full.yml up -d
```

### Starting Specific Services

```bash
# Start only backend and dependencies
docker compose -f docker-compose-full.yml up -d backend

# Start only infrastructure services
docker compose -f docker-compose-full.yml up -d qdrant mem0 openclaw
```

### Viewing Logs

```bash
# All services
docker compose -f docker-compose-full.yml logs -f

# Specific service
docker compose -f docker-compose-full.yml logs -f backend

# Multiple services
docker compose -f docker-compose-full.yml logs -f backend telegram-bot
```

### Checking Service Health

```bash
# Check all container statuses
docker compose -f docker-compose-full.yml ps

# Check specific service health
docker inspect focus-flow-backend --format='{{.State.Health.Status}}'
```

### Stopping Services

```bash
# Stop all services
docker compose -f docker-compose-full.yml down

# Stop but keep volumes
docker compose -f docker-compose-full.yml down --volumes=false

# Stop and remove volumes (WARNING: deletes data)
docker compose -f docker-compose-full.yml down --volumes
```

### Rebuilding Services

```bash
# Rebuild all application services
docker compose -f docker-compose-full.yml build

# Rebuild specific service
docker compose -f docker-compose-full.yml build backend

# Rebuild and restart
docker compose -f docker-compose-full.yml up -d --build backend
```

## Service Dependencies

The startup order is managed automatically via health checks and depends_on:

```
qdrant (base layer)
  └─> mem0
      ├─> backend
      │   ├─> frontend
      │   └─> telegram-bot
      └─> openclaw (independent)

coolify (independent)
```

## Health Checks

All services include health checks with the following defaults:

- **Interval**: 30-60s (how often to check)
- **Timeout**: 10s (max time for check to complete)
- **Retries**: 3 (failures before marking unhealthy)
- **Start Period**: 20-60s (grace period during startup)

Health check commands:
- **backend**: `wget http://localhost:3001/health`
- **frontend**: `wget http://localhost:5173`
- **telegram-bot**: `node -e "process.exit(0)"`
- **openclaw**: `curl http://localhost:3000/health`
- **qdrant**: `curl http://localhost:6333/health`
- **mem0**: `curl http://localhost:8050/health`
- **coolify**: `curl http://localhost:8000/api/health`

## Volumes

### Named Volumes (Docker-managed)

- `openclaw-sessions` - OpenClaw session data
- `qdrant-data` - Vector database storage
- `mem0-data` - Memory layer persistence
- `coolify-data` - Coolify configuration and database

### Bind Mounts

- `/srv/focus-flow` - Shared vault mount for all services
  - Read-write for backend, telegram-bot
  - Read-only for openclaw, coolify

## Restart Policies

All services use `restart: unless-stopped`:
- Automatically restart on failure
- Restart after system reboot
- Stay stopped if manually stopped

## Security Considerations

### OpenClaw Hardening
- Read-only filesystem
- All capabilities dropped
- No new privileges
- Tmpfs for temporary files
- Read-only vault access

### Secrets
- Stored in `/srv/focus-flow/07_system/secrets/` with 600 permissions
- Mounted as Docker secrets (not environment variables)
- Never committed to version control

### Network Isolation
- All services on isolated bridge network
- Most services only accessible via localhost
- Public services only via Tailscale

## Troubleshooting

### Service won't start

```bash
# Check logs
docker compose -f docker-compose-full.yml logs backend

# Check environment
docker compose -f docker-compose-full.yml config

# Verify secrets exist
ls -l /srv/focus-flow/07_system/secrets/
```

### Health check failures

```bash
# Check service logs
docker logs focus-flow-backend

# Manually test health endpoint
docker exec focus-flow-backend wget -qO- http://localhost:3001/health

# Restart service
docker compose -f docker-compose-full.yml restart backend
```

### Build failures

```bash
# Clean build with no cache
docker compose -f docker-compose-full.yml build --no-cache backend

# Check build context
docker compose -f docker-compose-full.yml build --progress=plain backend
```

### Network issues

```bash
# Inspect network
docker network inspect focus-flow-network

# Verify service connectivity
docker exec focus-flow-backend ping qdrant
docker exec focus-flow-telegram-bot curl http://backend:3001/health
```

## Monitoring

### Check resource usage

```bash
# All containers
docker stats

# Specific service
docker stats focus-flow-backend
```

### Export service logs

```bash
# Last 1000 lines
docker compose -f docker-compose-full.yml logs --tail=1000 > focus-flow.log

# Since specific time
docker compose -f docker-compose-full.yml logs --since="2026-02-03T00:00:00" > focus-flow.log
```

## Backup and Restore

### Backup volumes

```bash
# Create backup directory
mkdir -p /srv/focus-flow/07_system/backups

# Backup Qdrant data
docker run --rm -v qdrant-data:/data -v /srv/focus-flow/07_system/backups:/backup alpine tar czf /backup/qdrant-$(date +%Y%m%d).tar.gz -C /data .

# Backup Mem0 data
docker run --rm -v mem0-data:/data -v /srv/focus-flow/07_system/backups:/backup alpine tar czf /backup/mem0-$(date +%Y%m%d).tar.gz -C /data .

# Backup Coolify data
docker run --rm -v coolify-data:/data -v /srv/focus-flow/07_system/backups:/backup alpine tar czf /backup/coolify-$(date +%Y%m%d).tar.gz -C /data .
```

### Restore volumes

```bash
# Stop services first
docker compose -f docker-compose-full.yml down

# Restore Qdrant data
docker run --rm -v qdrant-data:/data -v /srv/focus-flow/07_system/backups:/backup alpine tar xzf /backup/qdrant-20260203.tar.gz -C /data

# Restart services
docker compose -f docker-compose-full.yml up -d
```

## Updates

### Update infrastructure images

```bash
# Pull latest images
docker compose -f docker-compose-full.yml pull openclaw qdrant mem0 coolify

# Restart with new images
docker compose -f docker-compose-full.yml up -d openclaw qdrant mem0 coolify
```

### Update application services

```bash
# Rebuild and restart
docker compose -f docker-compose-full.yml up -d --build backend frontend telegram-bot
```

## Development vs Production

This configuration is suitable for both development and production:

**Development**:
- Use `.env` files with development settings
- Enable DEBUG logging
- Consider adding volume mounts for live code reloading

**Production**:
- Use `.env.production` files
- Ensure all secrets are properly secured
- Configure Tailscale for secure remote access
- Set up automated backups
- Monitor resource usage and logs

## Support

For issues or questions:
- Check service logs first
- Review health check status
- Verify environment variables and secrets
- Consult individual project READMEs in `/srv/focus-flow/02_projects/active/`
