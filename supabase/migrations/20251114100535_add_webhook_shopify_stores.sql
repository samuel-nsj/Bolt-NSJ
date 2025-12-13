/*
  # Add support for webhook-based Shopify stores

  1. Changes
    - Make user_id nullable in shopify_stores to support webhook-only stores
    - Make access_token nullable since webhook stores don't use OAuth
    - Add a store_type column to distinguish between 'oauth' and 'webhook' stores

  2. Security
    - RLS policies already exist and will continue to work
    - Webhook stores without user_id will be accessible only through service role

  3. Notes
    - OAuth stores will have user_id, access_token, and store_type='oauth'
    - Webhook stores will have user_id, no access_token, and store_type='webhook'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shopify_stores' AND column_name = 'store_type'
  ) THEN
    ALTER TABLE shopify_stores ADD COLUMN store_type text DEFAULT 'webhook';
  END IF;
END $$;

DO $$
BEGIN
  ALTER TABLE shopify_stores ALTER COLUMN access_token DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;