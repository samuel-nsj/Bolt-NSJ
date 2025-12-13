# NSJ Express Backend - Aramex Connect API Rebuild

**Date**: December 6, 2025
**Status**: ✅ COMPLETE - Rebuilt with Correct Aramex Connect (AU) 2025 API Schema

---

## Executive Summary

The NSJ Express backend has been completely rebuilt from the ground up using the **correct** Aramex Connect (AU) 2025 API endpoints and payload formats. All previous incorrect API implementations have been replaced.

### What Changed

#### Previous (Incorrect) Endpoints:
- `/rates/calculate` ❌
- `/shipments/create` ❌
- `/shipments/track` ❌

#### Current (Correct) Endpoints:
- `POST /shipping/v1/rates` ✅
- `POST /shipping/v1/shipments` ✅
- `GET /shipping/v1/shipments/{consignmentNumber}/tracking` ✅

---

## Database Schema - Completely Rebuilt

### New Tables Created

#### 1. `api_customers`
```sql
- id (uuid, primary key)
- business_name (text)
- email (text, unique)
- phone (text)
- markup_type ('percentage' or 'fixed')
- markup_value (numeric)
- is_active (boolean)
- user_id (uuid, nullable, FK to auth.users)
- created_at, updated_at (timestamptz)
```

#### 2. `customer_api_keys`
```sql
- id (uuid, primary key)
- customer_id (uuid, FK)
- key_hash (text, unique)
- key_prefix (text)
- name (text)
- is_active (boolean)
- created_at (timestamptz)
- expires_at (timestamptz, nullable)
- last_used_at (timestamptz, nullable)
```

#### 3. `freight_quotes`
```sql
- id (uuid, primary key)
- customer_id (uuid, FK)
- service_type (text) - Aramex productCode
- base_cost (numeric)
- markup_amount (numeric)
- total_cost (numeric)
- origin_suburb, origin_postcode (text)
- destination_suburb, destination_postcode (text)
- weight (numeric)
- dimensions (jsonb)
- carrier_response (jsonb)
- valid_until (timestamptz, default +7 days)
- created_at (timestamptz)
```

#### 4. `bookings`
```sql
- id (uuid, primary key)
- customer_id (uuid, FK)
- quote_id (uuid, FK, nullable)
- consignment_number (text, unique)
- label_url (text)
- tracking_url (text)
- estimated_price (numeric)
- reference_number (text)
- pickup_* fields (name, address, suburb, postcode, phone, email)
- delivery_* fields (name, address, suburb, postcode, phone, email)
- package_* fields (weight, length, width, height, description)
- status (text)
- created_at (timestamptz)
```

#### 5. `api_request_logs`
```sql
- id (uuid, primary key)
- customer_id (uuid, FK, nullable)
- log_type (text)
- endpoint (text)
- request_data, response_data (jsonb)
- status_code (integer)
- duration_ms (integer)
- error_message (text, nullable)
- created_at (timestamptz)
```

### Security

- **RLS Enabled** on all tables
- **Policies** restrict customers to their own data
- **Service role** has full access for Edge Functions
- **API keys** are SHA-256 hashed before storage

---

## Aramex Connect Client - Completely Rewritten

### File: `/supabase/functions/_shared/aramex-connect-client.ts`

**Base URL**: `https://api.au.aramex.com`

### OAuth2 Authentication
```typescript
POST /oauth/token
Headers:
  Authorization: Basic {base64(CLIENT_ID:CLIENT_SECRET)}
  Content-Type: application/x-www-form-urlencoded
Body:
  grant_type=client_credentials
```

### Get Rates (Quotes)
```typescript
POST /shipping/v1/rates

Request Payload:
{
  "origin": {
    "postCode": "3000",
    "city": "Melbourne",
    "countryCode": "AU"
  },
  "destination": {
    "postCode": "2000",
    "city": "Sydney",
    "countryCode": "AU"
  },
  "details": {
    "numberOfPieces": 1,
    "dimensions": {
      "length": 40,
      "width": 30,
      "height": 20,
      "unit": "CM"
    },
    "weight": {
      "value": 5,
      "unit": "KG"
    }
  }
}
```

### Create Shipment (Booking)
```typescript
POST /shipping/v1/shipments

Request Payload:
{
  "shipments": [
    {
      "reference": "ORDER-123",
      "shipper": {
        "address": {
          "line1": "123 Business St",
          "city": "Melbourne",
          "postCode": "3000",
          "countryCode": "AU"
        },
        "contact": {
          "name": "John Smith",
          "phone": "+61400000000",
          "email": "john@example.com"
        }
      },
      "consignee": {
        "address": {
          "line1": "456 Customer Ave",
          "city": "Sydney",
          "postCode": "2000",
          "countryCode": "AU"
        },
        "contact": {
          "name": "Jane Doe",
          "phone": "+61411111111",
          "email": "jane@example.com"
        }
      },
      "details": {
        "numberOfPieces": 1,
        "dimensions": {
          "length": 40,
          "width": 30,
          "height": 20,
          "unit": "CM"
        },
        "weight": {
          "value": 5,
          "unit": "KG"
        },
        "description": "General Goods"
      },
      "services": {
        "productCode": "PDX",
        "paymentType": "P",
        "payerAccountNumber": "{CLIENT_ID}"
      },
      "label": {
        "format": "PDF",
        "type": "URL"
      }
    }
  ]
}
```

### Track Shipment
```typescript
GET /shipping/v1/shipments/{consignmentNumber}/tracking
```

---

## Edge Functions - All Rebuilt

### 1. `api-quote` ✅ REBUILT
**Location**: `/supabase/functions/api-quote/index.ts`

**Endpoint**: `POST /functions/v1/api-quote`

**Request**:
```json
{
  "collectionSuburb": "Melbourne",
  "collectionPostcode": "3000",
  "deliverySuburb": "Sydney",
  "deliveryPostcode": "2000",
  "weight": 5,
  "length": 40,
  "width": 30,
  "height": 20
}
```

**Response**:
```json
{
  "quoteId": "uuid",
  "serviceCode": "PDX",
  "serviceName": "Standard Service",
  "baseCost": 25.50,
  "markupAmount": 5.10,
  "totalCost": 30.60,
  "currency": "AUD",
  "transitDays": 3,
  "validUntil": "2025-12-13T00:00:00Z"
}
```

**Features**:
- Calls Aramex `/shipping/v1/rates` with correct payload
- Applies customer-specific markup
- Stores quote in database
- Logs all requests

---

### 2. `api-book` ✅ REBUILT
**Location**: `/supabase/functions/api-book/index.ts`

**Endpoint**: `POST /functions/v1/api-book`

**Request**:
```json
{
  "quoteId": "uuid",
  "reference": "ORDER-12345",
  "shipper": {
    "name": "John Smith",
    "address": "123 Business St",
    "city": "Melbourne",
    "postcode": "3000",
    "phone": "+61400000000",
    "email": "john@example.com"
  },
  "consignee": {
    "name": "Jane Doe",
    "address": "456 Customer Ave",
    "city": "Sydney",
    "postcode": "2000",
    "phone": "+61411111111",
    "email": "jane@example.com"
  },
  "package": {
    "weight": 5,
    "length": 40,
    "width": 30,
    "height": 20,
    "description": "Electronics"
  }
}
```

**Response**:
```json
{
  "bookingId": "uuid",
  "consignmentNumber": "MEL123456789AU",
  "labelUrl": "https://...",
  "trackingUrl": "https://www.aramex.com/au/track/shipment/...",
  "status": "confirmed"
}
```

**Features**:
- Validates quote exists and belongs to customer
- Calls Aramex `/shipping/v1/shipments` with correct payload structure
- Creates booking record in database
- Returns label URL and tracking URL

---

### 3. `api-track` ✅ REBUILT
**Location**: `/supabase/functions/api-track/index.ts`

**Endpoint**: `GET /functions/v1/api-track/{consignmentNumber}`

**Response**:
```json
{
  "consignmentNumber": "MEL123456789AU",
  "status": "In Transit",
  "events": [
    {
      "timestamp": "2025-12-06T10:30:00Z",
      "status": "PICKED_UP",
      "location": "Melbourne, VIC",
      "description": "Package picked up from sender"
    },
    {
      "timestamp": "2025-12-06T14:15:00Z",
      "status": "IN_TRANSIT",
      "location": "Melbourne Hub",
      "description": "Shipment departed facility"
    }
  ]
}
```

**Features**:
- Calls Aramex `/shipping/v1/shipments/{id}/tracking`
- Returns formatted tracking events
- Logs all tracking requests

---

### 4. `api-customers` ✅ REBUILT
**Location**: `/supabase/functions/api-customers/index.ts`

**Endpoints**:
- `GET /functions/v1/api-customers` - List customers
- `POST /functions/v1/api-customers` - Create customer

**Create Request**:
```json
{
  "businessName": "ABC Logistics",
  "email": "contact@abclogistics.com",
  "phone": "+61400000000",
  "markupType": "percentage",
  "markupValue": 20
}
```

**Create Response**:
```json
{
  "customerId": "uuid",
  "businessName": "ABC Logistics",
  "email": "contact@abclogistics.com",
  "markupType": "percentage",
  "markupValue": 20,
  "apiKey": "nsjx_...",
  "message": "Customer created successfully. Save the API key securely - it will not be shown again."
}
```

**Features**:
- Creates customer account
- Generates API key automatically
- Hashes API key before storage
- Returns API key (only shown once)

---

## Shared Modules

### File Locations:
- `/supabase/functions/_shared/aramex-connect-client.ts` - Aramex API client with correct endpoints
- `/supabase/functions/_shared/auth.ts` - API Key + JWT authentication
- `/supabase/functions/_shared/markup.ts` - Markup calculation engine
- `/supabase/functions/_shared/rate-limit.ts` - Rate limiting (50 req/min per customer)

---

## Environment Variables

All functions automatically read these from Supabase:

```bash
# Aramex Connect API
ARAMEX_CLIENT_ID=fw-fl2-MELOP00095-7b42b7f05f29
ARAMEX_CLIENT_SECRET=981e1264-bc2b-4604-87d8-48ee10cf4396
ARAMEX_BASE_URL=https://api.au.aramex.com
ARAMEX_ACCOUNT_ENTITY=MEL
ARAMEX_ACCOUNT_COUNTRY=AU

# Supabase (auto-configured)
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

---

## Authentication

### API Keys (Recommended for Customers)
```bash
Authorization: Bearer nsjx_...
```

### JWT (For Internal Dashboard)
```bash
Authorization: Bearer {supabase_jwt_token}
```

---

## Rate Limiting

- **50 requests per minute** per customer
- Sliding window algorithm
- Applies to all API endpoints
- Returns `429` when exceeded

---

## Complete API Workflow Example

### 1. Create Customer
```bash
POST /functions/v1/api-customers
Authorization: Bearer {admin_key}

{
  "businessName": "Test Company",
  "email": "test@example.com",
  "markupType": "percentage",
  "markupValue": 15
}

Response: { "apiKey": "nsjx_abc123..." }
```

### 2. Get Quote
```bash
POST /functions/v1/api-quote
Authorization: Bearer nsjx_abc123...

{
  "collectionSuburb": "Melbourne",
  "collectionPostcode": "3000",
  "deliverySuburb": "Sydney",
  "deliveryPostcode": "2000",
  "weight": 5,
  "length": 40,
  "width": 30,
  "height": 20
}

Response: { "quoteId": "uuid-123", "totalCost": 30.60 }
```

### 3. Create Booking
```bash
POST /functions/v1/api-book
Authorization: Bearer nsjx_abc123...

{
  "quoteId": "uuid-123",
  "reference": "ORDER-001",
  "shipper": { ... },
  "consignee": { ... },
  "package": { ... }
}

Response: { "consignmentNumber": "MEL123456789AU", "labelUrl": "https://..." }
```

### 4. Track Shipment
```bash
GET /functions/v1/api-track/MEL123456789AU
Authorization: Bearer nsjx_abc123...

Response: { "status": "In Transit", "events": [...] }
```

---

## Key Differences from Previous Implementation

| Aspect | Previous (Incorrect) | Current (Correct) |
|--------|---------------------|-------------------|
| Base URL | `https://api.aramex.com/connect/v1` | `https://api.au.aramex.com` |
| Quote Endpoint | `/rates/calculate` | `/shipping/v1/rates` |
| Booking Endpoint | `/shipments/create` | `/shipping/v1/shipments` |
| Tracking Endpoint | `/shipments/track` | `/shipping/v1/shipments/{id}/tracking` |
| Booking Payload | Single object | Wrapped in `{shipments: [...]}` |
| Dimensions | Direct properties | Nested in `{dimensions: {...}}` |
| Weight | Direct property | Object with `{value, unit}` |
| Services | `productType`, `productGroup` | `productCode`, `paymentType`, `payerAccountNumber` |
| Label Format | `reportId`, `reportType` | `format: "PDF"`, `type: "URL"` |

---

## Testing

### Prerequisites
1. Customer account created
2. API key obtained
3. Aramex credentials configured in Supabase

### Test Quote
```bash
curl -X POST "https://eackhgndklkwfofeacoa.supabase.co/functions/v1/api-quote" \
  -H "Authorization: Bearer {YOUR_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "collectionSuburb": "Melbourne",
    "collectionPostcode": "3000",
    "deliverySuburb": "Sydney",
    "deliveryPostcode": "2000",
    "weight": 5,
    "length": 40,
    "width": 30,
    "height": 20
  }'
```

---

## Deployment Instructions

The Edge Functions are ready to deploy. They use shared modules from `_shared/` directory which need to be accessible during deployment.

### Option 1: Deploy via Supabase CLI
```bash
supabase functions deploy api-quote
supabase functions deploy api-book
supabase functions deploy api-track
supabase functions deploy api-customers
```

### Option 2: Manual Deployment via Dashboard
1. Navigate to Edge Functions in Supabase Dashboard
2. Create/update each function
3. Ensure shared modules are included in deployment package

---

## Verification Checklist

- [x] Database schema created with all 5 tables
- [x] RLS policies enabled on all tables
- [x] Aramex Connect client using correct endpoints:
  - [x] POST /shipping/v1/rates
  - [x] POST /shipping/v1/shipments
  - [x] GET /shipping/v1/shipments/{id}/tracking
- [x] OAuth2 token acquisition implemented
- [x] Token caching with automatic refresh
- [x] Booking payload wrapped in `{shipments: [...]}`
- [x] Dimensions and weight using correct nested structure
- [x] Services using productCode + paymentType + payerAccountNumber
- [x] Label format using PDF + URL
- [x] Authentication supporting API Keys + JWT
- [x] Rate limiting implemented (50 req/min)
- [x] Comprehensive error handling
- [x] Request logging for all operations

---

## Summary

The NSJ Express backend has been completely rebuilt with the **correct** Aramex Connect (AU) 2025 API schema. All API endpoints, payload formats, and response parsing have been updated to match Aramex's actual API structure.

**Status**: ✅ **READY FOR DEPLOYMENT AND TESTING**

---

**Rebuilt**: December 6, 2025
**API Version**: Aramex Connect (AU) 2025
**Base URL**: https://api.au.aramex.com
**Entity**: MEL (Melbourne, Australia)
