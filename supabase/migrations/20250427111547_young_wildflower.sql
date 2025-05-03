/*
  # Fix profiles table foreign key constraint

  1. Changes
    - Drop existing foreign key constraint on profiles table
    - Add correct foreign key constraint to auth.users table
    
  2. Security
    - No changes to RLS policies
    - Maintains existing security settings
*/

DO $$ 
BEGIN
  -- First check if the constraint exists and drop it
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey'
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;

  -- Add the correct foreign key constraint
  ALTER TABLE profiles
    ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) 
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
END $$;