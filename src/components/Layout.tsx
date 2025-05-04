import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Home,
  CreditCard,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  TrendingUp,
  Activity,
} from "lucide-react";
import Header from "./Header";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation();
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <Home size={20} />,
      badge: "",
    },
    {
      name: "Deposit",
      href: "/deposit",
      icon: <CreditCard size={20} />,
      badge: "",
    },
    {
      name: "Analytics",
      href: "/analytics",
      icon: <TrendingUp size={20} />,
      badge: "New",
    },
    {
      name: "Activity",
      href: "/activity",
      icon: <Activity size={20} />,
      badge: "",
    },
  ];

  if (isAdmin) {
    navigationItems.push({
      name: "Admin Panel",
      href: "/admin",
      icon: <ShieldCheck size={20} />,
      badge: "",
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <Header />

      {/* Mobile menu button and menu */}
      <div className="md:hidden fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-white shadow-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-50">
          <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white shadow-xl">
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <nav className="px-4 pt-20 pb-4 space-y-1">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${
                        pathname === item.href
                          ? "bg-primary-50 text-primary-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      } group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="flex items-center">
                        <span
                          className={`${
                            pathname === item.href
                              ? "text-primary-600 bg-primary-100"
                              : "text-gray-500 bg-gray-100 group-hover:bg-gray-200"
                          } p-2 rounded-lg`}
                        >
                          {item.icon}
                        </span>
                        <span className="ml-3">{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-600">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="flex-shrink-0 p-4 border-t border-gray-200">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                >
                  <LogOut size={18} className="mr-2" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar & main content */}
      <div className="flex flex-1 pt-16">
        {/* Desktop sidebar */}
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-72 bg-white border-r border-gray-200">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <nav className="mt-5 flex-1 px-4 space-y-1">
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      pathname === item.href
                        ? "bg-primary-50 text-primary-700 shadow-sm"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    } group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200`}
                  >
                    <div className="flex items-center">
                      <span
                        className={`${
                          pathname === item.href
                            ? "text-primary-600 bg-primary-100"
                            : "text-gray-500 bg-gray-100 group-hover:bg-gray-200"
                        } p-2 rounded-lg transition-colors`}
                      >
                        {item.icon}
                      </span>
                      <span className="ml-3">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-600">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 relative z-0 overflow-y-auto focus:outline-none bg-gray-50">
          <main className="py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-gray-200 mt-auto">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <div className="text-sm text-gray-500">
                  © {new Date().getFullYear()} NAWEC CO-OPERATIVE CREDIT UNION.
                  All rights reserved.
                </div>
                <div className="flex space-x-6">
                  <Link
                    to="/privacy"
                    className="text-sm text-gray-500 hover:text-gray-900"
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    to="/terms"
                    className="text-sm text-gray-500 hover:text-gray-900"
                  >
                    Terms of Service
                  </Link>
                  <Link
                    to="/contact"
                    className="text-sm text-gray-500 hover:text-gray-900"
                  >
                    Contact Us
                  </Link>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
