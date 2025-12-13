/*
  # Add Detailed Booking Fields for Starshipit Integration

  1. New Columns Added to bookings table:
    ## Pickup Details
    - `pickup_name` (text) - Full name of person at pickup location
    - `pickup_company` (text, optional) - Company name at pickup
    - `pickup_phone` (text) - Phone number for pickup contact
    - `pickup_email` (text) - Email for pickup contact
    - `pickup_suburb` (text) - Suburb/city for pickup
    - `pickup_postcode` (text) - Postcode for pickup location

    ## Delivery Details
    - `delivery_name` (text) - Full name of recipient
    - `delivery_company` (text, optional) - Company name at delivery
    - `delivery_phone` (text) - Phone number for delivery contact
    - `delivery_email` (text) - Email for delivery contact
    - `delivery_suburb` (text) - Suburb/city for delivery
    - `delivery_postcode` (text) - Postcode for delivery location

    ## Package Details
    - `package_description` (text) - Description of package contents
    - `service_type` (text) - Service level (Standard/Express)
    - `reference_number` (text, optional) - Customer reference/order number

  2. Purpose
    - Enable complete Starshipit integration with all required fields
    - Allow Zapier to map all data correctly
    - Support proper shipping label generation
*/

-- Add pickup detail columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'pickup_name') THEN
    ALTER TABLE bookings ADD COLUMN pickup_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'pickup_company') THEN
    ALTER TABLE bookings ADD COLUMN pickup_company text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'pickup_phone') THEN
    ALTER TABLE bookings ADD COLUMN pickup_phone text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'pickup_email') THEN
    ALTER TABLE bookings ADD COLUMN pickup_email text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'pickup_suburb') THEN
    ALTER TABLE bookings ADD COLUMN pickup_suburb text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'pickup_postcode') THEN
    ALTER TABLE bookings ADD COLUMN pickup_postcode text;
  END IF;
END $$;

-- Add delivery detail columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'delivery_name') THEN
    ALTER TABLE bookings ADD COLUMN delivery_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'delivery_company') THEN
    ALTER TABLE bookings ADD COLUMN delivery_company text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'delivery_phone') THEN
    ALTER TABLE bookings ADD COLUMN delivery_phone text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'delivery_email') THEN
    ALTER TABLE bookings ADD COLUMN delivery_email text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'delivery_suburb') THEN
    ALTER TABLE bookings ADD COLUMN delivery_suburb text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'delivery_postcode') THEN
    ALTER TABLE bookings ADD COLUMN delivery_postcode text;
  END IF;
END $$;

-- Add package detail columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'package_description') THEN
    ALTER TABLE bookings ADD COLUMN package_description text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'service_type') THEN
    ALTER TABLE bookings ADD COLUMN service_type text DEFAULT 'Standard';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'reference_number') THEN
    ALTER TABLE bookings ADD COLUMN reference_number text;
  END IF;
END $$;