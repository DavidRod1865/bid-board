import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArchiveBoxIcon } from '@heroicons/react/24/outline';
import type { Bid, ProjectNote } from '../types';
import Sidebar from './ui/Sidebar';
import SearchFilters from './Dashboard/SearchFilters';
import AlertDialog from './ui/AlertDialog';
import { DataTable } from './ui/data-table';
import { createArchiveColumns } from '../lib/table-columns/archive-columns';
import { useToast } from '../hooks/useToast';
import { useBulkSelection, useClearSelectionOnFilterChange } from '../hooks/useBulkSelection';
import { useBulkActions, getBulkActionConfirmationMessage, getBulkActionConfirmText } from '../hooks/useBulkActions';
import { dbOperations } from '../lib/supabase';
import { isDateInRange } from '../utils/formatters';
import { getStatusColor } from '../utils/statusUtils';

interface ArchivesProps {
  onAddVendor?: () => void;
  onBidRestored?: (bid: Bid) => void;
  projectNotes?: ProjectNote[];
}

const Archives: React.FC<ArchivesProps> = ({ onAddVendor, projectNotes = [] }) => {
  const [archivedBids, setArchivedBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{startDate: Date | null, endDate: Date | null}>({
    startDate: null,
    endDate: null
  });
  
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
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
        loadArchivedBids();
      }
    }
  });

  // Clear selection when filters change
  useClearSelectionOnFilterChange(clearSelection, [searchTerm, statusFilter.length, dateRange]);

  const { showError } = useToast();

  const loadArchivedBids = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dbOperations.getArchivedBids();
      
      // Transform the data to match our Bid interface
      const transformedBids = data.map((bid: Record<string, unknown>) => ({
        ...bid,
        created_by_user: bid.created_by_user,
        assigned_user: bid.assigned_user,
        archived_by_user: bid.archived_by_user
      }));
      
      setArchivedBids(transformedBids as unknown as Bid[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load archived bids');
      showError('Error', 'Failed to load archived bids');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadArchivedBids();
  }, [loadArchivedBids]);


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


  // Filter and sort bids based on search term and filters
  const filteredBids = useMemo(() => {
    if (!archivedBids || archivedBids.length === 0) {
      return [];
    }

    let filtered = archivedBids;
    
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
    
    // Sort by due_date ascending
    filtered.sort((a, b) => {
      const dateA = new Date(a.due_date).getTime();
      const dateB = new Date(b.due_date).getTime();
      return dateA - dateB;
    });
    
    return filtered;
  }, [archivedBids, searchTerm, statusFilter, dateRange]);

  // Pagination calculations - applied to filtered bids
  const totalPages = Math.ceil(filteredBids.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBids = filteredBids.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter.length, dateRange]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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

  // Create column definitions with context
  const columns = useMemo(() => {
    return createArchiveColumns({
      projectNotes,
      getMostRecentNote
    });
  }, [projectNotes]);

  // Row selection for DataTable
  const rowSelection = useMemo(() => {
    const selection: Record<string, boolean> = {};
    paginatedBids.forEach((bid, index) => {
      if (selectedBids.has(bid.id)) {
        selection[index.toString()] = true;
      }
    });
    return selection;
  }, [selectedBids, paginatedBids]);

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
          onBulkOnHold={handleBulkOnHold}
          onBulkDelete={handleBulkDelete}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#d4af37] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading archived bids...</p>
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
          onBulkOnHold={handleBulkOnHold}
          onBulkDelete={handleBulkDelete}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Archives</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={loadArchivedBids}
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
        onBulkOnHold={handleBulkOnHold}
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
            searchPlaceholder="Search archived bids..."
          />
        </div>
        
        <div className="flex-1 overflow-auto p-6 pt-4">
          <DataTable
            columns={columns}
            data={paginatedBids}
            enableRowSelection={true}
            rowSelection={rowSelection}
            onRowSelectionChange={(selection) => {
              const newSelectedIds = new Set<number>();
              Object.entries(selection).forEach(([index, isSelected]) => {
                if (isSelected) {
                  const bidIndex = parseInt(index);
                  if (paginatedBids[bidIndex]) {
                    newSelectedIds.add(paginatedBids[bidIndex].id);
                  }
                }
              });

              // Call handleBidSelect for each change
              paginatedBids.forEach((bid) => {
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
                ? 'No matching archived bids'
                : 'No archived bids'
            }
            emptyIcon={ArchiveBoxIcon}
            getRowClassName={getRowClassName}
            getRowStyle={getRowStyle}
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