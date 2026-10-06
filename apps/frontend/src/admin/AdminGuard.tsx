import { Navigate } from 'react-router-dom';
import { getAdminToken } from './admin.service';

/** Redirects to /admin/login if no admin token is present */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const token = getAdminToken();
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}
