/*
  # Fix profiles table foreign key constraint

  1. Changes
    - Drop the existing foreign key constraint that incorrectly references 'users' table
    - Add new foreign key constraint that correctly references 'auth.users' table
  
  2. Security
    - No changes to existing RLS policies
    - Maintains existing table permissions
*/

-- First remove the incorrect foreign key constraint
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Add the correct foreign key constraint referencing auth.users
ALTER TABLE profiles
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id)
ON DELETE CASCADE;