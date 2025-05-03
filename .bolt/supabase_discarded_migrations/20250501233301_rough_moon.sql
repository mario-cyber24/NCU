/*
  # Set up admin account and test data

  1. Changes
    - Create admin user profile
    - Set up admin account
    - Add test transactions
    
  2. Security
    - Ensure proper admin permissions
    - Maintain RLS policies
*/

-- First, ensure we're working with clean tables
TRUNCATE transactions, accounts, profiles CASCADE;

-- Create admin profile
INSERT INTO profiles (id, full_name, email, is_admin, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'System Administrator',
  'admin@nawec.gm',
  true,
  NOW()
);

-- Create admin account
INSERT INTO accounts (id, user_id, balance, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  0,
  NOW(),
  NOW()
);

-- Create some test transactions
INSERT INTO transactions (user_id, account_id, amount, type, description, status, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 1000, 'deposit', 'Initial deposit', 'completed', NOW()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 500, 'withdrawal', 'Test withdrawal', 'completed', NOW()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 2000, 'deposit', 'Second deposit', 'completed', NOW());

-- Update account balance based on transactions
UPDATE accounts 
SET balance = (
  SELECT COALESCE(
    SUM(CASE 
      WHEN type = 'deposit' THEN amount 
      WHEN type = 'withdrawal' THEN -amount
      ELSE 0
    END),
    0
  )
  FROM transactions
  WHERE account_id = '00000000-0000-0000-0000-000000000001'
)
WHERE id = '00000000-0000-0000-0000-000000000001';