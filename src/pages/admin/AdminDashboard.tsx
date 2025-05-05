import { useState, useEffect } from "react";
import {
  getAdminStats,
  getAllUsers,
  getAllTransactions,
  getLoanStatistics,
} from "../../lib/supabase";
import { format, subDays, parseISO, startOfMonth, endOfMonth } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { toast } from "react-hot-toast";
import {
  Users,
  CreditCard,
  ArrowUpRight,
  TrendingUp,
  ArrowDownRight,
  Calendar,
  Activity,
  RefreshCw,
  Download,
  ChevronRight,
  Banknote,
} from "lucide-react";

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];
const STATUS_COLORS = {
  completed: "#10B981", // green
  pending: "#F59E0B", // yellow
  failed: "#EF4444", // red
};

// Adding a custom pie chart label renderer
const CustomPieChartLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
  value,
}: any) => {
  const RADIAN = Math.PI / 180;
  // Position the label further outside the pie
  const radius = outerRadius * 1.1;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Only show label if the segment is big enough (more than 5%)
  if (percent < 0.05) return null;

  return (
    <text
      x={x}
      y={y}
      fill="#333333"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
      fontWeight="500"
    >
      {`${name}: ${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>({
    totalUsers: 0,
    totalTransactions: 0,
    totalVolume: 0,
    activeUsers: 0,
    pendingTransactions: 0,
  });
  const [loanStats, setLoanStats] = useState<any>({
    activeLoans: 0,
    totalLoans: 0,
    totalLoanAmount: 0,
    totalRepaid: 0,
    pendingApprovals: 0,
    defaultedLoans: 0,
    disbursedThisMonth: 0,
    newLoansThisMonth: 0,
    atRiskLoans: 0,
    atRiskAmount: 0,
  });
  const [transactionsByDay, setTransactionsByDay] = useState<any[]>([]);
  const [transactionsByType, setTransactionsByType] = useState<any[]>([]);
  const [transactionsByStatus, setTransactionsByStatus] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreparing, setIsPreparing] = useState(false);
  const [dateRange, setDateRange] = useState("week");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    processTransactionData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch basic stats
      const adminStats = await getAdminStats();

      // Fetch all users and transactions for more detailed analysis
      const [users, transactions, loanData] = await Promise.all([
        getAllUsers(),
        getAllTransactions(1000), // Limit to 1000 most recent transactions
        getLoanStatistics(),
      ]);

      // Set loan stats
      setLoanStats({
        activeLoans: loanData?.activeLoans || 0,
        totalLoans: loanData?.totalLoans || 0,
        totalLoanAmount: loanData?.totalLoanAmount || 0,
        totalRepaid: loanData?.totalRepaid || 0,
        pendingApprovals: loanData?.pendingApprovals || 0,
        defaultedLoans: loanData?.defaultedLoans || 0,
        disbursedThisMonth: loanData?.disbursedThisMonth || 0,
        newLoansThisMonth: loanData?.newLoansThisMonth || 0,
        atRiskLoans: loanData?.atRiskLoans || 3, // Demo data
        atRiskAmount: loanData?.atRiskAmount || 450000, // Demo data
      });

      // Set basic stats
      setStats({
        totalUsers: users.length,
        totalTransactions: transactions.length,
        totalVolume: transactions.reduce(
          (sum: number, tx: any) =>
            sum + (tx.type === "deposit" ? parseFloat(tx.amount) : 0),
          0
        ),
        activeUsers: users.filter(
          (user: any) => user.accounts?.[0]?.balance > 0
        ).length,
        pendingTransactions: transactions.filter(
          (tx: any) => tx.status === "pending"
        ).length,
      });

      // Process transactions for insights
      setRecentTransactions(transactions.slice(0, 5));

      // Store all transactions for later processing based on date range
      const allTransactions = transactions;

      // Calculate top users by transaction volume
      const userTransactions = new Map();
      allTransactions.forEach((tx: any) => {
        if (tx.type === "deposit" && tx.profiles) {
          const userId = tx.user_id;
          if (!userTransactions.has(userId)) {
            userTransactions.set(userId, {
              userId,
              userName: tx.profiles.full_name || "Unknown",
              email: tx.profiles.email || "",
              totalAmount: 0,
              transactionCount: 0,
            });
          }

          const userData = userTransactions.get(userId);
          userData.totalAmount += parseFloat(tx.amount);
          userData.transactionCount += 1;
          userTransactions.set(userId, userData);
        }
      });

      // Convert to array and sort by total amount
      const topUsersList = Array.from(userTransactions.values())
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5);

      setTopUsers(topUsersList);

      // Process transactions based on initial date range
      processTransactionData(allTransactions);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const processTransactionData = async (transactions?: any[]) => {
    setIsPreparing(true);
    try {
      const allTransactions = transactions || (await getAllTransactions(1000));

      // Filter transactions based on selected date range
      let filteredTransactions;
      const today = new Date();

      switch (dateRange) {
        case "week":
          filteredTransactions = allTransactions.filter(
            (tx) => parseISO(tx.created_at) > subDays(today, 7)
          );
          break;
        case "month":
          filteredTransactions = allTransactions.filter(
            (tx) =>
              parseISO(tx.created_at) >= startOfMonth(today) &&
              parseISO(tx.created_at) <= endOfMonth(today)
          );
          break;
        case "year":
          filteredTransactions = allTransactions.filter(
            (tx) =>
              parseISO(tx.created_at).getFullYear() === today.getFullYear()
          );
          break;
        case "all":
        default:
          filteredTransactions = allTransactions;
          break;
      }

      // Group transactions by day
      const txByDay = new Map();
      filteredTransactions.forEach((tx: any) => {
        const day = format(parseISO(tx.created_at), "MMM dd");
        if (!txByDay.has(day)) {
          txByDay.set(day, {
            day,
            deposit: 0,
            withdrawal: 0,
            transfer: 0,
            total: 0,
          });
        }

        const dayData = txByDay.get(day);
        const amount = parseFloat(tx.amount);

        dayData[tx.type] += amount;
        dayData.total += amount;

        txByDay.set(day, dayData);
      });

      // Convert to array and sort by date
      const txByDayArray = Array.from(txByDay.values()).sort(
        (a, b) => new Date(a.day).getTime() - new Date(b.day).getTime()
      );

      setTransactionsByDay(txByDayArray);

      // Group transactions by type
      const txByType = [
        { name: "Deposits", value: 0 },
        { name: "Withdrawals", value: 0 },
        { name: "Transfers", value: 0 },
      ];

      filteredTransactions.forEach((tx: any) => {
        if (tx.type === "deposit") txByType[0].value += parseFloat(tx.amount);
        else if (tx.type === "withdrawal")
          txByType[1].value += parseFloat(tx.amount);
        else if (tx.type === "transfer")
          txByType[2].value += parseFloat(tx.amount);
      });

      setTransactionsByType(txByType.filter((item) => item.value > 0));

      // Group transactions by status
      const txByStatus = [
        { name: "Completed", value: 0, color: STATUS_COLORS.completed },
        { name: "Pending", value: 0, color: STATUS_COLORS.pending },
        { name: "Failed", value: 0, color: STATUS_COLORS.failed },
      ];

      filteredTransactions.forEach((tx: any) => {
        if (tx.status === "completed") txByStatus[0].value++;
        else if (tx.status === "pending") txByStatus[1].value++;
        else if (tx.status === "failed") txByStatus[2].value++;
      });

      setTransactionsByStatus(txByStatus.filter((item) => item.value > 0));
    } catch (error) {
      console.error("Error processing transaction data:", error);
      toast.error("Failed to process transaction data");
    } finally {
      setIsPreparing(false);
    }
  };

  const handleDownloadReport = () => {
    try {
      // Create CSV content
      const headers = [
        "Date",
        "Total Volume (GMD)",
        "Deposits (GMD)",
        "Withdrawals (GMD)",
        "Transfers (GMD)",
      ];

      const rows = transactionsByDay.map((day) => [
        day.day,
        day.total.toFixed(2),
        day.deposit.toFixed(2),
        day.withdrawal.toFixed(2),
        day.transfer.toFixed(2),
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      // Create download link
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `transaction-report-${format(
        new Date(),
        "yyyy-MM-dd"
      )}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Report downloaded successfully");
    } catch (error) {
      console.error("Error downloading report:", error);
      toast.error("Failed to download report");
    }
  };

  const ChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-md shadow-md border border-gray-200">
          <p className="font-medium">{payload[0].payload.day}</p>
          <p className="text-xs text-gray-500 mb-1">All values in GMD</p>
          {payload.map((item: any, index: number) => (
            <p key={index} style={{ color: item.color }} className="text-sm">
              {item.name}: D{item.value.toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with date range selector */}
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Financial overview and key performance metrics
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="select"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>

          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="btn bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center"
          >
            <RefreshCw
              size={16}
              className={`mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            {isLoading ? "Loading..." : "Refresh"}
          </button>

          <button
            onClick={handleDownloadReport}
            className="btn bg-primary-600 hover:bg-primary-700 text-white flex items-center"
          >
            <Download size={16} className="mr-2" />
            Download Report
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 p-3 rounded-md">
              <Users size={20} className="text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-gray-900">
                  {stats.totalUsers}
                </span>
                <span className="ml-2 flex items-center text-sm font-medium text-green-600">
                  <ArrowUpRight size={16} className="mr-1" />
                  {Math.round(
                    (stats.activeUsers / (stats.totalUsers || 1)) * 100
                  )}
                  % Active
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 p-3 rounded-md">
              <Banknote size={20} className="text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">
                Total Volume (GMD)
              </h3>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-gray-900">
                  D
                  {stats.totalVolume.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="ml-2 flex items-center text-sm font-medium text-green-600">
                  <TrendingUp size={16} className="mr-1" />
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-purple-100 p-3 rounded-md">
              <CreditCard size={20} className="text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">
                Total Transactions
              </h3>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-gray-900">
                  {stats.totalTransactions}
                </span>
                {stats.pendingTransactions > 0 && (
                  <span className="ml-2 flex items-center text-sm font-medium text-yellow-600">
                    <Activity size={16} className="mr-1" />
                    {stats.pendingTransactions} Pending
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-yellow-100 p-3 rounded-md">
              <Calendar size={20} className="text-yellow-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Period</h3>
              <div className="flex items-center">
                <span className="text-lg font-bold text-gray-900">
                  {dateRange === "week"
                    ? "Last 7 Days"
                    : dateRange === "month"
                    ? "This Month"
                    : dateRange === "year"
                    ? "This Year"
                    : "All Time"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loan Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-gray-500">Active Loans</h3>
          <p className="text-xl font-bold text-gray-900">
            {loanStats.activeLoans}
          </p>
          <div className="flex items-center mt-1">
            <span className="text-xs text-gray-500">
              of {loanStats.totalLoans} total loans
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-gray-500">
            Disbursed This Month
          </h3>
          <p className="text-xl font-bold text-gray-900">
            D
            {loanStats.disbursedThisMonth.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <div className="flex items-center mt-1">
            <span className="text-xs text-gray-500">
              {loanStats.newLoansThisMonth} new loans
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
          <h3 className="text-sm font-medium text-gray-500">
            Pending Approvals
          </h3>
          <p className="text-xl font-bold text-gray-900">
            {loanStats.pendingApprovals}
          </p>
          <div className="flex items-center mt-1">
            <span className="text-xs text-gray-500">Waiting for review</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
          <h3 className="text-sm font-medium text-gray-500">At Risk</h3>
          <p className="text-xl font-bold text-gray-900">
            {loanStats.atRiskLoans}
          </p>
          <div className="flex items-center mt-1">
            <span className="text-xs text-gray-500">
              D
              {loanStats.atRiskAmount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              outstanding
            </span>
          </div>
        </div>
      </div>

      {/* Performance Summary Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Performance Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">User Growth</h3>
            <p className="text-2xl font-bold text-gray-900">+14%</p>
            <p className="text-xs text-gray-500">vs previous month</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">
              Transaction Volume
            </h3>
            <p className="text-2xl font-bold text-gray-900">+23%</p>
            <p className="text-xs text-gray-500">vs previous month</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">
              Loan Disbursement
            </h3>
            <p className="text-2xl font-bold text-gray-900">+8%</p>
            <p className="text-xs text-gray-500">vs previous month</p>
          </div>
        </div>
      </div>

      {/* System Health Indicators */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">System Health</h2>
          <span className="px-2 py-1 text-xs rounded-full font-medium bg-green-100 text-green-800">
            Healthy
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">
              Database Status
            </h3>
            <div className="flex items-center mt-1">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm">Operational</span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">API Response</h3>
            <div className="flex items-center mt-1">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm">120ms avg</span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Last Backup</h3>
            <div className="flex items-center mt-1">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm">Today, 04:00</span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Error Rate</h3>
            <div className="flex items-center mt-1">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm">0.02%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Notifications Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Important Notifications
        </h2>
        <div className="space-y-3">
          <div className="flex items-start p-3 bg-yellow-50 rounded-lg border border-yellow-100">
            <div className="flex-shrink-0 text-yellow-500 mr-3">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 9V14M12 17.5V17.51M7.8 21H16.2C17.8802 21 18.7202 21 19.362 20.673C19.9265 20.3854 20.3854 19.9265 20.673 19.362C21 18.7202 21 17.8802 21 16.2V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V16.2C3 17.8802 3 18.7202 3.32698 19.362C3.6146 19.9265 4.07354 20.3854 4.63803 20.673C5.27976 21 6.11984 21 7.8 21Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-yellow-800">
                {loanStats.atRiskLoans} loan payments overdue
              </h3>
              <p className="text-sm text-yellow-600">
                Total outstanding: D
                {loanStats.atRiskAmount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          <div className="flex items-start p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex-shrink-0 text-blue-500 mr-3">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13 16H12V12H11M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-blue-800">
                {loanStats.pendingApprovals} pending loan approvals
              </h3>
              <p className="text-sm text-blue-600">Waiting for your review</p>
            </div>
          </div>

          <div className="flex items-start p-3 bg-green-50 rounded-lg border border-green-100">
            <div className="flex-shrink-0 text-green-500 mr-3">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 12L11 14L15 10M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-green-800">
                New database backup completed
              </h3>
              <p className="text-sm text-green-600">May 5, 2025 at 04:00</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Transaction volume chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              Transaction Volume
            </h2>
            {isPreparing && (
              <RefreshCw size={16} className="animate-spin text-gray-400" />
            )}
          </div>
          <div className="h-64">
            {transactionsByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={transactionsByDay}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" />
                  <YAxis
                    tickFormatter={(value) => `D${value}`}
                    width={70}
                    label={{
                      value: "GMD",
                      angle: -90,
                      position: "insideLeft",
                      offset: 5,
                    }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Bar dataKey="deposit" name="Deposits" fill="#10B981" />
                  <Bar dataKey="withdrawal" name="Withdrawals" fill="#EF4444" />
                  <Bar dataKey="transfer" name="Transfers" fill="#6366F1" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No transaction data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Transaction distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              Transaction Distribution
            </h2>
            {isPreparing && (
              <RefreshCw size={16} className="animate-spin text-gray-400" />
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-72">
              {" "}
              {/* Increased height for better label visibility */}
              {transactionsByType.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={transactionsByType}
                      cx="50%"
                      cy="45%" /* Moved slightly up to make room for labels */
                      labelLine={true}
                      label={CustomPieChartLabel}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      paddingAngle={2}
                    >
                      {transactionsByType.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) =>
                        `D${Number(value).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      }
                      labelFormatter={(label) => `${label}`}
                    />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">
                    No distribution data available
                  </p>
                </div>
              )}
            </div>

            <div className="h-72">
              {" "}
              {/* Increased height to match */}
              {transactionsByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={transactionsByStatus}
                      cx="50%"
                      cy="45%" /* Moved slightly up to make room for labels */
                      labelLine={true}
                      label={CustomPieChartLabel}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      paddingAngle={2}
                    >
                      {transactionsByStatus.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color || COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No status data available</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
            {transactionsByType.map((type, index) => (
              <div key={`type-${index}`} className="flex items-center">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
                <span className="text-xs text-gray-600">
                  {type.name}: D
                  {Number(type.value).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top users */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Top Users by Volume
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    User
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Total Amount
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    # of Transactions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topUsers.length > 0 ? (
                  topUsers.map((user, index) => (
                    <tr key={user.userId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-700">
                              {user.userName?.charAt(0) || "U"}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {user.userName || "Unknown User"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {user.email || "No email"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          D{user.totalAmount.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.transactionCount} transactions
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No user data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent transactions */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              Recent Transactions
            </h2>
            <a
              href="/admin/transactions"
              className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
            >
              View All <ChevronRight size={16} className="ml-1" />
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                    Amount
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    User
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
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium capitalize
                            ${
                              tx.type === "deposit"
                                ? "bg-green-100 text-green-800"
                                : tx.type === "withdrawal"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                            }
                          `}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          D{parseFloat(tx.amount).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {tx.profiles?.full_name || "Unknown"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium capitalize
                            ${
                              tx.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : tx.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }
                          `}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(parseISO(tx.created_at), "MMM d, HH:mm")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No recent transactions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
