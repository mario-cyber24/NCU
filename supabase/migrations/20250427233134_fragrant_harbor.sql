/*
  # Update profiles table policies
  
  1. Changes
    - Add new admin read policy using JWT claims
    - Ensure proper access control for admin users
    
  2. Security
    - Uses JWT claims for admin verification
    - Maintains existing RLS protection
*/

-- First, drop the policy if it exists
DROP POLICY IF EXISTS "Enable select for admins to read all profiles" ON profiles;

-- Create new admin policy using JWT claims
CREATE POLICY "Enable select for admins to read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  ((auth.jwt() ->> 'is_admin')::boolean = true)
  OR auth.uid() = id
);

-- Ensure RLS is enabled
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;