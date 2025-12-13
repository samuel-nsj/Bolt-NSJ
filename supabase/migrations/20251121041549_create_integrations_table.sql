/*
  # Create Integrations Table for Merchant Platform Connections

  1. New Tables
    - `integrations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `platform` (text) - Platform name (shopify, woocommerce, neto, etc.)
      - `status` (text) - Connection status (pending, connected, disconnected, error)
      - `connected_at` (timestamptz) - When connection was established
      - `zap_link` (text) - URL to the Zapier shared zap
      - `store_url` (text) - Merchant's store URL
      - `store_name` (text) - Display name for the store
      - `api_credentials` (jsonb) - Encrypted API keys/tokens if needed
      - `last_sync_at` (timestamptz) - Last successful sync timestamp
      - `error_message` (text) - Any error messages
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `integrations` table
    - Add policies for authenticated users to manage their own integrations
*/

CREATE TABLE IF NOT EXISTS integrations (
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

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own integrations"
  ON integrations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own integrations"
  ON integrations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations"
  ON integrations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations"
  ON integrations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_platform ON integrations(platform);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);

CREATE OR REPLACE FUNCTION update_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_integrations_updated_at();