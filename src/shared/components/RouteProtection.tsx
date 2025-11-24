import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserProfile } from '../../contexts/UserContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: Array<'Admin' | 'Estimating' | 'APM'>;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles
}) => {
  const { userProfile, isLoading } = useUserProfile();
  
  // Show loading if still fetching user profile
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If no user profile or role, redirect
  if (!userProfile || !userProfile.role) {
    return <Navigate to="/estimating" replace />;
  }

  // Check if user's role is in allowed roles
  if (!allowedRoles.includes(userProfile.role)) {
    // Redirect based on user's role
    const redirectPath = userProfile.role === 'APM' ? '/apm' : 
                        userProfile.role === 'Estimating' ? '/estimating' : 
                        '/estimating'; // fallback
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

interface RoleRedirectProps {
  children: React.ReactNode;
}

export const RoleBasedRedirect: React.FC<RoleRedirectProps> = ({ children }) => {
  const { userProfile, isLoading } = useUserProfile();
  
  // Show loading if still fetching user profile
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If no user profile or role, show content (fallback)
  if (!userProfile || !userProfile.role) {
    return <>{children}</>;
  }

  return <>{children}</>;
};