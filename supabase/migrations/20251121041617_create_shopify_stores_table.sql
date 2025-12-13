/*
  # Create Shopify Integration Tables

  1. New Tables
    - `shopify_stores`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `shop_domain` (text, unique) - e.g., "mystore.myshopify.com"
      - `access_token` (text) - OAuth access token
      - `shop_name` (text) - Store display name
      - `shop_email` (text) - Store contact email
      - `shop_owner` (text) - Store owner name
      - `auto_create_bookings` (boolean) - Auto-create bookings for new orders
      - `default_pickup_address` (text) - Default pickup location
      - `webhook_id` (text) - Shopify webhook ID
      - `is_active` (boolean) - Store is active
      - `installed_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `shopify_orders`
      - `id` (uuid, primary key)
      - `store_id` (uuid, foreign key to shopify_stores)
      - `shopify_order_id` (text, unique) - Shopify's order ID
      - `order_number` (text) - Human-readable order number
      - `booking_id` (uuid, foreign key to bookings, nullable)
      - `customer_email` (text)
      - `customer_name` (text)
      - `customer_phone` (text)
      - `shipping_address` (jsonb) - Full address object
      - `total_weight` (numeric) - Total order weight in kg
      - `order_total` (numeric) - Order total amount
      - `fulfillment_status` (text) - pending, fulfilled, cancelled
      - `tracking_number` (text, nullable)
      - `tracking_url` (text, nullable)
      - `synced_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own stores and orders
    - Service role can access all data for webhook processing
*/

CREATE TABLE IF NOT EXISTS shopify_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_domain text UNIQUE NOT NULL,
  access_token text NOT NULL,
  shop_name text,
  shop_email text,
  shop_owner text,
  auto_create_bookings boolean DEFAULT true,
  default_pickup_address text,
  webhook_id text,
  is_active boolean DEFAULT true,
  installed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shopify_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES shopify_stores(id) ON DELETE CASCADE NOT NULL,
  shopify_order_id text UNIQUE NOT NULL,
  order_number text NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  customer_email text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  shipping_address jsonb NOT NULL,
  total_weight numeric DEFAULT 1.0,
  order_total numeric,
  fulfillment_status text DEFAULT 'pending',
  tracking_number text,
  tracking_url text,
  synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shopify_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stores"
  ON shopify_stores FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stores"
  ON shopify_stores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stores"
  ON shopify_stores FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stores"
  ON shopify_stores FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view orders from their stores"
  ON shopify_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shopify_stores
      WHERE shopify_stores.id = shopify_orders.store_id
      AND shopify_stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update orders from their stores"
  ON shopify_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shopify_stores
      WHERE shopify_stores.id = shopify_orders.store_id
      AND shopify_stores.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopify_stores
      WHERE shopify_stores.id = shopify_orders.store_id
      AND shopify_stores.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_shopify_stores_user_id ON shopify_stores(user_id);
CREATE INDEX IF NOT EXISTS idx_shopify_stores_shop_domain ON shopify_stores(shop_domain);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_store_id ON shopify_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_shopify_order_id ON shopify_orders(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_booking_id ON shopify_orders(booking_id);