# Focus Flow OS - Coolify Deployment Guide

**Version:** 1.0.0
**Last Updated:** February 3, 2026
**Deployment Platform:** Coolify v4.x
**Target Environment:** Production

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Adding Focus Flow to Coolify](#adding-focus-flow-to-coolify)
4. [Environment Variable Configuration](#environment-variable-configuration)
5. [Secrets Management](#secrets-management)
6. [GitHub Webhook Setup](#github-webhook-setup)
7. [Monitoring and Logs](#monitoring-and-logs)
8. [Rollback Procedure](#rollback-procedure)
9. [Scaling Instructions](#scaling-instructions)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Coolify v4.0 or higher** installed and running
- **Docker Engine v20.10+** on the host server
- **GitHub account** with repository access
- **Server Requirements:**
  - Minimum: 2 CPU cores, 4GB RAM, 20GB disk
  - Recommended: 4 CPU cores, 8GB RAM, 50GB SSD
  - OS: Ubuntu 22.04 LTS or Debian 11+

### Required API Keys

Before deployment, obtain the following API keys:

1. **Anthropic API Key**
   - Sign up at https://console.anthropic.com
   - Create a new API key
   - Ensure you have Claude Sonnet 4.5 access

2. **Telegram Bot Token**
   - Chat with [@BotFather](https://t.me/BotFather) on Telegram
   - Create a new bot with `/newbot`
   - Save the bot token provided

3. **Backend API Key** (generate your own)
   - Use a strong random string for internal API authentication
   - Example: `openssl rand -base64 32`

### GitHub Repositories

Ensure you have the following repositories set up:

- `focus-flow-ui` (Frontend)
- `focus-flow-backend` (Backend API)
- `focus-flow-telegram-bot` (Telegram Bot)

Each repository should have:
- A `main` branch for production
- A `Dockerfile` in the root
- A `package.json` with build scripts

---

## Initial Setup

### 1. Access Coolify Dashboard

1. Navigate to your Coolify instance (e.g., `https://coolify.yourdomain.com`)
2. Log in with your admin credentials
3. Navigate to **Projects** → **Create New Project**

### 2. Create Focus Flow Project

```bash
Project Name: Focus Flow OS
Description: Personal productivity system with AI-powered task management
Environment: production
```

### 3. Connect GitHub Account

1. Go to **Settings** → **Source Controls**
2. Click **Add GitHub**
3. Authorize Coolify to access your repositories
4. Select the organization/user containing your Focus Flow repos

---

## Adding Focus Flow to Coolify

### Application 1: Focus Flow Backend (API)

**Deploy this FIRST** as other services depend on it.

#### Step 1: Create Backend Application

1. In your Focus Flow project, click **New Resource**
2. Select **Application** → **Public Repository**
3. Configure:
   ```
   Name: focus-flow-backend
   Repository: github.com/yourusername/focus-flow-backend
   Branch: main
   Build Pack: Dockerfile
   Port: 3001
   ```

#### Step 2: Configure Build Settings

1. Go to **Build** tab
2. Set build configuration:
   ```
   Build Command: docker build -t focus-flow-backend .
   Dockerfile Path: ./Dockerfile
   Build Context: .
   ```

#### Step 3: Set Environment Variables

Go to **Environment Variables** tab and add:

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Vault Path
VAULT_PATH=/vault

# CORS Origins (comma-separated, update with your domains)
CORS_ORIGINS=https://app.yourdomain.com,https://yourdomain.com

# API Keys (set in Secrets - see below)
ANTHROPIC_API_KEY=[Set in Secrets]
TELEGRAM_BOT_TOKEN=[Set in Secrets]
```

#### Step 4: Configure Volumes

1. Go to **Volumes** tab
2. Add persistent storage:
   ```
   Host Path: /srv/focus-flow
   Container Path: /vault
   Mode: Read/Write
   ```
3. Add logs volume:
   ```
   Host Path: /srv/focus-flow/07_system/logs
   Container Path: /app/logs
   Mode: Read/Write
   ```

#### Step 5: Set Resource Limits

1. Go to **Advanced** tab
2. Set resource limits:
   ```
   CPU Limit: 1.0
   CPU Reservation: 0.5
   Memory Limit: 1024M
   Memory Reservation: 512M
   ```

#### Step 6: Configure Health Check

1. In **Health Check** section:
   ```
   Health Check Type: HTTP
   Health Check Path: /health
   Port: 3001
   Interval: 30s
   Timeout: 10s
   Retries: 3
   Start Period: 40s
   ```

#### Step 7: Deploy Backend

1. Click **Deploy** button
2. Monitor deployment logs
3. Wait for "Container started successfully" message
4. Verify health check passes (green indicator)

---

### Application 2: Focus Flow UI (Frontend)

Deploy this SECOND, after the backend is running.

#### Step 1: Create Frontend Application

1. In your Focus Flow project, click **New Resource**
2. Select **Application** → **Public Repository**
3. Configure:
   ```
   Name: focus-flow-ui
   Repository: github.com/yourusername/focus-flow-ui
   Branch: main
   Build Pack: Dockerfile
   Port: 5173
   ```

#### Step 2: Configure Build Settings

1. Go to **Build** tab
2. Set build configuration:
   ```
   Build Command: docker build --build-arg VITE_API_URL=${VITE_API_URL} -t focus-flow-ui .
   Dockerfile Path: ./Dockerfile
   Build Context: .
   ```

#### Step 3: Set Environment Variables

Go to **Environment Variables** tab and add:

```env
# API Configuration (update with your backend URL)
VITE_API_URL=https://api.yourdomain.com/api

# Environment
NODE_ENV=production
```

#### Step 4: Set Resource Limits

```
CPU Limit: 0.5
CPU Reservation: 0.25
Memory Limit: 512M
Memory Reservation: 256M
```

#### Step 5: Configure Health Check

```
Health Check Type: HTTP
Health Check Path: /
Port: 5173
Interval: 30s
Timeout: 10s
Retries: 3
Start Period: 40s
```

#### Step 6: Configure Domain & SSL

1. Go to **Domains** tab
2. Add your domain:
   ```
   Domain: app.yourdomain.com
   ```
3. Enable **SSL/TLS** (Coolify will auto-provision Let's Encrypt)
4. Enable **Force HTTPS**

#### Step 7: Deploy Frontend

1. Click **Deploy** button
2. Monitor deployment logs
3. Verify deployment at your domain

---

### Application 3: Focus Flow Telegram Bot

Deploy this LAST, as it depends on the backend.

#### Step 1: Create Bot Application

1. In your Focus Flow project, click **New Resource**
2. Select **Application** → **Public Repository**
3. Configure:
   ```
   Name: focus-flow-telegram-bot
   Repository: github.com/yourusername/focus-flow-telegram-bot
   Branch: main
   Build Pack: Dockerfile
   Port: 3002 (for webhooks, optional)
   ```

#### Step 2: Set Environment Variables

```env
# Application Configuration
NODE_ENV=production
LOG_LEVEL=info

# Backend API Configuration (use internal Docker network or public URL)
BACKEND_API_URL=http://focus-flow-backend:3001
BACKEND_API_KEY=[Set in Secrets]

# Telegram Configuration
TELEGRAM_BOT_TOKEN=[Set in Secrets]

# AI API Configuration
ANTHROPIC_API_KEY=[Set in Secrets]

# Webhook Configuration (optional for production)
WEBHOOK_URL=https://bot.yourdomain.com
WEBHOOK_PORT=3002
```

#### Step 3: Set Resource Limits

```
CPU Limit: 0.5
CPU Reservation: 0.25
Memory Limit: 512M
Memory Reservation: 256M
```

#### Step 4: Configure Health Check

```
Health Check Type: Command
Command: node -e "process.exit(0)"
Interval: 60s
Timeout: 10s
Retries: 3
Start Period: 30s
```

#### Step 5: Deploy Bot

1. Click **Deploy** button
2. Monitor deployment logs
3. Test bot by sending a message on Telegram

---

## Environment Variable Configuration

### Overview

Environment variables are used to configure applications without hardcoding values. Coolify provides a secure way to manage these variables.

### Variable Types

1. **Public Variables** - Safe to commit to code
   - `PORT`, `NODE_ENV`, `LOG_LEVEL`

2. **Secret Variables** - NEVER commit to code
   - `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `BACKEND_API_KEY`

### Setting Variables in Coolify

#### Method 1: Via UI

1. Go to your application
2. Click **Environment Variables** tab
3. Add variable:
   - Name: `VARIABLE_NAME`
   - Value: `variable_value`
   - Type: **Build & Runtime** (for most vars) or **Build Only** / **Runtime Only**
4. Click **Save**
5. **Redeploy** the application for changes to take effect

#### Method 2: Via Bulk Import

1. Click **Bulk Edit** in Environment Variables tab
2. Paste variables in `.env` format:
   ```env
   PORT=3001
   NODE_ENV=production
   VAULT_PATH=/vault
   ```
3. Click **Save**
4. Redeploy

### Required Variables by Application

#### Backend API

| Variable | Type | Required | Example Value |
|----------|------|----------|---------------|
| `PORT` | Public | Yes | `3001` |
| `NODE_ENV` | Public | Yes | `production` |
| `VAULT_PATH` | Public | Yes | `/vault` |
| `CORS_ORIGINS` | Public | Yes | `https://app.yourdomain.com` |
| `ANTHROPIC_API_KEY` | Secret | Yes | `sk-ant-...` |
| `TELEGRAM_BOT_TOKEN` | Secret | No | `123456:ABC-DEF...` |

#### Frontend UI

| Variable | Type | Required | Example Value |
|----------|------|----------|---------------|
| `VITE_API_URL` | Public | Yes | `https://api.yourdomain.com/api` |
| `NODE_ENV` | Public | Yes | `production` |

#### Telegram Bot

| Variable | Type | Required | Example Value |
|----------|------|----------|---------------|
| `TELEGRAM_BOT_TOKEN` | Secret | Yes | `123456:ABC-DEF...` |
| `BACKEND_API_URL` | Public | Yes | `http://focus-flow-backend:3001` |
| `BACKEND_API_KEY` | Secret | Yes | `your-random-key-here` |
| `ANTHROPIC_API_KEY` | Secret | Yes | `sk-ant-...` |
| `NODE_ENV` | Public | Yes | `production` |
| `LOG_LEVEL` | Public | No | `info` |
| `WEBHOOK_URL` | Public | No | `https://bot.yourdomain.com` |
| `WEBHOOK_PORT` | Public | No | `3002` |

---

## Secrets Management

### Why Secrets Management Matters

- **Security**: Prevents API keys from being exposed in code or logs
- **Compliance**: Meets security best practices
- **Flexibility**: Easy to rotate keys without code changes

### Using Coolify Secrets

#### Step 1: Navigate to Secrets

1. Go to your **Project** (Focus Flow OS)
2. Click **Secrets** in the sidebar
3. Click **Add New Secret**

#### Step 2: Add Secrets

Add each secret with the following configuration:

**Secret 1: Anthropic API Key**
```
Name: ANTHROPIC_API_KEY
Value: sk-ant-api03-[your-key-here]
Description: Anthropic Claude API key for AI features
```

**Secret 2: Telegram Bot Token**
```
Name: TELEGRAM_BOT_TOKEN
Value: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
Description: Telegram Bot API token from @BotFather
```

**Secret 3: Backend API Key**
```
Name: BACKEND_API_KEY
Value: [generate-strong-random-string]
Description: Internal API key for bot-to-backend authentication
```

#### Step 3: Reference Secrets in Applications

In your application's environment variables, reference the secret:

```env
# Instead of hardcoding the value
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}

# Coolify will inject the secret value at runtime
```

#### Step 4: Rotate Secrets (Best Practice)

**When to rotate:**
- Every 90 days (recommended)
- When a team member leaves
- If you suspect a key has been compromised

**How to rotate:**
1. Generate a new API key from the service provider
2. Update the secret in Coolify Secrets
3. Redeploy affected applications
4. Verify applications work with new key
5. Revoke old key from service provider

---

## GitHub Webhook Setup

Webhooks enable automatic deployments when you push code to GitHub.

### Step 1: Get Coolify Webhook URL

1. Go to your application in Coolify
2. Click **Webhooks** tab
3. Copy the **GitHub Webhook URL**
   - Example: `https://coolify.yourdomain.com/webhooks/github/abc123`

### Step 2: Add Webhook to GitHub

For each repository (UI, Backend, Bot):

1. Go to GitHub repository
2. Click **Settings** → **Webhooks**
3. Click **Add webhook**
4. Configure:
   ```
   Payload URL: [Paste Coolify webhook URL]
   Content type: application/json
   Secret: [Leave empty or set in Coolify]
   SSL verification: Enable SSL verification
   Which events: Just the push event
   Active: ✓ Checked
   ```
5. Click **Add webhook**

### Step 3: Test Webhook

1. Make a small change to your code
2. Commit and push to `main` branch:
   ```bash
   git add .
   git commit -m "Test auto-deploy"
   git push origin main
   ```
3. Watch Coolify dashboard for automatic deployment

### Step 4: Configure Branch Protection (Optional)

Protect your `main` branch to prevent accidental deployments:

1. GitHub → Settings → Branches
2. Add rule for `main` branch:
   ```
   ✓ Require pull request reviews before merging
   ✓ Require status checks to pass before merging
   ✓ Require branches to be up to date before merging
   ```

---

## Monitoring and Logs

### Application Logs

#### Viewing Logs in Real-Time

1. Go to your application in Coolify
2. Click **Logs** tab
3. Select log type:
   - **Build logs** - Compilation and Docker build output
   - **Runtime logs** - Application console output
4. Use **Follow** toggle to stream live logs

#### Log Retention Settings

Default log rotation (as configured in `coolify.yaml`):

- **Frontend**: 10MB max per file, 3 files (30MB total)
- **Backend**: 50MB max per file, 5 files (250MB total)
- **Bot**: 20MB max per file, 3 files (60MB total)

#### Downloading Logs

```bash
# SSH into Coolify server
ssh user@coolify-server

# View container logs
docker logs focus-flow-backend --tail 100

# Export logs to file
docker logs focus-flow-backend > backend-logs.txt

# Download via SCP
scp user@coolify-server:backend-logs.txt ./
```

### Application Monitoring

#### Health Check Dashboard

Coolify provides built-in health check monitoring:

1. Go to **Project Dashboard**
2. View status indicators:
   - 🟢 Green: Healthy
   - 🟡 Yellow: Degraded
   - 🔴 Red: Down
3. Click application for detailed health history

#### Metrics to Monitor

**Backend API:**
- Response time (target: < 200ms for most endpoints)
- Error rate (target: < 1%)
- Memory usage (alert if > 80%)
- CPU usage (alert if sustained > 70%)

**Frontend:**
- Page load time (target: < 2s)
- Static asset delivery (should be fast via nginx)

**Telegram Bot:**
- Message processing latency
- Bot uptime
- Webhook success rate

#### Setting Up Alerts

1. Go to **Settings** → **Notifications**
2. Add notification channel:
   - **Email**: Enter admin email
   - **Slack**: Add webhook URL
   - **Discord**: Add webhook URL
3. Configure alert rules:
   ```
   Health check fails: 3 consecutive failures
   Deployment fails: immediate alert
   Resource limit reached: CPU > 90% or Memory > 90%
   ```

### External Monitoring (Optional)

For production, consider adding external monitoring:

**UptimeRobot** - Free tier for basic uptime monitoring
```
1. Sign up at uptimerobot.com
2. Add monitors:
   - Frontend: https://app.yourdomain.com
   - Backend API: https://api.yourdomain.com/health
3. Configure alert contacts
```

**Sentry** - Application error tracking
```javascript
// Add to frontend and backend
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: "production",
});
```

---

## Rollback Procedure

### When to Rollback

- Critical bug in production
- Deployment breaks functionality
- Performance degradation
- Security vulnerability introduced

### Rollback Methods

#### Method 1: Redeploy Previous Version (Recommended)

1. Go to application in Coolify
2. Click **Deployments** tab
3. View deployment history
4. Find last working deployment
5. Click **Redeploy** button
6. Monitor deployment logs
7. Verify application health

**Timeline:** 2-5 minutes

#### Method 2: Git Revert & Auto-Deploy

If auto-deploy is enabled:

```bash
# Find the commit hash of the last working version
git log --oneline

# Revert to previous commit
git revert HEAD --no-edit

# Push to trigger auto-deploy
git push origin main
```

**Timeline:** 3-7 minutes (includes build time)

#### Method 3: Manual Git Rollback

```bash
# Identify bad commit
git log --oneline

# Create a revert commit
git revert <bad-commit-hash>

# Or hard reset (destructive, use with caution)
git reset --hard <good-commit-hash>
git push --force origin main  # Triggers rebuild
```

**Timeline:** 3-7 minutes

#### Method 4: Container Rollback

If code didn't change but configuration did:

1. Go to **Environment Variables**
2. Click **History**
3. Select previous configuration
4. Click **Restore**
5. Redeploy application

**Timeline:** 2-4 minutes

### Rollback Checklist

Before rolling back:

- [ ] Identify the issue (logs, errors, metrics)
- [ ] Notify team/users of rollback
- [ ] Document the reason for rollback
- [ ] Identify last known good version
- [ ] Create ticket to fix issue properly

During rollback:

- [ ] Execute rollback procedure
- [ ] Monitor deployment logs
- [ ] Verify health checks pass
- [ ] Test critical functionality
- [ ] Check all applications still communicate

After rollback:

- [ ] Notify team/users that service is restored
- [ ] Post-mortem: What went wrong?
- [ ] Create fix in development branch
- [ ] Test fix thoroughly before re-deploying
- [ ] Update deployment procedures if needed

---

## Scaling Instructions

### Horizontal Scaling (Multiple Instances)

#### When to Scale Horizontally

- High traffic volume (> 1000 requests/min)
- Need for high availability (99.9% uptime)
- Geographic distribution (users worldwide)

#### Scaling Backend API

1. Go to **focus-flow-backend** application
2. Click **Scale** tab
3. Increase replicas:
   ```
   Replicas: 3
   Strategy: Rolling update
   ```
4. Configure load balancer:
   ```
   Load Balancer: Round Robin
   Sticky Sessions: Disabled (stateless API)
   Health Check: /health endpoint
   ```
5. Click **Apply Changes**

**Note:** The backend is stateless (data in vault), so horizontal scaling is straightforward.

#### Scaling Frontend

1. Frontend is static files served by nginx
2. Use CDN for scaling instead:
   - Cloudflare (free tier available)
   - AWS CloudFront
   - Vercel Edge Network

#### Scaling Telegram Bot

**Do NOT horizontally scale the bot** - Telegram bots can only have one webhook endpoint. Instead:

- Increase resource limits (see vertical scaling)
- Optimize message processing
- Use queue for heavy processing

### Vertical Scaling (More Resources)

#### When to Scale Vertically

- Application hitting CPU/memory limits
- Response time degrading
- Before horizontal scaling (try vertical first)

#### Scaling Backend Resources

1. Go to **focus-flow-backend** → **Advanced**
2. Update resource limits:
   ```
   Current:
   CPU Limit: 1.0
   Memory Limit: 1024M

   Scaled:
   CPU Limit: 2.0
   Memory Limit: 2048M
   ```
3. Click **Save**
4. Redeploy application

#### Scaling Frontend Resources

Frontend is lightweight, rarely needs scaling. If needed:

```
Current:
CPU Limit: 0.5
Memory Limit: 512M

Scaled:
CPU Limit: 1.0
Memory Limit: 1024M
```

#### Scaling Bot Resources

```
Current:
CPU Limit: 0.5
Memory Limit: 512M

Scaled:
CPU Limit: 1.0
Memory Limit: 1024M
```

### Auto-Scaling (Advanced)

Coolify supports Docker Swarm for auto-scaling:

1. Convert to Docker Swarm mode
2. Configure auto-scaling rules:
   ```yaml
   deploy:
     replicas: 2
     update_config:
       parallelism: 1
       delay: 10s
     restart_policy:
       condition: on-failure
     resources:
       limits:
         cpus: '1.0'
         memory: 1024M
   ```
3. Apply configuration

### Database Scaling (Future)

If you add a database later (PostgreSQL, Redis):

**Vertical Scaling:**
- Increase CPU/RAM for database container

**Horizontal Scaling:**
- Set up read replicas
- Implement connection pooling (PgBouncer)
- Use Redis cluster for caching

---

## Troubleshooting

### Common Issues

#### Issue 1: Build Fails

**Symptoms:**
- Deployment stuck at "Building"
- Error in build logs
- Exit code 1 or 137

**Possible Causes:**
- Missing dependencies in `package.json`
- Docker build error
- Out of memory during build
- Network issues pulling base image

**Solutions:**

```bash
# Check build logs
1. Coolify → Application → Logs → Build Logs

# Common fixes:
# 1. Clear build cache
Coolify → Application → Advanced → Clear Build Cache

# 2. Increase build resources
Coolify → Application → Advanced → Build Resources
  Build CPU: 2.0
  Build Memory: 2048M

# 3. Fix package.json issues
# Ensure all dependencies are listed
npm install --save missing-package

# 4. Test Docker build locally
cd /srv/focus-flow/02_projects/active/focus-flow-backend
docker build -t test-build .
```

#### Issue 2: Container Crashes Immediately

**Symptoms:**
- Container starts then immediately stops
- Health check fails
- "Container exited with code 1"

**Possible Causes:**
- Missing environment variables
- Port conflict
- Application startup error
- Missing dependencies

**Solutions:**

```bash
# Check runtime logs
Coolify → Application → Logs → Runtime Logs

# Verify environment variables
Coolify → Application → Environment Variables
  Check all required variables are set

# Test locally
docker run -it focus-flow-backend sh
node dist/index.js
# Look for error messages

# Check port conflicts
docker ps | grep 3001
# Kill conflicting container if needed

# Verify health check endpoint
curl http://localhost:3001/health
```

#### Issue 3: Health Check Failing

**Symptoms:**
- Container running but marked unhealthy
- Red status indicator in Coolify
- Auto-restart loop

**Possible Causes:**
- Health check endpoint not responding
- Wrong health check path
- Application not listening on expected port
- Timeout too short

**Solutions:**

```bash
# Test health check manually
docker exec -it focus-flow-backend sh
wget -O- http://localhost:3001/health

# Adjust health check settings
Coolify → Application → Health Check
  Interval: 30s → 60s (give more time)
  Timeout: 10s → 30s
  Start Period: 40s → 120s (for slow startup)
  Retries: 3 → 5

# Check if application is listening
docker exec -it focus-flow-backend netstat -tulpn | grep 3001
```

#### Issue 4: Frontend Can't Connect to Backend

**Symptoms:**
- 404 or 500 errors in browser console
- "Failed to fetch" errors
- CORS errors

**Possible Causes:**
- Wrong `VITE_API_URL` value
- Backend not accessible from frontend
- CORS not configured
- Network isolation

**Solutions:**

```bash
# 1. Verify VITE_API_URL
Coolify → focus-flow-ui → Environment Variables
  VITE_API_URL should match backend public URL

# 2. Test backend accessibility
curl https://api.yourdomain.com/health
# Should return: {"status":"healthy"}

# 3. Check CORS settings
Coolify → focus-flow-backend → Environment Variables
  CORS_ORIGINS=https://app.yourdomain.com
  # Must include your frontend domain

# 4. Verify network connectivity
docker network inspect focus-flow-network
# Ensure both containers are on same network

# 5. Check browser console
# Open DevTools → Console
# Look for specific error messages
# Check Network tab for failed requests
```

#### Issue 5: Telegram Bot Not Responding

**Symptoms:**
- Bot online but doesn't reply
- Messages not triggering actions
- No logs in container

**Possible Causes:**
- Invalid bot token
- Backend API unreachable
- Webhook not configured
- Network issues

**Solutions:**

```bash
# 1. Verify bot token
curl https://api.telegram.org/bot<TOKEN>/getMe
# Should return bot info

# 2. Check bot logs
Coolify → focus-flow-telegram-bot → Logs
# Look for connection errors

# 3. Test backend connectivity from bot
docker exec -it focus-flow-telegram-bot sh
wget -O- http://focus-flow-backend:3001/health

# 4. Verify webhook (if using webhooks)
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
# Should show your webhook URL

# 5. Delete and reset webhook
curl https://api.telegram.org/bot<TOKEN>/deleteWebhook
# Then redeploy bot container
```

#### Issue 6: Slow Performance

**Symptoms:**
- API response time > 1s
- Frontend loading slowly
- High CPU/memory usage

**Possible Causes:**
- Resource limits too low
- Large vault files
- Inefficient queries
- No caching

**Solutions:**

```bash
# 1. Check resource usage
Coolify → Application → Metrics
# Look for CPU/memory hitting limits

# 2. Increase resource limits
Coolify → Application → Advanced
  CPU Limit: 1.0 → 2.0
  Memory Limit: 1024M → 2048M

# 3. Optimize vault storage
# Archive old inbox items
cd /srv/focus-flow/00_inbox/raw
# Move old files to archive
mkdir -p ../archive/$(date +%Y-%m)
mv $(find . -mtime +30 -type f) ../archive/$(date +%Y-%m)/

# 4. Add caching (future enhancement)
# Implement Redis for frequently accessed data

# 5. Profile application
# Add timing logs to identify slow endpoints
console.time('api-call');
// ... code ...
console.timeEnd('api-call');
```

#### Issue 7: Auto-Deploy Not Working

**Symptoms:**
- Push to GitHub but no deployment
- Webhook shows error
- Manual deploy works but auto doesn't

**Possible Causes:**
- Webhook not configured
- Wrong branch filter
- Coolify webhook URL changed
- GitHub webhook delivery failed

**Solutions:**

```bash
# 1. Verify webhook in GitHub
GitHub → Repo → Settings → Webhooks
# Check Recent Deliveries for errors

# 2. Re-configure webhook
Coolify → Application → Webhooks → Copy URL
GitHub → Edit webhook → Update Payload URL

# 3. Check branch filter
Coolify → Application → Git
  Branch: main (must match push branch)

# 4. Test webhook manually
# GitHub → Webhooks → Redeliver
# Check Coolify logs for response

# 5. Verify webhook secret
# If using secret, ensure it matches in both places
```

#### Issue 8: Secrets Not Loading

**Symptoms:**
- Application error: "API key not found"
- Environment variable shows as undefined
- Authentication fails

**Possible Causes:**
- Secret name mismatch
- Secret not assigned to application
- Typo in variable name

**Solutions:**

```bash
# 1. Check secret exists
Coolify → Project → Secrets
# Verify secret name exactly matches variable name

# 2. Verify variable reference
Coolify → Application → Environment Variables
  ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
  # Must use ${} syntax

# 3. Check secret scope
# Secret must be in same project as application

# 4. Redeploy after adding secrets
# Secrets are injected at container start time

# 5. Test secret value
docker exec -it focus-flow-backend env | grep ANTHROPIC
# Should show value (be careful with sensitive data)
```

### Getting Help

#### Support Channels

1. **Coolify Documentation**
   - https://coolify.io/docs

2. **Coolify Discord**
   - https://coolify.io/discord
   - Active community for troubleshooting

3. **GitHub Issues**
   - https://github.com/coollabsio/coolify/issues
   - Search for similar issues

4. **Focus Flow OS Logs**
   - `/srv/focus-flow/07_system/logs/`
   - Check application-specific logs

#### Creating a Support Request

Include the following information:

```
**Environment:**
- Coolify Version: [e.g., 4.0.0]
- Server OS: [e.g., Ubuntu 22.04]
- Docker Version: [e.g., 24.0.5]

**Application:**
- App Name: [e.g., focus-flow-backend]
- Error Type: [e.g., Build failure, Runtime error]

**Error Details:**
- Error Message: [paste exact error]
- Steps to Reproduce: [numbered steps]
- Expected Behavior: [what should happen]
- Actual Behavior: [what actually happens]

**Logs:**
[Paste relevant logs from Coolify]

**Configuration:**
[Paste relevant parts of coolify.yaml]
```

---

## Best Practices

### Security

1. **Never commit secrets** to Git repositories
2. **Rotate API keys** every 90 days
3. **Enable SSL/TLS** for all public endpoints
4. **Use strong passwords** for Coolify admin
5. **Regular backups** of `/srv/focus-flow` vault
6. **Limit access** to Coolify dashboard (VPN or IP whitelist)
7. **Enable 2FA** on GitHub account
8. **Monitor logs** for suspicious activity

### Performance

1. **Use CDN** for frontend static assets
2. **Enable compression** (gzip/brotli)
3. **Monitor resource usage** weekly
4. **Archive old data** monthly
5. **Optimize Docker images** (multi-stage builds)
6. **Use caching** where appropriate
7. **Scale proactively** before hitting limits

### Operations

1. **Tag releases** in Git for easy rollback
2. **Test in staging** before production deploy
3. **Monitor deployments** in real-time
4. **Document changes** in commit messages
5. **Keep dependencies updated** (weekly check)
6. **Regular backups** (daily automated)
7. **Disaster recovery plan** documented

### Deployment Workflow

Recommended workflow for production changes:

```
1. Development → Local testing
2. Commit to feature branch
3. Create Pull Request
4. Code review + approval
5. Merge to main branch
6. Auto-deploy to production
7. Monitor deployment
8. Verify functionality
9. Monitor for 24 hours
```

---

## Maintenance Schedule

### Daily Tasks

- [ ] Check application health status
- [ ] Review error logs
- [ ] Verify all services running

### Weekly Tasks

- [ ] Review resource usage metrics
- [ ] Check for dependency updates
- [ ] Archive processed inbox items
- [ ] Review deployment logs

### Monthly Tasks

- [ ] Rotate API keys (every 90 days, check)
- [ ] Update dependencies (`npm audit fix`)
- [ ] Clean up old Docker images
- [ ] Review disk space usage
- [ ] Test rollback procedure
- [ ] Update documentation

### Quarterly Tasks

- [ ] Full security audit
- [ ] Backup verification (restore test)
- [ ] Performance optimization review
- [ ] Update Coolify to latest version
- [ ] Review and update resource limits
- [ ] Disaster recovery drill

---

## Conclusion

This guide covers the complete deployment and operation of Focus Flow OS on Coolify. By following these instructions, you should have:

- ✅ All three applications deployed and running
- ✅ Auto-deploy configured for continuous delivery
- ✅ Monitoring and logging set up
- ✅ Rollback procedures in place
- ✅ Troubleshooting knowledge for common issues

### Quick Reference Commands

```bash
# View application logs
docker logs focus-flow-backend --tail 100 --follow

# Restart application
docker restart focus-flow-backend

# Check resource usage
docker stats focus-flow-backend

# Access container shell
docker exec -it focus-flow-backend sh

# Test health endpoints
curl http://localhost:3001/health
curl http://localhost:5173

# View vault contents
ls -la /srv/focus-flow/00_inbox/raw/
```

### Next Steps

1. **Initial Deployment**: Follow sections 1-6 to deploy all applications
2. **Configuration**: Set up environment variables and secrets
3. **Monitoring**: Configure alerts and log into monitoring daily
4. **Testing**: Verify all functionality works in production
5. **Documentation**: Keep this guide updated with your specific configurations

---

**Document Version:** 1.0.0
**Last Updated:** 2026-02-03
**Maintained By:** Focus Flow OS Team
**Contact:** [your-contact-info]

**Next Review Date:** 2026-03-03

---

## Appendix: Configuration Files

### A. Sample .env Files

#### Backend `.env`
```env
PORT=3001
NODE_ENV=production
VAULT_PATH=/vault
CORS_ORIGINS=https://app.yourdomain.com
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
TELEGRAM_BOT_TOKEN=123456:ABC-DEF
```

#### Frontend `.env`
```env
VITE_API_URL=https://api.yourdomain.com/api
NODE_ENV=production
```

#### Bot `.env`
```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF
BACKEND_API_URL=http://focus-flow-backend:3001
BACKEND_API_KEY=your-random-key
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
NODE_ENV=production
LOG_LEVEL=info
```

### B. Nginx Configuration (for Frontend)

Located at `/srv/focus-flow/02_projects/active/focus-flow-ui/nginx.conf`:

```nginx
server {
  listen 5173;
  root /usr/share/nginx/html;
  index index.html;

  # Gzip compression
  gzip on;
  gzip_vary on;
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

  # SPA routing
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Cache static assets
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # Security headers
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;
}
```

### C. Docker Network Commands

```bash
# Create network (if needed manually)
docker network create focus-flow-network

# List networks
docker network ls

# Inspect network
docker network inspect focus-flow-network

# Connect container to network
docker network connect focus-flow-network focus-flow-backend

# Disconnect container
docker network disconnect focus-flow-network focus-flow-backend
```

### D. Backup Script

Create `/srv/focus-flow/07_system/scripts/backup.sh`:

```bash
#!/bin/bash
# Focus Flow OS Backup Script
# Usage: ./backup.sh

BACKUP_DIR="/srv/focus-flow-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
VAULT_DIR="/srv/focus-flow"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup vault
tar -czf "$BACKUP_DIR/vault_$TIMESTAMP.tar.gz" \
  --exclude='node_modules' \
  --exclude='.git' \
  "$VAULT_DIR"

# Keep only last 7 backups
cd "$BACKUP_DIR"
ls -t vault_*.tar.gz | tail -n +8 | xargs -r rm

echo "Backup complete: vault_$TIMESTAMP.tar.gz"
```

Make executable:
```bash
chmod +x /srv/focus-flow/07_system/scripts/backup.sh
```

Add to cron for daily backups:
```bash
# Edit crontab
crontab -e

# Add line (runs daily at 2 AM)
0 2 * * * /srv/focus-flow/07_system/scripts/backup.sh
```

---

**End of Deployment Guide**
