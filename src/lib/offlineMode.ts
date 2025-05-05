/**
 * Offline transaction handler for areas with limited connectivity
 * This reduces data costs by batching transactions when online connectivity is restored
 */

import { supabase } from './supabase';
import { getLocalStorage, setLocalStorage } from './cache';

const OFFLINE_QUEUE_KEY = 'ncu_offline_transactions';
const OFFLINE_MODE_KEY = 'ncu_offline_mode';
const MAX_BATCH_SIZE = 100; // Process transactions in batches of 100

interface OfflineTransaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdrawal' | 'loan_payment';
  amount: number;
  description?: string;
  created_at: string;
  loan_id?: string;
  metadata?: Record<string, any>;
}

/**
 * Check if the app is in offline mode
 */
export const isOfflineMode = (): boolean => {
  return getLocalStorage(OFFLINE_MODE_KEY, false);
};

/**
 * Set the app's offline mode status
 */
export const setOfflineMode = (status: boolean): void => {
  setLocalStorage(OFFLINE_MODE_KEY, status);
  // Dispatch event for components to react
  window.dispatchEvent(new CustomEvent('offlineStatusChanged', { detail: { offline: status } }));
};

/**
 * Auto-detect network status and set offline mode accordingly
 */
export const setupNetworkDetection = (): void => {
  const updateOnlineStatus = () => {
    setOfflineMode(!navigator.onLine);
  };

  // Set initial status
  updateOnlineStatus();

  // Add event listeners
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
};

/**
 * Add a transaction to the offline queue
 */
export const addOfflineTransaction = (transaction: Omit<OfflineTransaction, 'id' | 'created_at'>): void => {
  const queue = getOfflineQueue();
  const newTransaction = {
    ...transaction,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString()
  };
  
  queue.push(newTransaction);
  setLocalStorage(OFFLINE_QUEUE_KEY, queue);
};

/**
 * Get the current offline transaction queue
 */
export const getOfflineQueue = (): OfflineTransaction[] => {
  return getLocalStorage(OFFLINE_QUEUE_KEY, [] as OfflineTransaction[]);
};

/**
 * Clear the offline transaction queue
 */
export const clearOfflineQueue = (): void => {
  setLocalStorage(OFFLINE_QUEUE_KEY, []);
};

/**
 * Process all queued offline transactions
 * Returns statistics about processed transactions
 */
export const syncOfflineTransactions = async (): Promise<{ 
  processed: number, 
  failed: number,
  errors: string[] 
}> => {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { processed: 0, failed: 0, errors: [] };
  
  // Group transactions by type for batch processing
  const deposits: OfflineTransaction[] = [];
  const withdrawals: OfflineTransaction[] = [];
  const loanPayments: OfflineTransaction[] = [];
  
  queue.forEach(tx => {
    if (tx.type === 'deposit') deposits.push(tx);
    else if (tx.type === 'withdrawal') withdrawals.push(tx);
    else if (tx.type === 'loan_payment') loanPayments.push(tx);
  });
  
  // Process each type in batches using the optimized stored procedures
  const results = {
    processed: 0,
    failed: 0,
    errors: [] as string[]
  };
  
  // Process deposits
  for (let i = 0; i < deposits.length; i += MAX_BATCH_SIZE) {
    const batch = deposits.slice(i, i + MAX_BATCH_SIZE);
    const { data, error } = await supabase.rpc('process_offline_deposits', {
      transactions: batch
    });
    
    if (error) {
      results.failed += batch.length;
      results.errors.push(`Batch deposit error: ${error.message}`);
    } else if (data) {
      results.processed += data.processed?.length || 0;
      results.failed += data.failed?.length || 0;
      // Add specific errors for debugging
      data.failed?.forEach((fail: any) => {
        results.errors.push(`Transaction ${fail.id}: ${fail.error}`);
      });
    }
  }
  
  // Process withdrawals
  for (let i = 0; i < withdrawals.length; i += MAX_BATCH_SIZE) {
    const batch = withdrawals.slice(i, i + MAX_BATCH_SIZE);
    const { data, error } = await supabase.rpc('process_offline_withdrawals', {
      transactions: batch
    });
    
    if (error) {
      results.failed += batch.length;
      results.errors.push(`Batch withdrawal error: ${error.message}`);
    } else if (data) {
      results.processed += data.processed?.length || 0;
      results.failed += data.failed?.length || 0;
      data.failed?.forEach((fail: any) => {
        results.errors.push(`Transaction ${fail.id}: ${fail.error}`);
      });
    }
  }
  
  // Process loan payments
  for (let i = 0; i < loanPayments.length; i += MAX_BATCH_SIZE) {
    const batch = loanPayments.slice(i, i + MAX_BATCH_SIZE);
    const { data, error } = await supabase.rpc('process_offline_loan_payments', {
      transactions: batch
    });
    
    if (error) {
      results.failed += batch.length;
      results.errors.push(`Batch loan payment error: ${error.message}`);
    } else if (data) {
      results.processed += data.processed?.length || 0;
      results.failed += data.failed?.length || 0;
      data.failed?.forEach((fail: any) => {
        results.errors.push(`Transaction ${fail.id}: ${fail.error}`);
      });
    }
  }
  
  // Clear successfully processed transactions, keep failed ones for retry
  const newQueue = queue.filter(tx => {
    // Find if transaction was in any of the failed lists
    const allFailedIds = [
      ...(deposits.length ? withdrawals : []),
      ...(withdrawals.length ? withdrawals : []),
      ...(loanPayments.length ? loanPayments : [])
    ].map(tx => tx.id);
    
    return allFailedIds.includes(tx.id);
  });
  
  setLocalStorage(OFFLINE_QUEUE_KEY, newQueue);
  
  return results;
};

/**
 * Perform periodic sync in background when online
 */
export const setupPeriodicSync = (intervalMinutes = 15): void => {
  const syncIfOnline = async () => {
    if (navigator.onLine && !isOfflineMode()) {
      await syncOfflineTransactions();
    }
  };
  
  // Initial sync attempt when coming online
  window.addEventListener('online', syncIfOnline);
  
  // Periodic sync check
  setInterval(syncIfOnline, intervalMinutes * 60 * 1000);
};

/**
 * Get offline queue statistics
 */
export const getOfflineStats = (): { 
  count: number, 
  totalAmount: number,
  byType: Record<string, number>
} => {
  const queue = getOfflineQueue();
  
  const stats = {
    count: queue.length,
    totalAmount: 0,
    byType: {} as Record<string, number>
  };
  
  queue.forEach(tx => {
    stats.totalAmount += tx.amount;
    stats.byType[tx.type] = (stats.byType[tx.type] || 0) + 1;
  });
  
  return stats;
};

/**
 * Archive old data to reduce local storage size
 */
export const archiveLocalData = (olderThanDays = 30): void => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  // Get stored transaction history that we cache locally
  const txHistory = getLocalStorage('ncu_transaction_history', []);
  
  // Filter out older transactions
  const newTxHistory = txHistory.filter((tx: any) => {
    const txDate = new Date(tx.created_at);
    return txDate >= cutoffDate;
  });
  
  setLocalStorage('ncu_transaction_history', newTxHistory);
};