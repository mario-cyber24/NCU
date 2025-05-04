import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { AlertCircle, CheckCircle, ChevronRight, Loader2 } from "lucide-react";

interface LoanApplicationFormProps {
  initialLoanType?: string;
  initialAmount?: number;
  initialTerm?: number;
  onSuccess?: (loanId: string) => void;
  onCancel?: () => void;
}

export default function LoanApplicationForm({
  initialLoanType = "personal",
  initialAmount = 100000,
  initialTerm = 24,
  onSuccess,
  onCancel,
}: LoanApplicationFormProps) {
  const { profile } = useAuth();
  const interestRate = 0.01; // 1% annual interest rate

  const [loanType, setLoanType] = useState(initialLoanType);
  const [amount, setAmount] = useState(initialAmount);
  const [term, setTerm] = useState(initialTerm);
  const [purpose, setPurpose] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [existingLoans, setExistingLoans] = useState("no");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const loanTypes = [
    { id: "personal", label: "Personal Loan" },
    { id: "business", label: "Business Loan" },
    { id: "auto", label: "Auto Loan" },
    { id: "building", label: "Building Loan" },
    { id: "education", label: "Education Loan" },
    { id: "device", label: "Device Loan" },
    { id: "motorcycle", label: "Motorcycle Loan" },
    { id: "festive", label: "Festive Loan" },
    { id: "special", label: "Staff Special Loan" },
  ];

  const calculateLoan = () => {
    // Monthly interest rate
    const monthlyRate = interestRate / 12;

    // Monthly payment calculation using PMT formula
    const monthlyPayment =
      (amount * monthlyRate * Math.pow(1 + monthlyRate, term)) /
      (Math.pow(1 + monthlyRate, term) - 1);

    const totalPayment = monthlyPayment * term;
    const totalInterest = totalPayment - amount;

    return {
      monthlyPayment: isNaN(monthlyPayment) ? 0 : monthlyPayment,
      totalInterest: isNaN(totalInterest) ? 0 : totalInterest,
      totalPayment: isNaN(totalPayment) ? 0 : totalPayment,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      setError("You must be logged in to apply for a loan.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { monthlyPayment, totalInterest, totalPayment } = calculateLoan();

      // Insert the loan application into the database
      const { data, error } = await supabase
        .from("loans")
        .insert({
          user_id: profile.id,
          loan_type: loanType,
          amount: amount,
          interest_rate: interestRate,
          term_months: term,
          monthly_payment: monthlyPayment,
          status: "pending",
          application_date: new Date().toISOString(),
          total_interest: totalInterest,
          total_payment: totalPayment,
          remaining_balance: amount,
          // Additional fields from the form
          purpose: purpose,
          employment_status: employmentStatus,
          monthly_income: monthlyIncome,
          existing_loans: existingLoans,
        })
        .select("id")
        .single();

      if (error) throw error;

      setSuccess(true);
      if (onSuccess && data.id) onSuccess(data.id);
    } catch (error: any) {
      setError(error.message || "Failed to submit loan application");
    } finally {
      setLoading(false);
    }
  };

  const { monthlyPayment } = calculateLoan();

  if (success) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 max-w-2xl mx-auto">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Application Submitted!
          </h2>
          <p className="text-gray-600 mb-6">
            Your loan application has been received. We'll review it and get
            back to you within 24 hours.
          </p>
          <button
            onClick={() => (onSuccess ? onSuccess("success") : null)}
            className="px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            View My Applications
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Loan Application
      </h2>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loan Type
            </label>
            <select
              value={loanType}
              onChange={(e) => setLoanType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              {loanTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loan Amount (D)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min="10000"
              max="1000000"
              step="10000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
            <div className="mt-2 flex justify-between text-sm text-gray-500">
              <span>Min: D10,000</span>
              <span>Max: D1,000,000</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Term (Months)
            </label>
            <select
              value={term}
              onChange={(e) => setTerm(Number(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="12">12 months (1 year)</option>
              <option value="24">24 months (2 years)</option>
              <option value="36">36 months (3 years)</option>
              <option value="48">48 months (4 years)</option>
              <option value="60">60 months (5 years)</option>
              <option value="120">120 months (10 years)</option>
              <option value="180">180 months (15 years)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Purpose of Loan
            </label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={3}
              placeholder="Please provide details about how you plan to use this loan"
              required
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employment Status
            </label>
            <select
              value={employmentStatus}
              onChange={(e) => setEmploymentStatus(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="">Select your employment status</option>
              <option value="full-time">Full-time employed</option>
              <option value="part-time">Part-time employed</option>
              <option value="self-employed">Self-employed</option>
              <option value="business-owner">Business owner</option>
              <option value="unemployed">Unemployed</option>
              <option value="retired">Retired</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Income (D)
            </label>
            <input
              type="text"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="10000"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Do you have any existing loans?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="existing-loans"
                  value="yes"
                  checked={existingLoans === "yes"}
                  onChange={() => setExistingLoans("yes")}
                  className="mr-2"
                />
                Yes
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="existing-loans"
                  value="no"
                  checked={existingLoans === "no"}
                  onChange={() => setExistingLoans("no")}
                  className="mr-2"
                />
                No
              </label>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700">Monthly Payment:</span>
              <span className="font-bold text-gray-900">
                D
                {monthlyPayment.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700">Interest Rate:</span>
              <span className="font-medium text-primary-600">
                1.00% (Annual)
              </span>
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
                  Submit Application
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
