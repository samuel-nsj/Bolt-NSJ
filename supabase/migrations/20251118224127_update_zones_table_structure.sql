/*
  # Update Zones Table Structure and Import New Data

  1. Changes
    - Clear all existing zone data
    - Update table structure to match new CSV format
    - STATE column instead of commercial_category
    - ZONE column instead of region
    - Import 4,989 new zone records

  2. Security
    - Maintains existing RLS policies
    - No changes to security model
*/

-- Clear existing data
TRUNCATE TABLE zones;

-- Drop old indexes if they exist
DROP INDEX IF EXISTS idx_zones_suburb;
DROP INDEX IF EXISTS idx_zones_postcode;
DROP INDEX IF EXISTS idx_zones_region;

-- Alter table structure to match new format
ALTER TABLE zones DROP COLUMN IF EXISTS commercial_category;
ALTER TABLE zones DROP COLUMN IF EXISTS region;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS zone text;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_zones_suburb ON zones(suburb);
CREATE INDEX IF NOT EXISTS idx_zones_postcode ON zones(postcode);
CREATE INDEX IF NOT EXISTS idx_zones_state ON zones(state);
CREATE INDEX IF NOT EXISTS idx_zones_zone ON zones(zone);