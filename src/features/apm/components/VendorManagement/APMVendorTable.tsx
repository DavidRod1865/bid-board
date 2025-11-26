import React, { useState, useMemo, useCallback } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import type { BidVendor, Vendor, Bid, User } from '../../../../shared/types';

// Helper function to format dates avoiding timezone conversion issues
const formatDateSafe = (dateString: string | null): string => {
  if (!dateString) return '—';
  
  // Extract just the date part from timestamps to avoid timezone conversion
  const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
  const [year, month, day] = dateOnly.split('-').map(Number);
  
  // Create local date to avoid timezone shifts
  const localDate = new Date(year, month - 1, day);
  return localDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
import { getPhaseFollowUpDate, getPhaseDisplayName, getCurrentPhasesWithSoonestFollowUp, getFollowUpUrgencyClasses, getFollowUpUrgency } from '../../../../shared/utils/phaseFollowUpUtils';
import APMVendorSlideOut from './APMVendorSlideOut';
import { Checkbox } from '../../../../shared/components/ui/checkbox';

// Helper function to format amount values
const formatAmount = (amount: number | string | null): string => {
  if (!amount) return '—';
  
  if (typeof amount === 'number') {
    // Use toString() to preserve exact decimal places without rounding or adding zeros
    return `$${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }
  
  if (typeof amount === 'string') {
    return amount.startsWith('$') ? amount : `$${amount}`;
  }
  
  return '—';
};

// Helper function to check if all phases are completed
const areAllPhasesCompleted = (vendor: BidVendor): boolean => {
  return Boolean(
    vendor.buy_number_received_date &&
    vendor.po_received_date &&
    vendor.submittals_received_date &&
    vendor.revised_plans_confirmed_date &&
    vendor.equipment_released_date &&
    vendor.closeout_received_date
  );
};

// Helper function to check if any phases have started
const haveAnyPhasesStarted = (vendor: BidVendor): boolean => {
  return Boolean(
    vendor.buy_number_follow_up_date ||
    vendor.po_follow_up_date ||
    vendor.submittals_follow_up_date ||
    vendor.revised_plans_follow_up_date ||
    vendor.equipment_release_follow_up_date ||
    vendor.closeout_follow_up_date
  );
};

interface APMVendorTableProps {
  bidVendors: BidVendor[];
  vendors: Vendor[];
  bids: Bid[];
  users: User[];
  onUpdateVendor: (vendorId: number, updates: Partial<BidVendor>) => Promise<void>;
  selectedVendors: Set<number>;
  onVendorSelect: (vendorId: number, selected: boolean) => void;
  onBulkVendorSelect?: (vendorIds: number[], selected: boolean) => void;
}

const APMVendorTable: React.FC<APMVendorTableProps> = ({
  bidVendors,
  vendors,
  bids,
  users,
  onUpdateVendor,
  selectedVendors,
  onVendorSelect,
  onBulkVendorSelect
}) => {
  const [expandedVendor, setExpandedVendor] = useState<number | null>(null);
  const [sortField, setSortField] = useState<keyof BidVendor | 'vendor_name'>('apm_phase_updated_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedVendorForUpdate, setSelectedVendorForUpdate] = useState<BidVendor | null>(null);
  const [isSlideOutOpen, setIsSlideOutOpen] = useState(false);

  // Helper functions
  const getVendorName = useCallback((vendorId: number) => {
    return vendors.find(v => v.id === vendorId)?.company_name || 'Unknown Vendor';
  }, [vendors]);

  // Filter for vendors sent to APM only
  const apmVendors = useMemo(() => {
    return bidVendors.filter(bv => {
      const bid = bids.find(b => b.id === bv.bid_id);
      return bid?.sent_to_apm === true;
    });
  }, [bidVendors, bids]);

  // Sort vendors
  const sortedVendors = useMemo(() => {
    return [...apmVendors].sort((a, b) => {
      let aValue, bValue;
      
      // Special handling for vendor name sorting
      if (sortField === 'vendor_name') {
        aValue = getVendorName(a.vendor_id);
        bValue = getVendorName(b.vendor_id);
      } else {
        aValue = a[sortField];
        bValue = b[sortField];
      }
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [apmVendors, sortField, sortDirection, getVendorName]);

  const handleSort = (field: keyof BidVendor | 'vendor_name') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleExpanded = (vendorId: number) => {
    if (expandedVendor === vendorId) {
      setExpandedVendor(null);
    } else {
      setExpandedVendor(vendorId);
    }
  };

  const getAssignedUserName = (userId: string | null) => {
    if (!userId) return 'Unassigned';
    return users.find(u => u.id === userId)?.name || 'Unknown User';
  };

  // Helper function to get urgency background color for phase rows
  const getPhaseUrgencyClasses = (followUpDate: string | null, receivedDate: string | null) => {
    // Skip highlighting if phase is already completed (has received date)
    if (receivedDate) return 'bg-slate-100 hover:bg-slate-200';
    
    const urgency = getFollowUpUrgency(followUpDate);
    
    switch (urgency.level) {
      case 'overdue':
        return 'bg-red-100 hover:bg-red-200';
      case 'due_today':
        return 'bg-red-100 hover:bg-red-200'; // Red background for due today
      case 'critical':
        return 'bg-orange-100 hover:bg-orange-200';
      default:
        return 'bg-slate-100 hover:bg-slate-200'; // Default background
    }
  };

  const handleUpdateVendor = (vendor: BidVendor) => {
    setSelectedVendorForUpdate(vendor);
    setIsSlideOutOpen(true);
  };




  const SortableHeader: React.FC<{ field: keyof BidVendor | 'vendor_name'; children: React.ReactNode; className?: string }> = ({ 
    field, 
    children, 
    className = "" 
  }) => (
    <th 
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortField === field && (
          <span className="text-blue-500">
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );

  return (
    <div className="overflow-hidden border-b-2 border-gray-200">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left">
              <Checkbox
                onCheckedChange={(checked) => {
                  const isChecked = checked === true;
                  
                  if (onBulkVendorSelect) {
                    // Use bulk selection for all vendors at once
                    const vendorIds = sortedVendors.map(v => v.vendor_id);
                    onBulkVendorSelect(vendorIds, isChecked);
                  } else {
                    // Fallback to individual selection
                    sortedVendors.forEach(vendor => {
                      const wasSelected = selectedVendors.has(vendor.vendor_id);
                      if (wasSelected !== isChecked) {
                        onVendorSelect(vendor.vendor_id, isChecked);
                      }
                    });
                  }
                }}
                checked={sortedVendors.length > 0 && sortedVendors.every(v => selectedVendors.has(v.vendor_id))}
                disabled={sortedVendors.length === 0}
              />
            </th>
            <SortableHeader field="vendor_name">Vendor</SortableHeader>
            <SortableHeader field="apm_phase">Original Quote</SortableHeader>
            <SortableHeader field="apm_status">Final Quote</SortableHeader>
            <SortableHeader field="apm_phase_updated_at">Pending Phase</SortableHeader>
            <SortableHeader field="next_follow_up_date">Next Follow-up</SortableHeader>
            <SortableHeader field="assigned_apm_user">Assigned To</SortableHeader>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedVendors.map((vendor) => (
            <React.Fragment key={vendor.id}>
              <tr className={`${(() => {
                const { soonestDate } = getCurrentPhasesWithSoonestFollowUp(vendor);
                const urgencyClasses = getFollowUpUrgencyClasses(soonestDate);
                return urgencyClasses || 'hover:bg-gray-50';
              })()}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Checkbox
                    checked={selectedVendors.has(vendor.vendor_id)}
                    onCheckedChange={(checked) => onVendorSelect(vendor.vendor_id, checked === true)}
                  />
                </td>

                {/* Vendor Name with Expand/Collapse */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <button
                      onClick={() => toggleExpanded(vendor.id)}
                      className="mr-2 p-1 hover:bg-gray-100 rounded"
                    >
                      {expandedVendor === vendor.id ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                    </button>
                    <div>
                      <div className="text-sm text-gray-900">
                        {getVendorName(vendor.vendor_id)}
                      </div>
                    </div>
                  </div>
                </td>
                
                {/* Original Quote Amount */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    {formatAmount(vendor.cost_amount as number | string | null)}
                  </span>
                </td>

                {/* Final Quote Amount */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    {formatAmount(vendor.final_quote_amount as number | string | null)}
                  </span>
                </td>

                {/* Pending Phase */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {(() => {
                    // Check if all phases are completed
                    if (areAllPhasesCompleted(vendor)) {
                      return 'Completed';
                    }
                    
                    const { phases } = getCurrentPhasesWithSoonestFollowUp(vendor);
                    if (phases.length === 0) {
                      // Check if any phases have started
                      if (!haveAnyPhasesStarted(vendor)) {
                        return '—';
                      }
                      return getPhaseDisplayName(vendor.apm_phase);
                    }
                    return phases.map(phase => phase.displayName).join(', ');
                  })()}
                </td>

                {/* Next Follow-up Date */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {(() => {
                    // If all phases completed, no follow-up needed
                    if (areAllPhasesCompleted(vendor)) {
                      return '—';
                    }
                    
                    const { soonestDate } = getCurrentPhasesWithSoonestFollowUp(vendor);
                    if (soonestDate) {
                      return formatDateSafe(soonestDate);
                    }
                    return formatDateSafe(getPhaseFollowUpDate(vendor));
                  })()}
                </td>

                {/* Assigned APM User */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getAssignedUserName(vendor.assigned_apm_user)}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button 
                    className="bg-gray-50 px-3 py-1 rounded text-black hover:bg-gray-200"
                    onClick={() => handleUpdateVendor(vendor)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
              
              {/* Expanded Details Row */}
              {expandedVendor === vendor.id && (
                <tr className="bg-gray-50">
                  <td colSpan={8}>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-blue-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-mediums text-gray-500 uppercase tracking-wider">Phase Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Follow-up Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-5/12">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          
                          {/* Buy# Row */}
                          <tr className={getPhaseUrgencyClasses(vendor.buy_number_follow_up_date, vendor.buy_number_received_date)}>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">Buy#</td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDateSafe(vendor.buy_number_requested_date)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDateSafe(vendor.buy_number_follow_up_date)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDateSafe(vendor.buy_number_received_date)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {vendor.buy_number_notes || '—'}
                            </td>
                          </tr>
                          
                          {/* Purchase Order Row */}
                          <tr className={getPhaseUrgencyClasses(vendor.po_follow_up_date, vendor.po_received_date)}>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">Purchase Order</td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDateSafe(vendor.po_requested_date)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDateSafe(vendor.po_follow_up_date)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDateSafe(vendor.po_received_date)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {vendor.po_notes || '—'}
                            </td>
                          </tr>
                          
                          {/* Submittal Row */}
                          <tr className={getPhaseUrgencyClasses(vendor.submittals_follow_up_date, vendor.submittals_received_date)}>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                              Submittal
                              {vendor.submittals_revision_count > 0 && (
                                <span className="ml-2 text-xs text-blue-600 font-normal">
                                  (Rev: {vendor.submittals_revision_count})
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDateSafe(vendor.submittals_requested_date)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDateSafe(vendor.submittals_follow_up_date)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDateSafe(vendor.submittals_received_date)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              <div className="space-y-1">
                                {vendor.submittals_notes && <div>{vendor.submittals_notes}</div>}
                                {vendor.submittals_rejection_reason && (
                                  <div className="text-red-600 text-xs">Rejection: {vendor.submittals_rejection_reason}</div>
                                )}
                              </div>
                            </td>
                          </tr>

                           {/* Revised Plans Row */}
                          <tr className={getPhaseUrgencyClasses(vendor.revised_plans_follow_up_date, vendor.revised_plans_confirmed_date)}>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">Revised Plans</td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDateSafe(vendor.revised_plans_requested_date)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDateSafe(vendor.revised_plans_follow_up_date)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDateSafe(vendor.revised_plans_confirmed_date)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {vendor.revised_plans_notes || '—'}
                            </td>
                          </tr>
                          
                          {/* Equipment Release Row */}
                          <tr className={getPhaseUrgencyClasses(vendor.equipment_release_follow_up_date, vendor.equipment_released_date)}>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">Equipment Release</td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDateSafe(vendor.equipment_release_requested_date)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDateSafe(vendor.equipment_release_follow_up_date)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDateSafe(vendor.equipment_released_date)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {vendor.equipment_release_notes || '—'}
                            </td>
                          </tr>
                          
                          {/* Closeout Row */}
                          <tr className={getPhaseUrgencyClasses(vendor.closeout_follow_up_date, vendor.closeout_received_date)}>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">Closeout</td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDateSafe(vendor.closeout_requested_date)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDateSafe(vendor.closeout_follow_up_date)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDateSafe(vendor.closeout_received_date)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {vendor.closeout_notes || '—'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      
      {/* APM Vendor Slide-Out For Editing */}
      <APMVendorSlideOut
        vendor={selectedVendorForUpdate}
        bid={selectedVendorForUpdate ? bids.find(b => b.id === selectedVendorForUpdate.bid_id) || null : null}
        vendorInfo={selectedVendorForUpdate ? vendors.find(v => v.id === selectedVendorForUpdate.vendor_id) || null : null}
        users={users}
        isOpen={isSlideOutOpen}
        onOpenChange={setIsSlideOutOpen}
        onUpdate={onUpdateVendor}
      />
    </div>
  );
};

export default APMVendorTable;