import React, { useState, useMemo } from 'react';
import type { Bid, ProjectNote } from '../../../shared/types';
import Sidebar from '../../../shared/components/ui/Sidebar';
import PageHeader from '../../../shared/components/ui/PageHeader';
import AlertDialog from '../../../shared/components/ui/AlertDialog';
import BidTable from '../../estimating/components/BidPricing/BidTable';
// import { useToast } from '../../../shared/hooks/useToast';
import { useBulkSelection, useClearSelectionOnFilterChange } from '../../../shared/hooks/useBulkSelection';
import { useBulkActions, getBulkActionConfirmationMessage, getBulkActionConfirmText } from '../../../shared/hooks/useBulkActions';
import { isDateInRange } from '../../../shared/utils/formatters';

interface APMOnHoldProps {
  bids?: Bid[];
  onAddVendor?: () => void;
  onBidRestored?: (bid: Bid) => void;
  projectNotes?: ProjectNote[];
}

const APMOnHold: React.FC<APMOnHoldProps> = ({ bids = [], projectNotes = [] }) => {
  const [error] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{startDate: Date | null, endDate: Date | null}>({
    startDate: null,
    endDate: null
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

  // Filter on-hold bids based on search and filters
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

    // Filter by date range (using due_date)
    if (dateRange.startDate || dateRange.endDate) {
      filtered = filtered.filter(bid => isDateInRange(bid.due_date, dateRange.startDate, dateRange.endDate));
    }

    return filtered;
  }, [bids, searchTerm, statusFilter, dateRange]);

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



  // Dummy handlers for sidebar (APM on-hold page doesn't need these)
  const handleStatusFilter = () => {};

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar
          statusFilter={[]}
          setStatusFilter={handleStatusFilter}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading APM On-Hold Projects</h2>
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        statusFilter={[]}
        setStatusFilter={handleStatusFilter}
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
          <BidTable 
            bids={filteredBids}
            projectNotes={projectNotes}
            isLoading={false}
            selectedBids={selectedBids}
            onBidSelect={handleBidSelect}
            useAPMRouting={true}
          />
        </div>
      </div>

      {/* Confirmation Modal */}
      <AlertDialog
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmation}
        onConfirm={confirmModal.onConfirm}
        title={getBulkActionConfirmationMessage(confirmModal.type, confirmModal.count)}
        message={`This will ${
          confirmModal.type === 'moveToActive' 
            ? 'restore the selected projects from on-hold status' 
            : confirmModal.type === 'archive'
            ? 'move the selected projects to archive'
            : 'permanently delete the selected projects'
        }.`}
        confirmText={getBulkActionConfirmText(confirmModal.type)}
        cancelText="Cancel"
        variant={confirmModal.type === 'delete' ? 'danger' : 'warning'}
      />

    </div>
  );
};

export default APMOnHold;