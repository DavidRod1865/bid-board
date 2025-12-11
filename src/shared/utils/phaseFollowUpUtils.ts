import type { BidVendor } from '../types';

export type APMPhase = 'buy_number' | 'po' | 'submittals' | 'revised_plans' | 'equipment_release' | 'closeouts' | 'completed';

export const getPhaseFollowUpDate = (vendor: BidVendor): string | null => {
  // Return the follow-up date for the current phase
  switch (vendor.apm_phase) {
    case 'buy_number':
      return vendor.buy_number_follow_up_date;
    case 'po':
      return vendor.po_follow_up_date;
    case 'submittals':
      return vendor.submittals_follow_up_date;
    case 'revised_plans':
      return vendor.revised_plans_follow_up_date;
    case 'equipment_release':
      return vendor.equipment_release_follow_up_date;
    case 'closeouts':
      return vendor.closeout_follow_up_date;
    case 'completed':
      return null; // No follow-up needed for completed phase
    default:
      return vendor.next_follow_up_date; // Fallback to general follow-up date
  }
};

export const getPhaseDisplayName = (phase: string | null | undefined): string => {
  if (!phase) return 'Unknown Phase';
  
  switch (phase) {
    case 'buy_number':
      return 'Buy Number';
    case 'po':
      return 'Purchase Order';
    case 'submittals':
      return 'Submittals';
    case 'revised_plans':
      return 'Revised Plans';
    case 'equipment_release':
      return 'Equipment Release';
    case 'closeouts':
      return 'Closeouts';
    case 'completed':
      return 'Completed';
    case 'quote_confirmed':
      return 'Quote Confirmed';
    default:
      return phase.replace('_', ' ').toUpperCase();
  }
};

// Get all phases with the soonest follow-up date (excluding phases with received dates) - NEW NORMALIZED VERSION
export const getCurrentPhasesWithSoonestFollowUp = (vendor: BidVendor) => {
  // Use apm_phases array if available (normalized structure)
  if (vendor.apm_phases && vendor.apm_phases.length > 0) {
    // Filter out phases that are completed or have no follow-up date
    const pendingPhases = vendor.apm_phases
      .filter(phase => phase.status !== 'Completed' && phase.follow_up_date)
      .map(phase => ({
        name: phase.phase_name.toLowerCase().replace(/\s+/g, '_'),
        displayName: phase.phase_name,
        followUpDate: phase.follow_up_date,
        receivedDate: phase.received_date,
        status: phase.status
      }));

    if (pendingPhases.length === 0) {
      return { phases: [], soonestDate: null };
    }

    // Find the earliest follow-up date
    const soonestDate = pendingPhases
      .map(phase => new Date(phase.followUpDate!))
      .reduce((earliest, current) => current < earliest ? current : earliest);

    // Get all phases that share this earliest date
    const phasesWithSoonestDate = pendingPhases.filter(phase => 
      new Date(phase.followUpDate!).getTime() === soonestDate.getTime()
    );

    return {
      phases: phasesWithSoonestDate,
      soonestDate: soonestDate.toISOString().split('T')[0]
    };
  }

  // Fallback to legacy column-based structure
  const phases = [
    {
      name: 'buy_number',
      displayName: 'Buy Number',
      followUpDate: vendor.buy_number_follow_up_date,
      receivedDate: vendor.buy_number_received_date
    },
    {
      name: 'po',
      displayName: 'Purchase Order',
      followUpDate: vendor.po_follow_up_date,
      receivedDate: vendor.po_received_date
    },
    {
      name: 'submittals',
      displayName: 'Submittals',
      followUpDate: vendor.submittals_follow_up_date,
      receivedDate: vendor.submittals_received_date
    },
    {
      name: 'revised_plans',
      displayName: 'Revised Plans',
      followUpDate: vendor.revised_plans_follow_up_date,
      receivedDate: vendor.revised_plans_confirmed_date
    },
    {
      name: 'equipment_release',
      displayName: 'Equipment Release',
      followUpDate: vendor.equipment_release_follow_up_date,
      receivedDate: vendor.equipment_released_date
    },
    {
      name: 'closeouts',
      displayName: 'Closeouts',
      followUpDate: vendor.closeout_follow_up_date,
      receivedDate: vendor.closeout_received_date
    }
  ];

  // Filter out phases that already have received dates or no follow-up date
  const pendingPhases = phases.filter(phase => 
    !phase.receivedDate && phase.followUpDate
  );

  if (pendingPhases.length === 0) {
    return { phases: [], soonestDate: null };
  }

  // Find the earliest follow-up date
  const soonestDate = pendingPhases
    .map(phase => new Date(phase.followUpDate!))
    .reduce((earliest, current) => current < earliest ? current : earliest);

  // Get all phases that share this earliest date
  const phasesWithSoonestDate = pendingPhases.filter(phase => 
    new Date(phase.followUpDate!).getTime() === soonestDate.getTime()
  );

  return {
    phases: phasesWithSoonestDate,
    soonestDate: soonestDate.toISOString().split('T')[0]
  };
};

/**
 * Calculate business days between two dates (excluding weekends)
 * Replicates logic from formatters.ts for APM follow-up dates
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
 * Get follow-up urgency level for APM vendor dates
 * Simplified 4-level system: overdue, due_today, critical, normal
 */
export const getFollowUpUrgency = (followUpDate: string | null) => {
  if (!followUpDate) {
    return { level: 'normal', isOverdue: false, businessDaysRemaining: 0 };
  }

  // Parse dates safely to avoid timezone conversion issues
  const parseDateSafe = (dateString: string) => {
    const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
    const [year, month, day] = dateOnly.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const dueDate = parseDateSafe(followUpDate);
  const today = new Date();
  
  // Compare dates only (ignore time)
  today.setHours(0, 0, 0, 0);
  
  // Calculate business days remaining
  const businessDaysRemaining = getBusinessDaysBetween(today, dueDate);
  
  // For overdue calculation, check if today is past due date
  const isOverdue = today > dueDate;
  const businessDaysOverdue = isOverdue ? getBusinessDaysBetween(dueDate, today) : 0;
  
  // Overdue: current date is past the follow-up date
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
      level: 'due_today', 
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
  
  return { 
    level: 'normal', 
    isOverdue: false, 
    businessDaysRemaining 
  };
};

/**
 * Get CSS classes for follow-up urgency highlighting
 * Simplified system with special styling for due today (red background + orange border)
 */
export const getFollowUpUrgencyClasses = (followUpDate: string | null): string => {
  const urgency = getFollowUpUrgency(followUpDate);
  
  switch (urgency.level) {
    case 'overdue':
      return 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-300';
    case 'due_today':
      return 'bg-red-50 hover:bg-red-100 border-l-4 border-l-orange-400'; // Red background + orange border
    case 'critical':
      return 'bg-orange-50 hover:bg-orange-100 border-l-4 border-l-orange-300';
    default:
      return 'hover:bg-gray-50';
  }
};

/**
 * Get follow-up urgency for a vendor based on their soonest pending follow-up date
 */
export const getVendorFollowUpUrgency = (vendor: BidVendor) => {
  const { soonestDate } = getCurrentPhasesWithSoonestFollowUp(vendor);
  return getFollowUpUrgency(soonestDate);
};

// NEW HELPER FUNCTIONS FOR APM PHASES ARRAY

/**
 * Check if all phases are completed for a vendor using apm_phases array
 */
export const areAllAPMPhasesCompleted = (vendor: BidVendor): boolean => {
  if (!vendor.apm_phases || vendor.apm_phases.length === 0) {
    return false;
  }
  return vendor.apm_phases.every(phase => phase.status === 'Completed');
};

/**
 * Check if any APM phases have started (have a follow_up_date or requested_date)
 */
export const haveAnyAPMPhasesStarted = (vendor: BidVendor): boolean => {
  if (!vendor.apm_phases || vendor.apm_phases.length === 0) {
    return false;
  }
  return vendor.apm_phases.some(phase => 
    phase.follow_up_date || phase.requested_date || phase.received_date
  );
};

/**
 * Get a specific phase by name from apm_phases array
 */
export const getAPMPhaseByName = (vendor: BidVendor, phaseName: string) => {
  if (!vendor.apm_phases || vendor.apm_phases.length === 0) {
    return null;
  }
  return vendor.apm_phases.find(phase => 
    phase.phase_name === phaseName || 
    phase.phase_name.toLowerCase().replace(/\s+/g, '_') === phaseName.toLowerCase()
  );
};

/**
 * Get APM phase progress percentage
 */
export const getAPMPhaseProgress = (vendor: BidVendor): number => {
  if (!vendor.apm_phases || vendor.apm_phases.length === 0) {
    return 0;
  }
  
  const completedPhases = vendor.apm_phases.filter(phase => phase.status === 'Completed');
  return Math.round((completedPhases.length / vendor.apm_phases.length) * 100);
};

/**
 * Get the current active phase (first non-completed phase)
 */
export const getCurrentAPMPhase = (vendor: BidVendor) => {
  if (!vendor.apm_phases || vendor.apm_phases.length === 0) {
    return null;
  }
  
  return vendor.apm_phases.find(phase => phase.status !== 'Completed') || null;
};