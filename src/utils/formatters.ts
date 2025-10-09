import { DATE_FORMATS, CURRENCY_FORMAT } from './constants';

/**
 * Helper function to properly parse date strings avoiding timezone issues
 */
const parseDate = (dateString: string): Date => {
  // If the date string doesn't include time, treat it as local date
  if (!dateString.includes('T') && !dateString.includes(' ')) {
    // For date-only strings like "2025-10-09", create local date to avoid timezone shifts
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateString);
};

/**
 * Format a date string to a readable format
 */
export const formatDate = (
  dateString: string, 
  format: keyof typeof DATE_FORMATS = 'short'
): string => {
  const date = parseDate(dateString);
  return date.toLocaleDateString('en-US', DATE_FORMATS[format]);
};

/**
 * Format a number as currency
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', CURRENCY_FORMAT).format(amount);
};

/**
 * Format a date relative to now (e.g., "2 hours ago", "Just now")
 */
export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
  
  return formatDate(dateString);
};

/**
 * Format a phone number to a readable format
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
};

/**
 * Truncate text to a specified length with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Generate user initials from a full name
 */
export const generateInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

/**
 * Format a file size in bytes to human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Capitalize the first letter of each word
 */
export const capitalizeWords = (text: string): string => {
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
};

/**
 * Check if a date falls within the specified urgency period
 */
export const isDateInUrgencyPeriod = (date: string | null, urgencyFilter: string): boolean => {
  if (!date || !urgencyFilter) return true;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const bidDate = parseDate(date);
  bidDate.setHours(0, 0, 0, 0);
  
  switch (urgencyFilter) {
    case 'today':
      return bidDate.getTime() === today.getTime();
      
    case 'thisweek':
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // End of current week (Saturday)
      return bidDate >= startOfWeek && bidDate <= endOfWeek;
      
    default:
      return true;
  }
};

/**
 * Check if a date matches the specified date filter
 */
export const isDateMatch = (date: string | null, dateFilter: string): boolean => {
  if (!dateFilter) return true;
  if (!date) return false;
  
  const bidDate = parseDate(date);
  const filterDate = parseDate(dateFilter);
  
  return bidDate.toDateString() === filterDate.toDateString();
};

/**
 * Convert camelCase or snake_case to Title Case
 */
export const toTitleCase = (text: string): string => {
  return text
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/[_-]+/g, ' ') // Replace underscores and hyphens with spaces
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Calculate business days between two dates (excluding weekends)
 * Returns 0 when start and end dates are the same
 */
export const getBusinessDaysBetween = (startDate: Date, endDate: Date): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Ensure we're working with date-only values
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  // If start and end are the same date, return 0
  if (start.getTime() === end.getTime()) {
    return 0;
  }
  
  let businessDays = 0;
  const current = new Date(start);
  // Start from the day after start date to exclude start date from count
  current.setDate(current.getDate() + 1);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    // 0 = Sunday, 6 = Saturday, so 1-5 are weekdays
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      businessDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return businessDays;
};

/**
 * Get bid urgency level and highlighting info with business days awareness
 */
export const getBidUrgency = (dueDateString: string, status: string) => {
  // If bid is submitted/won/lost, no highlighting
  const completedStatuses = ['Bid Sent', 'Won Bid', 'Lost Bid'];
  if (completedStatuses.includes(status)) {
    return { level: 'none', isOverdue: false, businessDaysRemaining: 0 };
  }

  const dueDate = parseDate(dueDateString);
  const today = new Date();
  
  // Compare dates only (ignore time)
  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  // Calculate business days remaining
  const businessDaysRemaining = getBusinessDaysBetween(today, dueDate);
  
  // For overdue calculation, we need to check if today is past due date
  const isOverdue = today > dueDate;
  const businessDaysOverdue = isOverdue ? getBusinessDaysBetween(dueDate, today) : 0;
  
  // Overdue: current date is past the bid date
  if (isOverdue) {
    return { 
      level: 'overdue', 
      isOverdue: true, 
      businessDaysRemaining: -businessDaysOverdue,
      businessDaysOverdue 
    };
  }
  // Due today: same date
  else if (businessDaysRemaining === 0) {
    return { 
      level: 'dueToday', 
      isOverdue: false, 
      businessDaysRemaining: 0 
    };
  }
  // Critical: within 3 business days (1-3 business days)
  else if (businessDaysRemaining >= 1 && businessDaysRemaining <= 3) {
    return { 
      level: 'critical', 
      isOverdue: false, 
      businessDaysRemaining 
    };
  }
  // Warning: 4-5 business days
  else if (businessDaysRemaining >= 4 && businessDaysRemaining <= 5) {
    return { 
      level: 'warning', 
      isOverdue: false, 
      businessDaysRemaining 
    };
  }
  
  return { 
    level: 'none', 
    isOverdue: false, 
    businessDaysRemaining 
  };
};

/**
 * Get CSS classes for bid urgency highlighting with softer, professional colors
 */
export const getBidUrgencyClasses = (dueDateString: string, status: string): string => {
  const urgency = getBidUrgency(dueDateString, status);
  
  switch (urgency.level) {
    case 'overdue':
      return 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-300';
    case 'dueToday':
      return 'bg-amber-50 hover:bg-amber-100 border-l-4 border-l-amber-400';
    case 'critical':
      return 'bg-orange-50 hover:bg-orange-100 border-l-4 border-l-orange-300';
    case 'warning':
      return 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-l-yellow-300';
    default:
      return 'hover:bg-gray-50 hover:-translate-y-px active:translate-y-0';
  }
};

/**
 * Get the display status for a bid, automatically showing "Due Today" or "Overdue (X Days)" when appropriate
 */
export const getBidDisplayStatus = (originalStatus: string, dueDateString: string): string => {
  // Don't change status for completed bids
  const completedStatuses = ['Bid Sent', 'Won Bid', 'Lost Bid'];
  if (completedStatuses.includes(originalStatus)) {
    return originalStatus;
  }

  const urgency = getBidUrgency(dueDateString, originalStatus);
  
  // If due today, show "Due Today" instead of original status
  if (urgency.level === 'dueToday') {
    return 'Due Today';
  }
  
  // If overdue, show "Overdue (X Days)" instead of original status
  if (urgency.level === 'overdue' && urgency.businessDaysOverdue) {
    return `Overdue (${urgency.businessDaysOverdue} Day${urgency.businessDaysOverdue > 1 ? 's' : ''})`;
  }
  
  return originalStatus;
};

/**
 * Check if a bid due date is within 3 days from now including today (legacy function)
 */
export const isUrgentBid = (dueDateString: string): boolean => {
  const urgency = getBidUrgency(dueDateString, 'Gathering Costs');
  return urgency.level === 'critical' || urgency.level === 'overdue';
};