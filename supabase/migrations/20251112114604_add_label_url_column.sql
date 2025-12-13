/*
  # Add label URL column to bookings table

  1. Changes
    - Add `label_url` column to store the shipping label PDF URL from StarShipIt
    - This allows customers to download and print their shipping labels

  2. Notes
    - Column is optional (nullable) as labels are generated after payment
    - URL will be populated after StarShipIt processes the order
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'label_url'
  ) THEN
    ALTER TABLE bookings ADD COLUMN label_url text;
  END IF;
END $$;