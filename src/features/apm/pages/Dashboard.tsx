import React, { useState, useMemo, useRef, useEffect } from "react";
import { DateRangePicker } from "react-date-range";
import type { RangeKeyDict } from "react-date-range";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import NoDataFound from "../../../shared/components/ui/NoDataFound";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../shared/components/ui/Sidebar";
import { Input } from "../../../shared/components/ui/FormField";
import { Button } from "../../../shared/components/ui/Button";
import type { BidVendor, Vendor, VendorWithContact, Bid, User } from "../../../shared/types";
import { getFollowUpUrgency } from "../../../shared/utils/phaseFollowUpUtils";
import { exportAPMTasksToExcel, generateAPMTasksFromData } from "../../../shared/utils/excelGenerator";
import { useToast } from "../../../shared/hooks/useToast";
import { Toaster } from "../../../shared/components/ui/sonner";
import AlertDialog from "../../../shared/components/ui/AlertDialog";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

interface APMDashboardProps {
  bids: Bid[];
  bidVendors: BidVendor[];
  vendors: VendorWithContact[];
  users: User[];
  isLoading?: boolean;
}

interface IndividualTask {
  id: string;
  project: Bid;
  vendor: Vendor;
  bidVendor: BidVendor;
  assignedUser: User | null;
  phase: {
    name: string;
    displayName: string;
    followUpDate: string;
    notes: string | null;
  };
  urgency: ReturnType<typeof getFollowUpUrgency>;
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

// Helper function to format dates avoiding timezone conversion issues
const formatDateSafe = (dateString: string | null): string => {
  const date = parseDateSafe(dateString);
  if (!date) return "—";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Helper function to normalize dates to midnight for comparison
const normalizeDateToMidnight = (date: Date | null): Date | null => {
  if (!date) return null;
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

// Helper function to get urgency background classes for phases
const getPhaseUrgencyClasses = (
  followUpDate: string | null,
  receivedDate: string | null
) => {
  if (receivedDate) return "bg-slate-100 hover:bg-slate-200";

  const urgency = getFollowUpUrgency(followUpDate);
  switch (urgency.level) {
    case "overdue":
      return "bg-red-100 hover:bg-red-200";
    case "due_today":
      return "bg-red-100 hover:bg-red-200";
    case "critical":
      return "bg-orange-100 hover:bg-orange-200";
    default:
      return "bg-slate-100 hover:bg-slate-200";
  }
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

const APMDashboard: React.FC<APMDashboardProps> = ({
  bids,
  bidVendors,
  vendors,
  users,
  isLoading = false
}) => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [dateRange, setDateRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: null,
    endDate: null,
  });
  const [urgencyFilter] = useState("all");
  const [sortField, setSortField] = useState<
    | "project_name"
    | "gc"
    | "vendor"
    | "phase"
    | "follow_up_date"
    | "assigned_user"
  >("follow_up_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Use loading state from props (consistent with other dashboards)
  const error = null; // Error handling is in AppContent

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

  // Real-time data updates are handled by AppContent

  // Transform data into individual task rows
  const individualTasks = useMemo(() => {
    const tasks: IndividualTask[] = [];

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

  // Filter and sort individual tasks
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

    // Sort tasks
    return filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case "project_name":
          aValue = a.project.project_name || "";
          bValue = b.project.project_name || "";
          break;
        case "gc":
          aValue = a.project.general_contractor || "";
          bValue = b.project.general_contractor || "";
          break;
        case "vendor":
          aValue = a.vendor.company_name || "";
          bValue = b.vendor.company_name || "";
          break;
        case "phase":
          aValue = a.phase.displayName;
          bValue = b.phase.displayName;
          break;
        case "follow_up_date":
          return sortDirection === "asc"
            ? new Date(a.phase.followUpDate).getTime() -
                new Date(b.phase.followUpDate).getTime()
            : new Date(b.phase.followUpDate).getTime() -
                new Date(a.phase.followUpDate).getTime();
        case "assigned_user":
          aValue = a.assignedUser?.name || "";
          bValue = b.assignedUser?.name || "";
          break;
        default:
          return 0;
      }

      const comparison = aValue.localeCompare(bValue);
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [
    individualTasks,
    activeTab,
    urgencyFilter,
    dateRange,
    searchTerm,
    sortField,
    sortDirection,
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

  // Helper function for sorting
  const handleSort = (
    field:
      | "project_name"
      | "gc"
      | "vendor"
      | "phase"
      | "follow_up_date"
      | "assigned_user"
  ) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleReset = () => {
    setSearchTerm("");
    setDateRange({ startDate: null, endDate: null });
    setShowDatePicker(false);
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

  if (isLoading) {
    return (
      <div className="h-screen flex bg-slate-100">
        <Sidebar statusFilter={[]} setStatusFilter={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4af37] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading daily tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-100">
      <Sidebar
        statusFilter={[]}
        setStatusFilter={() => {}}
        showViewToggle={true}
      />

      <div className="flex-1 flex flex-col mx-auto w-full">
        <div className="flex-shrink-0">
          {/* Page Title */}
          <div className="px-6 pt-4">
            <h1 className="text-2xl font-bold text-gray-900">APM Follow Ups</h1>
          </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Urgency Stats */}
          <div className="px-6 pb-2">
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

        <div className="flex-1 overflow-auto bg-slate-100">
          {/* Tab Navigation with Search and Actions */}
          <div className="bg-slate-100 border-b border-gray-200">
            <div className="px-6 py-4">
              {/* Search, Date Picker, Reset, and Export Row */}
              <div className="flex items-center justify-between gap-4 flex-wrap mb-4" style={{ rowGap: '0.5rem' }}>
                {/* Left Side: Search, Date Picker, Reset */}
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

                {/* Right Side: Export Button */}
                <div className="flex gap-2 flex-wrap min-w-0">
                  <Button
                    onClick={handleExportToExcel}
                    size="default"
                    disabled={filteredTasks.length === 0}
                    className={`
                      inline-flex items-center justify-center border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500
                      ${
                        filteredTasks.length === 0
                          ? "bg-yellow-300 cursor-not-allowed"
                          : "bg-yellow-500 hover:bg-yellow-600"
                      }
                    `}
                    title="Export"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                    <span>Export</span>
                  </Button>
                </div>
              </div>

              {/* Tab Navigation */}
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "all"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  All Tasks ({totalTaskCount})
                </button>

                <button
                  onClick={() => setActiveTab("unassigned")}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "unassigned"
                      ? "text-orange-600 border-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Unassigned ({unassignedTaskCount})
                </button>

                {assignedUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setActiveTab(user.id)}
                    className={`py-3 px-1 border-b-2 font-medium text-sm ${
                      activeTab === user.id
                        ? "border-current"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                    style={
                      activeTab === user.id
                        ? {
                            color: user.color_preference || "#000",
                            borderColor: user.color_preference || "#000",
                          }
                        : undefined
                    }
                  >
                    {user.name} (
                    {
                      individualTasks.filter(
                        (task) => task.assignedUser?.id === user.id
                      ).length
                    }
                    )
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Individual Tasks Table */}
          <div>
              <div className="bg-slate-100 border border-gray-200">
                {/* Table Header */}
                <div className="border-b border-gray-200 bg-slate-100">
                  <div className="grid grid-cols-7 gap-4 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <button
                      onClick={() => handleSort("project_name")}
                      className="col-span-1 text-left hover:text-gray-700 flex items-center gap-1 font-semibold"
                    >
                      PROJECT NAME
                      {sortField === "project_name" && (
                        <span className="text-blue-500">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleSort("gc")}
                      className="col-span-1 hover:text-gray-700 flex items-center gap-1 justify-center font-semibold"
                    >
                      GENERAL CONTRACTOR
                      {sortField === "gc" && (
                        <span className="text-blue-500">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleSort("vendor")}
                      className="col-span-1 hover:text-gray-700 flex justify-center gap-1 font-semibold"
                    >
                      VENDOR
                      {sortField === "vendor" && (
                        <span className="text-blue-500">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleSort("phase")}
                      className="col-span-1 hover:text-gray-700 flex justify-center gap-1 font-semibold"
                    >
                      BUYOUT PHASE
                      {sortField === "phase" && (
                        <span className="text-blue-500">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleSort("follow_up_date")}
                      className="col-span-1 hover:text-gray-700 flex justify-center gap-1 font-semibold"
                    >
                      FOLLOW UP
                      {sortField === "follow_up_date" && (
                        <span className="text-blue-500">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                    <div className="col-span-1 text-left font-bold">Notes</div>
                    <button
                      onClick={() => handleSort("assigned_user")}
                      className="col-span-1 hover:text-gray-700 flex justify-center gap-1 font-semibold"
                    >
                      ASSIGNED TO
                      {sortField === "assigned_user" && (
                        <span className="text-blue-500">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Table Body */}
                <div className="w-full">
                  {filteredTasks.length === 0 ? (
                    <NoDataFound />
                  ) : (
                    <>
                  {filteredTasks.map((task) => {
                    const urgencyClasses = getPhaseUrgencyClasses(
                      task.phase.followUpDate,
                      null
                    );

                    return (< div key={task.id} className="flex">
                    
                      <div className={`w-1 h-100% ${
                              task.urgency.level === "overdue"
                                ? "text-red-400 border-2 border-red-400"
                                : task.urgency.level === "due_today"
                                ? "text-red-700 border-2 border-red-700"
                                : task.urgency.level === "critical"
                                ? "text-yellow-600 border-2 border-yellow-6 00"
                                : "text-gray-600 border-2 border-gray-600"}`}/>
                      <div
                        key={task.id}
                        onClick={() =>
                          navigate(`/apm/project/${task.project.id}`)
                        }
                        className={`w-full border-b border-gray-100 bg-white hover:bg-gray-50 cursor-pointer ${urgencyClasses}`}
                      >
                        <div className="grid grid-cols-7 gap-4 px-6 py-4 items-center w-full">
                          {/* Project Name */}
                          <div className="col-span-1">
                            <div className="font-medium text-gray-900 text-xs truncate">
                              {task.project.project_name}
                            </div>
                            {task.project.project_address && (
                              <div className="text-xs text-gray-500 truncate">
                                {task.project.project_address}
                              </div>
                            )}
                          </div>

                          {/* GC */}
                          <div className="col-span-1 flex items-center justify-center">
                            <div className="text-sm text-gray-900">
                              {task.project.general_contractor || "—"}
                            </div>
                          </div>

                          {/* Vendor */}
                          <div className="col-span-1 flex items-center justify-center">
                            <div className="text-sm font-medium text-gray-900">
                              {task.vendor.company_name}
                            </div>
                          </div>

                          {/* Phase */}
                          <div className="col-span-1 flex items-center justify-center">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                task.urgency.level === "overdue"
                                  ? "text-red-500 border-2 border-red-500"
                                  : task.urgency.level === "due_today"
                                  ? "text-red-800 border-2 border-red-800"
                                  : task.urgency.level === "critical"
                                  ? "text-yellow-700 border-2 border-yellow-700"
                                  : "text-gray-600 border-2 border-gray-600"
                              }`}
                            >
                              {task.phase.displayName}
                            </span>
                          </div>

                          {/* Follow Up Date */}
                          <div className="col-span-1 flex flex-col items-center">
                            <div className="text-xs font-medium text-gray-900">
                              {formatDateSafe(task.phase.followUpDate)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {task.urgency.level === "overdue"
                                ? `${Math.abs(
                                    task.urgency.businessDaysRemaining
                                  )} days overdue`
                                : task.urgency.level === "due_today"
                                ? "Due today"
                                : task.urgency.level === "critical"
                                ? `Due in ${task.urgency.businessDaysRemaining} days`
                                : `Due in ${task.urgency.businessDaysRemaining} days`}
                            </div>
                          </div>

                          {/* Phase Notes */}
                          <div className="col-span-1">
                            <div className="relative group">
                              <div className="text-xs text-gray-600 truncate">
                                {task.phase.notes || "—"}
                              </div>
                              {task.phase.notes &&
                                task.phase.notes.length > 50 && (
                                  <div className="hidden group-hover:block absolute rounded-md z-10 left-0 mt-1 w-64 p-2 bg-white border border-gray-300 shadow-lg text-xs text-gray-700 whitespace-pre-wrap truncate">
                                    {task.phase.notes}
                                  </div>
                                )}
                            </div>
                          </div>

                          {/* Assigned User */}
                          <div className="col-span-1 flex items-center justify-center">
                            {task.assignedUser ? (
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-sm truncate"
                                  style={{
                                    color:
                                      task.assignedUser.color_preference ||
                                      "#000",
                                  }}
                                >
                                  {task.assignedUser.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-orange-600 font-medium">
                                Unassigned
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                  </>
                  )}
                </div>
              </div>
          </div>
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

      {/* Toast Container */}
      <Toaster />
    </div>
  );
};

export default APMDashboard;
