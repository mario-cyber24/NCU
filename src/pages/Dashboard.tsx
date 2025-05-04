import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import {
  getAccountBalance,
  getRecentTransactions,
  getMonthlyTransactions,
} from "../lib/supabase";
import TransactionsList from "../components/ui/TransactionsList";
import StatCard from "../components/ui/StatCard";
import LoanApplicationForm from "../components/ui/LoanApplicationForm";
import LoanPaymentForm from "../components/ui/LoanPaymentForm";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import {
  Wallet,
  TrendingUp,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  Plus,
  CreditCard,
  Shield,
  CheckCircle,
  Clock,
  AlertCircle,
  CircleDollarSign,
  BadgeDollarSign,
  FileText,
  CheckCircle2,
  XCircle,
  BarChart,
  PiggyBank,
  Loader2,
  ArrowRight,
} from "lucide-react";

interface Loan {
  id: string;
  loan_type: string;
  amount: number;
  interest_rate: number;
  term_months: number;
  monthly_payment: number;
  status: string;
  application_date: string;
  approval_date: string | null;
  total_interest: number;
  total_payment: number;
  remaining_balance: number;
  purpose?: string;
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const action = searchParams.get("action");

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [monthlyTransactions, setMonthlyTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [showLoanForm, setShowLoanForm] = useState(action === "apply-loan");
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const currentMonth = format(new Date(), "MMMM");

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Fetch all data in parallel for better performance
      const [balanceData, recentTransactions, monthlyTxns, loansData] =
        await Promise.all([
          getAccountBalance(user.id),
          getRecentTransactions(user.id, 5),
          getMonthlyTransactions(user.id),
          fetchLoansData(user.id),
        ]);

      setBalance(balanceData);
      setTransactions(recentTransactions);
      setMonthlyTransactions(monthlyTxns);
      setLoans(loansData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLoansData = async (userId: string) => {
    const { data, error } = await supabase
      .from("loans")
      .select("*")
      .eq("user_id", userId)
      .order("application_date", { ascending: false });

    if (error) {
      console.error("Error fetching loans data:", error);
      return [];
    }
    return data || [];
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    toast.success("Dashboard refreshed");
    setIsRefreshing(false);
  };

  const handleLoanSuccess = () => {
    setShowLoanForm(false);
    // Refresh loans data
    if (user) {
      fetchLoansData(user.id).then((data) => setLoans(data));
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    setSelectedLoan(null);

    // Refresh dashboard data including account balance and loans
    if (user) {
      fetchDashboardData();
    }
  };

  const handleMakePayment = (loan: Loan) => {
    setSelectedLoan(loan);
    setShowPaymentForm(true);
  };

  // Calculate monthly statistics
  const monthlyIncome = monthlyTransactions
    .filter((t) => t.type === "deposit")
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpenses = monthlyTransactions
    .filter((t) => t.type === "withdrawal")
    .reduce((sum, t) => sum + t.amount, 0);

  // Navigation handlers for action buttons
  const handleDepositClick = () => navigate("/deposit");
  const handleTransferClick = () => navigate("/transfer");
  const handleBillsClick = () => navigate("/bills");
  const handleLoanClick = () => setShowLoanForm(true);

  // Helper function for status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle size={16} className="text-green-500" />;
      case "pending":
        return <Clock size={16} className="text-amber-500" />;
      case "failed":
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return <CheckCircle size={16} className="text-green-500" />;
    }
  };

  const getLoanTypeLabel = (type: string): string => {
    const types: { [key: string]: string } = {
      business: "Business Loan",
      auto: "Auto Loan",
      personal: "Personal Loan",
      festive: "Festive Loan",
      building: "Building Loan",
      device: "Mobile Device Loan",
      motorcycle: "Motorcycle Loan",
      education: "Education Loan",
      special: "Staff Special Loan",
    };
    return types[type] || type;
  };

  const getLoanStatusBadge = (status: string) => {
    const statusConfig: {
      [key: string]: { color: string; icon: JSX.Element };
    } = {
      pending: {
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: <Clock className="w-4 h-4 mr-1" />,
      },
      approved: {
        color: "bg-green-100 text-green-800 border-green-200",
        icon: <CheckCircle2 className="w-4 h-4 mr-1" />,
      },
      active: {
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: <BarChart className="w-4 h-4 mr-1" />,
      },
      rejected: {
        color: "bg-red-100 text-red-800 border-red-200",
        icon: <XCircle className="w-4 h-4 mr-1" />,
      },
      paid: {
        color: "bg-green-100 text-green-800 border-green-200",
        icon: <BadgeDollarSign className="w-4 h-4 mr-1" />,
      },
      default: {
        color: "bg-gray-100 text-gray-800 border-gray-200",
        icon: <AlertCircle className="w-4 h-4 mr-1" />,
      },
    };

    const config = statusConfig[status] || statusConfig.default;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}
      >
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Format date helper
  const formatTransactionDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "MMM dd, yyyy • h:mm a");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
      .format(amount)
      .replace(/^/, "D");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 pb-12">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 sm:p-8 text-white shadow-lg mt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              Welcome back, {profile?.full_name?.split(" ")[0] || "Friend"}! 👋
            </h1>
            <p className="text-primary-100">
              Here's a quick overview of your account
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-white border border-white/20 hover:bg-white/10 transition-colors duration-200 ${
                isRefreshing ? "opacity-75 cursor-not-allowed" : ""
              }`}
            >
              <RefreshCw
                size={18}
                className={`mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          title="Your Balance"
          value={balance}
          icon={<Wallet size={20} />}
          format="currency"
          currencySymbol="D"
          subtitle="Updated just now"
          className="bg-white border-l-4 border-primary-500"
        />

        <StatCard
          title="Income"
          value={monthlyIncome}
          icon={<ArrowUpRight size={20} />}
          format="currency"
          currencySymbol="D"
          subtitle={`${currentMonth}`}
          className="bg-white border-l-4 border-green-500"
        />

        <StatCard
          title="Expenses"
          value={monthlyExpenses}
          icon={<ArrowDownRight size={20} />}
          format="currency"
          currencySymbol="D"
          subtitle={`${currentMonth}`}
          className="bg-white border-l-4 border-red-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={handleDepositClick}
          className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl p-4 shadow-md flex flex-col items-center justify-center transition-colors duration-200 text-center h-24"
        >
          <Plus className="w-6 h-6 mb-2" />
          <span className="text-sm font-medium">Deposit</span>
        </button>

        <button
          onClick={handleTransferClick}
          className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl p-4 shadow-md flex flex-col items-center justify-center transition-colors duration-200 text-center h-24"
        >
          <Send className="w-6 h-6 mb-2" />
          <span className="text-sm font-medium">Transfer</span>
        </button>

        <button
          onClick={handleBillsClick}
          className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl p-4 shadow-md flex flex-col items-center justify-center transition-colors duration-200 text-center h-24"
        >
          <CreditCard className="w-6 h-6 mb-2" />
          <span className="text-sm font-medium">Pay Bills</span>
        </button>

        <button
          onClick={handleLoanClick}
          className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl p-4 shadow-md flex flex-col items-center justify-center transition-colors duration-200 text-center h-24"
        >
          <Shield className="w-6 h-6 mb-2" />
          <span className="text-sm font-medium">Loan (1%)</span>
        </button>
      </div>

      {/* Loan Application Form */}
      {showLoanForm && (
        <div className="mb-8">
          <LoanApplicationForm
            onSuccess={handleLoanSuccess}
            onCancel={() => setShowLoanForm(false)}
          />
        </div>
      )}

      {/* Loan Payment Form */}
      {showPaymentForm && selectedLoan && (
        <div className="mb-8">
          <LoanPaymentForm
            loan={selectedLoan}
            onSuccess={handlePaymentSuccess}
            onCancel={() => {
              setShowPaymentForm(false);
              setSelectedLoan(null);
            }}
          />
        </div>
      )}

      {/* Loans Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-primary-500" />
            Your Loans
          </h3>
          <button
            onClick={handleLoanClick}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Application
          </button>
        </div>

        <div className="bg-white overflow-hidden">
          {loans.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {loans.map((loan) => (
                <li key={loan.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                        <CircleDollarSign className="h-6 w-6" />
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <h4 className="text-sm font-medium text-gray-900">
                            {getLoanTypeLabel(loan.loan_type)}
                          </h4>
                          <div className="ml-2">
                            {getLoanStatusBadge(loan.status)}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          Applied on{" "}
                          {new Date(loan.application_date).toLocaleDateString()}
                        </p>
                        {loan.purpose && (
                          <p className="mt-1 text-xs text-gray-600 max-w-md">
                            Purpose: {loan.purpose}
                          </p>
                        )}
                        {loan.status === "active" && (
                          <div className="mt-2">
                            <button
                              onClick={() => handleMakePayment(loan)}
                              className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200"
                            >
                              Make Payment
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-sm font-medium text-gray-900">
                        D{loan.amount.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {loan.term_months} months |{" "}
                        {(loan.interest_rate * 100).toFixed(2)}%
                      </span>
                      {(loan.status === "active" ||
                        loan.status === "approved") && (
                        <>
                          <span className="text-xs text-green-600 mt-1">
                            D{loan.monthly_payment.toLocaleString()} / month
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            Remaining: D
                            {loan.remaining_balance.toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <CircleDollarSign className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No loans yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by applying for a new loan.
              </p>
              <div className="mt-6">
                <button
                  onClick={handleLoanClick}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Apply for Loan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Transactions
            </h2>
            <p className="text-sm text-gray-500">
              Your latest account activity
            </p>
          </div>
          <button
            onClick={() => navigate("/transactions")}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            View All
          </button>
        </div>

        {isLoading ? (
          <div className="p-6 text-center">
            <RefreshCw
              size={24}
              className="mx-auto mb-2 animate-spin text-primary-500"
            />
            <p className="text-gray-500">Loading your transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">No recent transactions</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatTransactionDate(transaction.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transaction.description ||
                        (transaction.type === "deposit"
                          ? "Deposit"
                          : "Withdrawal")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {transaction.type === "deposit" ? (
                        <span className="text-green-600 font-medium">
                          +D{transaction.amount.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-red-600 font-medium">
                          -D{transaction.amount.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        {getStatusIcon(transaction.status || "completed")}
                        <span className="ml-2 capitalize">
                          {transaction.status || "completed"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
