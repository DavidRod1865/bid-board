import React, { useEffect } from 'react';
import { useAuth0 } from '../../auth';
import { useLoading } from '../contexts/LoadingContext';
import LoginPage from '../pages/LoginPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth0();
  const { setAuthLoading } = useLoading();

  // Sync Auth0 loading state with our global loading context
  useEffect(() => {
    setAuthLoading(isLoading);
  }, [isLoading, setAuthLoading]);

  // Don't show a separate loading spinner - let the unified loading system handle it
  // The AppContent component will show the loading spinner when isGlobalLoading is true

  // Show nothing while Auth0 is loading - let global loading context handle the display
  if (isLoading) {
    return null;
  }

  // Show login page if not authenticated (after Auth0 has finished checking)
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Show protected content if authenticated
  return <>{children}</>;
};

export default ProtectedRoute;