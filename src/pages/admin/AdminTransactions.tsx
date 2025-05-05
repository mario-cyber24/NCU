import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import {
  Search,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpDown,
  Filter,
  RefreshCw,
  BarChart,
  BadgeDollarSign,
  AlertCircle,
  Coins,
} from "lucide-react";

interface Loan {
  id: string;
  user_id: string;
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
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  created_at: string;
  description: string;
  user_id: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export default function AdminTransactions() {
  const [activeTab, setActiveTab] = useState<"transactions" | "loans">(
    "transactions"
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [processingLoanId, setProcessingLoanId] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
    fetchLoans();
  }, []);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          *,
          profiles:user_id (full_name, email)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLoans = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("loans")
        .select(
          `
          *,
          profiles:user_id (full_name, email)
        `
        )
        .order("application_date", { ascending: false });

      if (error) throw error;
      setLoans(data || []);
    } catch (error) {
      console.error("Error fetching loans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoanAction = async (
    loanId: string,
    action: "approve" | "reject"
  ) => {
    setProcessingLoanId(loanId);
    try {
      const newStatus = action === "approve" ? "approved" : "rejected";
      const updateData: any = {
        status: newStatus,
      };

      if (action === "approve") {
        updateData.approval_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from("loans")
        .update(updateData)
        .eq("id", loanId);

      if (error) throw error;

      // If approved, create a transaction to disburse the loan amount
      if (action === "approve") {
        const loan = loans.find((l) => l.id === loanId);
        if (loan) {
          // Add loan amount to user's account
          const { error: transactionError } = await supabase
            .from("transactions")
            .insert({
              user_id: loan.user_id,
              amount: loan.amount,
              type: "deposit",
              description: `Loan disbursement - ${getLoanTypeLabel(
                loan.loan_type
              )}`,
              status: "completed",
            });

          if (transactionError) throw transactionError;

          // Update user's account balance
          const { error: accountError } = await supabase.rpc(
            "increment_account_balance",
            {
              user_id_input: loan.user_id,
              amount_input: loan.amount,
            }
          );

          if (accountError) throw accountError;
        }
      }

      // Refresh loans list
      fetchLoans();
    } catch (error) {
      console.error(`Error ${action}ing loan:`, error);
      alert(`Failed to ${action} loan. Please try again.`);
    } finally {
      setProcessingLoanId(null);
      setSelectedLoan(null);
    }
  };

  // Filter and search functions
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      searchQuery === "" ||
      transaction.profiles?.full_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      transaction.profiles?.email
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      transaction.description
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || transaction.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredLoans = loans.filter((loan) => {
    const matchesSearch =
      searchQuery === "" ||
      loan.profiles?.full_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      loan.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getLoanTypeLabel(loan.loan_type)
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || loan.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Helper functions
  const formatCurrency = (amount: number) => {
    // Format the number with 2 decimal places without any currency symbol
    const formattedNumber = amount.toFixed(2);

    // Add thousand separators
    const parts = formattedNumber.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    // Add the D symbol prefix
    return `D${parts.join(".")}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
        icon: <CheckCircle className="w-4 h-4 mr-1" />,
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

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex flex-col">
        {/* Tab Buttons */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              className={`px-6 py-4 ${
                activeTab === "transactions"
                  ? "border-b-2 border-primary-500 text-primary-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("transactions")}
            >
              <div className="flex items-center">
                <Coins className="w-5 h-5 mr-2" />
                <span className="font-medium">Transactions</span>
              </div>
            </button>
            <button
              className={`px-6 py-4 ${
                activeTab === "loans"
                  ? "border-b-2 border-primary-500 text-primary-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab("loans")}
            >
              <div className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                <span className="font-medium">Loan Applications</span>
              </div>
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative sm:max-w-xs flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by name, email or description..."
                className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <select
                  className="block appearance-none bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded-md leading-tight focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="active">Active</option>
                  <option value="rejected">Rejected</option>
                  <option value="completed">Completed</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <Filter className="h-4 w-4" />
                </div>
              </div>
              <button
                onClick={() =>
                  activeTab === "transactions"
                    ? fetchTransactions()
                    : fetchLoans()
                }
                className="flex items-center px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {activeTab === "transactions" ? (
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="text-center p-8">
                <RefreshCw className="animate-spin h-8 w-8 text-primary-500 mx-auto" />
                <p className="mt-2 text-gray-500">Loading transactions...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center p-8">
                <p className="text-gray-500">No transactions found.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      <div className="flex items-center">
                        User
                        <ArrowUpDown className="w-4 h-4 ml-1" />
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      <div className="flex items-center">
                        Date
                        <ArrowUpDown className="w-4 h-4 ml-1" />
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Description
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Amount
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Type
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-500 font-medium">
                              {transaction.profiles?.full_name?.charAt(0) ||
                                "U"}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {transaction.profiles?.full_name ||
                                "Unknown User"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {transaction.profiles?.email ||
                                "No email available"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(transaction.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.description || "No description"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`font-medium ${
                            transaction.type === "deposit"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.type === "deposit" ? "+" : "-"}
                          {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.type === "deposit"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {transaction.type === "deposit"
                            ? "Deposit"
                            : "Withdrawal"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : transaction.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {transaction.status === "completed" ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : transaction.status === "pending" ? (
                            <Clock className="w-3 h-3 mr-1" />
                          ) : (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {transaction.status?.charAt(0).toUpperCase() +
                            transaction.status?.slice(1) || "Unknown"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="text-center p-8">
                <RefreshCw className="animate-spin h-8 w-8 text-primary-500 mx-auto" />
                <p className="mt-2 text-gray-500">
                  Loading loan applications...
                </p>
              </div>
            ) : filteredLoans.length === 0 ? (
              <div className="text-center p-8">
                <p className="text-gray-500">No loan applications found.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Applicant
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Loan Type
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Amount / Term
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Application Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-500 font-medium">
                              {loan.profiles?.full_name?.charAt(0) || "U"}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {loan.profiles?.full_name || "Unknown User"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {loan.profiles?.email || "No email available"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getLoanTypeLabel(loan.loan_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(loan.amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {loan.term_months} months |{" "}
                          {(loan.interest_rate * 100).toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getLoanStatusBadge(loan.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(loan.application_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {loan.status === "pending" ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() =>
                                handleLoanAction(loan.id, "approve")
                              }
                              disabled={processingLoanId === loan.id}
                              className="text-green-600 hover:text-green-900 flex items-center"
                            >
                              {processingLoanId === loan.id ? (
                                <RefreshCw className="animate-spin h-4 w-4 mr-1" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-1" />
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                handleLoanAction(loan.id, "reject")
                              }
                              disabled={processingLoanId === loan.id}
                              className="text-red-600 hover:text-red-900 flex items-center"
                            >
                              {processingLoanId === loan.id ? (
                                <RefreshCw className="animate-spin h-4 w-4 mr-1" />
                              ) : (
                                <XCircle className="h-4 w-4 mr-1" />
                              )}
                              Reject
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedLoan(loan)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            View Details
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Loan Details Modal */}
      {selectedLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">
                  Loan Application Details
                </h3>
                <button
                  className="text-gray-400 hover:text-gray-500"
                  onClick={() => setSelectedLoan(null)}
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Applicant</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedLoan.profiles?.full_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedLoan.profiles?.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Loan Type</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {getLoanTypeLabel(selectedLoan.loan_type)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <div className="mt-1">
                    {getLoanStatusBadge(selectedLoan.status)}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Amount</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatCurrency(selectedLoan.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Term</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedLoan.term_months} months
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Interest Rate
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {(selectedLoan.interest_rate * 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Monthly Payment
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatCurrency(selectedLoan.monthly_payment)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Total Interest
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatCurrency(selectedLoan.total_interest)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Total Payment
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatCurrency(selectedLoan.total_payment)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Application Date
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(selectedLoan.application_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Approval Date
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedLoan.approval_date
                      ? formatDate(selectedLoan.approval_date)
                      : "N/A"}
                  </p>
                </div>
              </div>

              {selectedLoan.purpose && (
                <div className="mt-6">
                  <p className="text-sm font-medium text-gray-500">
                    Purpose of Loan
                  </p>
                  <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                    {selectedLoan.purpose}
                  </p>
                </div>
              )}

              {selectedLoan.status === "pending" && (
                <div className="mt-8 flex justify-end space-x-4">
                  <button
                    onClick={() => handleLoanAction(selectedLoan.id, "approve")}
                    disabled={processingLoanId === selectedLoan.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                  >
                    {processingLoanId === selectedLoan.id ? (
                      <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Approve Loan
                  </button>
                  <button
                    onClick={() => handleLoanAction(selectedLoan.id, "reject")}
                    disabled={processingLoanId === selectedLoan.id}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                  >
                    {processingLoanId === selectedLoan.id ? (
                      <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Reject Loan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
