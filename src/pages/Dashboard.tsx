import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAccountBalance, getRecentTransactions, getMonthlyTransactions } from '../lib/supabase';
import TransactionsList from '../components/ui/TransactionsList';
import StatCard from '../components/ui/StatCard';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
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
  AlertCircle
} from 'lucide-react';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [monthlyTransactions, setMonthlyTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const currentMonth = format(new Date(), 'MMMM');

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Fetch all data in parallel for better performance
      const [balanceData, recentTransactions, monthlyTxns] = await Promise.all([
        getAccountBalance(user.id),
        getRecentTransactions(user.id, 5),
        getMonthlyTransactions(user.id)
      ]);

      setBalance(balanceData);
      setTransactions(recentTransactions);
      setMonthlyTransactions(monthlyTxns);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    toast.success('Dashboard refreshed');
    setIsRefreshing(false);
  };

  // Calculate monthly statistics
  const monthlyIncome = monthlyTransactions
    .filter(t => t.type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const monthlyExpenses = monthlyTransactions
    .filter(t => t.type === 'withdrawal')
    .reduce((sum, t) => sum + t.amount, 0);

  // Navigation handlers for action buttons
  const handleDepositClick = () => navigate('/deposit');
  const handleTransferClick = () => navigate('/transfer');
  const handleBillsClick = () => navigate('/bills');
  const handleLoanClick = () => navigate('/loan');

  // Helper function for status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'pending':
        return <Clock size={16} className="text-amber-500" />;
      case 'failed':
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return <CheckCircle size={16} className="text-green-500" />;
    }
  };

  // Format date helper
  const formatTransactionDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy • h:mm a');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 pb-12">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 sm:p-8 text-white shadow-lg mt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'Friend'}! 👋
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
                isRefreshing ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              <RefreshCw size={18} className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
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

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
            <p className="text-sm text-gray-500">Your latest account activity</p>
          </div>
          <button 
            onClick={() => navigate('/transactions')}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            View All
          </button>
        </div>
        
        {isLoading ? (
          <div className="p-6 text-center">
            <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-primary-500" />
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatTransactionDate(transaction.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transaction.description || (transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {transaction.type === 'deposit' ? (
                        <span className="text-green-600 font-medium">+D{transaction.amount.toFixed(2)}</span>
                      ) : (
                        <span className="text-red-600 font-medium">-D{transaction.amount.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        {getStatusIcon(transaction.status || 'completed')}
                        <span className="ml-2 capitalize">{transaction.status || 'completed'}</span>
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