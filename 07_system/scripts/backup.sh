#!/bin/bash

################################################################################
# Focus Flow OS - Backup Script
# Version: 1.0.0
# Description: Comprehensive backup of vault, configs, and Docker volumes
################################################################################

set -euo pipefail

# Color codes
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'
readonly BOLD='\033[1m'

# Paths
readonly FOCUS_FLOW_ROOT="/srv/focus-flow"
readonly SYSTEM_DIR="${FOCUS_FLOW_ROOT}/07_system"
readonly CONFIG_DIR="${SYSTEM_DIR}/config"
readonly SECRETS_DIR="${SYSTEM_DIR}/secrets"
readonly LOGS_DIR="${SYSTEM_DIR}/logs"
readonly BACKUP_DIR="${FOCUS_FLOW_ROOT}/backups"
readonly LOG_FILE="${LOGS_DIR}/backup.log"

# Backup configuration
readonly DEFAULT_RETENTION_DAYS=30
RETENTION_DAYS=${RETENTION_DAYS:-$DEFAULT_RETENTION_DAYS}
BACKUP_NAME=""
BACKUP_TYPE="full"  # full, vault-only, docker-only
COMPRESS=true
ENCRYPT=false
REMOTE_BACKUP=false

################################################################################
# Logging Functions
################################################################################

log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} - $*" | tee -a "${LOG_FILE}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*" | tee -a "${LOG_FILE}"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*" | tee -a "${LOG_FILE}"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*" | tee -a "${LOG_FILE}"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" | tee -a "${LOG_FILE}"
}

log_step() {
    echo -e "\n${CYAN}${BOLD}==>${NC} ${BOLD}$*${NC}" | tee -a "${LOG_FILE}"
}

################################################################################
# Utility Functions
################################################################################

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root. Use: sudo $0"
        exit 1
    fi
}

check_dependencies() {
    local missing_deps=()

    command -v tar >/dev/null 2>&1 || missing_deps+=("tar")
    command -v docker >/dev/null 2>&1 || missing_deps+=("docker")

    if [[ $COMPRESS == true ]]; then
        command -v gzip >/dev/null 2>&1 || missing_deps+=("gzip")
    fi

    if [[ $ENCRYPT == true ]]; then
        command -v gpg >/dev/null 2>&1 || missing_deps+=("gpg")
    fi

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        exit 1
    fi
}

get_backup_size() {
    local path=$1
    du -sh "$path" 2>/dev/null | cut -f1 || echo "unknown"
}

format_bytes() {
    local bytes=$1
    if [[ $bytes -lt 1024 ]]; then
        echo "${bytes}B"
    elif [[ $bytes -lt $((1024 * 1024)) ]]; then
        echo "$((bytes / 1024))KB"
    elif [[ $bytes -lt $((1024 * 1024 * 1024)) ]]; then
        echo "$((bytes / 1024 / 1024))MB"
    else
        echo "$((bytes / 1024 / 1024 / 1024))GB"
    fi
}

################################################################################
# Backup Functions
################################################################################

create_backup_directory() {
    log_step "Preparing backup directory"

    if [[ ! -d "$BACKUP_DIR" ]]; then
        mkdir -p "$BACKUP_DIR"
        chmod 750 "$BACKUP_DIR"
        log_success "Created backup directory: $BACKUP_DIR"
    else
        log_info "Backup directory exists: $BACKUP_DIR"
    fi

    # Generate backup name if not provided
    if [[ -z "$BACKUP_NAME" ]]; then
        BACKUP_NAME="focus-flow-${BACKUP_TYPE}-$(date +%Y%m%d-%H%M%S)"
    fi

    log_info "Backup name: $BACKUP_NAME"
}

backup_vault_data() {
    log_step "Backing up vault data"

    local vault_backup="${BACKUP_DIR}/${BACKUP_NAME}-vault.tar"

    log_info "Creating vault backup..."

    # Exclude backups directory and logs to avoid recursion
    tar -cf "$vault_backup" \
        -C / \
        --exclude="srv/focus-flow/backups" \
        --exclude="srv/focus-flow/07_system/logs/*.log" \
        --exclude="srv/focus-flow/02_projects/*/node_modules" \
        --exclude="srv/focus-flow/02_projects/*/dist" \
        --exclude="srv/focus-flow/02_projects/*/.next" \
        "srv/focus-flow/01_inbox" \
        "srv/focus-flow/02_projects" \
        "srv/focus-flow/03_areas" \
        "srv/focus-flow/04_resources" \
        "srv/focus-flow/05_archive" \
        "srv/focus-flow/06_templates" \
        "srv/focus-flow/README.md" \
        2>/dev/null || log_warning "Some files may have been skipped"

    if [[ -f "$vault_backup" ]]; then
        local size=$(get_backup_size "$vault_backup")
        log_success "Vault backup created: $vault_backup ($size)"
    else
        log_error "Failed to create vault backup"
        return 1
    fi
}

backup_system_configs() {
    log_step "Backing up system configurations"

    local config_backup="${BACKUP_DIR}/${BACKUP_NAME}-config.tar"

    log_info "Creating config backup..."

    tar -cf "$config_backup" \
        -C / \
        "srv/focus-flow/07_system/config" \
        "srv/focus-flow/07_system/secrets" \
        "srv/focus-flow/07_system/memory" \
        2>/dev/null || log_warning "Some config files may have been skipped"

    if [[ -f "$config_backup" ]]; then
        local size=$(get_backup_size "$config_backup")
        log_success "Config backup created: $config_backup ($size)"
    else
        log_error "Failed to create config backup"
        return 1
    fi
}

backup_docker_volumes() {
    log_step "Backing up Docker volumes"

    local volumes=("openclaw-sessions" "qdrant-data" "mem0-data" "coolify-data")
    local docker_backup="${BACKUP_DIR}/${BACKUP_NAME}-docker.tar"

    # Create temporary directory for volume exports
    local temp_dir=$(mktemp -d)
    trap "rm -rf $temp_dir" EXIT

    for volume in "${volumes[@]}"; do
        if docker volume inspect "$volume" >/dev/null 2>&1; then
            log_info "Backing up volume: $volume"

            local volume_dir="${temp_dir}/${volume}"
            mkdir -p "$volume_dir"

            # Export volume data using a temporary container
            docker run --rm \
                -v "${volume}:/data:ro" \
                -v "${volume_dir}:/backup" \
                alpine tar -czf "/backup/data.tar.gz" -C /data . \
                2>/dev/null || log_warning "Failed to backup $volume"

            if [[ -f "${volume_dir}/data.tar.gz" ]]; then
                log_success "Volume $volume backed up"
            fi
        else
            log_warning "Volume $volume not found, skipping"
        fi
    done

    # Combine all volume backups
    if [[ -n "$(ls -A $temp_dir)" ]]; then
        tar -cf "$docker_backup" -C "$temp_dir" . 2>/dev/null

        if [[ -f "$docker_backup" ]]; then
            local size=$(get_backup_size "$docker_backup")
            log_success "Docker volumes backup created: $docker_backup ($size)"
        fi
    else
        log_warning "No Docker volumes to backup"
    fi
}

backup_env_files() {
    log_step "Backing up environment files"

    local env_backup="${BACKUP_DIR}/${BACKUP_NAME}-env.tar"

    log_info "Creating environment files backup..."

    find "${FOCUS_FLOW_ROOT}/02_projects" -name ".env" -o -name ".env.local" | \
        tar -cf "$env_backup" -T - 2>/dev/null || log_warning "Some .env files may not exist"

    if [[ -f "$env_backup" ]] && [[ -s "$env_backup" ]]; then
        local size=$(get_backup_size "$env_backup")
        log_success "Environment files backed up: $env_backup ($size)"
        chmod 600 "$env_backup"  # Protect sensitive data
    else
        log_info "No environment files to backup"
        rm -f "$env_backup"
    fi
}

compress_backups() {
    if [[ $COMPRESS != true ]]; then
        return
    fi

    log_step "Compressing backup files"

    for backup_file in "${BACKUP_DIR}/${BACKUP_NAME}"*.tar; do
        if [[ -f "$backup_file" ]]; then
            log_info "Compressing $(basename "$backup_file")..."

            local original_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null)
            gzip -f "$backup_file"

            if [[ -f "${backup_file}.gz" ]]; then
                local compressed_size=$(stat -f%z "${backup_file}.gz" 2>/dev/null || stat -c%s "${backup_file}.gz" 2>/dev/null)
                local ratio=$((100 - (compressed_size * 100 / original_size)))
                log_success "Compressed $(basename "$backup_file") (saved ${ratio}%)"
            fi
        fi
    done
}

encrypt_backups() {
    if [[ $ENCRYPT != true ]]; then
        return
    fi

    log_step "Encrypting backup files"

    local gpg_recipient="${GPG_RECIPIENT:-}"

    if [[ -z "$gpg_recipient" ]]; then
        log_warning "GPG_RECIPIENT not set, skipping encryption"
        return
    fi

    for backup_file in "${BACKUP_DIR}/${BACKUP_NAME}"*.tar.gz; do
        if [[ -f "$backup_file" ]]; then
            log_info "Encrypting $(basename "$backup_file")..."

            gpg --encrypt --recipient "$gpg_recipient" "$backup_file"

            if [[ -f "${backup_file}.gpg" ]]; then
                rm -f "$backup_file"
                log_success "Encrypted $(basename "$backup_file")"
            fi
        fi
    done
}

create_manifest() {
    log_step "Creating backup manifest"

    local manifest="${BACKUP_DIR}/${BACKUP_NAME}-manifest.json"

    cat > "$manifest" << EOF
{
  "backup_name": "$BACKUP_NAME",
  "backup_type": "$BACKUP_TYPE",
  "timestamp": "$(date -Iseconds)",
  "hostname": "$(hostname)",
  "focus_flow_version": "1.0.0",
  "files": [
EOF

    local first=true
    for file in "${BACKUP_DIR}/${BACKUP_NAME}"*; do
        if [[ -f "$file" ]] && [[ "$file" != "$manifest" ]]; then
            if [[ $first == true ]]; then
                first=false
            else
                echo "," >> "$manifest"
            fi

            local filename=$(basename "$file")
            local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
            local checksum=$(sha256sum "$file" | cut -d' ' -f1)

            cat >> "$manifest" << EOF
    {
      "filename": "$filename",
      "size": $size,
      "sha256": "$checksum"
    }
EOF
        fi
    done

    cat >> "$manifest" << EOF

  ]
}
EOF

    log_success "Manifest created: $manifest"
}

cleanup_old_backups() {
    log_step "Cleaning up old backups"

    log_info "Retention policy: $RETENTION_DAYS days"

    local deleted_count=0

    # Find and delete backups older than retention period
    find "$BACKUP_DIR" -name "focus-flow-*" -type f -mtime "+${RETENTION_DAYS}" | while read -r old_backup; do
        log_info "Deleting old backup: $(basename "$old_backup")"
        rm -f "$old_backup"
        ((deleted_count++))
    done

    if [[ $deleted_count -gt 0 ]]; then
        log_success "Deleted $deleted_count old backup file(s)"
    else
        log_info "No old backups to delete"
    fi
}

sync_to_remote() {
    if [[ $REMOTE_BACKUP != true ]]; then
        return
    fi

    log_step "Syncing to remote backup location"

    local remote_dest="${REMOTE_BACKUP_DEST:-}"

    if [[ -z "$remote_dest" ]]; then
        log_warning "REMOTE_BACKUP_DEST not set, skipping remote sync"
        return
    fi

    log_info "Syncing to: $remote_dest"

    # Use rsync if available, otherwise scp
    if command -v rsync >/dev/null 2>&1; then
        rsync -avz --progress "${BACKUP_DIR}/${BACKUP_NAME}"* "$remote_dest" || \
            log_warning "Remote sync failed"
    else
        scp "${BACKUP_DIR}/${BACKUP_NAME}"* "$remote_dest" || \
            log_warning "Remote sync failed"
    fi

    log_success "Remote backup completed"
}

display_summary() {
    log_step "Backup Complete"

    echo
    echo -e "${GREEN}${BOLD}================================${NC}"
    echo -e "${GREEN}${BOLD}  Backup Summary${NC}"
    echo -e "${GREEN}${BOLD}================================${NC}"
    echo

    echo -e "${CYAN}${BOLD}Backup Details:${NC}"
    echo -e "  Name:      ${BLUE}${BACKUP_NAME}${NC}"
    echo -e "  Type:      ${BLUE}${BACKUP_TYPE}${NC}"
    echo -e "  Location:  ${BLUE}${BACKUP_DIR}${NC}"
    echo -e "  Timestamp: ${BLUE}$(date)${NC}"
    echo

    echo -e "${CYAN}${BOLD}Backup Files:${NC}"
    for file in "${BACKUP_DIR}/${BACKUP_NAME}"*; do
        if [[ -f "$file" ]]; then
            local size=$(get_backup_size "$file")
            echo -e "  ${GREEN}✓${NC} $(basename "$file") - ${size}"
        fi
    done

    echo
    local total_size=$(du -sh "${BACKUP_DIR}" | cut -f1)
    echo -e "${CYAN}Total backup size:${NC} ${BOLD}${total_size}${NC}"
    echo

    echo -e "${CYAN}${BOLD}Restore Command:${NC}"
    echo -e "  ${BLUE}${SCRIPTS_DIR}/restore.sh ${BACKUP_NAME}${NC}"
    echo

    echo -e "${YELLOW}${BOLD}Recommendations:${NC}"
    echo -e "  - Test restore procedure regularly"
    echo -e "  - Store backups in multiple locations"
    echo -e "  - Encrypt backups containing sensitive data"
    echo -e "  - Monitor backup size and adjust retention as needed"
    echo
}

################################################################################
# Main Execution
################################################################################

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Focus Flow OS Backup Script

OPTIONS:
    -h, --help              Show this help message
    -t, --type TYPE         Backup type: full, vault-only, docker-only (default: full)
    -n, --name NAME         Custom backup name
    -r, --retention DAYS    Retention period in days (default: 30)
    -e, --encrypt           Encrypt backup with GPG (requires GPG_RECIPIENT)
    -R, --remote            Sync to remote location (requires REMOTE_BACKUP_DEST)
    --no-compress           Skip compression
    -v, --verbose           Verbose output

EXAMPLES:
    $0                      Full backup with default settings
    $0 -t vault-only        Backup only vault data
    $0 -n my-backup         Custom backup name
    $0 -e                   Encrypted backup
    $0 -r 60                Keep backups for 60 days

ENVIRONMENT VARIABLES:
    GPG_RECIPIENT           Email/ID for GPG encryption
    REMOTE_BACKUP_DEST      Remote destination (user@host:/path or s3://bucket)
    RETENTION_DAYS          Override default retention period

EOF
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -t|--type)
                BACKUP_TYPE="$2"
                shift 2
                ;;
            -n|--name)
                BACKUP_NAME="$2"
                shift 2
                ;;
            -r|--retention)
                RETENTION_DAYS="$2"
                shift 2
                ;;
            -e|--encrypt)
                ENCRYPT=true
                shift
                ;;
            -R|--remote)
                REMOTE_BACKUP=true
                shift
                ;;
            --no-compress)
                COMPRESS=false
                shift
                ;;
            -v|--verbose)
                set -x
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    # Validate backup type
    if [[ ! "$BACKUP_TYPE" =~ ^(full|vault-only|docker-only)$ ]]; then
        log_error "Invalid backup type: $BACKUP_TYPE"
        show_usage
        exit 1
    fi
}

main() {
    parse_arguments "$@"

    check_root
    check_dependencies

    mkdir -p "${LOGS_DIR}"

    log "=========================================="
    log "Focus Flow OS - Backup"
    log "Started at $(date)"
    log "=========================================="

    echo -e "${CYAN}${BOLD}"
    cat << "EOF"
    ╔╗ ╔═╗╔═╗╦╔═╦ ╦╔═╗
    ╠╩╗╠═╣║  ╠╩╗║ ║╠═╝
    ╚═╝╩ ╩╚═╝╩ ╩╚═╝╩
      Focus Flow OS Backup v1.0.0
EOF
    echo -e "${NC}"

    create_backup_directory

    case $BACKUP_TYPE in
        full)
            backup_vault_data
            backup_system_configs
            backup_docker_volumes
            backup_env_files
            ;;
        vault-only)
            backup_vault_data
            backup_env_files
            ;;
        docker-only)
            backup_docker_volumes
            backup_system_configs
            ;;
    esac

    compress_backups
    encrypt_backups
    create_manifest
    cleanup_old_backups
    sync_to_remote
    display_summary

    log "=========================================="
    log "Backup completed successfully at $(date)"
    log "=========================================="
}

# Run main function
main "$@"
