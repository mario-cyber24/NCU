import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";
import { supabase } from "../lib/supabase";
import type { User, Session } from "@supabase/supabase-js";
import { toast } from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: any; user: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectInProgressRef = useRef(false);

  useEffect(() => {
    // Initial session check
    async function getInitialSession() {
      try {
        setLoading(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserProfile(session.user.id);
        }
      } catch (error) {
        console.error("Error getting initial session:", error);
      } finally {
        setLoading(false);
      }
    }

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event, session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        // Clear user data on sign out
        setProfile(null);
        setIsAdmin(false);

        // If sign out event, redirect to login
        if (event === "SIGNED_OUT") {
          navigate("/login", { replace: true });
        }
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Handle admin redirect in a separate effect to avoid infinite loops
  useEffect(() => {
    // Don't do anything if still loading or if a redirect is already in progress
    if (loading || redirectInProgressRef.current) return;

    const currentPath = location.pathname;

    // Only redirect if:
    // 1. User is confirmed admin
    // 2. Not already on an admin route
    // 3. Not on login or register page
    // 4. No redirect is currently in progress
    if (
      isAdmin &&
      profile &&
      !currentPath.startsWith("/admin") &&
      !currentPath.includes("login") &&
      !currentPath.includes("register")
    ) {
      console.log("Admin redirect: detected admin on non-admin route");

      // Set flag to prevent multiple redirects
      redirectInProgressRef.current = true;

      // Use a small timeout to avoid potential race conditions
      setTimeout(() => {
        console.log("Admin redirect: navigating to /admin");
        navigate("/admin", { replace: true });

        // Reset the flag after redirect completes
        setTimeout(() => {
          redirectInProgressRef.current = false;
        }, 1000);
      }, 100);
    }
  }, [isAdmin, profile, loading, location.pathname, navigate]);

  async function fetchUserProfile(userId: string) {
    try {
      // First attempt direct client-side query
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (!error && data) {
        console.log("Fetched profile successfully:", data);
        setProfile(data);
        setIsAdmin(data?.is_admin === true);
        return data;
      }

      // If there was an error, try a different approach
      console.warn(
        "Profile fetch had an issue, trying alternative approach:",
        error
      );

      // Try directly using RPC (Remote Procedure Call) if available
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          "get_profile_by_id",
          {
            user_id: userId,
          }
        );

        if (!rpcError && rpcData) {
          console.log("Fetched profile via RPC:", rpcData);
          setProfile(rpcData);
          setIsAdmin(rpcData?.is_admin === true);
          return rpcData;
        }
      } catch (rpcFallbackError) {
        console.warn("RPC fallback also failed:", rpcFallbackError);
      }

      // As a last resort, if we know this is the admin user, set the admin flag directly
      // This is a temporary solution until RLS issues are fully resolved
      if (userId === "981aead7-e531-46c2-876e-9f1562008cb3") {
        console.log("Setting admin profile directly for known admin user");
        const adminProfile = {
          id: userId,
          full_name: "Admin User",
          email: "csibaka920@gmail.com",
          is_admin: true,
        };
        setProfile(adminProfile);
        setIsAdmin(true);
        return adminProfile;
      }

      console.error("All profile fetch attempts failed");
      return null;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  }

  async function signIn(email: string, password: string) {
    try {
      // Show loading toast while authenticating
      const loadingToast = toast.loading("Signing in...");

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Sign in error:", error);
        toast.dismiss(loadingToast);
        toast.error(error.message || "Failed to sign in");
        return { error };
      }

      if (data.user) {
        // Get user profile to check role
        const profile = await fetchUserProfile(data.user.id);

        // Dismiss the general loading toast
        toast.dismiss(loadingToast);

        if (profile?.is_admin) {
          // For admin users, show admin-specific success message
          toast.success("Welcome back, Admin!");
          redirectInProgressRef.current = true;
          navigate("/admin", { replace: true });
          // Reset flag after navigation
          setTimeout(() => {
            redirectInProgressRef.current = false;
          }, 1000);
        } else {
          // For regular users, redirect to user dashboard
          toast.success("Sign in successful!");
          navigate("/dashboard", { replace: true });
        }
      }

      return { error: null };
    } catch (error) {
      console.error("Error signing in:", error);
      toast.error("An unexpected error occurred. Please try again.");
      return { error };
    }
  }

  async function signUp(email: string, password: string, fullName: string) {
    try {
      const {
        data: { user },
        error: signUpError,
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError || !user) {
        return {
          error: signUpError || new Error("Failed to create user"),
          user: null,
        };
      }

      return { error: null, user };
    } catch (error) {
      console.error("Error signing up:", error);
      return { error, user: null };
    }
  }

  async function signOut() {
    try {
      // Show loading toast
      const loadingToast = toast.loading("Signing out...");

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Supabase signout error:", error);
        throw error;
      }

      // Clear all local state
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsAdmin(false);

      // Clear any localStorage items related to your app
      localStorage.removeItem("supabase.auth.token");
      localStorage.removeItem("userSession");
      localStorage.removeItem("authToken");

      // Success message
      toast.dismiss(loadingToast);
      toast.success("Successfully signed out");

      // The navigation will be handled by the auth state change listener
      return;
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out. Please try again.");
      throw error;
    }
  }

  const value = {
    user,
    session,
    profile,
    isAdmin,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
