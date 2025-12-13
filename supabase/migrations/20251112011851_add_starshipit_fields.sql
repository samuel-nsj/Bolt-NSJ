/*
  # Add StarShipIT required fields to bookings table

  1. Changes
    - Add shipping and destination fields required by StarShipIT:
      - `reference` (text) - Additional reference for the order
      - `shipping_method` (text) - Shipping carrier method
      - `shipping_description` (text) - Description of shipping service
      - `currency` (text) - Currency code (default 'AUD')
      - `destination_name` (text) - Recipient name at destination
      - `destination_company` (text) - Company name at destination
      - `destination_building` (text) - Building name/number
      - `destination_street` (text) - Street address
      - `destination_suburb` (text) - Suburb/district
      - `destination_city` (text) - City name
      - `destination_state` (text) - State/province
      - `destination_postcode` (text) - Postal code
      - `destination_country` (text) - Country code (default 'AU')
      - `destination_email` (text) - Recipient email
      - `destination_phone` (text) - Recipient phone
      - `delivery_instructions` (text) - Special delivery instructions
      - `pickup_country` (text) - Pickup country code (default 'AU')
      - `sku` (text) - Item SKU/product code
      - `item_description` (text) - Item description
      - `item_value` (numeric) - Item declared value
      - `tariff_code` (text) - Customs tariff code
      - `country_of_origin` (text) - Country where item was manufactured

  2. Notes
    - These fields enable full integration with StarShipIT API
    - All fields are optional to maintain backward compatibility
    - Default values set for common fields (currency, country codes)
*/

DO $$
BEGIN
  -- Add reference field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'reference'
  ) THEN
    ALTER TABLE bookings ADD COLUMN reference text DEFAULT '';
  END IF;

  -- Add shipping fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'shipping_method'
  ) THEN
    ALTER TABLE bookings ADD COLUMN shipping_method text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'shipping_description'
  ) THEN
    ALTER TABLE bookings ADD COLUMN shipping_description text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'currency'
  ) THEN
    ALTER TABLE bookings ADD COLUMN currency text DEFAULT 'AUD';
  END IF;

  -- Add destination fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'destination_name'
  ) THEN
    ALTER TABLE bookings ADD COLUMN destination_name text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'destination_company'
  ) THEN
    ALTER TABLE bookings ADD COLUMN destination_company text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'destination_building'
  ) THEN
    ALTER TABLE bookings ADD COLUMN destination_building text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'destination_street'
  ) THEN
    ALTER TABLE bookings ADD COLUMN destination_street text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'destination_suburb'
  ) THEN
    ALTER TABLE bookings ADD COLUMN destination_suburb text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'destination_city'
  ) THEN
    ALTER TABLE bookings ADD COLUMN destination_city text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'destination_state'
  ) THEN
    ALTER TABLE bookings ADD COLUMN destination_state text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'destination_postcode'
  ) THEN
    ALTER TABLE bookings ADD COLUMN destination_postcode text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'destination_country'
  ) THEN
    ALTER TABLE bookings ADD COLUMN destination_country text DEFAULT 'AU';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'destination_email'
  ) THEN
    ALTER TABLE bookings ADD COLUMN destination_email text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'destination_phone'
  ) THEN
    ALTER TABLE bookings ADD COLUMN destination_phone text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'delivery_instructions'
  ) THEN
    ALTER TABLE bookings ADD COLUMN delivery_instructions text DEFAULT '';
  END IF;

  -- Add pickup country
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'pickup_country'
  ) THEN
    ALTER TABLE bookings ADD COLUMN pickup_country text DEFAULT 'AU';
  END IF;

  -- Add item fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'sku'
  ) THEN
    ALTER TABLE bookings ADD COLUMN sku text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'item_description'
  ) THEN
    ALTER TABLE bookings ADD COLUMN item_description text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'item_value'
  ) THEN
    ALTER TABLE bookings ADD COLUMN item_value numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'tariff_code'
  ) THEN
    ALTER TABLE bookings ADD COLUMN tariff_code text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'country_of_origin'
  ) THEN
    ALTER TABLE bookings ADD COLUMN country_of_origin text DEFAULT 'AU';
  END IF;
END $$;