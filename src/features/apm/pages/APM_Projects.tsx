import React, { useState, useMemo } from 'react';
import NoDataFound from '../../../shared/components/ui/NoDataFound';
import type { User, Bid, BidVendor, Vendor, ProjectNote } from '../../../shared/types';
import BidTable from '../../estimating/components/BidPricing/BidTable';
import PageHeader from '../../../shared/components/ui/PageHeader';
import Sidebar from '../../../shared/components/ui/Sidebar';
import APMAddProjectModal from '../components/modals/APMAddProjectModal';
import CopyProjectModal from '../../../shared/components/modals/CopyProjectModal';
import AlertDialog from '../../../shared/components/ui/AlertDialog';
import { Toaster } from '../../../shared/components/ui/sonner';
import { useToast } from '../../../shared/hooks/useToast';
import { useDynamicPageSize } from '../../../shared/hooks/useDynamicPageSize';
import { useBulkSelection, useClearSelectionOnFilterChange } from '../../../shared/hooks/useBulkSelection';
import { useBulkActions, getBulkActionConfirmationMessage, getBulkActionConfirmText } from '../../../shared/hooks/useBulkActions';
import { isDateInRange, getBidUrgency } from '../../../shared/utils/formatters';
import { exportAPMProjectsToExcel } from '../../../shared/utils/excelGenerator';
import { generateEquipmentReleaseReportPDF } from '../../../shared/utils/pdfGenerator';
import { ActiveProjectReportService } from '../../../shared/services/activeProjectReportService';

interface APMProjectsProps {
  bids: Bid[];
  bidVendors?: BidVendor[];
  vendors?: Vendor[];
  projectNotes?: ProjectNote[];
  handleStatusChange: (bidId: number, newStatus: string) => Promise<void>;
  users: User[];
  isLoading?: boolean;
  onAddProject?: (projectData: Omit<Bid, 'id'>) => Promise<void>;
  onAddProjectWithVendors?: (projectData: Omit<Bid, 'id'>, vendorIds: number[]) => Promise<void>;
  onCopyProject?: (originalProjectId: number, newProjectData: Omit<Bid, 'id'>) => Promise<void>;
}

const APMProjects: React.FC<APMProjectsProps> = ({ 
  bids, 
  bidVendors = [],
  vendors = [],
  projectNotes = [],
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
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const { showSuccess, showError } = useToast();

  // Dynamic page size management
  const { 
    pageSize, 
    availablePageSizes, 
    setManualPageSize 
  } = useDynamicPageSize({
    storageKey: 'apm-projects-page-size',
    rowHeight: 65, // Same as estimating for consistency
    reservedHeight: 460 // Same as estimating dashboard
  });

  // Use filtered bids passed from routes (already filtered for APM active projects)
  const apmBids = useMemo(() => {
    return bids || [];
  }, [bids]);

  // Calculate overdue count for APM bids
  const overdueCount = useMemo(() => {
    if (!apmBids || apmBids.length === 0) return 0;
    return apmBids.filter(bid => {
      const urgency = getBidUrgency(bid.due_date, bid.status);
      return urgency.level === 'overdue';
    }).length;
  }, [apmBids]);

  const filteredBids = useMemo(() => {
    if (!apmBids || apmBids.length === 0) {
      return [];
    }

    let filtered = apmBids;
    
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
  }, [apmBids, searchTerm, statusFilter, dateRange, overdueFilter]);


  const handleNewProject = () => {
    setIsAddModalOpen(true);
  };

  const handleExportToExcel = () => {
    setShowExportConfirm(true);
  };

  const handleGenerateEquipmentReleaseReport = async () => {
    setIsGeneratingReport(true);
    try {
      showSuccess('Report Generation Started', 'Generating Equipment Release Report...');
      
      const reportData = await ActiveProjectReportService.getActiveProjectsReport();
      
      if (reportData.totalProjects === 0) {
        showError('No Projects Found', 'No active projects found with start dates within 60 days from now.');
        return;
      }

      // Generate the exact same PDF as the email report
      try {
        const reportFile = generateEquipmentReleaseReportPDF(reportData);
        const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '').replace('T', '_');
        const filename = `Equipment_Release_Report_${timestamp}.pdf`;
        
        // Download the file
        const url = URL.createObjectURL(reportFile);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showSuccess(
          'Equipment Release Report Generated', 
          `Generated report for ${reportData.totalProjects} projects within 60 days. Check your downloads folder.`
        );
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        showError('PDF Generation Failed', 'Failed to generate Equipment Release Report. Please try again.');
        return;
      }
      
    } catch (error) {
      console.error('Error generating equipment release report:', error);
      showError(
        'Report Generation Failed', 
        error instanceof Error ? error.message : 'Failed to generate report. Please try again.'
      );
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const confirmExportToExcel = () => {
    try {
      exportAPMProjectsToExcel(filteredBids, projectNotes);
      showSuccess('Export Successful! 📊', `Exported ${filteredBids.length} projects to Excel`);
    } catch (error) {
      showError('Export Failed ❌', error instanceof Error ? error.message : 'Failed to export to Excel');
    }
  };


  // Bulk action handlers using reusable hooks
  const handleBulkArchive = () => {
    const bidIds = Array.from(selectedBids);
    showConfirmation('apmArchive', bidIds.length, () => {
      executeBulkAction('apmArchive', bidIds);
    });
  };

  const handleBulkOnHold = () => {
    const bidIds = Array.from(selectedBids);
    showConfirmation('apmOnHold', bidIds.length, () => {
      executeBulkAction('apmOnHold', bidIds);
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
      showSuccess('Project Added', `Successfully added ${projectData.title || projectData.project_name} to projects`);
    } catch (error) {
      showError('Add Failed', error instanceof Error ? error.message : 'Failed to add project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddProjectWithVendors = async (projectData: Omit<Bid, 'id'>, vendorIds: number[]) => {
    if (!onAddProjectWithVendors) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddProjectWithVendors(projectData, vendorIds);
      setIsAddModalOpen(false);
      showSuccess('Project Added', `Successfully added ${projectData.title || projectData.project_name} to projects with ${vendorIds.length} vendor${vendorIds.length !== 1 ? 's' : ''}`);
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
      // Ensure department is set to APM for copied projects
      const apmProjectData = { ...newProjectData, department: 'APM' };
      await onCopyProject(originalProjectId, apmProjectData);
      setIsCopyModalOpen(false);
      showSuccess('Project Copied', `Successfully copied project as ${newProjectData.title || newProjectData.project_name} to projects`);
    } catch (error) {
      showError('Copy Failed', error instanceof Error ? error.message : 'Failed to copy project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state if data is being fetched
  if (isLoading && (!bids || bids.length === 0)) {
    return (
      <div className="flex h-screen bg-slate-100">
        <Sidebar
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          showViewToggle={true}
        />
        
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Active projects...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Active Projects</h1>
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
              label: isGeneratingReport ? "Generating..." : "Equipment Release Report",
              onClick: handleGenerateEquipmentReleaseReport,
              color: "blue"
            }}
            tertiaryActionButton={{
              label: "Filtered Projects Report",
              onClick: handleExportToExcel,
              disabled: filteredBids.length === 0
            }}
            bulkActions={{
              selectedCount: selectedBids.size,
              actions: [
                { label: "Move to Closeouts", onClick: handleBulkOnHold, color: "yellow" },
                { label: "Move to Completed", onClick: handleBulkArchive, color: "orange" }
              ],
              onDelete: handleBulkDelete
            }}
          />
        </div>
        
        <div className="flex-1 overflow-auto">
          {!isLoading && apmBids.length === 0 ? (
            <NoDataFound 
              onAddNew={handleNewProject}
              actionLabel="Add Project"
            />
          ) : (
            <BidTable 
              bids={filteredBids} 
              bidVendors={bidVendors}
              projectNotes={projectNotes}
              onStatusChange={handleStatusChange}
              isLoading={isLoading}
              selectedBids={selectedBids}
              onBidSelect={handleBidSelect}
              useAPMRouting={true}
              pageSize={pageSize}
              enablePageSizeSelector={true}
              availablePageSizes={availablePageSizes}
              onPageSizeChange={setManualPageSize}
            />
          )}
        </div>
      </div>

      {/* Add Project Modal */}
      {onAddProject && (
        <APMAddProjectModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddProject={handleAddProject}
          onCreateProjectWithVendors={handleAddProjectWithVendors}
          vendors={vendors}
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
          bids={bids} // Use all bids for copy source selection
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
        message={`This will ${confirmModal.type === 'apmOnHold' ? 'move the selected APM projects to on-hold status' : confirmModal.type === 'apmArchive' ? 'archive the selected APM projects' : 'perform the selected action on the selected APM projects'}.`}
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
        subtitle={`Export ${filteredBids.length} APM projects to Excel`}
        noteText="This will download an Excel file containing all visible APM projects with current filters applied."
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

export default APMProjects;