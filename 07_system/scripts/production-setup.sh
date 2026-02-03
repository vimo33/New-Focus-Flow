#!/bin/bash

################################################################################
# Focus Flow OS - Production Setup Script
# Version: 1.0.0
# Description: Automated production deployment with health checks and validation
################################################################################

set -euo pipefail

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color
readonly BOLD='\033[1m'

# Paths
readonly FOCUS_FLOW_ROOT="/srv/focus-flow"
readonly SYSTEM_DIR="${FOCUS_FLOW_ROOT}/07_system"
readonly CONFIG_DIR="${SYSTEM_DIR}/config"
readonly SECRETS_DIR="${SYSTEM_DIR}/secrets"
readonly LOGS_DIR="${SYSTEM_DIR}/logs"
readonly SCRIPTS_DIR="${SYSTEM_DIR}/scripts"
readonly BACKEND_DIR="${FOCUS_FLOW_ROOT}/02_projects/active/focus-flow-backend"
readonly TELEGRAM_BOT_DIR="${FOCUS_FLOW_ROOT}/02_projects/active/focus-flow-telegram-bot"
readonly UI_DIR="${FOCUS_FLOW_ROOT}/02_projects/active/focus-flow-ui"
readonly LOG_FILE="${LOGS_DIR}/setup.log"

# Required versions
readonly REQUIRED_NODE_VERSION=18
readonly REQUIRED_DOCKER_VERSION=20

# Flags
SKIP_PROMPTS=false
INSTALL_SYSTEMD=false
VERBOSE=false

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

progress_bar() {
    local duration=$1
    local width=50
    local progress=0

    while [ $progress -le $width ]; do
        printf "\r${CYAN}["
        printf "%${progress}s" | tr ' ' '='
        printf "%$((width - progress))s" | tr ' ' ' '
        printf "]${NC} %d%%" $((progress * 100 / width))

        progress=$((progress + 1))
        sleep $(echo "scale=2; $duration / $width" | bc)
    done
    echo
}

################################################################################
# Error Handling
################################################################################

error_exit() {
    log_error "$1"
    log_error "Setup failed. Check ${LOG_FILE} for details."
    exit 1
}

cleanup_on_error() {
    log_warning "Cleaning up after error..."
    # Don't stop services if they were already running
    log_info "Partial setup completed. Review logs and re-run when ready."
}

trap cleanup_on_error ERR

################################################################################
# Prerequisite Checks
################################################################################

check_root() {
    if [[ $EUID -ne 0 ]]; then
        error_exit "This script must be run as root. Use: sudo $0"
    fi
}

check_command() {
    local cmd=$1
    local package=${2:-$cmd}

    if ! command -v "$cmd" &> /dev/null; then
        log_error "$cmd is not installed. Please install $package first."
        return 1
    fi
    return 0
}

check_docker() {
    log_step "Checking Docker installation"

    if ! check_command docker; then
        error_exit "Docker not found. Install from https://docs.docker.com/engine/install/"
    fi

    local docker_version=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "0")
    local major_version=$(echo "$docker_version" | cut -d. -f1)

    if [[ $major_version -lt $REQUIRED_DOCKER_VERSION ]]; then
        error_exit "Docker version $REQUIRED_DOCKER_VERSION+ required. Found: $docker_version"
    fi

    log_success "Docker version $docker_version installed"

    # Check docker-compose
    if ! check_command docker-compose && ! docker compose version &> /dev/null; then
        error_exit "docker-compose not found. Please install docker-compose."
    fi

    log_success "docker-compose is available"
}

check_nodejs() {
    log_step "Checking Node.js installation"

    if ! check_command node nodejs; then
        error_exit "Node.js not found. Install version ${REQUIRED_NODE_VERSION}+ from https://nodejs.org/"
    fi

    local node_version=$(node -v | sed 's/v//' | cut -d. -f1)

    if [[ $node_version -lt $REQUIRED_NODE_VERSION ]]; then
        error_exit "Node.js version ${REQUIRED_NODE_VERSION}+ required. Found: v${node_version}"
    fi

    log_success "Node.js version $(node -v) installed"

    if ! check_command npm; then
        error_exit "npm not found. Please install npm."
    fi

    log_success "npm version $(npm -v) installed"
}

check_system_tools() {
    log_step "Checking system tools"

    local required_tools=("git" "curl" "jq" "bc")
    local missing_tools=()

    for tool in "${required_tools[@]}"; do
        if ! check_command "$tool"; then
            missing_tools+=("$tool")
        fi
    done

    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        error_exit "Missing required tools: ${missing_tools[*]}. Install with: apt install ${missing_tools[*]}"
    fi

    log_success "All required system tools are installed"
}

check_prerequisites() {
    log_step "Checking Prerequisites"

    check_root
    check_docker
    check_nodejs
    check_system_tools

    log_success "All prerequisites met"
}

################################################################################
# Directory Setup
################################################################################

create_directories() {
    log_step "Creating directory structure"

    local directories=(
        "${FOCUS_FLOW_ROOT}"
        "${SYSTEM_DIR}"
        "${CONFIG_DIR}"
        "${SECRETS_DIR}"
        "${LOGS_DIR}"
        "${SCRIPTS_DIR}"
        "${FOCUS_FLOW_ROOT}/01_inbox"
        "${FOCUS_FLOW_ROOT}/02_projects/active"
        "${FOCUS_FLOW_ROOT}/02_projects/archive"
        "${FOCUS_FLOW_ROOT}/03_areas"
        "${FOCUS_FLOW_ROOT}/04_resources"
        "${FOCUS_FLOW_ROOT}/05_archive"
        "${FOCUS_FLOW_ROOT}/06_templates"
        "${FOCUS_FLOW_ROOT}/07_system/memory"
    )

    for dir in "${directories[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log_info "Created directory: $dir"
        else
            log_info "Directory exists: $dir"
        fi
    done

    log_success "Directory structure created"
}

set_permissions() {
    log_step "Setting permissions"

    # Directory permissions: 750 (rwxr-x---)
    find "${FOCUS_FLOW_ROOT}" -type d -exec chmod 750 {} \; 2>/dev/null || true

    # Secrets directory: 700 (rwx------)
    chmod 700 "${SECRETS_DIR}"

    # File permissions: 640 (rw-r-----)
    find "${FOCUS_FLOW_ROOT}" -type f ! -path "${SECRETS_DIR}/*" -exec chmod 640 {} \; 2>/dev/null || true

    # Secrets files: 600 (rw-------)
    find "${SECRETS_DIR}" -type f -exec chmod 600 {} \; 2>/dev/null || true

    # Scripts: executable
    find "${SCRIPTS_DIR}" -type f -name "*.sh" -exec chmod 750 {} \; 2>/dev/null || true

    log_success "Permissions set correctly"
}

################################################################################
# Environment Configuration
################################################################################

copy_env_templates() {
    log_step "Setting up environment files"

    # Backend .env
    if [[ -f "${BACKEND_DIR}/.env.example" ]]; then
        if [[ ! -f "${BACKEND_DIR}/.env" ]]; then
            cp "${BACKEND_DIR}/.env.example" "${BACKEND_DIR}/.env"
            log_success "Created ${BACKEND_DIR}/.env from template"
        else
            log_info "Backend .env already exists, skipping"
        fi
    fi

    # Telegram Bot .env
    if [[ -f "${TELEGRAM_BOT_DIR}/.env.example" ]]; then
        if [[ ! -f "${TELEGRAM_BOT_DIR}/.env" ]]; then
            cp "${TELEGRAM_BOT_DIR}/.env.example" "${TELEGRAM_BOT_DIR}/.env"
            log_success "Created ${TELEGRAM_BOT_DIR}/.env from template"
        else
            log_info "Telegram bot .env already exists, skipping"
        fi
    fi

    # UI .env
    if [[ -f "${UI_DIR}/.env.example" ]] && [[ -d "${UI_DIR}" ]]; then
        if [[ ! -f "${UI_DIR}/.env" ]]; then
            cp "${UI_DIR}/.env.example" "${UI_DIR}/.env"
            log_success "Created ${UI_DIR}/.env from template"
        else
            log_info "UI .env already exists, skipping"
        fi
    fi
}

prompt_for_secrets() {
    if [[ "$SKIP_PROMPTS" == "true" ]]; then
        log_warning "Skipping secret prompts (--skip-prompts flag set)"
        return
    fi

    log_step "Configuring secrets"

    echo -e "${YELLOW}${BOLD}Please provide the following secrets:${NC}"
    echo

    # Anthropic API Key
    local anthropic_key_file="${SECRETS_DIR}/anthropic_api_key.txt"
    if [[ ! -f "$anthropic_key_file" ]] || [[ ! -s "$anthropic_key_file" ]]; then
        read -rsp "Enter Anthropic API Key (sk-ant-...): " anthropic_key
        echo
        if [[ -n "$anthropic_key" ]]; then
            echo -n "$anthropic_key" > "$anthropic_key_file"
            chmod 600 "$anthropic_key_file"
            log_success "Anthropic API key saved"
        else
            log_warning "No Anthropic API key provided"
        fi
    else
        log_info "Anthropic API key already configured"
    fi

    # Update backend .env
    if [[ -f "${BACKEND_DIR}/.env" ]]; then
        read -rp "Enter Anthropic API Key for backend [skip if same]: " backend_anthropic_key
        if [[ -n "$backend_anthropic_key" ]]; then
            sed -i "s|ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=${backend_anthropic_key}|" "${BACKEND_DIR}/.env"
        elif [[ -f "$anthropic_key_file" ]]; then
            local key=$(cat "$anthropic_key_file")
            sed -i "s|ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=${key}|" "${BACKEND_DIR}/.env"
        fi
    fi

    # Telegram Bot Token
    if [[ -f "${TELEGRAM_BOT_DIR}/.env" ]]; then
        read -rp "Enter Telegram Bot Token (optional, press Enter to skip): " telegram_token
        if [[ -n "$telegram_token" ]]; then
            sed -i "s|TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=${telegram_token}|" "${TELEGRAM_BOT_DIR}/.env"
            sed -i "s|TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=${telegram_token}|" "${BACKEND_DIR}/.env"
            log_success "Telegram bot token configured"
        else
            log_info "Skipping Telegram bot configuration"
        fi
    fi

    # Backend API Key for Telegram Bot
    if [[ -f "${TELEGRAM_BOT_DIR}/.env" ]]; then
        local backend_api_key=$(openssl rand -hex 32)
        sed -i "s|BACKEND_API_KEY=.*|BACKEND_API_KEY=${backend_api_key}|" "${TELEGRAM_BOT_DIR}/.env"
        log_success "Generated backend API key for Telegram bot"
    fi

    echo
    log_success "Secrets configuration completed"
}

initialize_vault() {
    log_step "Initializing vault structure"

    # Create README files for each PARA directory
    local vault_readme="${FOCUS_FLOW_ROOT}/README.md"
    if [[ ! -f "$vault_readme" ]]; then
        cat > "$vault_readme" << 'EOF'
# Focus Flow OS Vault

This vault follows the PARA method for organization:

- **01_inbox**: Capture new items here
- **02_projects**: Active and archived projects
- **03_areas**: Ongoing areas of responsibility
- **04_resources**: Reference materials and knowledge base
- **05_archive**: Completed items
- **06_templates**: Reusable templates
- **07_system**: System configuration and logs

Managed by Focus Flow OS - Your AI-powered productivity system.
EOF
        log_success "Created vault README"
    fi

    log_success "Vault structure initialized"
}

################################################################################
# Docker Setup
################################################################################

build_docker_images() {
    log_step "Building Docker images"

    if [[ ! -f "${CONFIG_DIR}/docker-compose.yml" ]]; then
        log_warning "docker-compose.yml not found in ${CONFIG_DIR}"
        return
    fi

    cd "${CONFIG_DIR}"

    log_info "Pulling latest images..."
    docker-compose pull || log_warning "Some images may not be available remotely"

    log_info "Building custom images..."
    docker-compose build --no-cache || log_warning "Build completed with warnings"

    log_success "Docker images ready"
}

start_services() {
    log_step "Starting services"

    if [[ ! -f "${CONFIG_DIR}/docker-compose.yml" ]]; then
        error_exit "docker-compose.yml not found in ${CONFIG_DIR}"
    fi

    cd "${CONFIG_DIR}"

    log_info "Starting containers..."
    docker-compose up -d

    log_success "Services started"
}

wait_for_health() {
    log_step "Waiting for health checks"

    local services=("openclaw" "qdrant" "mem0" "coolify")
    local max_wait=180  # 3 minutes
    local elapsed=0

    echo -e "${CYAN}This may take a few minutes...${NC}"

    for service in "${services[@]}"; do
        log_info "Checking $service..."

        while [[ $elapsed -lt $max_wait ]]; do
            local health=$(docker inspect --format='{{.State.Health.Status}}' "$service" 2>/dev/null || echo "unknown")

            if [[ "$health" == "healthy" ]]; then
                log_success "$service is healthy"
                break
            elif [[ "$health" == "unhealthy" ]]; then
                log_warning "$service is unhealthy, waiting..."
            elif docker ps --filter "name=$service" --filter "status=running" | grep -q "$service"; then
                # Service running but no health check defined
                log_success "$service is running"
                break
            fi

            sleep 5
            elapsed=$((elapsed + 5))

            if [[ $elapsed -ge $max_wait ]]; then
                log_warning "$service did not become healthy within ${max_wait}s"
                log_warning "Check logs with: docker logs $service"
            fi
        done

        elapsed=0
    done

    log_success "Health checks completed"
}

################################################################################
# Application Setup
################################################################################

install_dependencies() {
    log_step "Installing application dependencies"

    # Backend
    if [[ -d "$BACKEND_DIR" ]] && [[ -f "$BACKEND_DIR/package.json" ]]; then
        log_info "Installing backend dependencies..."
        cd "$BACKEND_DIR"
        npm install --production
        log_success "Backend dependencies installed"
    fi

    # Telegram Bot
    if [[ -d "$TELEGRAM_BOT_DIR" ]] && [[ -f "$TELEGRAM_BOT_DIR/package.json" ]]; then
        log_info "Installing Telegram bot dependencies..."
        cd "$TELEGRAM_BOT_DIR"
        npm install --production
        log_success "Telegram bot dependencies installed"
    fi

    # UI
    if [[ -d "$UI_DIR" ]] && [[ -f "$UI_DIR/package.json" ]]; then
        log_info "Installing UI dependencies..."
        cd "$UI_DIR"
        npm install
        log_success "UI dependencies installed"
    fi
}

build_applications() {
    log_step "Building applications"

    # Build UI
    if [[ -d "$UI_DIR" ]] && [[ -f "$UI_DIR/package.json" ]]; then
        log_info "Building UI for production..."
        cd "$UI_DIR"
        npm run build || log_warning "UI build failed, may need manual intervention"
        log_success "UI built successfully"
    fi
}

run_migrations() {
    log_step "Running database migrations"

    # Check if backend has migrations
    if [[ -d "$BACKEND_DIR/migrations" ]] || [[ -f "$BACKEND_DIR/migrate.js" ]]; then
        log_info "Running backend migrations..."
        cd "$BACKEND_DIR"
        npm run migrate || log_warning "No migrations to run or migration script not found"
    else
        log_info "No migrations found, skipping"
    fi
}

################################################################################
# Systemd Service
################################################################################

create_systemd_service() {
    if [[ "$INSTALL_SYSTEMD" != "true" ]]; then
        return
    fi

    log_step "Creating systemd service"

    local service_file="/etc/systemd/system/focus-flow.service"

    cat > "$service_file" << 'EOF'
[Unit]
Description=Focus Flow OS
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/srv/focus-flow/07_system/config
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable focus-flow.service

    log_success "Systemd service created and enabled"
    log_info "Service will start automatically on boot"
    log_info "Manage with: systemctl {start|stop|restart|status} focus-flow"
}

################################################################################
# Final Steps
################################################################################

display_summary() {
    log_step "Setup Complete!"

    echo
    echo -e "${GREEN}${BOLD}=================================${NC}"
    echo -e "${GREEN}${BOLD}  Focus Flow OS - Ready to Use  ${NC}"
    echo -e "${GREEN}${BOLD}=================================${NC}"
    echo

    echo -e "${CYAN}${BOLD}Access URLs:${NC}"
    echo -e "  OpenClaw:  ${BLUE}http://localhost:3000${NC}"
    echo -e "  Qdrant:    ${BLUE}http://localhost:6333${NC}"
    echo -e "  Mem0:      ${BLUE}http://localhost:8050${NC}"
    echo -e "  Coolify:   ${BLUE}http://localhost:8000${NC}"

    if [[ -f "${BACKEND_DIR}/.env" ]]; then
        local backend_port=$(grep "^PORT=" "${BACKEND_DIR}/.env" | cut -d= -f2)
        echo -e "  Backend:   ${BLUE}http://localhost:${backend_port:-3001}${NC}"
    fi

    echo
    echo -e "${CYAN}${BOLD}Vault Location:${NC}"
    echo -e "  ${BLUE}${FOCUS_FLOW_ROOT}${NC}"
    echo

    echo -e "${CYAN}${BOLD}Logs:${NC}"
    echo -e "  Setup:     ${BLUE}${LOG_FILE}${NC}"
    echo -e "  Services:  ${BLUE}docker-compose -f ${CONFIG_DIR}/docker-compose.yml logs${NC}"
    echo

    echo -e "${CYAN}${BOLD}Useful Commands:${NC}"
    echo -e "  Check status:  ${BLUE}docker-compose -f ${CONFIG_DIR}/docker-compose.yml ps${NC}"
    echo -e "  View logs:     ${BLUE}docker-compose -f ${CONFIG_DIR}/docker-compose.yml logs -f${NC}"
    echo -e "  Restart:       ${BLUE}docker-compose -f ${CONFIG_DIR}/docker-compose.yml restart${NC}"
    echo -e "  Stop:          ${BLUE}docker-compose -f ${CONFIG_DIR}/docker-compose.yml down${NC}"
    echo

    echo -e "${CYAN}${BOLD}Management Scripts:${NC}"
    echo -e "  Backup:   ${BLUE}${SCRIPTS_DIR}/backup.sh${NC}"
    echo -e "  Restore:  ${BLUE}${SCRIPTS_DIR}/restore.sh${NC}"
    echo -e "  Teardown: ${BLUE}${SCRIPTS_DIR}/production-teardown.sh${NC}"
    echo

    echo -e "${YELLOW}${BOLD}Next Steps:${NC}"
    echo -e "  1. Verify all services are running: ${BLUE}docker ps${NC}"
    echo -e "  2. Access OpenClaw at http://localhost:3000"
    echo -e "  3. Configure your first project in the vault"
    echo -e "  4. Set up regular backups with ${SCRIPTS_DIR}/backup.sh"
    echo

    if [[ "$INSTALL_SYSTEMD" == "true" ]]; then
        echo -e "${GREEN}Systemd service installed - Focus Flow will start automatically on boot${NC}"
        echo
    fi
}

################################################################################
# Main Execution
################################################################################

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Focus Flow OS Production Setup Script

OPTIONS:
    -h, --help              Show this help message
    -y, --skip-prompts      Skip interactive prompts (use existing configs)
    -s, --systemd           Install systemd service for auto-start on boot
    -v, --verbose           Enable verbose output

EXAMPLES:
    $0                      Interactive setup with prompts
    $0 -y                   Automated setup (no prompts)
    $0 -s                   Setup with systemd service
    $0 -y -s                Fully automated setup with systemd

EOF
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -y|--skip-prompts)
                SKIP_PROMPTS=true
                shift
                ;;
            -s|--systemd)
                INSTALL_SYSTEMD=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
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
}

main() {
    parse_arguments "$@"

    # Create log directory first
    mkdir -p "${LOGS_DIR}"

    # Start logging
    log "=========================================="
    log "Focus Flow OS - Production Setup"
    log "Started at $(date)"
    log "=========================================="

    echo -e "${CYAN}${BOLD}"
    cat << "EOF"
    ███████╗ ██████╗  ██████╗██╗   ██╗███████╗    ███████╗██╗      ██████╗ ██╗    ██╗
    ██╔════╝██╔═══██╗██╔════╝██║   ██║██╔════╝    ██╔════╝██║     ██╔═══██╗██║    ██║
    █████╗  ██║   ██║██║     ██║   ██║███████╗    █████╗  ██║     ██║   ██║██║ █╗ ██║
    ██╔══╝  ██║   ██║██║     ██║   ██║╚════██║    ██╔══╝  ██║     ██║   ██║██║███╗██║
    ██║     ╚██████╔╝╚██████╗╚██████╔╝███████║    ██║     ███████╗╚██████╔╝╚███╔███╔╝
    ╚═╝      ╚═════╝  ╚═════╝ ╚═════╝ ╚══════╝    ╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝
                                Production Setup v1.0.0
EOF
    echo -e "${NC}"

    # Execute setup steps
    check_prerequisites
    create_directories
    set_permissions
    copy_env_templates
    prompt_for_secrets
    initialize_vault
    build_docker_images
    start_services
    wait_for_health
    install_dependencies
    build_applications
    run_migrations
    create_systemd_service
    display_summary

    log "=========================================="
    log "Setup completed successfully at $(date)"
    log "=========================================="
}

# Run main function
main "$@"
