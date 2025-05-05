import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

// Supabase setup
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Get total user count
 * @returns {Promise<number>} Total number of users
 */
export async function getTotalUserCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("id", "is", null);

    if (error) {
      console.error("Error getting user count:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Error in getTotalUserCount:", error);
    return 0;
  }
}

/**
 * Update account balance
 * @param {string} accountId - The account ID
 * @param {number} newBalance - The new balance to set
 * @returns {Promise<Object>} - The updated account
 */
export async function updateAccountBalance(
  accountId: string,
  newBalance: number
) {
  try {
    const { data, error } = await supabase
      .from("accounts")
      .update({ balance: newBalance })
      .eq("id", accountId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating account balance:", error);
    throw error;
  }
}

/**
 * Add a new transaction
 * @param {Object} transaction - The transaction details
 * @returns {Promise<Object>} - The created transaction
 */
export async function addTransaction(transaction: {
  user_id: string;
  account_id: string;
  amount: number;
  type: "deposit" | "withdrawal" | "transfer";
  description: string;
  status: "pending" | "completed" | "failed";
  method?: string;
  reference_number?: string;
}) {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .insert([transaction])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error adding transaction:", error);
    throw error;
  }
}

/**
 * Add multiple transactions in bulk and update corresponding account balances
 * Optimized for reduced database calls and better rate limiting
 * @param {Array<Object>} transactions - Array of transaction objects
 * @returns {Promise<{success: number, failed: number, results: Array}>} - Results summary
 */
export async function bulkAddTransactions(transactions) {
  // Initialize results tracking
  const results = {
    success: 0,
    failed: 0,
    results: [],
  };

  // More efficient batch processing with larger batches but fewer database calls
  const BATCH_SIZE = 25; // Increased from 10 to reduce overhead
  const RATE_LIMIT_DELAY = 1000; // Adjusted to 1 second between batches

  try {
    // First, get all accounts in a single query to reduce database calls
    const userIds = [...new Set(transactions.map(t => t.user_id))];
    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("id, user_id, balance")
      .in("user_id", userIds);

    if (accountsError) {
      throw new Error(`Failed to fetch accounts: ${accountsError.message}`);
    }

    // Create lookup map for faster access - avoids repeated database queries
    const accountsMap = {};
    accounts.forEach(account => {
      accountsMap[account.user_id] = account;
    });

    // Process transactions in batches
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
      
      // Prepare batch updates for transactions and accounts
      const transactionsToInsert = [];
      const accountUpdates = {}; // Track balance changes by account ID
      const failedInBatch = [];

      // Prepare all records and balance changes in memory first
      batch.forEach(transaction => {
        try {
          const account = accountsMap[transaction.user_id];
          
          if (!account) {
            failedInBatch.push({
              transaction,
              success: false,
              error: "Account not found"
            });
            return; // Skip to next transaction
          }
          
          // Calculate new balance
          let newBalance = account.balance;
          if (transaction.type === "deposit") {
            newBalance += transaction.amount;
          } else if (transaction.type === "withdrawal") {
            if (account.balance < transaction.amount) {
              failedInBatch.push({
                transaction,
                success: false,
                error: "Insufficient funds"
              });
              return; // Skip to next transaction
            }
            newBalance -= transaction.amount;
          } else {
            failedInBatch.push({
              transaction,
              success: false,
              error: `Invalid transaction type: ${transaction.type}`
            });
            return; // Skip to next transaction
          }
          
          // Track the new balance in our map
          accountsMap[transaction.user_id].balance = newBalance;
          
          // Add transaction to batch
          transactionsToInsert.push({
            user_id: transaction.user_id,
            account_id: account.id,
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description || `Bulk ${transaction.type}`,
            status: "completed",
            created_at: new Date().toISOString(),
          });
          
          // Track account updates
          if (!accountUpdates[account.id]) {
            accountUpdates[account.id] = newBalance;
          } else {
            accountUpdates[account.id] = newBalance;
          }
        } catch (error) {
          failedInBatch.push({
            transaction,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

      // Process failed transactions
      failedInBatch.forEach(item => {
        results.failed++;
        results.results.push(item);
      });

      // If we have transactions to insert, do it in a single database call
      if (transactionsToInsert.length > 0) {
        const { data: txData, error: txError } = await supabase
          .from("transactions")
          .insert(transactionsToInsert)
          .select();

        if (txError) {
          console.error("Error in bulk transaction insert:", txError);
          results.failed += transactionsToInsert.length;
          transactionsToInsert.forEach(tx => {
            results.results.push({
              transaction: tx,
              success: false,
              error: txError.message || "Failed to insert transaction"
            });
          });
        } else {
          results.success += txData.length;
          txData.forEach(tx => {
            results.results.push({
              transaction: tx,
              success: true
            });
          });
        }
      }

      // Update account balances in a single operation for each account
      const accountUpdatePromises = Object.entries(accountUpdates).map(([accountId, newBalance]) => {
        return supabase
          .from("accounts")
          .update({
            balance: newBalance,
            updated_at: new Date().toISOString(),
          })
          .eq("id", accountId);
      });

      // Wait for all account updates to complete
      await Promise.all(accountUpdatePromises);

      // Apply rate limiting delay between batches (if not the last batch)
      if (i + BATCH_SIZE < transactions.length) {
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    }

    return results;
  } catch (error) {
    console.error("Error in bulk transactions:", error);
    return {
      ...results,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Get account balance for a user with improved calculation
 * @param {string} userId - The user's ID
 * @returns {Promise<number>} - The user's account balance
 */
export async function getAccountBalance(userId: string) {
  try {
    // Get all user transactions first
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId);

    if (txError) {
      console.error("Error fetching transactions:", txError);
      return 0;
    }

    // Calculate balance from transactions
    const calculatedBalance = transactions.reduce((sum, txn) => {
      if (txn.type === "deposit") {
        return sum + Number(txn.amount);
      } else if (txn.type === "withdrawal") {
        return sum - Number(txn.amount);
      }
      return sum;
    }, 0);

    // Get or create account record
    const { data: account, error: accError } = await supabase
      .from("accounts")
      .select("id, balance")
      .eq("user_id", userId)
      .single();

    if (accError) {
      // Create new account if doesn't exist
      const { data: newAccount, error: createError } = await supabase
        .from("accounts")
        .insert([
          {
            user_id: userId,
            balance: calculatedBalance,
          },
        ])
        .select("id")
        .single();

      if (createError) {
        console.error("Error creating account:", createError);
      }
    } else {
      // Update existing account with calculated balance
      const { error: updateError } = await supabase
        .from("accounts")
        .update({ balance: calculatedBalance })
        .eq("id", account.id);

      if (updateError) {
        console.error("Error updating account balance:", updateError);
      }
    }

    return calculatedBalance;
  } catch (error) {
    console.error("Error in getAccountBalance:", error);
    return 0;
  }
}

/**
 * Get all users with account information
 * Enhanced with improved error handling and validation
 * @returns {Promise<Array>} - Array of user profiles with account data
 */
export async function getAllUsers() {
  try {
    // Get raw account data directly first
    const { data: rawAccounts } = await supabase.from("accounts").select("*");

    console.log("Raw account data from database:", rawAccounts);

    // Get all user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    // If no users found, return empty array
    if (!profiles || profiles.length === 0) {
      return [];
    }

    // Process each user and ensure they have proper account data
    const processedUsers = await Promise.all(
      profiles.map(async (profile) => {
        // Find this user's account in the raw data
        const userAccount = rawAccounts?.find(
          (acc) => acc.user_id === profile.id
        );

        if (userAccount) {
          // User has an existing account
          console.log(`User ${profile.full_name} has account:`, userAccount);

          // Handle balance conversion
          let balance = 0;
          try {
            if (typeof userAccount.balance === "string") {
              balance = parseFloat(userAccount.balance);
            } else if (typeof userAccount.balance === "number") {
              balance = userAccount.balance;
            }

            // Ensure we don't have NaN
            if (isNaN(balance)) balance = 0;
          } catch (err) {
            console.error(
              `Error converting balance for ${profile.full_name}:`,
              err
            );
          }

          return {
            ...profile,
            accounts: [
              {
                id: userAccount.id,
                user_id: profile.id,
                balance: balance,
                created_at: userAccount.created_at,
                updated_at: userAccount.updated_at,
              },
            ],
          };
        } else {
          // User doesn't have an account yet - create one
          console.log(`Creating account for user ${profile.full_name}`);

          try {
            // Create a real account in the database
            const { data: newAccount, error: createError } = await supabase
              .from("accounts")
              .insert([
                {
                  user_id: profile.id,
                  balance: 0,
                  created_at: new Date().toISOString(),
                },
              ])
              .select()
              .single();

            if (createError) {
              console.error(
                `Error creating account for ${profile.full_name}:`,
                createError
              );

              // Return with a placeholder account that won't be used for transactions
              return {
                ...profile,
                accounts: [
                  {
                    id: null,
                    user_id: profile.id,
                    balance: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                ],
              };
            }

            console.log(
              `Created account for ${profile.full_name}:`,
              newAccount
            );

            // Return with the newly created account
            return {
              ...profile,
              accounts: [
                {
                  ...newAccount,
                  balance: 0,
                },
              ],
            };
          } catch (err) {
            console.error(
              `Error in account creation for ${profile.full_name}:`,
              err
            );

            // Return with a placeholder account
            return {
              ...profile,
              accounts: [
                {
                  id: null,
                  user_id: profile.id,
                  balance: 0,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              ],
            };
          }
        }
      })
    );

    console.log(`Processed ${processedUsers.length} users with accounts`);
    return processedUsers;
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    return [];
  }
}

/**
 * Get all transactions with improved user profile joining
 * @param {number} limit - Optional limit for number of transactions
 * @returns {Promise<Array>} - Array of transactions with user profile data
 */
export async function getAllTransactions(limit = 100) {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        *,
        profiles (
          id,
          full_name,
          email
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Process transactions to ensure amounts are numbers
    const processedTransactions = (data || []).map((transaction) => ({
      ...transaction,
      amount: Number(transaction.amount) || 0,
    }));

    return processedTransactions;
  } catch (error) {
    console.error("Error fetching all transactions:", error);
    return [];
  }
}

/**
 * Get recent transactions for a specific user
 * @param {string} userId - The user's ID
 * @param {number} limit - Optional limit for number of transactions
 * @returns {Promise<Array>} - Array of recent transactions
 */
export async function getRecentTransactions(userId: string, limit?: number) {
  try {
    let query = supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error fetching recent transactions:", error);
    return [];
  }
}

/**
 * Get monthly transactions for a specific user
 * @param {string} userId - The user's ID
 * @returns {Promise<Array>} - Array of transactions for the current month
 */
export async function getMonthlyTransactions(userId: string) {
  try {
    // Get the first day of the current month
    const now = new Date();
    const firstDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    ).toISOString();
    const lastDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).toISOString();

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", firstDayOfMonth)
      .lte("created_at", lastDayOfMonth)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error fetching monthly transactions:", error);
    return [];
  }
}

/**
 * Synchronize account balances with transaction history
 * This function recalculates all account balances based on transaction history
 * @returns {Promise<boolean>} - Success indicator
 */
export async function syncAllAccountBalances() {
  try {
    // Get all accounts
    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("id, user_id");

    if (accountsError) throw accountsError;

    // Process each account
    for (const account of accounts) {
      // Get all user transactions
      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", account.user_id);

      if (txError) {
        console.error(
          `Error fetching transactions for user ${account.user_id}:`,
          txError
        );
        continue;
      }

      // Calculate balance from transactions
      const balance = transactions.reduce((sum, txn) => {
        const amount = Number(txn.amount) || 0;
        if (txn.type === "deposit") {
          return sum + amount;
        } else if (txn.type === "withdrawal") {
          return sum - amount;
        }
        return sum;
      }, 0);

      // Update account balance
      const { error: updateError } = await supabase
        .from("accounts")
        .update({ balance })
        .eq("id", account.id);

      if (updateError) {
        console.error(
          `Error updating balance for account ${account.id}:`,
          updateError
        );
      }
    }

    return true;
  } catch (error) {
    console.error("Error in syncAllAccountBalances:", error);
    return false;
  }
}

/**
 * Get admin dashboard statistics
 * @returns {Promise<Object>} - Dashboard statistics
 */
export async function getAdminStats() {
  try {
    // Get total number of users
    const { count: totalUsers, error: usersError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (usersError) {
      console.error("Error fetching user count:", usersError);
      throw usersError;
    }

    // Get all transactions to calculate various metrics
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("*");

    if (txError) {
      console.error("Error fetching transactions:", txError);
      throw txError;
    }

    // Calculate total transactions
    const totalTransactions = transactions?.length || 0;

    // Calculate total volume (sum of all transaction amounts)
    const totalVolume =
      transactions?.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0) || 0;

    // Count pending transactions
    const pendingTransactions =
      transactions?.filter((tx) => tx.status === "pending").length || 0;

    // Calculate active users (users who made a transaction in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentTxUserIds = new Set(
      transactions
        ?.filter((tx) => new Date(tx.created_at) >= thirtyDaysAgo)
        .map((tx) => tx.user_id)
    );
    const activeUsers = recentTxUserIds.size;

    return {
      totalUsers: totalUsers || 0,
      totalTransactions,
      totalVolume,
      pendingTransactions,
      activeUsers,
    };
  } catch (error) {
    console.error("Error in getAdminStats:", error);
    // Return default values if there's an error
    return {
      totalUsers: 0,
      totalTransactions: 0,
      totalVolume: 0,
      pendingTransactions: 0,
      activeUsers: 0,
    };
  }
}

/**
 * Update a transaction's status
 * @param {string} id - Transaction ID
 * @param {string} status - New status (completed, pending, failed)
 * @returns {Promise<boolean>} - Success indicator
 */
export async function updateTransactionStatus(id, status) {
  try {
    const { error } = await supabase
      .from("transactions")
      .update({ status })
      .eq("id", id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Error updating transaction status:", error);
    throw error;
  }
}

/**
 * Add multiple accounts with a balance in one batch operation
 * Useful for admin bulk operations
 * @param {Array<Object>} accounts - Array of account objects
 * @returns {Promise<Array>} - Array of created accounts
 */
export async function bulkAddAccounts(accounts) {
  try {
    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new Error("No valid accounts to create");
    }

    const { data, error } = await supabase
      .from("accounts")
      .insert(accounts)
      .select();

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error in bulk account creation:", error);
    throw error;
  }
}

/**
 * Update multiple account balances in one batch operation
 * @param {Array<Object>} updates - Array of {id, balance} objects
 * @returns {Promise<boolean>} - Success indicator
 */
export async function bulkUpdateBalances(updates) {
  try {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error("No valid updates to process");
    }

    // Since Supabase doesn't support true batch updates,
    // we need to perform updates sequentially
    const promises = updates.map(({ id, balance }) =>
      supabase.from("accounts").update({ balance }).eq("id", id)
    );

    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error("Error in bulk balance update:", error);
    throw error;
  }
}

/**
 * Get all loans with user data
 * @param {number} limit - Optional limit for number of loans
 * @returns {Promise<Array>} - Array of loans with user data
 */
export async function getAllLoans(limit = 100) {
  try {
    const { data, error } = await supabase
      .from("loans")
      .select(
        `
        *,
        profiles (
          id,
          full_name,
          email
        )
      `
      )
      .order("application_date", { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Process loans to ensure amounts are numbers
    const processedLoans = (data || []).map((loan) => ({
      ...loan,
      amount: Number(loan.amount) || 0,
      monthly_payment: Number(loan.monthly_payment) || 0,
      total_interest: Number(loan.total_interest) || 0,
      total_payment: Number(loan.total_payment) || 0,
      remaining_balance: Number(loan.remaining_balance) || 0,
    }));

    return processedLoans;
  } catch (error) {
    console.error("Error fetching all loans:", error);
    return [];
  }
}

/**
 * Get all loan payments
 * @param {number} limit - Optional limit for number of payments
 * @returns {Promise<Array>} - Array of loan payments
 */
export async function getLoanPayments(limit = 100) {
  try {
    const { data, error } = await supabase
      .from("loan_payments")
      .select(
        `
        *,
        loans (
          id,
          loan_type,
          user_id,
          amount,
          status
        )
      `
      )
      .order("payment_date", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error fetching loan payments:", error);
    return [];
  }
}

/**
 * Get loan statistics for admin dashboard
 * @returns {Promise<Object>} - Loan statistics
 */
export async function getLoanStatistics() {
  try {
    // Get all loans to calculate metrics
    const { data: loans, error: loansError } = await supabase
      .from("loans")
      .select("*");

    if (loansError) {
      console.error("Error fetching loans:", loansError);
      throw loansError;
    }

    // Get loan payments
    const { data: payments, error: paymentsError } = await supabase
      .from("loan_payments")
      .select("*");

    if (paymentsError) {
      console.error("Error fetching loan payments:", paymentsError);
      throw paymentsError;
    }

    // Initialize loan stats with default values (for when no data exists yet)
    const stats = {
      totalLoans: loans?.length || 0,
      activeLoans: 0,
      totalLoanAmount: 0,
      totalDisbursed: 0,
      averageLoanAmount: 0,
      totalRepaid: 0,
      onTimePaymentRate: 0,
      recentApplications: 0,
      pendingApprovals: 0,
      defaultedLoans: 0,
    };

    // Only calculate these if we have loan data
    if (loans?.length) {
      // Calculate active loans (status = 'active')
      stats.activeLoans = loans.filter(
        (loan) => loan.status === "active"
      ).length;

      // Calculate total loan amount and disbursed amount
      stats.totalLoanAmount = loans.reduce(
        (sum, loan) => sum + (Number(loan.amount) || 0),
        0
      );
      stats.totalDisbursed = loans
        .filter(
          (loan) => loan.status === "active" || loan.status === "completed"
        )
        .reduce((sum, loan) => sum + (Number(loan.amount) || 0), 0);

      // Calculate average loan amount
      stats.averageLoanAmount = stats.totalLoanAmount / loans.length;

      // Count recent applications (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      stats.recentApplications = loans.filter(
        (loan) => new Date(loan.application_date) >= thirtyDaysAgo
      ).length;

      // Count pending approvals
      stats.pendingApprovals = loans.filter(
        (loan) => loan.status === "pending"
      ).length;

      // Count defaulted loans
      stats.defaultedLoans = loans.filter(
        (loan) => loan.status === "defaulted"
      ).length;
    }

    // Calculate total repaid if we have payment data
    if (payments?.length) {
      stats.totalRepaid = payments.reduce(
        (sum, payment) => sum + (Number(payment.amount) || 0),
        0
      );

      // Calculate on-time payment rate (simplified version - would be more complex in production)
      const totalPayments = payments.length;
      const onTimePayments = payments.filter(
        (payment) => payment.status === "completed"
      ).length;
      stats.onTimePaymentRate =
        totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 100;
    }

    return stats;
  } catch (error) {
    console.error("Error in getLoanStatistics:", error);
    // Return default values if there's an error
    return {
      totalLoans: 0,
      activeLoans: 0,
      totalLoanAmount: 0,
      totalDisbursed: 0,
      averageLoanAmount: 0,
      totalRepaid: 0,
      onTimePaymentRate: 0,
      recentApplications: 0,
      pendingApprovals: 0,
      defaultedLoans: 0,
    };
  }
}

/**
 * Import multiple users in bulk
 * @param {Object} options - Import options
 * @param {Array<Object>} options.users - Array of user objects
 * @param {string} options.importedBy - User ID of the admin performing the import
 * @param {boolean} options.sendEmails - Whether to send welcome emails
 * @param {string} options.fileName - Name of the import file for record keeping
 * @returns {Promise<{success: number, failed: number, skipped: number, failedList: Array}>} - Results summary
 */
export async function bulkImportUsers({
  users,
  importedBy,
  sendEmails = true,
  fileName = "Manual Import",
}) {
  const results = {
    total: users.length,
    success: 0,
    failed: 0,
    skipped: 0,
    failedList: [],
  };

  try {
    // Store the current admin session to restore later
    const originalSession = supabase.auth.session();

    // Process users sequentially to avoid session conflicts
    for (const userData of users) {
      try {
        // Generate a temporary random password
        const tempPassword = generateRandomPassword();

        // Generate a new username if not provided
        const username = userData.username || userData.email.split("@")[0];

        // Explicitly clean any possible session before signing up
        await supabase.auth.signOut();

        // Attempt to create the user
        const { user, error: signUpError } = await supabase.auth.signUp({
          email: userData.email,
          password: tempPassword,
          options: {
            data: {
              full_name: userData.full_name,
              is_admin: userData.role === "admin",
              is_agent: userData.role === "agent",
              is_manager: userData.role === "manager",
              username,
              imported_by: importedBy,
              imported_at: new Date().toISOString(),
              import_file: fileName,
            },
          },
        });

        if (signUpError || !user) {
          console.error("Error creating user:", userData.email, signUpError);
          results.failed++;
          results.failedList.push({
            email: userData.email,
            reason: signUpError?.message || "Unknown error during signup",
          });
          continue;
        }

        // Immediately sign out to prevent session conflict
        await supabase.auth.signOut();

        // Wait a moment to ensure the user is properly created in the database
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Create financial account with initial balance (if specified)
        const initialBalance = parseFloat(userData.initial_balance) || 0;

        // Create account with the specified balance
        const { data: account, error: accountError } = await supabase
          .from("accounts")
          .insert({
            user_id: user.id,
            balance: initialBalance,
            status: "active",
          })
          .select()
          .single();

        if (accountError) {
          console.error(
            "Error creating account:",
            userData.email,
            accountError
          );
          results.failed++;
          results.failedList.push({
            email: userData.email,
            reason: `Account creation failed: ${accountError.message}`,
          });
          continue;
        }

        // If there's an initial balance, create a deposit transaction
        if (initialBalance > 0) {
          const { error: transactionError } = await supabase
            .from("transactions")
            .insert({
              user_id: user.id,
              account_id: account.id,
              amount: initialBalance,
              type: "deposit",
              description: "Initial deposit",
              status: "completed",
            });

          if (transactionError) {
            console.warn(
              "Error recording initial deposit:",
              userData.email,
              transactionError
            );
            // We'll continue despite transaction recording error since the account was created
          }
        }

        // Restore admin session before making RPC calls
        if (originalSession) {
          await supabase.auth.setSession(originalSession.session);
        }

        // For security, use an RPC call to send welcome emails
        if (sendEmails) {
          const { error: welcomeEmailError } = await supabase.rpc(
            "send_welcome_email",
            {
              p_email: userData.email,
              p_temp_password: tempPassword,
            }
          );

          if (welcomeEmailError) {
            console.warn(
              "Error sending welcome email:",
              userData.email,
              welcomeEmailError
            );
            // We'll continue despite email errors since the user was created
          }
        }

        results.success++;
      } catch (error) {
        console.error(
          "Unexpected error during user import:",
          userData.email,
          error
        );
        results.failed++;
        results.failedList.push({
          email: userData.email,
          reason:
            error instanceof Error
              ? error.message
              : "Unknown error during processing",
        });
      } finally {
        // Always restore admin session before continuing to the next user
        if (originalSession) {
          await supabase.auth.setSession(originalSession.session);
        }
      }
    }

    // Final restore of the admin session
    if (originalSession) {
      await supabase.auth.setSession(originalSession.session);
    }

    return results;
  } catch (error) {
    console.error("Fatal error in bulk import:", error);
    throw error;
  }
}

/**
 * Generate a secure, random password
 * @param {number} length - Password length (default: 12)
 * @returns {string} - Secure random password
 */
function generateSecurePassword(length = 12) {
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  let password = "";

  // Ensure we have at least one of each character type
  password += charset.substr(0, 26).charAt(Math.floor(Math.random() * 26)); // Uppercase
  password += charset.substring(26, 50).charAt(Math.floor(Math.random() * 24)); // Lowercase
  password += charset.substring(50, 58).charAt(Math.floor(Math.random() * 8)); // Number
  password += charset.substring(58).charAt(Math.floor(Math.random() * 8)); // Special

  // Fill the rest of the password
  for (let i = 4; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }

  // Shuffle the password characters
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

/**
 * Send welcome email with credit union introduction to a new user
 * @param {Object} user - User object with email, name and password/reset link
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>} - Email send status
 */
async function sendWelcomeEmail(user) {
  try {
    // In a production environment, you would integrate with an email service like SendGrid, Mailgun, etc.
    // For this demo, we'll simulate email sending and track delivery status

    // Email template with credit union introduction
    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #043c73; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to NAWEC Credit Union</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
          <p>Dear ${user.full_name},</p>
          
          <p>Welcome to NAWEC Credit Union! We're excited to have you join our financial community.</p>
          
          <p>Your account has been created with the following details:</p>
          <ul>
            <li><strong>Email:</strong> ${user.email}</li>
            <li><strong>Temporary Password:</strong> ${user.password}</li>
          </ul>
          
          <p>Please log in at <a href="https://nawec-credit-union.org/login">https://nawec-credit-union.org/login</a> and change your password immediately.</p>
          
          <p>At NAWEC Credit Union, we offer:</p>
          <ul>
            <li>Fee-free savings accounts</li>
            <li>Low-interest loans</li>
            <li>Mobile banking access</li>
            <li>Financial education resources</li>
          </ul>
          
          <p>If you have any questions, please contact our support team at support@nawec-credit-union.org.</p>
          
          <p>Best regards,<br>NAWEC Credit Union Team</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #666;">
          &copy; ${new Date().getFullYear()} NAWEC Credit Union. All rights reserved.
        </div>
      </div>
    `;

    // Generate a unique message ID for tracking
    const messageId = `email_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 10)}`;

    // In production, you would send the actual email here
    console.log(`Welcome email would be sent to ${user.email} with template`);
    // Example with Supabase's Edge Functions (if implemented):
    // await supabase.functions.invoke('send-welcome-email', {
    //   body: { user, template: emailTemplate }
    // });

    // Record email sending in the email_logs table
    const { error: logError } = await supabase.from("email_logs").insert({
      message_id: messageId,
      recipient_email: user.email,
      recipient_name: user.full_name,
      subject: "Welcome to NAWEC Credit Union",
      email_type: "welcome_email",
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    if (logError) {
      console.error("Error logging email:", logError);
      // Continue despite logging error
    }

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return {
      success: false,
      error: error.message || "Failed to send email",
    };
  }
}

/**
 * Track email delivery status update
 * @param {string} messageId - Unique email message ID
 * @param {string} status - New status (delivered, opened, clicked, bounced, etc.)
 * @returns {Promise<boolean>} - Success indicator
 */
export async function updateEmailStatus(messageId, status) {
  try {
    const { error } = await supabase
      .from("email_logs")
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...(status === "delivered"
          ? { delivered_at: new Date().toISOString() }
          : {}),
        ...(status === "opened" ? { opened_at: new Date().toISOString() } : {}),
      })
      .eq("message_id", messageId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating email status:", error);
    return false;
  }
}

/**
 * Get email logs for monitoring
 * @param {Object} options - Query options
 * @param {string} options.email - Filter by recipient email
 * @param {string} options.status - Filter by status
 * @param {string} options.type - Filter by email type
 * @param {number} options.limit - Max number of results
 * @returns {Promise<Array>} - Array of email logs
 */
export async function getEmailLogs(options = {}) {
  try {
    let query = supabase
      .from("email_logs")
      .select("*")
      .order("sent_at", { ascending: false });

    if (options.email) {
      query = query.eq("recipient_email", options.email);
    }

    if (options.status) {
      query = query.eq("status", options.status);
    }

    if (options.type) {
      query = query.eq("email_type", options.type);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching email logs:", error);
    return [];
  }
}

/**
 * Resend welcome email to specific users
 * @param {Array<string>} userEmails - Array of user emails
 * @returns {Promise<{success: number, failed: number, results: Array}>} - Results summary
 */
export async function resendBulkWelcomeEmails(userEmails) {
  const results = {
    success: 0,
    failed: 0,
    results: [],
  };

  try {
    for (const email of userEmails) {
      try {
        const success = await resendWelcomeEmail(email);

        results.results.push({
          email,
          success,
          error: success ? null : "Failed to send email",
        });

        if (success) {
          results.success++;
        } else {
          results.failed++;
        }
      } catch (err) {
        results.results.push({
          email,
          success: false,
          error: err.message || "Unknown error",
        });
        results.failed++;
      }
    }

    return results;
  } catch (error) {
    console.error("Error in bulk email resend:", error);
    return {
      success: results.success,
      failed: results.failed + (userEmails.length - results.results.length),
      results: results.results,
      error: error.message || "Unknown error",
    };
  }
}

/**
 * Resend welcome email to a specific user
 * @param {string} email - User's email address
 * @returns {Promise<boolean>} - Success indicator
 */
export async function resendWelcomeEmail(email: string): Promise<boolean> {
  try {
    // First, look up the user in the profiles table
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("email", email)
      .single();

    if (profileError || !userProfile) {
      console.error("Error finding user profile:", profileError);
      throw new Error("User not found");
    }

    // Generate a new temporary password
    const tempPassword = generateSecurePassword();

    // Update user's password in Auth
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    if (resetError) {
      console.error("Error resetting password:", resetError);
      // Continue despite error - we'll still try to send the email
    }

    // Send welcome email with new password
    const emailResult = await sendWelcomeEmail({
      email: userProfile.email,
      full_name: userProfile.full_name,
      password: tempPassword,
    });

    if (!emailResult.success) {
      console.error("Error sending welcome email:", emailResult.error);
      return false;
    }

    // Log this email resend in the email logs
    const { error: logError } = await supabase.from("email_logs").insert({
      message_id: `resend_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 10)}`,
      recipient_email: userProfile.email,
      recipient_name: userProfile.full_name,
      subject: "Welcome to NAWEC Credit Union (Resent)",
      email_type: "welcome_email_resent",
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    if (logError) {
      console.error("Error logging email resend:", logError);
      // Continue despite logging error
    }

    return true;
  } catch (error) {
    console.error("Error resending welcome email:", error);
    return false;
  }
}

/**
 * Create multiple users with email notifications in bulk
 * Enhanced version with improved session management and balance handling
 * @param {Object} params - Import parameters
 * @param {Array<Object>} params.users - Array of user data objects
 * @param {string} params.importedBy - ID of admin performing the import
 * @param {boolean} params.sendEmails - Whether to send welcome emails
 * @param {string} params.fileName - Original filename (for audit)
 * @returns {Promise<Object>} - Import results
 */
export async function enhancedBulkImportUsers({
  users,
  importedBy,
  sendEmails = true,
  fileName = null,
}) {
  // Initialize results tracking
  const results = {
    total: users.length,
    success: 0,
    failed: 0,
    skipped: 0,
    emailsSent: 0,
    emailsFailed: 0,
    successList: [],
    failedList: [],
    importId: `import_${Date.now()}`,
  };

  // Apply rate limiting for large imports
  const BATCH_SIZE = 5; // Process users in smaller batches to avoid overwhelming the auth system
  const RATE_LIMIT_DELAY = 1500; // 1.5 second delay between batches

  try {
    // Store the current admin session for restoration at the end
    const { data: adminSession } = await supabase.auth.getSession();

    // Process users in batches with rate limiting
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);

      // Process each user in the batch sequentially (not in parallel to avoid session conflicts)
      for (const userData of batch) {
        try {
          // Skip users without required fields
          if (!userData.email || !userData.full_name) {
            results.skipped++;
            results.failedList.push({
              email: userData.email || "missing-email",
              reason: "Missing required fields",
            });
            continue;
          }

          // Check for existing user with same email
          const { data: existingUser } = await supabase
            .from("profiles")
            .select("email")
            .eq("email", userData.email)
            .maybeSingle();

          if (existingUser) {
            results.skipped++;
            results.failedList.push({
              email: userData.email,
              reason: "Email already exists",
            });
            continue;
          }

          // Parse initial balance
          let initialBalance = 0;
          if (userData.initial_balance !== undefined) {
            if (typeof userData.initial_balance === "string") {
              initialBalance = parseFloat(userData.initial_balance);
              if (isNaN(initialBalance)) {
                initialBalance = 0;
              }
            } else if (typeof userData.initial_balance === "number") {
              initialBalance = userData.initial_balance;
            }
          }

          // Generate a secure temporary password
          const tempPassword = generateSecurePassword();

          // 1. Create the user with explicit autoconfirm: false to prevent auto-login
          const { data: authData, error: authError } =
            await supabase.auth.signUp({
              email: userData.email,
              password: tempPassword,
              options: {
                data: {
                  full_name: userData.full_name,
                  created_by_admin: true,
                  role: userData.role || "regular",
                  is_admin: userData.role === "admin",
                },
                emailRedirectTo: `${window.location.origin}/login`,
                // Explicitly set autoconfirm to true but don't auto-login
                emailConfirm: true,
              },
            });

          if (authError || !authData.user) {
            throw new Error(authError?.message || "Failed to create user");
          }

          // Immediately sign out to prevent session switching
          await supabase.auth.signOut({ scope: "local" });

          // Restore admin session
          if (adminSession?.session) {
            await supabase.auth.setSession(adminSession.session);
          }

          // 2. Insert a record in the profiles table
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: authData.user.id,
              full_name: userData.full_name,
              email: userData.email,
              is_admin: userData.role === "admin",
              role: userData.role || "regular",
              status: userData.status || "active",
            });

          if (profileError) {
            throw new Error(`Profile creation failed: ${profileError.message}`);
          }

          // 3. Create an account with the correct initial balance directly
          const { data: accountData, error: accountError } = await supabase
            .from("accounts")
            .insert({
              user_id: authData.user.id,
              balance: initialBalance, // Set the balance directly
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (accountError || !accountData) {
            throw new Error(
              `Account creation failed: ${accountError?.message}`
            );
          }

          // 4. Create a transaction record for the initial balance if > 0
          if (initialBalance > 0) {
            const { error: transactionError } = await supabase
              .from("transactions")
              .insert({
                user_id: authData.user.id,
                account_id: accountData.id,
                type: "deposit",
                amount: initialBalance,
                description: "Initial deposit (bulk import)",
                status: "completed",
                created_at: new Date().toISOString(),
              });

            if (transactionError) {
              console.error(
                "Error creating initial transaction:",
                transactionError
              );
              // Continue despite transaction error - we've already set the balance
            }
          }

          // 5. Mark as successful
          results.success++;
          results.successList.push({
            id: authData.user.id,
            email: userData.email,
          });

          // 6. Send welcome email if requested
          if (sendEmails) {
            try {
              const emailResult = await sendWelcomeEmail({
                email: userData.email,
                full_name: userData.full_name,
                password: tempPassword,
              });

              if (emailResult.success) {
                results.emailsSent++;
              } else {
                results.emailsFailed++;
              }
            } catch (emailError) {
              console.error(
                `Error sending welcome email to ${userData.email}:`,
                emailError
              );
              results.emailsFailed++;
            }
          }
        } catch (error) {
          console.error(`Error creating user ${userData?.email}:`, error);
          results.failed++;
          results.failedList.push({
            email: userData?.email || "unknown",
            reason: error.message || "Unknown error",
          });

          // Always ensure we're back on the admin session after any errors
          if (adminSession?.session) {
            await supabase.auth.setSession(adminSession.session);
          }
        }
      }

      // Apply rate limiting delay between batches
      if (i + BATCH_SIZE < users.length) {
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    }

    // Final step: ensure we're back on the admin session
    if (adminSession?.session) {
      await supabase.auth.setSession(adminSession.session);
    }

    return results;
  } catch (error) {
    console.error("Error in bulk user import:", error);
    return {
      ...results,
      error: error.message || "An unexpected error occurred",
    };
  }
}

/**
 * Get audit logs for bulk imports
 * @param {Object} options - Query options
 * @param {string} options.importId - Filter by import ID
 * @param {string} options.performedBy - Filter by admin user ID
 * @param {string} options.status - Filter by status
 * @param {number} options.limit - Max number of results
 * @returns {Promise<Array>} - Array of import audit logs
 */
export async function getImportAuditLogs(options = {}) {
  try {
    let query = supabase
      .from("import_audit_logs")
      .select("*")
      .order("started_at", { ascending: false });

    if (options.importId) {
      query = query.eq("import_id", options.importId);
    }

    if (options.performedBy) {
      query = query.eq("performed_by", options.performedBy);
    }

    if (options.status) {
      query = query.eq("status", options.status);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching import audit logs:", error);
    return [];
  }
}

/**
 * Check if user has permissions for bulk import operations
 * @param {string} userId - User ID to check
 * @returns {Promise<{allowed: boolean, maxBatchSize?: number}>} - Permission result
 */
export async function checkBulkImportPermission(userId) {
  try {
    // Get the user's profile to check admin status
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      return { allowed: false };
    }

    // Only admins can perform bulk imports
    if (!profile.is_admin) {
      return { allowed: false };
    }

    // In a real system, you might have different permission levels
    // Here we're implementing a simple admin check with a default batch size
    return {
      allowed: true,
      maxBatchSize: 100, // Max users that can be imported at once
    };
  } catch (error) {
    console.error("Error checking bulk import permission:", error);
    return { allowed: false };
  }
}

/**
 * Create a new user with a temporary password
 * @param {Object} userData - The user data object
 * @returns {Promise<Object>} - The created user object with temporary password
 */
export async function createUser(userData: {
  full_name: string;
  email: string;
  initial_balance?: number;
  role?: string;
  status?: string;
}) {
  try {
    // Generate a secure temporary password
    const tempPassword = generateSecurePassword();

    // Sign up the user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: tempPassword,
      options: {
        data: {
          full_name: userData.full_name,
          role: userData.role || "regular",
          is_admin: userData.role === "admin",
        },
      },
    });

    if (authError) {
      console.error("Error creating user authentication:", authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error("Failed to create user");
    }

    // Insert a record in the profiles table
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      full_name: userData.full_name,
      email: userData.email,
      is_admin: userData.role === "admin",
      role: userData.role || "regular",
      status: userData.status || "active",
    });

    if (profileError) {
      console.error("Error creating user profile:", profileError);
      throw profileError;
    }

    // Create an account for the user with initial balance if provided
    const initialBalance = userData.initial_balance || 0;
    const { data: accountData, error: accountError } = await supabase
      .from("accounts")
      .insert({
        user_id: authData.user.id,
        balance: initialBalance,
      })
      .select()
      .single();

    if (accountError) {
      console.error("Error creating user account:", accountError);
      throw accountError;
    }

    // If initial balance is positive, create a deposit transaction
    if (initialBalance > 0) {
      await addTransaction({
        user_id: authData.user.id,
        account_id: accountData.id,
        amount: initialBalance,
        type: "deposit",
        description: "Initial deposit",
        status: "completed",
        method: "system",
      });
    }

    // Send welcome email if enabled
    try {
      const emailResult = await sendWelcomeEmail({
        email: userData.email,
        full_name: userData.full_name,
        password: tempPassword,
      });

      console.log("Welcome email sent:", emailResult);
    } catch (emailError) {
      // Log email error but continue - the user was created successfully
      console.error("Error sending welcome email:", emailError);
    }

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: userData.full_name,
      },
      tempPassword,
    };
  } catch (error) {
    console.error("Error in createUser:", error);
    throw error;
  }
}

/**
 * Delete users from the system along with their associated data
 * @param {Array<string>} userIds - Array of user IDs to delete
 * @returns {Promise<{success: number, failed: number, results: Array}>} - Results summary
 */
export async function deleteUsers(userIds: string[]) {
  const results = {
    success: 0,
    failed: 0,
    results: [] as Array<{ id: string; success: boolean; error?: string }>,
  };

  try {
    // Process each user sequentially to ensure proper cleanup
    for (const userId of userIds) {
      try {
        // Step 1: Find user profile first to confirm it exists
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, email")
          .eq("id", userId)
          .single();

        if (profileError || !profile) {
          results.failed++;
          results.results.push({
            id: userId,
            success: false,
            error: "User profile not found",
          });
          continue;
        }

        // Step 2: Delete all transactions associated with the user
        const { error: txError } = await supabase
          .from("transactions")
          .delete()
          .eq("user_id", userId);

        if (txError) {
          console.error(
            `Error deleting transactions for user ${userId}:`,
            txError
          );
          // Continue despite error - we want to attempt full cleanup
        }

        // Step 3: Delete any accounts associated with the user
        const { error: accountError } = await supabase
          .from("accounts")
          .delete()
          .eq("user_id", userId);

        if (accountError) {
          console.error(
            `Error deleting account for user ${userId}:`,
            accountError
          );
          // Continue despite error - we want to attempt full cleanup
        }

        // Step 4: Delete any loans associated with the user
        const { error: loanError } = await supabase
          .from("loans")
          .delete()
          .eq("user_id", userId);

        if (loanError) {
          console.error(`Error deleting loans for user ${userId}:`, loanError);
          // Continue despite error
        }

        // Step 5: Delete the user profile
        const { error: deleteProfileError } = await supabase
          .from("profiles")
          .delete()
          .eq("id", userId);

        if (deleteProfileError) {
          console.error(
            `Error deleting user profile for ${userId}:`,
            deleteProfileError
          );
          results.failed++;
          results.results.push({
            id: userId,
            success: false,
            error: deleteProfileError.message || "Failed to delete profile",
          });
          continue;
        }

        // Step 6: Delete the user from auth table
        const { error: authError } = await supabase.auth.admin.deleteUser(
          userId
        );

        if (authError) {
          console.error(`Error deleting auth user ${userId}:`, authError);
          results.failed++;
          results.results.push({
            id: userId,
            success: false,
            error: authError.message || "Failed to delete auth user",
          });
          continue;
        }

        // Success - all related data deleted
        results.success++;
        results.results.push({
          id: userId,
          success: true,
        });
      } catch (error) {
        console.error(`Error processing deletion for user ${userId}:`, error);
        results.failed++;
        results.results.push({
          id: userId,
          success: false,
          error: error.message || "Unknown error during deletion",
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Error in bulk user deletion:", error);
    return {
      success: results.success,
      failed: results.failed + (userIds.length - results.results.length),
      results: results.results,
      error: error.message || "Unknown error in deletion process",
    };
  }
}
