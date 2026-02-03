# Focus Flow System Configuration

## Docker Services

This directory contains the Docker Compose configuration for Focus Flow OS services.

### Services Overview

1. **OpenClaw** - Anthropic's Claude interface for vault operations
   - Port: 127.0.0.1:3000
   - Requires: Anthropic API key

2. **Qdrant** - Vector database for embeddings
   - Port: 127.0.0.1:6333
   - No configuration needed

3. **mem0** - Personal memory layer
   - Port: 127.0.0.1:8050
   - Depends on: Qdrant

4. **Coolify** - Self-hosted deployment platform
   - Port: 127.0.0.1:8000
   - Requires: Docker socket access

### Prerequisites

1. Docker installed (✓ detected)
2. Anthropic API key configured in `/srv/focus-flow/07_system/secrets/anthropic_api_key.txt`

### Starting Services

```bash
# Navigate to config directory
cd /srv/focus-flow/07_system/config

# Start all services
docker compose up -d

# Check service health
docker compose ps

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Service Endpoints (via Tailscale)

After configuring Tailscale serve:
- PWA: https://focus-flow-new.tail49878c.ts.net
- Coolify: https://focus-flow-new.tail49878c.ts.net:8000
- OpenClaw: https://focus-flow-new.tail49878c.ts.net:3000

### Health Checks

All services have health checks that run every 30 seconds:
- OpenClaw: `curl http://localhost:3000/health`
- Qdrant: `curl http://localhost:6333/health`
- mem0: `curl http://localhost:8050/health`

### Security

- All services bind to 127.0.0.1 (localhost only)
- Access via Tailscale network only
- UFW firewall blocks public access
- OpenClaw has read-only vault access
- Secrets managed via Docker secrets

### Troubleshooting

**Services won't start:**
- Check API key: `cat /srv/focus-flow/07_system/secrets/anthropic_api_key.txt`
- View logs: `docker compose logs <service_name>`
- Verify images exist: `docker compose pull`

**Health checks failing:**
- Wait 30-60 seconds after startup
- Check service logs for errors
- Verify port bindings: `docker compose ps`

**Network issues:**
- Verify UFW allows Tailscale: `ufw status`
- Check Tailscale status: `tailscale status`
- Test local connectivity: `curl http://localhost:3000/health`
