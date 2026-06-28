import { Navigate } from "react-router-dom";
import AuthLoadingShell from "@/components/layout/AuthLoadingShell";
import { useAuth } from "@/features/auth/AuthContext";
import { usePermissions } from "@/features/auth/permissions";

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <AuthLoadingShell />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export function PermissionRoute({ permission, anyPermission, children }) {
  const { can } = usePermissions();
  const allowed = anyPermission?.length
    ? anyPermission.some((item) => can(item))
    : can(permission);

  if (!allowed) return <Navigate to="/" replace />;
  return children;
}
