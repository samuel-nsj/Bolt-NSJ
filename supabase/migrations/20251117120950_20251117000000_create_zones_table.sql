/*
  # Create zones and suburbs table

  1. New Tables
    - `zones`
      - `id` (uuid, primary key) - Unique identifier
      - `suburb` (text) - Suburb name
      - `postcode` (text) - Postal code
      - `commercial_category` (text) - Commercial category code
      - `region` (text) - Region code (SYD, MEL, BRI, etc.)
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Indexes
    - Index on suburb for fast lookup
    - Index on postcode for fast lookup
    - Index on region for filtering by region
    - Composite index on suburb and postcode for exact matching

  3. Security
    - Enable RLS on `zones` table
    - Add policy for public read access (zones are reference data)
    - Add policy for authenticated users to read zones
*/

-- Create zones table
CREATE TABLE IF NOT EXISTS zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suburb text NOT NULL,
  postcode text NOT NULL,
  commercial_category text NOT NULL,
  region text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_zones_suburb ON zones(suburb);
CREATE INDEX IF NOT EXISTS idx_zones_postcode ON zones(postcode);
CREATE INDEX IF NOT EXISTS idx_zones_region ON zones(region);
CREATE INDEX IF NOT EXISTS idx_zones_suburb_postcode ON zones(suburb, postcode);

-- Enable Row Level Security
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read zones (reference data)
CREATE POLICY "Zones are publicly readable"
  ON zones
  FOR SELECT
  USING (true);

-- Allow authenticated users to read zones
CREATE POLICY "Authenticated users can read zones"
  ON zones
  FOR SELECT
  TO authenticated
  USING (true);