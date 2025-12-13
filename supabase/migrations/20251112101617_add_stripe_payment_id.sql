/*
  # Add Stripe Payment ID Field

  1. Changes
    - Add `stripe_payment_id` column to `bookings` table to store Stripe checkout session IDs
  
  2. Purpose
    - Track Stripe payment sessions for reconciliation and support
    - Link bookings to their corresponding Stripe payment records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'stripe_payment_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN stripe_payment_id text;
  END IF;
END $$;