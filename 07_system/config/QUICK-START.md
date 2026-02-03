# Focus Flow Docker Compose - Quick Start Guide

## Prerequisites

1. Docker and Docker Compose installed
2. All secret files created in `/srv/focus-flow/07_system/secrets/`
3. Environment files configured in each project directory

## Quick Commands

### Start Everything
```bash
cd /srv/focus-flow/07_system/config
docker compose -f docker-compose-full.yml up -d
```

### View Status
```bash
docker compose -f docker-compose-full.yml ps
```

### View Logs
```bash
# All services
docker compose -f docker-compose-full.yml logs -f

# Specific service
docker compose -f docker-compose-full.yml logs -f backend
```

### Stop Everything
```bash
docker compose -f docker-compose-full.yml down
```

### Restart a Service
```bash
docker compose -f docker-compose-full.yml restart backend
```

### Rebuild After Code Changes
```bash
docker compose -f docker-compose-full.yml up -d --build backend
```

## Service URLs

After starting, access services at:

- **Frontend**: http://localhost:5173 (or via Tailscale)
- **Backend API**: http://localhost:3001
- **OpenClaw**: http://localhost:3000
- **Qdrant**: http://localhost:6333
- **Mem0**: http://localhost:8050
- **Coolify**: http://localhost:8000 (or via Tailscale)

## Health Checks

```bash
# Backend
curl http://localhost:3001/health

# Frontend
curl http://localhost:5173

# Qdrant
curl http://localhost:6333/health

# Mem0
curl http://localhost:8050/health
```

## Troubleshooting

### Service won't start
```bash
# Check logs
docker compose -f docker-compose-full.yml logs service-name

# Rebuild from scratch
docker compose -f docker-compose-full.yml build --no-cache service-name
docker compose -f docker-compose-full.yml up -d service-name
```

### Check secrets
```bash
ls -l /srv/focus-flow/07_system/secrets/
```

### Check environment
```bash
cat /srv/focus-flow/02_projects/active/focus-flow-backend/.env
```

### Full restart
```bash
docker compose -f docker-compose-full.yml down
docker compose -f docker-compose-full.yml up -d
```

## Common Operations

### Update Infrastructure Images
```bash
docker compose -f docker-compose-full.yml pull
docker compose -f docker-compose-full.yml up -d
```

### View Resource Usage
```bash
docker stats
```

### Clean Up (WARNING: Removes volumes)
```bash
docker compose -f docker-compose-full.yml down --volumes
```

### Backup Data
```bash
# See docker-compose-full-README.md for detailed backup commands
```

## File Locations

- **Docker Compose**: `/srv/focus-flow/07_system/config/docker-compose-full.yml`
- **Full README**: `/srv/focus-flow/07_system/config/docker-compose-full-README.md`
- **Secrets**: `/srv/focus-flow/07_system/secrets/`
- **Logs**: `/srv/focus-flow/07_system/logs/`
- **Projects**: `/srv/focus-flow/02_projects/active/`

## Service Dependencies

```
Start order (automatic):
1. qdrant
2. mem0, openclaw
3. backend
4. frontend, telegram-bot
5. coolify (independent)
```

## Need More Help?

See the full documentation in `docker-compose-full-README.md`
