import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PauseIcon } from '@heroicons/react/24/outline';
import type { Bid, ProjectNote } from '../types';
import Sidebar from './ui/Sidebar';
import SearchFilters from './Dashboard/SearchFilters';
import ConfirmationModal from './ui/ConfirmationModal';
import SelectableTable, { type TableColumn } from './ui/SelectableTable';
import { useToast } from '../hooks/useToast';
import { useBulkSelection, useClearSelectionOnFilterChange } from '../hooks/useBulkSelection';
import { useBulkActions, getBulkActionConfirmationMessage, getBulkActionConfirmText } from '../hooks/useBulkActions';
import { dbOperations } from '../lib/supabase';
import { formatDate, isDateInRange } from '../utils/formatters';
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
  
  // Sorting state
  const [sortField, setSortField] = useState<keyof Bid | null>("due_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const navigate = useNavigate();

  // Bulk selection hooks
  const {
    selectedBids,
    handleBidSelect,
    handleSelectAll,
    clearSelection,
    isAllSelected,
    isSomeSelected
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

  // Sorting logic - applied to filtered bids before pagination
  const sortedBids = useMemo(() => {
    if (!sortField) return filteredBids;

    return [...filteredBids].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      // Handle null values
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return sortDirection === "asc" ? 1 : -1;
      if (bValue === null) return sortDirection === "asc" ? -1 : 1;

      // Special handling for date fields
      if (sortField === 'due_date' || sortField === 'on_hold_at') {
        const aDate = new Date(aValue as string);
        const bDate = new Date(bValue as string);
        const comparison = aDate.getTime() - bDate.getTime();
        return sortDirection === "asc" ? comparison : -comparison;
      }

      // Handle other data types
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredBids, sortField, sortDirection]);

  // Pagination calculations - applied to sorted bids
  const totalPages = Math.ceil(sortedBids.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBids = sortedBids.slice(startIndex, endIndex);

  // Reset to first page when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter.length, dateRange, sortField, sortDirection]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (field: keyof Bid) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
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

  // Table columns definition matching Dashboard layout
  const columns: TableColumn<Bid>[] = [
    {
      key: 'project',
      header: 'PROJECT NAME',
      render: (bid) => (
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="absolute left-0 top-0 bottom-0 w-1"
            style={{ backgroundColor: getStatusColor(bid.status) }}
          ></div>
          <span className="font-medium text-gray-900 whitespace-nowrap overflow-clip text-ellipsis min-w-0 text-sm">
            <div className="font-medium text-gray-900 text-sm">
              {bid.project_name}
            </div>
            {bid.project_address && (
              <div className="text-sm text-gray-500">
                {bid.project_address}
              </div>
            )}
          </span>
        </div>
      )
    },
    {
      key: 'contractor',
      header: 'GENERAL CONTRACTOR',
      className: 'flex items-center text-gray-600 text-sm whitespace-nowrap overflow-hidden text-ellipsis',
      render: (bid) => bid.general_contractor || 'Not specified'
    },
    {
      key: 'status',
      header: 'STATUS',
      headerClassName: 'text-center',
      className: 'flex flex-col items-center',
      render: (bid) => (
        <div className="flex items-center justify-center">
          <span 
            className="text-white border-none px-3 py-2 rounded text-xs font-medium w-32 text-center"
            style={{ backgroundColor: getStatusColor(bid.status) }}
          >
            {bid.status}
          </span>
        </div>
      )
    },
    {
      key: 'bidDate',
      header: 'BID DATE',
      headerClassName: 'text-center',
      className: 'flex items-center justify-center text-gray-600 text-sm',
      sortable: true,
      sortField: 'due_date',
      render: (bid) => (
        <div className="text-center">
          <span>{formatDate(bid.due_date, 'short')}</span>
        </div>
      )
    },
    {
      key: 'onHoldSince',
      header: 'ON HOLD SINCE',
      headerClassName: 'text-center',
      className: 'flex items-center justify-center text-gray-600 text-sm',
      sortable: true,
      sortField: 'on_hold_at',
      render: (bid) => (
        <div className="text-center">
          {bid.on_hold_at ? formatDate(bid.on_hold_at, 'short') : 'Unknown'}
        </div>
      )
    },
    {
      key: 'notes',
      header: 'NOTES',
      className: 'flex items-center text-gray-600 text-sm whitespace-nowrap overflow-hidden text-ellipsis',
      render: (bid) => getMostRecentNote(bid.id)
    }
  ];

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
          <SelectableTable
            bids={paginatedBids}
            columns={columns}
            selectedBids={selectedBids}
            onBidSelect={handleBidSelect}
            onSelectAll={(selected) => handleSelectAll(selected, paginatedBids)}
            onRowClick={(bid) => navigate(`/project/${bid.id}`)}
            isAllSelected={isAllSelected(paginatedBids)}
            isSomeSelected={isSomeSelected(paginatedBids)}
            loading={loading}
            emptyMessage={
              searchTerm || statusFilter.length > 0 || dateRange.startDate || dateRange.endDate
                ? 'No matching on-hold bids'
                : 'No on-hold bids'
            }
            emptyIcon={PauseIcon}
            gridCols="0.55fr 2.5fr 1.5fr 1fr 1.2fr 1fr 3fr"
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        </div>
        
        {/* Pagination Controls - Fixed at bottom of page */}
        {!loading && filteredBids.length > 0 && (
          <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center text-sm text-gray-700 order-2 sm:order-1">
              <span className="hidden sm:inline">Showing {startIndex + 1} to {Math.min(endIndex, filteredBids.length)} of {filteredBids.length} results</span>
              <span className="sm:hidden">{filteredBids.length} results</span>
            </div>
            
            <div className="flex items-center gap-3 order-1 sm:order-2">
              {/* Page navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-2 sm:px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                
                <span className="text-sm text-gray-700 whitespace-nowrap">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-2 sm:px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
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