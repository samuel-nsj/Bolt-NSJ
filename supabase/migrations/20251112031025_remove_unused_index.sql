/*
  # Remove Unused Index

  1. Index Cleanup
    - Remove `idx_payment_methods_user_id` index as it has not been used
    - The foreign key constraint will still enforce referential integrity
    - If query performance issues arise in the future, the index can be recreated

  Note: The "Leaked Password Protection" warning is a configuration setting in the Supabase Dashboard
  under Authentication > Policies that cannot be enabled via SQL migration. This must be enabled manually
  in the Supabase Dashboard: Settings > Auth > Security > Enable "Leaked Password Protection".
*/

-- Remove unused index on payment_methods.user_id
DROP INDEX IF EXISTS idx_payment_methods_user_id;
