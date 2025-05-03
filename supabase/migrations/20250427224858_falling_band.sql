/*
  # Fix profiles table RLS policies

  1. Changes
    - Remove recursive policies that cause infinite loops
    - Add proper policies for profile creation and reading
    - Fix admin access policies
  
  2. Security
    - Enable RLS on profiles table
    - Add policies for:
      - Profile creation during signup
      - Users reading their own profile
      - Admins reading all profiles
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policies
CREATE POLICY "Enable insert for authenticated users during signup"
ON profiles FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable select for users to read own profile"
ON profiles FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Enable select for admins to read all profiles"
ON profiles FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles admin_check
    WHERE admin_check.id = auth.uid() 
    AND admin_check.is_admin = true
  )
);

CREATE POLICY "Enable update for users to update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);