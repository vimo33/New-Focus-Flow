#!/bin/bash

################################################################################
# Focus Flow OS - Production Teardown Script
# Version: 1.0.0
# Description: Clean uninstall of Focus Flow OS with optional data preservation
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
readonly LOGS_DIR="${SYSTEM_DIR}/logs"
readonly LOG_FILE="${LOGS_DIR}/teardown.log"
readonly BACKUP_DIR="${FOCUS_FLOW_ROOT}/backups"

# Flags
PRESERVE_DATA=false
PRESERVE_VAULT=false
REMOVE_SYSTEMD=true
SKIP_CONFIRMATION=false

################################################################################
# Logging Functions
################################################################################

log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} - $*" | tee -a "${LOG_FILE}" 2>/dev/null || echo -e "${timestamp} - $*"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*" | tee -a "${LOG_FILE}" 2>/dev/null || echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*" | tee -a "${LOG_FILE}" 2>/dev/null || echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*" | tee -a "${LOG_FILE}" 2>/dev/null || echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" | tee -a "${LOG_FILE}" 2>/dev/null || echo -e "${RED}[ERROR]${NC} $*"
}

log_step() {
    echo -e "\n${CYAN}${BOLD}==>${NC} ${BOLD}$*${NC}" | tee -a "${LOG_FILE}" 2>/dev/null || echo -e "\n${CYAN}${BOLD}==>${NC} ${BOLD}$*${NC}"
}

################################################################################
# Confirmation
################################################################################

confirm_teardown() {
    if [[ "$SKIP_CONFIRMATION" == "true" ]]; then
        return 0
    fi

    echo -e "${RED}${BOLD}"
    cat << "EOF"
    ╦ ╦╔═╗╦═╗╔╗╔╦╔╗╔╔═╗
    ║║║╠═╣╠╦╝║║║║║║║║ ╦
    ╚╩╝╩ ╩╩╚═╝╚╝╩╝╚╝╚═╝

    This will REMOVE Focus Flow OS from your system!
EOF
    echo -e "${NC}"

    echo -e "${YELLOW}The following will be removed:${NC}"
    echo -e "  - All Docker containers and images"
    echo -e "  - Docker volumes (if --preserve-data not set)"
    echo -e "  - Systemd service (if installed)"

    if [[ "$PRESERVE_VAULT" != "true" ]]; then
        echo -e "  ${RED}${BOLD}- VAULT DATA at ${FOCUS_FLOW_ROOT}${NC}"
    fi

    echo
    echo -e "${YELLOW}Data preservation settings:${NC}"
    echo -e "  Preserve Docker volumes: ${PRESERVE_DATA}"
    echo -e "  Preserve vault data: ${PRESERVE_VAULT}"
    echo

    read -rp "Are you ABSOLUTELY sure you want to continue? Type 'yes' to confirm: " confirmation

    if [[ "$confirmation" != "yes" ]]; then
        log_info "Teardown cancelled by user"
        exit 0
    fi

    echo
    read -rp "Last chance. Type 'DESTROY' to proceed: " final_confirmation

    if [[ "$final_confirmation" != "DESTROY" ]]; then
        log_info "Teardown cancelled by user"
        exit 0
    fi
}

################################################################################
# Teardown Functions
################################################################################

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root. Use: sudo $0"
        exit 1
    fi
}

create_final_backup() {
    log_step "Creating final backup before teardown"

    if [[ ! -d "$BACKUP_DIR" ]]; then
        mkdir -p "$BACKUP_DIR"
    fi

    local backup_name="final-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    local backup_path="${BACKUP_DIR}/${backup_name}"

    log_info "Creating backup at ${backup_path}"

    # Backup vault and configs
    tar -czf "$backup_path" \
        -C / \
        --exclude="${FOCUS_FLOW_ROOT}/backups" \
        --exclude="${FOCUS_FLOW_ROOT}/07_system/logs" \
        "srv/focus-flow" \
        2>/dev/null || log_warning "Backup completed with some warnings"

    if [[ -f "$backup_path" ]]; then
        log_success "Final backup created: ${backup_path}"
        echo -e "${GREEN}Backup saved to: ${backup_path}${NC}"
    else
        log_error "Failed to create backup"
    fi
}

stop_services() {
    log_step "Stopping services"

    # Stop systemd service if exists
    if systemctl is-active --quiet focus-flow.service 2>/dev/null; then
        log_info "Stopping Focus Flow systemd service..."
        systemctl stop focus-flow.service
        log_success "Systemd service stopped"
    fi

    # Stop docker-compose services
    if [[ -f "${CONFIG_DIR}/docker-compose.yml" ]]; then
        log_info "Stopping Docker containers..."
        cd "${CONFIG_DIR}"
        docker-compose down || log_warning "Some containers may not have stopped cleanly"
        log_success "Docker containers stopped"
    fi

    # Stop any manually started containers
    local focus_containers=$(docker ps -a --filter "name=openclaw" --filter "name=qdrant" --filter "name=mem0" --filter "name=coolify" -q)
    if [[ -n "$focus_containers" ]]; then
        log_info "Stopping remaining Focus Flow containers..."
        docker stop $focus_containers 2>/dev/null || true
        docker rm $focus_containers 2>/dev/null || true
    fi

    log_success "All services stopped"
}

remove_docker_resources() {
    log_step "Removing Docker resources"

    # Remove containers
    log_info "Removing containers..."
    docker ps -a --filter "name=openclaw" --filter "name=qdrant" --filter "name=mem0" --filter "name=coolify" -q | xargs -r docker rm -f 2>/dev/null || true

    # Remove images
    log_info "Removing images..."
    docker images --filter "reference=anthropics/openclaw" --filter "reference=qdrant/qdrant" --filter "reference=mem0/mem0" --filter "reference=coollabsio/coolify" -q | xargs -r docker rmi -f 2>/dev/null || true

    # Remove volumes (if not preserving)
    if [[ "$PRESERVE_DATA" != "true" ]]; then
        log_warning "Removing Docker volumes (data will be lost)..."
        docker volume ls --filter "name=openclaw" --filter "name=qdrant" --filter "name=mem0" --filter "name=coolify" -q | xargs -r docker volume rm 2>/dev/null || true
        log_success "Docker volumes removed"
    else
        log_info "Preserving Docker volumes"
    fi

    # Clean up unused resources
    log_info "Cleaning up unused Docker resources..."
    docker system prune -f 2>/dev/null || true

    log_success "Docker resources removed"
}

remove_systemd_service() {
    if [[ "$REMOVE_SYSTEMD" != "true" ]]; then
        return
    fi

    log_step "Removing systemd service"

    local service_file="/etc/systemd/system/focus-flow.service"

    if [[ -f "$service_file" ]]; then
        systemctl disable focus-flow.service 2>/dev/null || true
        rm -f "$service_file"
        systemctl daemon-reload
        log_success "Systemd service removed"
    else
        log_info "No systemd service to remove"
    fi
}

remove_application_files() {
    log_step "Removing application files"

    # Remove node_modules to free space
    find "${FOCUS_FLOW_ROOT}/02_projects" -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true

    # Remove build artifacts
    find "${FOCUS_FLOW_ROOT}/02_projects" -type d -name "dist" -exec rm -rf {} + 2>/dev/null || true
    find "${FOCUS_FLOW_ROOT}/02_projects" -type d -name "build" -exec rm -rf {} + 2>/dev/null || true

    log_success "Application files cleaned"
}

remove_vault_data() {
    if [[ "$PRESERVE_VAULT" == "true" ]]; then
        log_info "Preserving vault data at ${FOCUS_FLOW_ROOT}"
        return
    fi

    log_step "Removing vault data"

    log_warning "Removing ALL vault data at ${FOCUS_FLOW_ROOT}"

    # Remove everything except backups
    find "${FOCUS_FLOW_ROOT}" -mindepth 1 -maxdepth 1 ! -name "backups" -exec rm -rf {} + 2>/dev/null || true

    # If not preserving anything, remove the root too
    if [[ "$PRESERVE_DATA" != "true" ]]; then
        rm -rf "${FOCUS_FLOW_ROOT}"
        log_success "Vault completely removed"
    else
        log_success "Vault data removed (backups preserved)"
    fi
}

display_summary() {
    log_step "Teardown Complete"

    echo
    echo -e "${GREEN}${BOLD}================================${NC}"
    echo -e "${GREEN}${BOLD}  Focus Flow OS Removed${NC}"
    echo -e "${GREEN}${BOLD}================================${NC}"
    echo

    echo -e "${CYAN}${BOLD}What was removed:${NC}"
    echo -e "  ${GREEN}✓${NC} Docker containers stopped and removed"
    echo -e "  ${GREEN}✓${NC} Docker images removed"

    if [[ "$PRESERVE_DATA" != "true" ]]; then
        echo -e "  ${GREEN}✓${NC} Docker volumes removed"
    else
        echo -e "  ${YELLOW}○${NC} Docker volumes preserved"
    fi

    if [[ "$REMOVE_SYSTEMD" == "true" ]]; then
        echo -e "  ${GREEN}✓${NC} Systemd service removed"
    fi

    if [[ "$PRESERVE_VAULT" != "true" ]]; then
        echo -e "  ${GREEN}✓${NC} Vault data removed"
    else
        echo -e "  ${YELLOW}○${NC} Vault data preserved at ${FOCUS_FLOW_ROOT}"
    fi

    echo

    if [[ -d "$BACKUP_DIR" ]]; then
        echo -e "${CYAN}${BOLD}Backups available at:${NC}"
        echo -e "  ${BLUE}${BACKUP_DIR}${NC}"
        echo
    fi

    echo -e "${YELLOW}${BOLD}To reinstall Focus Flow OS:${NC}"
    echo -e "  Run: ${BLUE}/srv/focus-flow/07_system/scripts/production-setup.sh${NC}"
    echo

    log "=========================================="
    log "Teardown completed at $(date)"
    log "=========================================="
}

################################################################################
# Main Execution
################################################################################

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Focus Flow OS Production Teardown Script

OPTIONS:
    -h, --help              Show this help message
    -y, --yes               Skip confirmation prompts
    -d, --preserve-data     Preserve Docker volumes (database data)
    -v, --preserve-vault    Preserve vault data (PARA structure)
    -k, --keep-systemd      Keep systemd service installed
    -b, --backup            Create final backup before teardown

EXAMPLES:
    $0                      Interactive teardown (will prompt for confirmation)
    $0 -y                   Automatic teardown (no prompts)
    $0 -v                   Remove services but keep vault data
    $0 -d -v                Keep all data, only remove containers
    $0 -b -v                Backup vault and keep data

WARNING:
    Without flags, this will remove ALL Focus Flow data!
    Use -v to preserve your vault data.
    Use -d to preserve Docker volumes.

EOF
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -y|--yes)
                SKIP_CONFIRMATION=true
                shift
                ;;
            -d|--preserve-data)
                PRESERVE_DATA=true
                shift
                ;;
            -v|--preserve-vault)
                PRESERVE_VAULT=true
                shift
                ;;
            -k|--keep-systemd)
                REMOVE_SYSTEMD=false
                shift
                ;;
            -b|--backup)
                CREATE_BACKUP=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

main() {
    parse_arguments "$@"

    check_root

    # Create log directory if it exists
    mkdir -p "${LOGS_DIR}" 2>/dev/null || true

    log "=========================================="
    log "Focus Flow OS - Production Teardown"
    log "Started at $(date)"
    log "=========================================="

    echo -e "${RED}${BOLD}"
    cat << "EOF"
    ███████╗ ██████╗  ██████╗██╗   ██╗███████╗    ███████╗██╗      ██████╗ ██╗    ██╗
    ██╔════╝██╔═══██╗██╔════╝██║   ██║██╔════╝    ██╔════╝██║     ██╔═══██╗██║    ██║
    █████╗  ██║   ██║██║     ██║   ██║███████╗    █████╗  ██║     ██║   ██║██║ █╗ ██║
    ██╔══╝  ██║   ██║██║     ██║   ██║╚════██║    ██╔══╝  ██║     ██║   ██║██║███╗██║
    ██║     ╚██████╔╝╚██████╗╚██████╔╝███████║    ██║     ███████╗╚██████╔╝╚███╔███╔╝
    ╚═╝      ╚═════╝  ╚═════╝ ╚═════╝ ╚══════╝    ╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝
                             Production Teardown v1.0.0
EOF
    echo -e "${NC}"

    confirm_teardown

    if [[ "${CREATE_BACKUP:-false}" == "true" ]] || [[ "$PRESERVE_VAULT" == "true" ]]; then
        create_final_backup
    fi

    stop_services
    remove_docker_resources
    remove_systemd_service
    remove_application_files
    remove_vault_data
    display_summary
}

# Run main function
main "$@"
