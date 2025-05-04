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
 * Send welcome email to a new user
 * @param {Object} user - User object with email and temporary password
 * @returns {Promise<boolean>} - Success indicator
 */
async function sendWelcomeEmail(user) {
  try {
    // In a production environment, you would integrate with an email service like SendGrid, Mailgun, etc.
    // For this demo, we'll just simulate a successful email send

    console.log(
      `Welcome email would be sent to ${user.email} with password: ${user.password}`
    );

    // Here you would typically call your email provider's API
    // Example with Supabase's Edge Functions (if implemented):
    // await supabase.functions.invoke('send-welcome-email', { body: { user } });

    return true;
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return false;
  }
}

/**
 * Create a new user with all necessary related records
 * @param {Object} userData - User data (full_name, email, role, status, initial_balance)
 * @returns {Promise<Object>} - Created user data with temporary password
 */
export async function createUser(userData) {
  try {
    // Generate a secure temporary password
    const tempPassword = generateSecurePassword();

    // Create the user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: tempPassword,
      options: {
        data: {
          full_name: userData.full_name,
          is_admin: userData.role === "admin",
        },
      },
    });

    if (authError) throw authError;

    // Create or update the user profile record
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: authUser.user?.id,
        email: userData.email,
        full_name: userData.full_name,
        is_admin: userData.role === "admin",
        status: userData.status === "active",
      })
      .select()
      .single();

    if (profileError) throw profileError;

    // Create an account for the user with initial balance
    const { data: accountData, error: accountError } = await supabase
      .from("accounts")
      .insert({
        user_id: authUser.user?.id,
        balance: parseFloat(userData.initial_balance) || 0,
      })
      .select()
      .single();

    if (accountError) throw accountError;

    // Add an initial deposit transaction if there's an initial balance
    if (userData.initial_balance && parseFloat(userData.initial_balance) > 0) {
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: authUser.user?.id,
          account_id: accountData.id,
          amount: parseFloat(userData.initial_balance),
          type: "deposit",
          description: "Initial account funding",
          status: "completed",
        });

      if (transactionError) {
        console.error("Error creating initial transaction:", transactionError);
        // Continue despite transaction creation error
      }
    }

    // Log the user creation in the audit log
    const { error: auditError } = await supabase.from("audit_log").insert({
      action: "user_created",
      user_id: authUser.user?.id,
      performed_by: "admin", // Ideally, this would be the actual admin's user ID
      details: {
        email: userData.email,
        full_name: userData.full_name,
        initial_balance: parseFloat(userData.initial_balance) || 0,
        role: userData.role,
        status: userData.status,
      },
    });

    if (auditError) {
      console.error("Error logging to audit trail:", auditError);
      // Continue despite audit log error
    }

    // Send welcome email to user
    await sendWelcomeEmail({
      email: userData.email,
      full_name: userData.full_name,
      password: tempPassword,
    });

    // Return the created user data and temporary password
    return {
      user: {
        ...profileData,
        account: accountData,
      },
      tempPassword,
    };
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

/**
 * Resend welcome email to a user
 * @param {string} email - User email
 * @returns {Promise<boolean>} - Success indicator
 */
export async function resendWelcomeEmail(email) {
  try {
    // Get the user profile by email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .single();

    if (profileError) throw profileError;

    // Generate a new temporary password
    const newPassword = generateSecurePassword();

    // Update the user's password
    const { error: passwordError } = await supabase.auth.admin.updateUserById(
      profile.id,
      { password: newPassword }
    );

    if (passwordError) throw passwordError;

    // Send the welcome email
    await sendWelcomeEmail({
      email: profile.email,
      full_name: profile.full_name,
      password: newPassword,
    });

    // Log the password reset
    const { error: auditError } = await supabase.from("audit_log").insert({
      action: "password_reset",
      user_id: profile.id,
      performed_by: "admin", // Ideally, this would be the actual admin's user ID
      details: {
        email: profile.email,
        reason: "welcome_email_resend",
      },
    });

    if (auditError) {
      console.error("Error logging to audit trail:", auditError);
      // Continue despite audit log error
    }

    return true;
  } catch (error) {
    console.error("Error resending welcome email:", error);
    return false;
  }
}
