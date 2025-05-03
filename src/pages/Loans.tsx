import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Car,
  CreditCard,
  Gift,
  GraduationCap,
  LayoutGrid,
  ShieldCheck,
  Smartphone,
  CheckCircle,
  ArrowRight,
  Bike,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface LoanType {
  id: string;
  title: string;
  description: string;
  icon: JSX.Element;
  maxAmount: string;
  term: string;
  features: string[];
  requirements: string[];
}

export default function Loans() {
  const { profile } = useAuth();
  const [activeLoanType, setActiveLoanType] = useState<string | null>(null);
  const [loanAmount, setLoanAmount] = useState(0);
  const [loanTerm, setLoanTerm] = useState(12);
  const interestRate = 0.01; // 1% annual interest rate

  const calculateLoan = () => {
    // Monthly interest rate
    const monthlyRate = interestRate / 12;

    // Monthly payment calculation using PMT formula
    const monthlyPayment =
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, loanTerm)) /
      (Math.pow(1 + monthlyRate, loanTerm) - 1);

    const totalPayment = monthlyPayment * loanTerm;
    const totalInterest = totalPayment - loanAmount;

    return {
      monthlyPayment: isNaN(monthlyPayment) ? 0 : monthlyPayment,
      totalInterest: isNaN(totalInterest) ? 0 : totalInterest,
      totalPayment: isNaN(totalPayment) ? 0 : totalPayment,
    };
  };

  const { monthlyPayment, totalInterest, totalPayment } = calculateLoan();

  const loanTypes: LoanType[] = [
    {
      id: "business",
      title: "Business Loans",
      description:
        "Support for small business growth with competitive 1% interest rate",
      icon: <LayoutGrid className="w-6 h-6" />,
      maxAmount: "D500,000",
      term: "Up to 36 months",
      features: [
        "Flexible repayment schedule",
        "No early repayment penalties",
        "Quick approval process",
        "Business advisory support",
      ],
      requirements: [
        "Business registration documents",
        "Financial statements",
        "Tax clearance certificate",
        "Collateral documentation",
      ],
    },
    {
      id: "auto",
      title: "Auto Loans",
      description: "Finance your dream car with our low-interest auto loans",
      icon: <Car className="w-6 h-6" />,
      maxAmount: "D300,000",
      term: "Up to 48 months",
      features: [
        "Competitive interest rates",
        "Quick approval process",
        "Flexible down payment options",
        "Comprehensive insurance support",
      ],
      requirements: [
        "Valid driver's license",
        "Vehicle information",
        "Insurance quote",
        "Income verification",
      ],
    },
    {
      id: "personal",
      title: "Consumer Loans",
      description: "Quick personal loans for your immediate needs",
      icon: <CreditCard className="w-6 h-6" />,
      maxAmount: "D100,000",
      term: "Up to 24 months",
      features: [
        "Same-day approval possible",
        "No collateral required",
        "Fixed interest rate",
        "Flexible use of funds",
      ],
      requirements: [
        "Government ID",
        "Recent pay slips",
        "Bank statements",
        "Proof of residence",
      ],
    },
    {
      id: "festive",
      title: "Festive Loans",
      description: "Special loans for holidays and celebrations",
      icon: <Gift className="w-6 h-6" />,
      maxAmount: "D50,000",
      term: "Up to 12 months",
      features: [
        "Quick processing",
        "Special seasonal rates",
        "Flexible repayment options",
        "No processing fee",
      ],
      requirements: [
        "Employment verification",
        "Recent pay slip",
        "Valid ID",
        "Utility bill",
      ],
    },
    {
      id: "building",
      title: "Staff Building Loans",
      description: "Build or renovate your home with our exclusive staff loans",
      icon: <Building2 className="w-6 h-6" />,
      maxAmount: "D1,000,000",
      term: "Up to 180 months",
      features: [
        "Lowest interest rate",
        "Extended repayment period",
        "Construction advisory",
        "Flexible disbursement",
      ],
      requirements: [
        "Property documents",
        "Building permits",
        "Contractor quotes",
        "Employment verification",
      ],
    },
    {
      id: "device",
      title: "Mobile Device Loans",
      description: "Stay connected with our device financing options",
      icon: <Smartphone className="w-6 h-6" />,
      maxAmount: "D25,000",
      term: "Up to 12 months",
      features: [
        "Instant approval",
        "All brands available",
        "Insurance included",
        "Free device setup",
      ],
      requirements: [
        "Valid ID",
        "Recent pay slip",
        "Device quote",
        "Employment letter",
      ],
    },
    {
      id: "motorcycle",
      title: "Motorcycle Loans",
      description: "Affordable financing for two-wheelers",
      icon: <Bike className="w-6 h-6" />,
      maxAmount: "D50,000",
      term: "Up to 24 months",
      features: [
        "Quick processing",
        "Low down payment",
        "Insurance assistance",
        "Flexible terms",
      ],
      requirements: [
        "Valid license",
        "Vehicle quote",
        "Income proof",
        "Insurance quote",
      ],
    },
    {
      id: "education",
      title: "Education Loans",
      description: "Invest in your future with our education financing",
      icon: <GraduationCap className="w-6 h-6" />,
      maxAmount: "D200,000",
      term: "Up to 48 months",
      features: [
        "Grace period options",
        "Study materials covered",
        "Flexible repayment",
        "Career guidance",
      ],
      requirements: [
        "Admission letter",
        "Academic records",
        "Institution details",
        "Guardian documents",
      ],
    },
    {
      id: "special",
      title: "Staff Special Loans",
      description: "Exclusive loans for NAWEC employees",
      icon: <ShieldCheck className="w-6 h-6" />,
      maxAmount: "D150,000",
      term: "Up to 36 months",
      features: [
        "Priority processing",
        "Highest approval rate",
        "Salary-based limit",
        "Zero processing fee",
      ],
      requirements: [
        "Staff ID",
        "Department approval",
        "Recent pay slip",
        "Service length proof",
      ],
    },
  ];

  const getLoan = (id: string) => loanTypes.find((loan) => loan.id === id);

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 py-16 mb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">
              Unlock Your Dreams with 1% Interest
            </h1>
            <p className="text-xl text-primary-100 max-w-2xl mx-auto">
              Choose from our range of flexible loan options designed to meet
              your needs with the most competitive rates in The Gambia.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Loan Calculator */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-12">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Loan Calculator
              </h2>
              <p className="text-gray-600 mb-6">
                Estimate your monthly payments and see how affordable our loans
                are with just 1% interest rate.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loan Amount (D)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter amount"
                    value={loanAmount || ""}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loan Term (Months)
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(Number(e.target.value))}
                  >
                    <option value="12">12 months</option>
                    <option value="24">24 months</option>
                    <option value="36">36 months</option>
                    <option value="48">48 months</option>
                    <option value="60">60 months</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Payment Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Monthly Payment:</span>
                  <span className="text-lg font-semibold text-gray-900">
                    D{monthlyPayment.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Interest Rate:</span>
                  <span className="text-lg font-semibold text-primary-600">
                    1.00%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Interest:</span>
                  <span className="text-lg font-semibold text-gray-900">
                    D{totalInterest.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Payment:</span>
                  <span className="text-lg font-semibold text-gray-900">
                    D{totalPayment.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loan Types Grid */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
          style={{ opacity: 0, animation: "fade-in-up 0.5s ease-out forwards" }}
        >
          {loanTypes.map((loan, index) => (
            <button
              key={loan.id}
              onClick={() => setActiveLoanType(loan.id)}
              className={`text-left p-6 rounded-xl border transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                activeLoanType === loan.id
                  ? "border-primary-500 ring-2 ring-primary-500 bg-primary-50"
                  : "border-gray-200 hover:border-primary-300 bg-white"
              }`}
              style={{
                animationDelay: `${index * 0.1}s`,
                opacity: 0,
                animation: "fade-in-up 0.5s ease-out forwards",
              }}
            >
              <div className="flex items-start">
                <div
                  className={`p-3 rounded-lg transition-colors duration-300 ${
                    activeLoanType === loan.id
                      ? "bg-primary-100 text-primary-600"
                      : "bg-gray-100 text-gray-600 group-hover:bg-primary-50 group-hover:text-primary-500"
                  }`}
                >
                  {loan.icon}
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {loan.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {loan.description}
                  </p>
                  <div className="mt-2 text-primary-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Learn more →
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Selected Loan Details */}
        {activeLoanType && (
          <div
            className="bg-white rounded-xl shadow-sm overflow-hidden mb-12 transition-all duration-500"
            style={{
              opacity: 0,
              animation: "fade-in-up 0.5s ease-out forwards",
              animationDelay: "0.2s",
            }}
          >
            <div className="border-b border-gray-200">
              <div className="px-6 py-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {getLoan(activeLoanType)?.title}
                </h2>
                <p className="text-gray-600 mt-1">
                  {getLoan(activeLoanType)?.description}
                </p>
              </div>
            </div>
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Loan Details
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <div className="w-40 text-gray-600">Maximum Amount:</div>
                      <div className="font-medium text-gray-900">
                        {getLoan(activeLoanType)?.maxAmount}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-40 text-gray-600">Loan Term:</div>
                      <div className="font-medium text-gray-900">
                        {getLoan(activeLoanType)?.term}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-40 text-gray-600">Interest Rate:</div>
                      <div className="font-medium text-primary-600">1.00%</div>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-4">
                    Key Features
                  </h3>
                  <ul className="space-y-2">
                    {getLoan(activeLoanType)?.features.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-center text-gray-600"
                      >
                        <CheckCircle className="w-5 h-5 text-primary-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Requirements
                  </h3>
                  <ul className="space-y-2">
                    {getLoan(activeLoanType)?.requirements.map((req, index) => (
                      <li
                        key={index}
                        className="flex items-center text-gray-600"
                      >
                        <CheckCircle className="w-5 h-5 text-primary-500 mr-2" />
                        {req}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    {profile ? (
                      <Link
                        to="/dashboard?action=apply-loan"
                        className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Apply Now
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Link>
                    ) : (
                      <Link
                        to="/register"
                        className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Register to Apply
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
