import React, { useState, useMemo, useEffect } from 'react';
import { DocumentIcon } from '@heroicons/react/24/outline';
import type { User, Bid, BidVendor, Vendor, ProjectNote } from '../../types';
import BidTable from './BidTable';
import SearchFilters from './SearchFilters';
import Sidebar from '../ui/Sidebar';
import AddProjectModal from '../AddProjectModal';
import CopyProjectModal from '../CopyProjectModal';
import ConfirmationModal from '../ui/ConfirmationModal';
import ToastContainer from '../ui/ToastContainer';
import { useToast } from '../../hooks/useToast';
import { useBulkSelection, useClearSelectionOnFilterChange } from '../../hooks/useBulkSelection';
import { useBulkActions, getBulkActionConfirmationMessage, getBulkActionConfirmText } from '../../hooks/useBulkActions';
import { isDateInRange, getBidUrgency } from '../../utils/formatters';
import { 
  getVendorCostsDueWithinWeek,
  groupVendorCostsByBidAndDate,
  generateReportSummary
} from '../../utils/reportFilters';
import { generateWeeklyVendorCostsPDF } from '../../utils/pdfGenerator';
import emailService from '../../services/emailService';

interface DashboardProps {
  bids: Bid[];
  bidVendors?: BidVendor[];
  vendors?: Vendor[];
  projectNotes?: ProjectNote[];
  // setBids: React.Dispatch<React.SetStateAction<Bid[]>>; // TODO: Remove if not needed
  handleStatusChange: (bidId: number, newStatus: string) => Promise<void>;
  users: User[];
  isLoading?: boolean;
  onAddProject?: (projectData: Omit<Bid, 'id'>) => Promise<void>;
  onCopyProject?: (originalProjectId: number, newProjectData: Omit<Bid, 'id'>) => Promise<void>;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  bids, 
  bidVendors = [],
  vendors = [],
  projectNotes = [],
  // setBids, // TODO: Remove if not needed
  handleStatusChange, 
  users,
  isLoading = false,
  onAddProject,
  onCopyProject
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{startDate: Date | null, endDate: Date | null}>({
    startDate: null,
    endDate: null
  });
  const [overdueFilter, setOverdueFilter] = useState(false);
  
  // Sorting state
  const [sortField, setSortField] = useState<keyof Bid | null>("due_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Bulk selection hooks
  const {
    selectedBids,
    handleBidSelect,
    handleSelectAll,
    clearSelection
  } = useBulkSelection();

  // Bulk actions hooks  
  const { confirmModal, executeBulkAction, showConfirmation, closeConfirmation } = useBulkActions({
    onActionComplete: (_, result) => {
      if (result.success) {
        clearSelection();
        // Note: Dashboard relies on real-time subscriptions to refresh data automatically
      }
    }
  });

  // Clear selection when filters change
  useClearSelectionOnFilterChange(clearSelection, [searchTerm, statusFilter.length, dateRange, overdueFilter]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailingReport, setIsEmailingReport] = useState(false);
  const [showEmailConfirmModal, setShowEmailConfirmModal] = useState(false);
  const { toasts, removeToast, showSuccess, showError } = useToast();

  // Calculate overdue count for all bids
  const overdueCount = useMemo(() => {
    if (!bids || bids.length === 0) return 0;
    return bids.filter(bid => {
      const urgency = getBidUrgency(bid.due_date, bid.status);
      return urgency.level === 'overdue';
    }).length;
  }, [bids]);

  const filteredBids = useMemo(() => {
    if (!bids || bids.length === 0) {
      return [];
    }

    let filtered = bids;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(bid =>
        bid.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bid.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bid.status.toLowerCase().includes(searchTerm.toLowerCase())
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

    // Filter by overdue status
    if (overdueFilter) {
      filtered = filtered.filter(bid => {
        const urgency = getBidUrgency(bid.due_date, bid.status);
        return urgency.level === 'overdue';
      });
    }
    
    return filtered;
  }, [bids, searchTerm, statusFilter, dateRange, overdueFilter]);

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
      if (sortField === 'due_date' || sortField === 'archived_at') {
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
  }, [searchTerm, statusFilter.length, dateRange, overdueFilter, sortField, sortDirection]);

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

  const handleNewProject = () => {
    setIsAddModalOpen(true);
  };

  const handleCopyProject = () => {
    setIsCopyModalOpen(true);
  };


  // Bulk action handlers using reusable hooks
  const handleBulkArchive = () => {
    const bidIds = Array.from(selectedBids);
    showConfirmation('archive', bidIds.length, () => {
      executeBulkAction('archive', bidIds);
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

  const handleAddProject = async (projectData: Omit<Bid, 'id'>) => {
    if (!onAddProject) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddProject(projectData);
      setIsAddModalOpen(false);
      showSuccess('Project Added', `Successfully added ${projectData.title || projectData.project_name}`);
    } catch (error) {
      showError('Add Failed', error instanceof Error ? error.message : 'Failed to add project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyProjectSubmit = async (originalProjectId: number, newProjectData: Omit<Bid, 'id'>) => {
    if (!onCopyProject) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onCopyProject(originalProjectId, newProjectData);
      setIsCopyModalOpen(false);
      showSuccess('Project Copied', `Successfully copied project as ${newProjectData.title || newProjectData.project_name}`);
    } catch (error) {
      showError('Copy Failed', error instanceof Error ? error.message : 'Failed to copy project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWeeklyCostsReportClick = () => {
    setShowEmailConfirmModal(true);
  };

  const handleConfirmEmailReport = async () => {
    setShowEmailConfirmModal(false);
    setIsEmailingReport(true);
    try {
      // Filter bid vendors with due dates within 7 days AND all vendors for bids due within 7 days
      const weeklyDueBidVendors = getVendorCostsDueWithinWeek(bidVendors, bids);
      
      if (weeklyDueBidVendors.length === 0) {
        showError(
          'No Upcoming Deadlines',
          'No bids or vendor costs are due within the next 7 days.'
        );
        return;
      }

      // Group the data by bid and due date
      const reportData = groupVendorCostsByBidAndDate(weeklyDueBidVendors, bids, vendors);
      
      // Generate summary statistics
      const summary = generateReportSummary(reportData);
      
      // Generate PDF
      const pdfBlob = generateWeeklyVendorCostsPDF(reportData, summary);
      
      // Send email
      await emailService.sendWeeklyVendorCostsReport(
        pdfBlob,
        summary.totalProjects,
        summary.totalPendingVendors
      );
      
      showSuccess(
        'Report Sent Successfully! 📧',
        `Report includes ${summary.totalProjects} projects with bids and/or vendor costs due within 7 days. ${summary.totalPendingVendors} vendor submissions are pending.`
      );
    } catch (error) {
      showError(
        'Report Failed ❌',
        error instanceof Error 
          ? `Failed to send weekly report: ${error.message}`
          : 'Failed to send weekly report. Please try again.'
      );
    } finally {
      setIsEmailingReport(false);
    }
  };

  // Show loading state if data is being fetched
  if (isLoading && (!bids || bids.length === 0)) {
    return (
      <div className="flex h-screen">
        <Sidebar
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onNewProject={handleNewProject}
          onCopyProject={handleCopyProject}
          onWeeklyCostsReport={handleWeeklyCostsReportClick}
          isEmailingReport={isEmailingReport}
          selectedBidsCount={selectedBids.size}
          onBulkArchive={handleBulkArchive}
          onBulkOnHold={handleBulkOnHold}
          onBulkDelete={handleBulkDelete}
        />
        
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading projects...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onNewProject={handleNewProject}
        onCopyProject={handleCopyProject}
        onWeeklyCostsReport={handleWeeklyCostsReportClick}
        isEmailingReport={isEmailingReport}
        selectedBidsCount={selectedBids.size}
        onBulkArchive={handleBulkArchive}
        onBulkOnHold={handleBulkOnHold}
        onBulkDelete={handleBulkDelete}
      />
      
      <div className="flex-1 flex flex-col mx-auto w-full">
        <div className="p-6 pb-0 flex-shrink-0">
          <SearchFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            dateRange={dateRange}
            setDateRange={setDateRange}
            onNewProject={handleNewProject}
            searchPlaceholder="Search projects..."
            overdueFilter={overdueFilter}
            setOverdueFilter={setOverdueFilter}
            overdueCount={overdueCount}
          />
        </div>
        
        <div className="flex-1 overflow-auto p-6 pt-4">
          {!isLoading && bids.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <DocumentIcon className="mx-auto h-24 w-24" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first project</p>
              <button
                onClick={handleNewProject}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Create Project
              </button>
            </div>
          ) : (
            <BidTable 
              bids={paginatedBids} 
              bidVendors={bidVendors}
              projectNotes={projectNotes}
              onStatusChange={handleStatusChange}
              isLoading={isLoading}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              selectedBids={selectedBids}
              onBidSelect={handleBidSelect}
              onSelectAll={(selected) => handleSelectAll(selected, paginatedBids)}
            />
          )}
        </div>
        
        {/* Pagination Controls - Fixed at bottom of page */}
        {!isLoading && sortedBids.length > 0 && (
          <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center text-sm text-gray-700 order-2 sm:order-1">
              <span className="hidden sm:inline">Showing {startIndex + 1} to {Math.min(endIndex, sortedBids.length)} of {sortedBids.length} results</span>
              <span className="sm:hidden">{sortedBids.length} results</span>
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

      {/* Add Project Modal */}
      {onAddProject && (
        <AddProjectModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddProject={handleAddProject}
          users={users}
          isLoading={isSubmitting}
        />
      )}

      {/* Copy Project Modal */}
      {onCopyProject && (
        <CopyProjectModal
          isOpen={isCopyModalOpen}
          onClose={() => setIsCopyModalOpen(false)}
          onCopyProject={handleCopyProjectSubmit}
          bids={bids}
          users={users}
          isLoading={isSubmitting}
        />
      )}

      {/* Email Report Confirmation Modal */}
      <ConfirmationModal
        isOpen={showEmailConfirmModal}
        onClose={() => setShowEmailConfirmModal(false)}
        onConfirm={handleConfirmEmailReport}
        title="Send Weekly Report"
        message="This will generate and email a PDF report of all bids due within 7 days and all vendor costs due within 7 days to estimating@withpridehvac.net. Do you want to continue?"
        confirmText="Send Report"
        cancelText="Cancel"
        variant="info"
      />

      {/* Bulk Actions Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmation}
        onConfirm={confirmModal.onConfirm}
        title={getBulkActionConfirmationMessage(confirmModal.type, confirmModal.count)}
        message={`This will ${confirmModal.type === 'onHold' ? 'move the selected projects to on-hold status' : 'perform the selected action on the selected projects'}.`}
        confirmText={getBulkActionConfirmText(confirmModal.type)}
        cancelText="Cancel"
        variant={confirmModal.type === 'delete' ? 'danger' : 'warning'}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};

export default Dashboard;