/*
  # Add Payment Fields to Bookings

  1. Changes
    - Add payment_status field (pending, processing, paid, failed)
    - Add payment_method field (card, bank_transfer)
    - Add payment_intent_id field (for payment processor reference)
    - Add paid_at timestamp
    - Add payment_amount field
    
  2. Security
    - No changes to RLS policies
*/

-- Add payment fields to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_method text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_intent_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_intent_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE bookings ADD COLUMN paid_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_amount'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_amount numeric DEFAULT 0;
  END IF;
END $$;
