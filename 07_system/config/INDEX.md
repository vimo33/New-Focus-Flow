# Focus Flow Docker Compose - Documentation Index

Complete documentation for the Focus Flow full stack deployment.

## Quick Navigation

### Getting Started
1. **Start Here**: [QUICK-START.md](QUICK-START.md) - Essential commands and operations
2. **Validate Setup**: Run `./validate-setup.sh` before first start
3. **Architecture**: [OVERVIEW.md](OVERVIEW.md) - System architecture and design

### Configuration Files

#### Main Configuration
- **docker-compose-full.yml** - Complete stack configuration (221 lines)
  - All 7 services defined
  - Networks, volumes, secrets configured
  - Health checks and dependencies

#### Documentation
- **docker-compose-full-README.md** - Comprehensive guide (391 lines)
  - Detailed service descriptions
  - Network architecture
  - Secrets management
  - Usage instructions
  - Troubleshooting
  - Backup/restore procedures

- **QUICK-START.md** - Quick reference (145 lines)
  - Common commands
  - Service URLs
  - Health checks
  - Troubleshooting basics

- **OVERVIEW.md** - Architecture overview (391 lines)
  - System architecture diagrams
  - Service roles
  - Data flow
  - Security architecture
  - Technology stack

- **INDEX.md** - This file
  - Documentation navigation
  - File summary

#### Tools
- **validate-setup.sh** - Setup validation script (181 lines)
  - Checks all prerequisites
  - Validates configuration
  - Verifies secrets
  - Tests Docker availability

### Related Documentation

#### Secrets
- `/srv/focus-flow/07_system/secrets/README.md` - Secrets setup guide
  - Anthropic API key
  - OpenAI API key
  - Telegram bot token

#### Project-Specific
- `/srv/focus-flow/02_projects/active/focus-flow-backend/` - Backend docs
- `/srv/focus-flow/02_projects/active/focus-flow-ui/` - Frontend docs
- `/srv/focus-flow/02_projects/active/focus-flow-telegram-bot/` - Bot docs

## Document Purpose Guide

### When to Use Each Document

**Just want to start the system?**
→ Use [QUICK-START.md](QUICK-START.md)

**First time setup?**
→ Run `./validate-setup.sh` then read [QUICK-START.md](QUICK-START.md)

**Need to understand the architecture?**
→ Read [OVERVIEW.md](OVERVIEW.md)

**Troubleshooting an issue?**
→ Check [docker-compose-full-README.md](docker-compose-full-README.md) Troubleshooting section

**Want to configure secrets?**
→ See `/srv/focus-flow/07_system/secrets/README.md`

**Need backup procedures?**
→ See [docker-compose-full-README.md](docker-compose-full-README.md) Backup section

**Learning about a specific service?**
→ See [docker-compose-full-README.md](docker-compose-full-README.md) Services section

**Understanding security?**
→ See [OVERVIEW.md](OVERVIEW.md) Security Architecture section

**Network configuration questions?**
→ See [docker-compose-full-README.md](docker-compose-full-README.md) Network section

**Monitoring and maintenance?**
→ See [docker-compose-full-README.md](docker-compose-full-README.md) Monitoring section

## File Statistics

| File | Lines | Size | Purpose |
|------|-------|------|---------|
| docker-compose-full.yml | 221 | 5.7K | Main configuration |
| docker-compose-full-README.md | 391 | 9.9K | Comprehensive guide |
| QUICK-START.md | 145 | 3.0K | Quick reference |
| OVERVIEW.md | 391 | 11K | Architecture docs |
| validate-setup.sh | 181 | 5.9K | Validation tool |
| **Total** | **1,329** | **35.5K** | Full documentation |

## Services Overview

| Service | Port(s) | Exposure | Purpose |
|---------|---------|----------|---------|
| backend | 3001 | localhost | REST API |
| frontend | 5173 | public (Tailscale) | React PWA |
| telegram-bot | - | none | Telegram integration |
| openclaw | 3000 | localhost | AI gateway |
| qdrant | 6333, 6334 | localhost | Vector database |
| mem0 | 8050 | localhost | Memory layer |
| coolify | 8000 | public (Tailscale) | Deployment platform |

## Quick Command Reference

```bash
# Location
cd /srv/focus-flow/07_system/config

# Validate setup
./validate-setup.sh

# Start all services
docker compose -f docker-compose-full.yml up -d

# View status
docker compose -f docker-compose-full.yml ps

# View logs
docker compose -f docker-compose-full.yml logs -f

# Stop all services
docker compose -f docker-compose-full.yml down

# Rebuild service
docker compose -f docker-compose-full.yml build service-name
docker compose -f docker-compose-full.yml up -d service-name
```

## Support Resources

### Documentation Hierarchy
```
docker-compose-full.yml (configuration)
├── QUICK-START.md (quick reference)
├── docker-compose-full-README.md (comprehensive guide)
├── OVERVIEW.md (architecture & design)
├── validate-setup.sh (validation tool)
└── INDEX.md (this file - navigation)
```

### External Resources
- Backend API: http://localhost:3001
- Frontend UI: http://localhost:5173
- Qdrant Dashboard: http://localhost:6333/dashboard
- Coolify Dashboard: http://localhost:8000

### Related Files
- Secrets: `/srv/focus-flow/07_system/secrets/`
- Logs: `/srv/focus-flow/07_system/logs/`
- Projects: `/srv/focus-flow/02_projects/active/`
- Vault: `/srv/focus-flow/`

## Version Information

- **Created**: 2026-02-03
- **Docker Compose Version**: 3.8 (note: version field is obsolete but harmless)
- **Services**: 7 (backend, frontend, telegram-bot, openclaw, qdrant, mem0, coolify)
- **Networks**: 1 (focus-flow-network)
- **Volumes**: 4 (openclaw-sessions, qdrant-data, mem0-data, coolify-data)
- **Secrets**: 3 (anthropic_api_key, openai_api_key, telegram_bot_token)

## Task Reference

This documentation set was created as part of **Task #49**: Create comprehensive docker-compose.yml for entire Focus Flow stack.

Completion report: `/srv/focus-flow/TASK_49_COMPLETION.md`

## Next Steps After Setup

1. Replace placeholder secrets with real API keys
2. Review and customize `.env` files for each service
3. Run validation: `./validate-setup.sh`
4. Start services: `docker compose -f docker-compose-full.yml up -d`
5. Check health: `docker compose -f docker-compose-full.yml ps`
6. View logs: `docker compose -f docker-compose-full.yml logs -f`
7. Access frontend: http://localhost:5173
8. Test Telegram bot integration
9. Configure Coolify deployments
10. Set up backup schedule

## Maintenance Schedule

### Daily
- Check service health: `docker compose ps`
- Monitor logs for errors
- Verify backups completed

### Weekly
- Update infrastructure images: `docker compose pull`
- Review resource usage: `docker stats`
- Test backup restore procedure

### Monthly
- Rebuild application services
- Review and rotate secrets if needed
- Update documentation if architecture changes
- Review and archive old logs

## Additional Notes

- All services use `restart: unless-stopped` policy
- Health checks configured for all services
- Secrets mounted as files (not environment variables)
- Network is isolated bridge (172.28.0.0/16)
- Most services only accessible via localhost
- Public access controlled via Tailscale

For questions or issues, refer to the troubleshooting sections in the respective documentation files.
