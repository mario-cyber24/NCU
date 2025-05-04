/*
  # Create loan analytics views

  1. New Views
    - `loan_summary_view`: Provides summary statistics for loans grouped by loan type and status
    - `loan_details_view`: Provides detailed information about loans with user information
    - `loan_payment_history_view`: Provides payment history for all loans
    
  2. Purpose
    - Simplify analytics queries
    - Provide pre-joined data for admin dashboard
*/

-- Create view for loan summary statistics
CREATE OR REPLACE VIEW loan_summary_view AS
SELECT
  loan_type,
  status,
  COUNT(*) as loan_count,
  SUM(amount) as total_amount,
  SUM(monthly_payment) as total_monthly_payments,
  AVG(interest_rate) as avg_interest_rate,
  AVG(term_months) as avg_term,
  SUM(remaining_balance) as total_outstanding_balance
FROM
  loans
GROUP BY
  loan_type, status;

-- Create view for detailed loan information with user details
CREATE OR REPLACE VIEW loan_details_view AS
SELECT
  l.id,
  l.loan_type,
  l.amount,
  l.interest_rate,
  l.term_months,
  l.monthly_payment,
  l.status,
  l.application_date,
  l.approval_date,
  l.total_interest,
  l.total_payment,
  l.remaining_balance,
  l.purpose,
  l.employment_status,
  l.monthly_income,
  l.existing_loans,
  p.id as user_id,
  p.full_name,
  p.email
FROM
  loans l
JOIN
  profiles p ON l.user_id = p.id;

-- Create view for loan payment history
CREATE OR REPLACE VIEW loan_payment_history_view AS
SELECT
  lp.id as payment_id,
  lp.loan_id,
  lp.amount as payment_amount,
  lp.payment_date,
  lp.status as payment_status,
  l.loan_type,
  l.amount as loan_amount,
  l.monthly_payment,
  l.status as loan_status,
  p.id as user_id,
  p.full_name,
  p.email
FROM
  loan_payments lp
JOIN
  loans l ON lp.loan_id = l.id
JOIN
  profiles p ON l.user_id = p.id
ORDER BY
  lp.payment_date DESC;

-- Enable RLS on views for security
ALTER VIEW loan_summary_view SECURITY DEFINER;
ALTER VIEW loan_details_view SECURITY DEFINER;
ALTER VIEW loan_payment_history_view SECURITY DEFINER;

-- Grant permissions only to administrators
GRANT SELECT ON loan_summary_view TO authenticated;
GRANT SELECT ON loan_details_view TO authenticated;
GRANT SELECT ON loan_payment_history_view TO authenticated;