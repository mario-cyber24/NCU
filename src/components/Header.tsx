import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Bell,
  Search,
  User,
  ChevronRight,
  CreditCard,
  Info,
  LogOut,
  Settings,
  Menu,
  X,
  BarChart3,
  Shield,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

export default function Header() {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isAdminSection, setIsAdminSection] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    // Set active tab based on current path
    const path = location.pathname;
    if (path.includes("/admin")) {
      setActiveTab("admin");
      setIsAdminSection(true);
    } else if (path.includes("/about")) setActiveTab("about");
    else if (path.includes("/loans")) setActiveTab("loans");
    else if (path.includes("/dashboard")) setActiveTab("dashboard");
    else if (path === "/") setActiveTab("home");
    else setIsAdminSection(false);

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  const closeAllMenus = () => {
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    if (isSigningOut) return; // Prevent multiple clicks

    setIsSigningOut(true);
    try {
      // Close the dropdown
      closeAllMenus();

      // Call the signOut function
      await signOut();

      // No need to navigate here, the auth listener will handle it
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <>
      {/* Spacer element to push content below header */}
      <div
        className={`${isAdminSection ? "h-20" : "h-24"} ${
          scrolled ? "h-16" : ""
        } transition-all duration-300`}
      ></div>

      <header
        className={`
          fixed w-full top-0 z-50 transition-all duration-500
          ${
            scrolled
              ? "bg-white/95 backdrop-blur-md shadow-sm py-2"
              : isAdminSection
              ? "bg-gradient-to-r from-gray-50 via-white to-primary-50 py-2.5"
              : "bg-gradient-to-r from-white via-white to-primary-50 py-4"
          }
        `}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="flex items-center justify-between">
            {/* Logo and brand */}
            <Link
              to="/"
              className="flex items-center group relative overflow-hidden rounded-xl"
              onClick={() => {
                setActiveTab("home");
                closeAllMenus();
              }}
            >
              <div className="absolute inset-0 opacity-10 bg-grid-primary pointer-events-none" />

              <div className="relative flex items-center">
                <div className="relative overflow-hidden rounded-lg transition-all duration-300 group-hover:scale-105 group-hover:rotate-1">
                  <img
                    src="http://nawec.gm/wp-content/uploads/2020/01/NAWEC.png"
                    alt="NAWEC Logo"
                    className={`${
                      scrolled || isAdminSection ? "h-8" : "h-12"
                    } w-auto object-contain transition-all duration-300`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/0 to-primary-500/20 group-hover:opacity-100 opacity-0 transition-opacity duration-300" />
                </div>

                <div className="ml-3">
                  <h1
                    className={`${
                      scrolled || isAdminSection
                        ? "text-xl"
                        : "text-2xl md:text-3xl"
                    } font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-primary-700 transition-all duration-300`}
                  >
                    NAWEC
                  </h1>
                  <p
                    className={`text-xs md:text-sm text-gray-600 tracking-wider font-medium ${
                      scrolled && "text-xs"
                    } transition-all duration-300`}
                  >
                    Credit Union{" "}
                    <span className="hidden sm:inline">
                      • Empowering Futures
                    </span>
                  </p>
                </div>
              </div>
            </Link>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-all duration-300"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>

            {/* Desktop navigation */}
            <div className="hidden md:flex md:items-center md:space-x-6">
              {/* Navigation Links */}
              <nav className="flex items-center space-x-1 mr-4">
                <Link
                  to="/"
                  onClick={() => {
                    setActiveTab("home");
                    closeAllMenus();
                  }}
                  className={`
                    px-3 py-1.5 rounded-lg transition-all duration-300 font-medium relative
                    ${
                      activeTab === "home"
                        ? "text-primary-700 bg-primary-50"
                        : "text-gray-600 hover:text-primary-600 hover:bg-primary-50/50"
                    }
                  `}
                >
                  Home
                  {activeTab === "home" && (
                    <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-primary-500 rounded-full" />
                  )}
                </Link>

                {profile && (
                  <Link
                    to="/dashboard"
                    onClick={() => {
                      setActiveTab("dashboard");
                      closeAllMenus();
                    }}
                    className={`
                      px-3 py-1.5 rounded-lg transition-all duration-300 font-medium relative group
                      ${
                        activeTab === "dashboard"
                          ? "text-primary-700 bg-primary-50"
                          : "text-gray-600 hover:text-primary-600 hover:bg-primary-50/50"
                      }
                    `}
                  >
                    <span className="relative z-10 flex items-center">
                      <BarChart3
                        size={15}
                        className={`mr-1 ${
                          activeTab === "dashboard"
                            ? "text-primary-500"
                            : "text-gray-400 group-hover:text-primary-500"
                        } transition-colors`}
                      />
                      Dashboard
                    </span>
                    {activeTab === "dashboard" && (
                      <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-primary-500 rounded-full" />
                    )}
                  </Link>
                )}

                {/* Admin menu item - only shown if user is admin */}
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => {
                      setActiveTab("admin");
                      closeAllMenus();
                    }}
                    className={`
                      px-3 py-1.5 rounded-lg transition-all duration-300 font-medium relative group
                      ${
                        activeTab === "admin"
                          ? "text-primary-700 bg-primary-50"
                          : "text-gray-600 hover:text-primary-600 hover:bg-primary-50/50"
                      }
                    `}
                  >
                    <span className="relative z-10 flex items-center">
                      <Shield
                        size={15}
                        className={`mr-1 ${
                          activeTab === "admin"
                            ? "text-primary-500"
                            : "text-gray-400 group-hover:text-primary-500"
                        } transition-colors`}
                      />
                      Admin
                    </span>
                    {activeTab === "admin" && (
                      <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-primary-500 rounded-full" />
                    )}
                  </Link>
                )}

                <Link
                  to="/about"
                  onClick={() => {
                    setActiveTab("about");
                    closeAllMenus();
                  }}
                  className={`
                    px-3 py-1.5 rounded-lg transition-all duration-300 font-medium relative group
                    ${
                      activeTab === "about"
                        ? "text-primary-700 bg-primary-50"
                        : "text-gray-600 hover:text-primary-600 hover:bg-primary-50/50"
                    }
                  `}
                >
                  <span className="relative z-10 flex items-center">
                    <Info
                      size={15}
                      className={`mr-1 ${
                        activeTab === "about"
                          ? "text-primary-500"
                          : "text-gray-400 group-hover:text-primary-500"
                      } transition-colors`}
                    />
                    About
                  </span>
                  {activeTab === "about" && (
                    <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-primary-500 rounded-full" />
                  )}
                </Link>

                <Link
                  to="/loans"
                  onClick={() => {
                    setActiveTab("loans");
                    closeAllMenus();
                  }}
                  className={`
                    px-3 py-1.5 rounded-lg transition-all duration-300 font-medium relative group
                    ${
                      activeTab === "loans"
                        ? "text-primary-700 bg-primary-50"
                        : "text-gray-600 hover:text-primary-600 hover:bg-primary-50/50"
                    }
                  `}
                >
                  <span className="relative z-10 flex items-center">
                    <CreditCard
                      size={15}
                      className={`mr-1 ${
                        activeTab === "loans"
                          ? "text-primary-500"
                          : "text-gray-400 group-hover:text-primary-500"
                      } transition-colors`}
                    />
                    <span className="relative">
                      Loans
                      <span className="absolute -top-1 -right-2 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                      </span>
                    </span>
                  </span>
                  {activeTab === "loans" && (
                    <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-primary-500 rounded-full" />
                  )}
                </Link>
              </nav>

              {/* Search */}
              <div className="relative group">
                <div className="absolute inset-0 bg-primary-100/50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 scale-95 group-hover:scale-100" />
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 transition-colors group-hover:text-primary-500"
                  />
                  <input
                    type="text"
                    placeholder="Search resources..."
                    className="w-56 pl-9 pr-4 py-1.5 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-transparent bg-white/80 backdrop-blur-sm text-sm transition-all duration-300 placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Notifications */}
              {profile && (
                <button className="relative p-2 text-gray-600 hover:text-primary-600 rounded-full transition-all duration-300 hover:bg-primary-50 group">
                  <Bell
                    size={18}
                    className="transition-transform duration-300 group-hover:scale-110"
                  />
                  <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500">
                    <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
                  </span>
                </button>
              )}

              {/* Profile dropdown or login button */}
              {profile ? (
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-primary-50 transition-all duration-300 group"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-md shadow-primary-500/20 transition-transform duration-300 group-hover:scale-105 overflow-hidden ${
                        scrolled ? "w-7 h-7" : ""
                      }`}
                    >
                      {profile?.full_name ? (
                        profile.full_name.charAt(0).toUpperCase()
                      ) : (
                        <User size={16} className="text-white" />
                      )}
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">
                        {profile?.full_name || "Guest User"}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {profile?.email || "Sign in to access account"}
                      </p>
                    </div>
                    <ChevronRight
                      size={16}
                      className={`text-gray-400 transition-transform duration-300 ${
                        isProfileOpen
                          ? "rotate-90"
                          : "group-hover:translate-x-1"
                      }`}
                    />
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-72 rounded-xl shadow-lg bg-white ring-1 ring-black/5 divide-y divide-gray-100 transform origin-top-right transition-all duration-200 animate-fade-in-down z-50">
                      <div className="p-4">
                        <div className="flex items-center">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-md">
                            {profile?.full_name ? (
                              profile.full_name.charAt(0).toUpperCase()
                            ) : (
                              <User size={24} className="text-white" />
                            )}
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-900">
                              {profile?.full_name || "Guest User"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {profile?.email || "Sign in to access account"}
                            </p>
                            <div className="mt-1.5">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                                {isAdmin ? "Administrator" : "Member"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="py-2">
                        <Link
                          to="/dashboard"
                          className="group flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 transition-colors"
                          onClick={closeAllMenus}
                        >
                          <BarChart3
                            size={16}
                            className="mr-3 text-gray-400 group-hover:text-primary-500"
                          />
                          Dashboard
                        </Link>

                        {isAdmin && (
                          <Link
                            to="/admin"
                            className="group flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 transition-colors"
                            onClick={closeAllMenus}
                          >
                            <Shield
                              size={16}
                              className="mr-3 text-gray-400 group-hover:text-primary-500"
                            />
                            Admin Panel
                          </Link>
                        )}

                        <Link
                          to="/settings"
                          className="group flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 transition-colors"
                          onClick={closeAllMenus}
                        >
                          <Settings
                            size={16}
                            className="mr-3 text-gray-400 group-hover:text-primary-500"
                          />
                          Settings
                        </Link>
                      </div>

                      <div className="py-2">
                        <button
                          onClick={handleSignOut}
                          disabled={isSigningOut}
                          className={`w-full group flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors ${
                            isSigningOut ? "opacity-75 cursor-not-allowed" : ""
                          }`}
                        >
                          <LogOut
                            size={16}
                            className="mr-3 text-red-400 group-hover:text-red-500"
                          />
                          {isSigningOut ? "Signing out..." : "Sign out"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/login"
                    className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-4 py-4 bg-white rounded-xl shadow-lg animate-fade-in-down">
              <nav className="flex flex-col space-y-1.5 px-3">
                <Link
                  to="/"
                  className={`
                    flex items-center px-4 py-3 rounded-lg transition-all duration-200
                    ${
                      activeTab === "home"
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }
                  `}
                  onClick={() => {
                    setActiveTab("home");
                    closeAllMenus();
                  }}
                >
                  Home
                </Link>

                {profile && (
                  <Link
                    to="/dashboard"
                    className={`
                      flex items-center px-4 py-3 rounded-lg transition-all duration-200
                      ${
                        activeTab === "dashboard"
                          ? "bg-primary-50 text-primary-700"
                          : "text-gray-700 hover:bg-gray-50"
                      }
                    `}
                    onClick={() => {
                      setActiveTab("dashboard");
                      closeAllMenus();
                    }}
                  >
                    <BarChart3 size={16} className="mr-2 text-gray-400" />
                    Dashboard
                  </Link>
                )}

                {/* Admin menu item in mobile - only for admins */}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className={`
                      flex items-center px-4 py-3 rounded-lg transition-all duration-200
                      ${
                        activeTab === "admin"
                          ? "bg-primary-50 text-primary-700"
                          : "text-gray-700 hover:bg-gray-50"
                      }
                    `}
                    onClick={() => {
                      setActiveTab("admin");
                      closeAllMenus();
                    }}
                  >
                    <Shield size={16} className="mr-2 text-gray-400" />
                    Admin
                  </Link>
                )}

                <Link
                  to="/about"
                  className={`
                    flex items-center px-4 py-3 rounded-lg transition-all duration-200
                    ${
                      activeTab === "about"
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }
                  `}
                  onClick={() => {
                    setActiveTab("about");
                    closeAllMenus();
                  }}
                >
                  <Info size={16} className="mr-2 text-gray-400" />
                  About
                </Link>

                <Link
                  to="/loans"
                  className={`
                    flex items-center px-4 py-3 rounded-lg transition-all duration-200
                    ${
                      activeTab === "loans"
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }
                  `}
                  onClick={() => {
                    setActiveTab("loans");
                    closeAllMenus();
                  }}
                >
                  <CreditCard size={16} className="mr-2 text-gray-400" />
                  Loans
                </Link>
              </nav>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="px-4 py-2">
                  <div className="relative">
                    <Search
                      size={18}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Search..."
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                </div>

                {profile ? (
                  <>
                    <div className="flex items-center justify-between px-6 py-3 mt-2">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-md">
                          {profile?.full_name ? (
                            profile.full_name.charAt(0).toUpperCase()
                          ) : (
                            <User size={18} />
                          )}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {profile?.full_name || "Guest User"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {profile?.email || "Sign in"}
                          </p>
                        </div>
                      </div>

                      <Link
                        to="/profile"
                        className="p-2 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors"
                        onClick={closeAllMenus}
                      >
                        <User size={20} />
                      </Link>
                    </div>

                    <div className="px-4 py-2 border-t border-gray-100 mt-2">
                      <button
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className={`w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors ${
                          isSigningOut ? "opacity-75 cursor-not-allowed" : ""
                        }`}
                      >
                        <LogOut size={16} className="mr-2" />
                        {isSigningOut ? "Signing out..." : "Sign out"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col space-y-2 px-4 py-2">
                    <Link
                      to="/login"
                      className="w-full py-2 text-center rounded-lg font-medium border border-primary-500 text-primary-600 hover:bg-primary-50 transition-colors"
                      onClick={closeAllMenus}
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/register"
                      className="w-full py-2 text-center rounded-lg font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                      onClick={closeAllMenus}
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
