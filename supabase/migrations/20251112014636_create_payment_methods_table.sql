/*
  # Create Payment Methods Table

  1. New Tables
    - `payment_methods`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `card_brand` (text) - visa, mastercard, amex, etc
      - `last_four` (text) - last 4 digits
      - `expiry_month` (text)
      - `expiry_year` (text)
      - `cardholder_name` (text)
      - `is_default` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `payment_methods` table
    - Add policy for users to read their own payment methods
    - Add policy for users to insert their own payment methods
    - Add policy for users to update their own payment methods
    - Add policy for users to delete their own payment methods
*/

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  card_brand text NOT NULL DEFAULT 'visa',
  last_four text NOT NULL,
  expiry_month text NOT NULL,
  expiry_year text NOT NULL,
  cardholder_name text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own payment methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment methods"
  ON payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment methods"
  ON payment_methods FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods"
  ON payment_methods FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_payment_methods_updated_at'
  ) THEN
    CREATE TRIGGER update_payment_methods_updated_at
      BEFORE UPDATE ON payment_methods
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
