import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PauseIcon } from '@heroicons/react/24/outline';
import type { Bid, ProjectNote } from '../../../shared/types';
import Sidebar from '../../../shared/components/ui/Sidebar';
import PageHeader from '../../../shared/components/ui/PageHeader';
import AlertDialog from '../../../shared/components/ui/AlertDialog';
import { DataTable } from '../../../shared/components/ui/data-table';
import { createAPMOnHoldColumns } from '../../../shared/services/table-columns/archive-columns';
import { useToast } from '../../../shared/hooks/useToast';
import { useBulkSelection, useClearSelectionOnFilterChange } from '../../../shared/hooks/useBulkSelection';
import { useBulkActions, getBulkActionConfirmationMessage, getBulkActionConfirmText } from '../../../shared/hooks/useBulkActions';
import { dbOperations } from '../../../shared/services/supabase';
import { isDateInRange } from '../../../shared/utils/formatters';

interface APMOnHoldProps {
  onAddVendor?: () => void;
  onBidRestored?: (bid: Bid) => void;
  projectNotes?: ProjectNote[];
}

const APMOnHold: React.FC<APMOnHoldProps> = ({ projectNotes = [] }) => {
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
      
      // Filter for projects sent to APM that are on-hold by APM (apm_on_hold = true, apm_archived = false)
      const apmOnHoldOnly = data.filter((bid: Bid) => 
        bid.sent_to_apm === true && 
        bid.apm_on_hold === true && 
        bid.apm_archived === false
      );
      
      // Transform the data to match our Bid interface
      const transformedBids = apmOnHoldOnly.map((bid: Record<string, unknown>) => ({
        ...bid,
        created_by_user: bid.created_by_user,
        assigned_user: bid.assigned_user,
        on_hold_by_user: bid.on_hold_by_user
      }));
      
      setOnHoldBids(transformedBids as unknown as Bid[]);
    } catch (err) {
      console.error('Error loading APM on-hold bids:', err);
      setError(err instanceof Error ? err.message : 'Failed to load on-hold APM projects');
      showError('Load Failed', 'Failed to load on-hold APM projects. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Load data on component mount
  useEffect(() => {
    loadOnHoldBids();
  }, [loadOnHoldBids]);

  // Filter on-hold bids based on search and filters
  const filteredBids = useMemo(() => {
    if (!onHoldBids || onHoldBids.length === 0) {
      return [];
    }

    let filtered = onHoldBids;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(bid =>
        bid.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bid.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bid.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bid.general_contractor?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status (multiple selection)
    if (statusFilter.length > 0) {
      filtered = filtered.filter(bid => statusFilter.includes(bid.status));
    }

    // Filter by date range (using due_date)
    if (dateRange.startDate || dateRange.endDate) {
      filtered = filtered.filter(bid => isDateInRange(bid.due_date, dateRange.startDate, dateRange.endDate));
    }

    return filtered;
  }, [onHoldBids, searchTerm, statusFilter, dateRange]);

  // Bulk action handlers
  const handleBulkRestore = () => {
    const bidIds = Array.from(selectedBids);
    showConfirmation('moveToActive', bidIds.length, () => {
      executeBulkAction('apmMoveToActive', bidIds);
    });
  };

  const handleBulkArchive = () => {
    const bidIds = Array.from(selectedBids);
    showConfirmation('archive', bidIds.length, () => {
      executeBulkAction('apmArchive', bidIds);
    });
  };

  const handleBulkDelete = () => {
    const bidIds = Array.from(selectedBids);
    showConfirmation('delete', bidIds.length, () => {
      executeBulkAction('delete', bidIds);
    });
  };

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

  // Create columns for the data table
  const columns = useMemo(() => 
    createAPMOnHoldColumns({
      projectNotes,
      getMostRecentNote
    }), 
    [projectNotes]
  );

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

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <PauseIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading On-Hold Projects</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadOnHoldBids}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        showViewToggle={true}
      />
      
      <div className="flex-1 flex flex-col mx-auto w-full">
        <div className="flex-shrink-0">
          <PageHeader
            title="On-Hold Projects"
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            searchPlaceholder="Search on-hold projects..."
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            dateRange={dateRange}
            setDateRange={setDateRange}
            showStatusFilter={true}
            showDateFilter={true}
            bulkActions={{
              selectedCount: selectedBids.size,
              actions: [
                { label: "Move Project to Active", onClick: handleBulkRestore, color: "blue" },
                { label: "Move Project to Archive", onClick: handleBulkArchive, color: "orange" }
              ],
              onDelete: handleBulkDelete
            }}
          />
        </div>
        
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
            </div>
          ) : onHoldBids.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <PauseIcon className="mx-auto h-24 w-24" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No on-hold projects</h3>
              <p className="text-gray-600 mb-4">On-hold projects will appear here</p>
              <button
                onClick={() => navigate('/apm/projects')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Go to Active Projects
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-auto pt-0">
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
                    ? 'No matching on-hold APM projects'
                    : 'No on-hold APM projects'
                }
                emptyIcon={PauseIcon}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions Confirmation Modal */}
      <AlertDialog
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmation}
        onConfirm={confirmModal.onConfirm}
        title={getBulkActionConfirmationMessage(confirmModal.type, confirmModal.count)}
        message={`This will ${
          confirmModal.type === 'moveToActive' 
            ? 'restore the selected APM projects from on-hold status' 
            : confirmModal.type === 'archive'
            ? 'move the selected APM projects to archive'
            : 'permanently delete the selected APM projects'
        }.`}
        confirmText={getBulkActionConfirmText(confirmModal.type)}
        cancelText="Cancel"
        variant={confirmModal.type === 'delete' ? 'danger' : 'warning'}
      />
    </div>
  );
};

export default APMOnHold;