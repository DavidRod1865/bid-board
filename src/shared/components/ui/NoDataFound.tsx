import React from 'react';

interface NoDataFoundProps {
  className?: string;
  onAddNew?: () => void;
  actionLabel?: string;
}

const NoDataFound: React.FC<NoDataFoundProps> = ({ 
  className = '',
  onAddNew,
  actionLabel = 'New Project'
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-8 text-center ${className}`}>
      {/* Message */}
      <h3 className="text-lg font-medium text-gray-900 mb-3">
        No projects found
      </h3>
      
      {/* Description */}
      <p className="text-sm text-gray-600 mb-8 max-w-sm">
        Get started by creating your first project to organize your bids and manage your workflow
      </p>
      
      {/* Action Button */}
      {onAddNew && (
        <button
          onClick={onAddNew}
          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default NoDataFound;