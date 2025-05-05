import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  getAllUsers,
  updateAccountBalance,
  addTransaction,
  resendWelcomeEmail,
  deleteUsers,
  createUser,
  bulkImportUsers,
  bulkAddTransactions,
} from "../../lib/supabase";
import {
  Search,
  UserPlus,
  Upload,
  RefreshCw,
  Download,
  X,
  Check,
  Plus,
  User,
  Edit,
  AlertTriangle,
  Mail,
  CreditCard,
  DollarSign,
  Square,
  CheckSquare,
  FileUp,
} from "lucide-react";
import { toast } from "react-hot-toast";
import BulkTransactionModal from "../../components/ui/BulkTransactionModal";

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

  // Get auth context at the component level, not inside functions
  const { user: currentUser } = useAuth();

  // New user form state
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserInitialBalance, setNewUserInitialBalance] = useState("");
  const [newUserRole, setNewUserRole] = useState("regular");
  const [newUserStatus, setNewUserStatus] = useState("active");
  const [tempPassword, setTempPassword] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Bulk import state variables
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [bulkImportTab, setBulkImportTab] = useState<"upload" | "paste">(
    "upload"
  );
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [bulkImportText, setBulkImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const [parsedUsers, setParsedUsers] = useState<
    Array<{
      rowId: number;
      data: {
        full_name?: string;
        email?: string;
        initial_balance?: number;
        role?: string;
        status?: string;
      };
      isValid: boolean;
      errors: string[];
      include: boolean;
    }>
  >([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Confirmation and results state variables
  const [isConfirmationMode, setIsConfirmationMode] = useState(false);
  const [sendWelcomeEmails, setSendWelcomeEmails] = useState(true);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    failedRecords: Array<{
      email: string;
      reason: string;
    }>;
    completed: boolean;
  }>({
    success: 0,
    failed: 0,
    failedRecords: [],
    completed: false,
  });
  const [importProgress, setImportProgress] = useState(0);

  // Add this new state for the bulk transactions modal
  const [isBulkTransactionModalOpen, setIsBulkTransactionModalOpen] =
    useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      let filtered = [...users];

      filtered = filtered.filter(
        (user) =>
          user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );

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
      } else if (action === "delete") {
        const confirmed = window.confirm(
          `Are you sure you want to delete ${selectedUsers.length} selected users? This action cannot be undone.`
        );
        if (!confirmed) return;

        await deleteUsers(selectedUsers);
        toast.success(`Deleted ${selectedUsers.length} users`);
        setSelectedUsers([]);
        fetchUsers();
      }
    } catch (error) {
      console.error(`Error in bulk action ${action}:`, error);
      toast.error("Operation failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUserFullName || !newUserEmail) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreatingUser(true);

    try {
      const newUser = {
        full_name: newUserFullName,
        email: newUserEmail,
        initial_balance: parseFloat(newUserInitialBalance) || 0,
        role: newUserRole,
        status: newUserStatus,
      };

      const { tempPassword } = await createUser(newUser);

      setTempPassword(tempPassword);
      setEmailSent(true);
      toast.success("User created successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Failed to create user");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleResendWelcomeEmail = async () => {
    try {
      await resendWelcomeEmail(newUserEmail);
      toast.success("Welcome email resent successfully");
    } catch (error) {
      console.error("Error resending welcome email:", error);
      toast.error("Failed to resend welcome email");
    }
  };

  const handleDownloadTemplate = () => {
    // Create CSV headers and sample data
    const headers =
      "Full Name,Email Address,Initial Balance,User Role,Account Status";
    const sampleRow = "John Doe,john.doe@example.com,5000,regular,active";
    const templateContent = `${headers}\n${sampleRow}`;

    // Create a blob and download link
    const blob = new Blob([templateContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "user-import-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Template downloaded successfully");
  };

  const handleProcessFile = async (file: File) => {
    setIsProcessingFile(true);
    setFileError("");

    try {
      // Check file type
      const fileType = file.name.split(".").pop()?.toLowerCase();
      if (!["csv", "xlsx", "xls"].includes(fileType || "")) {
        setFileError("Invalid file format. Please upload a CSV or Excel file.");
        setBulkImportFile(null);
        return;
      }

      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setFileError("File is too large. Maximum size is 5MB.");
        setBulkImportFile(null);
        return;
      }

      // Read file content as text
      const fileContent = await file.text();

      // Process the CSV data
      const processedUsers = parseCSVData(fileContent);
      setParsedUsers(processedUsers);

      // Switch to preview mode
      setIsPreviewMode(true);
    } catch (error) {
      console.error("Error processing file:", error);
      setFileError(
        "Failed to process file. Please check the format and try again."
      );
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleProcessPastedData = () => {
    if (!bulkImportText.trim()) {
      return;
    }

    try {
      // Process the pasted CSV data
      const processedUsers = parseCSVData(bulkImportText);
      setParsedUsers(processedUsers);

      // Switch to preview mode
      setIsPreviewMode(true);
    } catch (error) {
      console.error("Error processing pasted data:", error);
      toast.error(
        "Failed to process data. Please check the format and try again."
      );
    }
  };

  // Parse and validate CSV data
  const parseCSVData = (csvText: string) => {
    const lines = csvText.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      throw new Error("CSV must have a header row and at least one data row");
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const nameIndex = headers.findIndex((h) => h.includes("name"));
    const emailIndex = headers.findIndex((h) => h.includes("email"));
    const balanceIndex = headers.findIndex((h) => h.includes("balance"));
    const roleIndex = headers.findIndex((h) => h.includes("role"));
    const statusIndex = headers.findIndex((h) => h.includes("status"));

    // Email list for duplicate checking
    const existingEmails = new Set(users.map((u) => u.email.toLowerCase()));
    const emailsInFile = new Set<string>();

    // Process each row
    return lines.slice(1).map((line, idx) => {
      const values = line.split(",").map((v) => v.trim());
      const errors: string[] = [];

      // Extract values with validation
      const name = nameIndex >= 0 ? values[nameIndex] : "";
      const email = emailIndex >= 0 ? values[emailIndex] : "";
      const balanceStr = balanceIndex >= 0 ? values[balanceIndex] : "0";
      const role =
        roleIndex >= 0 ? values[roleIndex]?.toLowerCase() : "regular";
      const status =
        statusIndex >= 0 ? values[statusIndex]?.toLowerCase() : "active";

      // Validate required fields
      if (!name) {
        errors.push("Name is required");
      }

      if (!email) {
        errors.push("Email is required");
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        // Basic email format validation
        errors.push("Invalid email format");
      } else {
        // Check for duplicates within the file
        if (emailsInFile.has(email.toLowerCase())) {
          errors.push("Duplicate email in import file");
        } else {
          emailsInFile.add(email.toLowerCase());
        }

        // Check for duplicates with existing users
        if (existingEmails.has(email.toLowerCase())) {
          errors.push("Email already exists in the system");
        }
      }

      // Validate balance
      let balance = 0;
      if (balanceStr) {
        const parsedBalance = parseFloat(balanceStr);
        if (isNaN(parsedBalance) || parsedBalance < 0) {
          errors.push("Balance must be a positive number");
        } else {
          balance = parsedBalance;
        }
      }

      // Validate role
      if (role && !["regular", "admin"].includes(role)) {
        errors.push("Role must be 'regular' or 'admin'");
      }

      // Validate status
      if (status && !["active", "inactive"].includes(status)) {
        errors.push("Status must be 'active' or 'inactive'");
      }

      return {
        rowId: idx,
        data: {
          full_name: name,
          email,
          initial_balance: balance,
          role: role || "regular",
          status: status || "active",
        },
        isValid: errors.length === 0,
        errors,
        include: errors.length === 0, // Only include valid records by default
      };
    });
  };

  const handleBulkImport = async () => {
    // Get only valid and included users
    const usersToImport = parsedUsers
      .filter((user) => user.isValid && user.include)
      .map((user) => user.data);

    if (usersToImport.length === 0) {
      toast.error("No valid users selected for import");
      return;
    }

    // Show confirmation dialog instead of immediately importing
    setIsConfirmationMode(true);
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    setImportProgress(0);

    // Get only valid and included users
    const usersToImport = parsedUsers
      .filter((user) => user.isValid && user.include)
      .map((user) => user.data);

    try {
      // Reset results
      setImportResults({
        success: 0,
        failed: 0,
        failedRecords: [],
        completed: false,
      });

      // Get the original file name if available
      const fileName = bulkImportFile ? bulkImportFile.name : "Manual Import";

      // Use the bulkImportUsers function with progress tracking
      const importResult = await bulkImportUsers({
        users: usersToImport,
        importedBy: currentUser.id,
        sendEmails: sendWelcomeEmails,
        fileName,
      });

      // Update progress during import (simulated with intervals)
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => {
          const newProgress = prev + 5;
          if (newProgress >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return newProgress;
        });
      }, 200);

      // Final progress update
      setTimeout(() => {
        clearInterval(progressInterval);
        setImportProgress(100);

        // Update results in state
        setImportResults({
          success: importResult.success,
          failed: importResult.failed + importResult.skipped,
          failedRecords: importResult.failedList.map((item) => ({
            email: item.email,
            reason: item.reason,
          })),
          completed: true,
        });

        // In production, refresh the users list if at least one user was created
        if (importResult.success > 0) {
          fetchUsers();
        }
      }, 1000);
    } catch (error) {
      console.error("Error during bulk import:", error);
      toast.error("An unexpected error occurred during import");

      setImportResults({
        success: 0,
        failed: usersToImport.length,
        failedRecords: [
          {
            email: "all",
            reason:
              error instanceof Error
                ? error.message
                : "Network or server error",
          },
        ],
        completed: true,
      });
    } finally {
      setIsImporting(false);
      setIsConfirmationMode(false);
    }
  };

  const handleRetryFailedImports = () => {
    // Filter parsedUsers to keep only the failed ones
    const failedEmails = new Set(
      importResults.failedRecords.map((r) => r.email.toLowerCase())
    );

    setParsedUsers((prev) =>
      prev.map((user) => {
        if (
          user.data.email &&
          failedEmails.has(user.data.email.toLowerCase())
        ) {
          return { ...user, include: true };
        }
        return { ...user, include: false };
      })
    );

    // Reset results and go back to preview mode
    setImportResults({
      success: 0,
      failed: 0,
      failedRecords: [],
      completed: false,
    });
  };

  const downloadErrorReport = () => {
    // Create CSV content
    const headers = "Row,Email,Error";
    const rows = importResults.failedRecords.map(
      (record, index) => `${index + 1},${record.email},"${record.reason}"`
    );

    const csvContent = [headers, ...rows].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `import-errors-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Error report downloaded");
  };

  const toggleRowSelection = (rowId: number) => {
    setParsedUsers((prev) =>
      prev.map((user) =>
        user.rowId === rowId ? { ...user, include: !user.include } : user
      )
    );
  };

  const toggleAllRows = () => {
    const allSelected = parsedUsers.every((user) => user.include);
    setParsedUsers((prev) =>
      prev.map((user) => ({ ...user, include: !allSelected && user.isValid }))
    );
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
            onClick={() => setIsNewUserModalOpen(true)}
            className="btn btn-primary flex items-center"
          >
            <UserPlus size={16} className="mr-2" />
            New User
          </button>

          <button
            onClick={() => setIsBulkImportModalOpen(true)}
            className="btn bg-green-600 hover:bg-green-700 text-white flex items-center"
          >
            <Upload size={16} className="mr-2" />
            Bulk Import
          </button>

          {/* Add new button for bulk transactions */}
          <button
            onClick={() => setIsBulkTransactionModalOpen(true)}
            className="btn bg-blue-600 hover:bg-blue-700 text-white flex items-center"
          >
            <DollarSign size={16} className="mr-2" />
            Bulk Transactions
          </button>

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

          <button
            onClick={() => handleBulkAction("delete")}
            disabled={selectedUsers.length === 0}
            className={`btn flex items-center ${
              selectedUsers.length > 0
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            <X size={16} className="mr-2" />
            Delete Selected
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

      {/* Add New User Modal */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">
                Add New User
              </h3>
              <button
                onClick={() => {
                  setIsNewUserModalOpen(false);
                  setEmailSent(false);
                  setTempPassword("");
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            {!emailSent ? (
              <form onSubmit={handleCreateUser}>
                <div className="px-6 py-4 space-y-4">
                  <div>
                    <label
                      htmlFor="newUserFullName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="newUserFullName"
                      value={newUserFullName}
                      onChange={(e) => setNewUserFullName(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="newUserEmail"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="newUserEmail"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="john@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="newUserInitialBalance"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Initial Balance (D)
                    </label>
                    <input
                      type="number"
                      id="newUserInitialBalance"
                      value={newUserInitialBalance}
                      onChange={(e) => setNewUserInitialBalance(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="0.00"
                      min="0"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="newUserRole"
                        className="block text-sm font-medium text-gray-700"
                      >
                        User Role
                      </label>
                      <select
                        id="newUserRole"
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="regular">Regular User</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="newUserStatus"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Status
                      </label>
                      <select
                        id="newUserStatus"
                        value={newUserStatus}
                        onChange={(e) => setNewUserStatus(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 text-right">
                  <button
                    type="button"
                    onClick={() => setIsNewUserModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 mr-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingUser}
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    {isCreatingUser ? (
                      <>
                        <RefreshCw size={16} className="animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      "Create User"
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="px-6 py-4">
                <div className="text-center mb-4">
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Check size={24} className="text-green-600" />
                  </div>
                  <h3 className="mt-3 text-lg font-medium text-gray-900">
                    User Created Successfully
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    A welcome email has been sent to {newUserEmail} with login
                    instructions.
                  </p>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Temporary Password:
                    </span>
                    <span className="text-xs text-gray-500">
                      For your records only
                    </span>
                  </div>
                  <div className="bg-white p-2 border border-gray-300 rounded flex items-center justify-between">
                    <span className="font-mono text-sm">{tempPassword}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(tempPassword);
                        toast.success("Password copied to clipboard");
                      }}
                      className="text-gray-500 hover:text-gray-700"
                      aria-label="Copy password"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    onClick={handleResendWelcomeEmail}
                    className="w-full inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-primary-600 bg-transparent border border-primary-600 rounded-md hover:bg-primary-50"
                  >
                    <Mail size={16} className="mr-2" />
                    Resend Welcome Email
                  </button>
                </div>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => {
                      setIsNewUserModalOpen(false);
                      setEmailSent(false);
                      setNewUserFullName("");
                      setNewUserEmail("");
                      setNewUserInitialBalance("");
                      setNewUserRole("regular");
                      setNewUserStatus("active");
                      setTempPassword("");
                    }}
                    className="text-sm font-medium text-primary-600 hover:text-primary-500"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isBulkImportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <h3 className="text-lg font-medium text-gray-900">
                Bulk Import Users
              </h3>
              <button
                onClick={() => {
                  setIsBulkImportModalOpen(false);
                  setBulkImportTab("upload");
                  setBulkImportFile(null);
                  setBulkImportText("");
                  setIsPreviewMode(false);
                  setParsedUsers([]);
                  setIsConfirmationMode(false);
                  setImportProgress(0);
                  setImportResults({
                    success: 0,
                    failed: 0,
                    failedRecords: [],
                    completed: false,
                  });
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-4 flex-grow">
              {/* Confirmation Step */}
              {isConfirmationMode && !importResults.completed ? (
                <div className="confirmation-step">
                  <div className="mb-8 text-center">
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <Upload size={24} className="text-blue-600" />
                    </div>
                    <h3 className="text-xl font-medium text-gray-900">
                      Confirm Import
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">
                      You are about to import{" "}
                      {parsedUsers.filter((u) => u.isValid && u.include).length}{" "}
                      users. Please confirm the details below before proceeding.
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-md p-4 mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Records to import:
                      </span>
                      <span className="text-sm font-medium text-blue-800">
                        {
                          parsedUsers.filter((u) => u.isValid && u.include)
                            .length
                        }{" "}
                        user(s)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Invalid records (skipped):
                      </span>
                      <span className="text-sm font-medium text-red-600">
                        {parsedUsers.filter((u) => !u.isValid).length} record(s)
                      </span>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-md p-4 mb-6">
                    <div className="flex items-center mb-4">
                      <input
                        type="checkbox"
                        id="sendWelcomeEmails"
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        checked={sendWelcomeEmails}
                        onChange={() =>
                          setSendWelcomeEmails(!sendWelcomeEmails)
                        }
                      />
                      <label
                        htmlFor="sendWelcomeEmails"
                        className="ml-2 text-sm text-gray-700"
                      >
                        Send welcome emails to all new users
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">
                      Each user will receive a welcome email containing their
                      login credentials and instructions to set up their
                      password.
                    </p>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      className="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
                      onClick={() => setIsConfirmationMode(false)}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="btn bg-green-600 text-white hover:bg-green-700 flex items-center"
                      onClick={handleConfirmImport}
                      disabled={isImporting}
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw size={16} className="animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Check size={16} className="mr-2" />
                          Confirm Import
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : importResults.completed ? (
                <div className="results-summary">
                  <div className="mb-8 text-center">
                    {importResults.failed === 0 ? (
                      <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <Check size={24} className="text-green-600" />
                      </div>
                    ) : importResults.success === 0 ? (
                      <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <X size={24} className="text-red-600" />
                      </div>
                    ) : (
                      <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle size={24} className="text-yellow-600" />
                      </div>
                    )}

                    <h3 className="text-xl font-medium text-gray-900">
                      {importResults.failed === 0
                        ? "Import Completed Successfully"
                        : importResults.success === 0
                        ? "Import Failed"
                        : "Import Completed with Issues"}
                    </h3>
                  </div>

                  <div className="bg-gray-50 rounded-md p-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 border border-green-100 rounded-md">
                        <div className="font-medium text-green-800 mb-1">
                          Successful
                        </div>
                        <div className="text-2xl font-bold text-green-700">
                          {importResults.success}
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          users created
                        </div>
                      </div>

                      <div className="p-4 bg-red-50 border border-red-100 rounded-md">
                        <div className="font-medium text-red-800 mb-1">
                          Failed
                        </div>
                        <div className="text-2xl font-bold text-red-700">
                          {importResults.failed}
                        </div>
                        <div className="text-xs text-red-600 mt-1">
                          records skipped
                        </div>
                      </div>
                    </div>
                  </div>

                  {importResults.failed > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Failed Records
                      </h4>
                      <div className="border border-gray-200 rounded-md overflow-hidden">
                        <div className="max-h-40 overflow-y-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th
                                  scope="col"
                                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Email
                                </th>
                                <th
                                  scope="col"
                                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Reason
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {importResults.failedRecords.map(
                                (record, idx) => (
                                  <tr key={idx}>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                      {record.email}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-red-600">
                                      {record.reason}
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="mt-4 flex space-x-4">
                        <button
                          onClick={downloadErrorReport}
                          className="text-sm text-primary-600 flex items-center hover:text-primary-800"
                        >
                          <Download size={16} className="mr-1" />
                          Download Error Report
                        </button>

                        <button
                          onClick={handleRetryFailedImports}
                          className="text-sm text-primary-600 flex items-center hover:text-primary-800"
                        >
                          <RefreshCw size={16} className="mr-1" />
                          Retry Failed Imports
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      className="btn bg-primary-600 text-white hover:bg-primary-700"
                      onClick={() => {
                        setIsBulkImportModalOpen(false);
                        setBulkImportTab("upload");
                        setBulkImportFile(null);
                        setBulkImportText("");
                        setIsPreviewMode(false);
                        setParsedUsers([]);
                        setIsConfirmationMode(false);
                        setImportProgress(0);
                        setImportResults({
                          success: 0,
                          failed: 0,
                          failedRecords: [],
                          completed: false,
                        });
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Existing tabs and content */}
                  {/* Tabs */}
                  <div className="border-b border-gray-200 mb-6">
                    <div className="-mb-px flex space-x-8">
                      <button
                        onClick={() => setBulkImportTab("upload")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          bulkImportTab === "upload"
                            ? "border-primary-500 text-primary-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        Upload File
                      </button>
                      <button
                        onClick={() => setBulkImportTab("paste")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          bulkImportTab === "paste"
                            ? "border-primary-500 text-primary-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        Paste Data
                      </button>
                    </div>
                  </div>

                  {/* Template Link */}
                  <div className="mb-6 bg-blue-50 p-4 rounded-md flex items-start">
                    <div className="flex-shrink-0">
                      <Download size={18} className="text-blue-500 mt-0.5" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Download Template
                      </h3>
                      <div className="mt-1 text-sm text-blue-700">
                        <p>
                          Use our template to ensure your data is correctly
                          formatted.
                          <button
                            onClick={handleDownloadTemplate}
                            className="ml-1 text-blue-600 underline hover:text-blue-800 focus:outline-none"
                          >
                            Download CSV Template
                          </button>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tab Content */}
                  {!isPreviewMode ? (
                    <>
                      {bulkImportTab === "upload" ? (
                        <div>
                          <div
                            className={`border-2 ${
                              isDragging
                                ? "border-primary-400 bg-primary-50"
                                : bulkImportFile
                                ? "border-green-400 bg-green-50"
                                : "border-dashed border-gray-300"
                            } rounded-md px-6 pt-5 pb-6 flex flex-col items-center justify-center transition-colors ${
                              bulkImportFile ? "py-3" : "py-6"
                            }`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDragging(true);
                            }}
                            onDragEnter={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDragging(true);
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDragging(false);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDragging(false);

                              const files = e.dataTransfer.files;
                              if (files && files.length > 0) {
                                const file = files[0];
                                const fileType = file.name
                                  .split(".")
                                  .pop()
                                  ?.toLowerCase();

                                if (
                                  ["csv", "xlsx", "xls"].includes(
                                    fileType || ""
                                  )
                                ) {
                                  setFileError("");
                                  setBulkImportFile(file);
                                  handleProcessFile(file);
                                } else {
                                  setFileError(
                                    "Invalid file format. Please upload a CSV or Excel file."
                                  );
                                  setBulkImportFile(null);
                                }
                              }
                            }}
                          >
                            <div className="space-y-2 text-center">
                              {bulkImportFile ? (
                                <div className="flex items-center space-x-2">
                                  <Check size={20} className="text-green-500" />
                                  <span className="text-sm font-medium text-gray-900">
                                    {bulkImportFile.name}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setBulkImportFile(null);
                                      setFileError("");
                                      setParsedUsers([]);
                                    }}
                                    className="text-gray-500 hover:text-red-500"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="mx-auto h-12 w-12 text-gray-400">
                                    <FileUp
                                      size={48}
                                      className="text-gray-400"
                                    />
                                  </div>
                                  <div className="flex text-sm text-gray-600">
                                    <label
                                      htmlFor="file-upload"
                                      className="relative cursor-pointer rounded-md bg-white font-medium text-primary-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 hover:text-primary-500"
                                    >
                                      <span>Upload a file</span>
                                      <input
                                        id="file-upload"
                                        name="file-upload"
                                        type="file"
                                        className="sr-only"
                                        accept=".csv,.xlsx,.xls"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            setBulkImportFile(file);
                                            handleProcessFile(file);
                                          }
                                        }}
                                      />
                                    </label>
                                    <p className="pl-1">or drag and drop</p>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    CSV or Excel files up to 5MB
                                  </p>
                                </>
                              )}

                              {isProcessingFile && (
                                <div className="mt-2 flex items-center justify-center">
                                  <RefreshCw
                                    size={16}
                                    className="animate-spin mr-2 text-primary-600"
                                  />
                                  <span className="text-sm text-primary-600">
                                    Processing file...
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {fileError && (
                            <div className="mt-2 text-sm text-red-600">
                              {fileError}
                            </div>
                          )}

                          <p className="mt-3 text-xs text-gray-500">
                            The file should have headers matching the template
                            format. Make sure all required fields are filled.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <textarea
                            className="w-full h-64 border border-gray-300 rounded-md p-3 mb-2 font-mono text-sm"
                            placeholder="Paste CSV data here... 
Example:
Full Name,Email Address,Initial Balance,User Role,Account Status
John Doe,john.doe@example.com,5000,regular,active"
                            value={bulkImportText}
                            onChange={(e) => setBulkImportText(e.target.value)}
                          ></textarea>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              className="btn bg-primary-600 text-white hover:bg-primary-700 flex items-center"
                              onClick={handleProcessPastedData}
                              disabled={
                                !bulkImportText.trim() || isProcessingFile
                              }
                            >
                              {isProcessingFile ? (
                                <>
                                  <RefreshCw
                                    size={16}
                                    className="animate-spin mr-2"
                                  />
                                  Processing...
                                </>
                              ) : (
                                <>Process Data</>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="data-preview">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">
                          Data Preview
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">
                            {parsedUsers.filter((u) => u.isValid).length} valid
                            / {parsedUsers.length} total
                          </span>
                        </div>
                      </div>

                      <div
                        className="border border-gray-200 rounded-md overflow-hidden mb-4"
                        style={{ maxHeight: "50vh" }}
                      >
                        <div className="overflow-y-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                              <tr>
                                <th
                                  scope="col"
                                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"
                                >
                                  <div className="flex items-center">
                                    <button
                                      onClick={toggleAllRows}
                                      className="text-gray-500 hover:text-primary-600 focus:outline-none"
                                      title={
                                        parsedUsers.every((u) => u.include)
                                          ? "Deselect all"
                                          : "Select all valid"
                                      }
                                    >
                                      {parsedUsers.every((u) => u.include) ? (
                                        <CheckSquare
                                          size={16}
                                          className="text-primary-600"
                                        />
                                      ) : (
                                        <Square size={16} />
                                      )}
                                    </button>
                                  </div>
                                </th>
                                <th
                                  scope="col"
                                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Name
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
                                  Role
                                </th>
                                <th
                                  scope="col"
                                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Status
                                </th>
                                <th
                                  scope="col"
                                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  Validation
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {parsedUsers.map((user) => (
                                <tr
                                  key={user.rowId}
                                  className={
                                    !user.isValid
                                      ? "bg-red-50"
                                      : user.include
                                      ? "bg-green-50"
                                      : ""
                                  }
                                >
                                  <td className="px-3 py-4 whitespace-nowrap">
                                    <button
                                      disabled={!user.isValid}
                                      onClick={() =>
                                        toggleRowSelection(user.rowId)
                                      }
                                      className={`text-gray-500 ${
                                        user.isValid
                                          ? "hover:text-primary-600 focus:outline-none"
                                          : "opacity-50 cursor-not-allowed"
                                      }`}
                                      title={
                                        user.include
                                          ? "Remove from import"
                                          : "Include in import"
                                      }
                                    >
                                      {user.include ? (
                                        <CheckSquare
                                          size={16}
                                          className="text-primary-600"
                                        />
                                      ) : (
                                        <Square size={16} />
                                      )}
                                    </button>
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {user.data.full_name || (
                                      <span className="italic text-red-500">
                                        Missing
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {user.data.email || (
                                      <span className="italic text-red-500">
                                        Missing
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                    D{user.data.initial_balance}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm">
                                    <span
                                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        user.data.role === "admin"
                                          ? "bg-purple-100 text-purple-800"
                                          : "bg-blue-100 text-blue-800"
                                      }`}
                                    >
                                      {user.data.role || "regular"}
                                    </span>
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm">
                                    <span
                                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        user.data.status === "active"
                                          ? "bg-green-100 text-green-800"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {user.data.status || "active"}
                                    </span>
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm">
                                    {user.isValid ? (
                                      <span className="text-green-600 flex items-center">
                                        <Check size={16} className="mr-1" />{" "}
                                        Valid
                                      </span>
                                    ) : (
                                      <div className="text-red-600">
                                        <span className="flex items-center">
                                          <X size={16} className="mr-1" />{" "}
                                          Invalid
                                        </span>
                                        <div className="mt-1 text-xs">
                                          {user.errors.map((error, idx) => (
                                            <div
                                              key={idx}
                                              className="text-red-500"
                                            >
                                              • {error}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                              {parsedUsers.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={7}
                                    className="px-3 py-4 text-center text-sm text-gray-500"
                                  >
                                    No data to preview
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Scroll indicator when content is scrollable */}
                      <div className="text-center mb-4 text-xs text-gray-500">
                        <span>Scroll to see more records</span>
                        <div className="mt-1">
                          <svg
                            className="h-4 w-4 mx-auto text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">
                            {parsedUsers.filter((u) => u.isValid).length}
                          </span>{" "}
                          valid records,{" "}
                          <span className="font-medium">
                            {parsedUsers.filter((u) => !u.isValid).length}
                          </span>{" "}
                          invalid records
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Fixed footer with action buttons */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  {isPreviewMode && (
                    <button
                      onClick={() => {
                        setIsPreviewMode(false);
                        setParsedUsers([]);
                      }}
                      className="btn bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Back
                    </button>
                  )}
                </div>

                <div className="space-x-3 flex items-center">
                  {isPreviewMode && (
                    <div className="text-sm mr-3">
                      <span className="text-green-600 font-medium">
                        {
                          parsedUsers.filter((u) => u.isValid && u.include)
                            .length
                        }
                      </span>{" "}
                      users will be imported
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
                    onClick={() => {
                      setIsBulkImportModalOpen(false);
                      setBulkImportTab("upload");
                      setBulkImportFile(null);
                      setBulkImportText("");
                      setIsPreviewMode(false);
                      setParsedUsers([]);
                      setIsConfirmationMode(false);
                    }}
                  >
                    Cancel
                  </button>

                  {isPreviewMode && (
                    <button
                      type="button"
                      className="btn bg-green-600 text-white hover:bg-green-700 flex items-center"
                      disabled={
                        isImporting ||
                        parsedUsers.filter((u) => u.isValid && u.include)
                          .length === 0
                      }
                      onClick={handleBulkImport}
                    >
                      <Upload size={16} className="mr-2" />
                      Continue to Import
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Progress indicator during import process */}
          {isImporting && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full text-center">
                <RefreshCw
                  size={36}
                  className="mx-auto mb-4 text-primary-600 animate-spin"
                />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Importing Users
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Please wait while we process your request...
                </p>

                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                  <div
                    className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">
                  {importProgress}% complete
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add the BulkTransactionModal component */}
      {isBulkTransactionModalOpen && (
        <BulkTransactionModal
          isOpen={isBulkTransactionModalOpen}
          onClose={() => setIsBulkTransactionModalOpen(false)}
          onTransactionsCompleted={fetchUsers}
          users={users}
        />
      )}
    </div>
  );
}
