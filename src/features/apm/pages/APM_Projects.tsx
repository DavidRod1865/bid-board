import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DateRangePicker } from 'react-date-range';
import type { RangeKeyDict } from 'react-date-range';
import type { User, Bid, BidVendor, ProjectNote, VendorWithContact, ProjectEquipment } from '../../../shared/types';
import BidTable from '../../estimating/components/BidPricing/BidTable';
import Sidebar from '../../../shared/components/ui/Sidebar';
import { Input } from '../../../shared/components/ui/FormField';
import { Button } from '../../../shared/components/ui/Button';
import APMAddProjectModal from '../components/modals/APMAddProjectModal';
import CopyProjectModal from '../../../shared/components/modals/CopyProjectModal';
import AlertDialog from '../../../shared/components/ui/AlertDialog';
import { Toaster } from '../../../shared/components/ui/sonner';
import { useToast } from '../../../shared/hooks/useToast';
import { useDynamicPageSize } from '../../../shared/hooks/useDynamicPageSize';
import { useBulkSelection, useClearSelectionOnFilterChange } from '../../../shared/hooks/useBulkSelection';
import { useBulkActions, getBulkActionConfirmationMessage, getBulkActionConfirmText } from '../../../shared/hooks/useBulkActions';
import { isDateInRange, getBidUrgency } from '../../../shared/utils/formatters';
import { exportAPMProjectsToExcel, generateAPMTasksFromData, exportAPMTasksToExcel } from '../../../shared/utils/excelGenerator';
import { generateEquipmentReleaseReportPDF } from '../../../shared/utils/pdfGenerator';
import { ActiveProjectReportService } from '../../../shared/services/activeProjectReportService';
import { dbOperations } from '../../../shared/services/supabase';
import APMTasksList from '../components/tasks/APMTasksList';
import ReceivingLogs from '../components/ReceivingLogs';
import APMProjectQuickEditModal from '../components/modals/APMProjectQuickEditModal';
import PageHeader from '../../../shared/components/ui/PageHeader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../shared/components/ui/dropdown-menu';
import { ChevronDownIcon, CheckIcon, PlusIcon, DocumentDuplicateIcon, ArrowDownTrayIcon, PauseIcon, ArchiveBoxIcon, TrashIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

interface APMProjectsProps {
  bids: Bid[];
  bidVendors?: BidVendor[];
  vendors?: VendorWithContact[];
  projectNotes?: ProjectNote[];
  equipment?: ProjectEquipment[];
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
  equipment = [],
  handleStatusChange,
  users,
  isLoading = false,
  onAddProject,
  onAddProjectWithVendors,
  onCopyProject
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'open_jobs' | 'daily_tasks' | 'receiving_logs'>('open_jobs');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{startDate: Date | null, endDate: Date | null}>({
    startDate: null,
    endDate: null
  });
  const [receivingLogsDateRange, setReceivingLogsDateRange] = useState<{startDate: Date | null, endDate: Date | null}>({
    startDate: null,
    endDate: null
  });
  const [overdueFilter, setOverdueFilter] = useState(false);
  const [taskFilter, setTaskFilter] = useState<string>('all'); // 'all', 'unassigned', or user id - defaults to 'all', remembers user selection
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Daily Tasks specific filters (for PageHeader above tabs)
  const [dailyTasksSearchTerm, setDailyTasksSearchTerm] = useState("");
  const [dailyTasksDateRange, setDailyTasksDateRange] = useState<{startDate: Date | null, endDate: Date | null}>({
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
        // Note: Dashboard relies on real-time subscriptions to refresh data automatically
      }
    }
  });

  // Clear selection when filters change
  useClearSelectionOnFilterChange(clearSelection, [searchTerm, statusFilter.length, dateRange, overdueFilter]);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target as Node)
      ) {
        setShowDatePicker(false);
      }
    };

    if (showDatePicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDatePicker]);

  // Detect when container is too narrow for button text
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        // Switch to icon-only mode when container is less than 800px wide
        setIsCompact(width < 800);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [isAddingEquipment, setIsAddingEquipment] = useState(false);
  const [addEquipmentForm, setAddEquipmentForm] = useState({
    project_id: '',
    project_vendor_id: '',
    equipment_id: '',
    description: '',
    quantity: '',
    unit: '',
    po_number: '',
    date_received: '',
  });
  const [existingEquipment, setExistingEquipment] = useState<ProjectEquipment[]>([]);
  const [loadingEquipment, setLoadingEquipment] = useState(false);
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

  // Get the display name for the Daily Tasks tab based on current filter
  const dailyTasksTabName = useMemo(() => {
    if (taskFilter === 'all') {
      return 'Daily Tasks';
    } else if (taskFilter === 'unassigned') {
      return 'Unassigned';
    } else {
      const user = users.find(u => u.id.toString() === taskFilter);
      return user ? user.name : 'Daily Tasks';
    }
  }, [taskFilter, users]);

  // Calculate task counts for dropdown
  const taskCounts = useMemo(() => {
    // Track tasks by assigned user (using string user IDs to match Users table)
    const tasks: Array<{ assignedUserId: string | null }> = [];

    bidVendors.forEach((bidVendor) => {
      // Skip completed vendors
      if (bidVendor.closeout_received_date) return;

      const vendor = vendors.find((v) => v.id === bidVendor.vendor_id);
      const project = bids.find((b) => b.id === bidVendor.bid_id);

      if (!vendor || !project) return;

      // Get all pending phases from apm_phases array (normalized structure)
      let phases: Array<{
        followUpDate: string | null;
        receivedDate: string | null;
      }> = [];

      if (bidVendor.apm_phases && bidVendor.apm_phases.length > 0) {
        // Use normalized apm_phases structure
        phases = bidVendor.apm_phases.map(phase => ({
          followUpDate: phase.follow_up_date,
          receivedDate: phase.received_date,
        }));
      } else {
        // Fallback to legacy column-based structure
        phases = [
          {
            followUpDate: bidVendor.buy_number_follow_up_date,
            receivedDate: bidVendor.buy_number_received_date,
          },
          {
            followUpDate: bidVendor.po_follow_up_date,
            receivedDate: bidVendor.po_received_date,
          },
          {
            followUpDate: bidVendor.submittals_follow_up_date,
            receivedDate: bidVendor.submittals_received_date,
          },
          {
            followUpDate: bidVendor.revised_plans_follow_up_date,
            receivedDate: bidVendor.revised_plans_confirmed_date,
          },
          {
            followUpDate: bidVendor.equipment_release_follow_up_date,
            receivedDate: bidVendor.equipment_released_date,
          },
          {
            followUpDate: bidVendor.closeout_follow_up_date,
            receivedDate: bidVendor.closeout_received_date,
          },
        ];
      }

      // Count tasks for each pending phase
      phases.forEach((phase) => {
        // Skip phases that are already received or have no follow-up date
        if (phase.receivedDate || !phase.followUpDate) return;

        // assigned_apm_user in BidVendor is stored as a string user id (matching Users.id)
        const assignedUserId: string | null = bidVendor.assigned_apm_user;

        tasks.push({
          assignedUserId,
        });
      });
    });

    // Calculate counts
    const totalCount = tasks.length;
    const unassignedCount = tasks.filter(t => !t.assignedUserId).length;
    const userCounts = new Map<string, number>();
    
    tasks.forEach(task => {
      if (task.assignedUserId) {
        userCounts.set(task.assignedUserId, (userCounts.get(task.assignedUserId) || 0) + 1);
      }
    });

    return {
      all: totalCount,
      unassigned: unassignedCount,
      byUser: userCounts,
    };
  }, [bidVendors, vendors, bids]);

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


  const handleReset = () => {
    setSearchTerm("");
    setStatusFilter([]);
    setDateRange({ startDate: null, endDate: null });
    setReceivingLogsDateRange({ startDate: null, endDate: null });
    setOverdueFilter(false);
    setShowDatePicker(false);
  };

  const handleStatusFilter = (tab: string) => {
    // "Open Jobs" shows all items (empty filter)
    if (tab === "Open Jobs") {
      setStatusFilter([]);
    } else {
      // For other tabs, toggle the filter - if clicking the same tab, clear it
      if (statusFilter.length === 1 && statusFilter[0] === tab) {
        setStatusFilter([]);
      } else {
        setStatusFilter([tab]);
      }
    }
  };

  const handleDateRangeChange = (ranges: RangeKeyDict) => {
    const { selection } = ranges;
    setDateRange({
      startDate: selection.startDate || null,
      endDate: selection.endDate || null,
    });
  };

  const formatDateRange = () => {
    if (!dateRange.startDate && !dateRange.endDate) {
      return "Pick a date range...";
    }

    const formatDate = (date: Date) =>
      date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

    if (dateRange.startDate && dateRange.endDate) {
      if (
        dateRange.startDate.toDateString() === dateRange.endDate.toDateString()
      ) {
        return formatDate(dateRange.startDate);
      }
      return `${formatDate(dateRange.startDate)} - ${formatDate(
        dateRange.endDate
      )}`;
    }

    if (dateRange.startDate) {
      return `From ${formatDate(dateRange.startDate)}`;
    }

    if (dateRange.endDate) {
      return `Until ${formatDate(dateRange.endDate)}`;
    }

    return "Select date range";
  };

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

  const handleExportTasksToExcel = () => {
    try {
      // Generate APM tasks from data
      const apmTasks = generateAPMTasksFromData(bids, bidVendors, vendors, users);
      
      // Filter tasks to match current view (apply same filters as the UI)
      let tasksToExport = apmTasks;
      
      // Apply task filter (all, unassigned, or specific user)
      if (taskFilter === "unassigned") {
        tasksToExport = tasksToExport.filter((task) => !task.assignedUser);
      } else if (taskFilter !== "all") {
        tasksToExport = tasksToExport.filter((task) => task.assignedUser?.id.toString() === taskFilter);
      }
      
      exportAPMTasksToExcel(tasksToExport);
      showSuccess('Export Successful! 📊', `Exported ${tasksToExport.length} tasks to Excel`);
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

  const [showEditModal, setShowEditModal] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Bid | null>(null);

  const handleEditSelectedProject = () => {
    if (selectedBids.size !== 1) return;
    const projectId = Array.from(selectedBids)[0];
    const project = bids.find((b) => b.id === projectId) || null;
    if (!project) return;
    setProjectToEdit(project);
    setShowEditModal(true);
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

  const resetEquipmentForm = () => {
    setAddEquipmentForm({
      project_id: '',
      project_vendor_id: '',
      equipment_id: '',
      description: '',
      quantity: '',
      unit: '',
      po_number: '',
      date_received: '',
    });
    setExistingEquipment([]);
  };

  // Load existing equipment when vendor is selected (sorted alphabetically)
  useEffect(() => {
    const loadExistingEquipment = async () => {
      if (!addEquipmentForm.project_vendor_id) {
        setExistingEquipment([]);
        return;
      }

      setLoadingEquipment(true);
      try {
        const equipment = await dbOperations.getProjectEquipment(parseInt(addEquipmentForm.project_vendor_id));
        // Sort equipment alphabetically by description
        const sortedEquipment = (equipment || []).sort((a: any, b: any) => 
          (a.description || '').localeCompare(b.description || '')
        );
        setExistingEquipment(sortedEquipment);
      } catch (error) {
        console.error('Failed to load existing equipment:', error);
        setExistingEquipment([]);
      } finally {
        setLoadingEquipment(false);
      }
    };

    loadExistingEquipment();
  }, [addEquipmentForm.project_vendor_id]);

  const handleCloseEquipmentModal = () => {
    setShowAddEquipmentModal(false);
    resetEquipmentForm();
  };

  const handleAddEquipment = async () => {
    if (!addEquipmentForm.project_id || !addEquipmentForm.project_vendor_id) {
      showError('Validation Error', 'Please select a project and vendor');
      return;
    }

    if (!addEquipmentForm.equipment_id) {
      showError('Validation Error', 'Please select an existing equipment item');
      return;
    }

    if (!addEquipmentForm.date_received) {
      showError('Validation Error', 'Please enter a date received');
      return;
    }

    setIsAddingEquipment(true);
    try {
      await dbOperations.updateProjectEquipment(parseInt(addEquipmentForm.equipment_id), {
        date_received: addEquipmentForm.date_received || null,
        received_at_wp: true,
      });

      setShowAddEquipmentModal(false);
      resetEquipmentForm();
      showSuccess('Equipment Updated', 'Equipment has been marked as received at WP. The list will refresh automatically.');
    } catch (error) {
      console.error('Failed to update equipment:', error);
      showError('Update Failed', error instanceof Error ? error.message : 'Failed to update equipment. Please try again.');
    } finally {
      setIsAddingEquipment(false);
    }
  };

  // Get vendors for selected project (sorted alphabetically)
  const getVendorsForProject = useMemo(() => {
    if (!addEquipmentForm.project_id) return [];
    const projectId = parseInt(addEquipmentForm.project_id);
    return bidVendors
      .filter(bv => bv.bid_id === projectId)
      .map(bv => {
        const vendor = vendors.find(v => v.id === bv.vendor_id);
        return vendor ? { ...bv, vendor } : null;
      })
      .filter((item): item is BidVendor & { vendor: VendorWithContact } => item !== null)
      .sort((a, b) => a.vendor.company_name.localeCompare(b.vendor.company_name));
  }, [addEquipmentForm.project_id, bidVendors, vendors]);

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
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-shrink-0 min-w-0">
          {/* Page Title */}
          <div className="px-6 pt-4">
            <h1 className="text-2xl font-bold text-gray-900">Active Projects</h1>
          </div>
          
          {/* Tab Navigation with Search and Actions */}
          <div className="bg-slate-100 border-b border-gray-200">
            <div className={`px-6 pt-4 ${activeTab === 'receiving_logs' ? '' : 'pt-4'}`} ref={containerRef}>
              {/* Show PageHeader above tabs depending on active tab */}
              {activeTab === 'receiving_logs' ? (
                <PageHeader
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  searchPlaceholder="Search equipment, projects, vendors..."
                  showStatusFilter={false}
                  showDateFilter={true}
                  dateRange={receivingLogsDateRange}
                  setDateRange={setReceivingLogsDateRange}
                  actionButton={{
                    label: "Add Equipment",
                    onClick: () => setShowAddEquipmentModal(true),
                    color: "green"
                  }}
                />
              ) : activeTab === 'daily_tasks' ? (
                <PageHeader
                  searchTerm={dailyTasksSearchTerm}
                  setSearchTerm={setDailyTasksSearchTerm}
                  searchPlaceholder="Search projects..."
                  showStatusFilter={false}
                  showDateFilter={true}
                  dateRange={dailyTasksDateRange}
                  setDateRange={setDailyTasksDateRange}
                  exportButton={{
                    label: "Export",
                    onClick: handleExportTasksToExcel,
                    disabled: false,
                  }}
                />
              ) : (
                /* Search, Date Picker, Reset, and Action Buttons Row (Open Jobs tab) */
                <div className="flex items-center justify-between gap-4 flex-wrap mb-4" style={{ rowGap: '0.5rem' }}>
                  {/* Left Side: Search, Status Filter, Date Picker, Overdue Filter, Reset */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Search Field */}
                    <Input
                      type="text"
                      placeholder="Search projects..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-72 flex-shrink-0 py-2 text-sm text-gray-500 border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-0 focus:ring-[#d4af37] focus:border-[#d4af37] text-left transition-colors"
                    />

                    {/* Date Picker */}
                    <div className="relative flex-shrink-0" ref={datePickerRef}>
                      <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="w-56 px-3 py-2 text-sm text-gray-400 border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-0 focus:ring-[#d4af37] focus:border-[#d4af37] text-left transition-colors"
                      >
                        {formatDateRange()}
                      </button>

                      {showDatePicker && (
                        <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-gray-300 rounded shadow-lg">
                          <DateRangePicker
                            ranges={[
                              {
                                startDate: dateRange.startDate || new Date(),
                                endDate: dateRange.endDate || new Date(),
                                key: "selection",
                              },
                            ]}
                            onChange={handleDateRangeChange}
                            moveRangeOnFirstSelection={false}
                            months={1}
                            direction="horizontal"
                            rangeColors={["#d4af37"]}
                          />
                          <div className="p-3 border-t border-gray-200 flex justify-end gap-2">
                            <Button
                              size="default"
                              onClick={() => {
                                setDateRange({ startDate: null, endDate: null });
                                setShowDatePicker(false);
                              }}
                              className="px-3 py-1 text-sm text-white hover:bg-gray-500 bg-gray-400"
                            >
                              Clear
                            </Button>
                            <Button
                              onClick={() => setShowDatePicker(false)}
                              size="default"
                              className="px-3 py-1 text-sm bg-[#d4af37] text-white hover:bg-[#c19b26]"
                            >
                              Apply
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Reset Button */}
                    <Button
                      className="bg-gray-500 text-white hover:bg-gray-600"
                      size="default"
                      onClick={handleReset}
                    >
                      Reset
                    </Button>
                  </div>

                  {/* Right Side: Action Buttons */}
                  <div className="flex gap-2 flex-wrap min-w-0">
                    {/* Regular Action Buttons - show when no bulk actions are active */}
                    {!(selectedBids.size > 0) && (
                      <>
                        {/* Show different buttons based on active tab */}
                        {(activeTab as string) === 'daily_tasks' ? (
                          /* Export Task Report Button - for Daily Tasks tab */
                          <Button
                            onClick={handleExportTasksToExcel}
                            size="default"
                            className="inline-flex items-center justify-center border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500"
                            title="Export Task Report"
                          >
                            <ArrowDownTrayIcon className={`w-5 h-5 ${!isCompact ? "mr-2" : ""}`} />
                            {!isCompact && <span>Export Task Report</span>}
                          </Button>
                        ) : (
                          <>
                            {/* New Project Button */}
                            <Button
                              onClick={handleNewProject}
                              size="default"
                              className="inline-flex items-center justify-center border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 bg-green-600 hover:bg-green-700 focus:ring-green-500"
                              title="New"
                            >
                              <PlusIcon className={`w-5 h-5 ${!isCompact ? "mr-2" : ""}`} />
                              {!isCompact && <span>New</span>}
                            </Button>

                            {/* Reports Dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="inline-flex items-center justify-center px-4 h-9 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap"
                                  title="Release Report"
                                >
                                  {!isCompact && <span>Release Report</span>}
                                  {isCompact && <span>Report</span>}
                                  <ChevronDownIcon className="w-4 h-4 ml-2" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem
                                  onClick={handleGenerateEquipmentReleaseReport}
                                  disabled={isGeneratingReport}
                                  className="cursor-pointer"
                                >
                                  {isGeneratingReport ? (
                                    <>
                                      <span className="mr-2">⏳</span>
                                      <span>Generating...</span>
                                    </>
                                  ) : (
                                    <>
                                      <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
                                      Equipment Release Report
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={handleExportToExcel}
                                  disabled={filteredBids.length === 0}
                                  className="cursor-pointer"
                                >
                                  <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                                  Filtered Projects Report
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </>
                    )}

                    {/* Bulk Actions & Edit Selected - show when bulk actions are active */}
                    {selectedBids.size > 0 && (
                      <div className="flex gap-2">
                        {/* Quick Edit button when exactly one project is selected */}
                        {selectedBids.size === 1 && (
                          <button
                            onClick={handleEditSelectedProject}
                            className="inline-flex items-center justify-center px-4 h-9 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap"
                          >
                            <PencilSquareIcon className="w-4 h-4 mr-2" />
                            Quick Edit
                          </button>
                        )}

                        {/* Bulk actions dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="inline-flex items-center justify-center px-4 h-9 border border-gray-300 text-sm font-medium rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap" title={`Bulk Actions (${selectedBids.size})`}>
                              {isCompact ? (
                                <>
                                  <span>({selectedBids.size})</span>
                                  <ChevronDownIcon className="w-4 h-4 ml-1" />
                                </>
                              ) : (
                                <>
                                  <span>Bulk Actions ({selectedBids.size})</span>
                                  <ChevronDownIcon className="w-4 h-4 ml-2" />
                                </>
                              )}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={handleBulkOnHold}
                              className="cursor-pointer"
                            >
                              <PauseIcon className="w-4 h-4 mr-2" />
                              Move to Closeouts
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={handleBulkArchive}
                              className="cursor-pointer"
                            >
                              <ArchiveBoxIcon className="w-4 h-4 mr-2" />
                              Move to Completed
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={handleBulkDelete}
                              className="cursor-pointer text-red-600"
                            >
                              <TrashIcon className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab Navigation */}
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('open_jobs')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'open_jobs'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Open Jobs
                </button>
                {activeTab === 'daily_tasks' ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-1 border-blue-500 text-blue-600"
                      >
                        {dailyTasksTabName}
                        <ChevronDownIcon className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem
                        onClick={() => {
                          setTaskFilter('all');
                        }}
                        className={taskFilter === 'all' ? 'bg-blue-50' : ''}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>All Tasks ({taskCounts.all})</span>
                          {taskFilter === 'all' && (
                            <CheckIcon className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setTaskFilter('unassigned');
                        }}
                        className={taskFilter === 'unassigned' ? 'bg-blue-50' : ''}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>Unassigned ({taskCounts.unassigned})</span>
                          {taskFilter === 'unassigned' && (
                            <CheckIcon className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                      </DropdownMenuItem>
                      {users
                        // Users table ids are strings; taskCounts.byUser is keyed by string user id
                        .filter((user) => taskCounts.byUser.has(user.id))
                        .map((user) => {
                          const userTaskCount = taskCounts.byUser.get(user.id) || 0;
                          return (
                            <DropdownMenuItem
                              key={user.id}
                              onClick={() => {
                                setTaskFilter(user.id.toString());
                              }}
                              className={taskFilter === user.id.toString() ? 'bg-blue-50' : ''}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{user.name} ({userTaskCount})</span>
                                {taskFilter === user.id.toString() && (
                                  <CheckIcon className="w-4 h-4 text-blue-600" />
                                )}
                              </div>
                            </DropdownMenuItem>
                          );
                        })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <button
                    onClick={() => setActiveTab('daily_tasks')}
                    className="py-3 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  >
                    {dailyTasksTabName}
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('receiving_logs')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'receiving_logs'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Receiving Logs
                </button>
              </nav>
            </div>
          </div>
          
        </div>
        
        <div className="flex-1 overflow-auto">
          {activeTab === 'open_jobs' && (
            <BidTable 
              bids={filteredBids} 
              bidVendors={bidVendors}
              projectNotes={projectNotes}
              users={users}
              onStatusChange={handleStatusChange}
              isLoading={isLoading}
              selectedBids={selectedBids}
              onBidSelect={handleBidSelect}
              useAPMRouting={true}
              pageSize={pageSize}
              enablePageSizeSelector={true}
              availablePageSizes={availablePageSizes}
              onPageSizeChange={setManualPageSize}
              emptyActionLabel="Add Project"
              onEmptyAction={handleNewProject}
            />
          )}

          {activeTab === 'daily_tasks' && (
            <APMTasksList
              bids={apmBids}
              bidVendors={bidVendors}
              vendors={vendors}
              users={users}
              isLoading={isLoading}
              showHeader={false}
              showFilterButtons={true}
              className="h-full"
              initialFilter={taskFilter}
              externalSearchTerm={dailyTasksSearchTerm}
              setExternalSearchTerm={setDailyTasksSearchTerm}
              externalDateRange={dailyTasksDateRange}
              setExternalDateRange={setDailyTasksDateRange}
            />
          )}

          {activeTab === 'receiving_logs' && (
            <ReceivingLogs
              equipment={equipment}
              projects={bids.map(bid => ({
                id: bid.id,
                project_name: bid.project_name,
                project_address: bid.project_address || undefined,
                general_contractor: bid.general_contractor || undefined,
                created_at: bid.created_at || '',
              }))}
              projectVendors={bidVendors}
              vendors={vendors}
              users={users}
              isLoading={isLoading}
              className="h-full"
              searchTerm={searchTerm}
              dateRange={receivingLogsDateRange}
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

      {/* Quick Edit Project Modal (from header Edit Project button) */}
      <APMProjectQuickEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        project={projectToEdit}
        users={users}
      />

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

      {/* Add Equipment Modal */}
      {showAddEquipmentModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" onClick={handleCloseEquipmentModal}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Mark Equipment as Received at WP</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={addEquipmentForm.project_id}
                  onChange={(e) => {
                    setAddEquipmentForm(prev => ({ 
                      ...prev, 
                      project_id: e.target.value,
                      project_vendor_id: '', // Clear vendor when project changes
                      equipment_id: '' // Clear equipment when project changes
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a project</option>
                  {[...bids]
                    .sort((a, b) => (a.project_name || '').localeCompare(b.project_name || ''))
                    .map(bid => (
                      <option key={bid.id} value={bid.id}>
                        {bid.project_name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor <span className="text-red-500">*</span>
                </label>
                <select
                  value={addEquipmentForm.project_vendor_id}
                  onChange={(e) => setAddEquipmentForm(prev => ({ 
                    ...prev, 
                    project_vendor_id: e.target.value,
                    equipment_id: '' // Clear equipment when vendor changes
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                  disabled={!addEquipmentForm.project_id}
                >
                  <option value="">
                    {addEquipmentForm.project_id ? 'Select a vendor' : 'Select a project first'}
                  </option>
                  {getVendorsForProject.map(bv => (
                    <option key={bv.id} value={bv.id}>
                      {bv.vendor.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipment <span className="text-red-500">*</span>
                </label>
                {loadingEquipment ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-sm">
                    Loading equipment...
                  </div>
                ) : (
                  <select
                    value={addEquipmentForm.equipment_id}
                    onChange={(e) => {
                      const selectedEquipment = existingEquipment.find(eq => eq.id.toString() === e.target.value);
                      setAddEquipmentForm(prev => ({ 
                        ...prev, 
                        equipment_id: e.target.value,
                        description: selectedEquipment?.description || '',
                        quantity: selectedEquipment?.quantity.toString() || '',
                        unit: selectedEquipment?.unit || '',
                        po_number: selectedEquipment?.po_number || '',
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    required
                    disabled={!addEquipmentForm.project_vendor_id || existingEquipment.length === 0}
                  >
                    <option value="">
                      {!addEquipmentForm.project_vendor_id 
                        ? 'Select a vendor first' 
                        : existingEquipment.length === 0 
                        ? 'No equipment found for this vendor' 
                        : 'Select equipment'}
                    </option>
                    {existingEquipment.map(eq => (
                      <option key={eq.id} value={eq.id}>
                        PO: {eq.po_number || '—'} - QTY: {eq.quantity} {eq.unit || ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {addEquipmentForm.equipment_id && (
                <div className="bg-gray-50 p-3 rounded-md space-y-1 text-sm">
                  {addEquipmentForm.po_number && (
                    <div><span className="font-medium">PO Number:</span> {addEquipmentForm.po_number}</div>
                  )}
                  <div><span className="font-medium">Quantity:</span> {addEquipmentForm.quantity} {addEquipmentForm.unit || ''}</div>
                  <div><span className="font-medium">Description:</span> {addEquipmentForm.description}</div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Received <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={addEquipmentForm.date_received}
                  onChange={(e) => setAddEquipmentForm(prev => ({ ...prev, date_received: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  onClick={(e) => {
                    // Open the date picker on click
                    if ('showPicker' in e.currentTarget && typeof (e.currentTarget as any).showPicker === 'function') {
                      try {
                        (e.currentTarget as any).showPicker();
                      } catch (err) {
                        // showPicker might not be available, fallback to default behavior
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCloseEquipmentModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                disabled={isAddingEquipment}
              >
                Cancel
              </button>
              <button
                onClick={handleAddEquipment}
                disabled={isAddingEquipment || !addEquipmentForm.equipment_id || !addEquipmentForm.date_received}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingEquipment ? 'Updating...' : 'Mark as Received'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <Toaster />
    </div>
  );
};

export default APMProjects;