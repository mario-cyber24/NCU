import { Link } from "react-router-dom";
import {
  Shield,
  CreditCard,
  Users,
  Lock,
  ArrowRight,
  CheckCircle,
  BarChart3,
  Globe,
  Smartphone,
  Wallet,
  Building2,
  Award,
  Sparkles,
  Zap,
  ChevronRight,
  Info,
  Search,
  Bell,
  User,
  Menu,
  X,
  LogOut,
  Settings,
  ChevronDown,
  Gift,
  MessageSquare,
  Heart,
  LayoutGrid,
  GraduationCap,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function Home() {
  const { profile } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const testimonialsRef = useRef(null);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    // Set active tab based on current path
    const path = window.location.pathname;
    if (path.includes("/about")) setActiveTab("about");
    else if (path.includes("/loans")) setActiveTab("loans");
    else if (path === "/") setActiveTab("home");

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeAllMenus = () => {
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
  };

  const features = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Bank-Grade Security",
      description:
        "Advanced encryption and multi-factor authentication protect your assets 24/7",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Instant Transactions",
      description:
        "Lightning-fast deposits and transfers with real-time balance updates",
      color: "from-amber-500 to-amber-600",
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Global Access",
      description:
        "Access your account anywhere, anytime with our secure digital platform",
      color: "from-emerald-500 to-emerald-600",
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: "Mobile Excellence",
      description:
        "Full-featured mobile banking experience optimized for all devices",
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: "Exclusive Benefits",
      description: "Special rewards and privileges designed for all members",
      color: "from-rose-500 to-rose-600",
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Financial Growth",
      description: "Competitive rates and smart tools to grow your savings",
      color: "from-cyan-500 to-cyan-600",
    },
  ];

  const benefits = [
    {
      title: "Zero Monthly Fees",
      description: "No hidden charges or maintenance costs",
    },
    {
      title: "Premium Interest Rates",
      description: "Earn more on your savings",
    },
    {
      title: "Instant Mobile Access",
      description: "24/7 banking at your fingertips",
    },
    { title: "Direct Deposit", description: "Seamless salary transfers" },
    {
      title: "Free Internal Transfers",
      description: "Move money without fees",
    },
    {
      title: "Dedicated Support",
      description: "Professional assistance when you need it",
    },
  ];

  const stats = [
    { value: "10K+", label: "Members", icon: <Users className="w-6 h-6" /> },
    { value: "99.9%", label: "Uptime", icon: <Shield className="w-6 h-6" /> },
    {
      value: "24/7",
      label: "Support",
      icon: <MessageSquare className="w-6 h-6" />,
    },
    { value: "5.0", label: "Rating", icon: <Heart className="w-6 h-6" /> },
  ];

  const services = [
    {
      icon: <CreditCard className="w-10 h-10" />,
      title: "Personal Loans",
      description: "Just 1% interest rate with flexible repayment options",
      path: "/loans",
    },
    {
      icon: <Building2 className="w-10 h-10" />,
      title: "Home Loans",
      description: "Make your dream home a reality with just 1% interest",
      path: "/home-loans",
    },
    {
      icon: <Shield className="w-10 h-10" />,
      title: "Savings Plans",
      description: "Secure your future with our savings schemes",
      path: "/savings-plans",
    },
    {
      icon: <Gift className="w-10 h-10" />,
      title: "Female Entrepreneur Program",
      description: "Special resources and support for women in business",
      path: "/women-in-business",
    },
  ];

  const testimonials = [
    {
      name: "James Koroma",
      position: "Senior Engineer, Serrekunda",
      image: "https://randomuser.me/api/portraits/men/32.jpg",
      quote:
        "The NAWEC Credit Union has transformed how I manage my finances. Their 1% interest loan helped me renovate my home - I couldn't find such rates anywhere else in The Gambia.",
    },
    {
      name: "Fatou Ceesay",
      position: "Operations Manager, Bakau",
      image: "https://randomuser.me/api/portraits/women/32.jpg",
      quote:
        "I've been a member for over 5 years and the service is consistently excellent. The mobile banking app makes managing my accounts incredibly easy.",
    },
    {
      name: "Omar Jallow",
      position: "Financial Analyst, Banjul",
      image: "https://randomuser.me/api/portraits/men/45.jpg",
      quote:
        "The financial advisory services are top-notch. They helped me create a solid investment plan that's perfectly aligned with my retirement goals.",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((currentTestimonial) => {
        const nextTestimonial = (currentTestimonial + 1) % testimonials.length;

        if (testimonialsRef.current) {
          const scrollAmount =
            testimonialsRef.current.clientWidth * nextTestimonial;
          testimonialsRef.current.scrollTo({
            left: scrollAmount,
            behavior: "smooth",
          });
        }

        return nextTestimonial;
      });
    }, 5000); // Auto transition every 5 seconds

    return () => clearInterval(interval);
  }, [testimonials.length]);

  const scrollToTestimonial = (index) => {
    setActiveTestimonial(index);
    if (testimonialsRef.current) {
      const scrollAmount = testimonialsRef.current.clientWidth * index;
      testimonialsRef.current.scrollTo({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Enhanced Header - Fixed */}
      <header
        className={`
          fixed w-full top-0 z-50 transition-all duration-500
          ${
            scrolled
              ? "bg-white/90 backdrop-blur-xl shadow-xl py-2"
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
                    className="h-10 sm:h-12 w-auto object-contain"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/0 to-primary-500/20 group-hover:opacity-100 opacity-0 transition-opacity duration-300" />
                </div>

                <div className="ml-3 sm:ml-4">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-primary-700">
                    NAWEC
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 tracking-wider font-medium">
                    Credit Union{" "}
                    <span className="hidden sm:inline">
                      • Banking for All Gambians
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
            <div className="hidden md:flex md:items-center md:space-x-8">
              {/* Navigation Links */}
              <nav className="flex items-center space-x-2 mr-6">
                <Link
                  to="/"
                  onClick={() => {
                    setActiveTab("home");
                    closeAllMenus();
                  }}
                  className={`
                    px-4 py-2 rounded-lg transition-all duration-300 font-medium relative
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

                <Link
                  to="/about"
                  onClick={() => {
                    setActiveTab("about");
                    closeAllMenus();
                  }}
                  className={`
                    px-4 py-2 rounded-lg transition-all duration-300 font-medium relative group
                    ${
                      activeTab === "about"
                        ? "text-primary-700 bg-primary-50"
                        : "text-gray-600 hover:text-primary-600 hover:bg-primary-50/50"
                    }
                  `}
                >
                  <span className="relative z-10 flex items-center">
                    <Info
                      size={16}
                      className={`mr-1.5 ${
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
                    px-4 py-2 rounded-lg transition-all duration-300 font-medium relative group
                    ${
                      activeTab === "loans"
                        ? "text-primary-700 bg-primary-50"
                        : "text-gray-600 hover:text-primary-600 hover:bg-primary-50/50"
                    }
                  `}
                >
                  <span className="relative z-10 flex items-center">
                    <CreditCard
                      size={16}
                      className={`mr-1.5 ${
                        activeTab === "loans"
                          ? "text-primary-500"
                          : "text-gray-400 group-hover:text-primary-500"
                      } transition-colors`}
                    />
                    Loans
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
                    size={18}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 transition-colors group-hover:text-primary-500"
                  />
                  <input
                    type="text"
                    placeholder="Search resources..."
                    className="w-64 pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-transparent bg-white/80 backdrop-blur-sm text-sm transition-all duration-300 placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Account buttons for logged out users */}
              {!profile ? (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/login"
                    className="px-4 py-2 rounded-full font-medium hover:text-primary-600 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="px-6 py-2.5 rounded-full font-medium transition-all bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-600/20"
                  >
                    Open Account
                  </Link>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  {/* Notifications */}
                  <button className="relative p-2.5 text-gray-600 hover:text-primary-600 rounded-full transition-all duration-300 hover:bg-primary-50 group">
                    <Bell
                      size={20}
                      className="transition-transform duration-300 group-hover:scale-110"
                    />
                    <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-red-500">
                      <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
                    </span>
                  </button>

                  {/* Profile dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="flex items-center space-x-3 p-2 rounded-xl hover:bg-primary-50 transition-all duration-300 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/20 transition-transform duration-300 group-hover:scale-105 overflow-hidden">
                        {profile?.full_name ? (
                          profile.full_name.charAt(0).toUpperCase()
                        ) : (
                          <User size={20} className="text-white" />
                        )}
                      </div>
                      <div className="hidden lg:block text-left">
                        <p className="text-sm font-medium text-gray-900">
                          {profile?.full_name || "Guest User"}
                        </p>
                        <p className="text-xs text-gray-500">
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
                      <div className="absolute right-0 mt-2 w-72 rounded-xl shadow-lg bg-white ring-1 ring-black/5 divide-y divide-gray-100 transform origin-top-right transition-all duration-200 animate-fade-in-down">
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
                                  Member
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="py-2">
                          <Link
                            to="/profile"
                            className="group flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 transition-colors"
                            onClick={closeAllMenus}
                          >
                            <User
                              size={16}
                              className="mr-3 text-gray-400 group-hover:text-primary-500"
                            />
                            Your Profile
                          </Link>
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
                          <Link
                            to="/logout"
                            className="group flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            onClick={closeAllMenus}
                          >
                            <LogOut
                              size={16}
                              className="mr-3 text-red-400 group-hover:text-red-500"
                            />
                            Sign out
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
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

                {!profile ? (
                  <div className="flex flex-col space-y-2 p-4">
                    <Link
                      to="/login"
                      className="w-full py-2.5 text-center rounded-lg font-medium border border-primary-500 text-primary-600 hover:bg-primary-50 transition-colors"
                      onClick={closeAllMenus}
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/register"
                      className="w-full py-2.5 text-center rounded-lg font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                      onClick={closeAllMenus}
                    >
                      Open Account
                    </Link>
                  </div>
                ) : (
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
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Dashboard Access Banner for logged-in users */}
      {profile && (
        <div className="relative bg-blue-50 border-b border-blue-100 px-4 py-3 mt-20 mb-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-blue-600 font-medium">
                Welcome back, {profile.full_name?.split(" ")[0]}!
              </span>
              <Link
                to="/dashboard"
                className="ml-3 text-blue-700 hover:text-blue-800 font-medium flex items-center"
              >
                View your dashboard →
              </Link>
            </div>
            <button
              className="text-blue-500 hover:text-blue-700"
              aria-label="Dismiss"
              onClick={() => {
                const banner = document.querySelector(".bg-blue-50");
                if (banner) banner.classList.add("hidden");
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Hero Section - Enhanced with more mobile optimization */}
      <div className="relative min-h-screen flex items-center overflow-hidden pt-16">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900">
          <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/534216/pexels-photo-534216.jpeg')] opacity-10 bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary-900/50 to-primary-900" />
        </div>

        {/* Animated shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse delay-700" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 w-full">
          <div className="text-center">
            <div className="flex justify-center mb-8 animate-fade-in-up">
              <img
                src="http://nawec.gm/wp-content/uploads/2020/01/NAWEC.png"
                alt="NAWEC Logo"
                className="h-16 sm:h-20 w-auto"
              />
            </div>

            <div
              className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-lg mb-6 md:mb-8 animate-fade-in-up"
              style={{ animationDelay: "100ms" }}
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 mr-2" />
              <span className="text-white/90 text-xs sm:text-sm font-medium">
                Trusted by Gambians since 2010
              </span>
            </div>

            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 md:mb-8 animate-fade-in-up tracking-tight leading-tight"
              style={{ animationDelay: "200ms" }}
            >
              Banking Reimagined
              <br />
              <span className="text-primary-200">With Only 1% Interest</span>
            </h1>

            <p
              className="text-xl md:text-2xl text-primary-100 max-w-3xl mx-auto mb-8 md:mb-12 leading-relaxed animate-fade-in-up"
              style={{ animationDelay: "200ms" }}
            >
              Experience next-generation banking with exclusive benefits,
              premium support, and financial solutions tailored for all
              Gambians.
            </p>

            <div
              className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center animate-fade-in-up"
              style={{ animationDelay: "300ms" }}
            >
              {profile ? (
                <Link
                  to="/dashboard"
                  className="group relative inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold bg-white text-primary-600 rounded-full transition-all duration-300 hover:transform hover:scale-105 hover:shadow-xl hover:shadow-white/20"
                >
                  <span className="relative z-10">Go to Dashboard</span>
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="group relative inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold bg-white text-primary-600 rounded-full transition-all duration-300 hover:transform hover:scale-105 hover:shadow-xl hover:shadow-white/20"
                >
                  <span className="relative z-10">Start Your Journey</span>
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}

              <Link
                to={profile ? "/dashboard" : "/login"}
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold bg-primary-500/20 backdrop-blur-lg text-white rounded-full border border-white/20 transition-all duration-300 hover:bg-primary-500/30 hover:shadow-lg"
              >
                {profile ? "View Transactions" : "Access Account"}
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-8 h-12 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-white/50 rounded-full" />
          </div>
        </div>
      </div>

      {/* Featured Interest Rate - New */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 py-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg')] opacity-5 bg-cover bg-center" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-white">
                  Unbeatable 1% Interest Rate
                </h3>
                <p className="text-primary-100">
                  On all our loan products for Gambians{" "}
                </p>
              </div>
            </div>

            <Link
              to="/loans"
              className="inline-flex items-center px-6 py-3 bg-white text-primary-700 rounded-full font-semibold hover:bg-primary-50 transition-all duration-300 group"
            >
              Apply Now
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Loan Showcase Section */}
      <div className="relative py-24 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg')] opacity-10 bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-900/90 via-primary-800/50 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Unlock Your Dreams with Just 1% Interest
            </h2>
            <p className="text-xl text-primary-100 max-w-3xl mx-auto">
              Whether you're building a home, starting a business, or pursuing
              education, we offer the most competitive rates in The Gambia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Building Loans
              </h3>
              <p className="text-primary-100 mb-4">
                Make your dream home a reality with our staff building loans up
                to D1,000,000
              </p>
              <Link
                to="/loans?type=building"
                className="inline-flex items-center text-white hover:text-primary-200 transition-colors"
              >
                Learn more <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center mb-4">
                <LayoutGrid className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Business Loans
              </h3>
              <p className="text-primary-100 mb-4">
                Grow your business with our flexible financing options up to
                D500,000
              </p>
              <Link
                to="/loans?type=business"
                className="inline-flex items-center text-white hover:text-primary-200 transition-colors"
              >
                Learn more <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center mb-4">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Education Loans
              </h3>
              <p className="text-primary-100 mb-4">
                Invest in your future with education financing up to D200,000
              </p>
              <Link
                to="/loans?type=education"
                className="inline-flex items-center text-white hover:text-primary-200 transition-colors"
              >
                Learn more <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/loans"
              className="inline-flex items-center px-8 py-4 bg-white text-primary-600 rounded-full font-semibold hover:bg-primary-50 transition-all duration-300 group"
            >
              View All Loan Options
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Featured Services Section - New */}
      <div className="py-20 bg-gray-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-gray-900/[0.02] bg-[size:20px_20px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-50 text-primary-700 font-medium mb-4">
              <Wallet className="w-4 h-4 mr-2" />
              Our Services
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Financial Solutions for Every Need
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Specialized services designed exclusively for NAWEC employees
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <Link
                key={index}
                to={service.path}
                className="group bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:transform hover:-translate-y-1 border border-gray-100 flex flex-col h-full"
              >
                <div className="mb-4">
                  <div className="w-16 h-16 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform duration-300 group-hover:bg-primary-100">
                    {service.icon}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {service.title}
                </h3>
                <p className="text-gray-600 mb-4 flex-grow">
                  {service.description}
                </p>
                <div className="flex items-center text-primary-600 font-medium group-hover:text-primary-700">
                  <span>Learn more</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section - Enhanced */}
      <div className="py-24 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-gray-900/[0.02] bg-[size:32px_32px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-50 text-primary-700 font-medium mb-4">
              <Sparkles className="w-4 h-4 mr-2" />
              Premium Features
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
              Elevate Your Banking Experience
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Discover why thousands of Gambians trust us with their financial
              journey
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:transform hover:-translate-y-2 border border-gray-100"
                onMouseEnter={() => setActiveFeature(index)}
                onMouseLeave={() => setActiveFeature(null)}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`}
                />

                <div
                  className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} text-white mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  {feature.icon}
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {feature.title}
                </h3>

                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>

                <div
                  className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r ${feature.color} transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-2xl`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section - Enhanced */}
      <div className="py-24 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/8867482/pexels-photo-8867482.jpeg')] opacity-10 bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-600/90 via-primary-700/90 to-primary-900/90" />
        </div>

        {/* Animated shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl animate-pulse delay-700" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 font-medium mb-4">
              <MessageSquare className="w-4 h-4 mr-2" />
              Our Community Speaks
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Success Stories from All Walks of Life
            </h2>

            <p className="text-lg text-primary-100 max-w-2xl mx-auto">
              Empowering entrepreneurs, women in business, and young visionaries
              across The Gambia
            </p>
          </div>

          <div className="relative overflow-hidden">
            <div
              ref={testimonialsRef}
              className="flex snap-x snap-mandatory overflow-x-auto scrollbar-hide"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="min-w-full snap-center px-4 transition-opacity duration-300"
                  style={{
                    opacity: activeTestimonial === index ? 1 : 0.4,
                  }}
                >
                  <div
                    className="max-w-3xl mx-auto bg-white/10 backdrop-blur-sm rounded-2xl p-8 md:p-10 shadow-xl transition-all duration-300 transform"
                    style={{
                      transform:
                        activeTestimonial === index
                          ? "scale(1)"
                          : "scale(0.95)",
                    }}
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
                      <div className="flex-shrink-0">
                        <img
                          src={testimonial.image}
                          alt={testimonial.name}
                          className="w-24 h-24 md:w-32 md:h-32 rounded-xl border-4 border-white/20 object-cover shadow-lg"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="text-lg md:text-xl text-white mb-6 italic leading-relaxed">
                          "{testimonial.quote}"
                        </div>

                        <div>
                          <div className="text-xl font-semibold text-white">
                            {testimonial.name}
                          </div>
                          <div className="text-primary-200">
                            {testimonial.position}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination dots */}
            <div className="flex justify-center mt-8 space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    activeTestimonial === index
                      ? "bg-white scale-110 w-6"
                      : "bg-white/30 hover:bg-white/50"
                  }`}
                  onClick={() => scrollToTestimonial(index)}
                  aria-label={`View testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section - Enhanced */}
      <div className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary-50 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="lg:grid lg:grid-cols-2 lg:gap-20 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-50 text-primary-700 font-medium mb-6">
                <Building2 className="w-4 h-4 mr-2" />
                Benefits for All Members
              </div>

              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                Exclusive Advantages for Young Entrepreneurs & Women in Business
              </h2>

              <p className="text-lg text-gray-600 mb-10 leading-relaxed">
                As a valued member, unlock premium banking privileges designed
                to support your financial growth and business development
                throughout The Gambia.
              </p>

              <div className="grid sm:grid-cols-2 gap-6">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="group flex items-start space-x-4 p-4 rounded-xl hover:bg-primary-50 transition-colors duration-300"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                        <CheckCircle className="w-5 h-5 text-primary-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {benefit.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10">
                <Link
                  to="/register"
                  className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-full font-semibold hover:bg-primary-700 transition-all duration-300 hover:shadow-lg hover:shadow-primary-600/30 group"
                >
                  Claim Your Benefits
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            <div className="mt-16 lg:mt-0 relative">
              <div className="relative z-10">
                <img
                  src="https://images.pexels.com/photos/7821703/pexels-photo-7821703.jpeg"
                  alt="Professional banking experience"
                  className="rounded-3xl shadow-2xl w-full object-cover"
                />
                <div className="absolute -bottom-8 -right-8 w-64 h-64 bg-primary-100 rounded-full blur-3xl opacity-50" />
                <div className="absolute -top-8 -left-8 w-48 h-48 bg-amber-100 rounded-full blur-2xl opacity-50" />
              </div>

              {/* Floating cards */}
              <div className="absolute -top-6 -left-6 bg-white rounded-xl shadow-xl p-4 animate-float">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      Account Verified
                    </div>
                    <div className="text-sm text-gray-500">Secure banking</div>
                  </div>
                </div>
              </div>

              <div
                className="absolute -bottom-6 -right-6 bg-white rounded-xl shadow-xl p-4 animate-float"
                style={{ animationDelay: "1s" }}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">$1,234.56</div>
                    <div className="text-sm text-gray-500">Current balance</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section - Enhanced */}
      <div className="py-24 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg')] opacity-10 bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900/90 via-primary-800/90 to-primary-900/90" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 backdrop-blur-lg mb-8">
            <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 sm:mb-8 tracking-tight">
            Your Financial Security is Our Promise
          </h2>

          <p className="text-xl text-primary-100 max-w-2xl mx-auto mb-12 leading-relaxed">
            Join thousands of Gambians who trust us with their financial future.
            Experience banking that truly cares about your success.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
            <Link
              to="/register"
              className="group inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-white text-primary-700 rounded-full font-semibold hover:bg-primary-50 transition-all duration-300 hover:shadow-lg hover:shadow-white/20"
            >
              Open Your Account Today
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/contact"
              className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-primary-500/20 backdrop-blur-lg text-white rounded-full border border-white/20 font-semibold hover:bg-primary-500/30 transition-all duration-300"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>

      {/* Footer - Enhanced with better mobile responsiveness */}
      <footer className="bg-gray-900 text-gray-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
            <div className="space-y-4">
              <div className="flex items-center">
                <img
                  src="http://nawec.gm/wp-content/uploads/2020/01/NAWEC.png"
                  alt="NAWEC Logo"
                  className="h-8 w-auto brightness-0 invert"
                />
                <span className="ml-3 text-lg font-bold text-white">
                  Credit Union
                </span>
              </div>
              <p className="text-sm leading-relaxed">
                Empowering all Gambians with secure, innovative financial
                solutions for a brighter future.
              </p>
              <div className="pt-4">
                <p className="text-xs text-gray-400">
                  © {new Date().getFullYear()} NAWEC Credit Union. All rights
                  reserved.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4 text-lg">
                Quick Links
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    to="/about"
                    className="hover:text-white transition-colors text-sm"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    to="/services"
                    className="hover:text-white transition-colors text-sm"
                  >
                    Services
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="hover:text-white transition-colors text-sm"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    to="/careers"
                    className="hover:text-white transition-colors text-sm"
                  >
                    Careers
                  </Link>
                </li>
                <li>
                  <Link
                    to="/faqs"
                    className="hover:text-white transition-colors text-sm"
                  >
                    FAQs
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4 text-lg">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    to="/privacy"
                    className="hover:text-white transition-colors text-sm"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="hover:text-white transition-colors text-sm"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    to="/security"
                    className="hover:text-white transition-colors text-sm"
                  >
                    Security
                  </Link>
                </li>
                <li>
                  <Link
                    to="/accessibility"
                    className="hover:text-white transition-colors text-sm"
                  >
                    Accessibility
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4 text-lg">
                Contact Us
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-primary-400 mr-2">
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                  </span>
                  <span className="text-sm">+220 123 4567</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-400 mr-2">
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </span>
                  <span className="text-sm">info@naweccu.gm</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-400 mr-2">
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <span className="text-sm">Kanifing, The Gambia</span>
                </li>
              </ul>

              <div className="mt-6">
                <h4 className="text-white font-medium mb-3 text-sm">
                  Follow Us
                </h4>
                <div className="flex space-x-4">
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" />
                    </svg>
                  </a>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    </svg>
                  </a>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M23.954 4.569a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.691 8.094 4.066 6.13 1.64 3.161a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.061a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.937 4.937 0 004.604 3.417 9.868 9.868 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.054 0 13.999-7.496 13.999-13.986 0-.209 0-.42-.015-.63a9.936 9.936 0 002.46-2.548l-.047-.02z" />
                    </svg>
                  </a>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-800 text-center text-xs text-gray-400 md:flex md:justify-between md:text-left">
            <p>
              © {new Date().getFullYear()} NAWEC Credit Union. All rights
              reserved.
            </p>
            <div className="mt-4 md:mt-0 flex flex-col md:flex-row md:items-center">
              <div className="space-x-4 mb-2 md:mb-0">
                <Link
                  to="/privacy"
                  className="hover:text-white transition-colors"
                >
                  Privacy
                </Link>
                <Link
                  to="/terms"
                  className="hover:text-white transition-colors"
                >
                  Terms
                </Link>
                <Link
                  to="/cookies"
                  className="hover:text-white transition-colors"
                >
                  Cookies
                </Link>
              </div>
              <div className="md:ml-6 text-gray-500 flex items-center justify-center">
                <span>Powered by</span>
                <a
                  href="https://zaibaitech.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-primary-300 hover:text-white transition-colors inline-flex items-center"
                >
                  ZaiBai Tech
                  <Shield className="w-3 h-3 ml-1" />
                </a>
                <span className="mx-1">-</span>
                <span>Secure Web Development & Cybersecurity Solutions</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
