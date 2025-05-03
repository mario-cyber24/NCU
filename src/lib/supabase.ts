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
