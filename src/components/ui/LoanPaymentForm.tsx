import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { AlertCircle, CheckCircle, ChevronRight, Loader2 } from "lucide-react";

interface Loan {
  id: string;
  loan_type: string;
  amount: number;
  interest_rate: number;
  term_months: number;
  monthly_payment: number;
  status: string;
  application_date: string;
  approval_date: string | null;
  total_interest: number;
  total_payment: number;
  remaining_balance: number;
}

interface LoanPaymentFormProps {
  loan: Loan;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function LoanPaymentForm({
  loan,
  onSuccess,
  onCancel,
}: LoanPaymentFormProps) {
  const { profile } = useAuth();
  const [paymentAmount, setPaymentAmount] = useState<number>(
    loan.monthly_payment
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      setError("You must be logged in to make a payment.");
      return;
    }

    if (paymentAmount <= 0) {
      setError("Payment amount must be greater than zero.");
      return;
    }

    if (paymentAmount > loan.remaining_balance) {
      setError(
        `Payment amount exceeds the remaining balance of D${loan.remaining_balance.toLocaleString()}.`
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      // 1. First, withdraw the payment amount from the user's account
      const { error: accountError } = await supabase.rpc(
        "decrement_account_balance",
        {
          user_id_input: profile.id,
          amount_input: paymentAmount,
        }
      );

      if (accountError) throw new Error("Insufficient funds in your account.");

      // 2. Create a loan payment record
      const { error: paymentError } = await supabase
        .from("loan_payments")
        .insert({
          loan_id: loan.id,
          amount: paymentAmount,
          payment_date: new Date().toISOString(),
          status: "completed",
        });

      if (paymentError) throw paymentError;

      // 3. Add a transaction record for the payment
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: profile.id,
          amount: paymentAmount,
          type: "withdrawal",
          description: `Loan payment - ${getLoanTypeLabel(loan.loan_type)}`,
          status: "completed",
        });

      if (transactionError) throw transactionError;

      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error making loan payment:", error);
      setError(error.message || "Failed to process payment");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h2>
          <p className="text-gray-600 mb-6">
            Your payment of D{paymentAmount.toLocaleString()} has been processed
            successfully.
          </p>
          <p className="text-gray-600 mb-6">
            Remaining balance: D
            {(loan.remaining_balance - paymentAmount).toLocaleString()}
          </p>
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Make a Loan Payment
      </h2>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-700">Loan Type:</span>
            <span className="font-medium text-gray-900">
              {getLoanTypeLabel(loan.loan_type)}
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-700">Original Amount:</span>
            <span className="font-medium text-gray-900">
              D{loan.amount.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-700">Monthly Payment:</span>
            <span className="font-medium text-gray-900">
              D{loan.monthly_payment.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-700">Remaining Balance:</span>
            <span className="font-bold text-primary-600">
              D{loan.remaining_balance.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Amount (D)
            </label>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
              min="1"
              max={loan.remaining_balance}
              step="1"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />

            <div className="flex justify-between mt-2">
              <button
                type="button"
                onClick={() => setPaymentAmount(loan.monthly_payment)}
                className="text-sm text-primary-600 font-medium hover:text-primary-700"
              >
                Pay minimum (D{loan.monthly_payment.toLocaleString()})
              </button>
              <button
                type="button"
                onClick={() => setPaymentAmount(loan.remaining_balance)}
                className="text-sm text-primary-600 font-medium hover:text-primary-700"
              >
                Pay in full (D{loan.remaining_balance.toLocaleString()})
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Make Payment
                  <ChevronRight className="w-5 h-5 ml-1" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
