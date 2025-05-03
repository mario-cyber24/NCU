/*
  # Fix Database Schema

  1. Tables
    - Create profiles table if it doesn't exist
    - Create accounts table if it doesn't exist
    - Create transactions table if it doesn't exist
  
  2. Security
    - Enable RLS on all tables
    - Add necessary policies
    
  3. Triggers
    - Add handle_new_user trigger
*/

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  avatar_url text,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create accounts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance numeric DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  type text NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer')),
  description text NOT NULL,
  method text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Recreate all necessary policies
DO $$ 
BEGIN
  -- Profiles policies
  DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON profiles;
  DROP POLICY IF EXISTS "Enable select for users to read own profile" ON profiles;
  DROP POLICY IF EXISTS "Enable select for admins to read all profiles" ON profiles;
  DROP POLICY IF EXISTS "Enable update for users to update own profile" ON profiles;

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
      ((auth.jwt() ->> 'is_admin')::boolean = true)
      OR auth.uid() = id
    );

  CREATE POLICY "Enable update for users to update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

  -- Accounts policies
  DROP POLICY IF EXISTS "Users can read own account" ON accounts;
  DROP POLICY IF EXISTS "Admins can update all accounts" ON accounts;

  CREATE POLICY "Users can read own account"
    ON accounts FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

  CREATE POLICY "Admins can update all accounts"
    ON accounts FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      )
    );

  -- Transactions policies
  DROP POLICY IF EXISTS "Users can read own transactions" ON transactions;
  DROP POLICY IF EXISTS "Admins can read all transactions" ON transactions;
  DROP POLICY IF EXISTS "Admins can insert transactions" ON transactions;

  CREATE POLICY "Users can read own transactions"
    ON transactions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

  CREATE POLICY "Admins can read all transactions"
    ON transactions FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      )
    );

  CREATE POLICY "Admins can insert transactions"
    ON transactions FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      )
    );
END $$;

-- Create or replace the handle_new_user function and trigger
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

-- Recreate the trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function for accounts
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger for accounts
DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();