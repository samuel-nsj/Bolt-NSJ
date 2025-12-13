/*
  # Add quantity column to bookings table

  1. Changes
    - Add `quantity` column to bookings table to store number of packages
    - Remove deprecated columns: courier_preference and delivery_speed
*/

DO $$
BEGIN
  -- Add quantity column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE bookings ADD COLUMN quantity integer DEFAULT 1;
  END IF;

  -- Remove courier_preference if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'courier_preference'
  ) THEN
    ALTER TABLE bookings DROP COLUMN courier_preference;
  END IF;

  -- Remove delivery_speed if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'delivery_speed'
  ) THEN
    ALTER TABLE bookings DROP COLUMN delivery_speed;
  END IF;
END $$;
