/*
  # Add is_business field to saved_locations

  1. Changes
    - Add `is_business` column to saved_locations table to track whether location is business or residential
    - Default to false (residential)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_locations' AND column_name = 'is_business'
  ) THEN
    ALTER TABLE saved_locations ADD COLUMN is_business boolean DEFAULT false;
  END IF;
END $$;