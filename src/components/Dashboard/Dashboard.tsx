import React, { useState, useMemo, useEffect } from 'react';
import type { User, Bid, BidVendor, Vendor, ProjectNote } from '../../types';
import BidTable from './BidTable';
import SearchFilters from './SearchFilters';
import Sidebar from '../ui/Sidebar';
import AddProjectModal from '../AddProjectModal';
import CopyProjectModal from '../CopyProjectModal';
import ConfirmationModal from '../ui/ConfirmationModal';
import ToastContainer from '../ui/ToastContainer';
import { useToast } from '../../hooks/useToast';
import { isDateInUrgencyPeriod, isDateMatch } from '../../utils/formatters';
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
  getUserById: (userId: string) => User | undefined;
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
  getUserById,
  users,
  isLoading = false,
  onAddProject,
  onCopyProject
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailingReport, setIsEmailingReport] = useState(false);
  const [showEmailConfirmModal, setShowEmailConfirmModal] = useState(false);
  const { toasts, removeToast, showSuccess, showError } = useToast();

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

    // Filter by urgency (based on due_date)
    if (urgencyFilter) {
      filtered = filtered.filter(bid => isDateInUrgencyPeriod(bid.due_date, urgencyFilter));
    }

    // Filter by specific date
    if (dateFilter) {
      filtered = filtered.filter(bid => isDateMatch(bid.due_date, dateFilter));
    }
    
    return filtered;
  }, [bids, searchTerm, statusFilter, urgencyFilter, dateFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredBids.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBids = filteredBids.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter.length, urgencyFilter, dateFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleNewProject = () => {
    setIsAddModalOpen(true);
  };

  const handleCopyProject = () => {
    setIsCopyModalOpen(true);
  };

  const handleAddProject = async (projectData: Omit<Bid, 'id'>) => {
    if (!onAddProject) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddProject(projectData);
      setIsAddModalOpen(false);
    } catch (error) {
      // Error handling should be managed by the parent component
      // or a global error handling system
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
    } catch (error) {
      // Error handling should be managed by the parent component
      // or a global error handling system
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
      />
      
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full">
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
            onNewProject={handleNewProject}
            searchPlaceholder="Search projects..."
          />
        </div>
        
        <div className="flex-1 p-6 pt-4">
          {!isLoading && bids.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
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
              getUserById={getUserById}
              onStatusChange={handleStatusChange}
              isLoading={isLoading}
            />
          )}
        </div>
        
        {/* Pagination Controls - Fixed at bottom of page */}
        {!isLoading && filteredBids.length > 0 && (
          <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-700">
              <span>Showing {startIndex + 1} to {Math.min(endIndex, filteredBids.length)} of {filteredBids.length} results</span>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Page navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};

export default Dashboard;