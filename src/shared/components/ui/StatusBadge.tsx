import React from 'react';
import { Badge } from './badge';
import { cn } from '../../services/utils';
import { getStatusColor } from '../../utils/statusUtils';
import { 
  SparklesIcon,
  ClockIcon,
  CheckIcon,
  TrophyIcon,
  XMarkIcon 
} from '@heroicons/react/24/solid';

interface StatusBadgeProps {
  status: string;
  variant?: 'badge' | 'dropdown' | 'tab';
  className?: string;
  onClick?: () => void;
  isActive?: boolean;
  id?: string;
  ariaControls?: string;
  urgencyLevel?: 'overdue' | 'dueToday' | 'critical' | 'warning' | 'none';
}

// Helper function to get appropriate icon for each status
const getStatusIcon = (status: string, variant: 'badge' | 'dropdown' | 'tab' = 'badge') => {
  const normalizedStatus = status.toLowerCase();
  
  // Use larger icons for badge variant since the overall container is smaller
  const iconSize = variant === 'badge' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  
  if (normalizedStatus.includes('new')) {
    return <SparklesIcon className={iconSize} />;
  }
  if (normalizedStatus.includes('pending')) {
    return <ClockIcon className={iconSize} />;
  }
  if (normalizedStatus.includes('completed')) {
    return <CheckIcon className={iconSize} />;
  }
  if (normalizedStatus.includes('won')) {
    return <TrophyIcon className={iconSize} />;
  }
  if (normalizedStatus.includes('lost')) {
    return <XMarkIcon className={iconSize} />;
  }
  
  // Default fallback
  return <ClockIcon className={iconSize} />;
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  variant = 'badge', 
  className = '',
  onClick,
  isActive = false,
  id,
  ariaControls,
  urgencyLevel = 'none'
}) => {
  const backgroundColor = getStatusColor(status);
  const statusIcon = getStatusIcon(status, variant);
  
  // Get urgency styling - override background color for urgent items
  const getUrgencyClasses = (urgency: string) => {
    switch (urgency) {
      case 'overdue':
      case 'dueToday':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'critical':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return '';
    }
  };
  
  const urgencyClasses = getUrgencyClasses(urgencyLevel);
  const useUrgencyColors = urgencyLevel !== 'none' && variant === 'badge';
  
  // Updated base classes for new design
  const baseClasses = useUrgencyColors 
    ? `font-medium text-center border ${urgencyClasses}` 
    : "text-white font-medium text-center border-transparent";
  
  const variantClasses = {
    badge: "px-2.5 py-1.5 text-xs rounded-md inline-flex items-center gap-2", // Increased padding and gap
    dropdown: "px-3 py-2 text-xs cursor-pointer min-w-24 rounded inline-flex items-center gap-2",
    tab: "py-3 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-1.5"
  };
  
  // For tab variant, use clean tab styling with status colors and proper ARIA
  if (variant === 'tab') {
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick();
      }
    };

    return (
      <button
        id={id}
        role="tab"
        aria-selected={isActive}
        aria-controls={ariaControls}
        aria-label={`Filter by ${status} status`}
        tabIndex={isActive ? 0 : -1}
        className={cn(
          variantClasses.tab,
          isActive
            ? "border-b-2"
            : "border-transparent hover:border-gray-300",
          "transition-colors duration-200 focus:outline-none",
          onClick && "cursor-pointer",
          className
        )}
        style={isActive ? { borderBottomColor: backgroundColor, color: backgroundColor } : undefined}
        onClick={onClick}
        onKeyDown={handleKeyDown}
      >
        {statusIcon}
        {status}
      </button>
    );
  }
  
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
        style={useUrgencyColors ? undefined : { backgroundColor }}
        onClick={onClick}
      >
        {statusIcon}
        {status}
      </div>
    );
  }
  
  // For badge variant, use Badge component with custom styling
  return (
    <Badge
      className={cn(
        baseClasses,
        variantClasses.badge,
        "hover:opacity-90 transition-opacity",
        onClick && "cursor-pointer",
        className
      )}
      style={useUrgencyColors ? undefined : { backgroundColor }}
      onClick={onClick}
    >
      {statusIcon}
      {status}
    </Badge>
  );
};

export default StatusBadge;