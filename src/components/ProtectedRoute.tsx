import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/database';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar permissões de role
  if (allowedRoles && profile) {
    const hasPermission = allowedRoles.includes(profile.role);
    if (!hasPermission) {
      // Redirecionar para página apropriada baseada na role
      const roleRedirects: Record<UserRole, string> = {
        admin: '/admin',
        caixa: '/caixa',
        cozinha: '/cozinha',
        garcom: '/pdv',
      };
      
      return <Navigate to={roleRedirects[profile.role]} replace />;
    }
  }

  return <>{children}</>;
}
