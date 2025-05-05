import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  Download,
  Filter,
  RefreshCw,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import { toast } from "react-hot-toast";

// Define transaction types
type Transaction = {
  id: string;
  created_at: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  category: string;
  user_id?: string;
  profiles?: {
    full_name: string;
  };
};

export default function Activity() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState({
    type: "all",
    timeRange: "30days",
    status: "all",
    category: "all",
  });

  // Fetch all user transactions
  useEffect(() => {
    if (!user) return;
    fetchTransactions();
  }, [user]);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [transactions, filter, searchQuery]);

  // Function to fetch transactions from Supabase
  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      if (!user || !user.id) {
        throw new Error("User not authenticated");
      }

      // Fetch transactions for the current user using the user_id field
      const { data: userTransactions, error } = await supabase
        .from("transactions")
        .select("*, profiles:user_id(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Transaction query error:", error);
        throw error;
      }

      setTransactions(userTransactions || []);
      setFilteredTransactions(userTransactions || []);
      setIsLoading(false);
    } catch (error: any) {
      console.error("Error fetching transactions:", error.message);
      toast.error("Failed to load transaction history");
      setIsLoading(false);
    }
  };

  // Apply all filters to transactions
  const applyFilters = () => {
    let filtered = [...transactions];

    // Apply type filter
    if (filter.type !== "all") {
      filtered = filtered.filter((t) => t.type === filter.type);
    }

    // Apply status filter
    if (filter.status !== "all") {
      filtered = filtered.filter((t) => t.status === filter.status);
    }

    // Apply category filter
    if (filter.category !== "all") {
      filtered = filtered.filter((t) => t.category === filter.category);
    }

    // Apply time range filter
    const today = new Date();
    if (filter.timeRange === "7days") {
      const weekAgo = subDays(today, 7);
      filtered = filtered.filter((t) => new Date(t.created_at) >= weekAgo);
    } else if (filter.timeRange === "30days") {
      const monthAgo = subDays(today, 30);
      filtered = filtered.filter((t) => new Date(t.created_at) >= monthAgo);
    } else if (filter.timeRange === "90days") {
      const threeMonthsAgo = subDays(today, 90);
      filtered = filtered.filter(
        (t) => new Date(t.created_at) >= threeMonthsAgo
      );
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.description?.toLowerCase().includes(query) ||
          t.type?.toLowerCase().includes(query) ||
          t.category?.toLowerCase().includes(query) ||
          t.profiles?.full_name?.toLowerCase().includes(query)
      );
    }

    setFilteredTransactions(filtered);
  };

  // Format currency values
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Function to handle exporting transactions
  const exportTransactions = () => {
    if (filteredTransactions.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    setIsExporting(true);

    // Format the data for CSV
    const headers = [
      "Date",
      "Type",
      "Amount",
      "Status",
      "Description",
      "Category",
      "From/To",
    ];

    const rows = filteredTransactions.map((t) => [
      format(parseISO(t.created_at), "MM/dd/yyyy HH:mm:ss"),
      t.type,
      t.amount,
      t.status,
      t.description || "",
      t.category || "Uncategorized",
      t.type === "deposit"
        ? "System → You"
        : t.type === "withdrawal"
        ? "You → External"
        : `${t.profiles?.full_name || "Unknown"} → ${
            t.profiles?.full_name || "Unknown"
          }`,
    ]);

    // Create CSV content
    const csvContent =
      headers.join(",") + "\n" + rows.map((row) => row.join(",")).join("\n");

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsExporting(false);
    toast.success("Transactions exported successfully");
  };

  // Function to get transaction icon
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowDownRight size={16} className="text-green-500" />;
      case "withdrawal":
        return <ArrowUpRight size={16} className="text-amber-500" />;
      default:
        return <ArrowUpRight size={16} className="text-blue-500" />;
    }
  };

  // Function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle size={16} className="text-green-500" />;
      case "pending":
        return <Clock size={16} className="text-amber-500" />;
      case "failed":
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return <Clock size={16} className="text-gray-500" />;
    }
  };

  // Get unique categories for filter dropdown
  const categories = [
    "all",
    ...Array.from(
      new Set(
        transactions
          .filter((t) => t.category)
          .map((t) => t.category.toLowerCase())
      )
    ),
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Transaction History
              </h1>
              <p className="text-gray-500 mt-1">
                View and search your complete transaction history
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchTransactions}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                disabled={isLoading}
              >
                <RefreshCw
                  size={16}
                  className={`mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
              <button
                onClick={exportTransactions}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                disabled={isExporting || filteredTransactions.length === 0}
              >
                <Download size={16} className="mr-2" />
                Export
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search transactions..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 sm:text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="transfer">Transfers</option>
            </select>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={filter.timeRange}
              onChange={(e) =>
                setFilter({ ...filter, timeRange: e.target.value })
              }
            >
              <option value="all">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {categories.length > 1 && (
            <div className="mt-4 flex items-center">
              <label className="mr-2 text-sm text-gray-600">Category:</label>
              <select
                className="block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={filter.category}
                onChange={(e) =>
                  setFilter({ ...filter, category: e.target.value })
                }
              >
                <option value="all">All Categories</option>
                {categories
                  .filter((c) => c !== "all")
                  .map((category) => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>

        {/* Transactions List */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-10">
              <RefreshCw
                size={24}
                className="animate-spin mx-auto mb-4 text-primary-500"
              />
              <p className="text-gray-500">
                Loading your transaction history...
              </p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-10">
              <Filter size={24} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 mb-1">No transactions found</p>
              <p className="text-sm text-gray-400">
                Try adjusting your filters or search query
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Date
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
                    Description
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Category
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Amount
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
                  <tr
                    key={transaction.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(parseISO(transaction.created_at), "MMM dd, yyyy")}
                      <div className="text-xs text-gray-500">
                        {format(parseISO(transaction.created_at), "h:mm a")}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center mr-2">
                          {getTransactionIcon(transaction.type)}
                        </span>
                        <span className="capitalize">{transaction.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transaction.description || (
                        <span className="text-gray-400">No description</span>
                      )}
                      {transaction.type === "transfer" && (
                        <div className="text-xs text-gray-500">
                          {transaction.user_id === user?.id
                            ? `To: ${
                                transaction.profiles?.full_name || "Unknown"
                              }`
                            : `From: ${
                                transaction.profiles?.full_name || "Unknown"
                              }`}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.category ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                          {transaction.category}
                        </span>
                      ) : (
                        <span className="text-gray-400">Uncategorized</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      <span
                        className={
                          transaction.type === "deposit"
                            ? "text-green-600"
                            : transaction.user_id === user?.id
                            ? "text-red-600"
                            : "text-green-600"
                        }
                      >
                        {transaction.type === "deposit" ||
                        transaction.user_id === user?.id
                          ? "+"
                          : "-"}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        {getStatusIcon(transaction.status)}
                        <span className="ml-1.5 capitalize">
                          {transaction.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination could be added here */}
        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="text-sm text-gray-700">
            Showing{" "}
            <span className="font-medium">{filteredTransactions.length}</span>{" "}
            of <span className="font-medium">{transactions.length}</span>{" "}
            transactions
          </div>
        </div>
      </div>
    </div>
  );
}
