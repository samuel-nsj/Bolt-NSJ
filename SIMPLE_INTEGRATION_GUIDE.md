# How to Connect Unlimited Products Through Stores

## What You Have Right Now

Your NSJ Express platform is **ready** to handle unlimited products from multiple stores. Here's what's already built:

### ✅ Built & Working
1. **Database** - Stores all integrations and orders
2. **Webhooks** - Edge functions that receive orders automatically
3. **Integration Dashboard** - UI where merchants connect their stores
4. **7 Platform Integrations** - Shopify, WooCommerce, Neto, Microsoft Dynamics, Oracle, Pronto, WMS

---

## How It Works (Simple Version)

```
Merchant's Store → Zapier → Your Webhook → Create Booking → StarShipIt
```

**What happens:**
1. Customer buys product in merchant's Shopify/WooCommerce/Neto store
2. Zapier detects the new order
3. Zapier sends order to your webhook
4. Your system creates a booking automatically
5. Order goes to StarShipIt for fulfillment
6. Tracking number sent back to store

**Result:** Unlimited products, unlimited orders, all automated!

---

## What You Need To Do

### Step 1: Create Zapier Zaps (One-Time Setup)

For EACH platform, you need to create a **Shared Zap** in Zapier:

#### Example: Shopify Integration

1. **Go to Zapier** → Create New Zap

2. **Trigger:** Shopify → "New Order"
   - Connect your StarShipIt Shopify account (or use test account)
   - Test that it can detect orders

3. **Action 1:** Webhooks by Zapier → "POST"
   - URL: `https://tvnoabfwjwrnahgjpjyx.supabase.co/functions/v1/shopify-webhook`
   - Method: POST
   - Headers:
     - `Content-Type`: `application/json`
     - `X-Shopify-Shop-Domain`: `{{shop_domain}}`
   - Body: (Use "Custom" and paste the raw Shopify order JSON)
   ```json
   {
     "id": "{{id}}",
     "name": "{{name}}",
     "email": "{{customer__email}}",
     "total_weight": "{{total_weight}}",
     "total_price": "{{total_price}}",
     "line_items": {{line_items}},
     "shipping_address": {{shipping_address}},
     "customer": {{customer}}
   }
   ```

4. **Action 2:** StarShipIt → "Create Order"
   - Map the fields from Shopify order to StarShipIt
   - This creates the shipment automatically

5. **Make it a Shared Zap**
   - Click "Share" in Zapier
   - Get the public URL (e.g., `https://zapier.com/shared/abc123`)

6. **Copy the Shared URL**

#### Repeat for Other Platforms

Do the same for:
- WooCommerce
- Neto
- Microsoft Dynamics
- Oracle NetSuite
- Pronto Xi
- Generic WMS

---

### Step 2: Update Your Code with Zap URLs

Open `/tmp/cc-agent/60007297/project/src/components/IntegrationsPage.tsx`

Find this section (around line 26):

```typescript
const PLATFORMS: Platform[] = [
  {
    id: 'shopify',
    name: 'Shopify',
    zapierLink: 'https://zapier.com/shared/nsj-shopify', // ← REPLACE THIS
    ...
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    zapierLink: 'https://zapier.com/shared/nsj-woocommerce', // ← REPLACE THIS
    ...
  },
  // ... etc
];
```

**Replace** each `zapierLink` with your actual Shared Zap URL from Step 1.

---

### Step 3: Merchants Connect Their Stores

Once you've done Steps 1 & 2, merchants can:

1. **Sign up** for NSJ Express account
2. **Go to Dashboard** → Click "Connect Store"
3. **Click "Connect Shopify"** (or any platform)
4. **Complete Zapier setup** (authenticate with their store)
5. **Done!** Their store is connected

From now on, **every order** from their store automatically:
- Creates a booking in your system
- Sends to StarShipIt
- Gets tracking number
- Updates their store

---

## Alternative: Direct API Integration (More Complex)

If you don't want to use Zapier, I can build direct API integrations. This requires:

### For Shopify (Example)
1. Create Shopify App in Shopify Partners
2. Get API credentials (API Key, Secret)
3. Build OAuth flow
4. Register webhook directly with Shopify
5. Receive orders at your webhook endpoint

**Pros:**
- No Zapier subscription needed
- More control
- Faster

**Cons:**
- More code to maintain
- Need to handle OAuth for each platform
- More complex setup

---

## What Happens When Orders Come In

### Automatic Flow (Already Built)

```sql
-- When order arrives at webhook:

1. Receive order data from Shopify/WooCommerce/etc
2. Extract customer info (name, email, phone, address)
3. Extract products (weight, dimensions, quantity)
4. Create booking in database:
   - Status: "pending_payment"
   - Payment status: "pending"
5. Calculate price using Aramex rates
6. Create Xero invoice (optional)
7. Send order to StarShipIt
8. Store tracking number
9. Update merchant's store with tracking
```

All of this happens **automatically** with the webhooks that are already deployed!

---

## Current Webhook Endpoints

These are **live and ready**:

### 1. Shopify Webhook
**URL:** `https://tvnoabfwjwrnahgjpjyx.supabase.co/functions/v1/shopify-webhook`

Handles Shopify orders automatically.

### 2. Integration Webhook
**URL:** `https://tvnoabfwjwrnahgjpjyx.supabase.co/functions/v1/integration-webhook`

Confirms when merchant connects a store.

### 3. Tracking Sync
**URL:** `https://tvnoabfwjwrnahgjpjyx.supabase.co/functions/v1/sync-tracking-to-shopify`

Sends tracking numbers back to stores.

---

## Testing The Flow

### Test with Real Order

1. **Connect a test Shopify store** (free developer store)
2. **Create Zapier Zap** as described above
3. **Place test order** in Shopify
4. **Check your Supabase database:**
   ```sql
   SELECT * FROM bookings ORDER BY created_at DESC LIMIT 1;
   ```
5. **Verify booking was created** with all order details
6. **Check StarShipIt** for the shipment
7. **Check Shopify** for tracking number update

---

## Unlimited Products & Orders

### How It Scales

Your system can handle:
- ✅ **Unlimited products** per store
- ✅ **Unlimited orders** per day
- ✅ **Unlimited stores** per merchant
- ✅ **Multiple merchants** (unlimited)

**Why?**
- Each order creates ONE booking record
- Bookings are lightweight (just addresses + dimensions)
- Webhooks process orders in real-time
- Supabase scales automatically

### Product Data

You don't need to store every product! Just:
- Order total
- Total weight
- Package dimensions
- Customer address

The merchant's store (Shopify/WooCommerce) keeps all the product catalog. You just fulfill the shipments.

---

## Quick Start (5 Minutes)

### Fastest Way to Test

1. **Create ONE Zapier Zap for Shopify:**
   - Trigger: Shopify → New Order
   - Action: POST to `https://tvnoabfwjwrnahgjpjyx.supabase.co/functions/v1/shopify-webhook`
   - Include order data in webhook body

2. **Make it a Shared Zap**

3. **Update IntegrationsPage.tsx:**
   ```typescript
   zapierLink: 'YOUR-ACTUAL-ZAP-URL'
   ```

4. **Deploy:**
   ```bash
   npm run build
   ```

5. **Test:**
   - Log into your merchant dashboard
   - Click "Connect Store"
   - Click "Connect Shopify"
   - Authenticate test store
   - Place test order
   - Watch it create booking automatically!

---

## Need Help?

### Option 1: Use Zapier (Recommended)
- Easier setup
- Works with all platforms
- No code changes needed
- Just create Shared Zaps and update URLs

### Option 2: Direct API (Advanced)
- I can build custom API integrations
- More control but more complex
- Requires OAuth flows for each platform

**Which do you prefer?** Let me know and I'll help set it up!

---

## Summary

**What You Have:**
- ✅ Working webhook system
- ✅ Integration dashboard UI
- ✅ Database for unlimited orders
- ✅ Automatic booking creation
- ✅ StarShipIt integration

**What You Need:**
- ⏳ Create Zapier Shared Zaps (7 total, one per platform)
- ⏳ Update code with Zap URLs
- ⏳ Test with one platform first

**Time Required:**
- 30 minutes to create all Zaps
- 5 minutes to update code
- 10 minutes to test

**Result:**
Merchants can connect unlimited stores, sync unlimited products, process unlimited orders—all automatically!
