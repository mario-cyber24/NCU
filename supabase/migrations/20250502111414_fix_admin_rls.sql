/*
  # Fix admin RLS policy

  The current admin policy has a circular reference issue:
  - The policy checks if a user is an admin by querying the profiles table
  - But to query the profiles table, the policy needs to evaluate first
  
  This migration:
  1. Drops the problematic admin policy
  2. Creates a corrected version that uses auth.uid() in the policy directly
*/

-- Drop the problematic admin policy for profiles table
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

-- Create a new, correctly implemented policy
CREATE POLICY "Admins can read all profiles" 
  ON profiles 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    ) OR
    auth.uid() = id
  );

-- Also fix admin policies for other tables to ensure consistent access
DROP POLICY IF EXISTS "Admins can read all accounts" ON accounts;

CREATE POLICY "Admins can read all accounts" 
  ON accounts 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    ) OR
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Admins can read all transactions" ON transactions;

CREATE POLICY "Admins can read all transactions" 
  ON transactions 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    ) OR
    auth.uid() = user_id
  );