import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';

export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { status, user } = useAuthStore();
  const location = useLocation();
  if (status === 'loading') return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Checking session...</div>;
  if (status === 'anonymous') return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  if (adminOnly && user?.role !== 'admin') return <Navigate replace to="/chat" />;
  return <Outlet />;
}
