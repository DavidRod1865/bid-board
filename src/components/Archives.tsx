import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArchiveBoxIcon } from '@heroicons/react/24/outline';
import type { Bid } from '../types';
import Sidebar from './ui/Sidebar';
import SearchFilters from './Dashboard/SearchFilters';
import ConfirmationModal from './ui/ConfirmationModal';
import { useToast } from '../hooks/useToast';
import { dbOperations } from '../lib/supabase';
import { formatDate, isDateInUrgencyPeriod, isDateMatch } from '../utils/formatters';
import { getStatusColor } from '../utils/statusUtils';

interface ArchivesProps {
  onAddVendor?: () => void;
  onBidRestored?: (bid: Bid) => void;
}

const Archives: React.FC<ArchivesProps> = ({ onAddVendor, onBidRestored }) => {
  const [archivedBids, setArchivedBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const navigate = useNavigate();
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const { showSuccess, showError } = useToast();

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

  const handleUnarchiveBid = async (bidId: number) => {
    try {
      const bidToRestore = archivedBids.find(bid => bid.id === bidId);
      await dbOperations.unarchiveBid(bidId);
      
      // Remove from archived bids local state
      setArchivedBids(prev => prev.filter(bid => bid.id !== bidId));
      
      // Notify parent component if callback is provided
      if (onBidRestored && bidToRestore) {
        // Create the restored bid with archive fields reset
        const restoredBid: Bid = {
          ...bidToRestore,
          archived: false,
          archived_at: null,
          archived_by: null
        };
        onBidRestored(restoredBid);
      }
      
      showSuccess('Bid Restored', 'Bid has been restored to the main board');
    } catch {
      showError('Error', 'Failed to restore bid');
    }
  };

  const confirmUnarchive = (bid: Bid) => {
    setConfirmModal({
      isOpen: true,
      title: 'Restore Bid',
      message: `Are you sure you want to restore "${bid.project_name}" to the main board?`,
      onConfirm: () => {
        handleUnarchiveBid(bid.id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleRowClick = (bidId: number, event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (
      target.tagName === "BUTTON" ||
      target.closest("button")
    ) {
      return;
    }
    navigate(`/project/${bidId}`);
  };

  // Filter bids based on search term and filters
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

    // Filter by urgency (based on due_date)
    if (urgencyFilter) {
      filtered = filtered.filter(bid => isDateInUrgencyPeriod(bid.due_date, urgencyFilter));
    }

    // Filter by specific date
    if (dateFilter) {
      filtered = filtered.filter(bid => isDateMatch(bid.due_date, dateFilter));
    }
    
    return filtered;
  }, [archivedBids, searchTerm, statusFilter, urgencyFilter, dateFilter]);

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
      />

      <div className="flex-1 flex flex-col mx-auto w-full">
        <div className="p-6 pb-0">
          <SearchFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            urgencyFilter={urgencyFilter}
            setUrgencyFilter={setUrgencyFilter}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            searchPlaceholder="Search archived bids..."
          />
        </div>
        
        <div className="flex-1 p-6 pt-4">
          {!loading && filteredBids.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <ArchiveBoxIcon className="mx-auto h-24 w-24" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter.length > 0 || urgencyFilter || dateFilter 
                  ? 'No matching archived bids' 
                  : 'No archived bids'
                }
              </h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter.length > 0 || urgencyFilter || dateFilter
                  ? 'Try adjusting your search filters' 
                  : 'Archived bids will appear here when projects are won or lost'
                }
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
              {/* Table Header */}
              <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_0.5fr] bg-gray-50 border-b border-gray-200 px-4 py-3">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Project</div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">General Contractor</div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Status</div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Bid Date</div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Archived Date</div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Archived By</div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Actions</div>
              </div>

              {/* Table Body */}
              <div className="flex-1 overflow-y-auto">
                {filteredBids.map((bid) => {
                  return (
                    <div
                      key={bid.id}
                      className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_0.5fr] border-b border-gray-200 px-4 py-3 items-center transition-all relative hover:bg-gray-50 cursor-pointer"
                      onClick={(e) => handleRowClick(bid.id, e)}
                    >
                      {/* Status accent line */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1"
                        style={{ backgroundColor: getStatusColor(bid.status) }}
                      ></div>

                      {/* Project */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{bid.project_name}</div>
                          {bid.project_address && (
                            <div className="text-sm text-gray-500">{bid.project_address}</div>
                          )}
                        </div>
                      </div>

                      {/* General Contractor */}
                      <div className="text-sm text-gray-600 text-center">
                        {bid.general_contractor || 'Not specified'}
                      </div>

                      {/* Status */}
                      <div className="flex justify-center">
                        <span className={`px-3 py-2 rounded text-xs font-medium text-white w-32 text-center`}
                              style={{ backgroundColor: getStatusColor(bid.status) }}>
                          {bid.status}
                        </span>
                      </div>
                      
                      {/* Due Date */}
                      <div className="text-sm text-gray-600 text-center">
                        {formatDate(bid.due_date)}
                      </div>


                      {/* Archived Date */}
                      <div className="text-sm text-gray-600 text-center">
                        {bid.archived_at ? formatDate(bid.archived_at) : 'Unknown'}
                      </div>

                      {/* Archived By */}
                      <div className="text-sm text-gray-600 text-center">
                        {(bid as Bid & { archived_by_user?: { name?: string } }).archived_by_user?.name || 'Unknown'}
                      </div>

                      {/* Actions */}
                      <div className="flex justify-center">
                        <button
                          onClick={() => confirmUnarchive(bid)}
                          className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Restore"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
};

export default Archives;