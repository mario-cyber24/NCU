-- Migration: Offline mode optimization
-- Description: Adds database procedures for efficiently processing offline transactions
-- This reduces costs by minimizing the number of database calls required

-- Create a function to handle offline deposits in batch
CREATE OR REPLACE FUNCTION public.process_offline_deposits(
  transactions jsonb
) RETURNS jsonb 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb = '{"processed": [], "failed": []}';
  tx jsonb;
  user_id uuid;
  amount numeric;
  description text;
  account_id uuid;
  current_balance numeric;
  transaction_id uuid;
  metadata jsonb;
BEGIN
  -- Process each transaction in the array
  FOR tx IN SELECT * FROM jsonb_array_elements(transactions)
  LOOP
    BEGIN
      user_id := (tx->>'user_id')::uuid;
      amount := (tx->>'amount')::numeric;
      description := tx->>'description';
      metadata := COALESCE(tx->'metadata', '{}'::jsonb);
      
      -- Get account in a single query
      SELECT id, balance INTO account_id, current_balance
      FROM public.accounts
      WHERE accounts.user_id = user_id
      LIMIT 1;
      
      IF account_id IS NULL THEN
        -- Account not found, add to failed list
        result := jsonb_set(
          result, 
          '{failed}', 
          (result->'failed') || jsonb_build_object(
            'id', tx->>'id',
            'user_id', user_id,
            'error', 'Account not found'
          )
        );
        CONTINUE;
      END IF;
      
      -- Insert transaction
      INSERT INTO public.transactions (
        user_id, 
        account_id, 
        type, 
        amount, 
        description, 
        status,
        metadata
      ) VALUES (
        user_id, 
        account_id, 
        'deposit', 
        amount, 
        COALESCE(description, 'Offline deposit'), 
        'completed',
        metadata
      )
      RETURNING id INTO transaction_id;
      
      -- Update account balance in a single operation
      UPDATE public.accounts
      SET 
        balance = balance + amount,
        updated_at = NOW()
      WHERE id = account_id;
      
      -- Add to processed list
      result := jsonb_set(
        result, 
        '{processed}', 
        (result->'processed') || jsonb_build_object(
          'id', tx->>'id',
          'transaction_id', transaction_id,
          'user_id', user_id,
          'amount', amount
        )
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- Add to failed list with error
      result := jsonb_set(
        result, 
        '{failed}', 
        (result->'failed') || jsonb_build_object(
          'id', tx->>'id',
          'user_id', user_id,
          'error', SQLERRM
        )
      );
    END;
  END LOOP;
  
  RETURN result;
END;
$$;

-- Create a function to handle offline withdrawals in batch
CREATE OR REPLACE FUNCTION public.process_offline_withdrawals(
  transactions jsonb
) RETURNS jsonb 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb = '{"processed": [], "failed": []}';
  tx jsonb;
  user_id uuid;
  amount numeric;
  description text;
  account_id uuid;
  current_balance numeric;
  transaction_id uuid;
  metadata jsonb;
BEGIN
  -- Process each transaction in the array
  FOR tx IN SELECT * FROM jsonb_array_elements(transactions)
  LOOP
    BEGIN
      user_id := (tx->>'user_id')::uuid;
      amount := (tx->>'amount')::numeric;
      description := tx->>'description';
      metadata := COALESCE(tx->'metadata', '{}'::jsonb);
      
      -- Get account in a single query
      SELECT id, balance INTO account_id, current_balance
      FROM public.accounts
      WHERE accounts.user_id = user_id
      LIMIT 1;
      
      IF account_id IS NULL THEN
        -- Account not found, add to failed list
        result := jsonb_set(
          result, 
          '{failed}', 
          (result->'failed') || jsonb_build_object(
            'id', tx->>'id',
            'user_id', user_id,
            'error', 'Account not found'
          )
        );
        CONTINUE;
      END IF;
      
      -- Check if sufficient balance
      IF current_balance < amount THEN
        -- Insufficient funds, add to failed list
        result := jsonb_set(
          result, 
          '{failed}', 
          (result->'failed') || jsonb_build_object(
            'id', tx->>'id',
            'user_id', user_id,
            'error', 'Insufficient funds'
          )
        );
        CONTINUE;
      END IF;
      
      -- Insert transaction
      INSERT INTO public.transactions (
        user_id, 
        account_id, 
        type, 
        amount, 
        description,
        status,
        metadata
      ) VALUES (
        user_id, 
        account_id, 
        'withdrawal', 
        amount, 
        COALESCE(description, 'Offline withdrawal'), 
        'completed',
        metadata
      )
      RETURNING id INTO transaction_id;
      
      -- Update account balance in a single operation
      UPDATE public.accounts
      SET 
        balance = balance - amount,
        updated_at = NOW()
      WHERE id = account_id;
      
      -- Add to processed list
      result := jsonb_set(
        result, 
        '{processed}', 
        (result->'processed') || jsonb_build_object(
          'id', tx->>'id',
          'transaction_id', transaction_id,
          'user_id', user_id,
          'amount', amount
        )
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- Add to failed list with error
      result := jsonb_set(
        result, 
        '{failed}', 
        (result->'failed') || jsonb_build_object(
          'id', tx->>'id',
          'user_id', user_id,
          'error', SQLERRM
        )
      );
    END;
  END LOOP;
  
  RETURN result;
END;
$$;

-- Create a function to handle offline loan payments in batch
CREATE OR REPLACE FUNCTION public.process_offline_loan_payments(
  transactions jsonb
) RETURNS jsonb 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb = '{"processed": [], "failed": []}';
  tx jsonb;
  user_id uuid;
  amount numeric;
  description text;
  account_id uuid;
  loan_id uuid;
  current_balance numeric;
  remaining_balance numeric;
  transaction_id uuid;
  metadata jsonb;
BEGIN
  -- Process each transaction in the array
  FOR tx IN SELECT * FROM jsonb_array_elements(transactions)
  LOOP
    BEGIN
      user_id := (tx->>'user_id')::uuid;
      amount := (tx->>'amount')::numeric;
      description := tx->>'description';
      loan_id := (tx->>'loan_id')::uuid;
      metadata := COALESCE(tx->'metadata', '{}'::jsonb);
      
      -- Get account and loan in a single query
      SELECT a.id, a.balance, l.remaining_balance 
      INTO account_id, current_balance, remaining_balance
      FROM public.accounts a
      JOIN public.loans l ON l.user_id = a.user_id
      WHERE a.user_id = user_id AND l.id = loan_id
      LIMIT 1;
      
      IF account_id IS NULL THEN
        -- Account or loan not found, add to failed list
        result := jsonb_set(
          result, 
          '{failed}', 
          (result->'failed') || jsonb_build_object(
            'id', tx->>'id',
            'user_id', user_id,
            'error', 'Account or loan not found'
          )
        );
        CONTINUE;
      END IF;
      
      -- Check if sufficient balance
      IF current_balance < amount THEN
        -- Insufficient funds, add to failed list
        result := jsonb_set(
          result, 
          '{failed}', 
          (result->'failed') || jsonb_build_object(
            'id', tx->>'id',
            'user_id', user_id,
            'error', 'Insufficient funds'
          )
        );
        CONTINUE;
      END IF;
      
      -- Determine payment amount (don't overpay)
      IF amount > remaining_balance THEN
        amount := remaining_balance;
      END IF;
      
      -- Insert loan payment record
      INSERT INTO public.loan_payments (
        user_id,
        loan_id,
        amount,
        payment_date,
        status,
        description,
        metadata
      ) VALUES (
        user_id,
        loan_id,
        amount,
        NOW(),
        'completed',
        COALESCE(description, 'Offline loan payment'),
        metadata
      );
      
      -- Insert transaction record
      INSERT INTO public.transactions (
        user_id, 
        account_id, 
        type, 
        amount, 
        description,
        status,
        metadata
      ) VALUES (
        user_id, 
        account_id, 
        'loan_payment', 
        amount, 
        COALESCE(description, 'Offline loan payment'), 
        'completed',
        metadata
      )
      RETURNING id INTO transaction_id;
      
      -- Update account balance
      UPDATE public.accounts
      SET 
        balance = balance - amount,
        updated_at = NOW()
      WHERE id = account_id;
      
      -- Update loan remaining balance
      UPDATE public.loans
      SET 
        remaining_balance = remaining_balance - amount,
        updated_at = NOW()
      WHERE id = loan_id;
      
      -- Add to processed list
      result := jsonb_set(
        result, 
        '{processed}', 
        (result->'processed') || jsonb_build_object(
          'id', tx->>'id',
          'transaction_id', transaction_id,
          'user_id', user_id,
          'loan_id', loan_id,
          'amount', amount
        )
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- Add to failed list with error
      result := jsonb_set(
        result, 
        '{failed}', 
        (result->'failed') || jsonb_build_object(
          'id', tx->>'id',
          'user_id', user_id,
          'error', SQLERRM
        )
      );
    END;
  END LOOP;
  
  RETURN result;
END;
$$;

-- Create indexes to improve performance of batch operations
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);

-- Add a function to archive old transactions to reduce database size
CREATE OR REPLACE FUNCTION archive_old_transactions(cutoff_date timestamp)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  archived_count integer;
BEGIN
  -- Create archive table if not exists
  CREATE TABLE IF NOT EXISTS public.archived_transactions (
    LIKE public.transactions INCLUDING ALL
  );
  
  -- Move old transactions to archive and delete from main table
  WITH moved_rows AS (
    DELETE FROM public.transactions
    WHERE created_at < cutoff_date
    RETURNING *
  )
  INSERT INTO public.archived_transactions
  SELECT * FROM moved_rows;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;

-- Add a view for summary statistics with minimal computation cost
CREATE OR REPLACE VIEW public.account_summaries AS
SELECT
  a.user_id,
  u.email,
  u.full_name,
  a.balance,
  (SELECT COUNT(*) FROM transactions t WHERE t.account_id = a.id) AS transaction_count,
  (SELECT COALESCE(SUM(amount), 0) FROM transactions t WHERE t.account_id = a.id AND t.type = 'deposit') AS total_deposits,
  (SELECT COALESCE(SUM(amount), 0) FROM transactions t WHERE t.account_id = a.id AND t.type = 'withdrawal') AS total_withdrawals,
  (SELECT COALESCE(SUM(l.remaining_balance), 0) FROM loans l WHERE l.user_id = a.user_id AND l.status = 'active') AS active_loans,
  a.created_at,
  a.updated_at
FROM
  public.accounts a
JOIN
  public.users u ON u.id = a.user_id;

-- Add comment explaining purpose of migration
COMMENT ON FUNCTION process_offline_deposits IS 'Batch processes offline deposits to reduce database calls and costs';
COMMENT ON FUNCTION process_offline_withdrawals IS 'Batch processes offline withdrawals to reduce database calls and costs';
COMMENT ON FUNCTION process_offline_loan_payments IS 'Batch processes offline loan payments to reduce database calls and costs';
COMMENT ON FUNCTION archive_old_transactions IS 'Archives old transactions to reduce database size and query costs';
COMMENT ON VIEW account_summaries IS 'Pre-computed account summaries to reduce query costs for dashboard';