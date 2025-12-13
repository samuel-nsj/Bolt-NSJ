/*
  # Create Saved Locations and Saved Items Tables

  1. New Tables
    - `saved_locations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text) - Label for the location (e.g., "Main Warehouse")
      - `contact_name` (text)
      - `company_name` (text, optional)
      - `phone` (text)
      - `email` (text)
      - `address_line1` (text)
      - `suburb` (text)
      - `postcode` (text)
      - `state` (text, optional)
      - `is_pickup` (boolean) - Can be used for pickup
      - `is_delivery` (boolean) - Can be used for delivery
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `saved_items`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text) - Label for the item (e.g., "Standard Box")
      - `type` (text) - pallet, carton, satchel, skid, crate
      - `weight` (decimal)
      - `length` (decimal)
      - `width` (decimal)
      - `height` (decimal)
      - `description` (text, optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own saved locations and items
*/

CREATE TABLE IF NOT EXISTS saved_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  contact_name text NOT NULL,
  company_name text DEFAULT '',
  phone text NOT NULL,
  email text NOT NULL,
  address_line1 text NOT NULL,
  suburb text NOT NULL,
  postcode text NOT NULL,
  state text DEFAULT '',
  is_pickup boolean DEFAULT true,
  is_delivery boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  weight decimal(10, 2) NOT NULL,
  length decimal(10, 2) NOT NULL,
  width decimal(10, 2) NOT NULL,
  height decimal(10, 2) NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE saved_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved locations"
  ON saved_locations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved locations"
  ON saved_locations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved locations"
  ON saved_locations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved locations"
  ON saved_locations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own saved items"
  ON saved_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved items"
  ON saved_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved items"
  ON saved_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved items"
  ON saved_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS saved_locations_user_id_idx ON saved_locations(user_id);
CREATE INDEX IF NOT EXISTS saved_items_user_id_idx ON saved_items(user_id);
