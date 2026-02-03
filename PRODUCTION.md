# Focus Flow OS - Production Documentation

**Version:** 1.0.0
**Last Updated:** 2026-02-03
**Status:** Production Ready

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Deployment](#deployment)
6. [Monitoring](#monitoring)
7. [Backup & Recovery](#backup--recovery)
8. [Security](#security)
9. [Troubleshooting](#troubleshooting)
10. [Scaling](#scaling)
11. [Maintenance](#maintenance)
12. [API Reference](#api-reference)

---

## Architecture Overview

Focus Flow OS is a personal productivity and wellbeing system with autonomous AI capabilities.

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        INPUT LAYER                              │
│  Telegram Bot (Port 3002) • PWA UI (Port 5173) • Voice Input   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     NETWORK LAYER                               │
│  Tailscale VPN • UFW Firewall • Nginx (via Tailscale Serve)   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                             │
│  Backend API (Port 3001) • WebSocket (Real-time Updates)       │
│  Node.js + Express + TypeScript                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  INTELLIGENCE LAYER                             │
│  Claude API • AI Classification • Background Processing        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   SERVICES LAYER                                │
│  OpenClaw (3000) • Qdrant (6333) • mem0 (8050)                │
│  Coolify (8000) • Docker Compose Orchestration                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    STORAGE LAYER                                │
│  Vault (/srv/focus-flow) • Docker Volumes • JSON/CSV Files     │
└─────────────────────────────────────────────────────────────────┘
```

### Components

#### 1. Frontend (PWA)
- **Technology:** React 19 + Vite + TypeScript
- **Styling:** Tailwind CSS 4.1
- **State Management:** Zustand
- **Routing:** React Router 7
- **Port:** 5173 (development), 3008 (production)
- **Location:** `/srv/focus-flow/02_projects/active/focus-flow-ui`

#### 2. Backend API
- **Technology:** Node.js 22 + Express + TypeScript
- **Port:** 3001
- **Purpose:** REST API, file operations, business logic
- **Location:** `/srv/focus-flow/02_projects/active/focus-flow-backend`

#### 3. Telegram Bot
- **Technology:** Telegraf + Node.js + TypeScript
- **Port:** 3002 (webhook mode)
- **Purpose:** Quick capture, notifications, voice transcription
- **Location:** `/srv/focus-flow/02_projects/active/focus-flow-telegram-bot`

#### 4. Docker Services
- **OpenClaw:** AI agent interface (Port 3000)
- **Qdrant:** Vector database (Port 6333)
- **mem0:** Personal memory layer (Port 8050)
- **Coolify:** Deployment platform (Port 8000)

#### 5. Vault Storage
- **Path:** `/srv/focus-flow`
- **Format:** JSON files + CSV logs
- **Structure:** Organized by PARA methodology

---

## Prerequisites

### Hardware Requirements

**Minimum:**
- CPU: 2 cores
- RAM: 4 GB
- Storage: 20 GB SSD
- Network: Stable internet connection

**Recommended:**
- CPU: 4 cores
- RAM: 8 GB
- Storage: 50 GB SSD
- Network: 100 Mbps+

### Software Requirements

**Operating System:**
- Ubuntu 22.04 LTS or newer
- Linux kernel 6.8+

**Required Software:**
```bash
# Node.js 22
node --version  # v22.x.x

# npm
npm --version   # 10.x.x

# Docker
docker --version  # 24.x.x or newer

# Docker Compose
docker compose version  # 2.x.x or newer

# Git
git --version  # 2.x.x or newer
```

**Optional Software:**
```bash
# UFW (firewall)
ufw --version

# Tailscale (VPN)
tailscale version
```

### Network Requirements

**Ports:**
- `3000` - OpenClaw (localhost only)
- `3001` - Backend API (localhost only)
- `3002` - Telegram Bot webhook (localhost only)
- `3008` - Frontend production build (public via Tailscale)
- `4173` - Frontend preview (public via Tailscale)
- `5173` - Frontend development (localhost only)
- `6333` - Qdrant (localhost only)
- `8000` - Coolify (localhost only)
- `8050` - mem0 (localhost only)

**Firewall Rules:**
```bash
# Allow Tailscale
sudo ufw allow in on tailscale0

# Allow SSH from Tailscale network only
sudo ufw allow from 100.64.0.0/10 to any port 22

# Allow frontend ports (if needed publicly)
sudo ufw allow 3008/tcp
sudo ufw allow 4173/tcp

# Enable firewall
sudo ufw enable
```

### Authentication Required

1. **OpenClaw Gateway with Claude Subscription** (required for AI features)
   - Install: `npm install -g openclaw`
   - Generate setup token: `claude setup-token`
   - Initialize OpenClaw: `openclaw setup`
   - Configure auth: `openclaw models auth paste-token --provider anthropic`
   - Uses your Claude subscription
   - Gateway runs on: `http://localhost:18789`
   - **SECURITY:** See `/srv/focus-flow/SECURITY.md` for critical security setup
   - Auth token stored in: `/srv/focus-flow/07_system/secrets/.openclaw.env`

2. **Telegram Bot Token** (optional, for bot features)
   - Get from: @BotFather on Telegram
   - Setup: `/newbot` command

---

## Installation

### Step 1: System Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Tailscale (optional but recommended)
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Install UFW (if not installed)
sudo apt install ufw -y
```

### Step 2: Clone and Setup Vault

```bash
# Create vault directory
sudo mkdir -p /srv/focus-flow
sudo chown -R $USER:$USER /srv/focus-flow

# Navigate to vault
cd /srv/focus-flow

# Initialize vault structure
mkdir -p {00_inbox/{raw,processing,archive},01_tasks/{work,personal,scheduled}}
mkdir -p {02_projects/{active,paused,completed},03_ideas/{inbox,validated,rejected}}
mkdir -p {04_notes,05_events,06_health/logs}
mkdir -p {07_system/{config,secrets,logs,memory,scripts}}
```

### Step 3: Install Backend API

```bash
# Navigate to backend project
cd /srv/focus-flow/02_projects/active/focus-flow-backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file (see Configuration section)
nano .env

# Build TypeScript
npm run build

# Test the server
npm start
```

### Step 4: Install Frontend UI

```bash
# Navigate to frontend project
cd /srv/focus-flow/02_projects/active/focus-flow-ui

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file
nano .env

# Build for production
npm run build

# Preview production build
npm run preview
```

### Step 5: Install Telegram Bot (Optional)

```bash
# Navigate to bot project
cd /srv/focus-flow/02_projects/active/focus-flow-telegram-bot

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file with bot token
nano .env

# Build TypeScript
npm run build

# Test the bot
npm start
```

### Step 6: Setup OpenClaw Gateway

```bash
# Install OpenClaw CLI
npm install -g openclaw

# Generate Claude setup token
claude setup-token
# Copy the generated token

# Initialize OpenClaw
openclaw setup

# Configure Claude authentication
openclaw models auth paste-token --provider anthropic
# Paste the token from previous step

# Verify authentication
openclaw models status
# Expected: ✓ Anthropic: Authenticated (subscription)

# SECURITY CRITICAL: Generate auth token
openssl rand -hex 32 > /tmp/openclaw_token.txt

# Create secure secrets file
mkdir -p /srv/focus-flow/07_system/secrets
echo "OPENCLAW_AUTH_TOKEN=$(cat /tmp/openclaw_token.txt)" > /srv/focus-flow/07_system/secrets/.openclaw.env
chmod 600 /srv/focus-flow/07_system/secrets/.openclaw.env
shred -u /tmp/openclaw_token.txt

# Create OpenClaw security config
cat > ~/.openclaw/config.json <<EOF
{
  "gateway": {
    "port": 18789,
    "host": "127.0.0.1",
    "auth": {
      "required": true
    }
  },
  "logging": {
    "enabled": true,
    "level": "info",
    "audit": true
  },
  "security": {
    "trustLocalhost": false,
    "requireAuth": true,
    "maxRequestSize": "10mb"
  }
}
EOF

# Start OpenClaw Gateway (secure mode)
openclaw gateway --host 127.0.0.1 --port 18789 --require-auth

# Or install as system service
openclaw gateway install --host 127.0.0.1 --require-auth
openclaw gateway start

# Verify gateway is running (localhost only)
netstat -tuln | grep 18789
# Expected: 127.0.0.1:18789 (NOT 0.0.0.0:18789)

# Set up firewall to block external access
sudo ufw deny 18789/tcp
sudo ufw status | grep 18789

# Test health check (should require auth)
curl http://localhost:18789/health
# Expected: 401 Unauthorized (auth required)

# Test with auth token
source /srv/focus-flow/07_system/secrets/.openclaw.env
curl -H "Authorization: Bearer $OPENCLAW_AUTH_TOKEN" http://localhost:18789/health
# Expected: 200 OK
```

**⚠️ CRITICAL SECURITY WARNING:**
Before proceeding, read `/srv/focus-flow/SECURITY.md` for complete security setup and risk assessment.


### Step 7: Setup Docker Services

```bash
# Navigate to config directory
cd /srv/focus-flow/07_system/config

# Pull Docker images
docker compose pull

# Start services
docker compose up -d

# Verify services are running
docker compose ps

# Check health status
docker compose logs
```

---

## Configuration

### Backend API Environment Variables

**File:** `/srv/focus-flow/02_projects/active/focus-flow-backend/.env`

```bash
# Server Configuration
PORT=3001
NODE_ENV=production

# Vault Path
VAULT_PATH=/srv/focus-flow

# OpenClaw Configuration
OPENCLAW_GATEWAY_URL=http://localhost:18789
# OPENCLAW_AUTH_TOKEN is loaded from /srv/focus-flow/07_system/secrets/.openclaw.env

# Security Settings
OPENCLAW_MAX_TOKENS=4000
OPENCLAW_TIMEOUT_MS=60000
OPENCLAW_ENABLE_AUDIT_LOG=true

# Telegram Bot (optional)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...

# CORS Origins (comma-separated)
CORS_ORIGINS=https://focus-flow-new.tail49878c.ts.net,http://localhost:5173

# Logging
LOG_LEVEL=info
```

**Environment Variable Details:**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3001 | Backend server port |
| `NODE_ENV` | No | development | Environment (development/production) |
| `VAULT_PATH` | Yes | /srv/focus-flow | Path to vault storage |
| `OPENCLAW_GATEWAY_URL` | Yes | http://localhost:18789 | OpenClaw Gateway URL (MUST be localhost) |
| `OPENCLAW_AUTH_TOKEN` | Yes | - | Loaded from `/srv/focus-flow/07_system/secrets/.openclaw.env` |
| `OPENCLAW_MAX_TOKENS` | No | 4000 | Maximum tokens per AI request |
| `OPENCLAW_TIMEOUT_MS` | No | 60000 | Request timeout in milliseconds |
| `OPENCLAW_ENABLE_AUDIT_LOG` | No | true | Enable security audit logging |
| `TELEGRAM_BOT_TOKEN` | No | - | Telegram bot token |
| `CORS_ORIGINS` | No | * | Allowed CORS origins |
| `LOG_LEVEL` | No | info | Logging level (debug/info/warn/error) |

**Note:** OpenClaw authentication uses Claude subscription via setup token. Auth token is stored securely in `/srv/focus-flow/07_system/secrets/.openclaw.env` with mode 600 permissions.

### Frontend Environment Variables

**File:** `/srv/focus-flow/02_projects/active/focus-flow-ui/.env`

```bash
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# Feature Flags
VITE_ENABLE_VOICE=true
VITE_ENABLE_OFFLINE=true

# Environment
VITE_ENV=production
```

### Telegram Bot Environment Variables

**File:** `/srv/focus-flow/02_projects/active/focus-flow-telegram-bot/.env`

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...

# Backend API Configuration
BACKEND_API_URL=http://localhost:3001
BACKEND_API_KEY=optional-api-key

# OpenAI API Configuration (for Whisper transcription)
OPENAI_API_KEY=sk-...

# Application Environment
NODE_ENV=production
LOG_LEVEL=info

# Webhook Configuration (for production)
WEBHOOK_URL=https://focus-flow-new.tail49878c.ts.net/telegram
WEBHOOK_PORT=3002
```

**Note:** Telegram bot uses OpenAI for voice transcription, not Anthropic/Claude.

### Docker Compose Configuration

**File:** `/srv/focus-flow/07_system/config/docker-compose.yml`

Key configurations:
- All services bind to `127.0.0.1` (localhost only)
- Health checks run every 30 seconds
- Auto-restart enabled (`unless-stopped`)
- Security hardening enabled (no-new-privileges, capabilities dropped)

---

## Deployment

### Option 1: Manual Deployment (Systemd)

#### Backend API Service

Create `/etc/systemd/system/focus-flow-backend.service`:

```ini
[Unit]
Description=Focus Flow Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/srv/focus-flow/02_projects/active/focus-flow-backend
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable focus-flow-backend
sudo systemctl start focus-flow-backend
sudo systemctl status focus-flow-backend
```

#### Frontend UI Service

Create `/etc/systemd/system/focus-flow-ui.service`:

```ini
[Unit]
Description=Focus Flow UI
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/srv/focus-flow/02_projects/active/focus-flow-ui
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm run preview -- --port 3008 --host
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable focus-flow-ui
sudo systemctl start focus-flow-ui
sudo systemctl status focus-flow-ui
```

#### Telegram Bot Service

Create `/etc/systemd/system/focus-flow-telegram-bot.service`:

```ini
[Unit]
Description=Focus Flow Telegram Bot
After=network.target focus-flow-backend.service

[Service]
Type=simple
User=root
WorkingDirectory=/srv/focus-flow/02_projects/active/focus-flow-telegram-bot
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable focus-flow-telegram-bot
sudo systemctl start focus-flow-telegram-bot
sudo systemctl status focus-flow-telegram-bot
```

### Option 2: Docker Deployment

#### Backend API Dockerfile

Build and run:
```bash
cd /srv/focus-flow/02_projects/active/focus-flow-backend

# Build image
docker build -t focus-flow-backend:latest .

# Run container
docker run -d \
  --name focus-flow-backend \
  -p 127.0.0.1:3001:3001 \
  -v /srv/focus-flow:/srv/focus-flow \
  -e VAULT_PATH=/srv/focus-flow \
  -e ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY} \
  --restart unless-stopped \
  focus-flow-backend:latest
```

#### Frontend UI Dockerfile

Create `Dockerfile` in UI directory:

```dockerfile
# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:
```bash
cd /srv/focus-flow/02_projects/active/focus-flow-ui

# Build image
docker build -t focus-flow-ui:latest .

# Run container
docker run -d \
  --name focus-flow-ui \
  -p 127.0.0.1:3008:80 \
  --restart unless-stopped \
  focus-flow-ui:latest
```

### Option 3: Coolify Deployment

Coolify is already running at `http://localhost:8000`.

1. Access Coolify web interface
2. Create new project "Focus Flow OS"
3. Add three applications:
   - Backend API (Node.js)
   - Frontend UI (Node.js)
   - Telegram Bot (Node.js)
4. Configure environment variables
5. Deploy each application

### Tailscale Serve Configuration

Expose services via Tailscale:

```bash
# Serve frontend on HTTPS
tailscale serve https / http://127.0.0.1:3008

# Serve backend API
tailscale serve https /api http://127.0.0.1:3001

# Check Tailscale serve status
tailscale serve status
```

Access via: `https://focus-flow-new.tail49878c.ts.net`

---

## Monitoring

### Health Checks

#### Backend API Health Check

```bash
# Local health check
curl http://localhost:3001/health

# Expected response:
# {"status":"ok","timestamp":"2026-02-03T..."}
```

#### Frontend Health Check

```bash
# Check if frontend is serving
curl -I http://localhost:3008

# Expected: HTTP/1.1 200 OK
```

#### Docker Services Health Check

```bash
# Check all services
docker compose ps

# Check specific service logs
docker compose logs openclaw
docker compose logs qdrant
docker compose logs mem0
docker compose logs coolify

# Follow logs in real-time
docker compose logs -f
```

### Log Locations

**Backend API Logs:**
```bash
# Systemd service logs
sudo journalctl -u focus-flow-backend -f

# Application logs (if file logging enabled)
tail -f /srv/focus-flow/07_system/logs/backend.log
```

**Frontend UI Logs:**
```bash
# Systemd service logs
sudo journalctl -u focus-flow-ui -f
```

**Telegram Bot Logs:**
```bash
# Systemd service logs
sudo journalctl -u focus-flow-telegram-bot -f
```

**Docker Service Logs:**
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f openclaw
```

**System Logs:**
- Autonomous execution summaries: `/srv/focus-flow/07_system/logs/`
- Health metrics: `/srv/focus-flow/06_health/logs/`

### Performance Metrics

**System Resource Monitoring:**

```bash
# CPU and memory usage
htop

# Docker container stats
docker stats

# Disk usage
df -h /srv/focus-flow
du -sh /srv/focus-flow/*
```

**API Performance:**

```bash
# Test API response time
time curl http://localhost:3001/health

# Load testing with Apache Bench
ab -n 1000 -c 10 http://localhost:3001/api/summary
```

### Monitoring Tools Setup

**Prometheus + Grafana (Optional):**

Add to `docker-compose.yml`:

```yaml
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "127.0.0.1:9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "127.0.0.1:3100:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    restart: unless-stopped
```

---

## Backup & Recovery

### Backup Strategy

#### 1. Vault Backup (Daily)

**Automated Backup Script:**

Create `/srv/focus-flow/07_system/scripts/backup-vault.sh`:

```bash
#!/bin/bash

# Configuration
VAULT_PATH="/srv/focus-flow"
BACKUP_DIR="/srv/backups/focus-flow"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="focus-flow-vault-${DATE}.tar.gz"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Create compressed backup
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}" \
  --exclude="${VAULT_PATH}/02_projects/*/node_modules" \
  --exclude="${VAULT_PATH}/07_system/logs/*.md" \
  "${VAULT_PATH}"

# Remove old backups
find "${BACKUP_DIR}" -name "focus-flow-vault-*.tar.gz" -mtime +${RETENTION_DAYS} -delete

# Log backup
echo "$(date): Backup created: ${BACKUP_NAME}" >> "${VAULT_PATH}/07_system/logs/backup.log"
```

**Setup Cron Job:**

```bash
# Make script executable
chmod +x /srv/focus-flow/07_system/scripts/backup-vault.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /srv/focus-flow/07_system/scripts/backup-vault.sh") | crontab -
```

#### 2. Docker Volumes Backup

```bash
# Backup Qdrant data
docker run --rm \
  -v qdrant-data:/data \
  -v /srv/backups:/backup \
  alpine tar czf /backup/qdrant-$(date +%Y%m%d).tar.gz /data

# Backup mem0 data
docker run --rm \
  -v mem0-data:/data \
  -v /srv/backups:/backup \
  alpine tar czf /backup/mem0-$(date +%Y%m%d).tar.gz /data
```

#### 3. Database Export (if using PostgreSQL later)

```bash
# PostgreSQL backup
docker exec postgres pg_dump -U focus_flow > /srv/backups/focus-flow-db-$(date +%Y%m%d).sql
```

### Restore Procedures

#### Restore Vault from Backup

```bash
# Stop all services
sudo systemctl stop focus-flow-backend
sudo systemctl stop focus-flow-ui
sudo systemctl stop focus-flow-telegram-bot
cd /srv/focus-flow/07_system/config && docker compose down

# Restore backup
BACKUP_FILE="/srv/backups/focus-flow/focus-flow-vault-20260203_020000.tar.gz"
tar -xzf "${BACKUP_FILE}" -C /

# Verify permissions
sudo chown -R $USER:$USER /srv/focus-flow

# Restart services
sudo systemctl start focus-flow-backend
sudo systemctl start focus-flow-ui
sudo systemctl start focus-flow-telegram-bot
cd /srv/focus-flow/07_system/config && docker compose up -d
```

#### Restore Docker Volumes

```bash
# Restore Qdrant
docker run --rm \
  -v qdrant-data:/data \
  -v /srv/backups:/backup \
  alpine tar xzf /backup/qdrant-20260203.tar.gz -C /

# Restart Qdrant
docker compose restart qdrant
```

### Disaster Recovery Plan

**Priority 1: Critical Data (Vault)**
- Backup frequency: Daily
- Retention: 30 days
- Storage: Local + offsite

**Priority 2: Docker Volumes**
- Backup frequency: Weekly
- Retention: 14 days
- Storage: Local

**Priority 3: Configuration**
- Backup frequency: After each change
- Retention: Indefinite
- Storage: Version control (Git)

**Recovery Time Objective (RTO):** 4 hours
**Recovery Point Objective (RPO):** 24 hours

---

## Security

### Firewall Configuration

**UFW Rules:**

```bash
# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow Tailscale
sudo ufw allow in on tailscale0

# Allow SSH from Tailscale network only
sudo ufw allow from 100.64.0.0/10 to any port 22

# Allow frontend access (if needed publicly)
sudo ufw allow 3008/tcp
sudo ufw allow 4173/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

### Secrets Management

**Best Practices:**

1. **Never commit secrets to Git:**
   ```bash
   # .gitignore includes:
   .env
   .env.*
   *.key
   *.pem
   secrets/
   ```

2. **Use environment variables:**
   ```bash
   # Store in .env files
   # Reference in code: process.env.VARIABLE_NAME
   ```

3. **Secure file permissions:**
   ```bash
   # Secrets directory
   chmod 700 /srv/focus-flow/07_system/secrets

   # Secret files
   chmod 600 /srv/focus-flow/07_system/secrets/*
   ```

4. **Use Docker secrets for containers:**
   ```yaml
   secrets:
     anthropic_api_key:
       file: /srv/focus-flow/07_system/secrets/anthropic_api_key.txt
   ```

### SSL/TLS Configuration

**Tailscale HTTPS (Automatic):**

Tailscale automatically provides HTTPS with valid certificates:
- Certificate management: Automatic
- Renewal: Automatic
- No manual configuration needed

**Custom Domain SSL (Optional):**

If using a custom domain with Nginx:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal (already configured)
sudo systemctl status certbot.timer
```

### Tailscale Security

**Access Control Lists (ACLs):**

Configure in Tailscale admin console:

```json
{
  "acls": [
    {
      "action": "accept",
      "src": ["tag:admin"],
      "dst": ["tag:focus-flow:*"]
    },
    {
      "action": "accept",
      "src": ["tag:user"],
      "dst": ["tag:focus-flow:3008"]
    }
  ]
}
```

**MagicDNS:**
- Enabled: Automatic device name resolution
- Format: `focus-flow-new.tail49878c.ts.net`

### API Security

**Authentication (Future):**

Implement JWT or API key authentication:

```typescript
// Example middleware
const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
```

**Rate Limiting:**

```bash
# Install express-rate-limit
npm install express-rate-limit

# Apply to routes
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### Docker Security

**Security Hardening:**

Already implemented in docker-compose.yml:
- `security_opt: no-new-privileges:true`
- `cap_drop: ALL`
- `read_only: true` (where possible)
- Non-root user (where possible)
- Minimal base images (Alpine)

### Regular Security Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js dependencies
cd /srv/focus-flow/02_projects/active/focus-flow-backend
npm audit
npm audit fix

# Update Docker images
cd /srv/focus-flow/07_system/config
docker compose pull
docker compose up -d
```

---

## Troubleshooting

### Common Issues

#### 1. Backend API Won't Start

**Symptoms:** Service fails to start, port already in use

**Solutions:**

```bash
# Check if port 3001 is in use
sudo lsof -i :3001

# Kill process using the port
sudo kill -9 $(sudo lsof -t -i :3001)

# Check service logs
sudo journalctl -u focus-flow-backend -n 50

# Verify environment variables
cat /srv/focus-flow/02_projects/active/focus-flow-backend/.env

# Test manually
cd /srv/focus-flow/02_projects/active/focus-flow-backend
npm run dev
```

#### 2. Frontend Not Loading

**Symptoms:** Blank page, 404 errors, CORS errors

**Solutions:**

```bash
# Check if service is running
curl -I http://localhost:3008

# Verify build exists
ls -la /srv/focus-flow/02_projects/active/focus-flow-ui/dist

# Rebuild
cd /srv/focus-flow/02_projects/active/focus-flow-ui
npm run build

# Check CORS configuration in backend
# Ensure CORS_ORIGINS includes frontend URL
```

#### 3. Telegram Bot Not Responding

**Symptoms:** Bot doesn't respond to commands

**Solutions:**

```bash
# Check bot service
sudo systemctl status focus-flow-telegram-bot

# Verify bot token
# Test token: https://api.telegram.org/bot<TOKEN>/getMe

# Check backend API connection
curl http://localhost:3001/health

# View bot logs
sudo journalctl -u focus-flow-telegram-bot -f
```

#### 4. Docker Services Unhealthy

**Symptoms:** `docker compose ps` shows unhealthy status

**Solutions:**

```bash
# Check service logs
docker compose logs openclaw
docker compose logs qdrant
docker compose logs mem0

# Restart specific service
docker compose restart openclaw

# Verify health check endpoint
curl http://localhost:3000/health
curl http://localhost:6333/health
curl http://localhost:8050/health

# Check Docker resources
docker stats
```

#### 5. Vault Permission Issues

**Symptoms:** Cannot read/write files in vault

**Solutions:**

```bash
# Fix ownership
sudo chown -R $USER:$USER /srv/focus-flow

# Fix permissions
sudo chmod -R 755 /srv/focus-flow
sudo chmod 700 /srv/focus-flow/07_system/secrets
sudo chmod 600 /srv/focus-flow/07_system/secrets/*

# Verify
ls -la /srv/focus-flow
```

#### 6. High Memory Usage

**Symptoms:** System slowing down, OOM errors

**Solutions:**

```bash
# Check memory usage
free -h
docker stats

# Restart services to free memory
sudo systemctl restart focus-flow-backend
docker compose restart

# Check for memory leaks in logs
sudo journalctl -u focus-flow-backend | grep -i "memory\|heap"

# Increase swap if needed
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 7. AI Classification Not Working

**Symptoms:** Inbox items not auto-classified

**Solutions:**

```bash
# Verify API key
cat /srv/focus-flow/07_system/secrets/anthropic_api_key.txt

# Test API key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-3-5-20241022","max_tokens":1024,"messages":[{"role":"user","content":"Hello"}]}'

# Check backend logs for API errors
sudo journalctl -u focus-flow-backend | grep -i "anthropic\|claude\|api"

# Manually trigger classification
curl -X POST http://localhost:3001/api/inbox/classify-all
```

### Debug Mode

**Enable Debug Logging:**

```bash
# Backend
# Edit .env file
LOG_LEVEL=debug

# Restart service
sudo systemctl restart focus-flow-backend

# View debug logs
sudo journalctl -u focus-flow-backend -f
```

### Health Check Script

Create `/srv/focus-flow/07_system/scripts/health-check.sh`:

```bash
#!/bin/bash

echo "=== Focus Flow OS Health Check ==="
echo

# Backend API
echo "1. Backend API (Port 3001):"
curl -s http://localhost:3001/health && echo " ✓ OK" || echo " ✗ FAILED"

# Frontend UI
echo "2. Frontend UI (Port 3008):"
curl -sI http://localhost:3008 | grep "200 OK" && echo " ✓ OK" || echo " ✗ FAILED"

# Docker Services
echo "3. Docker Services:"
docker compose ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null

# Disk Space
echo "4. Vault Disk Usage:"
du -sh /srv/focus-flow

# System Resources
echo "5. System Resources:"
free -h | grep Mem
df -h / | tail -1

echo
echo "=== End Health Check ==="
```

Make executable:
```bash
chmod +x /srv/focus-flow/07_system/scripts/health-check.sh
```

Run:
```bash
/srv/focus-flow/07_system/scripts/health-check.sh
```

---

## Scaling

### Horizontal Scaling

#### Load Balancing with Nginx

**Install Nginx:**
```bash
sudo apt install nginx -y
```

**Configure Load Balancer:**

Create `/etc/nginx/sites-available/focus-flow-lb`:

```nginx
upstream backend_servers {
    least_conn;
    server 127.0.0.1:3001;
    server 127.0.0.1:3011;
    server 127.0.0.1:3021;
}

server {
    listen 80;
    server_name focus-flow.local;

    location /api {
        proxy_pass http://backend_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        proxy_pass http://127.0.0.1:3008;
    }
}
```

Enable configuration:
```bash
sudo ln -s /etc/nginx/sites-available/focus-flow-lb /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Running Multiple Backend Instances

**Instance 1 (Port 3001):**
```bash
cd /srv/focus-flow/02_projects/active/focus-flow-backend
PORT=3001 npm start
```

**Instance 2 (Port 3011):**
```bash
cd /srv/focus-flow/02_projects/active/focus-flow-backend
PORT=3011 npm start
```

**Instance 3 (Port 3021):**
```bash
cd /srv/focus-flow/02_projects/active/focus-flow-backend
PORT=3021 npm start
```

### Vertical Scaling

**Increase Node.js Memory Limit:**

```bash
# In systemd service file
Environment="NODE_OPTIONS=--max-old-space-size=4096"

# Or in package.json
"start": "node --max-old-space-size=4096 dist/index.js"
```

**Optimize Docker Resource Limits:**

```yaml
services:
  qdrant:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

### Database Scaling (Future)

When migrating from JSON to PostgreSQL:

**Master-Replica Setup:**
```yaml
services:
  postgres-master:
    image: postgres:15
    environment:
      POSTGRES_DB: focus_flow
      POSTGRES_REPLICATION_MODE: master

  postgres-replica:
    image: postgres:15
    environment:
      POSTGRES_MASTER_HOST: postgres-master
      POSTGRES_REPLICATION_MODE: slave
```

**Connection Pooling:**
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Caching Strategy

**Redis Cache (Optional):**

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis-data:/data
```

**Implementation:**
```typescript
import Redis from 'ioredis';

const redis = new Redis();

// Cache API responses
app.get('/api/summary', async (req, res) => {
  const cached = await redis.get('summary');
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  const data = await getSummaryData();
  await redis.setex('summary', 300, JSON.stringify(data)); // 5 min cache
  res.json(data);
});
```

---

## Maintenance

### Regular Updates

#### Weekly Maintenance Tasks

```bash
#!/bin/bash
# /srv/focus-flow/07_system/scripts/weekly-maintenance.sh

# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js dependencies
cd /srv/focus-flow/02_projects/active/focus-flow-backend
npm update
cd /srv/focus-flow/02_projects/active/focus-flow-ui
npm update
cd /srv/focus-flow/02_projects/active/focus-flow-telegram-bot
npm update

# Update Docker images
cd /srv/focus-flow/07_system/config
docker compose pull
docker compose up -d

# Clean Docker system
docker system prune -f

# Restart services
sudo systemctl restart focus-flow-backend
sudo systemctl restart focus-flow-ui
sudo systemctl restart focus-flow-telegram-bot

# Run health check
/srv/focus-flow/07_system/scripts/health-check.sh
```

#### Monthly Maintenance Tasks

```bash
# Security audit
npm audit
npm audit fix

# Check disk usage
df -h
du -sh /srv/focus-flow/*

# Review logs for errors
sudo journalctl --since "30 days ago" | grep -i "error\|fail"

# Update SSL certificates (if using custom domain)
sudo certbot renew

# Review backup strategy
ls -lh /srv/backups/focus-flow/
```

### Database Migrations

**Schema Version Control:**

Create migration files in `/srv/focus-flow/07_system/migrations/`:

```typescript
// 001_add_tags_to_tasks.ts
export async function up() {
  // Add tags field to all task files
  const tasks = await getAllTasks();
  for (const task of tasks) {
    task.tags = task.tags || [];
    await saveTask(task);
  }
}

export async function down() {
  // Remove tags field
}
```

**Run Migrations:**

```bash
# Create migration runner script
node /srv/focus-flow/07_system/scripts/run-migrations.js
```

### Cleanup Tasks

**Remove Old Logs:**

```bash
# Clean logs older than 30 days
find /srv/focus-flow/07_system/logs -name "*.log" -mtime +30 -delete
find /srv/focus-flow/07_system/logs -name "*.md" -mtime +30 -delete

# Clean archived inbox items older than 90 days
find /srv/focus-flow/00_inbox/archive -name "*.json" -mtime +90 -delete
```

**Optimize Vault:**

```bash
# Remove duplicate files
fdupes -r /srv/focus-flow --delete

# Compress old logs
find /srv/focus-flow/07_system/logs -name "*.log" -mtime +7 -exec gzip {} \;
```

### Version Upgrades

**Node.js Version Upgrade:**

```bash
# Install new Node.js version
curl -fsSL https://deb.nodesource.com/setup_23.x | sudo -E bash -
sudo apt-get install -y nodejs

# Rebuild applications
cd /srv/focus-flow/02_projects/active/focus-flow-backend
rm -rf node_modules package-lock.json
npm install
npm run build

# Test
npm start

# Restart services
sudo systemctl restart focus-flow-backend
```

**Docker Compose Version Upgrade:**

```bash
# Download latest version
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Set permissions
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker compose version
```

### Monitoring Dashboard Updates

**Setup Grafana Dashboards:**

1. Access Grafana at `http://localhost:3100`
2. Add Prometheus data source
3. Import dashboard ID: 1860 (Node Exporter)
4. Create custom dashboard for Focus Flow metrics

---

## API Reference

### Quick Reference

**Base URL:** `http://localhost:3001`

### Authentication

Currently no authentication required. API key authentication planned for future release.

### Endpoints

#### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

---

#### Quick Capture

```http
POST /api/capture
```

**Request Body:**
```json
{
  "text": "Schedule dentist appointment for next week",
  "prefix": "🦷",
  "source": "telegram",
  "metadata": {
    "telegram_user_id": 123456789
  }
}
```

**Response:**
```json
{
  "id": "inbox-20260203-001",
  "status": "created",
  "item": {
    "id": "inbox-20260203-001",
    "text": "Schedule dentist appointment for next week",
    "prefix": "🦷",
    "source": "telegram",
    "created_at": "2026-02-03T12:00:00.000Z",
    "metadata": {
      "telegram_user_id": 123456789
    }
  }
}
```

---

#### List Inbox Items

```http
GET /api/inbox?filter={category}
```

**Query Parameters:**
- `filter` (optional): `work`, `personal`, `ideas`

**Response:**
```json
{
  "items": [
    {
      "id": "inbox-20260203-001",
      "text": "Review Q1 budget proposal",
      "category": "work",
      "created_at": "2026-02-03T10:15:00Z",
      "ai_classification": {
        "category": "work",
        "confidence": 0.95,
        "suggested_action": "task"
      }
    }
  ],
  "count": 12
}
```

---

#### Get Inbox Counts

```http
GET /api/inbox/counts
```

**Response:**
```json
{
  "all": 12,
  "work": 5,
  "personal": 4,
  "ideas": 3
}
```

---

#### Get Single Inbox Item

```http
GET /api/inbox/:id
```

**Response:**
```json
{
  "id": "inbox-20260203-001",
  "text": "Review Q1 budget proposal",
  "category": "work",
  "created_at": "2026-02-03T10:15:00Z"
}
```

---

#### Process Inbox Item

```http
POST /api/inbox/:id/process
```

**Request Body (Convert to Task):**
```json
{
  "action": "task",
  "task_data": {
    "category": "work",
    "priority": "high",
    "due_date": "2026-02-10"
  }
}
```

**Request Body (Convert to Project):**
```json
{
  "action": "project",
  "project_data": {
    "title": "Q1 Budget Review",
    "description": "Complete review of Q1 budget"
  }
}
```

**Request Body (Archive):**
```json
{
  "action": "archive"
}
```

**Response:**
```json
{
  "status": "processed",
  "action": "task"
}
```

---

#### List Tasks

```http
GET /api/tasks?category={category}
```

**Query Parameters:**
- `category` (optional): `work`, `personal`, `scheduled`

**Response:**
```json
{
  "tasks": [
    {
      "id": "task-20260203-001",
      "title": "Review Q1 budget",
      "description": "Complete financial review",
      "category": "work",
      "status": "todo",
      "priority": "high",
      "due_date": "2026-02-10",
      "created_at": "2026-02-03T12:00:00Z"
    }
  ]
}
```

---

#### Create Task

```http
POST /api/tasks
```

**Request Body:**
```json
{
  "title": "Review Q1 budget",
  "description": "Complete financial review",
  "category": "work",
  "priority": "high",
  "due_date": "2026-02-10"
}
```

**Response:**
```json
{
  "id": "task-20260203-001",
  "title": "Review Q1 budget",
  "status": "created"
}
```

---

#### Update Task

```http
PUT /api/tasks/:id
```

**Request Body:**
```json
{
  "status": "done",
  "completed_at": "2026-02-03T15:30:00Z"
}
```

---

#### List Projects

```http
GET /api/projects?status={status}
```

**Query Parameters:**
- `status` (optional): `active`, `paused`, `completed`

**Response:**
```json
{
  "projects": [
    {
      "id": "project-20260203-001",
      "title": "Focus Flow OS",
      "description": "Personal productivity system",
      "status": "active",
      "created_at": "2026-02-01T00:00:00Z",
      "updated_at": "2026-02-03T12:00:00Z"
    }
  ]
}
```

---

#### Create Project

```http
POST /api/projects
```

**Request Body:**
```json
{
  "title": "Focus Flow OS",
  "description": "Personal productivity system",
  "status": "active"
}
```

---

#### List Ideas

```http
GET /api/ideas?status={status}
```

**Query Parameters:**
- `status` (optional): `inbox`, `validated`, `rejected`

**Response:**
```json
{
  "ideas": [
    {
      "id": "idea-20260203-001",
      "title": "AI-powered task prioritization",
      "description": "Use ML to auto-prioritize tasks",
      "status": "inbox",
      "created_at": "2026-02-03T12:00:00Z"
    }
  ]
}
```

---

#### Create Idea

```http
POST /api/ideas
```

**Request Body:**
```json
{
  "title": "AI-powered task prioritization",
  "description": "Use ML to auto-prioritize tasks based on deadlines and importance"
}
```

---

#### Log Health Metric

```http
POST /api/health/log
```

**Request Body:**
```json
{
  "metric_type": "mood",
  "value": 8,
  "unit": "scale_1_10",
  "date": "2026-02-03",
  "notes": "Feeling productive today"
}
```

---

#### Get Dashboard Summary

```http
GET /api/summary
```

**Response:**
```json
{
  "inbox": {
    "total": 12,
    "work": 5,
    "personal": 4,
    "ideas": 3
  },
  "tasks": {
    "total": 25,
    "todo": 15,
    "in_progress": 5,
    "done": 5
  },
  "projects": {
    "active": 3,
    "paused": 1,
    "completed": 10
  },
  "recent_activity": [
    {
      "type": "task_created",
      "title": "Review budget",
      "timestamp": "2026-02-03T12:00:00Z"
    }
  ]
}
```

---

#### Classify Inbox Item

```http
POST /api/inbox/:id/classify
```

**Response:**
```json
{
  "status": "classified",
  "item": {
    "id": "inbox-20260203-001",
    "text": "Review Q1 budget",
    "ai_classification": {
      "category": "work",
      "confidence": 0.95,
      "suggested_action": "task",
      "reasoning": "This is a work-related task involving financial review"
    }
  }
}
```

---

#### Classify All Unclassified Items

```http
POST /api/inbox/classify-all
```

**Response:**
```json
{
  "status": "started",
  "message": "Batch classification started in background"
}
```

---

### Error Responses

**400 Bad Request:**
```json
{
  "error": "Text is required"
}
```

**404 Not Found:**
```json
{
  "error": "Inbox item not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to create inbox item: [error details]"
}
```

---

### Orchestrator Endpoints

The **Orchestrator** provides autonomous PRD-to-Code pipeline capabilities. See `ORCHESTRATOR_GUIDE.md` for detailed documentation.

#### Start PRD Processing

```http
POST /api/orchestrator/prd/:ideaId
```

**Description:** Start autonomous code generation from a PRD

**Request:**
```bash
curl -X POST http://localhost:3001/api/orchestrator/prd/idea-123
```

**Response (202 Accepted):**
```json
{
  "status": "processing",
  "message": "PRD processing started",
  "idea_id": "idea-123"
}
```

---

#### Get Run Status

```http
GET /api/orchestrator/runs/:runId
```

**Description:** Get status and outputs of a specific orchestrator run

**Response:**
```json
{
  "run": {
    "id": "orch-20260203-abc123",
    "idea_id": "idea-123",
    "state": "complete",
    "outputs": {
      "specs": [...],
      "code": {...},
      "validation": {...},
      "deployment": {...}
    }
  }
}
```

**States:**
- `intake` - Loading PRD
- `spec_generation` - Generating technical specs
- `design_parsing` - Parsing design assets
- `code_generation` - Generating React + Express code
- `validation` - Running TypeScript validation
- `deployment` - Writing files
- `complete` - Success!
- `failed` - Error occurred

---

#### List All Runs

```http
GET /api/orchestrator/runs
```

**Description:** List all orchestrator runs with status

**Response:**
```json
{
  "runs": [
    {
      "id": "orch-20260203-abc123",
      "state": "complete",
      "created_at": "2026-02-03T10:00:00Z",
      "metadata": {
        "prd_title": "User Profile Page"
      }
    }
  ],
  "count": 1
}
```

---

## Support & Resources

### Documentation
- **README:** `/srv/focus-flow/README.md`
- **Backend README:** `/srv/focus-flow/02_projects/active/focus-flow-backend/README.md`
- **Orchestrator Guide:** `/srv/focus-flow/ORCHESTRATOR_GUIDE.md`
- **System Plan:** `/srv/focus-flow/07_system/logs/revised-full-stack-plan.md`

### Logs
- **System Logs:** `/srv/focus-flow/07_system/logs/`
- **Health Logs:** `/srv/focus-flow/06_health/logs/`
- **Service Logs:** `journalctl -u focus-flow-*`

### Configuration
- **Docker Compose:** `/srv/focus-flow/07_system/config/docker-compose.yml`
- **Environment Files:** `*/.env`

---

**End of Production Documentation**

For updates and contributions, see `CONTRIBUTING.md`.
