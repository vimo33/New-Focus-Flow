#!/bin/bash

###############################################
# Focus Flow Backend API Test Suite
# Tests all implemented endpoints
###############################################

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="http://localhost:3001"
TEST_REPORT="/srv/focus-flow/07_system/logs/api-test-report.txt"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Initialize report
mkdir -p /srv/focus-flow/07_system/logs
echo "============================================" > "$TEST_REPORT"
echo "Focus Flow Backend API Test Report" >> "$TEST_REPORT"
echo "============================================" >> "$TEST_REPORT"
echo "Timestamp: $TIMESTAMP" >> "$TEST_REPORT"
echo "" >> "$TEST_REPORT"

print_header() {
    echo -e "\n${BLUE}========== $1 ==========${NC}"
    echo "" >> "$TEST_REPORT"
    echo "========== $1 ==========" >> "$TEST_REPORT"
    echo "" >> "$TEST_REPORT"
}

test_endpoint() {
    local test_name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    local test_num=$TOTAL_TESTS

    echo -n "Test $test_num: $test_name... "
    echo "Test $test_num: $test_name" >> "$TEST_REPORT"

    # Build curl command
    local curl_cmd="curl -s -w '\n%{http_code}' -X $method"
    curl_cmd="$curl_cmd -H 'Content-Type: application/json'"

    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi

    curl_cmd="$curl_cmd '$API_BASE_URL$endpoint'"

    # Execute request
    local response=$(eval $curl_cmd)
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)

    echo "  Method: $method" >> "$TEST_REPORT"
    echo "  Endpoint: $endpoint" >> "$TEST_REPORT"
    if [ -n "$data" ]; then
        echo "  Data: $data" >> "$TEST_REPORT"
    fi
    echo "  HTTP Status: $http_code" >> "$TEST_REPORT"
    echo "  Response: $body" >> "$TEST_REPORT"
    echo "" >> "$TEST_REPORT"

    # Check response
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}PASS${NC} (HTTP $http_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}FAIL${NC} (Expected HTTP $expected_status, got $http_code)"
        echo "Response Body:" >> "$TEST_REPORT"
        echo "$body" >> "$TEST_REPORT"
        echo "" >> "$TEST_REPORT"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# ============================================
# 1. HEALTH CHECK
# ============================================
print_header "1. Health Check Endpoint"
test_endpoint "Health check" "GET" "/health" "" "200"

# ============================================
# 2. INBOX - CAPTURE
# ============================================
print_header "2. Inbox - Capture"

# Generate unique ID for testing
TEST_ID="test-$(date +%s)"

test_endpoint "Capture text (valid)" "POST" "/api/capture" \
    '{"text":"Schedule dentist appointment for next week","source":"test"}' "201"

test_endpoint "Capture text with prefix" "POST" "/api/capture" \
    '{"text":"Fix bug in login flow","prefix":"🐛","source":"test"}' "201"

test_endpoint "Capture text with metadata" "POST" "/api/capture" \
    '{"text":"Call mom at 5pm","prefix":"📞","source":"test","metadata":{"priority":"high"}}' "201"

test_endpoint "Capture without text (invalid)" "POST" "/api/capture" \
    '{"source":"test"}' "400"

# ============================================
# 3. INBOX - GET & COUNTS
# ============================================
print_header "3. Inbox - Get and Counts"

test_endpoint "Get all inbox items" "GET" "/api/inbox" "" "200"

test_endpoint "Get inbox items with filter" "GET" "/api/inbox?filter=work" "" "200"

test_endpoint "Get inbox counts" "GET" "/api/inbox/counts" "" "200"

# ============================================
# 4. TASKS - CREATE, LIST, UPDATE
# ============================================
print_header "4. Tasks - Create, List, and Update"

test_endpoint "Get all tasks" "GET" "/api/tasks" "" "200"

test_endpoint "Get tasks with category filter" "GET" "/api/tasks?category=work" "" "200"

test_endpoint "Create task (valid)" "POST" "/api/tasks" \
    '{"title":"Review Q1 budget","category":"work","priority":"high","due_date":"2026-02-10"}' "201"

test_endpoint "Create task (personal)" "POST" "/api/tasks" \
    '{"title":"Go to gym","category":"personal","priority":"medium"}' "201"

test_endpoint "Create task without title (invalid)" "POST" "/api/tasks" \
    '{"category":"work"}' "400"

# ============================================
# 5. PROJECTS - CREATE & LIST
# ============================================
print_header "5. Projects - Create and List"

test_endpoint "Get all projects" "GET" "/api/projects" "" "200"

test_endpoint "Get projects with status filter" "GET" "/api/projects?status=active" "" "200"

test_endpoint "Create project (valid)" "POST" "/api/projects" \
    '{"title":"Build mobile app","description":"Create iOS and Android apps","status":"active"}' "201"

test_endpoint "Create project without title (invalid)" "POST" "/api/projects" \
    '{"description":"Test project"}' "400"

# ============================================
# 6. IDEAS - CREATE & LIST
# ============================================
print_header "6. Ideas - Create and List"

test_endpoint "Get all ideas" "GET" "/api/ideas" "" "200"

test_endpoint "Get ideas with status filter" "GET" "/api/ideas?status=inbox" "" "200"

test_endpoint "Create idea (valid)" "POST" "/api/ideas" \
    '{"title":"Habit tracking app","description":"Mobile app for daily habit tracking"}' "201"

test_endpoint "Create idea without title (invalid)" "POST" "/api/ideas" \
    '{"description":"Test idea without title"}' "400"

test_endpoint "Create idea without description (invalid)" "POST" "/api/ideas" \
    '{"title":"Test idea without description"}' "400"

# ============================================
# 7. SUMMARY
# ============================================
print_header "7. Dashboard Summary"

test_endpoint "Get dashboard summary" "GET" "/api/summary" "" "200"

# ============================================
# 8. AI ENDPOINTS
# ============================================
print_header "8. AI Endpoints"

test_endpoint "Get AI status" "GET" "/api/ai/status" "" "200"

# ============================================
# PRINT SUMMARY
# ============================================
echo ""
echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo -e "${BLUE}============================================${NC}"
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
else
    echo -e "${RED}$FAILED_TESTS test(s) failed${NC}"
fi

# Add summary to report
echo "" >> "$TEST_REPORT"
echo "============================================" >> "$TEST_REPORT"
echo "TEST SUMMARY" >> "$TEST_REPORT"
echo "============================================" >> "$TEST_REPORT"
echo "Total Tests: $TOTAL_TESTS" >> "$TEST_REPORT"
echo "Passed: $PASSED_TESTS" >> "$TEST_REPORT"
echo "Failed: $FAILED_TESTS" >> "$TEST_REPORT"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')" >> "$TEST_REPORT"
echo "============================================" >> "$TEST_REPORT"

echo ""
echo -e "${BLUE}Test report saved to: $TEST_REPORT${NC}"

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    exit 0
else
    exit 1
fi
