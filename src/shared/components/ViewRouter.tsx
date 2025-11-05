import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserProfile } from '../../contexts/UserContext';

interface ViewRouterProps {
  children: React.ReactNode;
}

export const ViewRouter: React.FC<ViewRouterProps> = ({ children }) => {
  const { currentView, userProfile } = useUserProfile();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect if we're on the root path and have user profile loaded
    if (location.pathname === '/' && userProfile) {
      const defaultPath = currentView === 'apm' ? '/apm' : '/estimating';
      navigate(defaultPath, { replace: true });
    }
  }, [currentView, userProfile, location.pathname, navigate]);

  // Also handle view changes when user switches views
  useEffect(() => {
    // If user switches views and is on a team-specific route, redirect to the new team dashboard
    const currentPath = location.pathname;
    
    if (currentView === 'estimating' && currentPath.startsWith('/apm') && currentPath === '/apm') {
      navigate('/estimating', { replace: true });
    } else if (currentView === 'apm' && currentPath.startsWith('/estimating') && currentPath === '/estimating') {
      navigate('/apm', { replace: true });
    }
  }, [currentView, location.pathname, navigate]);

  return <>{children}</>;
};