import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArchiveBoxIcon } from '@heroicons/react/24/outline';
import type { Bid, ProjectNote } from '../../../shared/types';
import Sidebar from '../../../shared/components/ui/Sidebar';
import PageHeader from '../../../shared/components/ui/PageHeader';
import AlertDialog from '../../../shared/components/ui/AlertDialog';
import { DataTable } from '../../../shared/components/ui/data-table';
import { createArchiveColumns } from '../../../shared/services/table-columns/archive-columns';
// import { useToast } from '../../../shared/hooks/useToast';
import { useDynamicPageSize } from '../../../shared/hooks/useDynamicPageSize';
import { useBulkSelection, useClearSelectionOnFilterChange } from '../../../shared/hooks/useBulkSelection';
import { useBulkActions, getBulkActionConfirmationMessage, getBulkActionConfirmText } from '../../../shared/hooks/useBulkActions';
import { isDateInRange } from '../../../shared/utils/formatters';
import { getStatusColor } from '../../../shared/utils/statusUtils';

interface ArchivesProps {
  bids?: Bid[];
  onAddVendor?: () => void;
  onBidRestored?: (bid: Bid) => void;
  projectNotes?: ProjectNote[];
}

const Archives: React.FC<ArchivesProps> = ({ bids = [], projectNotes = [] }) => {
  const [error] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{startDate: Date | null, endDate: Date | null}>({
    startDate: null,
    endDate: null
  });
  
  
  const navigate = useNavigate();

  // Dynamic page size management
  const { 
    pageSize, 
    availablePageSizes, 
    setManualPageSize 
  } = useDynamicPageSize({
    storageKey: 'archives-page-size',
    rowHeight: 65,
    reservedHeight: 460
  });

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
        // Data refreshes automatically via real-time system in AppContent
      }
    }
  });

  // Clear selection when filters change
  useClearSelectionOnFilterChange(clearSelection, [searchTerm, statusFilter.length, dateRange]);

  // const { showError } = useToast();


  // Bulk action handlers
  const handleBulkMoveToActive = () => {
    const bidIds = Array.from(selectedBids);
    showConfirmation('moveToActive', bidIds.length, () => {
      executeBulkAction('moveToActive', bidIds);
    });
  };

  const handleBulkOnHold = () => {
    const bidIds = Array.from(selectedBids);
    showConfirmation('onHold', bidIds.length, () => {
      executeBulkAction('onHold', bidIds);
    });
  };

  const handleBulkDelete = () => {
    const bidIds = Array.from(selectedBids);
    showConfirmation('delete', bidIds.length, () => {
      executeBulkAction('delete', bidIds);
    });
  };

  const handleBulkSendToAPM = () => {
    const bidIds = Array.from(selectedBids);
    showConfirmation('sendToAPM', bidIds.length, () => {
      executeBulkAction('sendToAPM', bidIds);
    });
  };


  // Filter bids based on search term and filters  
  const filteredBids = useMemo(() => {
    if (!bids || bids.length === 0) {
      return [];
    }

    let filtered = bids;
    
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
  }, [bids, searchTerm, statusFilter, dateRange]);


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
    return createArchiveColumns({
      projectNotes,
      getMostRecentNote
    });
  }, [projectNotes, getMostRecentNote]);

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
    // Archives don't have urgency styling - always show status accent
    return 'hover:bg-gray-50 hover:-translate-y-px active:translate-y-0 border-l-4';
  };

  const getRowStyle = (bid: Bid) => {
    // Archives always show status color on left border
    const statusColor = getStatusColor(bid.status);
    return { borderLeftColor: statusColor };
  };

  // Dummy handlers for sidebar (archives page doesn't need these)
  const handleStatusFilter = () => {};

  if (error) {
    return (
      <div className="flex h-screen bg-slate-100">
        <Sidebar
          statusFilter={[]}
          setStatusFilter={handleStatusFilter}
          showViewToggle={true}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Archives</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
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
    <div className="flex h-screen bg-slate-100">
      <Sidebar
        statusFilter={[]}
        setStatusFilter={handleStatusFilter}
        showViewToggle={true}
      />

      <div className="flex-1 flex flex-col mx-auto w-full">
        <div className="flex-shrink-0">
          {/* Page Title */}
          <div className="px-6 pt-4">
            <h1 className="text-2xl font-bold text-gray-900">Archived Bids</h1>
          </div>
          
          <PageHeader
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            searchPlaceholder="Search archived bids..."
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            dateRange={dateRange}
            setDateRange={setDateRange}
            showStatusFilter={true}
            showDateFilter={true}
            bulkActions={{
              selectedCount: selectedBids.size,
              actions: [
                { label: "Move to Active", onClick: handleBulkMoveToActive, color: "blue" },
                { label: "Move to On-Hold", onClick: handleBulkOnHold, color: "yellow" },
                { label: "Send to APM", onClick: handleBulkSendToAPM, color: "blue" }
              ],
              onDelete: handleBulkDelete
            }}
          />
        </div>
        
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
            isLoading={false}
            emptyMessage="No projects found"
            emptyIcon={ArchiveBoxIcon}
            pageSize={pageSize}
            enablePageSizeSelector={true}
            availablePageSizes={availablePageSizes}
            onPageSizeChange={setManualPageSize}
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
        message={`This will ${confirmModal.type === 'moveToActive' ? 'restore the selected projects to active status' : 'perform the selected action on the selected projects'}.`}
        confirmText={getBulkActionConfirmText(confirmModal.type)}
        cancelText="Cancel"
        variant={confirmModal.type === 'delete' ? 'danger' : 'warning'}
      />

    </div>
  );
};

export default Archives;