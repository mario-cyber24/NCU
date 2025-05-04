import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getAccountBalance } from "../lib/supabase";
import {
  Phone,
  CreditCard,
  Landmark,
  Clock,
  ArrowDown,
  Info,
} from "lucide-react";

export default function Deposit() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [activeTab, setActiveTab] = useState("wave");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
      .format(amount)
      .replace(/^/, "D");
  };

  useEffect(() => {
    const fetchBalance = async () => {
      if (!user) return;

      try {
        // Get account balance
        const accountBalance = await getAccountBalance(user.id);
        setBalance(accountBalance);
      } catch (error) {
        console.error("Error fetching balance:", error);
      }
    };

    fetchBalance();
  }, [user]);

  const depositMethods = [
    {
      id: "wave",
      name: "WAVE Mobile Money",
      icon: <Phone size={20} />,
      color: "bg-blue-500",
      fee: "1.5%",
      processing: "Instant",
      availability: "24/7",
    },
    {
      id: "aps",
      name: "APS Mobile Money",
      icon: <CreditCard size={20} />,
      color: "bg-green-500",
      fee: "1%",
      processing: "Within 1 hour",
      availability: "24/7",
    },
    {
      id: "bank",
      name: "Bank Transfer",
      icon: <Landmark size={20} />,
      color: "bg-purple-500",
      fee: "Free",
      processing: "1-2 business days",
      availability: "Business hours",
    },
  ];

  const waveInstructions = [
    "Open your WAVE Mobile Money app",
    'Select "Send Money" option',
    "Enter our business number: +220 7777 0001",
    "Enter the amount you want to deposit",
    "Include your account number as the reference",
    "Confirm the transaction with your PIN",
    "You will receive an SMS confirmation",
    "Your account will be credited automatically",
  ];

  const apsInstructions = [
    "Open your APS Mobile Money app",
    'Select "Payments" from the menu',
    "Enter our merchant code: NAWEC2025",
    "Enter the amount you want to deposit",
    "Enter your full name and account number in the reference field",
    "Authorize the transaction",
    "Keep the confirmation receipt",
    "Your account will be credited within 1 hour",
  ];

  const bankInstructions = [
    "Visit any Trust Bank branch in The Gambia",
    "Fill out a deposit slip with our account details",
    "Account Name: NAWEC Credit Union",
    "Account Number: 1102003566",
    "Bank: Trust Bank Gambia",
    "Include your full name and account number as reference",
    "Keep your deposit receipt",
    "Your account will be credited within 1-2 business days",
  ];

  const getInstructions = () => {
    switch (activeTab) {
      case "wave":
        return waveInstructions;
      case "aps":
        return apsInstructions;
      case "bank":
        return bankInstructions;
      default:
        return waveInstructions;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deposit Funds</h1>
          <p className="mt-1 text-sm text-gray-500">
            Choose a method to add money to your account
          </p>
        </div>
        <div className="mt-3 md:mt-0 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
          <span className="text-sm text-gray-500">Current Balance:</span>
          <span className="ml-2 font-semibold text-gray-900">
            {formatCurrency(balance)}
          </span>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8 border-l-4 border-primary-500">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Info size={24} className="text-primary-500" />
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Important Information
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              When making deposits, always ensure you include your account
              details as reference to ensure your deposit is properly credited.
            </p>
            <div className="mt-3 bg-gray-50 p-3 rounded-md border border-gray-200">
              <p className="text-sm font-medium text-gray-700">
                Your Account Reference:
              </p>
              <p className="text-lg font-bold text-primary-700 mt-1">
                {user?.id.substring(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Deposit methods tabs */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
        <div className="border-b border-gray-200">
          <div className="flex">
            {depositMethods.map((method) => (
              <button
                key={method.id}
                className={`flex-1 text-center py-4 px-4 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === method.id
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                onClick={() => setActiveTab(method.id)}
              >
                <div className="flex items-center justify-center">
                  <div
                    className={`w-8 h-8 rounded-full ${method.color} flex items-center justify-center text-white mr-2`}
                  >
                    {method.icon}
                  </div>
                  <span>{method.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Method details */}
        <div className="p-6">
          <div className="flex flex-wrap md:flex-nowrap gap-6">
            <div className="w-full md:w-1/3 mb-6 md:mb-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {depositMethods.find((m) => m.id === activeTab)?.name} Details
              </h3>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center mb-4">
                  <div
                    className={`w-10 h-10 rounded-full ${
                      depositMethods.find((m) => m.id === activeTab)?.color
                    } flex items-center justify-center text-white mr-3`}
                  >
                    <ArrowDown size={20} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Deposit Method
                    </h4>
                    <p className="text-sm text-gray-600">
                      {depositMethods.find((m) => m.id === activeTab)?.name}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex">
                    <div className="w-24 flex-shrink-0 text-sm text-gray-500">
                      Fee:
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {depositMethods.find((m) => m.id === activeTab)?.fee}
                    </div>
                  </div>
                  <div className="flex">
                    <div className="w-24 flex-shrink-0 text-sm text-gray-500">
                      Processing:
                    </div>
                    <div className="text-sm font-medium text-gray-900 flex items-center">
                      <Clock size={14} className="mr-1" />
                      {
                        depositMethods.find((m) => m.id === activeTab)
                          ?.processing
                      }
                    </div>
                  </div>
                  <div className="flex">
                    <div className="w-24 flex-shrink-0 text-sm text-gray-500">
                      Available:
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {
                        depositMethods.find((m) => m.id === activeTab)
                          ?.availability
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full md:w-2/3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Step-by-Step Instructions
              </h3>

              <ol className="space-y-4">
                {getInstructions().map((instruction, index) => (
                  <li key={index} className="flex">
                    <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-600 font-medium text-sm mr-3">
                      {index + 1}
                    </div>
                    <p className="text-gray-700">{instruction}</p>
                  </li>
                ))}
              </ol>

              <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Info size={18} className="text-yellow-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Important Note
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        Always keep your transaction receipt until the funds are
                        reflected in your account. If you encounter any issues,
                        please contact our support team at support@naweccu.com.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
