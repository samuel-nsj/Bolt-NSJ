# NSJ Express Integration Setup Guide

## THE COMPLETE FLOW (Payment-First)

1. **Customer Books** → Booking saved to Supabase (status: "pending")
2. **Xero Invoice Created** → Automated via Supabase Edge Function
3. **Customer Receives Email** → Xero sends invoice with payment link
4. **Customer Pays in Xero** → Payment processed and confirmed
5. **Xero Webhook Fires** → Sends notification to your webhook endpoint
6. **Order Sent to StarShipIt** → Automated via Zapier
7. **Booking Status Updated** → Changed to "paid" in Supabase

---

## 1. Supabase Setup ✅ COMPLETE

### Status
- Database: Connected and working
- Tables: bookings with all required columns including xero_invoice_id, xero_invoice_number
- Authentication: Email/password enabled
- Edge Functions: Deployed (create-xero-invoice, xero-webhook)

### Your Credentials
```
VITE_SUPABASE_URL=https://tvnoabfwjwrnahgjpjyx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### Edge Functions Deployed
1. **create-xero-invoice** - Creates invoice in Xero when booking is submitted
2. **xero-webhook** - Receives Xero payment notifications and triggers StarShipIt

---

## 2. Xero Setup (REQUIRED)

### You Need These Credentials

**Option A: OAuth App (Recommended)**
1. Go to https://developer.xero.com/app/manage
2. Click "New App" → Choose "Web App"
3. App Name: "NSJ Express"
4. OAuth 2.0 redirect URI: `https://tvnoabfwjwrnahgjpjyx.supabase.co/functions/v1/xero-webhook`
5. Get your credentials:
   - Client ID
   - Client Secret
   - Tenant ID (from your Xero organization)

**Option B: Private App (Simpler)**
1. Go to https://developer.xero.com/app/manage
2. Click "New App" → Choose "Private App" (if available)
3. Get credentials directly

### Add to Supabase Secrets
These must be configured in your Supabase project:

```bash
XERO_CLIENT_ID=your_xero_client_id
XERO_CLIENT_SECRET=your_xero_client_secret
XERO_TENANT_ID=your_xero_tenant_id
```

**How to add secrets:**
1. Go to https://supabase.com/dashboard/project/tvnoabfwjwrnahgjpjyx/settings/vault
2. Click "Add secret"
3. Add each secret one by one

### Xero Webhook Configuration
1. In your Xero Developer account, go to your app
2. Configure webhook URL:
   ```
   https://tvnoabfwjwrnahgjpjyx.supabase.co/functions/v1/xero-webhook
   ```
3. Subscribe to: **INVOICE** events (specifically UPDATE events)

---

## 3. Zapier Setup (REQUIRED)

### Your Zapier Webhook ✅
```
https://hooks.zapier.com/hooks/catch/25155687/u820b6j/
```

### Zapier Zap Configuration

**Trigger:** Webhooks by Zapier → "Catch Hook"
- Your webhook URL is already configured in `.env`
- This receives paid orders from Xero webhook

**Action:** StarShipIt → "Create Order"

Map these fields:

| StarShipIt Field | Zapier Field Path |
|-----------------|-------------------|
| Order Number | `order.order_number` |
| Delivery Address | `order.delivery_address` |
| Delivery Country | `order.delivery_country` |
| Pickup Address | `order.pickup_address` |
| Pickup Country | `order.pickup_country` |
| Weight | `order.packages[0].weight` |
| Length | `order.packages[0].length` |
| Width | `order.packages[0].width` |
| Height | `order.packages[0].height` |
| Quantity | `order.packages[0].quantity` |
| Customer Name | `order.customer_name` |
| Customer Email | `order.customer_email` |
| Customer Phone | `order.customer_phone` |
| Total Price | `order.estimated_price` |

### Webhook Payload Structure
```json
{
  "order": {
    "order_number": "NSJ-abc123",
    "order_date": "2025-11-11T12:00:00.000Z",
    "delivery_address": "Sydney, 123 Main St",
    "delivery_country": "AU",
    "pickup_address": "Melbourne, 456 Warehouse Rd",
    "pickup_country": "AU",
    "packages": [{
      "weight": 2.5,
      "length": 30,
      "width": 20,
      "height": 15,
      "quantity": 1
    }],
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "+61 400 000 000",
    "estimated_price": 15.50
  },
  "source": "NSJ Express",
  "timestamp": "2025-11-11T12:00:00.000Z",
  "payment_status": "paid",
  "xero_invoice_id": "abc-123-xyz"
}
```

---

## 4. Testing the Complete Flow

### Prerequisites
✅ Supabase connected
✅ Zapier webhook configured
⏳ Xero credentials configured
⏳ Xero webhook configured

### Test Steps

1. **Create a Test Booking**
   - Go to your website
   - Sign up/login with a test account
   - Fill out booking form:
     - Pickup: Melbourne
     - Delivery: Sydney
     - Weight: 2kg
     - Package dimensions
   - Submit booking

2. **Check Supabase Database**
   ```sql
   SELECT * FROM bookings ORDER BY created_at DESC LIMIT 1;
   ```
   - Status should be "pending_payment"
   - Should have xero_invoice_id

3. **Check Xero**
   - Go to https://go.xero.com
   - Navigate to "Accounts" → "Sales" → "Invoices"
   - Find invoice with reference "NSJ-[booking-id]"
   - Status should be "AUTHORISED" (awaiting payment)

4. **Mark Invoice as Paid in Xero**
   - Open the invoice
   - Click "Add Payment"
   - Enter payment details
   - Save

5. **Xero Webhook Fires**
   - Check Supabase Edge Function logs
   - Should see "Order sent to StarShipIt"

6. **Check Zapier**
   - Go to https://zapier.com/app/history
   - Find the webhook task
   - Should show success

7. **Check StarShipIt**
   - Go to your StarShipIt dashboard
   - Find order "NSJ-[booking-id]"
   - Should be created and ready

8. **Check Booking Status**
   ```sql
   SELECT status FROM bookings WHERE id = 'booking-id';
   ```
   - Status should now be "paid"

---

## 5. Environment Variables

### `.env` (Frontend)
```env
VITE_SUPABASE_URL=https://tvnoabfwjwrnahgjpjyx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/25155687/u820b6j/
```

### Supabase Secrets (Backend)
```
XERO_CLIENT_ID=your_xero_client_id
XERO_CLIENT_SECRET=your_xero_client_secret
XERO_TENANT_ID=your_xero_tenant_id
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/25155687/u820b6j/
```

---

## 6. Booking Status Flow

```
pending → pending_payment → paid → fulfilled
```

- **pending**: Initial booking created
- **pending_payment**: Xero invoice created, awaiting payment
- **paid**: Payment received in Xero, order sent to StarShipIt
- **fulfilled**: (Optional) StarShipIt confirms shipment

---

## 7. What You Need to Configure

### Critical (Must Have)
1. ✅ Supabase credentials - Already done
2. ✅ Zapier webhook - Already done
3. ⏳ **Xero Client ID** - Get from https://developer.xero.com/app/manage
4. ⏳ **Xero Client Secret** - Get from https://developer.xero.com/app/manage
5. ⏳ **Xero Tenant ID** - Get from your Xero organization
6. ⏳ **Xero Webhook** - Configure to point to your edge function

### Optional (Nice to Have)
- Email notifications (using Supabase Auth emails)
- SMS notifications (via Twilio)
- Admin dashboard for viewing bookings

---

## 8. Support & Debugging

### Check Logs
1. **Supabase Edge Functions**:
   - https://supabase.com/dashboard/project/tvnoabfwjwrnahgjpjyx/logs/edge-functions

2. **Zapier History**:
   - https://zapier.com/app/history

3. **Xero Webhook Events**:
   - https://developer.xero.com/app/manage → Your App → Webhooks

### Common Issues

**Invoice Not Created**
- Check Xero credentials in Supabase secrets
- Check Edge Function logs for errors
- Verify Xero API access

**Webhook Not Firing**
- Verify Xero webhook URL is correct
- Check webhook is subscribed to INVOICE events
- Test webhook manually in Xero developer portal

**Order Not Sent to StarShipIt**
- Check Zapier webhook received payload
- Verify Zapier Zap is turned ON
- Check StarShipIt API credentials in Zapier

---

## 9. Production Checklist

Before going live:

- [ ] Xero credentials configured in Supabase
- [ ] Xero webhook URL configured and verified
- [ ] Zapier Zap tested and turned ON
- [ ] StarShipIt connected to Zapier
- [ ] Test complete flow with real payment
- [ ] Verify email notifications work
- [ ] Check all edge functions are deployed
- [ ] Confirm booking statuses update correctly

---

## Quick Reference

| Service | Purpose | Status |
|---------|---------|--------|
| Supabase | Database + Auth | ✅ Working |
| Xero | Payment/Invoicing | ⏳ Needs credentials |
| Zapier | Order forwarding | ✅ Webhook ready |
| StarShipIt | Fulfillment | ⏳ Connect via Zapier |

**Next Step:** Configure Xero credentials in Supabase secrets to activate the payment flow.
