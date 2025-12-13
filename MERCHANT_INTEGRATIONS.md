# NSJ Express - Merchant Integrations Dashboard

## Overview

The NSJ Express merchant portal includes a complete integrations dashboard that allows merchants to connect their ecommerce platforms and ERP systems to automatically sync orders to StarShipIt.

## Features

### Supported Platforms

**Ecommerce Platforms:**
- Shopify
- WooCommerce
- Neto (Maropost)
- Gold Coast

**ERP & Business Systems:**
- Microsoft Dynamics 365
- Oracle NetSuite
- Pronto Xi

**Other Systems:**
- Generic WMS/ERP

## Database Schema

### Integrations Table

The `integrations` table stores all platform connections for merchants:

```sql
CREATE TABLE integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'disconnected', 'error')),
  connected_at timestamptz,
  zap_link text,
  store_url text,
  store_name text,
  api_credentials jsonb,
  last_sync_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## User Journey

### 1. Dashboard View

When merchants log in, they see:
- Monthly shipment statistics
- Connected stores section showing all active integrations
- Quick access to connect new stores

### 2. Integrations Page

Navigate to the Integrations page to:
- View all available platforms organized by category
- See connection status (Connected ✅ / Pending ⏳)
- Click "Connect" buttons to start integration

### 3. Connection Flow

1. **Merchant clicks "Connect [Platform]"**
   - A pending integration record is created in Supabase
   - Opens Zapier shared Zap link in new tab

2. **Merchant completes Zapier setup**
   - Authenticates with their store/platform
   - Configures order sync settings
   - Zapier sends webhook to NSJ Express

3. **Integration confirmed**
   - Webhook updates integration status to "connected"
   - Store appears in dashboard as connected
   - Orders automatically sync to StarShipIt

## Zapier Integration Setup

### Webhook Endpoint

**URL:** `https://[your-project].supabase.co/functions/v1/integration-webhook`

### Required Payload

When a merchant successfully connects through Zapier, send:

```json
{
  "user_id": "uuid-of-merchant",
  "platform": "shopify",
  "status": "connected",
  "store_name": "My Store Name",
  "store_url": "https://mystore.myshopify.com",
  "api_credentials": {
    "api_key": "encrypted_or_tokenized"
  }
}
```

### Zapier Shared Zap URLs

Update these placeholders in `src/components/IntegrationsPage.tsx`:

```typescript
const PLATFORMS: Platform[] = [
  {
    id: 'shopify',
    name: 'Shopify',
    zapierLink: 'https://zapier.com/shared/YOUR-SHOPIFY-ZAP',
    ...
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    zapierLink: 'https://zapier.com/shared/YOUR-WOOCOMMERCE-ZAP',
    ...
  },
  // ... other platforms
];
```

## Automation Flow

### Complete Order Sync Process

1. **Order Created** in merchant's platform (Shopify, WooCommerce, etc.)

2. **Zapier Trigger** detects new order

3. **Create StarShipIt Shipment**
   - Extract order details from platform
   - Format data for StarShipIt API
   - Create shipment under NSJ Express account
   - StarShipIt generates tracking number

4. **Update Integration Record**
   - Send webhook to NSJ Express
   - Update `last_sync_at` timestamp
   - Store any error messages if sync fails

5. **Optional: Create Xero Invoice**
   - Generate invoice for NSJ Express billing
   - Link to shipment reference

6. **Update Merchant Platform**
   - Push tracking number back to order
   - Update order status to "Fulfilled"

## Merchant Portal Pages

### `/dashboard` - Main Dashboard

Shows:
- Monthly shipment statistics
- Revenue tracking
- Connected stores section
- Quick actions (Connect Store, Create Job)

### `/integrations` - Full Integrations Page

Features:
- Platform cards with logos
- Connection status indicators
- Category organization (Ecommerce, ERP, Other)
- "How It Works" guide
- Real-time status updates

## API Endpoints

### Integration Webhook

**POST** `/functions/v1/integration-webhook`

Updates or creates integration records based on Zapier webhooks.

**Authentication:** None required (public webhook)

**Request Body:**
```json
{
  "user_id": "merchant-uuid",
  "platform": "shopify",
  "status": "connected",
  "store_name": "Optional Store Name",
  "store_url": "Optional Store URL"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Integration updated successfully",
  "integration_id": "integration-uuid"
}
```

## Security Features

### Row Level Security (RLS)

All integration data is protected by RLS policies:
- Merchants can only view/edit their own integrations
- User authentication required for all operations
- Service role used for webhook updates

### API Credentials Storage

Sensitive credentials are stored in `api_credentials` JSONB field:
- Encrypt before storing
- Use Supabase Vault for encryption keys
- Never expose in frontend responses

## Styling & Theme

### Color Scheme

- Primary: Purple (`#6A1B9A`, `#7B1FA2`)
- Success: Green (`#10B981`)
- Warning: Yellow (`#F59E0B`)
- Error: Red (`#EF4444`)

### Design Principles

- Clean, Sendle-style UI
- White cards with soft shadows
- Rounded corners (8px)
- Purple action buttons
- Responsive grid layouts
- Clear status indicators

## Testing Checklist

- [ ] Create merchant account
- [ ] View empty integrations dashboard
- [ ] Click "Connect Store" button
- [ ] Verify Zapier link opens in new tab
- [ ] Complete Zapier authentication
- [ ] Confirm webhook receives data
- [ ] Verify integration shows as "Connected"
- [ ] Check dashboard displays connected store
- [ ] Test order sync from platform
- [ ] Verify shipment created in StarShipIt
- [ ] Confirm tracking number syncs back

## Future Enhancements

1. **Disconnect Integration**
   - Add button to disconnect stores
   - Archive integration record
   - Notify merchant

2. **Sync History**
   - Show recent order syncs
   - Display success/failure rates
   - Error logs and debugging

3. **Bulk Actions**
   - Reconnect multiple stores
   - Test connections
   - Export integration data

4. **Platform Analytics**
   - Orders per platform
   - Revenue by store
   - Performance metrics

5. **Custom Mappings**
   - Field mapping interface
   - Custom rule builder
   - Conditional logic

## Support Information

For merchant assistance:
- **Email:** support@nsjexpress.com.au
- **Phone:** (03) 4159 0619
- **Live Chat:** Available in dashboard

For technical integration support:
- Check webhook logs in Supabase
- Review Zapier execution history
- Contact StarShipIt support for API issues

## Troubleshooting

### Integration shows "Pending" but Zapier completed

**Solution:** Verify webhook endpoint is correctly configured in Zapier and sending proper payload with `user_id` and `platform` fields.

### Orders not syncing to StarShipIt

**Solution:**
1. Check Zapier Zap is enabled
2. Verify StarShipIt API credentials
3. Review Zapier execution logs
4. Confirm order format matches StarShipIt requirements

### Store shows "Connected" but no recent syncs

**Solution:** Check `last_sync_at` timestamp and review Zapier trigger settings to ensure new orders are detected.

## Deployment Notes

1. **Environment Variables** (auto-configured in Supabase):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STARSHIPIT_API_KEY`
   - `STARSHIPIT_SUBSCRIPTION_KEY`

2. **Edge Functions Deployed**:
   - `integration-webhook` - Handles Zapier connection confirmations

3. **Database Migrations Applied**:
   - `create_integrations_table` - Creates integrations schema with RLS

4. **Frontend Components**:
   - `IntegrationsPage.tsx` - Full integrations UI
   - `Dashboard.tsx` - Shows connected stores summary

---

**Note:** Replace all placeholder Zapier URLs with your actual shared Zap links before going live!
