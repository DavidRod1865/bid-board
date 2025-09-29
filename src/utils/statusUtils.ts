import { STATUS_COLORS, VENDOR_STATUS_COLORS } from './constants';

/**
 * Get the color for a bid status
 */
export const getStatusColor = (status: string): string => {
  const normalizedStatus = status.toLowerCase() as keyof typeof STATUS_COLORS;
  return STATUS_COLORS[normalizedStatus] || STATUS_COLORS.default;
};

/**
 * Get the CSS classes for vendor status styling
 */
export const getVendorStatusColor = (status: string): string => {
  const normalizedStatus = status.toLowerCase() as keyof typeof VENDOR_STATUS_COLORS;
  return VENDOR_STATUS_COLORS[normalizedStatus] || VENDOR_STATUS_COLORS.pending;
};

/**
 * Check if a status represents a completed/won bid
 */
export const isWonStatus = (status: string): boolean => {
  return status.toLowerCase().includes('won');
};

/**
 * Check if a status represents a lost bid
 */
export const isLostStatus = (status: string): boolean => {
  return status.toLowerCase().includes('lost');
};

/**
 * Check if a status represents an active/in-progress bid
 */
export const isActiveStatus = (status: string): boolean => {
  const active = ['new', 'gathering costs', 'drafting bid', 'bid sent'];
  return active.includes(status.toLowerCase());
};

/**
 * Get a human-readable status description
 */
export const getStatusDescription = (status: string): string => {
  const descriptions: Record<string, string> = {
    'new': 'New project - initial setup',
    'gathering costs': 'Collecting vendor quotes and material costs',
    'drafting bid': 'Preparing bid documentation and proposal',
    'bid sent': 'Proposal submitted, awaiting client response',
    'won bid': 'Project awarded - proceed with contract',
    'lost bid': 'Proposal not selected by client'
  };
  
  return descriptions[status.toLowerCase()] || status;
};

/**
 * Calculate vendor due date (default 7 days from email sent)
 */
export const getVendorDueDate = (emailSentDate: string, daysToAdd = 7): Date => {
  const sentDate = new Date(emailSentDate);
  const dueDate = new Date(sentDate);
  dueDate.setDate(sentDate.getDate() + daysToAdd);
  return dueDate;
};

/**
 * Check if vendor response is overdue
 */
export const isVendorOverdue = (emailSentDate: string, responseDate: string | null): boolean => {
  if (responseDate) return false; // Already responded
  const dueDate = getVendorDueDate(emailSentDate);
  return new Date() > dueDate;
};