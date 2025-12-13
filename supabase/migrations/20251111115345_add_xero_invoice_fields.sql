/*
  # Add Xero Invoice Fields

  1. Changes
    - Add `xero_invoice_id` column to store Xero invoice ID
    - Add `xero_invoice_number` column to store Xero invoice number for reference
    - Update status field to support new payment statuses

  2. Notes
    - Status flow: pending → pending_payment → paid → fulfilled
    - Xero invoice fields used to track payment status
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'xero_invoice_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN xero_invoice_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'xero_invoice_number'
  ) THEN
    ALTER TABLE bookings ADD COLUMN xero_invoice_number text;
  END IF;
END $$;