#!/bin/bash

# Focus Flow Backend API Integration Tests
# Tests all 15+ endpoints

set -e

BASE_URL="http://localhost:3001"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

echo "======================================"
echo "Focus Flow Backend API Tests"
echo "======================================"
echo ""

test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_code=$5

    echo -n "Testing: $name ... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "$expected_code" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} (Expected HTTP $expected_code, got HTTP $http_code)"
        ((FAILED++))
    fi
}

echo "1. Health Check Endpoints"
echo "------------------------"
test_endpoint "Health check" "GET" "/health" "" "200"
test_endpoint "API health" "GET" "/api/health/status" "" "200"
echo ""

echo "2. Inbox Endpoints"
echo "------------------"
test_endpoint "Get inbox items" "GET" "/api/inbox" "" "200"
test_endpoint "Get inbox counts" "GET" "/api/inbox/counts" "" "200"
test_endpoint "Capture item" "POST" "/api/capture" '{"text":"Test capture item","category":"work"}' "201"
test_endpoint "Get inbox with filter" "GET" "/api/inbox?category=work" "" "200"
echo ""

echo "3. Classification Endpoints"
echo "---------------------------"
test_endpoint "AI status" "GET" "/api/ai/status" "" "200"
# Note: Classification endpoints require valid item IDs
echo ""

echo "4. Tasks Endpoints"
echo "------------------"
test_endpoint "Get tasks" "GET" "/api/tasks" "" "200"
test_endpoint "Create task" "POST" "/api/tasks" '{"title":"Test task","priority":"high"}' "201"
echo ""

echo "5. Projects Endpoints"
echo "---------------------"
test_endpoint "Get projects" "GET" "/api/projects" "" "200"
test_endpoint "Get active projects" "GET" "/api/projects?status=active" "" "200"
test_endpoint "Create project" "POST" "/api/projects" '{"title":"Test project","description":"Test"}' "201"
echo ""

echo "6. Ideas Endpoints"
echo "------------------"
test_endpoint "Get ideas" "GET" "/api/ideas" "" "200"
test_endpoint "Create idea" "POST" "/api/ideas" '{"title":"Test idea","description":"Test"}' "201"
echo ""

echo "7. Dashboard Endpoint"
echo "---------------------"
test_endpoint "Get summary" "GET" "/api/summary" "" "200"
echo ""

echo "8. Wellbeing Endpoints"
echo "----------------------"
test_endpoint "Log health data" "POST" "/api/health/log" '{"type":"mood","value":8}' "201"
echo ""

echo "======================================"
echo "Test Results"
echo "======================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
