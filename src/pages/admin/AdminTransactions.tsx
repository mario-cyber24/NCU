import { useState, useEffect } from "react";
import {
  getAllTransactions,
  updateTransactionStatus,
} from "../../lib/supabase";
import { toast } from "react-hot-toast";
import {
  Search,
  RefreshCw,
  AlertCircle,
  Check,
  ChevronUp,
  ChevronDown,
  Filter,
  Download,
  Calendar,
  CheckSquare,
  Square,
  Eye,
  ArrowRight,
  X,
} from "lucide-react";
import { format, subDays, isAfter, isBefore } from "date-fns";

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewTransaction, setViewTransaction] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [perPage, setPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (transactions.length > 0) {
      let filtered = [...transactions];

      // Apply search filter
      if (searchTerm) {
        filtered = filtered.filter(
          (tx) =>
            tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tx.profiles?.full_name
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            tx.profiles?.email
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            tx.id?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Apply status filter
      if (statusFilter !== "all") {
        filtered = filtered.filter((tx) => tx.status === statusFilter);
      }

      // Apply type filter
      if (typeFilter !== "all") {
        filtered = filtered.filter((tx) => tx.type === typeFilter);
      }

      // Apply date filter
      if (dateRange !== "all") {
        const today = new Date();
        let startDate: Date;

        switch (dateRange) {
          case "today":
            startDate = new Date(today);
            startDate.setHours(0, 0, 0, 0);
            filtered = filtered.filter((tx) =>
              isAfter(new Date(tx.created_at), startDate)
            );
            break;
          case "week":
            startDate = subDays(today, 7);
            filtered = filtered.filter((tx) =>
              isAfter(new Date(tx.created_at), startDate)
            );
            break;
          case "month":
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            filtered = filtered.filter((tx) =>
              isAfter(new Date(tx.created_at), startDate)
            );
            break;
          case "custom":
            if (customStartDate && customEndDate) {
              const start = new Date(customStartDate);
              const end = new Date(customEndDate);
              end.setHours(23, 59, 59, 999); // End of day

              filtered = filtered.filter((tx) => {
                const txDate = new Date(tx.created_at);
                return isAfter(txDate, start) && isBefore(txDate, end);
              });
            }
            break;
          default:
            break;
        }
      }

      // Apply sorting
      filtered.sort((a, b) => {
        let valueA, valueB;

        if (sortField === "amount") {
          valueA = parseFloat(a.amount) || 0;
          valueB = parseFloat(b.amount) || 0;
        } else if (sortField === "created_at") {
          valueA = new Date(a.created_at).getTime();
          valueB = new Date(b.created_at).getTime();
        } else if (sortField === "user") {
          valueA = a.profiles?.full_name || "";
          valueB = b.profiles?.full_name || "";
        } else {
          valueA = a[sortField] || "";
          valueB = b[sortField] || "";
        }

        if (sortDirection === "asc") {
          return valueA > valueB ? 1 : -1;
        } else {
          return valueA < valueB ? 1 : -1;
        }
      });

      setFilteredTransactions(filtered);
    } else {
      setFilteredTransactions([]);
    }
  }, [
    transactions,
    searchTerm,
    statusFilter,
    typeFilter,
    dateRange,
    customStartDate,
    customEndDate,
    sortField,
    sortDirection,
  ]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    setIsRefreshing(true);

    try {
      const allTransactions = await getAllTransactions(1000); // Fetch up to 1000 transactions
      setTransactions(allTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateTransactionStatus(id, status);

      // Update local state
      setTransactions((prevTransactions) =>
        prevTransactions.map((tx) => (tx.id === id ? { ...tx, status } : tx))
      );

      toast.success(`Transaction status updated to ${status}`);
    } catch (error) {
      console.error("Error updating transaction status:", error);
      toast.error("Failed to update transaction status");
    }
  };

  const handleBatchUpdateStatus = async (status: string) => {
    if (selectedIds.length === 0) {
      toast.error("No transactions selected");
      return;
    }

    try {
      // Show loading toast
      const loadingToast = toast.loading(
        `Updating ${selectedIds.length} transactions...`
      );

      // Process in batches of 10 for better UX
      const batchSize = 10;
      const batches = Math.ceil(selectedIds.length / batchSize);

      for (let i = 0; i < batches; i++) {
        const batchIds = selectedIds.slice(i * batchSize, (i + 1) * batchSize);

        // Process each transaction in the current batch
        await Promise.all(
          batchIds.map((id) => updateTransactionStatus(id, status))
        );

        // Update progress
        toast.loading(
          `Processing ${(i + 1) * batchSize}/${selectedIds.length}...`,
          {
            id: loadingToast,
          }
        );
      }

      // Update local state
      setTransactions((prevTransactions) =>
        prevTransactions.map((tx) =>
          selectedIds.includes(tx.id) ? { ...tx, status } : tx
        )
      );

      // Clear selection
      setSelectedIds([]);

      // Show success message
      toast.success(`Updated ${selectedIds.length} transactions to ${status}`, {
        id: loadingToast,
      });
    } catch (error) {
      console.error("Error in batch update:", error);
      toast.error("Failed to update some transactions");
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prevIds) =>
      prevIds.includes(id)
        ? prevIds.filter((txId) => txId !== id)
        : [...prevIds, id]
    );
  };

  const toggleAllSelection = () => {
    const visibleTransactions = getPaginatedData();
    const visibleIds = visibleTransactions.map((tx) => tx.id);

    if (selectedIds.length === visibleIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleIds);
    }
  };

  const handleExportSelected = () => {
    if (selectedIds.length === 0) {
      toast.error("No transactions selected for export");
      return;
    }

    setIsExporting(true);

    try {
      // Get selected transactions
      const selectedTransactions = transactions.filter((tx) =>
        selectedIds.includes(tx.id)
      );

      // Create CSV content
      const headers = [
        "ID",
        "Type",
        "Amount",
        "Status",
        "Date",
        "User",
        "Description",
      ];

      const rows = selectedTransactions.map((tx) => [
        tx.id,
        tx.type,
        tx.amount,
        tx.status,
        format(new Date(tx.created_at), "yyyy-MM-dd HH:mm"),
        tx.profiles?.full_name || "Unknown",
        tx.description || "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      // Create and trigger download
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${selectedIds.length} transactions`);
    } catch (error) {
      console.error("Error exporting transactions:", error);
      toast.error("Failed to export transactions");
    } finally {
      setIsExporting(false);
    }
  };

  // Pagination helpers
  const getTotalPages = () => {
    return Math.ceil(filteredTransactions.length / perPage);
  };

  const getPaginatedData = () => {
    const startIdx = currentPage * perPage;
    const endIdx = startIdx + perPage;
    return filteredTransactions.slice(startIdx, endIdx);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with action buttons */}
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and monitor all financial transactions
            {filteredTransactions.length > 0 &&
              ` (${filteredTransactions.length} total)`}
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-2">
          <button
            onClick={fetchTransactions}
            disabled={isRefreshing}
            className="btn bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center"
          >
            <RefreshCw
              size={16}
              className={`mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>

          <button
            onClick={handleExportSelected}
            disabled={selectedIds.length === 0 || isExporting}
            className={`btn flex items-center ${
              selectedIds.length > 0
                ? "bg-primary-600 hover:bg-primary-700 text-white"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Download size={16} className="mr-2" />
            {isExporting ? "Exporting..." : `Export (${selectedIds.length})`}
          </button>
        </div>
      </div>

      {/* Search filters and actions */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="relative lg:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by ID, description or user..."
              className="input pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select"
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="select"
              aria-label="Filter by type"
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="transfer">Transfers</option>
            </select>
          </div>

          <div className="lg:col-span-1 relative">
            <div className="flex">
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  if (e.target.value === "custom") {
                    setShowDatePicker(true);
                  } else {
                    setShowDatePicker(false);
                  }
                }}
                className="select flex-grow"
                aria-label="Filter by date"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>

              <button
                className="btn bg-gray-100 hover:bg-gray-200 text-gray-700 ml-1"
                onClick={() => setShowDatePicker(!showDatePicker)}
                aria-label="Toggle date picker"
              >
                <Calendar size={16} />
              </button>
            </div>

            {showDatePicker && (
              <div className="absolute z-10 right-0 mt-2 bg-white p-4 rounded-md shadow-lg border border-gray-200">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      From
                    </label>
                    <input
                      type="date"
                      className="input mt-1"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      To
                    </label>
                    <input
                      type="date"
                      className="input mt-1"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setDateRange("custom");
                      setShowDatePicker(false);
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Batch action buttons */}
        {selectedIds.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-100 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-500">
              {selectedIds.length} transactions selected
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                onClick={() => handleBatchUpdateStatus("completed")}
                className="btn btn-sm bg-green-600 hover:bg-green-700 text-white flex items-center"
              >
                <Check size={14} className="mr-1" /> Mark Completed
              </button>
              <button
                onClick={() => handleBatchUpdateStatus("failed")}
                className="btn btn-sm bg-red-600 hover:bg-red-700 text-white flex items-center"
              >
                <AlertCircle size={14} className="mr-1" /> Mark Failed
              </button>
              <button
                onClick={() => handleBatchUpdateStatus("pending")}
                className="btn btn-sm bg-yellow-600 hover:bg-yellow-700 text-white flex items-center"
              >
                <AlertCircle size={14} className="mr-1" /> Mark Pending
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="btn btn-sm bg-gray-600 hover:bg-gray-700 text-white"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transactions table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-3 text-left">
                  <div className="flex items-center">
                    <button
                      onClick={toggleAllSelection}
                      className="text-gray-500 hover:text-primary-600 focus:outline-none"
                      aria-label="Select all visible transactions"
                    >
                      {getPaginatedData().length > 0 &&
                      selectedIds.length === getPaginatedData().length ? (
                        <CheckSquare size={18} className="text-primary-600" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => {
                    setSortField("type");
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  }}
                >
                  <div className="flex items-center">
                    Type
                    {sortField === "type" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp size={16} className="ml-1 text-gray-400" />
                      ) : (
                        <ChevronDown size={16} className="ml-1 text-gray-400" />
                      ))}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => {
                    setSortField("amount");
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  }}
                >
                  <div className="flex items-center">
                    Amount
                    {sortField === "amount" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp size={16} className="ml-1 text-gray-400" />
                      ) : (
                        <ChevronDown size={16} className="ml-1 text-gray-400" />
                      ))}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => {
                    setSortField("user");
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  }}
                >
                  <div className="flex items-center">
                    User
                    {sortField === "user" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp size={16} className="ml-1 text-gray-400" />
                      ) : (
                        <ChevronDown size={16} className="ml-1 text-gray-400" />
                      ))}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Description
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => {
                    setSortField("status");
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  }}
                >
                  <div className="flex items-center">
                    Status
                    {sortField === "status" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp size={16} className="ml-1 text-gray-400" />
                      ) : (
                        <ChevronDown size={16} className="ml-1 text-gray-400" />
                      ))}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => {
                    setSortField("created_at");
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  }}
                >
                  <div className="flex items-center">
                    Date
                    {sortField === "created_at" &&
                      (sortDirection === "asc" ? (
                        <ChevronUp size={16} className="ml-1 text-gray-400" />
                      ) : (
                        <ChevronDown size={16} className="ml-1 text-gray-400" />
                      ))}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-4 whitespace-nowrap text-center"
                  >
                    <div className="flex justify-center items-center">
                      <RefreshCw size={20} className="animate-spin mr-2" />
                      <p className="text-gray-500">Loading transactions...</p>
                    </div>
                  </td>
                </tr>
              ) : getPaginatedData().length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-4 whitespace-nowrap text-center"
                  >
                    <p className="text-gray-500">No transactions found</p>
                  </td>
                </tr>
              ) : (
                getPaginatedData().map((transaction) => (
                  <tr
                    key={transaction.id}
                    className={`hover:bg-gray-50 ${
                      selectedIds.includes(transaction.id)
                        ? "bg-primary-50"
                        : ""
                    }`}
                  >
                    <td className="px-3 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleSelection(transaction.id)}
                        className="text-gray-500 hover:text-primary-600 focus:outline-none"
                        aria-label={
                          selectedIds.includes(transaction.id)
                            ? "Deselect transaction"
                            : "Select transaction"
                        }
                      >
                        {selectedIds.includes(transaction.id) ? (
                          <CheckSquare size={18} className="text-primary-600" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium capitalize
                          ${
                            transaction.type === "deposit"
                              ? "bg-green-100 text-green-800"
                              : transaction.type === "withdrawal"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                          }
                        `}
                      >
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        D{parseFloat(transaction.amount).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {transaction.profiles?.full_name || "Unknown"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {transaction.profiles?.email || "No email"}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {transaction.description || (
                          <span className="text-gray-400">No description</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium capitalize
                          ${
                            transaction.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : transaction.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }
                        `}
                      >
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(
                        new Date(transaction.created_at),
                        "MMM d, yyyy HH:mm"
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setViewTransaction(transaction)}
                          className="text-gray-600 hover:text-gray-900"
                          aria-label={`View transaction details`}
                        >
                          <Eye size={16} />
                        </button>
                        <div className="group relative">
                          <button className="text-gray-600 hover:text-gray-900">
                            <ArrowRight size={16} />
                          </button>
                          <div className="hidden group-hover:block absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                            {transaction.status !== "completed" && (
                              <button
                                onClick={() =>
                                  handleUpdateStatus(
                                    transaction.id,
                                    "completed"
                                  )
                                }
                                className="flex items-center w-full px-4 py-2 text-sm text-left text-green-700 hover:bg-green-100"
                              >
                                <Check size={14} className="mr-2" />
                                Mark Completed
                              </button>
                            )}
                            {transaction.status !== "pending" && (
                              <button
                                onClick={() =>
                                  handleUpdateStatus(transaction.id, "pending")
                                }
                                className="flex items-center w-full px-4 py-2 text-sm text-left text-yellow-700 hover:bg-yellow-100"
                              >
                                <AlertCircle size={14} className="mr-2" />
                                Mark Pending
                              </button>
                            )}
                            {transaction.status !== "failed" && (
                              <button
                                onClick={() =>
                                  handleUpdateStatus(transaction.id, "failed")
                                }
                                className="flex items-center w-full px-4 py-2 text-sm text-left text-red-700 hover:bg-red-100"
                              >
                                <AlertCircle size={14} className="mr-2" />
                                Mark Failed
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredTransactions.length > perPage && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className={`btn bg-white text-gray-700 ${
                  currentPage === 0 ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(getTotalPages() - 1, prev + 1)
                  )
                }
                disabled={currentPage >= getTotalPages() - 1}
                className={`btn bg-white text-gray-700 ${
                  currentPage >= getTotalPages() - 1
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">
                    {currentPage * perPage + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(
                      (currentPage + 1) * perPage,
                      filteredTransactions.length
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">
                    {filteredTransactions.length}
                  </span>{" "}
                  transactions
                </p>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <select
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value));
                      setCurrentPage(0); // Reset to first page
                    }}
                    className="form-select text-sm rounded-md"
                  >
                    <option value="10">10 per page</option>
                    <option value="20">20 per page</option>
                    <option value="50">50 per page</option>
                    <option value="100">100 per page</option>
                  </select>

                  <nav className="relative z-0 inline-flex rounded-md shadow-sm">
                    <button
                      onClick={() => setCurrentPage(0)}
                      disabled={currentPage === 0}
                      className={`btn bg-white text-gray-700 ${
                        currentPage === 0 ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      First
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(0, prev - 1))
                      }
                      disabled={currentPage === 0}
                      className={`btn bg-white text-gray-700 ml-2 ${
                        currentPage === 0 ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      Previous
                    </button>
                    <span className="mx-2 inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white">
                      Page {currentPage + 1} of {getTotalPages()}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(getTotalPages() - 1, prev + 1)
                        )
                      }
                      disabled={currentPage >= getTotalPages() - 1}
                      className={`btn bg-white text-gray-700 ${
                        currentPage >= getTotalPages() - 1
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setCurrentPage(getTotalPages() - 1)}
                      disabled={currentPage >= getTotalPages() - 1}
                      className={`btn bg-white text-gray-700 ml-2 ${
                        currentPage >= getTotalPages() - 1
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      Last
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {viewTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">
                Transaction Details
              </h3>
              <button
                onClick={() => setViewTransaction(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">ID:</span>
                  <span className="text-sm text-gray-900 font-mono">
                    {viewTransaction.id}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">
                    Type:
                  </span>
                  <span
                    className={`px-2 py-1 text-xs rounded-full font-medium capitalize
                      ${
                        viewTransaction.type === "deposit"
                          ? "bg-green-100 text-green-800"
                          : viewTransaction.type === "withdrawal"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }
                    `}
                  >
                    {viewTransaction.type}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    Amount:
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    D{parseFloat(viewTransaction.amount).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    Status:
                  </span>
                  <span
                    className={`px-2 py-1 text-xs rounded-full font-medium capitalize
                      ${
                        viewTransaction.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : viewTransaction.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }
                    `}
                  >
                    {viewTransaction.status}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    Date:
                  </span>
                  <span className="text-sm text-gray-900">
                    {format(
                      new Date(viewTransaction.created_at),
                      "MMMM d, yyyy HH:mm:ss"
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    User:
                  </span>
                  <span className="text-sm text-gray-900">
                    {viewTransaction.profiles?.full_name || "Unknown"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    Email:
                  </span>
                  <span className="text-sm text-gray-900">
                    {viewTransaction.profiles?.email || "No email"}
                  </span>
                </div>

                <div>
                  <span className="block text-sm font-medium text-gray-500 mb-1">
                    Description:
                  </span>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                    {viewTransaction.description || "No description provided"}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setViewTransaction(null)}
                  className="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Close
                </button>

                <div className="relative group">
                  <button className="btn btn-primary">Update Status</button>
                  <div className="hidden group-hover:block absolute right-0 bottom-10 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                    {viewTransaction.status !== "completed" && (
                      <button
                        onClick={() => {
                          handleUpdateStatus(viewTransaction.id, "completed");
                          setViewTransaction(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-left text-green-700 hover:bg-green-100"
                      >
                        <Check size={14} className="mr-2" />
                        Mark Completed
                      </button>
                    )}
                    {viewTransaction.status !== "pending" && (
                      <button
                        onClick={() => {
                          handleUpdateStatus(viewTransaction.id, "pending");
                          setViewTransaction(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-left text-yellow-700 hover:bg-yellow-100"
                      >
                        <AlertCircle size={14} className="mr-2" />
                        Mark Pending
                      </button>
                    )}
                    {viewTransaction.status !== "failed" && (
                      <button
                        onClick={() => {
                          handleUpdateStatus(viewTransaction.id, "failed");
                          setViewTransaction(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-left text-red-700 hover:bg-red-100"
                      >
                        <AlertCircle size={14} className="mr-2" />
                        Mark Failed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
