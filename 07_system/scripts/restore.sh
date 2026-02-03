#!/bin/bash

################################################################################
# Focus Flow OS - Restore Script
# Version: 1.0.0
# Description: Restore vault and system from backup
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
readonly LOG_FILE="${LOGS_DIR}/restore.log"

# Restore configuration
BACKUP_NAME=""
RESTORE_TYPE="full"  # full, vault-only, docker-only, config-only
VERIFY_CHECKSUMS=true
STOP_SERVICES=true
SKIP_CONFIRMATION=false

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
# Error Handling
################################################################################

error_exit() {
    log_error "$1"
    log_error "Restore failed. Check ${LOG_FILE} for details."
    exit 1
}

################################################################################
# Utility Functions
################################################################################

check_root() {
    if [[ $EUID -ne 0 ]]; then
        error_exit "This script must be run as root. Use: sudo $0"
    fi
}

check_dependencies() {
    local missing_deps=()

    command -v tar >/dev/null 2>&1 || missing_deps+=("tar")
    command -v docker >/dev/null 2>&1 || missing_deps+=("docker")
    command -v gzip >/dev/null 2>&1 || missing_deps+=("gzip")

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        error_exit "Missing required dependencies: ${missing_deps[*]}"
    fi
}

list_available_backups() {
    log_step "Available Backups"

    echo -e "${CYAN}${BOLD}Backups in ${BACKUP_DIR}:${NC}"
    echo

    if [[ ! -d "$BACKUP_DIR" ]] || [[ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]]; then
        echo -e "${YELLOW}No backups found${NC}"
        return
    fi

    # Group backups by name
    local backup_names=$(find "$BACKUP_DIR" -name "focus-flow-*-manifest.json" -o -name "focus-flow-*-vault.tar.gz" 2>/dev/null | \
        sed 's/-manifest.json$//' | sed 's/-vault.tar.gz$//' | sort -u)

    local count=1
    for backup_base in $backup_names; do
        local backup_name=$(basename "$backup_base")
        local manifest="${BACKUP_DIR}/${backup_name}-manifest.json"

        echo -e "${GREEN}${count}.${NC} ${BOLD}${backup_name}${NC}"

        if [[ -f "$manifest" ]]; then
            local timestamp=$(jq -r '.timestamp' "$manifest" 2>/dev/null || echo "unknown")
            local backup_type=$(jq -r '.backup_type' "$manifest" 2>/dev/null || echo "unknown")
            echo -e "   Date: ${BLUE}${timestamp}${NC}"
            echo -e "   Type: ${BLUE}${backup_type}${NC}"

            # List files
            echo -e "   Files:"
            jq -r '.files[] | "     - \(.filename) (\(.size) bytes)"' "$manifest" 2>/dev/null || true
        else
            # No manifest, list files directly
            local files=$(find "$BACKUP_DIR" -name "${backup_name}*" ! -name "*manifest*" -type f)
            if [[ -n "$files" ]]; then
                echo -e "   Files:"
                echo "$files" | while read -r file; do
                    local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
                    echo -e "     - $(basename "$file") ($size bytes)"
                done
            fi
        fi

        echo
        ((count++))
    done
}

verify_backup_integrity() {
    log_step "Verifying backup integrity"

    local manifest="${BACKUP_DIR}/${BACKUP_NAME}-manifest.json"

    if [[ ! -f "$manifest" ]]; then
        log_warning "No manifest found, skipping integrity check"
        return 0
    fi

    log_info "Checking backup files against manifest..."

    local files_count=$(jq -r '.files | length' "$manifest")
    local verified=0
    local failed=0

    for ((i=0; i<files_count; i++)); do
        local filename=$(jq -r ".files[$i].filename" "$manifest")
        local expected_checksum=$(jq -r ".files[$i].sha256" "$manifest")
        local filepath="${BACKUP_DIR}/${filename}"

        if [[ ! -f "$filepath" ]]; then
            log_error "Missing file: $filename"
            ((failed++))
            continue
        fi

        if [[ $VERIFY_CHECKSUMS == true ]]; then
            log_info "Verifying: $filename"
            local actual_checksum=$(sha256sum "$filepath" | cut -d' ' -f1)

            if [[ "$actual_checksum" == "$expected_checksum" ]]; then
                log_success "Checksum verified: $filename"
                ((verified++))
            else
                log_error "Checksum mismatch: $filename"
                log_error "  Expected: $expected_checksum"
                log_error "  Actual:   $actual_checksum"
                ((failed++))
            fi
        else
            ((verified++))
        fi
    done

    if [[ $failed -gt 0 ]]; then
        error_exit "Backup integrity check failed ($failed files)"
    fi

    log_success "Backup integrity verified ($verified files)"
}

confirm_restore() {
    if [[ "$SKIP_CONFIRMATION" == "true" ]]; then
        return 0
    fi

    echo -e "${YELLOW}${BOLD}"
    cat << "EOF"
    ╦ ╦╔═╗╦═╗╔╗╔╦╔╗╔╔═╗
    ║║║╠═╣╠╦╝║║║║║║║║ ╦
    ╚╩╝╩ ╩╩╚═╝╚╝╩╝╚╝╚═╝

    This will RESTORE data from backup!
EOF
    echo -e "${NC}"

    echo -e "${YELLOW}The following will be restored:${NC}"
    echo -e "  Backup: ${BOLD}${BACKUP_NAME}${NC}"
    echo -e "  Type: ${BOLD}${RESTORE_TYPE}${NC}"
    echo

    if [[ "$STOP_SERVICES" == "true" ]]; then
        echo -e "${YELLOW}Services will be stopped during restore${NC}"
    fi

    echo -e "${RED}${BOLD}WARNING: Existing data may be overwritten!${NC}"
    echo

    read -rp "Are you sure you want to continue? Type 'yes' to confirm: " confirmation

    if [[ "$confirmation" != "yes" ]]; then
        log_info "Restore cancelled by user"
        exit 0
    fi
}

################################################################################
# Restore Functions
################################################################################

stop_services() {
    if [[ "$STOP_SERVICES" != "true" ]]; then
        return
    fi

    log_step "Stopping services"

    if [[ -f "${CONFIG_DIR}/docker-compose.yml" ]]; then
        log_info "Stopping Docker containers..."
        cd "${CONFIG_DIR}"
        docker-compose down || log_warning "Some services may not have stopped cleanly"
        log_success "Services stopped"
    else
        log_info "No docker-compose.yml found, skipping service stop"
    fi
}

start_services() {
    if [[ "$STOP_SERVICES" != "true" ]]; then
        return
    fi

    log_step "Starting services"

    if [[ -f "${CONFIG_DIR}/docker-compose.yml" ]]; then
        log_info "Starting Docker containers..."
        cd "${CONFIG_DIR}"
        docker-compose up -d || log_warning "Some services may not have started cleanly"
        log_success "Services started"
    fi
}

restore_vault_data() {
    log_step "Restoring vault data"

    local vault_backup="${BACKUP_DIR}/${BACKUP_NAME}-vault.tar.gz"

    if [[ ! -f "$vault_backup" ]]; then
        # Try uncompressed version
        vault_backup="${BACKUP_DIR}/${BACKUP_NAME}-vault.tar"
    fi

    if [[ ! -f "$vault_backup" ]]; then
        log_warning "No vault backup found in $BACKUP_NAME"
        return
    fi

    log_info "Extracting vault data..."

    # Create backup of current vault if it exists
    if [[ -d "${FOCUS_FLOW_ROOT}/01_inbox" ]] || [[ -d "${FOCUS_FLOW_ROOT}/02_projects" ]]; then
        local current_backup="${BACKUP_DIR}/pre-restore-$(date +%Y%m%d-%H%M%S).tar.gz"
        log_info "Backing up current vault to: $current_backup"

        tar -czf "$current_backup" \
            -C / \
            --exclude="srv/focus-flow/backups" \
            --exclude="srv/focus-flow/07_system/logs" \
            srv/focus-flow/01_inbox \
            srv/focus-flow/02_projects \
            srv/focus-flow/03_areas \
            srv/focus-flow/04_resources \
            srv/focus-flow/05_archive \
            srv/focus-flow/06_templates \
            2>/dev/null || log_warning "Current vault backup failed"
    fi

    # Extract vault backup
    if [[ "$vault_backup" == *.gz ]]; then
        tar -xzf "$vault_backup" -C / 2>/dev/null || error_exit "Failed to extract vault backup"
    else
        tar -xf "$vault_backup" -C / 2>/dev/null || error_exit "Failed to extract vault backup"
    fi

    log_success "Vault data restored"
}

restore_system_configs() {
    log_step "Restoring system configurations"

    local config_backup="${BACKUP_DIR}/${BACKUP_NAME}-config.tar.gz"

    if [[ ! -f "$config_backup" ]]; then
        config_backup="${BACKUP_DIR}/${BACKUP_NAME}-config.tar"
    fi

    if [[ ! -f "$config_backup" ]]; then
        log_warning "No config backup found in $BACKUP_NAME"
        return
    fi

    log_info "Extracting configuration data..."

    # Extract config backup
    if [[ "$config_backup" == *.gz ]]; then
        tar -xzf "$config_backup" -C / 2>/dev/null || error_exit "Failed to extract config backup"
    else
        tar -xf "$config_backup" -C / 2>/dev/null || error_exit "Failed to extract config backup"
    fi

    # Set proper permissions
    chmod 700 "$SECRETS_DIR"
    find "$SECRETS_DIR" -type f -exec chmod 600 {} \; 2>/dev/null || true

    log_success "System configurations restored"
}

restore_docker_volumes() {
    log_step "Restoring Docker volumes"

    local docker_backup="${BACKUP_DIR}/${BACKUP_NAME}-docker.tar.gz"

    if [[ ! -f "$docker_backup" ]]; then
        docker_backup="${BACKUP_DIR}/${BACKUP_NAME}-docker.tar"
    fi

    if [[ ! -f "$docker_backup" ]]; then
        log_warning "No Docker backup found in $BACKUP_NAME"
        return
    fi

    log_info "Extracting Docker volume data..."

    # Create temporary directory
    local temp_dir=$(mktemp -d)
    trap "rm -rf $temp_dir" EXIT

    # Extract backup
    if [[ "$docker_backup" == *.gz ]]; then
        tar -xzf "$docker_backup" -C "$temp_dir" 2>/dev/null || error_exit "Failed to extract Docker backup"
    else
        tar -xf "$docker_backup" -C "$temp_dir" 2>/dev/null || error_exit "Failed to extract Docker backup"
    fi

    # Restore each volume
    for volume_dir in "$temp_dir"/*; do
        if [[ -d "$volume_dir" ]] && [[ -f "${volume_dir}/data.tar.gz" ]]; then
            local volume_name=$(basename "$volume_dir")
            log_info "Restoring volume: $volume_name"

            # Recreate volume if it doesn't exist
            docker volume create "$volume_name" >/dev/null 2>&1 || true

            # Restore data using temporary container
            docker run --rm \
                -v "${volume_name}:/data" \
                -v "${volume_dir}:/backup:ro" \
                alpine sh -c "rm -rf /data/* && tar -xzf /backup/data.tar.gz -C /data" \
                2>/dev/null || log_warning "Failed to restore volume $volume_name"

            log_success "Volume $volume_name restored"
        fi
    done

    log_success "Docker volumes restored"
}

restore_env_files() {
    log_step "Restoring environment files"

    local env_backup="${BACKUP_DIR}/${BACKUP_NAME}-env.tar.gz"

    if [[ ! -f "$env_backup" ]]; then
        env_backup="${BACKUP_DIR}/${BACKUP_NAME}-env.tar"
    fi

    if [[ ! -f "$env_backup" ]]; then
        log_info "No environment files backup found"
        return
    fi

    log_info "Extracting environment files..."

    # Extract env backup
    if [[ "$env_backup" == *.gz ]]; then
        tar -xzf "$env_backup" -C / 2>/dev/null || log_warning "Some .env files may have failed"
    else
        tar -xf "$env_backup" -C / 2>/dev/null || log_warning "Some .env files may have failed"
    fi

    # Set proper permissions
    find "${FOCUS_FLOW_ROOT}/02_projects" -name ".env*" -type f -exec chmod 600 {} \; 2>/dev/null || true

    log_success "Environment files restored"
}

set_permissions() {
    log_step "Setting proper permissions"

    # Directory permissions: 750
    find "${FOCUS_FLOW_ROOT}" -type d -exec chmod 750 {} \; 2>/dev/null || true

    # Secrets directory: 700
    chmod 700 "${SECRETS_DIR}" 2>/dev/null || true

    # File permissions: 640
    find "${FOCUS_FLOW_ROOT}" -type f ! -path "${SECRETS_DIR}/*" -exec chmod 640 {} \; 2>/dev/null || true

    # Secrets files: 600
    find "${SECRETS_DIR}" -type f -exec chmod 600 {} \; 2>/dev/null || true

    # Scripts: executable
    find "${SYSTEM_DIR}/scripts" -type f -name "*.sh" -exec chmod 750 {} \; 2>/dev/null || true

    log_success "Permissions set"
}

verify_restore() {
    log_step "Verifying restore"

    local issues=0

    # Check key directories
    local required_dirs=("01_inbox" "02_projects" "03_areas" "04_resources" "05_archive" "06_templates" "07_system")

    for dir in "${required_dirs[@]}"; do
        if [[ -d "${FOCUS_FLOW_ROOT}/${dir}" ]]; then
            log_success "Directory exists: $dir"
        else
            log_warning "Directory missing: $dir"
            ((issues++))
        fi
    done

    # Check critical files
    if [[ -f "${CONFIG_DIR}/docker-compose.yml" ]]; then
        log_success "docker-compose.yml exists"
    else
        log_warning "docker-compose.yml missing"
        ((issues++))
    fi

    # Check Docker volumes if restored
    if [[ "$RESTORE_TYPE" =~ (full|docker-only) ]]; then
        local volumes=("openclaw-sessions" "qdrant-data" "mem0-data" "coolify-data")
        for volume in "${volumes[@]}"; do
            if docker volume inspect "$volume" >/dev/null 2>&1; then
                log_success "Volume exists: $volume"
            else
                log_warning "Volume missing: $volume"
            fi
        done
    fi

    if [[ $issues -gt 0 ]]; then
        log_warning "Restore completed with $issues issues"
    else
        log_success "Restore verification passed"
    fi
}

display_summary() {
    log_step "Restore Complete"

    echo
    echo -e "${GREEN}${BOLD}================================${NC}"
    echo -e "${GREEN}${BOLD}  Restore Summary${NC}"
    echo -e "${GREEN}${BOLD}================================${NC}"
    echo

    echo -e "${CYAN}${BOLD}Restore Details:${NC}"
    echo -e "  Backup:    ${BLUE}${BACKUP_NAME}${NC}"
    echo -e "  Type:      ${BLUE}${RESTORE_TYPE}${NC}"
    echo -e "  Timestamp: ${BLUE}$(date)${NC}"
    echo

    echo -e "${CYAN}${BOLD}What was restored:${NC}"
    case $RESTORE_TYPE in
        full)
            echo -e "  ${GREEN}✓${NC} Vault data (PARA structure)"
            echo -e "  ${GREEN}✓${NC} System configurations"
            echo -e "  ${GREEN}✓${NC} Docker volumes"
            echo -e "  ${GREEN}✓${NC} Environment files"
            ;;
        vault-only)
            echo -e "  ${GREEN}✓${NC} Vault data (PARA structure)"
            echo -e "  ${GREEN}✓${NC} Environment files"
            ;;
        config-only)
            echo -e "  ${GREEN}✓${NC} System configurations"
            echo -e "  ${GREEN}✓${NC} Secrets"
            ;;
        docker-only)
            echo -e "  ${GREEN}✓${NC} Docker volumes"
            echo -e "  ${GREEN}✓${NC} System configurations"
            ;;
    esac

    echo

    echo -e "${CYAN}${BOLD}Next Steps:${NC}"
    echo -e "  1. Verify all services are running: ${BLUE}docker ps${NC}"
    echo -e "  2. Check logs for any errors: ${BLUE}docker-compose logs${NC}"
    echo -e "  3. Test access to all services"
    echo -e "  4. Review restored vault data"
    echo

    if [[ -d "${BACKUP_DIR}" ]]; then
        echo -e "${YELLOW}Pre-restore backup available in:${NC}"
        echo -e "  ${BLUE}${BACKUP_DIR}/pre-restore-*${NC}"
        echo
    fi
}

################################################################################
# Main Execution
################################################################################

show_usage() {
    cat << EOF
Usage: $0 [BACKUP_NAME] [OPTIONS]

Focus Flow OS Restore Script

ARGUMENTS:
    BACKUP_NAME             Name of backup to restore (without file extensions)
                           Use --list to see available backups

OPTIONS:
    -h, --help              Show this help message
    -l, --list              List available backups
    -t, --type TYPE         Restore type: full, vault-only, docker-only, config-only
                           (default: full)
    -y, --yes               Skip confirmation prompts
    -k, --keep-running      Don't stop services during restore
    --no-verify             Skip checksum verification

EXAMPLES:
    $0 --list                              List available backups
    $0 focus-flow-full-20260203-120000     Restore full backup
    $0 my-backup -t vault-only             Restore only vault data
    $0 backup-name -y                      Restore without confirmation

EOF
}

parse_arguments() {
    # Check if first argument is a flag
    if [[ $# -gt 0 ]] && [[ ! "$1" =~ ^- ]]; then
        BACKUP_NAME="$1"
        shift
    fi

    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -l|--list)
                list_available_backups
                exit 0
                ;;
            -t|--type)
                RESTORE_TYPE="$2"
                shift 2
                ;;
            -y|--yes)
                SKIP_CONFIRMATION=true
                shift
                ;;
            -k|--keep-running)
                STOP_SERVICES=false
                shift
                ;;
            --no-verify)
                VERIFY_CHECKSUMS=false
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    # Validate restore type
    if [[ ! "$RESTORE_TYPE" =~ ^(full|vault-only|docker-only|config-only)$ ]]; then
        error_exit "Invalid restore type: $RESTORE_TYPE"
    fi

    # Ensure backup name is provided
    if [[ -z "$BACKUP_NAME" ]]; then
        log_error "No backup name provided"
        list_available_backups
        echo
        echo -e "${YELLOW}Please specify a backup name to restore${NC}"
        exit 1
    fi
}

main() {
    parse_arguments "$@"

    check_root
    check_dependencies

    mkdir -p "${LOGS_DIR}"

    log "=========================================="
    log "Focus Flow OS - Restore"
    log "Started at $(date)"
    log "=========================================="

    echo -e "${CYAN}${BOLD}"
    cat << "EOF"
    ╦═╗╔═╗╔═╗╔╦╗╔═╗╦═╗╔═╗
    ╠╦╝║╣ ╚═╗ ║ ║ ║╠╦╝║╣
    ╩╚═╚═╝╚═╝ ╩ ╚═╝╩╚═╚═╝
      Focus Flow OS Restore v1.0.0
EOF
    echo -e "${NC}"

    verify_backup_integrity
    confirm_restore
    stop_services

    case $RESTORE_TYPE in
        full)
            restore_vault_data
            restore_system_configs
            restore_docker_volumes
            restore_env_files
            ;;
        vault-only)
            restore_vault_data
            restore_env_files
            ;;
        config-only)
            restore_system_configs
            ;;
        docker-only)
            restore_docker_volumes
            restore_system_configs
            ;;
    esac

    set_permissions
    start_services
    verify_restore
    display_summary

    log "=========================================="
    log "Restore completed successfully at $(date)"
    log "=========================================="
}

# Run main function
main "$@"
