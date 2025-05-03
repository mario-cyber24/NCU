/*
  # Create transactions table

  1. New Tables
    - `transactions`
      - `id` (uuid, primary key): Unique identifier for the transaction
      - `user_id` (uuid): Foreign key to profiles.id
      - `account_id` (uuid): Foreign key to accounts.id
      - `amount` (numeric): Transaction amount
      - `type` (text): Transaction type (deposit, withdrawal, transfer)
      - `description` (text): Transaction description
      - `method` (text, nullable): Payment method used
      - `status` (text): Transaction status (pending, completed, failed)
      - `created_at` (timestamptz): Creation timestamp
  
  2. Security
    - Enable RLS on `transactions` table
    - Add policy for authenticated users to read own transactions
    - Add policy for admins to read all transactions
    - Add policy for admins to insert transactions
*/

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer')),
  description TEXT NOT NULL,
  method TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Index for faster queries
CREATE INDEX transactions_user_id_idx ON transactions(user_id);
CREATE INDEX transactions_account_id_idx ON transactions(account_id);
CREATE INDEX transactions_created_at_idx ON transactions(created_at DESC);