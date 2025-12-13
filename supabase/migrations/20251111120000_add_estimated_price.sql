/*
  # Add estimated_price column to bookings table

  1. Changes
    - Add `estimated_price` column to bookings table to store calculated shipping cost
    - Column is numeric type to store prices with decimal precision
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'estimated_price'
  ) THEN
    ALTER TABLE bookings ADD COLUMN estimated_price numeric DEFAULT 0;
  END IF;
END $$;
