#!/bin/bash

PROJECT_REF="your-project-ref"
API_KEY="nsjx_your_api_key"
BASE_URL="https://${PROJECT_REF}.supabase.co"

echo "=== NSJ Express API Examples ==="
echo ""

echo "1. Get Quote"
echo "----------------------------------------"
curl -X POST "${BASE_URL}/functions/v1/api-quote" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "collectionSuburb": "Sydney",
    "collectionPostcode": "2000",
    "deliverySuburb": "Melbourne",
    "deliveryPostcode": "3000",
    "weight": 5,
    "length": 40,
    "width": 30,
    "height": 20
  }'
echo ""
echo ""

QUOTE_ID="replace-with-actual-quote-id"

echo "2. Create Booking"
echo "----------------------------------------"
curl -X POST "${BASE_URL}/functions/v1/api-book" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"quoteId\": \"${QUOTE_ID}\",
    \"shipper\": {
      \"name\": \"John Smith\",
      \"address\": \"123 Business St\",
      \"suburb\": \"Sydney\",
      \"postcode\": \"2000\",
      \"country\": \"AU\",
      \"phone\": \"+61400000000\",
      \"email\": \"john@example.com\"
    },
    \"consignee\": {
      \"name\": \"Jane Doe\",
      \"address\": \"456 Customer Ave\",
      \"suburb\": \"Melbourne\",
      \"postcode\": \"3000\",
      \"country\": \"AU\",
      \"phone\": \"+61411111111\",
      \"email\": \"jane@example.com\"
    },
    \"packages\": [
      {
        \"weight\": 5,
        \"length\": 40,
        \"width\": 30,
        \"height\": 20,
        \"description\": \"Electronics\"
      }
    ],
    \"reference\": \"ORDER-12345\"
  }"
echo ""
echo ""

CONSIGNMENT_NUMBER="replace-with-actual-consignment-number"

echo "3. Track Shipment"
echo "----------------------------------------"
curl -X GET "${BASE_URL}/functions/v1/api-track/${CONSIGNMENT_NUMBER}" \
  -H "Authorization: Bearer ${API_KEY}"
echo ""
echo ""

echo "4. List Customers (Admin Only)"
echo "----------------------------------------"
curl -X GET "${BASE_URL}/functions/v1/api-customers" \
  -H "Authorization: Bearer ${API_KEY}"
echo ""
echo ""

echo "5. Create Customer (Admin Only)"
echo "----------------------------------------"
curl -X POST "${BASE_URL}/functions/v1/api-customers" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "ABC Logistics",
    "email": "contact@abclogistics.com",
    "phone": "+61400000000",
    "markupType": "percentage",
    "markupValue": 20
  }'
echo ""
