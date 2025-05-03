import { useState, useEffect } from "react";
import {
  getAllUsers,
  updateAccountBalance,
  addTransaction,
} from "../../lib/supabase";
import { toast } from "react-hot-toast";
import {
  Search,
  Edit,
  User,
  Plus,
  X,
  Check,
  AlertTriangle,
  Filter,
  Download,
  Trash2,
  CheckSquare,
  Square,
  RefreshCw,
} from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newBalance, setNewBalance] = useState("");
  const [transactionType, setTransactionType] = useState("deposit");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDescription, setTransactionDescription] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isExporting, setIsExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [balanceFilter, setBalanceFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      let filtered = [...users];

      if (searchTerm) {
        filtered = filtered.filter(
          (user) =>
            user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (statusFilter !== "all") {
        if (statusFilter === "admin") {
          filtered = filtered.filter((user) => user.is_admin === true);
        } else if (statusFilter === "active") {
          filtered = filtered.filter((user) => user.is_admin !== true);
        }
      }

      if (balanceFilter !== "all") {
        filtered = filtered.filter((user) => {
          const balance = user.accounts?.[0]?.balance || 0;
          if (balanceFilter === "zero" && balance === 0) return true;
          if (balanceFilter === "positive" && balance > 0) return true;
          if (balanceFilter === "high" && balance > 10000) return true;
          return false;
        });
      }

      filtered.sort((a, b) => {
        let valueA, valueB;

        if (sortField === "balance") {
          valueA = a.accounts?.[0]?.balance || 0;
          valueB = b.accounts?.[0]?.balance || 0;
        } else if (sortField === "full_name") {
          valueA = a.full_name || "";
          valueB = b.full_name || "";
        } else if (sortField === "created_at") {
          valueA = new Date(a.created_at).getTime();
          valueB = new Date(b.created_at).getTime();
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

      setFilteredUsers(filtered);
    } else {
      setFilteredUsers([]);
    }
  }, [
    users,
    searchTerm,
    sortField,
    sortDirection,
    statusFilter,
    balanceFilter,
  ]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setIsRefreshing(true);

    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser || !newBalance) return;

    try {
      const balanceValue = parseFloat(newBalance);

      if (isNaN(balanceValue)) {
        toast.error("Please enter a valid number");
        return;
      }

      if (!selectedUser.accounts?.[0]?.id) {
        toast.error(
          "This user doesn't have a valid account yet. Refresh the page to create one."
        );
        return;
      }

      await updateAccountBalance(selectedUser.accounts[0].id, balanceValue);

      await addTransaction({
        user_id: selectedUser.id,
        account_id: selectedUser.accounts[0].id,
        amount: Math.abs(balanceValue - selectedUser.accounts[0].balance),
        type:
          balanceValue > selectedUser.accounts[0].balance
            ? "deposit"
            : "withdrawal",
        description: "Admin balance adjustment",
        status: "completed",
      });

      toast.success("Account balance updated successfully");
      setIsModalOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error updating balance:", error);
      toast.error("Failed to update balance");
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser || !transactionAmount || !transactionDescription) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const amount = parseFloat(transactionAmount);

      if (isNaN(amount) || amount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      if (!selectedUser.accounts?.[0]?.id) {
        toast.error(
          "This user doesn't have a valid account yet. Refresh the page to create one."
        );
        return;
      }

      let newBalance = selectedUser.accounts[0].balance;
      if (transactionType === "deposit") {
        newBalance += amount;
      } else if (transactionType === "withdrawal") {
        if (amount > selectedUser.accounts[0].balance) {
          toast.error("Insufficient funds for withdrawal");
          return;
        }
        newBalance -= amount;
      }

      await updateAccountBalance(selectedUser.accounts[0].id, newBalance);

      await addTransaction({
        user_id: selectedUser.id,
        account_id: selectedUser.accounts[0].id,
        amount,
        type: transactionType,
        description: transactionDescription,
        status: "completed",
      });

      toast.success("Transaction added successfully");
      setIsModalOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("Failed to add transaction");
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const toggleAllSelection = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((user) => user.id));
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) {
      toast.error("No users selected");
      return;
    }

    try {
      if (action === "export") {
        setIsExporting(true);

        const headers = ["Name", "Email", "Balance", "Status", "Joined"];
        const rows = selectedUsers.map((userId) => {
          const user = users.find((u) => u.id === userId);
          if (!user) return [];

          return [
            user.full_name || "Unknown",
            user.email || "No email",
            user.accounts?.[0]?.balance || 0,
            user.is_admin ? "Admin" : "Regular",
            new Date(user.created_at).toLocaleDateString(),
          ];
        });

        const csvContent = [
          headers.join(","),
          ...rows.map((row) => row.join(",")),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `users-export-${
          new Date().toISOString().split("T")[0]
        }.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Exported ${selectedUsers.length} users`);
        setSelectedUsers([]);
      }
    } catch (error) {
      console.error(`Error in bulk action ${action}:`, error);
      toast.error("Operation failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage all user accounts ({filteredUsers.length} of{" "}
            {users.length})
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={isRefreshing}
            className="btn bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center"
          >
            <RefreshCw
              size={16}
              className={isRefreshing ? "mr-2 animate-spin" : "mr-2"}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>

          <button
            onClick={() => handleBulkAction("export")}
            disabled={selectedUsers.length === 0 || isExporting}
            className={`btn flex items-center ${
              selectedUsers.length > 0
                ? "bg-primary-600 hover:bg-primary-700 text-white"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Download size={16} className="mr-2" />
            {isExporting ? "Exporting..." : `Export (${selectedUsers.length})`}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="sm:flex sm:items-center sm:justify-between gap-4">
          <div className="relative flex-grow mb-4 sm:mb-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="input pl-10 w-full"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select"
              aria-label="Filter by status"
            >
              <option value="all">All Users</option>
              <option value="admin">Admins Only</option>
              <option value="active">Regular Users</option>
            </select>

            <select
              value={balanceFilter}
              onChange={(e) => setBalanceFilter(e.target.value)}
              className="select"
              aria-label="Filter by balance"
            >
              <option value="all">All Balances</option>
              <option value="zero">Zero Balance</option>
              <option value="positive">Has Balance</option>
              <option value="high">High Balance (&gt;10000)</option>
            </select>

            <div className="flex gap-1">
              <button
                onClick={() => {
                  setSortField("full_name");
                  setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                }}
                className={`px-2 py-1 rounded text-sm ${
                  sortField === "full_name"
                    ? "bg-primary-50 text-primary-700"
                    : "bg-gray-50 text-gray-700"
                }`}
                aria-label="Sort by name"
              >
                Name{" "}
                {sortField === "full_name" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </button>

              <button
                onClick={() => {
                  setSortField("balance");
                  setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                }}
                className={`px-2 py-1 rounded text-sm ${
                  sortField === "balance"
                    ? "bg-primary-50 text-primary-700"
                    : "bg-gray-50 text-gray-700"
                }`}
                aria-label="Sort by balance"
              >
                Balance{" "}
                {sortField === "balance" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </button>

              <button
                onClick={() => {
                  setSortField("created_at");
                  setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                }}
                className={`px-2 py-1 rounded text-sm ${
                  sortField === "created_at"
                    ? "bg-primary-50 text-primary-700"
                    : "bg-gray-50 text-gray-700"
                }`}
                aria-label="Sort by date"
              >
                Date{" "}
                {sortField === "created_at" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-3 text-left">
                  <div className="flex items-center">
                    <button
                      onClick={toggleAllSelection}
                      className="text-gray-500 hover:text-primary-600 focus:outline-none"
                      aria-label={
                        selectedUsers.length === filteredUsers.length
                          ? "Deselect all"
                          : "Select all"
                      }
                    >
                      {selectedUsers.length === filteredUsers.length &&
                      filteredUsers.length > 0 ? (
                        <CheckSquare size={18} className="text-primary-600" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  User
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Email
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Balance
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Joined
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
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
                    colSpan={7}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    <div className="flex justify-center items-center">
                      <RefreshCw size={20} className="animate-spin mr-2" />
                      Loading users...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No users found matching your filters
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-gray-50 ${
                      selectedUsers.includes(user.id) ? "bg-primary-50" : ""
                    }`}
                  >
                    <td className="px-3 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleUserSelection(user.id)}
                        className="text-gray-500 hover:text-primary-600 focus:outline-none"
                        aria-label={
                          selectedUsers.includes(user.id)
                            ? "Deselect user"
                            : "Select user"
                        }
                      >
                        {selectedUsers.includes(user.id) ? (
                          <CheckSquare size={18} className="text-primary-600" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <User size={18} className="text-gray-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.full_name || "Unknown"}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {user.id.substring(0, 8).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        D
                        {user.accounts &&
                        user.accounts[0] &&
                        typeof user.accounts[0].balance !== "undefined"
                          ? parseFloat(user.accounts[0].balance).toFixed(2)
                          : "0.00"}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.is_admin
                            ? "bg-purple-100 text-purple-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {user.is_admin ? "Admin" : "Active"}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setNewBalance(
                            user.accounts?.[0]?.balance?.toString() || "0"
                          );
                          setTransactionAmount("");
                          setTransactionDescription("");
                          setIsModalOpen(true);
                        }}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                        aria-label={`Edit user ${user.full_name || user.email}`}
                      >
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredUsers.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 sm:px-6 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button className="btn bg-white text-gray-700">Previous</button>
              <button className="btn bg-white text-gray-700">Next</button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">1</span> to{" "}
                  <span className="font-medium">{filteredUsers.length}</span> of{" "}
                  <span className="font-medium">{filteredUsers.length}</span>{" "}
                  users
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">
                  Pagination will be implemented in future updates
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">
                Manage User Account
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                  <User size={18} className="text-gray-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {selectedUser.full_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {selectedUser.email}
                  </div>
                </div>
              </div>

              <div className="mb-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Current Balance:
                  </span>
                  <span className="font-medium text-gray-900">
                    D
                    {selectedUser.accounts &&
                    selectedUser.accounts[0] &&
                    typeof selectedUser.accounts[0].balance !== "undefined"
                      ? parseFloat(selectedUser.accounts[0].balance).toFixed(2)
                      : "0.00"}
                  </span>
                </div>
              </div>

              <div className="border-b border-gray-200 mb-4">
                <div className="-mb-px flex space-x-4">
                  <button
                    onClick={() => setTransactionType("deposit")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      transactionType === "deposit"
                        ? "border-primary-500 text-primary-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Add Deposit
                  </button>
                  <button
                    onClick={() => setTransactionType("withdrawal")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      transactionType === "withdrawal"
                        ? "border-primary-500 text-primary-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Add Withdrawal
                  </button>
                  <button
                    onClick={() => setTransactionType("balance")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      transactionType === "balance"
                        ? "border-primary-500 text-primary-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Set Balance
                  </button>
                </div>
              </div>

              {transactionType === "balance" ? (
                <form onSubmit={handleUpdateBalance}>
                  <div className="form-group">
                    <label htmlFor="newBalance" className="form-label">
                      New Balance
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">D</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        id="newBalance"
                        className="input pl-8"
                        placeholder="0.00"
                        value={newBalance}
                        onChange={(e) => setNewBalance(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary flex items-center"
                    >
                      <Check size={16} className="mr-1" />
                      Update Balance
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleAddTransaction}>
                  <div className="form-group">
                    <label htmlFor="amount" className="form-label">
                      {transactionType === "deposit" ? "Deposit" : "Withdrawal"}{" "}
                      Amount
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">D</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        id="amount"
                        min="0.01"
                        className="input pl-8"
                        placeholder="0.00"
                        value={transactionAmount}
                        onChange={(e) => setTransactionAmount(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="description" className="form-label">
                      Description
                    </label>
                    <input
                      type="text"
                      id="description"
                      className="input"
                      placeholder={`${
                        transactionType === "deposit" ? "Deposit" : "Withdrawal"
                      } description`}
                      value={transactionDescription}
                      onChange={(e) =>
                        setTransactionDescription(e.target.value)
                      }
                      required
                    />
                  </div>

                  {transactionType === "withdrawal" &&
                    parseFloat(transactionAmount) >
                      (selectedUser.accounts?.[0]?.balance || 0) && (
                      <div className="mt-3 flex items-start bg-red-50 p-3 rounded-md">
                        <AlertTriangle
                          size={16}
                          className="text-red-600 flex-shrink-0 mt-0.5 mr-2"
                        />
                        <p className="text-sm text-red-600">
                          Insufficient funds for this withdrawal. Current
                          balance is D
                          {selectedUser.accounts &&
                          selectedUser.accounts[0] &&
                          typeof selectedUser.accounts[0].balance !==
                            "undefined"
                            ? parseFloat(
                                selectedUser.accounts[0].balance
                              ).toFixed(2)
                            : "0.00"}
                          .
                        </p>
                      </div>
                    )}

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary flex items-center"
                      disabled={
                        transactionType === "withdrawal" &&
                        parseFloat(transactionAmount) >
                          (selectedUser.accounts?.[0]?.balance || 0)
                      }
                    >
                      <Plus size={16} className="mr-1" />
                      Add{" "}
                      {transactionType === "deposit" ? "Deposit" : "Withdrawal"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
