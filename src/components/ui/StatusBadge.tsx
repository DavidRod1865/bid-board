import React from 'react';
import { getStatusColor } from '../../utils/statusUtils';

interface StatusBadgeProps {
  status: string;
  variant?: 'badge' | 'dropdown';
  className?: string;
  onClick?: () => void;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  variant = 'badge', 
  className = '',
  onClick 
}) => {
  const backgroundColor = getStatusColor(status);
  
  const baseClasses = "text-white font-medium text-center appearance-none";
  
  const variantClasses = {
    badge: "px-3 py-1 rounded-full text-xs",
    dropdown: "px-3 py-2 rounded text-xs cursor-pointer min-w-24 border-none"
  };
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;
  
  if (variant === 'dropdown') {
    return (
      <div 
        className={classes}
        style={{ backgroundColor }}
        onClick={onClick}
      >
        {status}
      </div>
    );
  }
  
  return (
    <span 
      className={classes}
      style={{ backgroundColor }}
    >
      {status}
    </span>
  );
};

export default StatusBadge;