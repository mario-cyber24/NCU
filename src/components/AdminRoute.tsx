import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AdminLayout from './AdminLayout';
import PageLoader from './ui/PageLoader';

export default function AdminRoute() {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    // Redirect to login page
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    // Redirect non-admin users to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // If they are logged in and an admin, render the admin route inside our AdminLayout
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}