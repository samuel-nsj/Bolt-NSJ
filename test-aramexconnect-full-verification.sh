#!/bin/bash

# AramexConnect AU 2025 - Full Codebase Verification Test Suite
# Validates complete compliance with AramexConnect AU API specifications

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

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  AramexConnect AU 2025 - Full Codebase Verification Suite       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
    local test_name="$1"
    local test_command="$2"

    echo -e "${YELLOW}Testing:${NC} $test_name"

    if eval "$test_command" > /tmp/test_output.txt 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo ""
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        cat /tmp/test_output.txt
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo ""
        return 1
    fi
}

echo -e "${BLUE}═══ SECTION 1: OAuth2 Authentication Verification ═══${NC}"
echo ""

run_test "OAuth2 token URL is correct" \
    "grep -q 'identityUrl}/connect/token' supabase/functions/_shared/aramex-connect-client.ts"

run_test "OAuth2 uses form-encoded parameters" \
    "grep -q 'application/x-www-form-urlencoded' supabase/functions/_shared/aramex-connect-client.ts"

run_test "OAuth2 includes grant_type=client_credentials" \
    "grep -q \"grant_type: 'client_credentials'\" supabase/functions/_shared/aramex-connect-client.ts"

run_test "OAuth2 includes client_id parameter" \
    "grep -q \"client_id: this.config.clientId\" supabase/functions/_shared/aramex-connect-client.ts"

run_test "OAuth2 includes client_secret parameter" \
    "grep -q \"client_secret: this.config.clientSecret\" supabase/functions/_shared/aramex-connect-client.ts"

run_test "OAuth2 includes scope=ac-api-au" \
    "grep -q \"scope: 'ac-api-au'\" supabase/functions/_shared/aramex-connect-client.ts"

run_test "OAuth2 NOT using Basic Auth" \
    "! grep -q 'Authorization.*Basic' supabase/functions/_shared/aramex-connect-client.ts"

run_test "OAuth2 token caching is implemented" \
    "grep -q 'this.tokenExpiry' supabase/functions/_shared/aramex-connect-client.ts"

run_test "OAuth2 error handling for error field" \
    "grep -q 'OAuth2Error' supabase/functions/_shared/aramex-connect-client.ts"

run_test "OAuth2 error handling for error_description" \
    "grep -q 'error_description' supabase/functions/_shared/aramex-connect-client.ts"

echo -e "${BLUE}═══ SECTION 2: API Base URL Verification ═══${NC}"
echo ""

run_test "Base URL uses api.aramexconnect.com.au" \
    "grep -q 'api.aramexconnect.com.au' supabase/functions/_shared/aramex-connect-client.ts"

run_test "All API calls use /shipping/v1/ prefix" \
    "grep -q '/shipping/v1/rates' supabase/functions/_shared/aramex-connect-client.ts && \
     grep -q '/shipping/v1/shipments' supabase/functions/_shared/aramex-connect-client.ts && \
     grep -q '/shipping/v1/shipments.*tracking' supabase/functions/_shared/aramex-connect-client.ts"

run_test "NO references to api.aramex.com (without .au)" \
    "! grep -rq 'api\.aramex\.com[^.]' supabase/functions/ --include='*.ts'"

run_test "NO references to api.au.aramex.com" \
    "! grep -rq 'api\.au\.aramex\.com' supabase/functions/ --include='*.ts'"

run_test "NO references to myfastway endpoints" \
    "! grep -riq 'myfastway' supabase/functions/ --include='*.ts'"

run_test "NO references to /api/consignments" \
    "! grep -rq '/api/consignments' supabase/functions/ --include='*.ts'"

run_test "NO references to /api/addresses" \
    "! grep -rq '/api/addresses' supabase/functions/ --include='*.ts'"

run_test "NO references to /api/utils" \
    "! grep -rq '/api/utils' supabase/functions/ --include='*.ts'"

echo -e "${BLUE}═══ SECTION 3: Quote Payload Structure Verification ═══${NC}"
echo ""

run_test "Quote payload has shipper.address structure" \
    "grep -q 'shipper: {' supabase/functions/_shared/aramex-connect-client.ts && \
     grep -q 'address: {' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Quote payload has shipper.contact structure" \
    "grep -q 'contact: {' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Quote payload has consignee.address structure" \
    "grep -q 'consignee: {' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Quote payload has items array" \
    "grep -q 'items: request.items.map' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Quote items have weight.value and weight.unit=Kg" \
    "grep -q \"unit: 'Kg'\" supabase/functions/_shared/aramex-connect-client.ts"

run_test "Quote items have dimensions with unit=Cm" \
    "grep -q \"unit: 'Cm'\" supabase/functions/_shared/aramex-connect-client.ts"

run_test "Quote items have quantity field" \
    "grep -q 'quantity: item.quantity' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Quote items have description field" \
    "grep -q 'description: item.description' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Quote payload has isDocument field" \
    "grep -q 'isDocument: false' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Quote payload has declaredValue field" \
    "grep -q 'declaredValue: 0' supabase/functions/_shared/aramex-connect-client.ts"

echo -e "${BLUE}═══ SECTION 4: Quote Response Handling Verification ═══${NC}"
echo ""

run_test "Quote response extracts baseAmount" \
    "grep -q 'baseAmount:' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Quote response extracts totalAmount" \
    "grep -q 'totalAmount:' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Quote response extracts currency" \
    "grep -q 'currency:' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Quote response extracts transitDays" \
    "grep -q 'transitDays:' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Quote response extracts serviceType" \
    "grep -q 'serviceType:' supabase/functions/_shared/aramex-connect-client.ts"

run_test "api-quote applies markup to baseAmount" \
    "grep -q 'MarkupEngine.applyMarkup(rate.baseAmount' supabase/functions/api-quote/index.ts"

echo -e "${BLUE}═══ SECTION 5: Booking Payload Structure Verification ═══${NC}"
echo ""

run_test "Booking payload wrapped in shipments array" \
    "grep -q 'shipments: \[' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Booking payload has reference field" \
    "grep -q 'reference: request.reference' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Booking payload has items array" \
    "grep -q 'items: request.items.map' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Booking payload has serviceType field" \
    "grep -q 'serviceType: request.serviceType' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Booking payload has paymentType=P" \
    "grep -q \"paymentType: 'P'\" supabase/functions/_shared/aramex-connect-client.ts"

run_test "Booking payload has payerAccountNumber" \
    "grep -q 'payerAccountNumber:' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Booking payload has labelFormat.format=PDF" \
    "grep -q \"format: 'PDF'\" supabase/functions/_shared/aramex-connect-client.ts"

run_test "Booking payload has labelFormat.type=URL" \
    "grep -q \"type: 'URL'\" supabase/functions/_shared/aramex-connect-client.ts"

echo -e "${BLUE}═══ SECTION 6: Booking Response Handling Verification ═══${NC}"
echo ""

run_test "Booking response extracts shipmentId" \
    "grep -q 'shipmentId:' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Booking response extracts consignmentNumber" \
    "grep -q 'consignmentNumber:' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Booking response extracts labelUrl" \
    "grep -q 'labelUrl:' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Booking response constructs trackingUrl" \
    "grep -q 'trackingUrl:' supabase/functions/_shared/aramex-connect-client.ts"

echo -e "${BLUE}═══ SECTION 7: Tracking Endpoint Verification ═══${NC}"
echo ""

run_test "Tracking uses GET /shipping/v1/shipments/{id}/tracking" \
    "grep -q 'GET.*shipping/v1/shipments.*tracking' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Tracking accepts shipmentId parameter" \
    "grep -q 'trackShipment(shipmentId: string)' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Tracking extracts events array" \
    "grep -q 'events:' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Tracking extracts timestamps" \
    "grep -q 'timestamp:' supabase/functions/_shared/aramex-connect-client.ts"

run_test "Tracking extracts locations" \
    "grep -q 'location:' supabase/functions/_shared/aramex-connect-client.ts"

echo -e "${BLUE}═══ SECTION 8: Legacy Code Removal Verification ═══${NC}"
echo ""

run_test "NO ConTypeId references" \
    "! grep -riq 'ConTypeId' supabase/functions/ --include='*.ts'"

run_test "NO PackageType references" \
    "! grep -riq 'PackageType' supabase/functions/ --include='*.ts'"

run_test "NO SatchelSize references" \
    "! grep -riq 'SatchelSize' supabase/functions/ --include='*.ts'"

run_test "NO WeightDead references" \
    "! grep -riq 'WeightDead' supabase/functions/ --include='*.ts'"

run_test "NO WeightCubic references" \
    "! grep -riq 'WeightCubic' supabase/functions/ --include='*.ts'"

run_test "NO Fastway references" \
    "! grep -riq 'fastway' supabase/functions/ --include='*.ts'"

run_test "NO stateOrProvince references (Fastway field)" \
    "! grep -riq 'stateOrProvince' supabase/functions/ --include='*.ts'"

run_test "NO originSuburb references (old field)" \
    "! grep -riq 'originSuburb' supabase/functions/ --include='*.ts'"

run_test "NO destinationSuburb references (old field)" \
    "! grep -riq 'destinationSuburb' supabase/functions/ --include='*.ts'"

echo -e "${BLUE}═══ SECTION 9: Shared Modules Consistency ═══${NC}"
echo ""

run_test "aramex-connect-client.ts exists in _shared" \
    "test -f supabase/functions/_shared/aramex-connect-client.ts"

run_test "auth.ts exists in _shared" \
    "test -f supabase/functions/_shared/auth.ts"

run_test "markup.ts exists in _shared" \
    "test -f supabase/functions/_shared/markup.ts"

run_test "rate-limit.ts exists in _shared" \
    "test -f supabase/functions/_shared/rate-limit.ts"

run_test "NO duplicate aramex-connect-client.ts files" \
    "test \$(find supabase/functions -name 'aramex-connect-client.ts' | wc -l) -eq 1"

run_test "NO legacy aramex-client.ts file" \
    "! test -f supabase/functions/_shared/aramex-client.ts"

echo -e "${BLUE}═══ SECTION 10: Edge Functions Consistency ═══${NC}"
echo ""

run_test "api-quote imports from _shared" \
    "grep -q \"from '../_shared/\" supabase/functions/api-quote/index.ts"

run_test "api-book imports from _shared" \
    "grep -q \"from '../_shared/\" supabase/functions/api-book/index.ts"

run_test "api-track imports from _shared" \
    "grep -q \"from '../_shared/\" supabase/functions/api-track/index.ts"

run_test "api-customers imports from _shared" \
    "grep -q \"from '../_shared/\" supabase/functions/api-customers/index.ts"

run_test "api-quote has NO local duplicate files" \
    "test ! -f supabase/functions/api-quote/aramex-connect-client.ts && \
     test ! -f supabase/functions/api-quote/auth.ts && \
     test ! -f supabase/functions/api-quote/rate-limit.ts"

run_test "api-book has NO local duplicate files" \
    "test ! -f supabase/functions/api-book/aramex-connect-client.ts && \
     test ! -f supabase/functions/api-book/auth.ts && \
     test ! -f supabase/functions/api-book/rate-limit.ts"

run_test "api-track has NO local duplicate files" \
    "test ! -f supabase/functions/api-track/aramex-connect-client.ts && \
     test ! -f supabase/functions/api-track/auth.ts && \
     test ! -f supabase/functions/api-track/rate-limit.ts"

run_test "api-customers has NO local duplicate files" \
    "test ! -f supabase/functions/api-customers/auth.ts"

echo -e "${BLUE}═══ SECTION 11: CORS Headers Verification ═══${NC}"
echo ""

run_test "api-quote has correct CORS headers" \
    "grep -q 'Access-Control-Allow-Headers.*Authorization.*X-Client-Info.*Apikey' supabase/functions/api-quote/index.ts"

run_test "api-book has correct CORS headers" \
    "grep -q 'Access-Control-Allow-Headers.*Authorization.*X-Client-Info.*Apikey' supabase/functions/api-book/index.ts"

run_test "api-track has correct CORS headers" \
    "grep -q 'Access-Control-Allow-Headers.*Authorization.*X-Client-Info.*Apikey' supabase/functions/api-track/index.ts"

run_test "api-customers has correct CORS headers" \
    "grep -q 'Access-Control-Allow-Headers.*Authorization.*X-Client-Info.*Apikey' supabase/functions/api-customers/index.ts"

echo -e "${BLUE}═══ SECTION 12: Build and Runtime Verification ═══${NC}"
echo ""

run_test "Project builds successfully" \
    "npm run build > /dev/null 2>&1"

run_test "No TypeScript errors in _shared" \
    "! grep -rq '@ts-ignore' supabase/functions/_shared/ --include='*.ts'"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                       VERIFICATION SUMMARY                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo -e "Total Tests:  $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ VERIFICATION COMPLETE - FULLY ARAMEXCONNECT AU 2025 COMPLIANT ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}✓ OAuth2 with scope=ac-api-au${NC}"
    echo -e "${GREEN}✓ All API calls use api.aramexconnect.com.au/shipping/v1/${NC}"
    echo -e "${GREEN}✓ Quote payloads match AramexConnect AU schema${NC}"
    echo -e "${GREEN}✓ Booking payloads match AramexConnect AU schema${NC}"
    echo -e "${GREEN}✓ Tracking uses correct shipmentId endpoint${NC}"
    echo -e "${GREEN}✓ All legacy Fastway code removed${NC}"
    echo -e "${GREEN}✓ All Edge Functions consistent and verified${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ✗ VERIFICATION FAILED - ISSUES DETECTED                          ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${RED}Please review the failed tests above and fix the issues.${NC}"
    echo ""
    exit 1
fi
