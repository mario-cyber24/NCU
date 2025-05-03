import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'transfer';
  description: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  method?: string | null;
}

interface TransactionsListProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

export default function TransactionsList({ transactions, isLoading = false }: TransactionsListProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center px-4 py-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-full loading-shimmer mr-3"></div>
            <div className="flex-1">
              <div className="h-4 loading-shimmer rounded w-3/4 mb-2"></div>
              <div className="h-3 loading-shimmer rounded w-1/2"></div>
            </div>
            <div className="h-6 loading-shimmer rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No transactions found</p>
      </div>
    );
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="text-green-500" />;
      case 'withdrawal':
        return <ArrowUpRight className="text-red-500" />;
      case 'transfer':
        return <ArrowLeftRight className="text-blue-500" />;
      default:
        return <ArrowLeftRight className="text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-success">Completed</span>;
      case 'pending':
        return <span className="badge badge-warning">Pending</span>;
      case 'failed':
        return <span className="badge badge-danger">Failed</span>;
      default:
        return null;
    }
  };

  return (
    <div className="overflow-hidden rounded-lg">
      {transactions.map((transaction) => (
        <div 
          key={transaction.id}
          className="flex items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center mr-3">
            {getTransactionIcon(transaction.type)}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center">
              <h4 className="text-sm font-medium text-gray-900">{transaction.description}</h4>
              <div className="ml-2">
                {getStatusBadge(transaction.status)}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {format(new Date(transaction.created_at), 'MMM d, yyyy • h:mm a')}
              {transaction.method && ` • ${transaction.method}`}
            </p>
          </div>
          
          <div className={`text-right font-medium ${
            transaction.type === 'deposit' ? 'text-green-600' : 
            transaction.type === 'withdrawal' ? 'text-red-600' : 'text-gray-700'
          }`}>
            {transaction.type === 'deposit' ? '+ ' : transaction.type === 'withdrawal' ? '- ' : ''}
            D{transaction.amount.toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}