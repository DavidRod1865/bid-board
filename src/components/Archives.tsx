import React, { useState, useMemo, useEffect } from 'react';
import type { Bid } from '../types';
import Sidebar from './ui/Sidebar';
import ConfirmationModal from './ui/ConfirmationModal';
import { useToast } from '../hooks/useToast';
import { dbOperations } from '../lib/supabase';
import { formatDate } from '../utils/formatters';

interface ArchivesProps {
  onAddVendor?: () => void;
  onBidRestored?: (bid: Bid) => void;
}

const Archives: React.FC<ArchivesProps> = ({ onAddVendor, onBidRestored }) => {
  const [archivedBids, setArchivedBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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

  useEffect(() => {
    loadArchivedBids();
  }, []);

  const loadArchivedBids = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dbOperations.getArchivedBids();
      
      // Transform the data to match our Bid interface
      const transformedBids = data.map((bid: any) => ({
        ...bid,
        created_by_user: bid.created_by_user,
        assigned_user: bid.assigned_user,
        archived_by_user: bid.archived_by_user
      }));
      
      setArchivedBids(transformedBids);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load archived bids');
      showError('Error', 'Failed to load archived bids');
    } finally {
      setLoading(false);
    }
  };

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
    } catch (err) {
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

  // Filter bids based on search term
  const filteredBids = useMemo(() => {
    if (!searchTerm.trim()) return archivedBids;
    
    const term = searchTerm.toLowerCase();
    return archivedBids.filter(bid => 
      bid.project_name?.toLowerCase().includes(term) ||
      bid.general_contractor?.toLowerCase().includes(term) ||
      bid.project_address?.toLowerCase().includes(term) ||
      bid.status?.toLowerCase().includes(term)
    );
  }, [archivedBids, searchTerm]);

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

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Archived Bids</h1>
              <p className="text-sm text-gray-600 mt-1">
                {filteredBids.length} archived bid{filteredBids.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            {/* Search */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search archived bids..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#d4af37] w-80"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {filteredBids.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📁</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No matching archived bids' : 'No archived bids'}
              </h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? 'Try adjusting your search term' 
                  : 'Archived bids will appear here when projects are won or lost'
                }
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Table Header */}
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
                <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_0.5fr] gap-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <div>Project</div>
                  <div>General Contractor</div>
                  <div>Due Date</div>
                  <div>Status</div>
                  <div>Archived Date</div>
                  <div>Archived By</div>
                  <div>Actions</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200">
                {filteredBids.map((bid) => (
                  <div
                    key={bid.id}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_0.5fr] gap-4 items-center">
                      {/* Project */}
                      <div>
                        <div className="font-medium text-gray-900">{bid.project_name}</div>
                        {bid.project_address && (
                          <div className="text-sm text-gray-500">{bid.project_address}</div>
                        )}
                      </div>

                      {/* General Contractor */}
                      <div className="text-sm text-gray-900">
                        {bid.general_contractor || 'Not specified'}
                      </div>

                      {/* Due Date */}
                      <div className="text-sm text-gray-900">
                        {formatDate(bid.due_date)}
                      </div>

                      {/* Status */}
                      <div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          bid.status === 'Won' 
                            ? 'bg-green-100 text-green-800'
                            : bid.status === 'Lost'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {bid.status}
                        </span>
                      </div>

                      {/* Archived Date */}
                      <div className="text-sm text-gray-500">
                        {bid.archived_at ? formatDate(bid.archived_at) : 'Unknown'}
                      </div>

                      {/* Archived By */}
                      <div className="text-sm text-gray-500">
                        {(bid as any).archived_by_user?.name || 'Unknown'}
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end">
                        <button
                          onClick={() => confirmUnarchive(bid)}
                          className="p-1 text-gray-400 hover:text-[#d4af37] transition-colors"
                          title="Restore to main board"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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