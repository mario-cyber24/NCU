/*
  # Fix profiles table RLS policies

  1. Changes
    - Remove recursive admin policy that was causing infinite recursion
    - Replace with a simpler policy using auth.jwt() -> is_admin claim
    - Keep existing policies for regular users

  2. Security
    - Maintain RLS enabled on profiles table
    - Update policies to use JWT claims for admin checks
    - Preserve user access to own profile
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Enable select for admins to read all profiles" ON profiles;

-- Create new admin policy using JWT claims
CREATE POLICY "Enable select for admins to read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'is_admin')::boolean = true
  OR auth.uid() = id
);

-- Update user profile to set is_admin in JWT claims
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_admin)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    false
  );

  -- Set is_admin claim in JWT
  UPDATE auth.users
  SET raw_app_meta_data = 
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = new.id AND is_admin = true
      )
      THEN jsonb_set(raw_app_meta_data, '{is_admin}', 'true')
      ELSE jsonb_set(raw_app_meta_data, '{is_admin}', 'false')
    END
  WHERE id = new.id;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;