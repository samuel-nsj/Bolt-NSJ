#!/bin/sh
BASE_URL="https://eackhgndklkwfofeacoa.supabase.co/functions/v1"

echo "=================================================================="
echo "NSJ Express - Aramex Connect API Test Suite"
echo "=================================================================="
echo ""

API_KEY="$1"

if [ -z "$API_KEY" ]; then
  echo "ERROR: No API key provided"
  echo "Usage: $0 <api_key>"
  exit 1
fi

echo "Testing with API key provided"
echo ""

echo "TEST 1: Melbourne to Sydney Quote"
echo "=================================================================="

RESPONSE=$(curl -s -w "\nSTATUS:%{http_code}" \
  -X POST "$BASE_URL/api-quote" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"collectionSuburb":"Melbourne","collectionPostcode":"3000","deliverySuburb":"Sydney","deliveryPostcode":"2000","weight":5,"length":40,"width":30,"height":20}')

STATUS=$(echo "$RESPONSE" | grep "STATUS:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed 's/STATUS:.*//')

echo "$BODY"
echo ""
echo "HTTP Status: $STATUS"
echo ""

if [ "$STATUS" = "200" ]; then
  echo "SUCCESS"
else
  echo "FAILED"
fi

echo ""
echo "TEST 2: Brisbane to Perth Quote"
echo "=================================================================="

RESPONSE2=$(curl -s -w "\nSTATUS:%{http_code}" \
  -X POST "$BASE_URL/api-quote" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"collectionSuburb":"Brisbane","collectionPostcode":"4000","deliverySuburb":"Perth","deliveryPostcode":"6000","weight":10,"length":50,"width":40,"height":30}')

STATUS2=$(echo "$RESPONSE2" | grep "STATUS:" | cut -d: -f2)
BODY2=$(echo "$RESPONSE2" | sed 's/STATUS:.*//')

echo "$BODY2"
echo ""
echo "HTTP Status: $STATUS2"
echo ""

echo "TEST 3: Validation Test"
echo "=================================================================="

RESPONSE3=$(curl -s -w "\nSTATUS:%{http_code}" \
  -X POST "$BASE_URL/api-quote" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"collectionSuburb":"Melbourne"}')

STATUS3=$(echo "$RESPONSE3" | grep "STATUS:" | cut -d: -f2)
BODY3=$(echo "$RESPONSE3" | sed 's/STATUS:.*//')

echo "$BODY3"
echo ""
echo "HTTP Status: $STATUS3 (Expected: 400)"
echo ""

echo "TEST 4: Invalid API Key"
echo "=================================================================="

RESPONSE4=$(curl -s -w "\nSTATUS:%{http_code}" \
  -X POST "$BASE_URL/api-quote" \
  -H "Authorization: Bearer invalid_key" \
  -H "Content-Type: application/json" \
  -d '{"collectionSuburb":"Melbourne","collectionPostcode":"3000","deliverySuburb":"Sydney","deliveryPostcode":"2000","weight":5,"length":40,"width":30,"height":20}')

STATUS4=$(echo "$RESPONSE4" | grep "STATUS:" | cut -d: -f2)
BODY4=$(echo "$RESPONSE4" | sed 's/STATUS:.*//')

echo "$BODY4"
echo ""
echo "HTTP Status: $STATUS4 (Expected: 401)"
echo ""

echo "TEST 5: List Customers"
echo "=================================================================="

RESPONSE5=$(curl -s -w "\nSTATUS:%{http_code}" \
  -X GET "$BASE_URL/api-customers" \
  -H "Authorization: Bearer $API_KEY")

STATUS5=$(echo "$RESPONSE5" | grep "STATUS:" | cut -d: -f2)
BODY5=$(echo "$RESPONSE5" | sed 's/STATUS:.*//')

echo "$BODY5"
echo ""
echo "HTTP Status: $STATUS5"
echo ""

echo "=================================================================="
echo "Test Complete"
echo "=================================================================="
