import type { Bid, BidVendor, Vendor } from '../types';

export interface VendorCostsDueData {
  bidVendor: BidVendor;
  vendor: Vendor | undefined;
  bid: Bid;
  isPending: boolean;
  hasSubmitted: boolean;
}

export interface ProjectCostsDue {
  bid: Bid;
  dueDates: {
    [dueDate: string]: {
      totalVendors: number;
      pendingVendors: VendorCostsDueData[];
      submittedVendors: VendorCostsDueData[];
    };
  };
}

export interface WeeklyDueReport {
  [bidId: number]: ProjectCostsDue;
}

export interface ReportSummary {
  totalProjects: number;
  totalPendingVendors: number;
  totalSubmittedVendors: number;
  reportDate: string;
}

/**
 * Get all relevant data for weekly report: includes bid vendors with due dates within 7 days
 * AND all bid vendors for bids that are due within 7 days (regardless of vendor due dates)
 */
export function getVendorCostsDueWithinWeek(bidVendors: BidVendor[], bids: Bid[]): BidVendor[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(today.getDate() + 7);
  
  // Get bids that are due within 7 days
  const bidsDueWithinWeek = bids.filter(bid => {
    if (!bid.due_date) return false;
    
    const dueDate = new Date(bid.due_date);
    dueDate.setHours(0, 0, 0, 0);
    
    return dueDate >= today && dueDate < sevenDaysFromNow;
  });
  
  const bidIdsDueWithinWeek = new Set(bidsDueWithinWeek.map(bid => bid.id));
  
  return bidVendors.filter(bv => {
    // Include if vendor cost is due within 7 days
    if (bv.due_date) {
      const vendorDueDate = new Date(bv.due_date);
      vendorDueDate.setHours(0, 0, 0, 0);
      
      if (vendorDueDate >= today && vendorDueDate < sevenDaysFromNow) {
        return true;
      }
    }
    
    // Include if the bid itself is due within 7 days (regardless of vendor due date)
    return bidIdsDueWithinWeek.has(bv.bid_id);
  });
}

/**
 * Check if a vendor has submitted their cost
 */
export function hasVendorSubmittedCost(bidVendor: BidVendor): boolean {
  return bidVendor.cost_amount !== null && 
         bidVendor.cost_amount !== undefined && 
         bidVendor.cost_amount !== 0;
}

/**
 * Group vendor costs by bid and due date
 */
export function groupVendorCostsByBidAndDate(
  weeklyDueBidVendors: BidVendor[],
  allBids: Bid[],
  allVendors: Vendor[]
): WeeklyDueReport {
  const report: WeeklyDueReport = {};
  
  // Create a map for quick bid and vendor lookups
  const bidsMap = new Map(allBids.map(bid => [bid.id, bid]));
  const vendorsMap = new Map(allVendors.map(vendor => [vendor.id, vendor]));
  
  weeklyDueBidVendors.forEach(bidVendor => {
    const { bid_id, due_date } = bidVendor;
    
    // Get associated bid and vendor
    const bid = bidsMap.get(bid_id);
    const vendor = vendorsMap.get(bidVendor.vendor_id);
    
    if (!bid || !due_date) return;
    
    // Initialize bid entry if it doesn't exist
    if (!report[bid_id]) {
      report[bid_id] = {
        bid,
        dueDates: {}
      };
    }
    
    // Initialize due date entry if it doesn't exist
    if (!report[bid_id].dueDates[due_date]) {
      report[bid_id].dueDates[due_date] = {
        totalVendors: 0,
        pendingVendors: [],
        submittedVendors: []
      };
    }
    
    const vendorData: VendorCostsDueData = {
      bidVendor,
      vendor,
      bid,
      isPending: !hasVendorSubmittedCost(bidVendor),
      hasSubmitted: hasVendorSubmittedCost(bidVendor)
    };
    
    // Add to appropriate array
    if (vendorData.isPending) {
      report[bid_id].dueDates[due_date].pendingVendors.push(vendorData);
    } else {
      report[bid_id].dueDates[due_date].submittedVendors.push(vendorData);
    }
    
    report[bid_id].dueDates[due_date].totalVendors++;
  });
  
  return report;
}

/**
 * Generate report summary statistics
 */
export function generateReportSummary(report: WeeklyDueReport): ReportSummary {
  let totalPendingVendors = 0;
  let totalSubmittedVendors = 0;
  
  Object.values(report).forEach(projectData => {
    Object.values(projectData.dueDates).forEach(dueDateData => {
      const data = dueDateData as {
        totalVendors: number;
        pendingVendors: VendorCostsDueData[];
        submittedVendors: VendorCostsDueData[];
      };
      totalPendingVendors += data.pendingVendors.length;
      totalSubmittedVendors += data.submittedVendors.length;
    });
  });
  
  return {
    totalProjects: Object.keys(report).length,
    totalPendingVendors,
    totalSubmittedVendors,
    reportDate: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  };
}

/**
 * Sort projects by urgency (earliest due dates first)
 */
export function sortProjectsByUrgency(report: WeeklyDueReport): ProjectCostsDue[] {
  return Object.values(report).sort((a, b) => {
    // Get the earliest due date for each project
    const earliestDateA = Math.min(
      ...Object.keys(a.dueDates).map(date => new Date(date).getTime())
    );
    const earliestDateB = Math.min(
      ...Object.keys(b.dueDates).map(date => new Date(date).getTime())
    );
    
    return earliestDateA - earliestDateB;
  });
}

/**
 * Format due date for display
 */
export function formatDueDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(date);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
  
  if (diffDays === 0) {
    return `${formattedDate} (TODAY)`;
  } else if (diffDays === 1) {
    return `${formattedDate} (Tomorrow)`;
  } else if (diffDays > 1 && diffDays <= 7) {
    return `${formattedDate} (in ${diffDays} days)`;
  } else {
    return formattedDate;
  }
}

/**
 * Get urgency level for a due date
 */
export function getDueDateUrgency(dateString: string): 'today' | 'tomorrow' | 'thisWeek' | 'normal' {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(date);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays > 1 && diffDays <= 7) return 'thisWeek';
  return 'normal';
}