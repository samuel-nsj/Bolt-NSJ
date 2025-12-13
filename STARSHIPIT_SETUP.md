# StarShipIt Setup for Aramex Rates

## Required Supabase Secrets

Your edge function needs these secrets configured in Supabase:

### Go to: https://supabase.com/dashboard/project/tvnoabfwjwrnahgjpjyx/settings/vault

Add these two secrets:

1. **STARSHIPIT_API_KEY**
   - Value: `db582afb3f274b52b4b50f62263b2420`

2. **STARSHIPIT_SUBSCRIPTION_KEY**
   - Value: `472e9d0c8bae4f4aa2cd0bcd9fe7f45f`

## How to Add Secrets

1. Click "New secret"
2. Enter the name (e.g., `STARSHIPIT_API_KEY`)
3. Enter the value
4. Click "Save"
5. Repeat for the second secret

## Once Added

The `get-aramex-rate` edge function will automatically:
- Fetch real-time shipping rates from StarShipIt
- Look for Aramex rates specifically
- Fall back to the cheapest available rate if Aramex isn't available
- Return the rate to the booking form

## Testing

After adding the secrets, the booking form will automatically calculate shipping prices as users enter:
- Pickup postcode
- Delivery postcode
- Package weight and dimensions

The price updates in real-time!
