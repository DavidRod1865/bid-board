import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserProfile } from '../../contexts/UserContext';

interface ViewRouterProps {
  children: React.ReactNode;
}

export const ViewRouter: React.FC<ViewRouterProps> = ({ children }) => {
  const { currentView, userProfile } = useUserProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Only redirect if we're on the root path and have user profile loaded
    if (location.pathname === '/' && userProfile) {
      setIsTransitioning(true);
      const defaultPath = currentView === 'apm' ? '/apm' : '/estimating';
      navigate(defaultPath, { replace: true });
      // Small delay to show transition
      setTimeout(() => setIsTransitioning(false), 100);
    }
  }, [currentView, userProfile, location.pathname, navigate]);

  // Also handle view changes when user switches views
  useEffect(() => {
    // If user switches views and is on a team-specific route, redirect to the new team dashboard
    const currentPath = location.pathname;
    
    if (currentView === 'estimating' && currentPath.startsWith('/apm') && currentPath === '/apm') {
      setIsTransitioning(true);
      navigate('/estimating', { replace: true });
      setTimeout(() => setIsTransitioning(false), 100);
    } else if (currentView === 'apm' && currentPath.startsWith('/estimating') && currentPath === '/estimating') {
      setIsTransitioning(true);
      navigate('/apm', { replace: true });
      setTimeout(() => setIsTransitioning(false), 100);
    }
  }, [currentView, location.pathname, navigate]);

  return (
    <>
      {children}
      {isTransitioning && (
        <div className="fixed inset-0 bg-white bg-opacity-75 z-50 flex items-center justify-center transition-opacity duration-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4af37]"></div>
        </div>
      )}
    </>
  );
};