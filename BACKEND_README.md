# NSJ Express Backend API Documentation

Complete backend system for the NSJ Express freight aggregator platform.

## Architecture Overview

### Technology Stack
- **Database**: PostgreSQL (Supabase)
- **API Layer**: Supabase Edge Functions (Deno runtime)
- **Authentication**: JWT + API Keys
- **Carrier Integration**: Aramex Connect API

### Core Components

1. **Database Schema** (`api_customers`, `freight_quotes`, `api_request_logs`, `customer_api_keys`)
2. **Aramex API Client** (Quote, Book, Track)
3. **Markup Engine** (Percentage & Fixed markup calculation)
4. **Authentication Middleware** (JWT & API Key authentication)
5. **Rate Limiting** (In-memory rate limiter)
6. **API Logging** (Comprehensive request/response logging)

## Environment Variables

Create a `.env` file with the following variables:

```env
# Supabase (Auto-configured)
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Aramex Connect API Credentials (OAuth2)
ARAMEX_BASE_URL=https://api.aramex.com/connect/v1
ARAMEX_CLIENT_ID=<your-client-id>
ARAMEX_CLIENT_SECRET=<your-client-secret>
ARAMEX_ACCOUNT_ENTITY=SYD
ARAMEX_ACCOUNT_COUNTRY=AU
```

**Note**: The system uses OAuth2 Client Credentials flow. The Client ID and Client Secret are used to obtain an access token, which is then used for all Aramex API requests. Tokens are cached automatically until expiry.

## API Endpoints

### Base URL
```
https://<your-project-ref>.supabase.co/functions/v1
```

### Authentication
All endpoints require authentication via:
- **JWT Token**: `Authorization: Bearer <jwt-token>`
- **API Key**: `Authorization: Bearer <api-key>`

---

### 1. POST /api-quote

Get a freight quote with NSJ Express markup applied.

**Request Body:**
```json
{
  "collectionSuburb": "Sydney",
  "collectionPostcode": "2000",
  "deliverySuburb": "Melbourne",
  "deliveryPostcode": "3000",
  "weight": 5.5,
  "length": 40,
  "width": 30,
  "height": 20,
  "serviceType": "PDX"
}
```

**Response (200):**
```json
{
  "quoteId": "550e8400-e29b-41d4-a716-446655440000",
  "carrier": "Aramex",
  "serviceType": "PDX",
  "baseCost": 45.00,
  "markupAmount": 6.75,
  "totalCost": 51.75,
  "currency": "AUD",
  "deliveryEstimate": 3,
  "validUntil": "2025-12-10T00:00:00Z"
}
```

**How Markup Works:**
1. System retrieves customer's markup configuration (default: 15% percentage)
2. Aramex returns base cost: $45.00
3. If customer has 15% markup: $45.00 × 0.15 = $6.75
4. Total cost returned: $45.00 + $6.75 = $51.75

**Markup Types:**
- `percentage`: Markup as % of base cost (e.g., 15 = 15%)
- `fixed`: Fixed dollar amount added (e.g., 10 = $10)

---

### 2. POST /api-book

Create a freight booking with Aramex.

**Request Body:**
```json
{
  "quoteId": "550e8400-e29b-41d4-a716-446655440000",
  "shipper": {
    "name": "John Smith",
    "address": "123 Business St",
    "suburb": "Sydney",
    "postcode": "2000",
    "country": "AU",
    "phone": "+61400000000",
    "email": "john@example.com"
  },
  "consignee": {
    "name": "Jane Doe",
    "address": "456 Customer Ave",
    "suburb": "Melbourne",
    "postcode": "3000",
    "country": "AU",
    "phone": "+61411111111",
    "email": "jane@example.com"
  },
  "packages": [
    {
      "weight": 5.5,
      "length": 40,
      "width": 30,
      "height": 20,
      "description": "Electronics"
    }
  ],
  "reference": "ORDER-12345"
}
```

**Response (200):**
```json
{
  "bookingId": "660e8400-e29b-41d4-a716-446655440000",
  "consignmentNumber": "1234567890",
  "labelUrl": "https://aramex.com/labels/1234567890.pdf",
  "trackingUrl": "https://www.aramex.com/au/track/shipment/1234567890",
  "status": "confirmed"
}
```

---

### 3. GET /api-track/:consignmentNumber

Track a shipment by consignment number.

**Response (200):**
```json
{
  "consignmentNumber": "1234567890",
  "status": "in_transit",
  "events": [
    {
      "timestamp": "2025-12-03T10:30:00Z",
      "status": "PICKED_UP",
      "location": "Sydney",
      "description": "Package picked up from sender"
    },
    {
      "timestamp": "2025-12-03T14:20:00Z",
      "status": "IN_TRANSIT",
      "location": "Sydney Depot",
      "description": "Package in transit to destination"
    }
  ]
}
```

---

### 4. GET /api-customers (Admin Only)

Retrieve all customers (requires admin permissions).

**Response (200):**
```json
{
  "customers": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "businessName": "ABC Logistics",
      "email": "contact@abclogistics.com",
      "markupType": "percentage",
      "markupValue": 15,
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

### 5. POST /api-customers (Admin Only)

Create a new customer account.

**Request Body:**
```json
{
  "businessName": "XYZ Shipping",
  "email": "contact@xyzshipping.com",
  "phone": "+61400000000",
  "markupType": "percentage",
  "markupValue": 20
}
```

**Response (201):**
```json
{
  "customerId": "880e8400-e29b-41d4-a716-446655440000",
  "businessName": "XYZ Shipping",
  "email": "contact@xyzshipping.com",
  "apiKey": "nsjx_a1b2c3d4e5f6...",
  "message": "Customer created successfully. Save the API key securely."
}
```

---

## Rate Limiting

- **Window**: 60 seconds
- **Max Requests**: 50 per window per customer
- **Response (429)**: `{"error": "Rate limit exceeded. Please try again later."}`

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields: collectionSuburb, collectionPostcode, ..."
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid authentication credentials"
}
```

### 403 Forbidden
```json
{
  "error": "Customer account not found or inactive"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Detailed error message"
}
```

---

## Database Schema

### api_customers
Stores business customer information and markup configuration.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Link to auth.users (nullable) |
| business_name | text | Company name |
| email | text | Contact email (unique) |
| phone | text | Contact phone |
| markup_type | text | 'percentage' or 'fixed' |
| markup_value | numeric | Markup amount |
| is_active | boolean | Account status |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

### freight_quotes
Stores all quote requests and carrier responses.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| customer_id | uuid | Foreign key to api_customers |
| collection_suburb | text | Pickup location |
| collection_postcode | text | Pickup postcode |
| delivery_suburb | text | Delivery location |
| delivery_postcode | text | Delivery postcode |
| weight | numeric | Package weight (kg) |
| length | numeric | Package length (cm) |
| width | numeric | Package width (cm) |
| height | numeric | Package height (cm) |
| carrier_name | text | Carrier providing quote |
| service_type | text | Service level |
| base_cost | numeric | Carrier base cost |
| markup_amount | numeric | NSJ Express markup |
| total_cost | numeric | Final cost to customer |
| carrier_response | jsonb | Full carrier API response |
| valid_until | timestamptz | Quote expiry (7 days default) |
| created_at | timestamptz | Quote creation timestamp |

### api_request_logs
Comprehensive API request/response logging.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| log_type | text | Type of API call (quote, book, track) |
| customer_id | uuid | Foreign key to api_customers |
| request_data | jsonb | Request payload |
| response_data | jsonb | Response payload |
| status_code | integer | HTTP status code |
| error_message | text | Error details if failed |
| duration_ms | integer | Request duration |
| ip_address | text | Client IP |
| endpoint | text | API endpoint called |
| created_at | timestamptz | Log timestamp |

### customer_api_keys
API key management for programmatic access.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| customer_id | uuid | Foreign key to api_customers |
| key_hash | text | Hashed API key (unique) |
| key_prefix | text | First 8 chars for identification |
| name | text | Friendly key name |
| last_used_at | timestamptz | Last usage timestamp |
| expires_at | timestamptz | Expiry date (nullable) |
| is_active | boolean | Key status |
| created_at | timestamptz | Key creation timestamp |

---

## Cron Job: Cleanup Old Quotes

A scheduled Edge Function runs daily to delete quotes older than 30 days.

**Function**: `cleanup-old-quotes`
**Schedule**: Daily at 02:00 UTC
**Action**: Deletes `freight_quotes` where `created_at < NOW() - INTERVAL '30 days'`

---

## Deployment Instructions

### Prerequisites
1. Supabase project set up
2. Aramex API credentials
3. Supabase CLI installed

### Step 1: Apply Database Migrations
Migrations are already applied via the Supabase MCP tool.

### Step 2: Set Environment Variables
Configure Aramex credentials in your Supabase project dashboard under Project Settings > Edge Functions > Secrets.

### Step 3: Deploy Edge Functions

The following functions need to be deployed:

1. `api-quote` - Quote generation endpoint
2. `api-book` - Booking creation endpoint
3. `api-track` - Tracking endpoint
4. `api-customers` - Customer management endpoint
5. `cleanup-old-quotes` - Scheduled cleanup cron job

Due to Supabase Edge Functions' limitations with shared modules, each function contains inlined dependencies.

### Step 4: Test Endpoints

```bash
# Test Quote Endpoint
curl -X POST https://<your-project-ref>.supabase.co/functions/v1/api-quote \
  -H "Authorization: Bearer <your-api-key>" \
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
```

---

## Security Best Practices

1. **Never expose API keys** in client-side code
2. **Use environment variables** for all sensitive configuration
3. **Enable RLS policies** on all database tables (already configured)
4. **Rotate API keys** regularly
5. **Monitor API logs** for suspicious activity
6. **Set API key expiration dates** for temporary access
7. **Use HTTPS only** for all API calls

---

## Monitoring & Analytics

### API Request Logs
Query `api_request_logs` table to monitor:
- Request volume per customer
- Error rates
- Average response times
- Popular endpoints

### Example Query:
```sql
SELECT
  customer_id,
  log_type,
  COUNT(*) as request_count,
  AVG(duration_ms) as avg_duration,
  COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
FROM api_request_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY customer_id, log_type
ORDER BY request_count DESC;
```

---

## Support & Contact

For technical support or API questions:
- Email: api-support@nsjexpress.com
- Documentation: https://docs.nsjexpress.com
- Status Page: https://status.nsjexpress.com

---

## Changelog

### Version 1.0.0 (2025-12-03)
- Initial backend release
- Aramex API integration
- Quote, Book, Track endpoints
- Customer management
- API key authentication
- Rate limiting
- Comprehensive logging
