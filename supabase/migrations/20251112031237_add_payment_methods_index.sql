/*
  # Add Index for Foreign Key

  1. Index Addition
    - Add index on `payment_methods.user_id` foreign key for optimal query performance
    - This index will improve JOIN operations and foreign key constraint checks
    - Particularly important for queries filtering or joining on user_id

  Note: The "Leaked Password Protection" warning is a configuration setting that must be
  enabled in the Supabase Dashboard under Authentication > Policies. This cannot be set via SQL.
  To enable: Dashboard > Settings > Auth > Security > Enable "Leaked Password Protection".
*/

-- Add index on payment_methods foreign key for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
