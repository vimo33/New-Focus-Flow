#!/bin/bash

# Focus Flow Docker Compose Setup Validator
# Checks if all prerequisites are met before starting services

set -e

echo "=== Focus Flow Setup Validator ==="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to check file exists
check_file() {
    local file=$1
    local description=$2
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description exists: $file"
    else
        echo -e "${RED}✗${NC} $description missing: $file"
        ((ERRORS++))
    fi
}

# Function to check directory exists
check_dir() {
    local dir=$1
    local description=$2
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} $description exists: $dir"
    else
        echo -e "${RED}✗${NC} $description missing: $dir"
        ((ERRORS++))
    fi
}

# Function to check secret file
check_secret() {
    local file=$1
    local description=$2
    if [ -f "$file" ]; then
        local content=$(cat "$file" 2>/dev/null || echo "")
        if [ -z "$content" ]; then
            echo -e "${YELLOW}⚠${NC} $description is empty: $file"
            ((WARNINGS++))
        elif [[ "$content" == "placeholder-"* ]]; then
            echo -e "${YELLOW}⚠${NC} $description is placeholder (needs real value): $file"
            ((WARNINGS++))
        else
            echo -e "${GREEN}✓${NC} $description configured: $file"
        fi
        # Check permissions
        local perms=$(stat -c "%a" "$file" 2>/dev/null || stat -f "%OLp" "$file" 2>/dev/null)
        if [ "$perms" != "600" ]; then
            echo -e "${YELLOW}⚠${NC} $description has incorrect permissions ($perms, should be 600): $file"
            ((WARNINGS++))
        fi
    else
        echo -e "${RED}✗${NC} $description missing: $file"
        ((ERRORS++))
    fi
}

echo "1. Checking Docker Compose Configuration"
echo "----------------------------------------"
check_file "/srv/focus-flow/07_system/config/docker-compose-full.yml" "Docker Compose file"
echo ""

echo "2. Checking Secrets"
echo "-------------------"
check_secret "/srv/focus-flow/07_system/secrets/anthropic_api_key.txt" "Anthropic API key"
check_secret "/srv/focus-flow/07_system/secrets/openai_api_key.txt" "OpenAI API key"
check_secret "/srv/focus-flow/07_system/secrets/telegram_bot_token.txt" "Telegram bot token"
echo ""

echo "3. Checking Environment Files"
echo "------------------------------"
check_file "/srv/focus-flow/02_projects/active/focus-flow-backend/.env" "Backend .env"
check_file "/srv/focus-flow/02_projects/active/focus-flow-ui/.env" "Frontend .env"
check_file "/srv/focus-flow/02_projects/active/focus-flow-telegram-bot/.env" "Telegram bot .env"
echo ""

echo "4. Checking Dockerfiles"
echo "-----------------------"
check_file "/srv/focus-flow/02_projects/active/focus-flow-backend/Dockerfile" "Backend Dockerfile"
check_file "/srv/focus-flow/02_projects/active/focus-flow-ui/Dockerfile" "Frontend Dockerfile"
check_file "/srv/focus-flow/02_projects/active/focus-flow-telegram-bot/Dockerfile" "Telegram bot Dockerfile"
echo ""

echo "5. Checking Project Directories"
echo "--------------------------------"
check_dir "/srv/focus-flow/02_projects/active/focus-flow-backend" "Backend project"
check_dir "/srv/focus-flow/02_projects/active/focus-flow-ui" "Frontend project"
check_dir "/srv/focus-flow/02_projects/active/focus-flow-telegram-bot" "Telegram bot project"
echo ""

echo "6. Checking Docker"
echo "------------------"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker is installed"
    if docker ps &> /dev/null; then
        echo -e "${GREEN}✓${NC} Docker daemon is running"
    else
        echo -e "${RED}✗${NC} Docker daemon is not running"
        ((ERRORS++))
    fi
else
    echo -e "${RED}✗${NC} Docker is not installed"
    ((ERRORS++))
fi

if command -v docker compose &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker Compose is installed"
else
    echo -e "${RED}✗${NC} Docker Compose is not installed"
    ((ERRORS++))
fi
echo ""

echo "7. Validating Docker Compose Syntax"
echo "------------------------------------"
cd /srv/focus-flow/07_system/config
if docker compose -f docker-compose-full.yml config --quiet 2>&1 | grep -v "version.*obsolete" > /dev/null; then
    echo -e "${RED}✗${NC} Docker Compose configuration has errors"
    docker compose -f docker-compose-full.yml config --quiet
    ((ERRORS++))
else
    echo -e "${GREEN}✓${NC} Docker Compose configuration is valid"
fi
echo ""

echo "8. Checking Required Ports"
echo "--------------------------"
check_port() {
    local port=$1
    local service=$2
    if lsof -i:$port &> /dev/null || netstat -tuln 2>/dev/null | grep -q ":$port "; then
        echo -e "${YELLOW}⚠${NC} Port $port is already in use (needed for $service)"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✓${NC} Port $port is available ($service)"
    fi
}

check_port 3001 "backend"
check_port 5173 "frontend"
check_port 3000 "openclaw"
check_port 6333 "qdrant"
check_port 8050 "mem0"
check_port 8000 "coolify"
echo ""

# Summary
echo "========================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "You can start Focus Flow with:"
    echo "  cd /srv/focus-flow/07_system/config"
    echo "  docker compose -f docker-compose-full.yml up -d"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Validation completed with $WARNINGS warning(s)${NC}"
    echo ""
    echo "You can start Focus Flow, but review the warnings above."
    echo "  cd /srv/focus-flow/07_system/config"
    echo "  docker compose -f docker-compose-full.yml up -d"
    exit 0
else
    echo -e "${RED}✗ Validation failed with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo ""
    echo "Please fix the errors above before starting Focus Flow."
    exit 1
fi
