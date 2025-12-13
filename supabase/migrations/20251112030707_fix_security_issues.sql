/*
  # Fix Security and Performance Issues

  1. Indexes
    - Add index on `payment_methods.user_id` foreign key for better query performance
    - Remove unused indexes: `bookings_created_at_idx` and `idx_chat_messages_created_at`

  2. RLS Policy Optimization
    - Update all RLS policies to use `(select auth.uid())` pattern instead of `auth.uid()`
    - This prevents re-evaluation of auth functions for each row, improving performance at scale
    - Affects policies on: bookings, user_profiles, payment_methods, chat_messages

  3. Function Security
    - Fix search_path for `update_updated_at_column` function to be immutable

  4. Tables affected:
    - bookings: 3 policies optimized
    - user_profiles: 3 policies optimized
    - payment_methods: 4 policies optimized, 1 index added
    - chat_messages: 2 policies optimized
*/

-- Add missing index on payment_methods foreign key
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);

-- Remove unused indexes
DROP INDEX IF EXISTS bookings_created_at_idx;
DROP INDEX IF EXISTS idx_chat_messages_created_at;

-- Drop and recreate function with secure search_path
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers for the function
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Optimize RLS policies for bookings table
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;

CREATE POLICY "Users can view own bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own bookings"
  ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own bookings"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Optimize RLS policies for user_profiles table
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- Optimize RLS policies for payment_methods table
DROP POLICY IF EXISTS "Users can read own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can insert own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can update own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can delete own payment methods" ON payment_methods;

CREATE POLICY "Users can read own payment methods"
  ON payment_methods
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own payment methods"
  ON payment_methods
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own payment methods"
  ON payment_methods
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own payment methods"
  ON payment_methods
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Optimize RLS policies for chat_messages table
DROP POLICY IF EXISTS "Users can view own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert own chat messages" ON chat_messages;

CREATE POLICY "Users can view own chat messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own chat messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));