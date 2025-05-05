import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  Download,
  RefreshCw,
  Check,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { bulkAddTransactions } from "../../lib/supabase";

interface BulkTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionsCompleted: () => void;
  users: any[];
}

interface ParsedTransaction {
  rowId: number;
  data: {
    user_id: string;
    email?: string;
    amount: number;
    type: "deposit" | "withdrawal";
    description?: string;
  };
  isValid: boolean;
  errors: string[];
  include: boolean;
}

const BulkTransactionModal: React.FC<BulkTransactionModalProps> = ({
  isOpen,
  onClose,
  onTransactionsCompleted,
  users,
}) => {
  const [bulkTransactionTab, setBulkTransactionTab] = useState<
    "upload" | "paste"
  >("upload");
  const [bulkTransactionFile, setBulkTransactionFile] = useState<File | null>(
    null
  );
  const [bulkTransactionText, setBulkTransactionText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isConfirmationMode, setIsConfirmationMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressValue, setProgressValue] = useState(0);

  const [parsedTransactions, setParsedTransactions] = useState<
    ParsedTransaction[]
  >([]);
  const [transactionType, setTransactionType] = useState<
    "deposit" | "withdrawal"
  >("deposit");
  const [results, setResults] = useState<{
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    // Create CSV headers and sample data
    const headers = "Email Address,Amount,Description";
    const sampleRows = [
      "user1@example.com,1000,Initial deposit",
      "user2@example.com,500,Monthly deposit",
      "user3@example.com,250,Bonus payment",
    ].join("\n");
    const templateContent = `${headers}\n${sampleRows}`;

    // Create a blob and download link
    const blob = new Blob([templateContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${transactionType}-template.csv`;
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
        setBulkTransactionFile(null);
        return;
      }

      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setFileError("File is too large. Maximum size is 5MB.");
        setBulkTransactionFile(null);
        return;
      }

      // Read file content as text
      const fileContent = await file.text();

      // Process the CSV data
      const processedTransactions = parseCSVData(fileContent);
      setParsedTransactions(processedTransactions);

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
    if (!bulkTransactionText.trim()) {
      return;
    }

    try {
      // Process the pasted CSV data
      const processedTransactions = parseCSVData(bulkTransactionText);
      setParsedTransactions(processedTransactions);

      // Switch to preview mode
      setIsPreviewMode(true);
    } catch (error) {
      console.error("Error processing pasted data:", error);
      toast.error(
        "Failed to process data. Please check the format and try again."
      );
    }
  };

  const parseCSVData = (csvText: string) => {
    const lines = csvText.split("\n").filter((line) => line.trim());

    if (lines.length < 1) {
      throw new Error("CSV must have at least a header row");
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const emailIndex = headers.findIndex((h) => h.includes("email"));
    const amountIndex = headers.findIndex((h) => h.includes("amount"));
    const descriptionIndex = headers.findIndex(
      (h) => h.includes("description") || h.includes("desc")
    );

    // Map of emails in the system to user IDs for quick lookup
    const emailToUserIdMap = new Map(
      users.map((user) => [user.email.toLowerCase(), user.id])
    );

    // Process each row
    return lines.slice(1).map((line, idx) => {
      const values = line.split(",").map((v) => v.trim());
      const errors: string[] = [];

      // Extract values with validation
      const email = emailIndex >= 0 ? values[emailIndex] : "";
      const amountStr = amountIndex >= 0 ? values[amountIndex] : "";
      const description =
        descriptionIndex >= 0
          ? values[descriptionIndex]
          : `Bulk ${transactionType}`;

      // Validate email and find user_id
      let user_id = "";
      if (!email) {
        errors.push("Email is required");
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push("Invalid email format");
      } else {
        // Check if email exists in the system
        user_id = emailToUserIdMap.get(email.toLowerCase()) || "";
        if (!user_id) {
          errors.push("Email not found in the system");
        }
      }

      // Validate amount
      let amount = 0;
      if (!amountStr) {
        errors.push("Amount is required");
      } else {
        const parsedAmount = parseFloat(amountStr);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          errors.push("Amount must be a positive number");
        } else {
          amount = parsedAmount;
        }
      }

      return {
        rowId: idx,
        data: {
          user_id,
          email,
          amount,
          type: transactionType,
          description: description || `Bulk ${transactionType}`,
        },
        isValid: errors.length === 0,
        errors,
        include: errors.length === 0, // Only include valid records by default
      };
    });
  };

  const handleBulkTransactions = async () => {
    // Show confirmation dialog
    setIsConfirmationMode(true);
  };

  const handleConfirmTransactions = async () => {
    setIsProcessing(true);
    setProgressValue(0);

    // Get only valid and included transactions
    const transactionsToProcess = parsedTransactions
      .filter((tx) => tx.isValid && tx.include)
      .map((tx) => tx.data);

    try {
      // Reset results
      setResults({
        success: 0,
        failed: 0,
        failedRecords: [],
        completed: false,
      });

      // Start progress animation
      const progressInterval = setInterval(() => {
        setProgressValue((prev) => {
          const newProgress = prev + 5;
          if (newProgress >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return newProgress;
        });
      }, 200);

      // Process the transactions
      const importResult = await bulkAddTransactions(transactionsToProcess);

      // Final progress update
      setTimeout(() => {
        clearInterval(progressInterval);
        setProgressValue(100);

        // Update results in state
        setResults({
          success: importResult.success,
          failed: importResult.failed,
          failedRecords: importResult.results
            .filter((r) => !r.success)
            .map((item) => ({
              email: item.transaction.email || "Unknown",
              reason: item.error || "Unknown error",
            })),
          completed: true,
        });

        // Refresh the users list if at least one transaction was successful
        if (importResult.success > 0) {
          onTransactionsCompleted();
        }
      }, 1000);
    } catch (error) {
      console.error("Error during bulk transactions:", error);
      toast.error("An unexpected error occurred during processing");

      setResults({
        success: 0,
        failed: transactionsToProcess.length,
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
      setIsProcessing(false);
      setIsConfirmationMode(false);
    }
  };

  const toggleRowSelection = (rowId: number) => {
    setParsedTransactions((prev) =>
      prev.map((tx) =>
        tx.rowId === rowId ? { ...tx, include: !tx.include } : tx
      )
    );
  };

  const toggleAllRows = () => {
    const allSelected = parsedTransactions.every((tx) => tx.include);
    setParsedTransactions((prev) =>
      prev.map((tx) => ({ ...tx, include: !allSelected && tx.isValid }))
    );
  };

  const resetModal = () => {
    setBulkTransactionTab("upload");
    setBulkTransactionFile(null);
    setBulkTransactionText("");
    setIsPreviewMode(false);
    setParsedTransactions([]);
    setIsConfirmationMode(false);
    setResults({
      success: 0,
      failed: 0,
      failedRecords: [],
      completed: false,
    });
  };

  const handleRetryFailedTransactions = () => {
    // Filter parsedTransactions to keep only the failed ones
    const failedEmails = new Set(
      results.failedRecords.map((r) => r.email.toLowerCase())
    );

    setParsedTransactions((prev) =>
      prev.map((tx) => {
        if (tx.data.email && failedEmails.has(tx.data.email.toLowerCase())) {
          return { ...tx, include: true };
        }
        return { ...tx, include: false };
      })
    );

    // Reset results and go back to preview mode
    setResults({
      success: 0,
      failed: 0,
      failedRecords: [],
      completed: false,
    });
    setIsConfirmationMode(false);
  };

  const downloadErrorReport = () => {
    // Create CSV content
    const headers = "Row,Email,Error";
    const rows = results.failedRecords.map(
      (record, index) => `${index + 1},${record.email},"${record.reason}"`
    );

    const csvContent = [headers, ...rows].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transaction-errors-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Error report downloaded");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <h3 className="text-lg font-medium text-gray-900">
            Bulk {transactionType === "deposit" ? "Deposits" : "Withdrawals"}
          </h3>
          <button
            onClick={() => {
              onClose();
              resetModal();
            }}
            className="text-gray-400 hover:text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 flex-grow">
          {/* Transaction Type Selector */}
          {!isPreviewMode && !isConfirmationMode && !results.completed && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Type
              </label>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setTransactionType("deposit")}
                  className={`px-4 py-2 rounded-md ${
                    transactionType === "deposit"
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  Deposits
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionType("withdrawal")}
                  className={`px-4 py-2 rounded-md ${
                    transactionType === "withdrawal"
                      ? "bg-red-600 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  Withdrawals
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Select whether you're uploading deposits or withdrawals.
              </p>
            </div>
          )}

          {/* Confirmation Step */}
          {isConfirmationMode && !results.completed ? (
            <div className="confirmation-step">
              <div className="mb-8 text-center">
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Upload size={24} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-medium text-gray-900">
                  Confirm{" "}
                  {transactionType === "deposit" ? "Deposits" : "Withdrawals"}
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  You are about to process{" "}
                  {
                    parsedTransactions.filter((t) => t.isValid && t.include)
                      .length
                  }{" "}
                  {transactionType === "deposit" ? "deposits" : "withdrawals"}.
                  Please confirm before proceeding.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-md p-4 mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Transactions to process:
                  </span>
                  <span className="text-sm font-medium text-blue-800">
                    {
                      parsedTransactions.filter((t) => t.isValid && t.include)
                        .length
                    }{" "}
                    {transactionType === "deposit" ? "deposits" : "withdrawals"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Invalid records (skipped):
                  </span>
                  <span className="text-sm font-medium text-red-600">
                    {parsedTransactions.filter((t) => !t.isValid).length}{" "}
                    record(s)
                  </span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-sm font-medium text-gray-700">
                    Total amount:
                  </span>
                  <span className="text-sm font-medium text-blue-800">
                    D
                    {parsedTransactions
                      .filter((t) => t.isValid && t.include)
                      .reduce((sum, t) => sum + t.data.amount, 0)
                      .toFixed(2)}
                  </span>
                </div>
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
                  className={`btn ${
                    transactionType === "deposit"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  } text-white flex items-center`}
                  onClick={handleConfirmTransactions}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={16} className="animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check size={16} className="mr-2" />
                      Confirm{" "}
                      {transactionType === "deposit"
                        ? "Deposits"
                        : "Withdrawals"}
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : results.completed ? (
            <div className="results-summary">
              <div className="mb-8 text-center">
                {results.failed === 0 ? (
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <Check size={24} className="text-green-600" />
                  </div>
                ) : results.success === 0 ? (
                  <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <X size={24} className="text-red-600" />
                  </div>
                ) : (
                  <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle size={24} className="text-yellow-600" />
                  </div>
                )}

                <h3 className="text-xl font-medium text-gray-900">
                  {results.failed === 0
                    ? "Transactions Completed Successfully"
                    : results.success === 0
                    ? "Transactions Failed"
                    : "Transactions Completed with Issues"}
                </h3>
              </div>

              <div className="bg-gray-50 rounded-md p-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 border border-green-100 rounded-md">
                    <div className="font-medium text-green-800 mb-1">
                      Successful
                    </div>
                    <div className="text-2xl font-bold text-green-700">
                      {results.success}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      transactions completed
                    </div>
                  </div>

                  <div className="p-4 bg-red-50 border border-red-100 rounded-md">
                    <div className="font-medium text-red-800 mb-1">Failed</div>
                    <div className="text-2xl font-bold text-red-700">
                      {results.failed}
                    </div>
                    <div className="text-xs text-red-600 mt-1">
                      transactions skipped
                    </div>
                  </div>
                </div>
              </div>

              {results.failed > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Failed Transactions
                  </h4>
                  <div className="border border-gray-200 rounded-md overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Email
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Reason
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {results.failedRecords.map((record, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                {record.email}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-red-600">
                                {record.reason}
                              </td>
                            </tr>
                          ))}
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
                      onClick={handleRetryFailedTransactions}
                      className="text-sm text-primary-600 flex items-center hover:text-primary-800"
                    >
                      <RefreshCw size={16} className="mr-1" />
                      Retry Failed Transactions
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  className="btn bg-primary-600 text-white hover:bg-primary-700"
                  onClick={() => {
                    onClose();
                    resetModal();
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="border-b border-gray-200 mb-6">
                <div className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setBulkTransactionTab("upload")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      bulkTransactionTab === "upload"
                        ? "border-primary-500 text-primary-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    onClick={() => setBulkTransactionTab("paste")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      bulkTransactionTab === "paste"
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
                  {bulkTransactionTab === "upload" ? (
                    <div>
                      <div
                        className={`border-2 ${
                          isDragging
                            ? "border-primary-400 bg-primary-50"
                            : bulkTransactionFile
                            ? "border-green-400 bg-green-50"
                            : "border-dashed border-gray-300"
                        } rounded-md px-6 pt-5 pb-6 flex flex-col items-center justify-center transition-colors ${
                          bulkTransactionFile ? "py-3" : "py-6"
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
                              ["csv", "xlsx", "xls"].includes(fileType || "")
                            ) {
                              setFileError("");
                              setBulkTransactionFile(file);
                              handleProcessFile(file);
                            } else {
                              setFileError(
                                "Invalid file format. Please upload a CSV or Excel file."
                              );
                              setBulkTransactionFile(null);
                            }
                          }
                        }}
                      >
                        {bulkTransactionFile ? (
                          <div className="flex items-center space-x-2">
                            <Check size={20} className="text-green-500" />
                            <span className="text-sm font-medium text-gray-900">
                              {bulkTransactionFile.name}
                            </span>
                            <button
                              onClick={() => {
                                setBulkTransactionFile(null);
                                setFileError("");
                                setParsedTransactions([]);
                              }}
                              className="text-gray-500 hover:text-red-500"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="mx-auto h-12 w-12 text-gray-400">
                              <Upload size={48} className="text-gray-400" />
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
                                  ref={fileInputRef}
                                  accept=".csv,.xlsx,.xls"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setBulkTransactionFile(file);
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
                      </div>

                      {fileError && (
                        <div className="mt-2 text-sm text-red-600">
                          {fileError}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor="pasteData"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Paste CSV data below
                      </label>
                      <textarea
                        id="pasteData"
                        rows={10}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Email Address,Amount,Description
john.doe@example.com,5000,Initial deposit"
                        value={bulkTransactionText}
                        onChange={(e) => setBulkTransactionText(e.target.value)}
                      ></textarea>

                      <div className="flex justify-end mt-4">
                        <button
                          type="button"
                          className="btn bg-primary-600 text-white hover:bg-primary-700 flex items-center"
                          onClick={handleProcessPastedData}
                          disabled={
                            !bulkTransactionText.trim() || isProcessingFile
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
                    <div className="text-sm text-gray-500">
                      {parsedTransactions.filter((t) => t.isValid).length} valid{" "}
                      {transactionType}s of {parsedTransactions.length} total
                    </div>
                  </div>

                  <div
                    className="border border-gray-200 rounded-md overflow-hidden mb-4"
                    style={{ maxHeight: "50vh" }}
                  >
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-3 text-left">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 text-primary-600 rounded border-gray-300"
                                  checked={parsedTransactions
                                    .filter((t) => t.isValid)
                                    .every((t) => t.include)}
                                  onChange={toggleAllRows}
                                />
                              </div>
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Email
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Amount
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Description
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {parsedTransactions.map((tx) => (
                            <tr
                              key={tx.rowId}
                              className={`hover:bg-gray-50 ${
                                !tx.isValid ? "bg-red-50" : ""
                              }`}
                            >
                              <td className="px-3 py-2">
                                {tx.isValid && (
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 text-primary-600 rounded border-gray-300"
                                    checked={tx.include}
                                    onChange={() =>
                                      toggleRowSelection(tx.rowId)
                                    }
                                  />
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {tx.data.email}
                              </td>
                              <td className="px-3 py-2 text-sm font-medium text-gray-900">
                                {tx.isValid ? (
                                  `D${tx.data.amount.toFixed(2)}`
                                ) : (
                                  <span className="text-red-600">
                                    Invalid amount
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-500">
                                {tx.data.description}
                              </td>
                              <td className="px-3 py-2">
                                {tx.isValid ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Valid
                                  </span>
                                ) : (
                                  <div>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      Error
                                    </span>
                                    <div className="text-xs text-red-600 mt-1">
                                      {tx.errors.join(", ")}
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="text-center mb-4 text-xs text-gray-500">
                    {parsedTransactions.length > 10 &&
                      "Scroll to see all records"}
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      className="btn bg-white border border-gray-300 text-gray-700"
                      onClick={() => {
                        setIsPreviewMode(false);
                        setParsedTransactions([]);
                        if (bulkTransactionTab === "upload") {
                          setBulkTransactionFile(null);
                        } else {
                          setBulkTransactionText("");
                        }
                      }}
                    >
                      Start Over
                    </button>

                    <button
                      type="button"
                      className={`btn ${
                        transactionType === "deposit"
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-red-600 hover:bg-red-700"
                      } text-white`}
                      disabled={
                        parsedTransactions.filter((t) => t.isValid && t.include)
                          .length === 0
                      }
                      onClick={handleBulkTransactions}
                    >
                      Process{" "}
                      {
                        parsedTransactions.filter((t) => t.isValid && t.include)
                          .length
                      }{" "}
                      {transactionType}s
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Progress indicator during processing */}
        {isProcessing && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full text-center">
              <RefreshCw
                size={36}
                className="mx-auto mb-4 text-primary-600 animate-spin"
              />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Processing{" "}
                {transactionType === "deposit" ? "Deposits" : "Withdrawals"}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Please wait while we process your request...
              </p>

              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div
                  className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressValue}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">{progressValue}% complete</p>
            </div>
          </div>
        )}

        {/* Fixed footer with action buttons */}
        {!isConfirmationMode && !results.completed && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
            <button
              type="button"
              className="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
              onClick={() => {
                onClose();
                resetModal();
              }}
            >
              Cancel
            </button>

            {isPreviewMode && (
              <div className="space-x-3 flex items-center">
                <div className="text-sm mr-3">
                  {
                    parsedTransactions.filter((t) => t.isValid && t.include)
                      .length
                  }{" "}
                  {transactionType}s will be processed
                </div>
                <button
                  type="button"
                  className={`btn ${
                    transactionType === "deposit"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  } text-white flex items-center`}
                  disabled={
                    parsedTransactions.filter((t) => t.isValid && t.include)
                      .length === 0
                  }
                  onClick={handleBulkTransactions}
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkTransactionModal;
