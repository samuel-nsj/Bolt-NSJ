/*
  # NSJ Express Backend - Corrected Schema for Aramex Connect API

  ## Overview
  Complete database rebuild with corrected schema for Aramex Connect (AU) 2025 API integration.
  
  ## New Tables
  
  ### 1. api_customers
  Core customer accounts with markup configuration
  - `id` (uuid, primary key)
  - `business_name` (text) - Customer business name
  - `email` (text, unique) - Contact email
  - `phone` (text) - Contact phone
  - `markup_type` (text) - Either "percentage" or "fixed"
  - `markup_value` (numeric) - Markup amount
  - `is_active` (boolean) - Account status
  - `user_id` (uuid, nullable) - Link to auth.users for JWT authentication
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. customer_api_keys
  Hashed API keys for customer authentication
  - `id` (uuid, primary key)
  - `customer_id` (uuid, foreign key) - Links to api_customers
  - `key_hash` (text) - SHA-256 hashed API key
  - `key_prefix` (text) - First 8 chars for identification
  - `name` (text) - Descriptive name for the key
  - `is_active` (boolean) - Key status
  - `created_at` (timestamptz) - Key creation timestamp
  - `expires_at` (timestamptz, nullable) - Optional expiry
  - `last_used_at` (timestamptz, nullable) - Last usage timestamp

  ### 3. freight_quotes
  Stored quotes from Aramex with markup applied
  - `id` (uuid, primary key)
  - `customer_id` (uuid, foreign key) - Links to api_customers
  - `service_type` (text) - Aramex productCode
  - `base_cost` (numeric) - Aramex base price
  - `markup_amount` (numeric) - Applied markup
  - `total_cost` (numeric) - Final price to customer
  - `origin_suburb` (text) - Origin city
  - `origin_postcode` (text) - Origin postal code
  - `destination_suburb` (text) - Destination city
  - `destination_postcode` (text) - Destination postal code
  - `weight` (numeric) - Package weight in KG
  - `dimensions` (jsonb) - Package dimensions (length, width, height)
  - `carrier_response` (jsonb) - Full Aramex response
  - `valid_until` (timestamptz) - Quote expiry
  - `created_at` (timestamptz) - Quote creation timestamp

  ### 4. bookings
  Confirmed bookings with Aramex
  - `id` (uuid, primary key)
  - `customer_id` (uuid, foreign key) - Links to api_customers
  - `quote_id` (uuid, foreign key, nullable) - Links to freight_quotes
  - `consignment_number` (text, unique) - Aramex tracking number
  - `label_url` (text) - URL to shipping label PDF
  - `tracking_url` (text) - Aramex tracking page URL
  - `estimated_price` (numeric) - Total cost
  - `reference_number` (text) - Customer reference
  - `pickup_name` (text) - Shipper name
  - `pickup_address` (text) - Shipper address
  - `pickup_suburb` (text) - Shipper city
  - `pickup_postcode` (text) - Shipper postal code
  - `pickup_phone` (text) - Shipper phone
  - `pickup_email` (text) - Shipper email
  - `delivery_name` (text) - Consignee name
  - `delivery_address` (text) - Consignee address
  - `delivery_suburb` (text) - Consignee city
  - `delivery_postcode` (text) - Consignee postal code
  - `delivery_phone` (text) - Consignee phone
  - `delivery_email` (text) - Consignee email
  - `package_weight` (numeric) - Package weight in KG
  - `package_length` (numeric) - Length in CM
  - `package_width` (numeric) - Width in CM
  - `package_height` (numeric) - Height in CM
  - `package_description` (text) - Package contents description
  - `status` (text) - Booking status
  - `created_at` (timestamptz) - Booking creation timestamp

  ### 5. api_request_logs
  Comprehensive logging for all API requests
  - `id` (uuid, primary key)
  - `customer_id` (uuid, nullable) - Links to api_customers
  - `log_type` (text) - Type of operation (quote, book, track, etc.)
  - `endpoint` (text) - API endpoint called
  - `request_data` (jsonb) - Request payload
  - `response_data` (jsonb) - Response data
  - `status_code` (integer) - HTTP status code
  - `duration_ms` (integer) - Request duration in milliseconds
  - `error_message` (text, nullable) - Error details if any
  - `created_at` (timestamptz) - Log timestamp

  ## Security
  - All tables have Row Level Security (RLS) enabled
  - Customers can only access their own data
  - API keys are hashed using SHA-256 before storage
  - Authentication required for all operations

  ## Indexes
  - Optimized for common query patterns
  - Fast lookups by customer_id, consignment_number, etc.
*/

-- Drop existing tables if they exist (clean rebuild)
DROP TABLE IF EXISTS api_request_logs CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS freight_quotes CASCADE;
DROP TABLE IF EXISTS customer_api_keys CASCADE;
DROP TABLE IF EXISTS api_customers CASCADE;

-- Create api_customers table
CREATE TABLE IF NOT EXISTS api_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  markup_type text NOT NULL CHECK (markup_type IN ('percentage', 'fixed')),
  markup_value numeric NOT NULL CHECK (markup_value >= 0),
  is_active boolean DEFAULT true NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create customer_api_keys table
CREATE TABLE IF NOT EXISTS customer_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES api_customers(id) ON DELETE CASCADE NOT NULL,
  key_hash text UNIQUE NOT NULL,
  key_prefix text NOT NULL,
  name text DEFAULT 'API Key' NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz,
  last_used_at timestamptz
);

-- Create freight_quotes table
CREATE TABLE IF NOT EXISTS freight_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES api_customers(id) ON DELETE CASCADE NOT NULL,
  service_type text NOT NULL,
  base_cost numeric NOT NULL,
  markup_amount numeric NOT NULL,
  total_cost numeric NOT NULL,
  origin_suburb text NOT NULL,
  origin_postcode text NOT NULL,
  destination_suburb text NOT NULL,
  destination_postcode text NOT NULL,
  weight numeric NOT NULL,
  dimensions jsonb NOT NULL,
  carrier_response jsonb,
  valid_until timestamptz DEFAULT (now() + interval '7 days') NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES api_customers(id) ON DELETE CASCADE NOT NULL,
  quote_id uuid REFERENCES freight_quotes(id) ON DELETE SET NULL,
  consignment_number text UNIQUE NOT NULL,
  label_url text,
  tracking_url text,
  estimated_price numeric NOT NULL,
  reference_number text,
  pickup_name text NOT NULL,
  pickup_address text NOT NULL,
  pickup_suburb text NOT NULL,
  pickup_postcode text NOT NULL,
  pickup_phone text NOT NULL,
  pickup_email text,
  delivery_name text NOT NULL,
  delivery_address text NOT NULL,
  delivery_suburb text NOT NULL,
  delivery_postcode text NOT NULL,
  delivery_phone text NOT NULL,
  delivery_email text,
  package_weight numeric NOT NULL,
  package_length numeric NOT NULL,
  package_width numeric NOT NULL,
  package_height numeric NOT NULL,
  package_description text DEFAULT 'General Goods',
  status text DEFAULT 'confirmed' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create api_request_logs table
CREATE TABLE IF NOT EXISTS api_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES api_customers(id) ON DELETE SET NULL,
  log_type text NOT NULL,
  endpoint text NOT NULL,
  request_data jsonb,
  response_data jsonb,
  status_code integer NOT NULL,
  duration_ms integer,
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_customers_email ON api_customers(email);
CREATE INDEX IF NOT EXISTS idx_api_customers_user_id ON api_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_api_customers_is_active ON api_customers(is_active);

CREATE INDEX IF NOT EXISTS idx_customer_api_keys_customer_id ON customer_api_keys(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_api_keys_key_hash ON customer_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_customer_api_keys_is_active ON customer_api_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_freight_quotes_customer_id ON freight_quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_freight_quotes_created_at ON freight_quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_freight_quotes_valid_until ON freight_quotes(valid_until);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_consignment_number ON bookings(consignment_number);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_request_logs_customer_id ON api_request_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_created_at ON api_request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_log_type ON api_request_logs(log_type);

-- Enable Row Level Security on all tables
ALTER TABLE api_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE freight_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_customers
CREATE POLICY "Customers can view own account"
  ON api_customers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to customers"
  ON api_customers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for customer_api_keys
CREATE POLICY "Customers can view own API keys"
  ON customer_api_keys FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM api_customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to API keys"
  ON customer_api_keys FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for freight_quotes
CREATE POLICY "Customers can view own quotes"
  ON freight_quotes FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM api_customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to quotes"
  ON freight_quotes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for bookings
CREATE POLICY "Customers can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM api_customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to bookings"
  ON bookings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for api_request_logs
CREATE POLICY "Customers can view own logs"
  ON api_request_logs FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM api_customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to logs"
  ON api_request_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for api_customers
DROP TRIGGER IF EXISTS update_api_customers_updated_at ON api_customers;
CREATE TRIGGER update_api_customers_updated_at
  BEFORE UPDATE ON api_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
