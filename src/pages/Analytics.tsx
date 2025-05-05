import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase, getMonthlyTransactions } from "../lib/supabase";
import {
  format,
  subMonths,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
} from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  DollarSign,
  Users,
  CreditCard,
  Clock,
  ChevronRight,
  Filter,
  Download,
  Share2,
  Activity,
  Wallet,
  PieChart as PieChartIcon,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import StatCard from "../components/ui/StatCard";

export default function Analytics() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyTransactions, setMonthlyTransactions] = useState<any[]>([]);
  const [spendingByCategory, setSpendingByCategory] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [savingsData, setSavingsData] = useState<any[]>([]);
  const [transactionCounts, setTransactionCounts] = useState<any>({
    deposits: 0,
    withdrawals: 0,
    transfers: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<"3m" | "6m" | "1y" | "all">("6m");

  useEffect(() => {
    fetchAnalyticsData();
  }, [user, timeRange]);

  const fetchAnalyticsData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Get monthly transactions
      const monthlyTxns = await getMonthlyTransactions(user.id);
      setMonthlyTransactions(monthlyTxns);

      // Process transactions
      processTransactions(monthlyTxns);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAnalyticsData();
    toast.success("Analytics data refreshed");
    setIsRefreshing(false);
  };

  // Process transactions for visualization
  const processTransactions = (transactions: any[]) => {
    // 1. Spending by category
    const categories = processTransactionsByCategory(transactions);
    setSpendingByCategory(categories);

    // 2. Monthly income vs expenses
    const monthlyStats = processMonthlyData(transactions);
    setMonthlyData(monthlyStats);

    // 3. Savings over time
    const savingsOverTime = calculateSavingsOverTime(transactions);
    setSavingsData(savingsOverTime);

    // 4. Transaction counts
    const counts = {
      deposits: transactions.filter((tx) => tx.type === "deposit").length,
      withdrawals: transactions.filter((tx) => tx.type === "withdrawal").length,
      transfers: transactions.filter((tx) => tx.type === "transfer").length,
    };
    setTransactionCounts(counts);
  };

  // Process transactions by category
  const processTransactionsByCategory = (transactions: any[]) => {
    const withdrawals = transactions.filter((tx) => tx.type === "withdrawal");

    // Sample categorization logic
    const categorized = withdrawals.reduce((acc: any, tx: any) => {
      let category = "Other";

      const desc = (tx.description || "").toLowerCase();
      if (desc.includes("bill") || desc.includes("utility")) category = "Bills";
      else if (
        desc.includes("food") ||
        desc.includes("grocery") ||
        desc.includes("restaurant")
      )
        category = "Food";
      else if (
        desc.includes("transport") ||
        desc.includes("fuel") ||
        desc.includes("taxi")
      )
        category = "Transport";
      else if (desc.includes("loan") || desc.includes("payment"))
        category = "Loan Payment";
      else if (desc.includes("shopping")) category = "Shopping";

      if (!acc[category]) acc[category] = 0;
      acc[category] += tx.amount;
      return acc;
    }, {});

    const COLORS = [
      "#0088FE",
      "#00C49F",
      "#FFBB28",
      "#FF8042",
      "#8884d8",
      "#82ca9d",
    ];
    return Object.entries(categorized).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length],
    }));
  };

  // Process monthly income vs expenses
  const processMonthlyData = (transactions: any[]) => {
    // Determine time range based on user selection
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case "3m":
        startDate = subMonths(now, 3);
        break;
      case "6m":
        startDate = subMonths(now, 6);
        break;
      case "1y":
        startDate = subMonths(now, 12);
        break;
      case "all":
      default:
        // Find earliest transaction date or default to 12 months
        const dates = transactions.map((tx) => new Date(tx.created_at));
        startDate =
          dates.length > 0
            ? new Date(Math.min(...dates.map((d) => d.getTime())))
            : subMonths(now, 12);
    }

    // Create array of all months in range
    const monthRange = eachMonthOfInterval({
      start: startOfMonth(startDate),
      end: now,
    });

    // Map transactions to months
    return monthRange.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthName = format(month, "MMM yyyy");

      const monthlyTxs = transactions.filter((tx) => {
        const txDate = new Date(tx.created_at);
        return txDate >= monthStart && txDate <= monthEnd;
      });

      const income = monthlyTxs
        .filter((tx) => tx.type === "deposit")
        .reduce((sum, tx) => sum + tx.amount, 0);

      const expenses = monthlyTxs
        .filter((tx) => tx.type === "withdrawal")
        .reduce((sum, tx) => sum + tx.amount, 0);

      const savings = income - expenses;

      return {
        name: monthName,
        income,
        expenses,
        savings,
      };
    });
  };

  // Calculate savings over time
  const calculateSavingsOverTime = (transactions: any[]) => {
    if (!transactions.length) return [];

    // Sort transactions by date
    const sortedTxs = [...transactions].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Group by month
    const monthlyData: { [key: string]: { balance: number; month: string } } =
      {};
    let runningBalance = 0;

    sortedTxs.forEach((tx) => {
      const txDate = new Date(tx.created_at);
      const monthKey = format(txDate, "yyyy-MM");
      const monthLabel = format(txDate, "MMM yyyy");

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { balance: runningBalance, month: monthLabel };
      }

      // Update balance
      if (tx.type === "deposit") {
        runningBalance += tx.amount;
      } else if (tx.type === "withdrawal") {
        runningBalance -= tx.amount;
      }

      monthlyData[monthKey].balance = runningBalance;
    });

    return Object.values(monthlyData);
  };

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
      .format(amount)
      .replace(/^/, "D");
  };

  // Custom pie chart label
  const CustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-xs"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 pb-12">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg mt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center">
              <TrendingUp className="mr-3 h-7 w-7" />
              Financial Analytics
            </h1>
            <p className="text-indigo-100">
              Track your financial health and spending patterns
            </p>
          </div>

          <div className="flex items-center space-x-2 mt-4 md:mt-0">
            <div className="bg-white/10 rounded-lg p-1">
              <select
                className="bg-transparent text-white border-none text-sm focus:ring-0"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
              >
                <option value="3m" className="text-gray-900">
                  Last 3 months
                </option>
                <option value="6m" className="text-gray-900">
                  Last 6 months
                </option>
                <option value="1y" className="text-gray-900">
                  Last year
                </option>
                <option value="all" className="text-gray-900">
                  All time
                </option>
              </select>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`inline-flex items-center px-3 py-1.5 rounded-lg text-white border border-white/20 hover:bg-white/10 transition-colors duration-200 ${
                isRefreshing ? "opacity-75 cursor-not-allowed" : ""
              }`}
            >
              <RefreshCw
                size={16}
                className={`mr-1 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Monthly Income"
          value={
            monthlyData.length > 0
              ? monthlyData[monthlyData.length - 1].income
              : 0
          }
          icon={<ArrowUpRight size={20} />}
          format="currency"
          currencySymbol="D"
          subtitle="Current month"
          className="bg-white border-l-4 border-green-500"
        />

        <StatCard
          title="Monthly Expenses"
          value={
            monthlyData.length > 0
              ? monthlyData[monthlyData.length - 1].expenses
              : 0
          }
          icon={<ArrowDownRight size={20} />}
          format="currency"
          currencySymbol="D"
          subtitle="Current month"
          className="bg-white border-l-4 border-red-500"
        />

        <StatCard
          title="Savings Rate"
          value={
            monthlyData.length > 0 &&
            monthlyData[monthlyData.length - 1].income > 0
              ? (
                  (monthlyData[monthlyData.length - 1].savings /
                    monthlyData[monthlyData.length - 1].income) *
                  100
                ).toFixed(1)
              : 0
          }
          icon={<Wallet size={20} />}
          format="percentage"
          subtitle="Current month"
          className="bg-white border-l-4 border-blue-500"
        />

        <StatCard
          title="Transaction Count"
          value={
            transactionCounts.deposits +
            transactionCounts.withdrawals +
            transactionCounts.transfers
          }
          icon={<CreditCard size={20} />}
          format="number"
          subtitle={timeRange === "all" ? "All time" : `Last ${timeRange}`}
          className="bg-white border-l-4 border-purple-500"
        />
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <RefreshCw
            size={48}
            className="mx-auto mb-4 animate-spin text-primary-500"
          />
          <h3 className="text-lg font-medium text-gray-900">
            Loading your analytics...
          </h3>
          <p className="text-gray-500 mt-2">This may take a moment</p>
        </div>
      ) : (
        <>
          {/* Main Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income vs Expenses Chart */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Income vs Expenses
                </h3>
                <div className="flex space-x-1">
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <Filter size={16} className="text-gray-500" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <Download size={16} className="text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="h-80">
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyData}
                      margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                      <Legend />
                      <Bar dataKey="income" name="Income" fill="#10b981" />
                      <Bar dataKey="expenses" name="Expenses" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">
                      No transaction data available
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Spending Breakdown Pie Chart */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Expense Breakdown
                </h3>
                <div className="flex space-x-1">
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <Filter size={16} className="text-gray-500" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <Download size={16} className="text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="h-80">
                {spendingByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spendingByCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={CustomizedLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {spendingByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No spending data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Charts & Data */}
          <div className="grid grid-cols-1 gap-6">
            {/* Balance Trend Chart */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5 text-primary-500" />
                  Balance Trend
                </h3>
                <div className="flex space-x-1">
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <Filter size={16} className="text-gray-500" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <Download size={16} className="text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="h-80">
                {savingsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={savingsData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="balanceGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#6366f1"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#6366f1"
                            stopOpacity={0.2}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                      <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="#6366f1"
                        fill="url(#balanceGradient)"
                        name="Balance"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">
                      No balance trend data available
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Transaction Type Breakdown */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h3 className="text-lg font-medium text-gray-900 mb-6">
              Transaction Analysis
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Deposits
                    </p>
                    <h4 className="text-2xl font-bold text-gray-900 mt-1">
                      {transactionCounts.deposits}
                    </h4>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <ArrowUpRight className="h-6 w-6 text-blue-700" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-blue-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{
                        width: `${Math.round(
                          (transactionCounts.deposits /
                            (transactionCounts.deposits +
                              transactionCounts.withdrawals +
                              transactionCounts.transfers)) *
                            100
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round(
                      (transactionCounts.deposits /
                        (transactionCounts.deposits +
                          transactionCounts.withdrawals +
                          transactionCounts.transfers || 1)) *
                        100
                    )}
                    % of total
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-lg border border-red-100">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Withdrawals
                    </p>
                    <h4 className="text-2xl font-bold text-gray-900 mt-1">
                      {transactionCounts.withdrawals}
                    </h4>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <ArrowDownRight className="h-6 w-6 text-red-700" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-red-100 rounded-full h-1.5">
                    <div
                      className="bg-red-600 h-1.5 rounded-full"
                      style={{
                        width: `${Math.round(
                          (transactionCounts.withdrawals /
                            (transactionCounts.deposits +
                              transactionCounts.withdrawals +
                              transactionCounts.transfers)) *
                            100
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round(
                      (transactionCounts.withdrawals /
                        (transactionCounts.deposits +
                          transactionCounts.withdrawals +
                          transactionCounts.transfers || 1)) *
                        100
                    )}
                    % of total
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-teal-50 p-6 rounded-lg border border-green-100">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Transfers
                    </p>
                    <h4 className="text-2xl font-bold text-gray-900 mt-1">
                      {transactionCounts.transfers}
                    </h4>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <CreditCard className="h-6 w-6 text-green-700" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-green-100 rounded-full h-1.5">
                    <div
                      className="bg-green-600 h-1.5 rounded-full"
                      style={{
                        width: `${Math.round(
                          (transactionCounts.transfers /
                            (transactionCounts.deposits +
                              transactionCounts.withdrawals +
                              transactionCounts.transfers)) *
                            100
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round(
                      (transactionCounts.transfers /
                        (transactionCounts.deposits +
                          transactionCounts.withdrawals +
                          transactionCounts.transfers || 1)) *
                        100
                    )}
                    % of total
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Insights */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <HelpCircle className="mr-2 h-5 w-5 text-primary-500" />
                Financial Insights
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {monthlyData.length > 0 &&
                monthlyData[monthlyData.length - 1].income > 0 && (
                  <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                    <h4 className="text-md font-medium text-gray-800 mb-3">
                      Spending Analysis
                    </h4>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <PieChartIcon className="h-5 w-5 text-blue-700" />
                      </div>
                      <span className="text-sm text-gray-600">
                        {monthlyData[monthlyData.length - 1].expenses >
                        monthlyData[monthlyData.length - 1].income
                          ? "You're spending more than you earn this month."
                          : `You're saving ${Math.round(
                              (1 -
                                monthlyData[monthlyData.length - 1].expenses /
                                  monthlyData[monthlyData.length - 1].income) *
                                100
                            )}% of your income this month.`}
                      </span>
                    </div>
                    <div className="mt-3 text-sm text-gray-700">
                      <div className="flex justify-between mb-1">
                        <span>Spending Ratio:</span>
                        <span className="font-medium">
                          {Math.round(
                            (monthlyData[monthlyData.length - 1].expenses /
                              monthlyData[monthlyData.length - 1].income) *
                              100
                          )}
                          % of income
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
                        <div
                          className={`h-1.5 rounded-full ${
                            monthlyData[monthlyData.length - 1].expenses >
                            monthlyData[monthlyData.length - 1].income
                              ? "bg-red-500"
                              : "bg-blue-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (monthlyData[monthlyData.length - 1].expenses /
                                  monthlyData[monthlyData.length - 1].income) *
                                  100
                              )
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      {monthlyData[monthlyData.length - 1].expenses >
                      monthlyData[monthlyData.length - 1].income
                        ? "Consider reducing expenses to avoid depleting your savings."
                        : monthlyData[monthlyData.length - 1].expenses >
                          monthlyData[monthlyData.length - 1].income * 0.9
                        ? "You're cutting it close. Look for ways to reduce spending."
                        : "Great job managing your finances!"}
                    </p>
                  </div>
                )}

              {spendingByCategory.length > 0 && (
                <div className="p-5 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-100">
                  <h4 className="text-md font-medium text-gray-800 mb-3">
                    Spending Recommendations
                  </h4>

                  {/* Find largest category */}
                  {(() => {
                    const largestCategory = [...spendingByCategory].sort(
                      (a, b) => Number(b.value) - Number(a.value)
                    )[0];
                    const totalSpending = spendingByCategory.reduce(
                      (sum, cat) => sum + Number(cat.value),
                      0
                    );
                    const percentOfTotal = Math.round(
                      (Number(largestCategory.value) / totalSpending) * 100
                    );

                    return (
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-100 rounded-full">
                          <TrendingUp className="h-5 w-5 text-green-700" />
                        </div>
                        <span className="text-sm text-gray-600">
                          Your highest expense category is{" "}
                          <strong>{largestCategory.name}</strong>, at{" "}
                          {percentOfTotal}% of your total spending.
                        </span>
                      </div>
                    );
                  })()}

                  <div className="mt-3 text-sm text-gray-700">
                    <h5 className="font-medium mb-2">Suggestions:</h5>
                    <ul className="list-disc pl-5 space-y-1">
                      {(() => {
                        const sortedCategories = [...spendingByCategory].sort(
                          (a, b) => Number(b.value) - Number(a.value)
                        );
                        const totalSpending = spendingByCategory.reduce(
                          (sum, cat) => sum + Number(cat.value),
                          0
                        );

                        if (sortedCategories[0]?.name === "Food") {
                          return (
                            <li>
                              Consider meal planning to reduce food expenses
                            </li>
                          );
                        } else if (sortedCategories[0]?.name === "Bills") {
                          return (
                            <li>
                              Review your subscriptions for services you rarely
                              use
                            </li>
                          );
                        } else if (sortedCategories[0]?.name === "Transport") {
                          return (
                            <li>
                              Look into carpooling or public transport options
                            </li>
                          );
                        } else if (sortedCategories[0]?.name === "Shopping") {
                          return (
                            <li>
                              Try implementing a 24-hour rule before
                              non-essential purchases
                            </li>
                          );
                        }
                        return (
                          <li>
                            Focus on reducing your {sortedCategories[0]?.name}{" "}
                            expenses
                          </li>
                        );
                      })()}
                      <li>Aim for a 50/30/20 budget (Needs/Wants/Savings)</li>
                      <li>Set specific spending limits for each category</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
