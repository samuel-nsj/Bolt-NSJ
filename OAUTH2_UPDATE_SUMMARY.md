# Aramex OAuth2 Authentication Update Summary

## ✅ Update Complete

All NSJ Express backend Edge Functions have been updated to use Aramex Connect OAuth2 Client Credentials authentication instead of the legacy username/password/PIN authentication method.

---

## Changes Made

### 1. ✅ Authentication Method Updated
**Old Method (Removed)**:
- ARAMEX_USERNAME
- ARAMEX_PASSWORD
- ARAMEX_ACCOUNT_NUMBER
- ARAMEX_ACCOUNT_PIN

**New Method (OAuth2 Client Credentials)**:
- ARAMEX_CLIENT_ID
- ARAMEX_CLIENT_SECRET
- ARAMEX_BASE_URL
- ARAMEX_ACCOUNT_ENTITY
- ARAMEX_ACCOUNT_COUNTRY

### 2. ✅ Aramex Client Module Updated
Location: `/supabase/functions/_shared/aramex-client.ts`

**Key Features**:
- OAuth2 token acquisition using Client ID + Client Secret
- Automatic token caching and refresh (expires 1 minute before actual expiry)
- Bearer token authentication for all Aramex API requests
- Updated API endpoints for Aramex Connect API

**OAuth Flow**:
1. On first request, fetch access token using Basic Auth (Client ID:Client Secret)
2. Cache the access token with expiry timestamp
3. Use Bearer token for all subsequent requests
4. Auto-refresh token when expired

### 3. ✅ Edge Functions Redeployed
All 4 Edge Functions have been redeployed with the updated authentication:
- ✅ `api-quote` - Quote generation with OAuth2
- ✅ `api-book` - Booking creation with OAuth2
- ✅ `api-track` - Shipment tracking with OAuth2
- ✅ `api-customers` - Customer management (no Aramex dependency)

### 4. ✅ Documentation Updated
- ✅ `BACKEND_README.md` - Updated environment variables section
- ✅ `DEPLOYMENT_GUIDE.md` - Updated secrets configuration instructions
- ✅ `DEPLOYMENT_VERIFICATION.md` - Updated Aramex credentials section
- ✅ `OAUTH2_UPDATE_SUMMARY.md` - This document

---

## Required Secrets Configuration

### Set in Supabase Dashboard → Settings → Edge Functions → Secrets

```env
ARAMEX_BASE_URL=https://api.aramex.com/connect/v1
ARAMEX_CLIENT_ID=your_aramex_client_id_here
ARAMEX_CLIENT_SECRET=your_aramex_client_secret_here
ARAMEX_ACCOUNT_ENTITY=SYD
ARAMEX_ACCOUNT_COUNTRY=AU
```

### How to Get Your Credentials

1. **Log in to Aramex Connect Developer Portal**
   - URL: https://developer.aramex.com (or your region-specific portal)

2. **Create or Access Your Application**
   - Navigate to Applications → My Apps
   - Create a new application or select existing

3. **Retrieve OAuth2 Credentials**
   - Copy your **Client ID**
   - Copy your **Client Secret** (keep this secure!)

4. **Configure in Supabase**
   - Go to your Supabase project dashboard
   - Settings → Edge Functions → Secrets
   - Add each environment variable

---

## API Behavior (Unchanged)

The public API shape remains **exactly the same**. No changes are required to client code or API calls.

### Quote Endpoint
```bash
curl -X POST 'https://eackhgndklkwfofeacoa.supabase.co/functions/v1/api-quote' \
  -H 'Authorization: Bearer YOUR_NSJ_API_KEY' \
  -H 'Content-Type: application/json' \
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

**Response (unchanged)**:
```json
{
  "quoteId": "uuid",
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

### Book Endpoint
```bash
curl -X POST 'https://eackhgndklkwfofeacoa.supabase.co/functions/v1/api-book' \
  -H 'Authorization: Bearer YOUR_NSJ_API_KEY' \
  -H 'Content-Type': application/json' \
  -d '{
    "quoteId": "your-quote-id",
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
    "packages": [{
      "weight": 5,
      "length": 40,
      "width": 30,
      "height": 20,
      "description": "Electronics"
    }],
    "reference": "ORDER-12345"
  }'
```

**Response (unchanged)**:
```json
{
  "bookingId": "uuid",
  "consignmentNumber": "1234567890",
  "labelUrl": "https://...",
  "trackingUrl": "https://www.aramex.com/au/track/shipment/1234567890",
  "status": "confirmed"
}
```

### Track Endpoint
```bash
curl -X GET 'https://eackhgndklkwfofeacoa.supabase.co/functions/v1/api-track/1234567890' \
  -H 'Authorization: Bearer YOUR_NSJ_API_KEY'
```

**Response (unchanged)**:
```json
{
  "consignmentNumber": "1234567890",
  "status": "in_transit",
  "events": [
    {
      "timestamp": "2025-12-03T10:30:00Z",
      "status": "PICKED_UP",
      "location": "Sydney",
      "description": "Package picked up"
    }
  ]
}
```

---

## Technical Implementation Details

### OAuth2 Token Management

**Token Acquisition**:
```typescript
private async getAccessToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid
  if (this.accessToken && now < this.tokenExpiry) {
    return this.accessToken;
  }

  // Fetch new token
  const tokenUrl = `${this.baseUrl}/oauth/token`;
  const credentials = btoa(`${this.clientId}:${this.clientSecret}`);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  this.accessToken = data.access_token;
  const expiresIn = data.expires_in || 3600;
  this.tokenExpiry = now + (expiresIn * 1000) - 60000; // Refresh 1min before expiry

  return this.accessToken;
}
```

**Authenticated Requests**:
```typescript
private async makeAuthenticatedRequest(endpoint: string, payload: any) {
  const token = await this.getAccessToken();

  const response = await fetch(`${this.baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return await response.json();
}
```

### Updated API Endpoints

| Operation | Old Endpoint | New Endpoint |
|-----------|--------------|--------------|
| Get Rate | `/CalculateRate` | `/rates/calculate` |
| Create Shipment | `/CreateShipment` | `/shipments/create` |
| Track Shipment | `/TrackShipments` | `/shipments/track` |

### Updated Payload Structure

The request payload format has been updated to match Aramex Connect API standards:
- camelCase property names instead of PascalCase
- Simplified structure without `ClientInfo` wrapper
- OAuth2 Bearer token in Authorization header

---

## Testing

### 1. Verify Functions are Deployed
```bash
# Should show all 4 functions as ACTIVE
curl -X GET 'https://eackhgndklkwfofeacoa.supabase.co/functions/v1'
```

### 2. Test Authentication (Should Return 401)
```bash
curl -X POST 'https://eackhgndklkwfofeacoa.supabase.co/functions/v1/api-quote' \
  -H 'Content-Type: application/json' \
  -d '{"collectionSuburb":"Sydney","collectionPostcode":"2000","deliverySuburb":"Melbourne","deliveryPostcode":"3000","weight":5,"length":40,"width":30,"height":20}'
```

**Expected**: `{"error":"Missing Authorization header"}`

### 3. Test with Valid API Key (After Configuring Aramex Credentials)
```bash
curl -X POST 'https://eackhgndklkwfofeacoa.supabase.co/functions/v1/api-quote' \
  -H 'Authorization: Bearer YOUR_NSJ_API_KEY' \
  -H 'Content-Type: application/json' \
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

**Expected**: Quote response with pricing or Aramex OAuth error (if credentials not configured)

---

## Troubleshooting

### Error: "OAuth token error: Failed to get access token"

**Cause**: Invalid Client ID or Client Secret

**Solution**:
1. Verify your Aramex Connect credentials
2. Check they are correctly set in Supabase Secrets
3. Ensure no extra spaces or characters

### Error: "Aramex API error: 401"

**Cause**: Invalid or expired access token

**Solution**: The system should auto-refresh. If persists:
1. Check your Aramex Connect account is active
2. Verify API access is enabled for your application
3. Confirm the Client Secret hasn't been regenerated

### Error: "Aramex API error: 403"

**Cause**: Insufficient permissions for your Client ID

**Solution**:
1. Check your Aramex Connect application permissions
2. Ensure shipping API access is enabled
3. Verify your account has the necessary services activated

---

## Migration Checklist

- [x] Update Aramex client to use OAuth2
- [x] Remove username/password/PIN authentication
- [x] Implement token caching and refresh
- [x] Update API endpoints to Aramex Connect
- [x] Update request payload structure
- [x] Redeploy all Edge Functions
- [x] Update all documentation
- [ ] Configure Aramex OAuth2 credentials in Supabase
- [ ] Test quote endpoint with real credentials
- [ ] Test booking endpoint with real credentials
- [ ] Test tracking endpoint with real credentials

---

## Summary

✅ **OAuth2 authentication successfully implemented**
✅ **All 4 Edge Functions redeployed**
✅ **Public API shape unchanged**
✅ **Automatic token management**
✅ **Documentation updated**

**Next Step**: Configure your Aramex OAuth2 credentials (Client ID + Client Secret) in Supabase Dashboard → Edge Functions → Secrets

---

**Update Date**: December 3, 2025
**Project**: NSJ Express Backend API
**Base URL**: https://eackhgndklkwfofeacoa.supabase.co/functions/v1
