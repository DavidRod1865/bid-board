import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PauseIcon } from '@heroicons/react/24/outline';
import type { Bid, ProjectNote } from '../types';
import Sidebar from './ui/Sidebar';
import SearchFilters from './Dashboard/SearchFilters';
import AlertDialog from './ui/AlertDialog';
import { DataTable } from './ui/data-table';
import { createOnHoldColumns } from '../lib/table-columns/archive-columns';
import { useToast } from '../hooks/useToast';
import { useBulkSelection, useClearSelectionOnFilterChange } from '../hooks/useBulkSelection';
import { useBulkActions, getBulkActionConfirmationMessage, getBulkActionConfirmText } from '../hooks/useBulkActions';
import { dbOperations } from '../lib/supabase';
import { isDateInRange } from '../utils/formatters';
import { getStatusColor } from '../utils/statusUtils';

interface OnHoldProps {
  onAddVendor?: () => void;
  onBidRestored?: (bid: Bid) => void;
  projectNotes?: ProjectNote[];
}

const OnHold: React.FC<OnHoldProps> = ({ onAddVendor, projectNotes = [] }) => {
  const [onHoldBids, setOnHoldBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{startDate: Date | null, endDate: Date | null}>({
    startDate: null,
    endDate: null
  });
  
  
  
  const navigate = useNavigate();

  // Bulk selection hooks
  const {
    selectedBids,
    handleBidSelect,
    clearSelection
  } = useBulkSelection();

  // Bulk actions hooks
  const { confirmModal, executeBulkAction, showConfirmation, closeConfirmation } = useBulkActions({
    onActionComplete: (_, result) => {
      if (result.success) {
        clearSelection();
        // Refresh data after successful bulk operation
        loadOnHoldBids();
      }
    }
  });

  // Clear selection when filters change
  useClearSelectionOnFilterChange(clearSelection, [searchTerm, statusFilter.length, dateRange]);

  const { showError } = useToast();

  const loadOnHoldBids = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Get all bids and filter for on-hold bids client-side
      const data = await dbOperations.getBids();
      
      // Filter for on-hold bids (archived = false, on_hold = true)
      const onHoldOnly = data.filter((bid: any) => !bid.archived && bid.on_hold);
      
      // Transform the data to match our Bid interface
      const transformedBids = onHoldOnly.map((bid: Record<string, unknown>) => ({
        ...bid,
        created_by_user: bid.created_by_user,
        assigned_user: bid.assigned_user,
        on_hold_by_user: bid.on_hold_by_user
      }));
      
      setOnHoldBids(transformedBids as unknown as Bid[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load on-hold bids');
      showError('Error', 'Failed to load on-hold bids');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadOnHoldBids();
  }, [loadOnHoldBids]);


  // Bulk action handlers
  const handleBulkMoveToActive = () => {
    const bidIds = Array.from(selectedBids);
    showConfirmation('moveToActive', bidIds.length, () => {
      executeBulkAction('moveToActive', bidIds);
    });
  };

  const handleBulkArchive = () => {
    const bidIds = Array.from(selectedBids);
    showConfirmation('archive', bidIds.length, () => {
      executeBulkAction('archive', bidIds);
    });
  };

  const handleBulkDelete = () => {
    const bidIds = Array.from(selectedBids);
    showConfirmation('delete', bidIds.length, () => {
      executeBulkAction('delete', bidIds);
    });
  };

  // Filter bids based on search term and filters
  const filteredBids = useMemo(() => {
    if (!onHoldBids || onHoldBids.length === 0) {
      return [];
    }

    let filtered = onHoldBids;
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(bid =>
        bid.project_name?.toLowerCase().includes(term) ||
        bid.general_contractor?.toLowerCase().includes(term) ||
        bid.project_address?.toLowerCase().includes(term) ||
        bid.status?.toLowerCase().includes(term)
      );
    }
    
    // Filter by status (multiple selection)
    if (statusFilter.length > 0) {
      filtered = filtered.filter(bid => statusFilter.includes(bid.status));
    }

    // Filter by date range
    if (dateRange.startDate || dateRange.endDate) {
      filtered = filtered.filter(bid => isDateInRange(bid.due_date, dateRange.startDate, dateRange.endDate));
    }
    
    return filtered;
  }, [onHoldBids, searchTerm, statusFilter, dateRange]);


  // Helper function to get most recent note for a bid
  const getMostRecentNote = (bidId: number) => {
    const bidNotes = projectNotes?.filter(note => note.bid_id === bidId) || [];
    if (bidNotes.length === 0) return '';
    
    // Sort by created_at descending and get the most recent
    const sortedNotes = bidNotes.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    return sortedNotes[0].content;
  };

  // Create column definitions with context
  const columns = useMemo(() => {
    return createOnHoldColumns({
      projectNotes,
      getMostRecentNote
    });
  }, [projectNotes]);

  // Row selection for DataTable
  const rowSelection = useMemo(() => {
    const selection: Record<string, boolean> = {};
    filteredBids.forEach((bid, index) => {
      if (selectedBids.has(bid.id)) {
        selection[index.toString()] = true;
      }
    });
    return selection;
  }, [selectedBids, filteredBids]);

  const getRowClassName = () => {
    // OnHold projects don't have urgency styling - always show status accent
    return 'hover:bg-gray-50 hover:-translate-y-px active:translate-y-0 border-l-4';
  };

  const getRowStyle = (bid: Bid) => {
    // OnHold always show status color on left border
    const statusColor = getStatusColor(bid.status);
    return { borderLeftColor: statusColor };
  };

  // Dummy handlers for sidebar (on-hold page doesn't need these)
  const handleStatusFilter = () => {};
  const handleNewProject = () => {};
  const handleCopyProject = () => {};

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar
          statusFilter={[]}
          setStatusFilter={handleStatusFilter}
          onNewProject={handleNewProject}
          onCopyProject={handleCopyProject}
          onAddVendor={onAddVendor || (() => {})}
          selectedBidsCount={selectedBids.size}
          onBulkMoveToActive={handleBulkMoveToActive}
          onBulkArchive={handleBulkArchive}
          onBulkDelete={handleBulkDelete}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#d4af37] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading on-hold bids...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar
          statusFilter={[]}
          setStatusFilter={handleStatusFilter}
          onNewProject={handleNewProject}
          onCopyProject={handleCopyProject}
          onAddVendor={onAddVendor || (() => {})}
          selectedBidsCount={selectedBids.size}
          onBulkMoveToActive={handleBulkMoveToActive}
          onBulkArchive={handleBulkArchive}
          onBulkDelete={handleBulkDelete}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading On-Hold Bids</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={loadOnHoldBids}
              className="px-4 py-2 bg-[#d4af37] text-white rounded-md hover:bg-[#b8941f] transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        statusFilter={[]}
        setStatusFilter={handleStatusFilter}
        onNewProject={handleNewProject}
        onCopyProject={handleCopyProject}
        onAddVendor={onAddVendor || (() => {})}
        selectedBidsCount={selectedBids.size}
        onBulkMoveToActive={handleBulkMoveToActive}
        onBulkArchive={handleBulkArchive}
        onBulkDelete={handleBulkDelete}
      />

      <div className="flex-1 flex flex-col mx-auto w-full">
        <div className="p-6 pb-0">
          <SearchFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            dateRange={dateRange}
            setDateRange={setDateRange}
            searchPlaceholder="Search on-hold bids..."
          />
        </div>
        
        <div className="flex-1 overflow-auto p-6 pt-4">
          <DataTable
            columns={columns}
            data={filteredBids}
            enableRowSelection={true}
            enableSorting={true}
            initialSorting={[{ id: "due_date", desc: false }]}
            rowSelection={rowSelection}
            onRowSelectionChange={(selection) => {
              const newSelectedIds = new Set<number>();
              Object.entries(selection).forEach(([index, isSelected]) => {
                if (isSelected) {
                  const bidIndex = parseInt(index);
                  if (filteredBids[bidIndex]) {
                    newSelectedIds.add(filteredBids[bidIndex].id);
                  }
                }
              });

              // Call handleBidSelect for each change
              filteredBids.forEach((bid) => {
                const wasSelected = selectedBids.has(bid.id);
                const isSelected = newSelectedIds.has(bid.id);
                
                if (wasSelected !== isSelected) {
                  handleBidSelect(bid.id, isSelected);
                }
              });
            }}
            onRowClick={(bid) => navigate(`/project/${bid.id}`)}
            isLoading={loading}
            emptyMessage={
              searchTerm || statusFilter.length > 0 || dateRange.startDate || dateRange.endDate
                ? 'No matching on-hold bids'
                : 'No on-hold bids'
            }
            emptyIcon={PauseIcon}
            getRowClassName={getRowClassName}
            getRowStyle={getRowStyle}
          />
        </div>
      </div>

      {/* Confirmation Modal */}
      <AlertDialog
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmation}
        onConfirm={confirmModal.onConfirm}
        title={getBulkActionConfirmationMessage(confirmModal.type, confirmModal.count)}
        message={`This will ${confirmModal.type === 'moveToActive' ? 'move the selected projects back to active status' : 'perform the selected action on the selected projects'}.`}
        confirmText={getBulkActionConfirmText(confirmModal.type)}
        cancelText="Cancel"
        variant={confirmModal.type === 'delete' ? 'danger' : 'warning'}
      />
    </div>
  );
};

export default OnHold;