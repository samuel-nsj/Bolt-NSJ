# NSJ Express Backend - Deployment Guide

This guide walks through deploying the complete NSJ Express backend system.

## Quick Start

### 1. Database Setup ✅ COMPLETED

The database schema has been applied with the following tables:
- `api_customers` - Customer accounts and markup configuration
- `freight_quotes` - Quote requests and responses
- `api_request_logs` - API logging
- `customer_api_keys` - API key management

### 2. Configure Environment Variables

Set the following secrets in your Supabase dashboard (Settings > Edge Functions > Secrets):

```env
ARAMEX_BASE_URL=https://api.aramex.com/connect/v1
ARAMEX_CLIENT_ID=your_aramex_client_id
ARAMEX_CLIENT_SECRET=your_aramex_client_secret
ARAMEX_ACCOUNT_ENTITY=SYD
ARAMEX_ACCOUNT_COUNTRY=AU
```

**Important**: The system uses OAuth2 Client Credentials flow:
- `ARAMEX_CLIENT_ID` and `ARAMEX_CLIENT_SECRET` are used to obtain access tokens
- Access tokens are automatically cached and refreshed as needed
- No username, password, or account PIN are required

**Note**: SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are automatically available.

### 3. Deploy Edge Functions

Due to Supabase Edge Functions' limitation with shared modules across folders, each function needs to be deployed with inlined dependencies.

The following Edge Functions are ready in your project:

#### Core API Functions:
1. **api-quote** - `/supabase/functions/api-quote/index.ts`
   - Handles quote requests
   - Applies markup
   - Returns pricing breakdown

2. **api-book** - `/supabase/functions/api-book/index.ts`
   - Creates bookings with Aramex
   - Generates shipping labels
   - Returns consignment number

3. **api-track** - `/supabase/functions/api-track/index.ts`
   - Tracks shipments
   - Returns event history

4. **api-customers** - `/supabase/functions/api-customers/index.ts`
   - Customer CRUD operations
   - API key generation
   - Admin only access

5. **cleanup-old-quotes** - `/supabase/functions/cleanup-old-quotes/index.ts`
   - Scheduled daily cleanup
   - Removes quotes older than 30 days

### 4. Create Your First Customer

Use the Supabase SQL Editor to create a test customer:

```sql
-- Create a customer account
INSERT INTO api_customers (
  business_name,
  email,
  phone,
  markup_type,
  markup_value,
  is_active
) VALUES (
  'Test Company',
  'test@example.com',
  '+61400000000',
  'percentage',
  15,
  true
) RETURNING id;

-- Generate an API key for this customer
-- (In production, use the api-customers endpoint to generate hashed keys)
```

### 5. Test the API

```bash
# Set your variables
PROJECT_REF="your-project-ref"
API_KEY="your-generated-api-key"

# Test Quote Endpoint
curl -X POST "https://${PROJECT_REF}.supabase.co/functions/v1/api-quote" \
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

# Expected Response:
# {
#   "quoteId": "...",
#   "carrier": "Aramex",
#   "baseCost": 45.00,
#   "markupAmount": 6.75,
#   "totalCost": 51.75,
#   "currency": "AUD"
# }
```

## Architecture

```
┌─────────────────┐
│   Frontend/API  │
│    Client       │
└────────┬────────┘
         │ HTTPS + Auth
         │
┌────────▼─────────────────────────────────┐
│        Supabase Edge Functions           │
│  ┌──────────┬──────────┬────────────┐   │
│  │api-quote │ api-book │ api-track  │   │
│  └──────────┴──────────┴────────────┘   │
│         │                                 │
│  ┌──────▼──────────────────────────┐    │
│  │  Shared Modules (Inlined)       │    │
│  │  • Aramex Client                │    │
│  │  • Markup Engine                │    │
│  │  • Auth Middleware              │    │
│  │  • Rate Limiter                 │    │
│  │  • Logger                       │    │
│  └─────────────────────────────────┘    │
└──────────────┬───────────────────────────┘
               │
     ┌─────────┴──────────┐
     │                    │
┌────▼──────┐     ┌──────▼─────────┐
│ Supabase  │     │  Aramex Connect│
│ Postgres  │     │      API       │
└───────────┘     └────────────────┘
```

## Markup Configuration Examples

### Example 1: Percentage Markup
```json
{
  "markup_type": "percentage",
  "markup_value": 15
}
```
- Base cost: $100.00
- Markup: $100.00 × 15% = $15.00
- **Total: $115.00**

### Example 2: Fixed Dollar Markup
```json
{
  "markup_type": "fixed",
  "markup_value": 12.50
}
```
- Base cost: $100.00
- Markup: $12.50
- **Total: $112.50**

### Example 3: Custom Per-Customer Markup
Different customers can have different markup configurations:

```sql
-- High-volume customer: 10% markup
UPDATE api_customers
SET markup_type = 'percentage', markup_value = 10
WHERE email = 'highvolume@example.com';

-- Standard customer: 15% markup (default)
UPDATE api_customers
SET markup_type = 'percentage', markup_value = 15
WHERE email = 'standard@example.com';

-- Enterprise customer: fixed $8 markup
UPDATE api_customers
SET markup_type = 'fixed', markup_value = 8
WHERE email = 'enterprise@example.com';
```

## API Integration Examples

### JavaScript/TypeScript Client

```typescript
const SUPABASE_URL = 'https://your-project.supabase.co';
const API_KEY = 'nsjx_your_api_key';

async function getQuote(quoteRequest) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/api-quote`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(quoteRequest),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return await response.json();
}

const quote = await getQuote({
  collectionSuburb: 'Sydney',
  collectionPostcode: '2000',
  deliverySuburb: 'Melbourne',
  deliveryPostcode: '3000',
  weight: 5,
  length: 40,
  width: 30,
  height: 20,
});

console.log(`Total cost: $${quote.totalCost}`);
```

### Python Client

```python
import requests
import json

SUPABASE_URL = 'https://your-project.supabase.co'
API_KEY = 'nsjx_your_api_key'

def get_quote(quote_request):
    response = requests.post(
        f'{SUPABASE_URL}/functions/v1/api-quote',
        headers={
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json',
        },
        json=quote_request
    )
    response.raise_for_status()
    return response.json()

quote = get_quote({
    'collectionSuburb': 'Sydney',
    'collectionPostcode': '2000',
    'deliverySuburb': 'Melbourne',
    'deliveryPostcode': '3000',
    'weight': 5,
    'length': 40,
    'width': 30,
    'height': 20,
})

print(f"Total cost: ${quote['totalCost']}")
```

## Production Checklist

- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Edge Functions deployed
- [ ] Test customer created
- [ ] API endpoints tested
- [ ] Aramex credentials validated
- [ ] Rate limiting tested
- [ ] Error handling verified
- [ ] API documentation shared with team
- [ ] Monitoring dashboard set up
- [ ] Backup strategy defined
- [ ] SSL/HTTPS enforced
- [ ] API keys rotated and secured

## Monitoring

### View Recent API Logs
```sql
SELECT
  log_type,
  status_code,
  duration_ms,
  created_at,
  error_message
FROM api_request_logs
ORDER BY created_at DESC
LIMIT 50;
```

### Check Customer Activity
```sql
SELECT
  c.business_name,
  COUNT(q.id) as total_quotes,
  SUM(q.total_cost) as total_revenue
FROM api_customers c
LEFT JOIN freight_quotes q ON q.customer_id = c.id
WHERE c.is_active = true
GROUP BY c.id, c.business_name
ORDER BY total_revenue DESC;
```

### Monitor Error Rates
```sql
SELECT
  log_type,
  status_code,
  COUNT(*) as count
FROM api_request_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY log_type, status_code
ORDER BY count DESC;
```

## Troubleshooting

### Issue: "Invalid authentication credentials"
**Solution**: Verify API key is correctly formatted and exists in `customer_api_keys` table.

### Issue: "Rate limit exceeded"
**Solution**: Wait 60 seconds or increase rate limit in the `RateLimiter` class.

### Issue: "Failed to get quote from carrier"
**Solution**: Check Aramex credentials and API connectivity.

### Issue: Customer markup not applying
**Solution**: Verify customer record has correct `markup_type` and `markup_value`.

## Next Steps

1. **Production Hardening**: Add request validation, input sanitization
2. **Advanced Features**: Multi-carrier support, bulk quotes
3. **Analytics Dashboard**: Build admin dashboard for monitoring
4. **Webhook Integration**: Add webhook support for order notifications
5. **Documentation**: Generate Swagger/OpenAPI specifications

## Support

- Review `BACKEND_README.md` for complete API documentation
- Check `supabase/functions/_shared/` for module implementations
- Refer to Aramex API documentation for carrier-specific details
