import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Layout from "./Layout";
import PageLoader from "./ui/PageLoader";

export default function ProtectedRoute() {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    // Redirect to login page but save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isAdmin) {
    // Redirect admin users to admin dashboard
    return <Navigate to="/admin" replace />;
  }

  // If they are logged in as a regular user, render the protected route inside our Layout
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
