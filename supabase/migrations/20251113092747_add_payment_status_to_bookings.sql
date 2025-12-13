/*
  # Add payment status tracking to bookings

  1. Changes
    - Add `payment_status` column to track payment state (pending, paid, failed)
    - Add `payment_intent_id` to link Stripe payment
    - Set default status to 'pending'
    
  2. Security
    - Existing RLS policies remain unchanged
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_status text DEFAULT 'pending';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_intent_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN payment_intent_id text;
  END IF;
END $$;