import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Home,
  Users,
  CreditCard,
  LogOut,
  ShieldCheck,
  ArrowLeft,
  BarChart,
} from "lucide-react";
import Header from "./Header";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const navigationItems = [
    { name: "Admin Overview", href: "/admin", icon: <Home size={20} /> },
    { name: "Manage Users", href: "/admin/users", icon: <Users size={20} /> },
    {
      name: "Transactions",
      href: "/admin/transactions",
      icon: <CreditCard size={20} />,
    },
    {
      name: "Analytics",
      href: "/admin/analytics",
      icon: <BarChart size={20} />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {/* Sidebar & main content */}
      <div className="flex flex-1 pt-16">
        {/* Desktop sidebar */}
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <nav className="flex-1 px-2 space-y-1">
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      pathname === item.href
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {item.icon}
                    <span className="ml-3">{item.name}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <main className="py-6 px-4 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
