#!/bin/bash

# AramexConnect AU 2025 API Test Suite
# Tests all backend Edge Functions with AramexConnect AU compliant payloads

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SUPABASE_URL="${SUPABASE_URL:-https://your-project.supabase.co}"
API_KEY="${TEST_API_KEY:-your-test-api-key}"
ARAMEX_IDENTITY_URL="https://identity.aramexconnect.com.au"
ARAMEX_BASE_URL="https://api.aramexconnect.com.au"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  AramexConnect AU 2025 - Complete API Test Suite         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

TESTS_PASSED=0
TESTS_FAILED=0

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

echo -e "${BLUE}═══ Test 1: OAuth2 Token with Scope ═══${NC}"
echo ""
echo "Testing OAuth2 token acquisition with scope: ac-api-au"
echo "URL: ${ARAMEX_IDENTITY_URL}/connect/token"
echo ""

if [ ! -z "$ARAMEX_CLIENT_ID" ] && [ ! -z "$ARAMEX_CLIENT_SECRET" ]; then
    run_test "OAuth2 Token with ac-api-au scope" \
        "curl -s -X POST ${ARAMEX_IDENTITY_URL}/connect/token \
        -H 'Content-Type: application/x-www-form-urlencoded' \
        -d 'grant_type=client_credentials&client_id=${ARAMEX_CLIENT_ID}&client_secret=${ARAMEX_CLIENT_SECRET}&scope=ac-api-au' \
        | jq -e '.access_token and .scope' > /dev/null"
else
    echo -e "${YELLOW}⚠ SKIPPED${NC} - ARAMEX_CLIENT_ID and ARAMEX_CLIENT_SECRET not set"
    echo ""
fi

echo -e "${BLUE}═══ Test 2: Quote API (AramexConnect AU Schema) ═══${NC}"
echo ""
echo "Testing quote API with full shipper/consignee/items structure"
echo "URL: ${SUPABASE_URL}/functions/v1/api-quote"
echo ""

run_test "Quote API - AramexConnect AU Payload" \
    "curl -s -X POST ${SUPABASE_URL}/functions/v1/api-quote \
    -H 'Authorization: Bearer ${API_KEY}' \
    -H 'Content-Type: application/json' \
    -d '{
        \"shipper\": {
            \"name\": \"John Sender\",
            \"address\": \"123 Collins St\",
            \"city\": \"Melbourne\",
            \"postcode\": \"3000\",
            \"phone\": \"0412345678\",
            \"email\": \"sender@example.com\"
        },
        \"consignee\": {
            \"name\": \"Jane Receiver\",
            \"address\": \"456 George St\",
            \"city\": \"Sydney\",
            \"postcode\": \"2000\",
            \"phone\": \"0487654321\",
            \"email\": \"receiver@example.com\"
        },
        \"items\": [
            {
                \"weight\": 5.0,
                \"length\": 30,
                \"width\": 20,
                \"height\": 15,
                \"quantity\": 1,
                \"description\": \"Test Package\"
            }
        ]
    }' | jq -e '.quoteId and .rates' > /dev/null"

run_test "Quote API - Missing Shipper" \
    "curl -s -X POST ${SUPABASE_URL}/functions/v1/api-quote \
    -H 'Authorization: Bearer ${API_KEY}' \
    -H 'Content-Type: application/json' \
    -d '{\"consignee\": {}, \"items\": []}' \
    | jq -e '.error' | grep -q 'Missing required fields'"

run_test "Quote API - Missing Items Array" \
    "curl -s -X POST ${SUPABASE_URL}/functions/v1/api-quote \
    -H 'Authorization: Bearer ${API_KEY}' \
    -H 'Content-Type: application/json' \
    -d '{\"shipper\": {}, \"consignee\": {}}' \
    | jq -e '.error' | grep -q 'Missing required fields'"

echo -e "${BLUE}═══ Test 3: Booking API (AramexConnect AU Schema) ═══${NC}"
echo ""
echo "Testing booking API with items array and serviceType"
echo "URL: ${SUPABASE_URL}/functions/v1/api-book"
echo ""

# First get a quote to use for booking
QUOTE_ID=$(curl -s -X POST ${SUPABASE_URL}/functions/v1/api-quote \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{
        "shipper": {
            "name": "John Sender",
            "address": "123 Collins St",
            "city": "Melbourne",
            "postcode": "3000",
            "phone": "0412345678",
            "email": "sender@example.com"
        },
        "consignee": {
            "name": "Jane Receiver",
            "address": "456 George St",
            "city": "Sydney",
            "postcode": "2000",
            "phone": "0487654321",
            "email": "receiver@example.com"
        },
        "items": [
            {
                "weight": 5.0,
                "length": 30,
                "width": 20,
                "height": 15,
                "quantity": 1
            }
        ]
    }' | jq -r '.quoteId // empty')

if [ ! -z "$QUOTE_ID" ]; then
    run_test "Booking API - AramexConnect AU Payload" \
        "curl -s -X POST ${SUPABASE_URL}/functions/v1/api-book \
        -H 'Authorization: Bearer ${API_KEY}' \
        -H 'Content-Type: application/json' \
        -d '{
            \"quoteId\": \"${QUOTE_ID}\",
            \"reference\": \"TEST-BK-001\",
            \"shipper\": {
                \"name\": \"John Sender\",
                \"address\": \"123 Collins St\",
                \"city\": \"Melbourne\",
                \"postcode\": \"3000\",
                \"phone\": \"0412345678\",
                \"email\": \"sender@example.com\"
            },
            \"consignee\": {
                \"name\": \"Jane Receiver\",
                \"address\": \"456 George St\",
                \"city\": \"Sydney\",
                \"postcode\": \"2000\",
                \"phone\": \"0487654321\",
                \"email\": \"receiver@example.com\"
            },
            \"items\": [
                {
                    \"weight\": 5.0,
                    \"length\": 30,
                    \"width\": 20,
                    \"height\": 15,
                    \"quantity\": 1,
                    \"description\": \"Test Package\"
                }
            ],
            \"serviceType\": \"EXPRESS\"
        }' | jq -e '.shipmentId or .consignmentNumber' > /dev/null"
else
    echo -e "${YELLOW}⚠ SKIPPED${NC} - Could not obtain quote ID"
    echo ""
fi

echo -e "${BLUE}═══ Test 4: Tracking API ═══${NC}"
echo ""
echo "Testing tracking API with shipment ID"
echo "URL: ${SUPABASE_URL}/functions/v1/api-track/{shipmentId}"
echo ""

run_test "Tracking API - Missing Shipment ID" \
    "curl -s -X GET ${SUPABASE_URL}/functions/v1/api-track \
    -H 'Authorization: Bearer ${API_KEY}' \
    | jq -e '.error' | grep -q 'Missing shipment ID'"

echo -e "${BLUE}═══ Test 5: API Validation ═══${NC}"
echo ""

run_test "Authentication - Invalid API Key" \
    "curl -s -w '%{http_code}' -X POST ${SUPABASE_URL}/functions/v1/api-quote \
    -H 'Authorization: Bearer invalid_key_12345' \
    -H 'Content-Type: application/json' \
    -d '{}' | grep -q '401'"

run_test "Authentication - Missing Authorization Header" \
    "curl -s -w '%{http_code}' -X POST ${SUPABASE_URL}/functions/v1/api-quote \
    -H 'Content-Type: application/json' \
    -d '{}' | grep -q '401'"

echo -e "${BLUE}═══ Test 6: No Legacy Fastway Endpoints ═══${NC}"
echo ""

run_test "No /api/consignments endpoint" \
    "! grep -r '/api/consignments' supabase/functions/ --include='*.ts'"

run_test "No /api/addresses endpoint" \
    "! grep -r '/api/addresses' supabase/functions/ --include='*.ts'"

run_test "No /api/utils endpoint" \
    "! grep -r '/api/utils' supabase/functions/ --include='*.ts'"

run_test "No Fastway references in code" \
    "! grep -ri 'fastway\\|myfastway' supabase/functions/ --include='*.ts'"

run_test "No ConTypeId fields" \
    "! grep -r 'ConTypeId' supabase/functions/ --include='*.ts'"

run_test "No PackageType fields" \
    "! grep -r 'PackageType' supabase/functions/ --include='*.ts'"

run_test "No SatchelSize fields" \
    "! grep -r 'SatchelSize' supabase/functions/ --include='*.ts'"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    TEST SUMMARY                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo -e "Total Tests:  $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! AramexConnect AU integration is working.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the errors above.${NC}"
    exit 1
fi
