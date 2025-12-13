/*
  # NSJ Express Backend API Schema

  Creates tables for the backend API system to manage customers, quotes, and API access.

  ## New Tables

  ### 1. `api_customers`
  - Business customers with markup configuration
  - API key authentication support
  - Markup can be percentage or fixed dollar amount

  ### 2. `freight_quotes`
  - Carrier quote requests and responses
  - Pricing breakdown (base cost, markup, total)
  - Quote validity period

  ### 3. `api_request_logs`
  - Comprehensive API logging
  - Performance monitoring
  - Error tracking

  ### 4. `tracking_events`
  - Shipment tracking history (if not exists)
  - Event timeline

  ### 5. `customer_api_keys`
  - API key management
  - Usage tracking
  - Expiry support

  ## Security
  - RLS enabled on all tables
  - Customers can only access their own data
  - Service role has full management access
*/

-- Create api_customers table
CREATE TABLE IF NOT EXISTS api_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  business_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  markup_type text NOT NULL DEFAULT 'percentage' CHECK (markup_type IN ('percentage', 'fixed')),
  markup_value numeric NOT NULL DEFAULT 15,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create freight_quotes table
CREATE TABLE IF NOT EXISTS freight_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES api_customers(id) ON DELETE CASCADE,
  collection_suburb text NOT NULL,
  collection_postcode text NOT NULL,
  delivery_suburb text NOT NULL,
  delivery_postcode text NOT NULL,
  weight numeric NOT NULL,
  length numeric NOT NULL,
  width numeric NOT NULL,
  height numeric NOT NULL,
  carrier_name text NOT NULL DEFAULT 'Aramex',
  service_type text,
  base_cost numeric NOT NULL,
  markup_amount numeric NOT NULL,
  total_cost numeric NOT NULL,
  carrier_response jsonb,
  valid_until timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);

-- Create api_request_logs table
CREATE TABLE IF NOT EXISTS api_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type text NOT NULL,
  customer_id uuid REFERENCES api_customers(id) ON DELETE SET NULL,
  request_data jsonb,
  response_data jsonb,
  status_code integer,
  error_message text,
  duration_ms integer,
  ip_address text,
  endpoint text,
  created_at timestamptz DEFAULT now()
);

-- Create customer_api_keys table
CREATE TABLE IF NOT EXISTS customer_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES api_customers(id) ON DELETE CASCADE,
  key_hash text UNIQUE NOT NULL,
  key_prefix text NOT NULL,
  name text NOT NULL,
  last_used_at timestamptz,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_freight_quotes_customer_id ON freight_quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_freight_quotes_created_at ON freight_quotes(created_at);
CREATE INDEX IF NOT EXISTS idx_freight_quotes_valid_until ON freight_quotes(valid_until);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_customer_id ON api_request_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_created_at ON api_request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_log_type ON api_request_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_customer_api_keys_customer_id ON customer_api_keys(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_api_keys_key_hash ON customer_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_customers_email ON api_customers(email);

-- Enable Row Level Security
ALTER TABLE api_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE freight_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_customers table
CREATE POLICY "Customers can view own profile"
  ON api_customers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Customers can update own profile"
  ON api_customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages all customers"
  ON api_customers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for freight_quotes table
CREATE POLICY "Customers view own quotes"
  ON freight_quotes FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM api_customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Customers create quotes"
  ON freight_quotes FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (
      SELECT id FROM api_customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages all quotes"
  ON freight_quotes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for api_request_logs table
CREATE POLICY "Service role manages all logs"
  ON api_request_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for customer_api_keys table
CREATE POLICY "Customers view own API keys"
  ON customer_api_keys FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM api_customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages all API keys"
  ON customer_api_keys FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_api_customers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for api_customers updated_at
DROP TRIGGER IF EXISTS update_api_customers_updated_at ON api_customers;
CREATE TRIGGER update_api_customers_updated_at
  BEFORE UPDATE ON api_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_api_customers_timestamp();