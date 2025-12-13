/*
  # Create saved_quotes table

  1. New Tables
    - `saved_quotes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `pickup_postcode` (text)
      - `pickup_suburb` (text)
      - `pickup_state` (text)
      - `pickup_is_business` (boolean)
      - `delivery_postcode` (text)
      - `delivery_suburb` (text)
      - `delivery_state` (text)
      - `delivery_is_business` (boolean)
      - `service_type` (text)
      - `items` (jsonb)
      - `estimated_price` (numeric)
      - `estimated_eta` (integer)
      - `quote_name` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `saved_quotes` table
    - Add policies for authenticated users to manage their own quotes
*/

CREATE TABLE IF NOT EXISTS saved_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pickup_postcode text NOT NULL,
  pickup_suburb text,
  pickup_state text,
  pickup_is_business boolean DEFAULT false,
  delivery_postcode text NOT NULL,
  delivery_suburb text,
  delivery_state text,
  delivery_is_business boolean DEFAULT false,
  service_type text DEFAULT 'standard',
  items jsonb NOT NULL,
  estimated_price numeric NOT NULL,
  estimated_eta integer,
  quote_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE saved_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved quotes"
  ON saved_quotes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved quotes"
  ON saved_quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved quotes"
  ON saved_quotes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved quotes"
  ON saved_quotes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS saved_quotes_user_id_idx ON saved_quotes(user_id);
CREATE INDEX IF NOT EXISTS saved_quotes_created_at_idx ON saved_quotes(created_at DESC);