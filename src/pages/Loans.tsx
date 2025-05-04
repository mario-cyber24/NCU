import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Header from "../components/Header";
import { supabase } from "../lib/supabase";
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
  ChevronDown,
  BarChart3,
  Clock,
  Users,
  Star,
  AlertCircle,
  Percent,
  CalendarDays,
  BadgeCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

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
  const navigate = useNavigate();
  const [activeLoanType, setActiveLoanType] = useState<string | null>(null);
  const [loanAmount, setLoanAmount] = useState(100000);
  const [loanTerm, setLoanTerm] = useState(24);
  const [sliderFocus, setSliderFocus] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const interestRate = 0.01; // 1% annual interest rate

  const [searchParams] = useSearchParams();
  const loanTypeParam = searchParams.get("type");
  const [scrollPosition, setScrollPosition] = useState(0);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Track scroll position for parallax effects
  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Set active loan type from URL parameter
  useEffect(() => {
    if (loanTypeParam) {
      const validLoanType = loanTypes.find((loan) => loan.id === loanTypeParam);
      if (validLoanType) {
        setActiveLoanType(validLoanType.id);
      }
    }
  }, [loanTypeParam]);

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

  const handleLoanTypeSelect = (loanId: string) => {
    setActiveLoanType(loanId);
    setShowDropdown(false);

    // Scroll to loan options section
    const loanOptionsElement = document.getElementById("loan-options");
    if (loanOptionsElement) {
      loanOptionsElement.scrollIntoView({ behavior: "smooth" });
    }

    // Update URL with selected loan type
    navigate(`/loans?type=${loanId}`, { replace: true });
  };

  const getLoan = (id: string) => loanTypes.find((loan) => loan.id === id);

  const renderLoanCalculator = () => {
    return (
      <div
        id="loan-calculator"
        className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100/80 mb-16"
      >
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 py-6 px-6 md:px-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center">
            <BarChart3 className="w-7 h-7 mr-3" />
            Loan Calculator
          </h2>
          <p className="text-primary-100 mt-2 max-w-2xl">
            Estimate your monthly payments and total cost with our
            industry-leading 1% interest rate.
          </p>
        </div>

        <div className="p-6 md:p-10 grid md:grid-cols-2 gap-10">
          <div>
            <div className="space-y-8">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Loan Amount
                  </label>
                  <div className="flex items-center">
                    <span className="w-4 h-4 text-gray-500 mr-1">D</span>
                    <input
                      type="number"
                      className="w-24 px-2 py-1 text-right border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(Number(e.target.value))}
                      min="10000"
                      max="1000000"
                      step="10000"
                    />
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="range"
                    className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${
                      sliderFocus === "amount" ? "slider-focus" : ""
                    }`}
                    min="10000"
                    max="1000000"
                    step="10000"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    onFocus={() => setSliderFocus("amount")}
                    onBlur={() => setSliderFocus(null)}
                  />

                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>D10,000</span>
                    <span>D1,000,000</span>
                  </div>

                  {/* Progress indicator */}
                  <div
                    className="absolute h-2 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg top-0 left-0"
                    style={{ width: `${(loanAmount / 1000000) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Loan Term
                  </label>
                  <div className="flex items-center">
                    <CalendarDays className="w-4 h-4 text-gray-500 mr-1" />
                    <span className="w-24 text-right font-semibold text-gray-700">
                      {loanTerm} Months
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="range"
                    className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${
                      sliderFocus === "term" ? "slider-focus" : ""
                    }`}
                    min="12"
                    max="180"
                    step="12"
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(Number(e.target.value))}
                    onFocus={() => setSliderFocus("term")}
                    onBlur={() => setSliderFocus(null)}
                  />

                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>12 Months</span>
                    <span>180 Months</span>
                  </div>

                  {/* Progress indicator */}
                  <div
                    className="absolute h-2 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg top-0 left-0"
                    style={{ width: `${(loanTerm / 180) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Interest Rate
                  </label>
                  <div className="flex items-center">
                    <Percent className="w-4 h-4 text-gray-500 mr-1" />
                    <span className="w-24 text-right font-semibold text-primary-600">
                      1.00%
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <div className="w-full h-2 bg-gray-200 rounded-lg">
                    <div
                      className="absolute h-2 bg-primary-500 rounded-lg top-0 left-0"
                      style={{ width: "10%" }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Industry Leading Rate</span>
                    <span className="text-right text-primary-600 font-medium">
                      Fixed Rate
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-gray-50 rounded-xl p-6 h-full border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <span className="w-5 h-5 mr-2 text-primary-500 font-bold">
                  D
                </span>
                Payment Summary
              </h3>

              <div className="space-y-6">
                {/* Visual chart for payment breakdown */}
                <div className="relative pt-6">
                  <div className="w-full h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full"
                      style={{ width: `${(loanAmount / totalPayment) * 100}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-xs mt-2">
                    <div>
                      <span className="block text-gray-500">Principal</span>
                      <span className="font-semibold text-gray-700">
                        D{loanAmount.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="block text-gray-500 text-right">
                        Interest
                      </span>
                      <span className="font-semibold text-primary-600">
                        D
                        {totalInterest.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Monthly payment display */}
                <div className="py-6 flex flex-col items-center justify-center border-t border-b border-gray-200">
                  <div className="text-gray-500 text-sm">Monthly Payment</div>
                  <div className="text-3xl md:text-4xl font-bold text-gray-900 my-2">
                    D
                    {monthlyPayment.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </div>
                  <div className="text-xs text-gray-500">
                    For {loanTerm} months
                  </div>
                </div>

                {/* Payment details */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Principal Amount:</span>
                    <span className="font-medium text-gray-900">
                      D{loanAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Interest Rate:</span>
                    <span className="font-medium text-primary-600">
                      1.00% (Annual)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Total Interest:</span>
                    <span className="font-medium text-gray-900">
                      D
                      {totalInterest.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Total Payment:</span>
                    <span className="font-medium text-gray-900">
                      D
                      {totalPayment.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </div>

                <button className="mt-4 w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center">
                  Apply Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLoanTypesGrid = () => {
    return (
      <div id="loan-options" className="mb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Choose Your Ideal Loan
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Select from our range of specialized loan products designed to meet
            your specific needs.
          </p>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          style={{ opacity: 0, animation: "fade-in-up 0.5s ease-out forwards" }}
        >
          {loanTypes.map((loan, index) => (
            <button
              key={loan.id}
              onClick={() => setActiveLoanType(loan.id)}
              className={`group text-left p-6 rounded-xl border transition-all duration-300 transform hover:scale-102 hover:shadow-xl ${
                activeLoanType === loan.id
                  ? "border-primary-500 ring-2 ring-primary-500/50 bg-primary-50"
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
                  <div
                    className={`mt-3 inline-flex items-center text-primary-600 text-sm font-medium 
                    ${
                      activeLoanType === loan.id
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    } 
                    transition-opacity duration-300`}
                  >
                    View details
                    <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>

              {/* Quick stat badges */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="bg-gray-50 py-2 px-3 rounded-lg">
                  <div className="text-xs text-gray-500">Max Amount</div>
                  <div className="font-semibold text-gray-900">
                    {loan.maxAmount}
                  </div>
                </div>
                <div className="bg-gray-50 py-2 px-3 rounded-lg">
                  <div className="text-xs text-gray-500">Term</div>
                  <div className="font-semibold text-gray-900">{loan.term}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderLoanComparison = () => {
    const popularLoans = ["personal", "business", "auto", "building"];
    const comparisonLoans = loanTypes.filter((loan) =>
      popularLoans.includes(loan.id)
    );

    return (
      <div className="mb-16 overflow-x-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Compare Loan Options
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Find the perfect loan that suits your specific needs and financial
            goals.
          </p>
        </div>

        <div className="min-w-[768px]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-4 px-6 text-left text-gray-500 font-medium">
                  Loan Type
                </th>
                <th className="py-4 px-6 text-left text-gray-500 font-medium">
                  Maximum Amount
                </th>
                <th className="py-4 px-6 text-left text-gray-500 font-medium">
                  Term
                </th>
                <th className="py-4 px-6 text-left text-gray-500 font-medium">
                  Interest Rate
                </th>
                <th className="py-4 px-6 text-left text-gray-500 font-medium">
                  Key Feature
                </th>
                <th className="py-4 px-6 text-left text-gray-500 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {comparisonLoans.map((loan) => (
                <tr
                  key={loan.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center">
                      <div className="p-2 mr-3 bg-primary-50 text-primary-600 rounded-lg">
                        {loan.icon}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {loan.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {loan.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-medium">{loan.maxAmount}</td>
                  <td className="py-4 px-6">{loan.term}</td>
                  <td className="py-4 px-6 font-medium text-primary-600">
                    1.00%
                  </td>
                  <td className="py-4 px-6">{loan.features[0]}</td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => setActiveLoanType(loan.id)}
                      className="px-4 py-2 bg-primary-50 text-primary-600 font-medium rounded-lg hover:bg-primary-100 transition-colors"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTestimonials = () => {
    const testimonials = [
      {
        name: "Fatou Jallow",
        role: "Small Business Owner",
        image:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&q=80",
        quote:
          "The business loan from NAWEC Credit Union helped me expand my shop and increase my inventory. The 1% interest rate is unbeatable!",
        rating: 5,
        loanType: "Business Loan",
      },
      {
        name: "Omar Ceesay",
        role: "Civil Servant",
        image:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&q=80",
        quote:
          "I was able to purchase my dream car with the auto loan. The application process was simple and the approval came within 24 hours.",
        rating: 5,
        loanType: "Auto Loan",
      },
      {
        name: "Isatou Sanneh",
        role: "Teacher",
        image:
          "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&q=80",
        quote:
          "The staff building loan has been a blessing for my family. We've built our home with very affordable monthly payments.",
        rating: 5,
        loanType: "Building Loan",
      },
    ];

    return (
      <div className="mb-20 overflow-hidden">
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary-50 text-primary-600 text-sm font-medium mb-4">
            <Star className="w-4 h-4 mr-1 text-amber-500" />
            <span>Success Stories</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            What Our Members Say
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Real experiences from people whose lives have been changed by our
            affordable loan products.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-xl shadow-xl border border-gray-100 transform transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl"
              style={{
                animationDelay: `${index * 0.2}s`,
                animation: "fade-in-up 0.6s ease-out forwards",
              }}
            >
              <div className="flex items-center mb-6">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-14 h-14 rounded-full object-cover mr-4"
                />
                <div>
                  <div className="font-semibold text-gray-900">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {testimonial.role}
                  </div>
                  <div className="flex mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < testimonial.rating
                            ? "text-amber-400"
                            : "text-gray-300"
                        }`}
                        fill={i < testimonial.rating ? "currentColor" : "none"}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <blockquote className="text-gray-700 mb-6">
                "{testimonial.quote}"
              </blockquote>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="text-sm text-primary-600 font-medium">
                  {testimonial.loanType}
                </div>
                <div className="text-xs text-gray-500">Verified Member</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCTA = () => {
    return (
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-8 md:p-12 shadow-xl overflow-hidden relative mb-12">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -left-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Apply for a Loan?
            </h2>
            <p className="text-primary-100 text-lg max-w-2xl">
              Take the first step towards your financial goals with our quick
              and easy application process. Our team is ready to assist you
              every step of the way.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              {profile ? (
                <Link
                  to="/dashboard?action=apply-loan"
                  className="px-8 py-4 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 shadow-lg shadow-primary-900/20 transition-all duration-300 flex items-center justify-center"
                >
                  Apply Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="px-8 py-4 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 shadow-lg shadow-primary-900/20 transition-all duration-300 flex items-center justify-center"
                  >
                    Register to Apply
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                  <Link
                    to="/login"
                    className="px-8 py-4 bg-primary-700 text-white border border-primary-400 font-semibold rounded-xl hover:bg-primary-800 transition-all duration-300 flex items-center justify-center"
                  >
                    Login
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="w-64 h-64 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <div className="w-56 h-56 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                <div className="w-44 h-44 bg-white rounded-full flex flex-col items-center justify-center shadow-xl">
                  <div className="text-5xl font-bold text-primary-600">1%</div>
                  <div className="text-primary-800 font-medium mt-2">
                    Interest Rate
                  </div>
                  <div className="text-xs text-primary-600 mt-1">
                    Industry Leading
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 h-[70vh] max-h-[800px] min-h-[500px] flex items-center justify-center">
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80')] opacity-10 bg-cover bg-center"
              style={{ transform: `translateY(${scrollPosition * 0.2}px)` }}
            />
            <div className="absolute inset-0 bg-primary-900/50" />

            <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl animate-blob" />
            <div className="absolute top-1/2 -right-20 w-80 h-80 bg-primary-400/20 rounded-full blur-3xl animate-blob animation-delay-2000" />
            <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-primary-300/20 rounded-full blur-3xl animate-blob animation-delay-4000" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 w-full">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary-800/50 backdrop-blur-sm border border-primary-600/50 text-primary-100 text-sm font-medium mb-6">
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span>Industry-Leading 1% Interest Rate</span>
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-primary-200">
                    Unlock Your Dreams
                  </span>
                  <br />
                  with Affordable Financing
                </h1>

                <p className="text-lg md:text-xl text-primary-100 max-w-xl mx-auto lg:mx-0 mb-8">
                  Choose from our range of flexible loan options designed to
                  meet your needs with the most competitive rates in The Gambia.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <a
                    href="#loan-calculator"
                    className="px-8 py-4 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 shadow-lg shadow-primary-900/20 transition-all duration-300 flex items-center justify-center"
                  >
                    Calculate Your Loan
                    <BarChart3 className="w-5 h-5 ml-2" />
                  </a>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="w-full px-8 py-4 bg-primary-700/50 backdrop-blur-sm border border-primary-500/50 text-white font-semibold rounded-xl hover:bg-primary-700/70 transition-all duration-300 flex items-center justify-center"
                    >
                      Explore Loan Types
                      <ChevronDown
                        className={`w-5 h-5 ml-2 transition-transform duration-300 ${
                          showDropdown ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Dropdown Menu */}
                    {showDropdown && (
                      <div
                        className="fixed left-0 right-0 mt-2 mx-auto w-72 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
                        style={{
                          zIndex: 1000,
                          maxHeight: "80vh",
                          overflowY: "auto",
                          top: "auto",
                        }}
                      >
                        {loanTypes.map((loan) => (
                          <button
                            key={loan.id}
                            onClick={() => handleLoanTypeSelect(loan.id)}
                            className="w-full flex items-center px-4 py-3 hover:bg-primary-50 transition-colors border-b border-gray-100 last:border-0"
                          >
                            <div className="p-2 mr-3 bg-primary-50 text-primary-600 rounded-lg">
                              {loan.icon}
                            </div>
                            <div className="text-left">
                              <div className="font-medium text-gray-900">
                                {loan.title}
                              </div>
                              <div className="text-xs text-gray-500 line-clamp-1">
                                {loan.description}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-12 grid grid-cols-3 gap-6 text-center">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm mb-2">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-white text-sm font-medium">
                      24-Hour Approval
                    </p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm mb-2">
                      <BadgeCheck className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-white text-sm font-medium">
                      100% Transparent
                    </p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm mb-2">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-white text-sm font-medium">
                      5000+ Members
                    </p>
                  </div>
                </div>
              </div>

              {/* Credit Union 3D Logo instead of credit card */}
              <div className="hidden lg:flex justify-center items-center perspective-1000">
                <div className="relative w-[400px] h-[300px] cu-logo-3d transform rotate-y-15 rotate-x-15 transition-transform duration-500 hover:rotate-y-0 hover:rotate-x-0">
                  {/* Back side */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700 shadow-2xl p-6 flex flex-col justify-between transform-style-3d rotate-y-180 backface-hidden">
                    <div className="flex flex-col items-center justify-center h-full space-y-6">
                      <div className="text-center">
                        <p className="text-white font-semibold text-xl">
                          NAWEC CO-OPERATIVE CREDIT UNION
                        </p>
                        <p className="text-primary-100 text-sm">
                          Serving our members since 1995
                        </p>
                      </div>

                      <div className="h-24 w-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className="h-16 w-16 text-white"
                          stroke="currentColor"
                        >
                          <circle cx="12" cy="12" r="10" strokeWidth="2" />
                          <path d="M7 12h10M12 7v10" strokeWidth="2" />
                        </svg>
                      </div>

                      <div className="text-center text-white">
                        <p className="text-sm font-medium">
                          Financial Empowerment
                        </p>
                        <p className="text-primary-100 text-xs mt-1">
                          Together we rise
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Front side */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 shadow-2xl flex flex-col items-center justify-center transform-style-3d backface-hidden">
                    <div className="flex flex-col items-center space-y-6 p-6">
                      <div className="w-28 h-28 rounded-full bg-white flex items-center justify-center relative">
                        <div className="absolute inset-0 rounded-full border-4 border-primary-500"></div>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          className="w-16 h-16 text-primary-600"
                        >
                          <path
                            fill="currentColor"
                            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                          />
                        </svg>
                      </div>

                      <div className="text-center">
                        <h3 className="text-white font-bold text-2xl">
                          NAWEC Credit Union
                        </h3>
                        <p className="text-primary-100 mt-1">
                          People Helping People
                        </p>
                      </div>

                      <div className="w-full max-w-[270px] p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                        <div className="text-center">
                          <p className="text-white text-sm font-medium mb-1">
                            Industry Leading Rate
                          </p>
                          <p className="text-white text-3xl font-bold">
                            1% Interest
                          </p>
                          <p className="text-white/80 text-sm mt-1">
                            Building Futures Together
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-2 text-white/80 text-sm">
                        <BadgeCheck className="w-4 h-4" />
                        <span>Member-owned</span>
                        <span>•</span>
                        <span>Not-for-profit</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 320"
            className="w-full h-auto"
          >
            <path
              fill="#f9fafb"
              fillOpacity="1"
              d="M0,288L48,272C96,256,192,224,288,213.3C384,203,480,213,576,229.3C672,245,768,267,864,261.3C960,256,1056,224,1152,208C1248,192,1344,192,1392,192L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            ></path>
          </svg>
        </div>
      </div>

      <div className="relative z-10 bg-gray-50 pt-0 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 -mt-10 mb-16">
            <div className="bg-white rounded-xl p-6 shadow-xl shadow-gray-200/50 border border-gray-100 transform transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary-50 text-primary-600 mb-4">
                <Percent className="w-6 h-6" />
              </div>
              <div className="text-3xl font-bold text-gray-900">1%</div>
              <div className="text-sm text-gray-600 mt-1">Interest Rate</div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-xl shadow-gray-200/50 border border-gray-100 transform transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-green-50 text-green-600 mb-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="text-3xl font-bold text-gray-900">24h</div>
              <div className="text-sm text-gray-600 mt-1">Approval Time</div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-xl shadow-gray-200/50 border border-gray-100 transform transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-50 text-blue-600 mb-4">
                <span className="font-bold">D</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">1M+</div>
              <div className="text-sm text-gray-600 mt-1">Max Loan Amount</div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-xl shadow-gray-200/50 border border-gray-100 transform transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-amber-50 text-amber-600 mb-4">
                <Star className="w-6 h-6" />
              </div>
              <div className="text-3xl font-bold text-gray-900">5k+</div>
              <div className="text-sm text-gray-600 mt-1">Happy Members</div>
            </div>
          </div>

          {renderLoanCalculator()}
          {renderLoanTypesGrid()}
          {activeLoanType && (
            <div
              className="bg-white rounded-xl shadow-xl overflow-hidden mb-16 transition-all duration-500 border border-gray-100"
              style={{
                opacity: 0,
                animation: "fade-in-up 0.5s ease-out forwards",
                animationDelay: "0.2s",
              }}
            >
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 py-6 px-6 md:px-10">
                <h2 className="text-2xl md:text-3xl font-bold text-white">
                  {getLoan(activeLoanType)?.title}
                </h2>
                <p className="text-primary-100 mt-2 max-w-2xl">
                  {getLoan(activeLoanType)?.description}
                </p>
              </div>
              <div className="p-6 md:p-10">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                      <span className="font-bold w-5 h-5 mr-2 text-primary-500">
                        D
                      </span>
                      Loan Details
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                        <div className="w-40 text-gray-600">
                          Maximum Amount:
                        </div>
                        <div className="font-semibold text-gray-900">
                          {getLoan(activeLoanType)?.maxAmount}
                        </div>
                      </div>
                      <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                        <div className="w-40 text-gray-600">Loan Term:</div>
                        <div className="font-semibold text-gray-900">
                          {getLoan(activeLoanType)?.term}
                        </div>
                      </div>
                      <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                        <div className="w-40 text-gray-600">Interest Rate:</div>
                        <div className="font-semibold text-primary-600">
                          1.00%
                        </div>
                      </div>
                      <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                        <div className="w-40 text-gray-600">
                          Processing Time:
                        </div>
                        <div className="font-semibold text-gray-900">
                          24 Hours
                        </div>
                      </div>
                    </div>

                    <h3 className="text-xl font-semibold text-gray-900 mt-10 mb-6 flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2 text-primary-500" />
                      Key Features
                    </h3>
                    <ul className="space-y-3">
                      {getLoan(activeLoanType)?.features.map(
                        (feature, index) => (
                          <li
                            key={index}
                            className="flex items-center bg-green-50 p-3 rounded-lg border border-green-100"
                          >
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 mr-3">
                              <CheckCircle className="w-5 h-5" />
                            </div>
                            <span className="text-gray-700">{feature}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                      <AlertCircle className="w-5 h-5 mr-2 text-primary-500" />
                      Requirements
                    </h3>
                    <ul className="space-y-3 mb-10">
                      {getLoan(activeLoanType)?.requirements.map(
                        (req, index) => (
                          <li
                            key={index}
                            className="flex items-center bg-blue-50 p-3 rounded-lg border border-blue-100"
                          >
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 mr-3">
                              <CheckCircle className="w-5 h-5" />
                            </div>
                            <span className="text-gray-700">{req}</span>
                          </li>
                        )
                      )}
                    </ul>

                    <div className="bg-primary-50 rounded-xl p-6 border border-primary-100">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        Ready to apply?
                      </h4>
                      <p className="text-gray-600 text-sm mb-4">
                        Complete your application online in minutes and get a
                        decision typically within 24 hours.
                      </p>
                      {profile ? (
                        <Link
                          to="/dashboard?action=apply-loan"
                          className="w-full inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20"
                        >
                          Apply Now
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </Link>
                      ) : (
                        <Link
                          to="/register"
                          className="w-full inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20"
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
          {renderLoanComparison()}
          {renderTestimonials()}
          {renderCTA()}
        </div>
      </div>
    </>
  );
}
