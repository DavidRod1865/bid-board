import React, { useState, useMemo, useCallback } from 'react';
import { ChevronDownIcon, ChevronRightIcon, DocumentTextIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import type { BidVendor, Vendor, Bid, User } from '../../../../shared/types';
import APMPhaseModal from '../modals/APMPhaseModal';
import AlertDialog from '../../../../shared/components/ui/AlertDialog';
import { Popover, PopoverTrigger, PopoverContent } from '../../../../shared/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../../shared/components/ui/dropdown-menu';

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
import { getPhaseFollowUpDate, getPhaseDisplayName, getCurrentPhasesWithSoonestFollowUp, getFollowUpUrgencyClasses, getFollowUpUrgency, areAllAPMPhasesCompleted, haveAnyAPMPhasesStarted } from '../../../../shared/utils/phaseFollowUpUtils';

// Helper function to format amount values (stored as decimal dollars)
const formatAmount = (amount: number | string | null): string => {
  if (!amount && amount !== 0) return '—';
  
  let numValue: number;
  if (typeof amount === 'number') {
    numValue = amount;
  } else if (typeof amount === 'string') {
    // Remove $ and commas, then parse
    const cleaned = amount.replace(/[$,]/g, '');
    numValue = parseFloat(cleaned);
    if (isNaN(numValue)) return '—';
  } else {
    return '—';
  }
  
  // Format with 2 decimal places and thousand separators
  return `$${numValue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

// Helper function to check if all phases are completed (with fallback to legacy)
const areAllPhasesCompleted = (vendor: BidVendor): boolean => {
  // Use new apm_phases array if available
  if (vendor.apm_phases && vendor.apm_phases.length > 0) {
    return areAllAPMPhasesCompleted(vendor);
  }
  
  // Fallback to legacy column-based check
  return Boolean(
    vendor.buy_number_received_date &&
    vendor.po_received_date &&
    vendor.submittals_received_date &&
    vendor.revised_plans_confirmed_date &&
    vendor.equipment_released_date &&
    vendor.closeout_received_date
  );
};

// Helper function to check if any phases have started (with fallback to legacy)
const haveAnyPhasesStarted = (vendor: BidVendor): boolean => {
  // Use new apm_phases array if available
  if (vendor.apm_phases && vendor.apm_phases.length > 0) {
    return haveAnyAPMPhasesStarted(vendor);
  }
  
  // Fallback to legacy column-based check
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
  onCreatePhase?: (vendorId: number, phaseData: any) => Promise<void>;
  onUpdatePhase?: (phaseId: number, updates: any) => Promise<void>;
  onDeletePhase?: (phaseId: number) => Promise<void>;
  onDeleteVendor?: (bidVendorId: number) => Promise<void>;
}

const APMVendorTable: React.FC<APMVendorTableProps> = ({
  bidVendors,
  vendors,
  bids,
  users,
  onUpdateVendor,
  selectedVendors,
  onVendorSelect,
  onBulkVendorSelect,
  onCreatePhase,
  onUpdatePhase,
  onDeletePhase,
  onDeleteVendor
}) => {
  // Track multiple expanded vendors instead of just one
  const [expandedVendors, setExpandedVendors] = useState<number[]>([]);
  const [sortField, setSortField] = useState<keyof BidVendor | 'vendor_name'>('apm_phase_updated_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [openNotePopover, setOpenNotePopover] = useState<number | null>(null);
  
  // Inline editing state
  const [editingVendorId, setEditingVendorId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{
    cost_amount: number | string | null;
    final_quote_amount: number | string | null;
    assigned_apm_user: string | null;
  }>({
    cost_amount: null,
    final_quote_amount: null,
    assigned_apm_user: null,
  });

  // Phase management state
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<any | null>(null);
  const [selectedVendorForPhase, setSelectedVendorForPhase] = useState<BidVendor | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    phaseId: number | null;
    phaseName: string;
  }>({
    isOpen: false,
    phaseId: null,
    phaseName: ''
  });
  
  const [deleteVendorConfirmation, setDeleteVendorConfirmation] = useState<{
    isOpen: boolean;
    bidVendorId: number | null;
    vendorName: string;
  }>({
    isOpen: false,
    bidVendorId: null,
    vendorName: ''
  });

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
    setExpandedVendors((prev) =>
      prev.includes(vendorId)
        ? prev.filter((id) => id !== vendorId)
        : [...prev, vendorId]
    );
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


  // Inline editing handlers
  const handleStartEdit = (vendor: BidVendor) => {
    setEditingVendorId(vendor.id);
    setEditValues({
      cost_amount: vendor.cost_amount,
      final_quote_amount: vendor.final_quote_amount,
      assigned_apm_user: vendor.assigned_apm_user,
    });
  };

  const handleCancelEdit = () => {
    setEditingVendorId(null);
    setEditValues({
      cost_amount: null,
      final_quote_amount: null,
      assigned_apm_user: null,
    });
  };

  const handleSaveEdit = async (vendor: BidVendor) => {
    try {
      const updates: Partial<BidVendor> = {};
      
      // Only include changed fields
      if (editValues.cost_amount !== vendor.cost_amount) {
        updates.cost_amount = editValues.cost_amount;
      }
      if (editValues.final_quote_amount !== vendor.final_quote_amount) {
        updates.final_quote_amount = editValues.final_quote_amount;
      }
      if (editValues.assigned_apm_user !== vendor.assigned_apm_user) {
        updates.assigned_apm_user = editValues.assigned_apm_user;
      }

      if (Object.keys(updates).length > 0) {
        await onUpdateVendor(vendor.id, updates);
      }
      
      setEditingVendorId(null);
      setEditValues({
        cost_amount: null,
        final_quote_amount: null,
        assigned_apm_user: null,
      });
    } catch (error) {
      console.error('Failed to save vendor updates:', error);
    }
  };

  const handleEditValueChange = (field: 'cost_amount' | 'final_quote_amount' | 'assigned_apm_user', value: any) => {
    setEditValues(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Helper to parse amount input (convert string to number for storage)
  const parseAmountInput = (value: string): number | null => {
    if (!value || value.trim() === '') return null;
    const cleaned = value.replace(/[$,]/g, '');
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return null;
    return parsed;
  };

  // Helper to format amount for input display
  const formatAmountForInput = (amount: number | string | null): string => {
    if (!amount && amount !== 0) return '';
    let numValue: number;
    if (typeof amount === 'number') {
      numValue = amount;
    } else if (typeof amount === 'string') {
      const cleaned = amount.replace(/[$,]/g, '');
      numValue = parseFloat(cleaned);
      if (isNaN(numValue)) return '';
    } else {
      return '';
    }
    return numValue.toFixed(2);
  };

  // Phase management handlers
  const handleAddPhase = (vendor: BidVendor) => {
    setSelectedVendorForPhase(vendor);
    setSelectedPhase(null);
    setModalMode('add');
    setIsPhaseModalOpen(true);
  };

  const handleEditPhase = (vendor: BidVendor, phase: any) => {
    setSelectedVendorForPhase(vendor);
    setSelectedPhase(phase);
    setModalMode('edit');
    setIsPhaseModalOpen(true);
  };

  const handleDeletePhase = (phase: any) => {
    setDeleteConfirmation({
      isOpen: true,
      phaseId: phase.id,
      phaseName: phase.phase_name
    });
  };

  const handlePhaseModalSubmit = async (phaseData: any) => {
    if (!selectedVendorForPhase) return;

    try {
      if (modalMode === 'add' && onCreatePhase) {
        await onCreatePhase(selectedVendorForPhase.vendor_id, phaseData);
      } else if (modalMode === 'edit' && selectedPhase && onUpdatePhase) {
        await onUpdatePhase(selectedPhase.id, phaseData);
      }
    } catch (error) {
      console.error('Failed to save phase:', error);
      throw error; // Let the modal handle the error display
    }
  };

  const confirmDeletePhase = async () => {
    if (!deleteConfirmation.phaseId || !onDeletePhase) return;

    try {
      await onDeletePhase(deleteConfirmation.phaseId);
      setDeleteConfirmation({ isOpen: false, phaseId: null, phaseName: '' });
    } catch (error) {
      console.error('Failed to delete phase:', error);
      // Keep dialog open for error feedback
    }
  };

  const cancelDeletePhase = () => {
    setDeleteConfirmation({ isOpen: false, phaseId: null, phaseName: '' });
  };

  // Vendor delete handlers
  const handleDeleteVendor = (vendor: BidVendor) => {
    const vendorName = getVendorName(vendor.vendor_id);
    setDeleteVendorConfirmation({
      isOpen: true,
      bidVendorId: vendor.id,
      vendorName: vendorName
    });
  };

  const confirmDeleteVendor = async () => {
    if (!deleteVendorConfirmation.bidVendorId || !onDeleteVendor) return;

    try {
      await onDeleteVendor(deleteVendorConfirmation.bidVendorId);
      setDeleteVendorConfirmation({ isOpen: false, bidVendorId: null, vendorName: '' });
    } catch (error) {
      console.error('Failed to delete vendor:', error);
      // Keep dialog open for error feedback
    }
  };

  const cancelDeleteVendor = () => {
    setDeleteVendorConfirmation({ isOpen: false, bidVendorId: null, vendorName: '' });
  };




  const SortableHeader: React.FC<{ field: keyof BidVendor | 'vendor_name'; children: React.ReactNode; className?: string }> = ({ 
    field, 
    children, 
    className = "" 
  }) => {
    const isVendor = field === 'vendor_name';
    const alignmentClass = className.includes('text-center') ? 'text-center' : (isVendor ? 'text-left' : 'text-center');
    // Extract width classes from className
    const widthClass = className.match(/w-\S+/)?.[0] || '';
    const otherClasses = className.replace(/w-\S+/, '').trim();
    return (
      <th 
        className={`px-2 py-2 ${alignmentClass} text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:bg-slate-600 transition-colors border border-gray-300 ${widthClass} ${otherClasses}`}
        onClick={() => handleSort(field)}
      >
        <div className={`flex items-center space-x-1 ${alignmentClass === 'text-center' ? 'justify-center' : ''}`}>
          <span>{children}</span>
          {sortField === field && (
            <span className="text-blue-500">
              {sortDirection === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="overflow-hidden border border-gray-300">
      <table className="w-full divide-y divide-gray-300 border-collapse table-auto">
        <thead className="bg-slate-700">
          <tr>
            <SortableHeader field="vendor_name">Vendor</SortableHeader>
            <SortableHeader field="apm_phase" className="text-center w-32">Original Quote</SortableHeader>
            <SortableHeader field="apm_status" className="text-center w-32">Final Quote</SortableHeader>
            <SortableHeader field="apm_phase_updated_at" className="text-center w-36">Pending Phase</SortableHeader>
            <SortableHeader field="next_follow_up_date" className="text-center w-28">Follow-Up</SortableHeader>
            <SortableHeader field="assigned_apm_user" className="text-center w-32">Assigned To</SortableHeader>
            <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase tracking-wider border border-gray-300 w-20">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-300">
          {sortedVendors.map((vendor, index) => {
            const isExpanded = expandedVendors.includes(vendor.id);
            const { soonestDate } = getCurrentPhasesWithSoonestFollowUp(vendor);
            const urgencyClasses = getFollowUpUrgencyClasses(soonestDate);
            
            // Professional alternating backgrounds with subtle urgency styling
            let rowClasses = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';
            if (urgencyClasses) {
              // Subtle urgency colors for better readability
              if (urgencyClasses.includes('bg-red')) {
                rowClasses = index % 2 === 0 ? 'bg-red-50/50' : 'bg-red-50/30';
              } else if (urgencyClasses.includes('bg-orange')) {
                rowClasses = index % 2 === 0 ? 'bg-orange-50/50' : 'bg-orange-50/30';
              }
            }
            if (isExpanded) {
              rowClasses += ' border-b-0';
            }
            
            return (
            <React.Fragment key={vendor.id}>
              <tr 
                className={`${rowClasses} hover:bg-slate-100 transition-colors cursor-pointer border-l-4 border-l-transparent`}
                onClick={() => toggleExpanded(vendor.id)}
              >
                {/* Vendor Name with Expand/Collapse */}
                <td className="px-2 py-2 whitespace-nowrap border border-gray-300">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(vendor.id);
                      }}
                      className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDownIcon className="h-4 w-4 text-gray-600" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4 text-gray-600" />
                      )}
                    </button>
                    <span className="text-sm font-semibold text-slate-900">
                      {getVendorName(vendor.vendor_id)}
                    </span>
                  </div>
                </td>
                
                {/* Original Quote Amount */}
                <td className="px-2 py-2 whitespace-nowrap text-center border border-gray-300" onClick={(e) => e.stopPropagation()}>
                  {editingVendorId === vendor.id ? (
                    <input
                      type="text"
                      value={editValues.cost_amount !== null && editValues.cost_amount !== undefined ? `$${formatAmountForInput(editValues.cost_amount)}` : ''}
                      onChange={(e) => {
                        const parsed = parseAmountInput(e.target.value);
                        handleEditValueChange('cost_amount', parsed);
                      }}
                      className="w-full px-2 py-1 text-sm text-center border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="$0.00"
                      step="0.01"
                    />
                  ) : (
                    <span className="text-sm font-medium text-slate-800">
                      {formatAmount(vendor.cost_amount as number | string | null)}
                    </span>
                  )}
                </td>

                {/* Final Quote Amount */}
                <td className="px-2 py-2 whitespace-nowrap text-center border border-gray-300" onClick={(e) => e.stopPropagation()}>
                  {editingVendorId === vendor.id ? (
                    <input
                      type="text"
                      value={editValues.final_quote_amount !== null && editValues.final_quote_amount !== undefined ? `$${formatAmountForInput(editValues.final_quote_amount)}` : ''}
                      onChange={(e) => {
                        const parsed = parseAmountInput(e.target.value);
                        handleEditValueChange('final_quote_amount', parsed);
                      }}
                      className="w-full px-2 py-1 text-sm text-center border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="$0.00"
                      step="0.01"
                    />
                  ) : (
                    <span className="text-sm font-medium text-slate-800">
                      {formatAmount(vendor.final_quote_amount as number | string | null)}
                    </span>
                  )}
                </td>

                {/* Pending Phase */}
                <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-slate-800 text-center border border-gray-300">
                  {(() => {
                    // Check if all phases are completed
                    if (areAllPhasesCompleted(vendor)) {
                      return '—';
                    }
                    
                    const { phases } = getCurrentPhasesWithSoonestFollowUp(vendor);
                    if (phases.length === 0) {
                      // Check if any phases have started
                      if (!haveAnyPhasesStarted(vendor)) {
                        return '—';
                      }
                      // For normalized structure, show the current active phase or fallback
                      if (vendor.apm_phases && vendor.apm_phases.length > 0) {
                        const activePhase = vendor.apm_phases.find(p => p.status !== 'Completed');
                        if (activePhase) {
                          return activePhase.phase_name;
                        }
                        return 'All Phases Complete';
                      }
                      // Fallback to legacy apm_phase
                      return getPhaseDisplayName(vendor.apm_phase);
                    }
                    return phases.map(phase => phase.displayName).join(', ');
                  })()}
                </td>

                {/* Next Follow-up Date */}
                <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-slate-700 text-center border border-gray-300">
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
                <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-slate-700 text-center border border-gray-300" onClick={(e) => e.stopPropagation()}>
                  {editingVendorId === vendor.id ? (
                    <select
                      value={editValues.assigned_apm_user || ''}
                      onChange={(e) => handleEditValueChange('assigned_apm_user', e.target.value || null)}
                      className="w-full px-2 py-1 text-sm text-center border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Unassigned</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    getAssignedUserName(vendor.assigned_apm_user)
                  )}
                </td>

                {/* Actions */}
                <td className="px-2 py-2 whitespace-nowrap text-sm text-center border border-gray-300" onClick={(e) => e.stopPropagation()}>
                  {editingVendorId === vendor.id ? (
                    <div className="flex items-center justify-center gap-3">
                      <button
                        className="text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors cursor-pointer"
                        onClick={() => handleSaveEdit(vendor)}
                      >
                        Save
                      </button>
                      <button
                        className="text-gray-600 hover:text-gray-700 font-semibold text-sm transition-colors cursor-pointer"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="inline-flex items-center justify-center p-1.5 rounded hover:bg-gray-100 focus:outline-none"
                          aria-label="Vendor actions"
                        >
                          <EllipsisVerticalIcon className="w-5 h-5 text-gray-600" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => handleStartEdit(vendor)}
                        >
                          Edit vendor
                        </DropdownMenuItem>
                        {onDeleteVendor && (
                          <DropdownMenuItem
                            className="cursor-pointer text-red-600 focus:text-red-700"
                            onClick={() => handleDeleteVendor(vendor)}
                          >
                            Delete vendor
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </td>
              </tr>
              
              {/* Expanded Details Row - APM Phases */}
              {isExpanded && (
                <tr className={`${index % 2 === 0 ? 'bg-slate-50' : 'bg-white'} border-t border-gray-300`}>
                  <td colSpan={7} className="px-0 py-0">
                        <table className="min-w-full divide-y divide-gray-300 border-collapse">
                          <thead className="bg-slate-500">
                            <tr>
                              <th className="px-2 py-1 text-left text-xs font-semibold text-white uppercase tracking-wider border border-gray-300">Phase Name</th>
                              <th className="px-2 py-1 text-center text-xs font-semibold text-white uppercase tracking-wider w-24 border border-gray-300">Status</th>
                              <th className="px-2 py-1 text-center text-xs font-semibold text-white uppercase tracking-wider w-32 border border-gray-300">Requested Date</th>
                              <th className="px-2 py-1 text-center text-xs font-semibold text-white uppercase tracking-wider w-32 border border-gray-300">Follow-up Date</th>
                              <th className="px-2 py-1 text-center text-xs font-semibold text-white uppercase tracking-wider w-32 border border-gray-300">Received Date</th>
                              <th className="px-2 py-1 text-center text-xs font-semibold text-white uppercase tracking-wider w-16 border border-gray-300">Notes</th>
                              <th className="px-2 py-1 text-center text-xs font-semibold text-white uppercase tracking-wider w-20 border border-gray-300">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-300">
                            {/* Render APM Phases if available */}
                            {vendor.apm_phases && vendor.apm_phases.length > 0 ? (
                              vendor.apm_phases.map((phase, phaseIndex) => (
                                <tr 
                                  key={phase.id} 
                                  className={`${phaseIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'} ${getPhaseUrgencyClasses(phase.follow_up_date, phase.received_date)}`}
                                >
                                  <td className="px-2 py-1 text-sm font-semibold text-slate-900 text-left border border-gray-300">
                                    {phase.phase_name}
                                    {phase.revision_count > 0 && (
                                      <span className="ml-2 text-xs text-blue-600 font-normal">
                                        (Rev: {phase.revision_count})
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-2 py-1 text-sm text-slate-800 text-center border border-gray-300">
                                    <span className={`px-2 py-1 text-xs rounded-full font-medium inline-block ${
                                      phase.status === 'Completed' 
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                        : phase.status === 'Pending' 
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                                    }`}>
                                      {phase.status}
                                    </span>
                                  </td>
                                  <td className="px-2 py-1 text-sm font-medium text-slate-700 text-center border border-gray-300">
                                    {formatDateSafe(phase.requested_date)}
                                  </td>
                                  <td className="px-2 py-1 text-sm font-medium text-slate-700 text-center border border-gray-300">
                                    {formatDateSafe(phase.follow_up_date)}
                                  </td>
                                  <td className="px-2 py-1 text-sm font-medium text-slate-700 text-center border border-gray-300">
                                    {formatDateSafe(phase.received_date)}
                                  </td>
                                  <td className="px-2 py-1 text-sm text-slate-600 text-center border border-gray-300">
                                    {phase.notes ? (
                                      <Popover open={openNotePopover === phase.id} onOpenChange={(open) => setOpenNotePopover(open ? phase.id : null)}>
                                        <PopoverTrigger asChild>
                                          <button
                                            className="inline-flex items-center justify-center relative mx-auto"
                                            onClick={(e) => e.stopPropagation()}
                                            title="View Notes"
                                          >
                                            <DocumentTextIcon className="h-5 w-5 text-slate-600 drop-shadow-[0_0_4px_rgba(71,85,105,0.4)] animate-pulse" style={{ animationDuration: '2s' }} />
                                            <span className="absolute inset-0 flex items-center justify-center">
                                              <span className="absolute h-5 w-5 animate-ping text-slate-500 opacity-30" style={{ animationDuration: '3s' }}>
                                                <DocumentTextIcon className="h-5 w-5" />
                                              </span>
                                            </span>
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent 
                                          className="w-80 p-4 bg-white border border-gray-200 shadow-lg"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <div className="space-y-2">
                                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Phase Notes</h4>
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                              {phase.notes}
                                            </p>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                  <td className="px-2 py-1 text-sm text-slate-800 text-center border border-gray-300">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          className="inline-flex items-center justify-center p-1.5 rounded hover:bg-gray-100 focus:outline-none"
                                          aria-label="Phase actions"
                                        >
                                          <EllipsisVerticalIcon className="w-5 h-5 text-gray-600" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-40">
                                        <DropdownMenuItem
                                          className="cursor-pointer"
                                          onClick={() => handleEditPhase(vendor, phase)}
                                        >
                                          Edit phase
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="cursor-pointer text-red-600 focus:text-red-700"
                                          onClick={() => handleDeletePhase(phase)}
                                        >
                                          Delete phase
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={7} className="px-2 py-4 text-center text-slate-500">
                                  <div className="space-y-3">
                                    <p className="text-sm font-medium">No APM phases found for this vendor.</p>
                                    <button 
                                      className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded text-sm transition-colors font-medium"
                                      onClick={() => handleAddPhase(vendor)}
                                    >
                                      Add First Phase
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                            
                            {/* Add Phase Button Row (when phases exist) */}
                            {vendor.apm_phases && vendor.apm_phases.length > 0 && (
                              <tr className="bg-slate-100">
                                <td colSpan={7} className="px-2 py-2 text-center">
                                  <button 
                                    className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded text-sm transition-colors font-medium"
                                    onClick={() => handleAddPhase(vendor)}
                                  >
                                    Add New Phase
                                  </button>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
          })}
        </tbody>
      </table>
      

      {/* APM Phase Modal for Add/Edit */}
      <APMPhaseModal
        isOpen={isPhaseModalOpen}
        onClose={() => setIsPhaseModalOpen(false)}
        onSubmit={handlePhaseModalSubmit}
        vendor={selectedVendorForPhase}
        vendorName={selectedVendorForPhase ? getVendorName(selectedVendorForPhase.vendor_id) : undefined}
        existingPhase={selectedPhase}
        mode={modalMode}
      />

      {/* Delete Phase Confirmation Dialog */}
      <AlertDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={cancelDeletePhase}
        onConfirm={confirmDeletePhase}
        title={`Delete APM Phase`}
        message={`Are you sure you want to delete the "${deleteConfirmation.phaseName}" phase? This action cannot be undone.`}
        confirmText="Delete Phase"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Delete Vendor Confirmation Dialog */}
      <AlertDialog
        isOpen={deleteVendorConfirmation.isOpen}
        onClose={cancelDeleteVendor}
        onConfirm={confirmDeleteVendor}
        title={`Remove Vendor from Project`}
        message={`Are you sure you want to remove "${deleteVendorConfirmation.vendorName}" from this project? This action cannot be undone.`}
        confirmText="Remove Vendor"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default APMVendorTable;