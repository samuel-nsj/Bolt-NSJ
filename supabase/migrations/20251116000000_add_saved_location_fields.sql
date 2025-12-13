/*
  # Add address_line2 and instructions to saved_locations

  1. Changes
    - Add `address_line2` column (optional second address line)
    - Add `instructions` column (delivery/pickup instructions)

  2. Notes
    - Both fields are optional (nullable or default empty string)
    - No RLS changes needed (existing policies cover all columns)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_locations' AND column_name = 'address_line2'
  ) THEN
    ALTER TABLE saved_locations ADD COLUMN address_line2 text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_locations' AND column_name = 'instructions'
  ) THEN
    ALTER TABLE saved_locations ADD COLUMN instructions text DEFAULT '';
  END IF;
END $$;
