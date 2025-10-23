import React from 'react';
import { Badge } from './badge';
import { cn } from '@/lib/utils';
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
  
  // Base classes that preserve your current styling
  const baseClasses = "text-white font-medium text-center border-transparent";
  
  const variantClasses = {
    badge: "px-3 py-1 text-xs rounded-full", // Keep rounded-full for badge
    dropdown: "px-3 py-2 text-xs cursor-pointer min-w-24 rounded" // Less rounded for dropdown
  };
  
  // For dropdown variant, we'll use a div to preserve click behavior and styling
  if (variant === 'dropdown') {
    return (
      <div 
        className={cn(
          baseClasses,
          variantClasses.dropdown,
          "inline-flex items-center justify-center transition-all",
          className
        )}
        style={{ backgroundColor }}
        onClick={onClick}
      >
        {status}
      </div>
    );
  }
  
  // For badge variant, use Shadcn Badge with custom styling
  return (
    <Badge
      className={cn(
        baseClasses,
        variantClasses.badge,
        "hover:opacity-90 transition-opacity",
        onClick && "cursor-pointer",
        className
      )}
      style={{ backgroundColor }}
      onClick={onClick}
    >
      {status}
    </Badge>
  );
};

export default StatusBadge;