import { useState, useEffect } from "react";
import {
  getAllTransactions,
  getAllUsers,
  getAdminStats,
  getAllLoans,
  getLoanPayments,
  getLoanStatistics,
} from "../../lib/supabase";
import {
  format,
  parseISO,
  subDays,
  subMonths,
  subYears,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import {
  LineChart,
  Line,
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
  AreaChart,
  Area,
} from "recharts";

// Color constants for charts
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
];

type TimeRange = "7d" | "30d" | "90d" | "1y" | "all";
type LoanType =
  | "business"
  | "auto"
  | "personal"
  | "festive"
  | "building"
  | "device"
  | "motorcycle"
  | "education"
  | "special"
  | string;
type LoanStatus =
  | "pending"
  | "approved"
  | "active"
  | "completed"
  | "rejected"
  | "defaulted"
  | string;

const AdminAnalytics = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [activeLoanFilter, setActiveLoanFilter] = useState<LoanType | "all">(
    "all"
  );
  const [activeStatusFilter, setActiveStatusFilter] = useState<
    LoanStatus | "all"
  >("all");
  const [loans, setLoans] = useState<any[]>([]);
  const [loanPayments, setLoanPayments] = useState<any[]>([]);
  const [loanStats, setLoanStats] = useState<any>({
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
  });
  const [stats, setStats] = useState<any>({
    totalUsers: 0,
    totalTransactions: 0,
    totalVolume: 0,
    pendingTransactions: 0,
    activeUsers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoanDataLoading, setIsLoanDataLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch all necessary data
        const txData = await getAllTransactions(500); // Get up to 500 transactions
        const userData = await getAllUsers();
        const statsData = await getAdminStats();

        setTransactions(txData || []);
        setUsers(userData || []);
        setStats(statsData);
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchLoanData = async () => {
      setIsLoanDataLoading(true);
      try {
        // Fetch loan data
        const loansData = await getAllLoans(500);
        const paymentsData = await getLoanPayments(500);
        const loanStatsData = await getLoanStatistics();

        setLoans(loansData || []);
        setLoanPayments(paymentsData || []);
        setLoanStats(loanStatsData);
      } catch (error) {
        console.error("Error fetching loan analytics data:", error);
      } finally {
        setIsLoanDataLoading(false);
      }
    };

    fetchData();
    fetchLoanData();
  }, []);

  // Filter data based on selected time range
  const getDateLimit = () => {
    const now = new Date();
    switch (timeRange) {
      case "7d":
        return subDays(now, 7);
      case "30d":
        return subDays(now, 30);
      case "90d":
        return subDays(now, 90);
      case "1y":
        return subYears(now, 1);
      case "all":
        return new Date(0); // Beginning of time
      default:
        return subDays(now, 30);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    try {
      const txDate = parseISO(tx.created_at);
      return txDate >= getDateLimit();
    } catch (error) {
      return false;
    }
  });

  const filteredUsers = users.filter((user) => {
    try {
      const userDate = parseISO(user.created_at);
      return userDate >= getDateLimit();
    } catch (error) {
      return false;
    }
  });

  // Filter loans based on selected time range and filters
  const filteredLoans = loans.filter((loan) => {
    try {
      const loanDate = parseISO(loan.application_date);
      const typeMatch =
        activeLoanFilter === "all" || loan.loan_type === activeLoanFilter;
      const statusMatch =
        activeStatusFilter === "all" || loan.status === activeStatusFilter;
      return loanDate >= getDateLimit() && typeMatch && statusMatch;
    } catch (error) {
      return false;
    }
  });

  // Filter loan payments based on selected time range
  const filteredLoanPayments = loanPayments.filter((payment) => {
    try {
      const paymentDate = parseISO(payment.payment_date);
      return paymentDate >= getDateLimit();
    } catch (error) {
      return false;
    }
  });

  // Prepare data for user growth chart
  const getUserGrowthData = () => {
    const sortedUsers = [...users].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    let cumulativeCount = 0;
    return sortedUsers
      .filter((user) => new Date(user.created_at) >= getDateLimit())
      .map((user) => {
        cumulativeCount++;
        return {
          date: format(new Date(user.created_at), "MMM dd"),
          count: cumulativeCount,
        };
      });
  };

  // Prepare data for transaction volume by type
  const getTransactionVolumeByType = () => {
    const volumeByType = filteredTransactions.reduce((acc, tx) => {
      const type = tx.type || "unknown";
      if (!acc[type]) acc[type] = 0;
      acc[type] += Number(tx.amount) || 0;
      return acc;
    }, {});

    return Object.entries(volumeByType).map(([type, amount]) => ({
      type,
      amount: Number(amount).toFixed(2),
    }));
  };

  // Prepare data for transaction status distribution
  const getTransactionStatusData = () => {
    const statusCounts = filteredTransactions.reduce((acc, tx) => {
      const status = tx.status || "unknown";
      if (!acc[status]) acc[status] = 0;
      acc[status]++;
      return acc;
    }, {});

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));
  };

  // Prepare data for transactions over time
  const getTransactionsOverTime = () => {
    const txByDate = filteredTransactions.reduce((acc, tx) => {
      try {
        const dateStr = format(parseISO(tx.created_at), "yyyy-MM-dd");
        if (!acc[dateStr]) {
          acc[dateStr] = {
            date: dateStr,
            deposit: 0,
            withdrawal: 0,
            transfer: 0,
            total: 0,
          };
        }

        const amount = Number(tx.amount) || 0;
        acc[dateStr][tx.type] += amount;
        acc[dateStr].total += amount;
      } catch (error) {
        console.error("Error processing transaction date:", error);
      }
      return acc;
    }, {});

    return Object.values(txByDate).sort(
      (a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  // Prepare data for user activity by hour
  const getUserActivityByHour = () => {
    const activityByHour = Array(24)
      .fill(0)
      .map((_, i) => ({
        hour: i,
        count: 0,
        label: `${i}:00`,
      }));

    filteredTransactions.forEach((tx) => {
      try {
        const txDate = parseISO(tx.created_at);
        const hour = txDate.getHours();
        activityByHour[hour].count++;
      } catch (error) {
        console.error("Error processing transaction hour:", error);
      }
    });

    return activityByHour;
  };

  // Prepare data for user retention analysis
  const getUserRetentionData = () => {
    // This would ideally come from the database
    // For now, we'll use mock data representing different user cohorts
    return [
      {
        name: "Jan 2025",
        initialUsers: 120,
        retentionData: {
          "Month 1": 120,
          "Month 2": 98,
          "Month 3": 85,
          "Month 4": 76,
          "Month 5": 70,
        },
      },
      {
        name: "Feb 2025",
        initialUsers: 145,
        retentionData: {
          "Month 1": 145,
          "Month 2": 123,
          "Month 3": 104,
          "Month 4": 95,
        },
      },
      {
        name: "Mar 2025",
        initialUsers: 165,
        retentionData: {
          "Month 1": 165,
          "Month 2": 142,
          "Month 3": 128,
        },
      },
      {
        name: "Apr 2025",
        initialUsers: 190,
        retentionData: {
          "Month 1": 190,
          "Month 2": 168,
        },
      },
      {
        name: "May 2025",
        initialUsers: 210,
        retentionData: {
          "Month 1": 210,
        },
      },
    ];
  };

  // Get loan type distribution data
  const getLoanTypeDistribution = () => {
    const typeDistribution = filteredLoans.reduce((acc, loan) => {
      const type = loan.loan_type || "unknown";
      if (!acc[type]) acc[type] = 0;
      acc[type]++;
      return acc;
    }, {});

    return Object.entries(typeDistribution).map(([type, count]) => ({
      type: getLoanTypeLabel(type),
      count,
      value: count, // for pie chart compatibility
    }));
  };

  // Get loan status distribution data
  const getLoanStatusDistribution = () => {
    const statusDistribution = filteredLoans.reduce((acc, loan) => {
      const status = loan.status || "unknown";
      if (!acc[status]) acc[status] = 0;
      acc[status]++;
      return acc;
    }, {});

    return Object.entries(statusDistribution).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1), // Capitalize first letter
      count,
      value: count, // for pie chart compatibility
    }));
  };

  // Get loan applications over time
  const getLoanApplicationsOverTime = () => {
    const applicationsByDate = filteredLoans.reduce((acc, loan) => {
      try {
        const dateStr = format(parseISO(loan.application_date), "yyyy-MM-dd");
        if (!acc[dateStr]) {
          acc[dateStr] = {
            date: dateStr,
            count: 0,
            amount: 0,
          };
        }

        acc[dateStr].count += 1;
        acc[dateStr].amount += Number(loan.amount) || 0;
      } catch (error) {
        console.error("Error processing loan application date:", error);
      }
      return acc;
    }, {});

    return Object.values(applicationsByDate).sort(
      (a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  // Get loan payments over time
  const getLoanPaymentsOverTime = () => {
    const paymentsByDate = filteredLoanPayments.reduce((acc, payment) => {
      try {
        const dateStr = format(parseISO(payment.payment_date), "yyyy-MM-dd");
        if (!acc[dateStr]) {
          acc[dateStr] = {
            date: dateStr,
            count: 0,
            amount: 0,
          };
        }

        acc[dateStr].count += 1;
        acc[dateStr].amount += Number(payment.amount) || 0;
      } catch (error) {
        console.error("Error processing loan payment date:", error);
      }
      return acc;
    }, {});

    return Object.values(paymentsByDate).sort(
      (a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  // Get average loan amount by type
  const getAverageLoanAmountByType = () => {
    const loansByType = filteredLoans.reduce((acc, loan) => {
      const type = loan.loan_type || "unknown";
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          total: 0,
        };
      }
      acc[type].count += 1;
      acc[type].total += Number(loan.amount) || 0;
      return acc;
    }, {});

    return Object.entries(loansByType).map(([type, data]: [string, any]) => ({
      type: getLoanTypeLabel(type),
      average: data.count > 0 ? data.total / data.count : 0,
    }));
  };

  // Helper to get loan type label
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

  // Get loan performance data (on-time vs late payments)
  const getLoanPerformanceData = () => {
    // This would ideally use actual payment data with due dates
    // For now, we'll return sample data that will be replaced when real data is available
    return [
      { name: "On-time", value: loanStats.onTimePaymentRate || 95 },
      { name: "Late", value: 100 - (loanStats.onTimePaymentRate || 95) },
    ];
  };

  // Add this component after the getUserRetentionData function

  const UserRetentionChart = () => {
    const retentionData = getUserRetentionData();

    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">User Retention Analysis</h3>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left">Cohort</th>
                <th className="px-4 py-2 text-right">Users</th>
                <th className="px-4 py-2 text-right">Month 1</th>
                <th className="px-4 py-2 text-right">Month 2</th>
                <th className="px-4 py-2 text-right">Month 3</th>
                <th className="px-4 py-2 text-right">Month 4</th>
                <th className="px-4 py-2 text-right">Month 5</th>
              </tr>
            </thead>
            <tbody>
              {retentionData.map((cohort) => (
                <tr key={cohort.name} className="border-t">
                  <td className="px-4 py-2 font-medium">{cohort.name}</td>
                  <td className="px-4 py-2 text-right">
                    {cohort.initialUsers}
                  </td>
                  {["Month 1", "Month 2", "Month 3", "Month 4", "Month 5"].map(
                    (month) => {
                      const value = cohort.retentionData[month];
                      const percentage = value
                        ? Math.round((value / cohort.initialUsers) * 100)
                        : null;

                      // Calculate background color intensity based on retention percentage
                      const bgColor = percentage
                        ? `rgba(79, 209, 197, ${percentage / 100})`
                        : "bg-gray-100";

                      return (
                        <td
                          key={month}
                          className="px-4 py-2 text-right"
                          style={{ backgroundColor: bgColor }}
                        >
                          {value ? (
                            <>
                              <span className="font-medium">{percentage}%</span>
                              <span className="text-gray-500 text-xs ml-1">
                                ({value})
                              </span>
                            </>
                          ) : (
                            "-"
                          )}
                        </td>
                      );
                    }
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          This chart shows what percentage of users from each cohort remained
          active in subsequent months.
        </p>
      </div>
    );
  };

  // Calculate average transaction value
  const getAverageTransactionValue = () => {
    if (filteredTransactions.length === 0) return 0;
    const total = filteredTransactions.reduce(
      (sum, tx) => sum + (Number(tx.amount) || 0),
      0
    );
    return (total / filteredTransactions.length).toFixed(2);
  };

  // Prepare data for monthly transaction summary
  const getMonthlyTransactionSummary = () => {
    const summary = {};

    // Get data for the last 12 months
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const monthDate = subMonths(now, i);
      const monthKey = format(monthDate, "MMM yyyy");
      summary[monthKey] = {
        month: monthKey,
        count: 0,
        volume: 0,
        deposits: 0,
        withdrawals: 0,
        transfers: 0,
      };
    }

    // Fill in transaction data
    transactions.forEach((tx) => {
      try {
        const txDate = parseISO(tx.created_at);
        const monthKey = format(txDate, "MMM yyyy");

        // Skip if the month is not in our tracking period
        if (!summary[monthKey]) return;

        const amount = Number(tx.amount) || 0;
        summary[monthKey].count += 1;
        summary[monthKey].volume += amount;

        // Track by type
        if (tx.type === "deposit") summary[monthKey].deposits += amount;
        else if (tx.type === "withdrawal")
          summary[monthKey].withdrawals += amount;
        else if (tx.type === "transfer") summary[monthKey].transfers += amount;
      } catch (error) {
        console.error(
          "Error processing transaction for monthly summary:",
          error
        );
      }
    });

    // Convert to array and sort by date
    return Object.values(summary)
      .sort((a: any, b: any) => {
        return new Date(b.month).getTime() - new Date(a.month).getTime();
      })
      .slice(0, 6); // Take only the last 6 months
  };

  // Format currency values
  const formatCurrency = (value: number | null | undefined) => {
    // Handle null or undefined values
    if (value == null) return "D0.00";

    // Ensure value is a number
    const numValue = Number(value);

    // Return formatted value with D symbol
    return new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
      .format(numValue)
      .replace(/^/, "D"); // Add D prefix manually
  };

  // Format number with thousands separators but no currency symbol
  const formatNumber = (value: number | null | undefined) => {
    if (value == null) return "0";
    return new Intl.NumberFormat("en-US").format(Number(value));
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading analytics data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <div className="flex items-center">
          <label className="mr-2 text-sm">Time Range:</label>
          <select
            className="border rounded p-2"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm text-gray-500">Total Users</h3>
          <p className="text-2xl font-bold">{stats.totalUsers}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm text-gray-500">Active Users</h3>
          <p className="text-2xl font-bold">{stats.activeUsers}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm text-gray-500">Total Transactions</h3>
          <p className="text-2xl font-bold">{stats.totalTransactions}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm text-gray-500">Transaction Volume</h3>
          <p className="text-2xl font-bold">
            {formatCurrency(stats.totalVolume)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm text-gray-500">Pending Transactions</h3>
          <p className="text-2xl font-bold">{stats.pendingTransactions}</p>
        </div>
      </div>

      {/* Charts - First row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* User Growth */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">User Growth</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={getUserGrowthData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Transaction Volume by Type */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">
            Transaction Volume by Type
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getTransactionVolumeByType()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="amount" name="Amount" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts - Second row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Transaction Status Distribution */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">
            Transaction Status Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={getTransactionStatusData()}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
                nameKey="status"
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {getTransactionStatusData().map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} transactions`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* User Activity by Hour */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">User Activity by Hour</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getUserActivityByHour()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Transactions" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts - Third row */}
      <div className="grid grid-cols-1 gap-6">
        {/* Transactions Over Time */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Transactions Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getTransactionsOverTime()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Line
                type="monotone"
                dataKey="deposit"
                stroke="#82ca9d"
                name="Deposits"
              />
              <Line
                type="monotone"
                dataKey="withdrawal"
                stroke="#ff7300"
                name="Withdrawals"
              />
              <Line
                type="monotone"
                dataKey="transfer"
                stroke="#8884d8"
                name="Transfers"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">
            Average Transaction Value
          </h2>
          <p className="text-3xl font-bold">
            {formatCurrency(Number(getAverageTransactionValue()))}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Total Activity Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm text-gray-500">
                Transactions This Period
              </h3>
              <p className="text-xl font-bold">{filteredTransactions.length}</p>
            </div>
            <div>
              <h3 className="text-sm text-gray-500">New Users This Period</h3>
              <p className="text-xl font-bold">{filteredUsers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Transaction Summary */}
      <div className="mt-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">
            Monthly Transaction Summary (Last 6 Months)
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 border-b text-left">Month</th>
                  <th className="py-2 px-4 border-b text-right">Count</th>
                  <th className="py-2 px-4 border-b text-right">
                    Total Volume
                  </th>
                  <th className="py-2 px-4 border-b text-right">Deposits</th>
                  <th className="py-2 px-4 border-b text-right">Withdrawals</th>
                  <th className="py-2 px-4 border-b text-right">Transfers</th>
                </tr>
              </thead>
              <tbody>
                {getMonthlyTransactionSummary().map(
                  (month: any, index: number) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                    >
                      <td className="py-2 px-4 border-b">{month.month}</td>
                      <td className="py-2 px-4 border-b text-right">
                        {formatNumber(month.count)}
                      </td>
                      <td className="py-2 px-4 border-b text-right">
                        {formatCurrency(month.volume)}
                      </td>
                      <td className="py-2 px-4 border-b text-right">
                        {formatCurrency(month.deposits)}
                      </td>
                      <td className="py-2 px-4 border-b text-right">
                        {formatCurrency(month.withdrawals)}
                      </td>
                      <td className="py-2 px-4 border-b text-right">
                        {formatCurrency(month.transfers)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User Retention Analysis */}
      <div className="mt-6">
        <UserRetentionChart />
      </div>

      {/* Loan Analytics Section */}
      <div className="mt-12 border-t pt-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Loan Analytics</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <label className="mr-2 text-sm">Loan Type:</label>
              <select
                className="border rounded p-2"
                value={activeLoanFilter}
                onChange={(e) =>
                  setActiveLoanFilter(e.target.value as LoanType | "all")
                }
              >
                <option value="all">All Types</option>
                <option value="personal">Personal</option>
                <option value="business">Business</option>
                <option value="auto">Auto</option>
                <option value="building">Building</option>
                <option value="education">Education</option>
                <option value="device">Device</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="festive">Festive</option>
                <option value="special">Special</option>
              </select>
            </div>
            <div className="flex items-center">
              <label className="mr-2 text-sm">Status:</label>
              <select
                className="border rounded p-2"
                value={activeStatusFilter}
                onChange={(e) =>
                  setActiveStatusFilter(e.target.value as LoanStatus | "all")
                }
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
                <option value="defaulted">Defaulted</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loan Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm text-gray-500">Active Loans</h3>
            <p className="text-2xl font-bold">{loanStats.activeLoans}</p>
            <p className="text-xs text-gray-500 mt-1">
              Total: {loanStats.totalLoans}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm text-gray-500">Total Disbursed</h3>
            <p className="text-2xl font-bold">
              {formatCurrency(loanStats.totalDisbursed)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm text-gray-500">Average Loan</h3>
            <p className="text-2xl font-bold">
              {formatCurrency(loanStats.averageLoanAmount)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm text-gray-500">Repayment Rate</h3>
            <p className="text-2xl font-bold">
              {loanStats.onTimePaymentRate.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm text-gray-500">Pending Approvals</h3>
            <p className="text-2xl font-bold">{loanStats.pendingApprovals}</p>
          </div>
        </div>

        {/* Loan Analytics Charts - First Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Loan Type Distribution */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">
              Loan Type Distribution
            </h2>
            {isLoanDataLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading loan data...</div>
              </div>
            ) : getLoanTypeDistribution().length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getLoanTypeDistribution()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="type"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {getLoanTypeDistribution().map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} loans`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-gray-500 mb-2">
                  No loan data available yet
                </div>
                <p className="text-sm text-gray-400 text-center max-w-xs">
                  This chart will automatically populate when loan applications
                  are processed in the system.
                </p>
              </div>
            )}
          </div>

          {/* Loan Status Distribution */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">
              Loan Status Distribution
            </h2>
            {isLoanDataLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading loan data...</div>
              </div>
            ) : getLoanStatusDistribution().length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getLoanStatusDistribution()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value} loans`} />
                  <Legend />
                  <Bar dataKey="count" name="Count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-gray-500 mb-2">
                  No loan data available yet
                </div>
                <p className="text-sm text-gray-400 text-center max-w-xs">
                  This chart will display the distribution of loan statuses when
                  loans are processed in the system.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Loan Analytics Charts - Second Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Loan Applications Timeline */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">
              Loan Applications Timeline
            </h2>
            {isLoanDataLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading loan data...</div>
              </div>
            ) : getLoanApplicationsOverTime().length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getLoanApplicationsOverTime()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#82ca9d"
                    tickFormatter={(value) => formatCurrency(Number(value))}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "amount")
                        return formatCurrency(Number(value));
                      return value;
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    yAxisId="left"
                    dataKey="count"
                    name="Applications"
                    stroke="#8884d8"
                  />
                  <Line
                    type="monotone"
                    yAxisId="right"
                    dataKey="amount"
                    name="Amount"
                    stroke="#82ca9d"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-gray-500 mb-2">
                  No application data available yet
                </div>
                <p className="text-sm text-gray-400 text-center max-w-xs">
                  This timeline will track loan applications and their amounts
                  over time.
                </p>
              </div>
            )}
          </div>

          {/* Loan Performance */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">
              Loan Payment Performance
            </h2>
            {isLoanDataLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading loan data...</div>
              </div>
            ) : loanStats.activeLoans > 0 || filteredLoanPayments.length > 0 ? (
              <div className="h-64 flex flex-col">
                <ResponsiveContainer width="100%" height="70%">
                  <PieChart>
                    <Pie
                      data={getLoanPerformanceData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {getLoanPerformanceData().map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index === 0 ? "#4ade80" : "#f87171"}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-around items-center mt-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Total Repaid</div>
                    <div className="text-xl font-semibold">
                      {formatCurrency(loanStats.totalRepaid)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Payments</div>
                    <div className="text-xl font-semibold">
                      {filteredLoanPayments.length}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-gray-500 mb-2">
                  No payment data available yet
                </div>
                <p className="text-sm text-gray-400 text-center max-w-xs">
                  This chart will track on-time versus late payments as loan
                  repayments occur.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Loan Analytics Table - Average Loan Amount By Type */}
        <div className="mt-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">
              Average Loan Amount By Type
            </h2>
            {isLoanDataLoading ? (
              <div className="flex items-center justify-center h-24">
                <div className="text-gray-500">Loading loan data...</div>
              </div>
            ) : getAverageLoanAmountByType().length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-2 px-4 border-b text-left">
                        Loan Type
                      </th>
                      <th className="py-2 px-4 border-b text-right">
                        Average Amount
                      </th>
                      <th className="py-2 px-4 border-b text-right">
                        Distribution
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getAverageLoanAmountByType().map(
                      (item: any, index: number) => (
                        <tr
                          key={index}
                          className={
                            index % 2 === 0 ? "bg-gray-50" : "bg-white"
                          }
                        >
                          <td className="py-2 px-4 border-b">{item.type}</td>
                          <td className="py-2 px-4 border-b text-right">
                            {formatCurrency(item.average)}
                          </td>
                          <td className="py-2 px-4 border-b">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div
                                className="bg-primary-600 h-2.5 rounded-full"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (item.average /
                                      (loanStats.averageLoanAmount * 2)) *
                                      100
                                  )}%`,
                                }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-24 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-gray-500">No loan data available yet</div>
              </div>
            )}
          </div>
        </div>

        {/* Loan Records Table */}
        <div className="mt-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                Recent Loan Applications
              </h2>
              {filteredLoans.length > 0 && (
                <p className="text-sm text-gray-500">
                  Showing {Math.min(10, filteredLoans.length)} of{" "}
                  {filteredLoans.length} loans
                </p>
              )}
            </div>

            {isLoanDataLoading ? (
              <div className="flex items-center justify-center h-24">
                <div className="text-gray-500">Loading loan data...</div>
              </div>
            ) : filteredLoans.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-2 px-4 border-b text-left">
                        Applicant
                      </th>
                      <th className="py-2 px-4 border-b text-left">
                        Loan Type
                      </th>
                      <th className="py-2 px-4 border-b text-right">Amount</th>
                      <th className="py-2 px-4 border-b text-right">
                        Monthly Payment
                      </th>
                      <th className="py-2 px-4 border-b text-center">Status</th>
                      <th className="py-2 px-4 border-b text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLoans
                      .slice(0, 10)
                      .map((loan: any, index: number) => (
                        <tr
                          key={loan.id}
                          className={
                            index % 2 === 0 ? "bg-gray-50" : "bg-white"
                          }
                        >
                          <td className="py-2 px-4 border-b">
                            {loan.profiles?.full_name || "Unknown"}
                          </td>
                          <td className="py-2 px-4 border-b">
                            {getLoanTypeLabel(loan.loan_type)}
                          </td>
                          <td className="py-2 px-4 border-b text-right">
                            {formatCurrency(loan.amount)}
                          </td>
                          <td className="py-2 px-4 border-b text-right">
                            {formatCurrency(loan.monthly_payment)}
                          </td>
                          <td className="py-2 px-4 border-b text-center">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                loan.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : loan.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : loan.status === "completed"
                                  ? "bg-blue-100 text-blue-800"
                                  : loan.status === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : loan.status === "defaulted"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {loan.status.charAt(0).toUpperCase() +
                                loan.status.slice(1)}
                            </span>
                          </td>
                          <td className="py-2 px-4 border-b text-sm">
                            {format(
                              parseISO(loan.application_date),
                              "MMM dd, yyyy"
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-24 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-gray-500">No loan applications yet</div>
                <p className="text-sm text-gray-400 text-center max-w-xs mt-1">
                  This table will show recent loan applications when they are
                  submitted.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
