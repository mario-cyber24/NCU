/*
  # Create loans and loan payments tables

  1. New Tables
    - `loans`
      - `id` (uuid, primary key): Unique identifier for the loan
      - `user_id` (uuid): Foreign key to profiles.id
      - `loan_type` (text): Type of loan (business, auto, personal, etc.)
      - `amount` (numeric): Original loan amount
      - `interest_rate` (numeric): Annual interest rate (stored as decimal, e.g., 0.01 for 1%)
      - `term_months` (integer): Loan term in months
      - `monthly_payment` (numeric): Monthly installment amount
      - `status` (text): Loan status (pending, approved, active, paid, rejected)
      - `application_date` (timestamptz): When the loan was applied for
      - `approval_date` (timestamptz): When the loan was approved
      - `total_interest` (numeric): Total interest to be paid over the loan term
      - `total_payment` (numeric): Total amount to be repaid (principal + interest)
      - `remaining_balance` (numeric): Current outstanding balance
      - `purpose` (text): Purpose of the loan
      - `employment_status` (text): Employment status of the applicant
      - `monthly_income` (text): Monthly income of the applicant
      - `existing_loans` (text): Whether the applicant has existing loans
      - `created_at` (timestamptz): Creation timestamp
      - `updated_at` (timestamptz): Last update timestamp
    
    - `loan_payments`
      - `id` (uuid, primary key): Unique identifier for the payment
      - `loan_id` (uuid): Foreign key to loans.id
      - `amount` (numeric): Payment amount
      - `payment_date` (timestamptz): When the payment was made
      - `status` (text): Payment status (pending, completed, failed)
      - `created_at` (timestamptz): Creation timestamp
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Add policies for admins to access all data
*/

-- Create loans table
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  loan_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  interest_rate NUMERIC NOT NULL DEFAULT 0.01, -- Default 1% interest rate
  term_months INTEGER NOT NULL,
  monthly_payment NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  application_date TIMESTAMPTZ DEFAULT NOW(),
  approval_date TIMESTAMPTZ,
  total_interest NUMERIC NOT NULL,
  total_payment NUMERIC NOT NULL,
  remaining_balance NUMERIC NOT NULL,
  purpose TEXT,
  employment_status TEXT,
  monthly_income TEXT,
  existing_loans TEXT DEFAULT 'no',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create loan_payments table
CREATE TABLE IF NOT EXISTS loan_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for loans table
-- Users can read their own loans
CREATE POLICY "Users can read own loans"
  ON loans
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own loans (apply for loans)
CREATE POLICY "Users can apply for loans"
  ON loans
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all loans
CREATE POLICY "Admins can read all loans"
  ON loans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Admins can update all loans (approve/reject)
CREATE POLICY "Admins can update loans"
  ON loans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Create policies for loan_payments table
-- Users can read their own loan payments
CREATE POLICY "Users can read own loan payments"
  ON loan_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loans
      WHERE loans.id = loan_payments.loan_id AND loans.user_id = auth.uid()
    )
  );

-- Admins can read all loan payments
CREATE POLICY "Admins can read all loan payments"
  ON loan_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Admins can insert loan payments (record payments)
CREATE POLICY "Admins can record loan payments"
  ON loan_payments
  FOR INSERT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Users can make their own loan payments
CREATE POLICY "Users can make loan payments"
  ON loan_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loans
      WHERE loans.id = loan_payments.loan_id AND loans.user_id = auth.uid()
    )
  );

-- Update function trigger for loans table
CREATE TRIGGER update_loans_updated_at
BEFORE UPDATE ON loans
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create function to update loan status to 'active' when approved
CREATE OR REPLACE FUNCTION handle_approved_loan()
RETURNS TRIGGER AS $$
BEGIN
  -- If the loan status is being changed to 'approved', set it to 'active'
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    NEW.status := 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to change loan status to 'active' when approved
CREATE TRIGGER on_loan_approved
  BEFORE UPDATE ON loans
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status = 'pending')
  EXECUTE FUNCTION handle_approved_loan();

-- Create function to increment account balance (for loan disbursement)
CREATE OR REPLACE FUNCTION increment_account_balance(user_id_input UUID, amount_input NUMERIC)
RETURNS void AS $$
BEGIN
  UPDATE accounts
  SET balance = balance + amount_input,
      updated_at = NOW()
  WHERE user_id = user_id_input;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle loan payments
CREATE OR REPLACE FUNCTION process_loan_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the loan's remaining balance
  UPDATE loans
  SET remaining_balance = remaining_balance - NEW.amount,
      updated_at = NOW()
  WHERE id = NEW.loan_id;
  
  -- Check if the loan is fully paid
  UPDATE loans
  SET status = 'paid',
      updated_at = NOW()
  WHERE id = NEW.loan_id
    AND remaining_balance <= 0;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to process loan payments
CREATE TRIGGER on_loan_payment
  AFTER INSERT ON loan_payments
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION process_loan_payment();

-- Create function to decrement account balance (for loan payments)
CREATE OR REPLACE FUNCTION decrement_account_balance(user_id_input UUID, amount_input NUMERIC)
RETURNS void AS $$
BEGIN
  UPDATE accounts
  SET balance = balance - amount_input,
      updated_at = NOW()
  WHERE user_id = user_id_input;
END;
$$ LANGUAGE plpgsql;