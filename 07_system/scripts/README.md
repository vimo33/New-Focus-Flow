# Focus Flow OS - Production Scripts

Automated deployment, backup, and maintenance scripts for Focus Flow OS.

## Scripts Overview

### 1. production-setup.sh (722 lines, 23KB)
**Purpose**: Automated production deployment with complete system setup

**Features**:
- Prerequisites checking (Docker, Node.js, system tools)
- Directory structure creation (PARA method)
- Permission management (750/640/600)
- Environment configuration
- Secret management (interactive prompts)
- Docker image building and service startup
- Health check monitoring
- Systemd service installation (optional)
- Comprehensive logging

**Usage**:
```bash
# Interactive setup
sudo ./production-setup.sh

# Automated setup (no prompts)
sudo ./production-setup.sh -y

# With systemd auto-start
sudo ./production-setup.sh -s

# Fully automated with systemd
sudo ./production-setup.sh -y -s
```

**Options**:
- `-h, --help` - Show help message
- `-y, --skip-prompts` - Skip interactive prompts
- `-s, --systemd` - Install systemd service
- `-v, --verbose` - Enable verbose output

---

### 2. production-teardown.sh (417 lines, 14KB)
**Purpose**: Safe uninstall with optional data preservation

**Features**:
- Double confirmation safety
- Pre-teardown backup creation
- Selective data preservation
- Service shutdown
- Docker cleanup (containers, images, volumes)
- Systemd service removal
- Application file cleanup

**Usage**:
```bash
# Interactive teardown
sudo ./production-teardown.sh

# Keep vault data
sudo ./production-teardown.sh -v

# Keep all data, only remove containers
sudo ./production-teardown.sh -d -v

# With final backup
sudo ./production-teardown.sh -b
```

**Options**:
- `-h, --help` - Show help message
- `-y, --yes` - Skip confirmation prompts
- `-d, --preserve-data` - Keep Docker volumes
- `-v, --preserve-vault` - Keep vault data
- `-k, --keep-systemd` - Keep systemd service
- `-b, --backup` - Create final backup

---

### 3. backup.sh (588 lines, 17KB)
**Purpose**: Enterprise-grade backup with multiple strategies

**Features**:
- Multiple backup types (full, vault-only, docker-only)
- Automatic compression (gzip)
- GPG encryption support
- Remote sync (rsync/scp)
- SHA256 checksum manifest
- Automatic old backup cleanup
- Retention policy management

**Backup Types**:
- **full** - Complete system (vault + Docker + configs)
- **vault-only** - PARA structure only
- **docker-only** - Docker volumes only

**Usage**:
```bash
# Full backup
sudo ./backup.sh

# Vault-only backup
sudo ./backup.sh -t vault-only

# Custom name with encryption
sudo ./backup.sh -n "weekly-backup" -e

# With 60-day retention
sudo ./backup.sh -r 60

# Remote sync
sudo REMOTE_BACKUP_DEST="user@host:/path" ./backup.sh -R
```

**Options**:
- `-h, --help` - Show help message
- `-t, --type TYPE` - Backup type (full/vault-only/docker-only)
- `-n, --name NAME` - Custom backup name
- `-r, --retention DAYS` - Retention period (default: 30)
- `-e, --encrypt` - GPG encryption (requires GPG_RECIPIENT)
- `-R, --remote` - Sync to remote (requires REMOTE_BACKUP_DEST)
- `--no-compress` - Skip compression

**Environment Variables**:
- `GPG_RECIPIENT` - Email/ID for GPG encryption
- `REMOTE_BACKUP_DEST` - Remote destination (user@host:/path)
- `RETENTION_DAYS` - Override default retention

---

### 4. restore.sh (685 lines, 21KB)
**Purpose**: Intelligent restore with integrity verification

**Features**:
- Backup integrity verification (SHA256)
- Pre-restore backup of current data
- Multiple restore types
- Service management (stop/start)
- Permission restoration
- Post-restore verification
- Interactive backup selection

**Restore Types**:
- **full** - Complete system restore
- **vault-only** - PARA data only
- **config-only** - System configs and secrets only
- **docker-only** - Docker volumes only

**Usage**:
```bash
# List available backups
sudo ./restore.sh --list

# Interactive restore
sudo ./restore.sh focus-flow-full-20260203-120000

# Vault-only restore
sudo ./restore.sh backup-name -t vault-only

# Automated restore
sudo ./restore.sh backup-name -y
```

**Options**:
- `-h, --help` - Show help message
- `-l, --list` - List available backups
- `-t, --type TYPE` - Restore type (full/vault-only/docker-only/config-only)
- `-y, --yes` - Skip confirmation prompts
- `-k, --keep-running` - Don't stop services
- `--no-verify` - Skip checksum verification

---

## Quick Start

### Initial Setup
```bash
# 1. Run production setup
sudo /srv/focus-flow/07_system/scripts/production-setup.sh -s

# 2. Verify services
docker ps

# 3. Check logs
docker-compose -f /srv/focus-flow/07_system/config/docker-compose.yml logs
```

### Regular Backups (Cron)
Add to root crontab:
```bash
sudo crontab -e

# Daily full backup at 2 AM
0 2 * * * /srv/focus-flow/07_system/scripts/backup.sh -t full

# Weekly vault backup on Sunday at 3 AM
0 3 * * 0 /srv/focus-flow/07_system/scripts/backup.sh -t vault-only -n weekly
```

### Restore from Backup
```bash
# 1. List backups
sudo /srv/focus-flow/07_system/scripts/restore.sh --list

# 2. Restore
sudo /srv/focus-flow/07_system/scripts/restore.sh [backup-name]

# 3. Verify
docker ps
```

### Clean Uninstall
```bash
# Keep vault data
sudo /srv/focus-flow/07_system/scripts/production-teardown.sh -v

# Complete removal
sudo /srv/focus-flow/07_system/scripts/production-teardown.sh
```

---

## Common Features

All scripts include:
- **Color-coded output** (errors, warnings, success, info)
- **Comprehensive logging** to `/srv/focus-flow/07_system/logs/`
- **Error handling** with clear messages
- **Help documentation** (`--help` flag)
- **Root permission checks**
- **Dependency validation**
- **Idempotent operations** (safe to re-run)

---

## Log Files

Located in `/srv/focus-flow/07_system/logs/`:
- `setup.log` - Production setup logs
- `teardown.log` - Teardown operation logs
- `backup.log` - Backup operation logs
- `restore.log` - Restore operation logs

---

## Backup Storage

Backups stored in `/srv/focus-flow/backups/`:
- Organized by backup name
- Includes manifest files (JSON metadata)
- SHA256 checksums for verification
- Automatic cleanup based on retention policy

---

## Security Notes

1. **All scripts require root** - Use `sudo`
2. **Secrets protected** - 600 permissions, never logged
3. **Backups include sensitive data** - Consider encryption
4. **Remote backups** - Use SSH keys for automation
5. **Script permissions** - 750 (executable by owner and group)

---

## Troubleshooting

### Script won't run
```bash
# Check permissions
ls -l /srv/focus-flow/07_system/scripts/

# Make executable if needed
chmod +x /srv/focus-flow/07_system/scripts/*.sh
```

### Docker errors
```bash
# Verify Docker is running
systemctl status docker

# Check Docker compose
docker-compose version
```

### Permission errors
```bash
# Run with sudo
sudo ./production-setup.sh

# Check current user
whoami  # Should be root
```

### Health check failures
```bash
# View container logs
docker logs [container-name]

# Check service status
docker ps

# Manual restart
docker-compose restart [service-name]
```

---

## Statistics

- **Total Lines**: 2,412
- **Total Size**: 75KB
- **Scripts**: 4
- **Features**: 50+
- **Tested**: ✓ Syntax validated
- **Version**: 1.0.0

---

## Support

For issues or questions:
1. Check logs in `/srv/focus-flow/07_system/logs/`
2. Run scripts with `--help` for usage
3. Review task completion report: `/srv/focus-flow/TASK_51_COMPLETION.md`

---

**Created**: 2026-02-03
**Task**: #51
**Status**: COMPLETED
