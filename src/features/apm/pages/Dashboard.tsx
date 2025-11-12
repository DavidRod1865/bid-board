import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../../shared/components/ui/Sidebar";
import PageHeader from "../../../shared/components/ui/PageHeader";
import type { BidVendor, Vendor, Bid, User } from "../../../shared/types";
import { dbOperations } from "../../../shared/services/supabase";
import { supabase } from "../../../shared/services/supabase";
import { getFollowUpUrgency } from "../../../shared/utils/phaseFollowUpUtils";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface APMDashboardProps {
  // No props needed for now - component manages its own data
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

const APMDashboard: React.FC<APMDashboardProps> = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
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

  // Data states
  const [bids, setBids] = useState<Bid[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bidVendors, setBidVendors] = useState<BidVendor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all APM data
  useEffect(() => {
    const loadAPMData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load all data in parallel
        const [bidsData, vendorsData, usersData] = await Promise.all([
          dbOperations.getBids(),
          dbOperations.getVendors(),
          dbOperations.getUsers(),
        ]);

        // Filter for APM-sent bids only
        const apmBids = bidsData.filter((bid) => bid.sent_to_apm === true);
        setBids(apmBids);
        setVendors(vendorsData);
        setUsers(usersData);

        // Load bid vendors for all APM projects
        const apmBidIds = apmBids.map((bid) => bid.id);
        if (apmBidIds.length > 0) {
          const { data: bidVendorsData, error: bidVendorsError } =
            await supabase
              .from("bid_vendors")
              .select("*")
              .in("bid_id", apmBidIds);

          if (bidVendorsError) throw bidVendorsError;
          setBidVendors(bidVendorsData || []);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load APM data"
        );
      } finally {
        setLoading(false);
      }
    };

    loadAPMData();
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    // Subscribe to all bid vendors changes
    const channel = supabase
      .channel("apm_bid_vendors_all")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bid_vendors",
        },
        (payload: { eventType: string; new?: unknown; old?: unknown }) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const newBidVendor = payload.new as unknown as BidVendor;
            setBidVendors((prev) => [...prev, newBidVendor]);
          } else if (payload.eventType === "UPDATE" && payload.new) {
            const updatedBidVendor = payload.new as unknown as BidVendor;
            setBidVendors((prev) =>
              prev.map((bv) =>
                bv.id === updatedBidVendor.id ? updatedBidVendor : bv
              )
            );
          } else if (payload.eventType === "DELETE" && payload.old) {
            const deletedBidVendor = payload.old as unknown as BidVendor;
            setBidVendors((prev) =>
              prev.filter((bv) => bv.id !== deletedBidVendor.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

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

      // Get all pending phases for this vendor
      const phases = [
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

  if (loading) {
    return (
      <div className="h-screen flex bg-gray-50">
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
    <div className="h-screen flex bg-gray-50">
      <Sidebar
        statusFilter={[]}
        setStatusFilter={() => {}}
        showViewToggle={true}
      />

      <div className="flex-1 flex flex-col mx-auto w-full">
        <div className="flex-shrink-0">
          <PageHeader
            title="Dashboard"
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            searchPlaceholder="Search projects..."
            dateRange={dateRange}
            setDateRange={setDateRange}
            showStatusFilter={false}
            showDateFilter={true}
          />
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-auto bg-gray-50">
          {/* Urgency Stats */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 pb-4">
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

          {/* Tab Navigation */}
          <div className="bg-gray-50 border-b border-gray-200">
            <div className="px-6">
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
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No tasks found</p>
                <p className="text-gray-400 text-sm mt-2">
                  Try adjusting your filters or check back later
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200">
                {/* Table Header */}
                <div className="border-b border-gray-200 bg-gray-50">
                  <div className="grid grid-cols-7 gap-4 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <button
                      onClick={() => handleSort("project_name")}
                      className="col-span-1 text-left hover:text-gray-700 flex items-center gap-1"
                    >
                      Project Name
                      {sortField === "project_name" && (
                        <span className="text-blue-500">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleSort("gc")}
                      className="col-span-1 hover:text-gray-700 flex items-center gap-1 justify-center"
                    >
                      General Contractor
                      {sortField === "gc" && (
                        <span className="text-blue-500">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleSort("vendor")}
                      className="col-span-1 hover:text-gray-700 flex justify-center gap-1"
                    >
                      Vendor
                      {sortField === "vendor" && (
                        <span className="text-blue-500">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleSort("phase")}
                      className="col-span-1 hover:text-gray-700 flex justify-center gap-1"
                    >
                      Phase
                      {sortField === "phase" && (
                        <span className="text-blue-500">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleSort("follow_up_date")}
                      className="col-span-1 hover:text-gray-700 flex justify-center gap-1"
                    >
                      Follow Up On
                      {sortField === "follow_up_date" && (
                        <span className="text-blue-500">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                    <div className="col-span-1 text-left">Notes</div>
                    <button
                      onClick={() => handleSort("assigned_user")}
                      className="col-span-1 hover:text-gray-700 flex justify-center gap-1"
                    >
                      Assigned User
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
                  {filteredTasks.map((task) => {
                    const urgencyClasses = getPhaseUrgencyClasses(
                      task.phase.followUpDate,
                      null
                    );

                    return (
                      <div
                        key={task.id}
                        onClick={() =>
                          navigate(`/apm/project/${task.project.id}`)
                        }
                        className={`w-full border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${urgencyClasses}`}
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
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default APMDashboard;
