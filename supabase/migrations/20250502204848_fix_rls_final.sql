/*
  # Complete Fix for RLS Policies
  
  The previous RLS fixes still had issues with admin access. This migration:
  
  1. Completely disables RLS temporarily to clear any stuck state
  2. Enables RLS with proper policies that don't have circular references
  3. Uses a simplified approach for admin access
  4. Adds a public.is_admin() function for reuse in policies
*/

-- 1. First create a helper function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  -- Get the current user's ID from the Supabase auth context
  DECLARE
    current_user_id UUID := auth.uid();
    is_user_admin BOOLEAN;
  BEGIN
    -- Directly select the is_admin flag from profiles
    SELECT is_admin INTO is_user_admin FROM profiles WHERE id = current_user_id;
    RETURN COALESCE(is_user_admin, FALSE);
  EXCEPTION
    WHEN OTHERS THEN
      RETURN FALSE;
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Temporarily disable RLS on all tables to reset the state
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- 3. Re-enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 4. Drop all existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

DROP POLICY IF EXISTS "Users can read own account" ON accounts;
DROP POLICY IF EXISTS "Admins can read all accounts" ON accounts;
DROP POLICY IF EXISTS "Admins can update all accounts" ON accounts;

DROP POLICY IF EXISTS "Users can read own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can read all transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can insert transactions" ON transactions;

-- 5. Create new, simplified policies for profiles
CREATE POLICY "Access own profile" 
  ON profiles 
  FOR ALL
  USING (auth.uid() = id);

CREATE POLICY "Admin access all profiles" 
  ON profiles 
  FOR ALL
  USING (public.is_admin());

-- 6. Create new, simplified policies for accounts
CREATE POLICY "Access own account" 
  ON accounts 
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admin access all accounts" 
  ON accounts 
  FOR ALL
  USING (public.is_admin());

-- 7. Create new, simplified policies for transactions
CREATE POLICY "Access own transactions" 
  ON transactions 
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admin access all transactions" 
  ON transactions 
  FOR ALL
  USING (public.is_admin());