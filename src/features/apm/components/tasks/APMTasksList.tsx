import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../../../shared/components/ui/PageHeader";
import { DataTable } from "../../../../shared/components/ui/data-table";
import { createAPMTaskColumns, type APMTask } from "../../../../shared/services/table-columns/apm-task-columns";
import type { BidVendor, VendorWithContact, Bid, User } from "../../../../shared/types";
import { getFollowUpUrgency } from "../../../../shared/utils/phaseFollowUpUtils";
import { exportAPMTasksToExcel, generateAPMTasksFromData } from "../../../../shared/utils/excelGenerator";
import { useToast } from "../../../../shared/hooks/useToast";
import { useDynamicPageSize } from "../../../../shared/hooks/useDynamicPageSize";
import AlertDialog from "../../../../shared/components/ui/AlertDialog";

interface APMTasksListProps {
  bids: Bid[];
  bidVendors: BidVendor[];
  vendors: VendorWithContact[];
  users: User[];
  isLoading?: boolean;
  showHeader?: boolean;
  showFilterButtons?: boolean;
  className?: string;
  initialFilter?: string; // 'all', 'unassigned', or user id
  // Optional external control for search/date so parent can own PageHeader
  externalSearchTerm?: string;
  setExternalSearchTerm?: (term: string) => void;
  externalDateRange?: { startDate: Date | null; endDate: Date | null };
  setExternalDateRange?: (range: { startDate: Date | null; endDate: Date | null }) => void;
}

// Helper function to create timezone-safe date objects from date strings
const parseDateSafe = (dateString: string | null): Date | null => {
  if (!dateString) return null;

  // Extract just the date part from timestamps to avoid timezone conversion
  const dateOnly = dateString.includes("T")
    ? dateString.split("T")[0]
    : dateString;
  const [year, month, day] = dateOnly.split("-").map(Number);

  // Create local date to avoid timezone shifts
  return new Date(year, month - 1, day);
};

// Helper function to normalize dates to midnight for comparison
const normalizeDateToMidnight = (date: Date | null): Date | null => {
  if (!date) return null;
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

// Helper function to get notes for a specific phase
const getPhaseNotes = (
  bidVendor: BidVendor,
  phaseName: string
): string | null => {
  // First check normalized apm_phases structure
  if (bidVendor.apm_phases && bidVendor.apm_phases.length > 0) {
    const phase = bidVendor.apm_phases.find(p => 
      p.phase_name.toLowerCase().replace(/\s+/g, '_') === phaseName ||
      p.phase_name === phaseName
    );
    return phase?.notes || null;
  }

  // Fallback to legacy column-based notes
  switch (phaseName) {
    case "buy_number":
      return bidVendor.buy_number_notes;
    case "po":
      return bidVendor.po_notes;
    case "submittals":
      return bidVendor.submittals_notes;
    case "revised_plans":
      return bidVendor.revised_plans_notes;
    case "equipment_release":
      return bidVendor.equipment_release_notes;
    case "closeouts":
      return bidVendor.closeout_notes;
    default:
      return null;
  }
};

const APMTasksList: React.FC<APMTasksListProps> = ({
  bids,
  bidVendors,
  vendors,
  users,
  isLoading = false,
  showHeader = true,
  showFilterButtons = true,
  className = "",
  initialFilter = "all",
  externalSearchTerm,
  setExternalSearchTerm,
  externalDateRange,
  setExternalDateRange,
}) => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  // Allow parent component to control search term if provided
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const searchTerm = externalSearchTerm ?? internalSearchTerm;
  const setSearchTerm = setExternalSearchTerm ?? setInternalSearchTerm;
  const [activeTab, setActiveTab] = useState(initialFilter);
  const [showExportConfirm, setShowExportConfirm] = useState(false);

  // Sync activeTab when initialFilter changes
  useEffect(() => {
    setActiveTab(initialFilter);
  }, [initialFilter]);
  // Allow parent component to control date range if provided
  const [internalDateRange, setInternalDateRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: null,
    endDate: null,
  });
  const dateRange = externalDateRange ?? internalDateRange;
  const setDateRange = setExternalDateRange ?? setInternalDateRange;
  const [urgencyFilter] = useState("all");

  // Dynamic page size management
  const { 
    pageSize, 
    availablePageSizes, 
    setManualPageSize 
  } = useDynamicPageSize({
    storageKey: 'apm-tasks-page-size',
    rowHeight: 65,
    reservedHeight: 460
  });

  // Transform data into individual task rows
  const individualTasks = useMemo(() => {
    const tasks: APMTask[] = [];

    bidVendors.forEach((bidVendor) => {
      // Skip completed vendors
      if (bidVendor.closeout_received_date) return;

      const vendor = vendors.find((v) => v.id === bidVendor.vendor_id);
      const project = bids.find((b) => b.id === bidVendor.bid_id);
      const assignedUser = users.find(
        (u) => u.id === bidVendor.assigned_apm_user
      );

      if (!vendor || !project) return;

      // Get all pending phases from apm_phases array (normalized structure)
      let phases: Array<{
        name: string;
        displayName: string;
        followUpDate: string | null;
        receivedDate: string | null;
      }> = [];

      if (bidVendor.apm_phases && bidVendor.apm_phases.length > 0) {
        // Use normalized apm_phases structure
        phases = bidVendor.apm_phases.map(phase => ({
          name: phase.phase_name.toLowerCase().replace(/\s+/g, '_'),
          displayName: phase.phase_name,
          followUpDate: phase.follow_up_date,
          receivedDate: phase.received_date,
        }));
      } else {
        // Fallback to legacy column-based structure
        phases = [
          {
            name: "buy_number",
            displayName: "Buy Number",
            followUpDate: bidVendor.buy_number_follow_up_date,
            receivedDate: bidVendor.buy_number_received_date,
          },
          {
            name: "po",
            displayName: "Purchase Order",
            followUpDate: bidVendor.po_follow_up_date,
            receivedDate: bidVendor.po_received_date,
          },
          {
            name: "submittals",
            displayName: "Submittals",
            followUpDate: bidVendor.submittals_follow_up_date,
            receivedDate: bidVendor.submittals_received_date,
          },
          {
            name: "revised_plans",
            displayName: "Revised Plans",
            followUpDate: bidVendor.revised_plans_follow_up_date,
            receivedDate: bidVendor.revised_plans_confirmed_date,
          },
          {
            name: "equipment_release",
            displayName: "Equipment Release",
            followUpDate: bidVendor.equipment_release_follow_up_date,
            receivedDate: bidVendor.equipment_released_date,
          },
          {
            name: "closeouts",
            displayName: "Closeouts",
            followUpDate: bidVendor.closeout_follow_up_date,
            receivedDate: bidVendor.closeout_received_date,
          },
        ];
      }

      // Create individual task for each pending phase
      phases.forEach((phase) => {
        // Skip phases that are already received or have no follow-up date
        if (phase.receivedDate || !phase.followUpDate) return;

        const urgency = getFollowUpUrgency(phase.followUpDate);
        const notes = getPhaseNotes(bidVendor, phase.name);

        tasks.push({
          id: `${bidVendor.id}-${phase.name}`,
          project,
          vendor,
          bidVendor,
          assignedUser: assignedUser || null,
          phase: {
            name: phase.name,
            displayName: phase.displayName,
            followUpDate: phase.followUpDate,
            notes,
          },
          urgency,
        });
      });
    });

    return tasks;
  }, [bidVendors, vendors, bids, users]);

  // Filter tasks (before passing to DataTable)
  const filteredTasks = useMemo(() => {
    let filtered = individualTasks;

    // Filter by tab
    if (activeTab === "unassigned") {
      filtered = filtered.filter((task) => !task.assignedUser);
    } else if (activeTab !== "all") {
      filtered = filtered.filter((task) => task.assignedUser?.id === activeTab);
    }

    // Filter by urgency
    if (urgencyFilter !== "all") {
      filtered = filtered.filter(
        (task) => task.urgency.level === urgencyFilter
      );
    }

    // Filter by date range
    if (dateRange.startDate || dateRange.endDate) {
      filtered = filtered.filter((task) => {
        const taskDate = parseDateSafe(task.phase.followUpDate);
        if (!taskDate) return false;

        const startDate = normalizeDateToMidnight(dateRange.startDate);
        const endDate = normalizeDateToMidnight(dateRange.endDate);
        const normalizedTaskDate = normalizeDateToMidnight(taskDate);

        if (!normalizedTaskDate) return false;

        if (startDate && endDate) {
          return (
            normalizedTaskDate >= startDate && normalizedTaskDate <= endDate
          );
        } else if (startDate) {
          return normalizedTaskDate >= startDate;
        } else if (endDate) {
          return normalizedTaskDate <= endDate;
        }

        return true;
      });
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (task) =>
          task.project.project_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          task.project.project_address
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          task.project.general_contractor
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          task.vendor.company_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          task.phase.displayName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          task.phase.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [
    individualTasks,
    activeTab,
    urgencyFilter,
    dateRange,
    searchTerm,
  ]);

  // Get unique users for tabs
  const assignedUsers = useMemo(() => {
    const userIds = new Set();
    individualTasks.forEach((task) => {
      if (task.assignedUser) {
        userIds.add(task.assignedUser.id);
      }
    });
    return users.filter((user) => userIds.has(user.id));
  }, [individualTasks, users]);

  // Task count by urgency for quick stats
  const urgencyStats = useMemo(() => {
    const stats = { overdue: 0, due_today: 0, critical: 0, normal: 0 };
    filteredTasks.forEach((task) => {
      stats[task.urgency.level as keyof typeof stats]++;
    });
    return stats;
  }, [filteredTasks]);

  // Total task count for tabs
  const totalTaskCount = useMemo(() => {
    return individualTasks.length;
  }, [individualTasks]);

  const unassignedTaskCount = useMemo(() => {
    return individualTasks.filter((task) => !task.assignedUser).length;
  }, [individualTasks]);

  // Create column definitions
  const columns = useMemo(() => createAPMTaskColumns(), []);

  const handleExportToExcel = () => {
    setShowExportConfirm(true);
  };

  const confirmExportToExcel = () => {
    try {
      // Generate APM tasks from filtered data
      const apmTasks = generateAPMTasksFromData(bids, bidVendors, vendors, users);
      
      // Filter tasks to match current view (apply same filters as the UI)
      let tasksToExport = apmTasks;
      
      // Apply tab filtering
      if (activeTab === "unassigned") {
        tasksToExport = tasksToExport.filter((task) => !task.assignedUser);
      } else if (activeTab !== "all") {
        tasksToExport = tasksToExport.filter((task) => task.assignedUser?.id === activeTab);
      }
      
      // Apply search filtering
      if (searchTerm) {
        tasksToExport = tasksToExport.filter(
          (task) =>
            task.project.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.project.project_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.project.general_contractor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.vendor.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.phase.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.phase.notes?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Apply date range filtering
      if (dateRange.startDate || dateRange.endDate) {
        tasksToExport = tasksToExport.filter((task) => {
          const taskDate = parseDateSafe(task.phase.followUpDate);
          if (!taskDate) return false;

          const startDate = normalizeDateToMidnight(dateRange.startDate);
          const endDate = normalizeDateToMidnight(dateRange.endDate);
          const normalizedTaskDate = normalizeDateToMidnight(taskDate);

          if (!normalizedTaskDate) return false;

          if (startDate && endDate) {
            return normalizedTaskDate >= startDate && normalizedTaskDate <= endDate;
          } else if (startDate) {
            return normalizedTaskDate >= startDate;
          } else if (endDate) {
            return normalizedTaskDate <= endDate;
          }

          return true;
        });
      }
      
      exportAPMTasksToExcel(tasksToExport);
      showSuccess('Export Successful! 📊', `Exported ${tasksToExport.length} tasks to Excel`);
    } catch (error) {
      showError('Export Failed ❌', error instanceof Error ? error.message : 'Failed to export to Excel');
    }
  };

  // Get row className for styling
  const getRowClassName = (task: APMTask) => {
    return "hover:bg-gray-50 hover:-translate-y-px active:translate-y-0 border-l-4";
  };

  // Get row style for border color based on urgency
  const getRowStyle = (task: APMTask) => {
    if (task.urgency.level === "overdue" || task.urgency.level === "due_today") {
      return { borderLeftColor: "#f87171" }; // red-400
    } else if (task.urgency.level === "critical") {
      return { borderLeftColor: "#ca8a04" }; // yellow-600
    } else {
      return { borderLeftColor: "#d1d5db" }; // gray-300
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4af37] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading daily tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {showHeader && (
        <div className="flex-shrink-0">
          <div className="flex items-center">
            <PageHeader
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              searchPlaceholder="Search projects..."
              dateRange={dateRange}
              setDateRange={setDateRange}
              showStatusFilter={false}
              showDateFilter={true}
              exportButton={{
                label: "Export",
                onClick: handleExportToExcel,
                disabled: filteredTasks.length === 0
              }}
            />

            {/* Urgency Stats */}
            <div>
              <div className="flex gap-2 text-sm">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  {urgencyStats.overdue} Overdue
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  {urgencyStats.due_today} Due Today
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  {urgencyStats.critical} Due Soon
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto flex flex-col">
        {/* DataTable */}
        <div className="flex-1 min-h-0">
          <DataTable
            columns={columns}
            data={filteredTasks}
            enableRowSelection={false}
            enableSorting={true}
            initialSorting={[{ id: "follow_up_date", desc: false }]}
            onRowClick={(task) => navigate(`/apm/project/${task.project.id}`)}
            isLoading={isLoading}
            emptyMessage="No tasks found"
            getRowClassName={getRowClassName}
            getRowStyle={getRowStyle}
            pageSize={pageSize}
            enablePageSizeSelector={true}
            availablePageSizes={availablePageSizes}
            onPageSizeChange={setManualPageSize}
          />
        </div>
      </div>

      {/* Export Confirmation Modal */}
      <AlertDialog
        isOpen={showExportConfirm}
        onClose={() => setShowExportConfirm(false)}
        onConfirm={confirmExportToExcel}
        title="Export to Excel"
        subtitle={`Export ${filteredTasks.length} APM tasks to Excel`}
        noteText="This will download an Excel file containing all visible APM tasks with current filters applied."
        confirmText="Export to Excel"
        cancelText="Cancel"
        variant="info"
        cleanStyle={true}
      />
    </div>
  );
};

export default APMTasksList;
