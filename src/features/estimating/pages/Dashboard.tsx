import React, { useState, useMemo } from 'react';
import type { User, Bid, BidVendor, Vendor, ProjectNote } from '../../../shared/types';
import BidTable from '../components/BidPricing/BidTable';
import PageHeader from '../../../shared/components/ui/PageHeader';
import Sidebar from '../../../shared/components/ui/Sidebar';
import AddProjectModal from '../../../shared/components/modals/AddProjectModal';
import CopyProjectModal from '../../../shared/components/modals/CopyProjectModal';
import AlertDialog from '../../../shared/components/ui/AlertDialog';
import { Toaster } from '../../../shared/components/ui/sonner';
import { useToast } from '../../../shared/hooks/useToast';
import { useDynamicPageSize } from '../../../shared/hooks/useDynamicPageSize';
import { useBulkSelection, useClearSelectionOnFilterChange } from '../../../shared/hooks/useBulkSelection';
import { useBulkActions, getBulkActionConfirmationMessage, getBulkActionConfirmText } from '../../../shared/hooks/useBulkActions';
import { isDateInRange, getBidUrgency } from '../../../shared/utils/formatters';
import { TableSkeleton } from '../../../shared/components/ui/skeleton';
import { exportEstimatingProjectsToExcel } from '../../../shared/utils/excelGenerator';

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
  onAddProjectWithVendors?: (projectData: Omit<Bid, 'id'>, vendorIds: number[]) => Promise<void>;
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
  onAddProjectWithVendors,
  onCopyProject
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{startDate: Date | null, endDate: Date | null}>({
    startDate: null,
    endDate: null
  });
  const [overdueFilter, setOverdueFilter] = useState(false);
  
  
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
        // Note: Dashboard relies on real-time subscriptions to refresh data automatically
      }
    }
  });

  // Clear selection when filters change
  useClearSelectionOnFilterChange(clearSelection, [searchTerm, statusFilter.length, dateRange, overdueFilter]);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const { showSuccess, showError } = useToast();

  // Dynamic page size management
  const { 
    pageSize, 
    availablePageSizes, 
    setManualPageSize 
  } = useDynamicPageSize({
    storageKey: 'estimating-dashboard-page-size',
    rowHeight: 65, // Slightly larger for bid table rows
    reservedHeight: 460 // More reserved space for dashboard header
  });

  // Filter for active bids only (not archived, not on-hold, not sent to APM)
  const estimatingBids = useMemo(() => {
    if (!bids || bids.length === 0) {
      return [];
    }
    
    // Filter for active bids: not archived, not on hold, not sent to APM
    return bids.filter(bid => 
      !bid.archived &&      // Not archived
      !bid.on_hold &&       // Not on hold
      !bid.sent_to_apm      // Not sent to APM (APM manages those)
    );
  }, [bids]);

  // Calculate overdue count for estimating bids
  const overdueCount = useMemo(() => {
    if (!estimatingBids || estimatingBids.length === 0) return 0;
    return estimatingBids.filter(bid => {
      const urgency = getBidUrgency(bid.due_date, bid.status);
      return urgency.level === 'overdue';
    }).length;
  }, [estimatingBids]);

  const filteredBids = useMemo(() => {
    if (!estimatingBids || estimatingBids.length === 0) {
      return [];
    }

    let filtered = estimatingBids;
    
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
  }, [estimatingBids, searchTerm, statusFilter, dateRange, overdueFilter]);


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

  const handleBulkSendToAPM = () => {
    const bidIds = Array.from(selectedBids);
    showConfirmation('sendToAPM', bidIds.length, () => {
      executeBulkAction('sendToAPM', bidIds);
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

  const handleExportToExcel = () => {
    setShowExportConfirm(true);
  };

  const confirmExportToExcel = () => {
    try {
      exportEstimatingProjectsToExcel(filteredBids, projectNotes);
      showSuccess('Export Successful! 📊', `Exported ${filteredBids.length} projects to Excel`);
    } catch (error) {
      showError('Export Failed ❌', error instanceof Error ? error.message : 'Failed to export to Excel');
    }
  };


  // Show loading state with skeleton
  if (isLoading && (!bids || bids.length === 0)) {
    return (
      <div className="flex h-screen">
        <Sidebar
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          showViewToggle={true}
        />
        
        <div className="flex-1 flex flex-col">
          <div className="p-6 border-b">
            <div className="h-8 w-64 bg-gray-200 animate-pulse rounded mb-4"></div>
            <div className="h-4 w-48 bg-gray-200 animate-pulse rounded"></div>
          </div>
          
          <div className="flex-1 p-6">
            <TableSkeleton rows={8} columns={6} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        showViewToggle={true}
      />
      
      <div className="flex-1 flex flex-col mx-auto w-full">
        <div className="flex-shrink-0">
          {/* Page Title */}
          <div className="px-6 pt-4">
            <h1 className="text-2xl font-bold text-gray-900">Estimating - Active Bids</h1>
          </div>
          
          <PageHeader
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            searchPlaceholder="Search projects..."
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            dateRange={dateRange}
            setDateRange={setDateRange}
            overdueFilter={overdueFilter}
            setOverdueFilter={setOverdueFilter}
            overdueCount={overdueCount}
            showStatusFilter={true}
            showDateFilter={true}
            actionButton={{
              label: "New",
              onClick: handleNewProject,
              color: "green"
            }}
            secondaryActionButton={{
              label: "Copy",
              onClick: handleCopyProject,
              color: "blue"
            }}
            exportButton={{
              label: "Export",
              onClick: handleExportToExcel,
              disabled: filteredBids.length === 0
            }}
            bulkActions={{
              selectedCount: selectedBids.size,
              actions: [
                { label: "Move to On-Hold", onClick: handleBulkOnHold, color: "yellow" },
                { label: "Move to Completed", onClick: handleBulkArchive, color: "orange" },
                { label: "Send to APM", onClick: handleBulkSendToAPM, color: "blue" }
              ],
              onDelete: handleBulkDelete
            }}
          />
        </div>
        
        <div className="flex-1 overflow-auto">
          <BidTable 
            bids={filteredBids} 
            bidVendors={bidVendors}
            projectNotes={projectNotes}
            users={users}
            onStatusChange={handleStatusChange}
            isLoading={isLoading}
            selectedBids={selectedBids}
            onBidSelect={handleBidSelect}
            pageSize={pageSize}
            enablePageSizeSelector={true}
            availablePageSizes={availablePageSizes}
            onPageSizeChange={setManualPageSize}
            emptyActionLabel="Create Project"
            onEmptyAction={handleNewProject}
          />
        </div>
      </div>

      {/* Add Project Modal */}
      {onAddProject && (
        <AddProjectModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddProject={handleAddProject}
          onCreateProjectWithVendors={onAddProjectWithVendors}
          vendors={vendors}
          users={users}
          isLoading={isSubmitting}
          defaultDepartment="Estimating"
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

      {/* Bulk Actions Confirmation Modal */}
      <AlertDialog
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmation}
        onConfirm={confirmModal.onConfirm}
        title={getBulkActionConfirmationMessage(confirmModal.type, confirmModal.count)}
        message={`This will ${confirmModal.type === 'onHold' ? 'move the selected projects to on-hold status' : 'perform the selected action on the selected projects'}.`}
        confirmText={getBulkActionConfirmText(confirmModal.type)}
        cancelText="Cancel"
        variant={confirmModal.type === 'delete' ? 'danger' : 'warning'}
      />

      {/* Export Confirmation Modal */}
      <AlertDialog
        isOpen={showExportConfirm}
        onClose={() => setShowExportConfirm(false)}
        onConfirm={confirmExportToExcel}
        title="Export to Excel"
        subtitle={`Export ${filteredBids.length} active projects to Excel`}
        noteText="This will download an Excel file containing all visible projects with current filters applied."
        confirmText="Export to Excel"
        cancelText="Cancel"
        variant="info"
        cleanStyle={true}
      />

      {/* Toast Container */}
      <Toaster />
    </div>
  );
};

export default Dashboard;