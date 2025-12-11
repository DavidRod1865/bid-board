import React, { useState, useEffect } from "react";
import {
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import type { ColumnDef } from "@tanstack/react-table";

import Sidebar from "../components/ui/Sidebar";
import { DataTable } from "../components/ui/data-table";
import { Badge } from "../components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { dbOperations } from "../services/supabase";
import { userCache } from "../services/userCache";
import type { User } from "../types";
import type { AnalyticsFilters, AnalyticsDashboardData } from "../types/analytics";
import { EnvelopeIcon, PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/solid";
import UserEditModal from "../components/modals/UserEditModal";
import UserInviteModal from "../components/modals/UserInviteModal";
import { auth0Service } from "../services/auth0Service";
import { useToast } from "../hooks/useToast";
import { useDynamicPageSize } from "../hooks/useDynamicPageSize";

// Analytics Components
import ResponseRateDonutChart from "../components/analytics/ResponseRateDonutChart";
import ResponseRateTrendChart from "../components/analytics/ResponseRateTrendChart";
import VendorPerformanceBubbleChart from "../components/analytics/VendorPerformanceBubbleChart";
import ResponseTimeHistogram from "../components/analytics/ResponseTimeHistogram";
import AnalyticsFiltersComponent from "../components/analytics/AnalyticsFilters";
import { KPICardsGrid } from "../components/analytics/KPICard";
import { 
  processResponseData,
  processTrendData,
  processVendorData,
  processTimeDistributionData
} from "../utils/analyticsUtils";

// Dummy handlers for sidebar (admin page doesn't need these)
const handleStatusFilter = () => {};

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState("Analytics");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Record<string, boolean>>({});
  const [currentUser] = useState<User | undefined>(undefined); // TODO: Get from auth context
  const { showSuccess, showError } = useToast();

  // Dynamic page size management for user table
  const { 
    pageSize, 
    availablePageSizes, 
    setManualPageSize 
  } = useDynamicPageSize({
    storageKey: 'admin-users-page-size',
    rowHeight: 70, // Slightly larger for user table rows
    reservedHeight: 400 // Less reserved space since admin has simpler header
  });
  
  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<AnalyticsDashboardData>({
    responseDistribution: [],
    trendData: [],
    vendorData: [],
    timeDistribution: [],
    kpis: []
  });
  const [analyticsFilters, setAnalyticsFilters] = useState<AnalyticsFilters>({
    filterType: 'quick',
    timeframe: '30days', // Default to 30 days as requested
    costRange: 'all',
    vendorType: 'all'
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);


  // Helper function to get period description for KPI titles
  const getPeriodDescription = (filters: AnalyticsFilters) => {
    switch (filters.filterType) {
      case 'month':
        if (filters.selectedMonth) {
          const [year, month] = filters.selectedMonth.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1);
          return `in ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
        }
        return 'in 30 days';
      
      case 'custom':
        if (filters.startDate && filters.endDate) {
          const start = new Date(filters.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const end = new Date(filters.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return `from ${start} to ${end}`;
        }
        return 'in selected period';
      
      case 'quick':
      default:
        switch (filters.timeframe) {
          case '30days': return 'in 30 days';
          case '90days': return 'in 90 days';
          case '12months': return 'in 12 months';
          case 'all': return 'all time';
          default: return 'in 30 days';
        }
    }
  };

  // Helper function to get actual date range for display
  const getActualDateRange = (filters: AnalyticsFilters) => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;

    switch (filters.filterType) {
      case 'month':
        if (filters.selectedMonth) {
          const [year, month] = filters.selectedMonth.split('-');
          startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
          endDate = new Date(parseInt(year), parseInt(month), 0);
        } else {
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
        }
        break;
      
      case 'custom':
        if (filters.startDate && filters.endDate) {
          // Parse dates as local dates to avoid timezone issues
          const [startYear, startMonth, startDay] = filters.startDate.split('-').map(Number);
          const [endYear, endMonth, endDay] = filters.endDate.split('-').map(Number);
          startDate = new Date(startYear, startMonth - 1, startDay);
          endDate = new Date(endYear, endMonth - 1, endDay);
        } else {
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
        }
        break;
      
      case 'quick':
      default:
        startDate = new Date();
        switch (filters.timeframe) {
          case '30days':
            startDate.setDate(startDate.getDate() - 30);
            break;
          case '90days':
            startDate.setDate(startDate.getDate() - 90);
            break;
          case '12months':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
          case 'all':
            return 'All Time';
        }
        break;
    }

    const start = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} - ${end}`;
  };

  // Fetch users data
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const usersData = await userCache.getUsers();
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (activeTab === "Users") {
      fetchUsers();
    }
  }, [activeTab]);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (activeTab !== "Analytics") return;
      
      try {
        setAnalyticsLoading(true);
        
        // Fetch real data from Supabase
        const [
          responseData,
          trendData,
          vendorData,
          timeData,
          bidsKPIData
        ] = await Promise.all([
          dbOperations.getResponseDistribution(),
          dbOperations.getTrendData(),
          dbOperations.getVendorPerformanceData(),
          dbOperations.getTimeDistributionData(),
          dbOperations.getBidsForKPI()
        ]);
        
        // Process the raw data
        const processedData = {
          responseDistribution: processResponseData(responseData || []),
          trendData: processTrendData(trendData || [], analyticsFilters),
          vendorData: processVendorData(vendorData || []),
          timeDistribution: processTimeDistributionData(timeData || [])
        };
        
        // Calculate KPIs from bids data (not bid_vendors)
        const periodDescription = getPeriodDescription(analyticsFilters);
        
        // Use bidsKPIData for accurate bid counts from bids table
        const totalBidsInPeriod = bidsKPIData?.length || 0;
        
        // Number of bids won in selected period (from bids table)
        const bidsWonInPeriod = bidsKPIData?.filter(item => 
          item.status === 'awarded' || item.status === 'won'
        ).length || 0;
        
        // Number of overdue bids in selected period (from bids table)
        const overdueBidsInPeriod = bidsKPIData?.filter(item => {
          if (item.status === 'archived' || !item.due_date) return false;
          return new Date(item.due_date) < new Date();
        }).length || 0;
        
        // Calculate average vendor response time using the same base data (responseData)
        const responseTimes = responseData?.map(item => {
          if (!item.response_received_date || !item.created_at) return null;
          return Math.floor(
            (new Date(item.response_received_date).getTime() - new Date(item.created_at).getTime()) 
            / (1000 * 60 * 60 * 24)
          );
        }).filter((time): time is number => time !== null && time >= 0) || [];
        
        const avgVendorResponseTime = responseTimes.length > 0 
          ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
          : 0;
        
        setAnalyticsData({
          ...processedData,
          kpis: [
            { 
              title: `# of Bids ${periodDescription}`, 
              value: totalBidsInPeriod.toString()
            },
            { 
              title: `# of Bids Won ${periodDescription}`, 
              value: bidsWonInPeriod.toString()
            },
            { 
              title: `# of Overdue Bids ${periodDescription}`, 
              value: overdueBidsInPeriod.toString(),
              urgent: overdueBidsInPeriod > 0 
            },
            { 
              title: "Avg Vendor Response Time", 
              value: `${avgVendorResponseTime} days`
            }
          ]
        });
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        // Set empty data on error with dynamic period description
        const periodDescription = getPeriodDescription(analyticsFilters);
        setAnalyticsData({
          responseDistribution: [{ status: 'No Data', count: 0, percentage: 100, color: '#9ca3af' }],
          trendData: [],
          vendorData: [],
          timeDistribution: [],
          kpis: [
            { title: `Bids ${periodDescription}`, value: "0" },
            { title: `ids Won ${periodDescription}`, value: "0" },
            { title: `Overdue Bids ${periodDescription}`, value: "0", urgent: false },
            { title: "Avg Vendor Response Time", value: "0 days" }
          ]
        });
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [activeTab, analyticsFilters]);


  // User management functions
  const handleUpdateUser = async (userId: string, userData: Partial<User>) => {
    try {
      // Update user in database
      await dbOperations.updateUserProfile(userId, userData);
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, ...userData } : user
        )
      );
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // Delete user from database
      await dbOperations.deleteUser(userId);
      
      // Remove user from local state
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  };

  const handleUserCreated = (newUser: User) => {
    // Add new user to local state
    setUsers(prevUsers => [newUser, ...prevUsers]);
  };

  // Helper function to determine user status
  const getUserStatus = (user: User): string => {
    if (user.is_active) return "Active";
    
    if (user.invitation_sent_at) {
      // Check if invitation is expired (7 days default)
      const invitationDate = new Date(user.invitation_sent_at);
      const expiryDate = new Date(invitationDate.getTime() + (7 * 24 * 60 * 60 * 1000));
      const now = new Date();
      
      if (now > expiryDate) {
        return "Invite Expired";
      } else {
        return "Invite Sent";
      }
    }
    
    return "Inactive";
  };

  // Helper function to get status style
  const getStatusStyle = (status: string): string => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 border-green-200 hover:bg-green-200";
      case "Invite Sent":
        return "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200";
      case "Invite Expired":
        return "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200";
      case "Inactive":
        return "bg-red-100 text-red-800 border-red-200 hover:bg-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200";
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setSelectedUser(null);
  };

  // Get selected user IDs and count
  const selectedRowIndices = Object.keys(selectedUsers).filter(id => selectedUsers[id]);
  const selectedUserIds = selectedRowIndices.map(index => users[parseInt(index)]?.id).filter(Boolean);
  const selectedCount = selectedUserIds.length;

  // Bulk action handlers
  const handleBulkPasswordReset = async () => {
    if (selectedCount === 0) return;
    
    const selectedUsersData = selectedRowIndices
      .map(index => users[parseInt(index)])
      .filter(Boolean);
    
    const confirmReset = window.confirm(
      `Send password reset emails to ${selectedCount} user(s)?`
    );
    
    if (!confirmReset) return;
    
    try {
      // Send password reset emails to all selected users
      const emailPromises = selectedUsersData.map(async (user) => {
        try {
          await auth0Service.sendPasswordResetEmail(user.email);
          return { email: user.email, success: true };
        } catch (error) {
          console.error(`Failed to send reset email to ${user.email}:`, error);
          return { email: user.email, success: false };
        }
      });
      
      const results = await Promise.all(emailPromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      if (successful.length > 0) {
        showSuccess(
          'Password Resets Sent', 
          `Password reset emails sent to ${successful.length} user(s)`
        );
      }
      
      if (failed.length > 0) {
        showError(
          'Some Resets Failed', 
          `Failed to send emails to ${failed.length} user(s): ${failed.map(f => f.email).join(', ')}`
        );
      }
      
      // Clear selection
      setSelectedUsers({});
      
    } catch (error) {
      console.error('Bulk password reset error:', error);
      showError('Reset Failed', 'Failed to send password reset emails. Please try again.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCount === 0) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedCount} user(s)? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      // Delete multiple users
      await Promise.all(selectedUserIds.map(userId => handleDeleteUser(userId)));
      setSelectedUsers({});
    } catch (error) {
      console.error("Error deleting users:", error);
      alert("Failed to delete some users. Please try again.");
    }
  };

  // Column definitions for users table
  const userColumns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: () => <div className="ml-2">Name</div>,
      meta: {
        width: "w-[20%]",
      },
      cell: ({ row }) => (
        <div className="font-medium ml-2">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      meta: {
        width: "w-[20%]",
      },
      cell: ({ row }) => (
        <div className="text-gray-600">{row.getValue("email")}</div>
      ),
    },
    {
      accessorKey: "is_active",
      header: () => <div className="text-center">Status</div>,
      meta: {
        width: "w-[12%]",
      },
      cell: ({ row }) => {
        const user = row.original;
        const status = getUserStatus(user);

        return (
          <div className="flex justify-center">
            <Badge
              variant={"outline"}
              className={`uppercase font-medium transition-colors w-28 text-xs ${getStatusStyle(status)}`}
            >
              {status}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: () => <div className="text-center">Role</div>,
      meta: {
        width: "w-[10%]",
      },
      cell: ({ row }) => {
        const role = row.getValue("role") as string;

        // Role-specific Color Styles
        const getRoleStyle = (role: string) => {
          switch (role) {
            case "APM":
              return "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200";
            case "Estimating":
              return "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200";
            case "Admin":
              return "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200";
            default:
              return "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200";
          }
        };

        return (
          <div className="flex justify-center">
            <Badge
              variant="outline"
              className={`uppercase font-medium transition-colors w-24 ${getRoleStyle(
                role || ""
              )}`}
            >
              {role || "N/A"}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "color_preference",
      header: () => <div className="text-center">Color</div>,
      meta: {
        width: "w-[10%]",
      },
      cell: ({ row }) => {
        const color = row.getValue("color_preference") as string;
        return (
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className={`w-24 h-6 rounded-full border`} style={{ backgroundColor: color }} />
          </div>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: () => <div className="text-center">Created At</div>,
      meta: {
        width: "w-[10%]",
      },
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string;
        if (!date) return <div className="text-gray-400">—</div>;

        return (
          <div className="text-gray-600 items-center justify-center flex">
            {new Date(date).toLocaleDateString()}
          </div>
        );
      },
    },
    {
      accessorKey: "updated_at",
      header: () => <div className="text-center">Last Update</div>,
      meta: {
        width: "w-[10%]",
      },
      cell: ({ row }) => {
        const date = row.getValue("updated_at") as string;
        if (!date) return <div className="text-gray-400">—</div>;

        return (
          <div className="text-gray-600 items-center justify-center flex">
            {new Date(date).toLocaleDateString()}
          </div>
        );
      },
    },
    {
      accessorKey: "actions",
      header: () => <div className="text-center">Actions</div>,
      meta: {
        width: "w-[12%]",
      },
      cell: ({ row }) => {
        const user = row.original;
        const status = getUserStatus(user);

        const handleResetPassword = async () => {
          try {
            await auth0Service.sendPasswordResetEmail(user.email);
            showSuccess('Password Reset Sent', `Password reset link sent to ${user.email}`);
          } catch (error) {
            console.error('Failed to send password reset:', error);
            showError('Reset Failed', 'Failed to send password reset email. Please try again.');
          }
        };

        const handleResendInvitation = async () => {
          try {
            // For pending invitations, also send password reset email
            await auth0Service.sendPasswordResetEmail(user.email);
            
            // Update invitation timestamp in Supabase
            await dbOperations.resendUserInvitation(user.id);
            
            showSuccess('Invitation Resent', `New invitation sent to ${user.email}`);
            
            // Refresh users list to show updated timestamp
            userCache.invalidateCache(); // Invalidate cache to force fresh data
            const updatedUsers = await userCache.getUsers();
            setUsers(updatedUsers);
            
          } catch (error) {
            console.error('Failed to resend invitation:', error);
            showError('Resend Failed', 'Failed to resend invitation. Please try again.');
          }
        };

        return (
          <div className="flex items-center justify-center gap-2">
            <PencilIcon
              onClick={() => openEditModal(user)}
              className="text-blue-600 hover:text-blue-800 h-5 w-5 cursor-pointer transition-colors"
              title="Edit User"
            />
            {status === "Active" ? (
              <EnvelopeIcon
                onClick={handleResetPassword}
                className="text-green-600 hover:text-green-800 h-5 w-5 cursor-pointer transition-colors"
                title="Reset Password"
              />
            ) : (status === "Invite Sent" || status === "Invite Expired") ? (
              <EnvelopeIcon
                onClick={handleResendInvitation}
                className="text-orange-600 hover:text-orange-800 h-5 w-5 cursor-pointer transition-colors"
                title="Resend Invitation"
              />
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar
        statusFilter={[]}
        setStatusFilter={handleStatusFilter}
        showViewToggle={true}
      />

      <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
        {/* Header */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Admin & Analytics
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage system settings, user permissions, and view analytics.
                </p>
              </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="px-6">
            <div className="flex items-center justify-between">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab("Analytics")}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "Analytics"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Analytics
                </button>

                <button
                  onClick={() => setActiveTab("Users")}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "Users"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Users
                </button>
              </nav>
              
              {/* Add User Button and Actions - Only show when Users tab is active */}
              {activeTab === "Users" && (
                <div className="flex items-center gap-3">
                  {/* Bulk Actions Dropdown - Only show when users are selected */}
                  {selectedCount > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm">
                          Actions ({selectedCount})
                          <ChevronDownIcon className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleBulkPasswordReset}>
                          <EnvelopeIcon className="w-4 h-4 mr-3 text-blue-500" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleBulkDelete} className="text-red-600">
                          <TrashIcon className="w-4 h-4 mr-3 text-red-500" />
                          Delete Users
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* Add User Button */}
                  <button
                    onClick={() => setInviteModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                  >
                    <PlusIcon className="w-3 h-3" />
                    Add User
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === "Analytics" ? (
            <div className="p-6 space-y-6">
              {/* Analytics Filters */}
              <AnalyticsFiltersComponent 
                filters={analyticsFilters}
                onFilterChange={setAnalyticsFilters}
                isLoading={analyticsLoading}
              />

              {analyticsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600">Loading analytics data...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* KPI Cards */}
                  <KPICardsGrid 
                    data={analyticsData.kpis} 
                    dateRange={getActualDateRange(analyticsFilters)}
                  />

                  {/* Charts Row 1 - Response Distribution & Time Distribution */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ResponseRateDonutChart data={analyticsData.responseDistribution} />
                    <ResponseTimeHistogram data={analyticsData.timeDistribution} />
                  </div>

                  {/* Charts Row 2 - Response Rate Trend */}
                  <div className="grid grid-cols-1 gap-6">
                    <ResponseRateTrendChart data={analyticsData.trendData} />
                  </div>

                  {/* Charts Row 3 - Vendor Performance */}
                  <div className="grid grid-cols-1 gap-6">
                    <VendorPerformanceBubbleChart data={analyticsData.vendorData} />
                  </div>
                </>
              )}

              {/* Quick Actions Section */}
              <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors">
                    <div className="font-medium text-gray-900">
                      Export Analytics
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Download analytics report
                    </div>
                  </button>
                  <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors">
                    <div className="font-medium text-gray-900">
                      Vendor Report
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Generate vendor performance
                    </div>
                  </button>
                  <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors">
                    <div className="font-medium text-gray-900">Response Alerts</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Setup automated alerts
                    </div>
                  </button>
                  <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors">
                    <div className="font-medium text-gray-900">
                      Custom Dashboard
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Create custom views
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* User Management View */}
              <DataTable
                columns={userColumns}
                data={users}
                isLoading={isLoading}
                enableSorting={true}
                enableRowSelection={true}
                rowSelection={selectedUsers}
                onRowSelectionChange={setSelectedUsers}
                pageSize={pageSize}
                enablePageSizeSelector={true}
                availablePageSizes={availablePageSizes}
                onPageSizeChange={setManualPageSize}
                emptyMessage="No users found"
              />
            </>
          )}
        </div>
      </div>

      {/* User Edit Modal */}
      <UserEditModal
        isOpen={editModalOpen}
        onClose={closeEditModal}
        user={selectedUser}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
      />

      {/* User Invite Modal */}
      <UserInviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onUserCreated={handleUserCreated}
        existingUsers={users}
        currentUser={currentUser}
      />
    </div>
  );
};

export default Admin;
