/*
  # Create bookings table for NSJ Express

  1. New Tables
    - `bookings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `pickup_address` (text)
      - `delivery_address` (text)
      - `package_weight` (numeric)
      - `package_length` (numeric)
      - `package_width` (numeric)
      - `package_height` (numeric)
      - `courier_preference` (text)
      - `delivery_speed` (text)
      - `customer_name` (text)
      - `customer_email` (text)
      - `customer_phone` (text)
      - `status` (text, default 'pending')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `bookings` table
    - Add policy for authenticated users to create their own bookings
    - Add policy for authenticated users to read their own bookings
    - Add policy for authenticated users to update their own bookings
*/

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pickup_address text NOT NULL,
  delivery_address text NOT NULL,
  package_weight numeric NOT NULL,
  package_length numeric NOT NULL,
  package_width numeric NOT NULL,
  package_height numeric NOT NULL,
  courier_preference text DEFAULT '',
  delivery_speed text DEFAULT 'standard',
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own bookings"
  ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON bookings(user_id);
CREATE INDEX IF NOT EXISTS bookings_created_at_idx ON bookings(created_at DESC);