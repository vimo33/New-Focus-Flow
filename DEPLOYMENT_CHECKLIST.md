# Focus Flow OS - Deployment Checklist

## Pre-Deployment

- [ ] Server meets requirements:
  - [ ] Docker 20+
  - [ ] Node.js 18+
  - [ ] 4GB+ RAM
  - [ ] 20GB+ disk space
  - [ ] UFW firewall configured
  - [ ] Tailscale installed

- [ ] API keys obtained:
  - [ ] Anthropic API key
  - [ ] Telegram bot token (from @BotFather)
  - [ ] OpenAI API key

- [ ] Repository cloned:
  - [ ] Code at `/srv/focus-flow`
  - [ ] Permissions set (750/640)
  - [ ] Git initialized

## Deployment Steps

- [ ] Run production setup:
  ```bash
  sudo /srv/focus-flow/07_system/scripts/production-setup.sh -s
  ```

- [ ] Configure environment:
  - [ ] Backend .env created
  - [ ] Frontend .env created
  - [ ] Telegram bot .env created
  - [ ] API keys added

- [ ] Build services:
  - [ ] Frontend builds successfully
  - [ ] Backend builds successfully
  - [ ] Telegram bot builds successfully

- [ ] Start services:
  - [ ] All containers running
  - [ ] Health checks passing
  - [ ] No error logs

## Verification

- [ ] Backend API:
  - [ ] Health check: http://localhost:3001/health
  - [ ] Summary endpoint: http://localhost:3001/api/summary
  - [ ] Capture works: POST /api/capture

- [ ] Frontend UI:
  - [ ] Loads: http://localhost:5173
  - [ ] All routes accessible
  - [ ] API calls working
  - [ ] PWA installable

- [ ] Telegram Bot:
  - [ ] /start responds
  - [ ] /capture works
  - [ ] /inbox shows data
  - [ ] Voice notes transcribe

- [ ] AI Features:
  - [ ] Classification working
  - [ ] Council validation working
  - [ ] Responses generated

## Post-Deployment

- [ ] Backups configured:
  - [ ] Cron job added
  - [ ] Test backup runs
  - [ ] Test restore works

- [ ] Monitoring set up:
  - [ ] Health checks automated
  - [ ] Log rotation configured
  - [ ] Disk space monitored

- [ ] Documentation reviewed:
  - [ ] Team trained
  - [ ] Runbooks accessible
  - [ ] Support contacts listed

- [ ] Performance verified:
  - [ ] Page loads < 2s
  - [ ] API responses < 100ms
  - [ ] No memory leaks

## Sign-Off

- [ ] All tests passing
- [ ] All services healthy
- [ ] All features functional
- [ ] All documentation complete

**Deployed by:** _______________
**Date:** _______________
**Status:** _______________

## Rollback Plan

If issues occur:

```bash
# Stop all services
docker-compose -f /srv/focus-flow/07_system/config/docker-compose-full.yml down

# Restore from backup
sudo /srv/focus-flow/07_system/scripts/restore.sh [backup-file]

# Restart services
docker-compose -f /srv/focus-flow/07_system/config/docker-compose-full.yml up -d
```

---

**Reference:** See FINAL_COMPLETION_REPORT.md for full details
