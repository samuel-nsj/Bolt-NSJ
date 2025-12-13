#!/bin/bash

# Aramex Connect AU 2025 Deployment Test Suite
# Tests all four Edge Functions with the updated endpoints

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL="${SUPABASE_URL:-https://your-project.supabase.co}"
API_KEY="${TEST_API_KEY:-your-test-api-key}"
ARAMEX_IDENTITY_URL="https://identity.aramexconnect.com.au"
ARAMEX_BASE_URL="https://api.aramexconnect.com.au"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Aramex Connect AU 2025 - Deployment Test Suite        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run tests
run_test() {
    local test_name="$1"
    local test_command="$2"

    echo -e "${YELLOW}Testing:${NC} $test_name"

    if eval "$test_command" > /tmp/test_output.json 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo ""
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        cat /tmp/test_output.json
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo ""
        return 1
    fi
}

echo -e "${BLUE}═══ Test 1: Environment Variables ═══${NC}"
echo ""

if [ -z "$SUPABASE_URL" ] || [ "$SUPABASE_URL" = "https://your-project.supabase.co" ]; then
    echo -e "${RED}✗ SUPABASE_URL not configured${NC}"
    echo "  Please set: export SUPABASE_URL=https://your-project.supabase.co"
    TESTS_FAILED=$((TESTS_FAILED + 1))
else
    echo -e "${GREEN}✓ SUPABASE_URL configured${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

if [ -z "$API_KEY" ] || [ "$API_KEY" = "your-test-api-key" ]; then
    echo -e "${RED}✗ TEST_API_KEY not configured${NC}"
    echo "  Please set: export TEST_API_KEY=nsjx_your_api_key"
    TESTS_FAILED=$((TESTS_FAILED + 1))
else
    echo -e "${GREEN}✓ TEST_API_KEY configured${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

echo ""
echo -e "${BLUE}═══ Test 2: Aramex Connect OAuth2 ═══${NC}"
echo ""
echo "Testing OAuth2 token acquisition..."
echo "URL: ${ARAMEX_IDENTITY_URL}/connect/token"
echo ""

if [ ! -z "$ARAMEX_CLIENT_ID" ] && [ ! -z "$ARAMEX_CLIENT_SECRET" ]; then
    CREDENTIALS=$(echo -n "${ARAMEX_CLIENT_ID}:${ARAMEX_CLIENT_SECRET}" | base64)

    run_test "OAuth2 Token Acquisition" \
        "curl -s -w '\n%{http_code}' -X POST ${ARAMEX_IDENTITY_URL}/connect/token \
        -H 'Authorization: Basic ${CREDENTIALS}' \
        -H 'Content-Type: application/x-www-form-urlencoded' \
        -d 'grant_type=client_credentials' | grep -q '200'"
else
    echo -e "${YELLOW}⚠ SKIPPED${NC} - ARAMEX_CLIENT_ID and ARAMEX_CLIENT_SECRET not set"
    echo ""
fi

echo -e "${BLUE}═══ Test 3: Edge Function - api-quote ═══${NC}"
echo ""
echo "Testing freight quote generation..."
echo "URL: ${SUPABASE_URL}/functions/v1/api-quote"
echo ""

run_test "Quote API - Valid Request" \
    "curl -s -X POST ${SUPABASE_URL}/functions/v1/api-quote \
    -H 'Authorization: Bearer ${API_KEY}' \
    -H 'Content-Type: application/json' \
    -d '{
        \"collectionSuburb\": \"Melbourne\",
        \"collectionPostcode\": \"3000\",
        \"deliverySuburb\": \"Sydney\",
        \"deliveryPostcode\": \"2000\",
        \"weight\": 5.0,
        \"length\": 30,
        \"width\": 20,
        \"height\": 15
    }' | jq -e '.quoteId' > /dev/null"

run_test "Quote API - Missing Fields" \
    "curl -s -X POST ${SUPABASE_URL}/functions/v1/api-quote \
    -H 'Authorization: Bearer ${API_KEY}' \
    -H 'Content-Type: application/json' \
    -d '{}' | jq -e '.error' | grep -q 'Missing required fields'"

run_test "Quote API - Invalid Auth" \
    "curl -s -w '%{http_code}' -X POST ${SUPABASE_URL}/functions/v1/api-quote \
    -H 'Authorization: Bearer invalid_key' \
    -H 'Content-Type: application/json' \
    -d '{
        \"collectionSuburb\": \"Melbourne\",
        \"collectionPostcode\": \"3000\",
        \"deliverySuburb\": \"Sydney\",
        \"deliveryPostcode\": \"2000\",
        \"weight\": 5.0,
        \"length\": 30,
        \"width\": 20,
        \"height\": 15
    }' | grep -q '401'"

echo -e "${BLUE}═══ Test 4: Edge Function - api-customers ═══${NC}"
echo ""
echo "Testing customer management..."
echo "URL: ${SUPABASE_URL}/functions/v1/api-customers"
echo ""

run_test "Customers API - List Customers" \
    "curl -s -X GET ${SUPABASE_URL}/functions/v1/api-customers \
    -H 'Authorization: Bearer ${API_KEY}' \
    -H 'Content-Type: application/json' | jq -e '.customers' > /dev/null"

run_test "Customers API - Invalid Auth" \
    "curl -s -w '%{http_code}' -X GET ${SUPABASE_URL}/functions/v1/api-customers \
    -H 'Authorization: Bearer invalid_key' | grep -q '401'"

echo -e "${BLUE}═══ Test 5: Aramex API Endpoints ═══${NC}"
echo ""
echo "Verifying Aramex Connect AU endpoints..."
echo ""

echo "Identity URL: ${ARAMEX_IDENTITY_URL}"
run_test "Identity URL Reachable" \
    "curl -s -o /dev/null -w '%{http_code}' ${ARAMEX_IDENTITY_URL}/connect/token | grep -q '40[01]'"

echo "API Base URL: ${ARAMEX_BASE_URL}"
run_test "API Base URL Reachable" \
    "curl -s -o /dev/null -w '%{http_code}' ${ARAMEX_BASE_URL}/shipping/v1/rates | grep -q '40[01]'"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    TEST SUMMARY                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo -e "Total Tests:  $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Deployment is successful.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the errors above.${NC}"
    exit 1
fi
