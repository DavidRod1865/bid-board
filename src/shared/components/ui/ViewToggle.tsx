import React from 'react';
import { useUserProfile } from '../../../contexts/UserContext';
import type { TeamView } from '../../../contexts/UserContext';

interface ViewToggleProps {
  className?: string;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ className = '' }) => {
  const { currentView, switchView } = useUserProfile();

  const handleViewChange = (view: TeamView) => {
    switchView(view);
  };

  return (
    <div className={`flex items-center justify-center bg-gray-100 border-[#d4af37] border-2 rounded-lg p-1 mb-2 ${className}`}>
      <button
        onClick={() => handleViewChange('estimating')}
        className={`px-4 py-2 flex-1 rounded-md text-sm font-medium transition-colors ${
          currentView === 'estimating'
            ? 'bg-[#d4af37] text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Estimating
      </button>
      <button
        onClick={() => handleViewChange('apm')}
        className={`px-4 py-2 rounded-md flex-1 text-sm font-medium transition-colors ${
          currentView === 'apm'
            ? 'bg-[#d4af37] text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        APM
      </button>
    </div>
  );
};