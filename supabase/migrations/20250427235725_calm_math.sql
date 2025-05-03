/*
  # Fix user registration foreign key constraint

  1. Changes
    - Update foreign key constraint on profiles table to correctly reference auth.users
    - Add missing indexes for performance
    - Update RLS policies for better security

  2. Security
    - Maintain existing RLS policies
    - Ensure proper authentication checks
*/

-- Drop the existing foreign key constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Add the correct foreign key constraint to auth.users
ALTER TABLE profiles
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON profiles(created_at);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Update policies to be more specific
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON profiles;
CREATE POLICY "Enable insert for authenticated users during signup"
ON profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Enable select for admins to read all profiles" ON profiles;
CREATE POLICY "Enable select for admins to read all profiles"
ON profiles FOR SELECT 
TO authenticated 
USING (
  (is_admin = true) OR 
  (auth.uid() = id)
);

DROP POLICY IF EXISTS "Enable select for users to read own profile" ON profiles;
CREATE POLICY "Enable select for users to read own profile"
ON profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Enable update for users to update own profile" ON profiles;
CREATE POLICY "Enable update for users to update own profile"
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);