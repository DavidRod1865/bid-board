import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Bid, User, ProjectNote, Vendor, BidVendor } from "../../../../shared/types";
import Sidebar from "../../../../shared/components/ui/Sidebar";
import AlertDialog from "../../../../shared/components/ui/AlertDialog";
import StatusBadge from "../../../../shared/components/ui/StatusBadge";
import VendorTable from "../../../estimating/components/VendorManagement/VendorTable";
import ProjectNotes from "../../../../shared/components/modals/ProjectNotes";
import AddVendorToProjectModal from "../../../estimating/components/VendorManagement/AddVendorToProjectModal";
import AddNoteModal from "../../../../shared/components/modals/AddNoteModal";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "../../../../shared/components/ui/breadcrumb";
import { dbOperations } from "../../../../shared/services/supabase";
// Real-time updates handled by AppContent
import { formatDate } from "../../../../shared/utils/formatters";
import { BID_STATUSES } from "../../../../shared/utils/constants";
import {
  UserPlusIcon,
  PencilIcon,
  PencilSquareIcon,
  PauseCircleIcon,
  ArchiveBoxIcon,
  PlayIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface ProjectDetailProps {
  bid: Bid;
  bidVendors: BidVendor[];
  projectNotes: ProjectNote[];
  vendors: Vendor[];
  users: User[];
  onUpdateBid: (bidId: number, updatedBid: Partial<Bid>) => Promise<void>;
  onDeleteBid: (bidId: number) => Promise<void>;
  onAddBidVendor: (bidId: number, vendorData: Omit<BidVendor, 'id' | 'bid_id'>) => Promise<void>;
  onUpdateBidVendor: (bidVendorId: number, vendorData: Partial<BidVendor>) => Promise<void>;
  onRemoveBidVendors: (bidVendorIds: number[]) => Promise<void>;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({
  bid,
  bidVendors,
  projectNotes,
  vendors,
  users,
  onUpdateBid,
  onDeleteBid,
  onAddBidVendor,
  onUpdateBidVendor,
  onRemoveBidVendors,
}) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  // projectNotes now comes from props
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showRemoveVendorsModal, setShowRemoveVendorsModal] = useState(false);
  const [vendorsToRemove, setVendorsToRemove] = useState<number[]>([]);
  const [editingBidVendor, setEditingBidVendor] = useState<BidVendor | null>(
    null
  );
  const [isVendorLoading, setIsVendorLoading] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Data comes from props - create filtered/derived state
  const projectVendors = bidVendors.filter(bv => bv.bid_id === bid.id);
  const filteredProjectNotes = projectNotes.filter(note => note.bid_id === bid.id);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Sidebar state
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  // Tab state for bottom panel
  const [activeTab, setActiveTab] = useState("vendors");

  // Vendor selection state for sidebar integration
  const [selectedVendorIds, setSelectedVendorIds] = useState<number[]>([]);

  const getVendorById = (vendorId: number) =>
    vendors.find((v) => v.id === vendorId);

  const [formData, setFormData] = useState({
    title: bid.title,
    status: bid.status,
    due_date: bid.due_date,
    notes: bid.notes || "",
    project_name: bid.project_name,
    project_address: bid.project_address || "",
    general_contractor: bid.general_contractor || "",
    project_description: bid.project_description || "",
    estimated_value: bid.estimated_value || 0,
    created_by: bid.created_by || "",
    assign_to: bid.assign_to || "",
    file_location: bid.file_location || "",
  });

  // Set current user from users prop
  useEffect(() => {
    setCurrentUser(users[0] || null);
  }, [users]);

  // Real-time updates are now handled by the centralized AppContent subscription system
  // Individual component subscriptions have been removed to prevent conflicts

  // Update form data when bid prop changes
  useEffect(() => {
    setFormData({
      title: bid.title,
      status: bid.status,
      due_date: bid.due_date,
      notes: bid.notes || "",
      project_name: bid.project_name,
      project_address: bid.project_address || "",
      general_contractor: bid.general_contractor || "",
      project_description: bid.project_description || "",
      estimated_value: bid.estimated_value || 0,
      created_by: bid.created_by || "",
      assign_to: bid.assign_to || "",
      file_location: bid.file_location || "",
    });
  }, [bid]);

  const handleSave = async () => {
    try {
      // Convert empty created_by to null for database
      const dataToSave = {
        ...formData,
        created_by: formData.created_by || null,
      };
      await onUpdateBid(bid.id, dataToSave);
      setIsEditing(false);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to update project"
      );
    }
  };

  const handleCancel = () => {
    setFormData({
      title: bid.title,
      status: bid.status,
      due_date: bid.due_date,
      notes: bid.notes || "",
      project_name: bid.project_name,
      project_address: bid.project_address || "",
      general_contractor: bid.general_contractor || "",
      project_description: bid.project_description || "",
      estimated_value: bid.estimated_value || 0,
      created_by: bid.created_by || "",
      assign_to: bid.assign_to || "",
      file_location: bid.file_location || "",
    });
    setIsEditing(false);
  };

  // Vendor modal handlers
  const handleAddVendor = () => {
    setEditingBidVendor(null);
    setShowVendorModal(true);
  };

  const handleEditVendor = (vendorId: number) => {
    // Find the BidVendor record for this vendor and project
    const bidVendorRecord = projectVendors.find(
      (bv) => bv.vendor_id === vendorId
    );
    if (bidVendorRecord) {
      setEditingBidVendor(bidVendorRecord);
      setShowVendorModal(true);
    }
  };

  const handleSaveVendor = async (
    vendorData: Omit<BidVendor, "id" | "bid_id">
  ) => {
    setIsVendorLoading(true);
    try {
      if (editingBidVendor) {
        // Update existing bid vendor
        await onUpdateBidVendor(editingBidVendor.id, vendorData);
      } else {
        // Add new bid vendor
        await onAddBidVendor(bid.id, vendorData);
      }
      setShowVendorModal(false);
      setEditingBidVendor(null);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to save vendor"
      );
    } finally {
      setIsVendorLoading(false);
    }
  };

  const handleRemoveVendors = (vendorIds: number[]) => {
    setVendorsToRemove(vendorIds);
    setShowRemoveVendorsModal(true);
  };

  // Sidebar vendor management handlers
  const handleSidebarRemoveVendors = () => {
    if (selectedVendorIds.length > 0) {
      handleRemoveVendors(selectedVendorIds);
    }
  };

  const handleVendorSelectionChange = (selectedIds: number[]) => {
    setSelectedVendorIds(selectedIds);
  };

  const confirmRemoveVendors = async () => {
    try {
      setIsVendorLoading(true);

      // Convert vendor IDs to bid_vendor IDs
      const bidVendorIds = projectVendors
        .filter((bv) => vendorsToRemove.includes(bv.vendor_id))
        .map((bv) => bv.id);

      // Remove vendors using prop function for real-time updates
      await onRemoveBidVendors(bidVendorIds);

      // Removal will be reflected via real-time updates from AppContent

      // Close modal and reset state
      setShowRemoveVendorsModal(false);
      setVendorsToRemove([]);
      setSelectedVendorIds([]);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to remove vendors"
      );
    } finally {
      setIsVendorLoading(false);
    }
  };

  const handleEditProject = () => {
    setIsEditing(true);
  };

  const handleDeleteProject = () => {
    setShowDeleteModal(true);
  };

  const handleArchiveProject = () => {
    setShowArchiveModal(true);
  };

  const handleAddNote = () => {
    setShowAddNoteModal(true);
  };

  const handleAddNoteSubmit = async (content: string) => {
    // Let the database function auto-detect current user via Auth
    await dbOperations.createProjectNote(bid.id, content);
  };

  const confirmDeleteProject = async () => {
    try {
      await onDeleteBid(bid.id);
      navigate("/");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to delete project"
      );
    }
  };

  const confirmArchiveProject = async () => {
    try {
      if (!currentUser) {
        setError("Unable to archive project - user not found");
        return;
      }

      // Use onUpdateBid to update both database and local state
      await onUpdateBid(bid.id, {
        archived: true,
        archived_at: new Date().toISOString(),
        archived_by: currentUser.id,
      });

      navigate("/");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to archive project"
      );
    }
  };

  const handleMoveToOnHold = async () => {
    try {
      if (!currentUser) {
        setError("Unable to move project to on-hold - user not found");
        return;
      }

      // Use onUpdateBid to update both database and local state
      await onUpdateBid(bid.id, {
        on_hold: true,
        on_hold_at: new Date().toISOString(),
        on_hold_by: currentUser.id,
      });

      navigate("/");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to move project to on-hold"
      );
    }
  };

  const handleMoveToActive = async () => {
    try {
      if (!currentUser) {
        setError("Unable to move project to active - user not found");
        return;
      }

      // Use onUpdateBid to update both database and local state
      await onUpdateBid(bid.id, {
        on_hold: false,
        on_hold_at: null,
        on_hold_by: null,
        archived: false,
        archived_at: null,
        archived_by: null,
      });

      navigate("/");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to move project to active"
      );
    }
  };

  const isLoading = false; // Data comes from props

  // Helper functions to determine project state
  const isActive = !bid.archived && !bid.on_hold;
  const isOnHold = bid.on_hold && !bid.archived;
  const isArchived = bid.archived;

  // Get breadcrumb information based on project state
  const getBreadcrumbInfo = () => {
    if (isActive) {
      return {
        section: "Active Bids",
        path: "/"
      };
    } else if (isOnHold) {
      return {
        section: "Bids on Hold",
        path: "/on-hold"
      };
    } else if (isArchived) {
      return {
        section: "Archived Bids",
        path: "/archives"
      };
    }
    return {
      section: "Active Bids", // fallback
      path: "/"
    };
  };

  const breadcrumbInfo = getBreadcrumbInfo();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex min-h-screen">
          <Sidebar
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
          <div className="flex-1 p-8">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4af37] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading project details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        <Sidebar
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />

        <div className="flex-1 overflow-y-auto">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mx-6 mt-4">
              <div className="flex justify-between items-center">
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-red-700 hover:text-red-900"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Custom Page Header with Breadcrumb, Status Badge, and Action Buttons */}
          <div className="bg-gray-50">
            {/* Header with Breadcrumb, Status Badge, and Action Buttons on same line */}
            <div className="flex justify-between items-center px-6 pt-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-4">
                {/* Breadcrumb Navigation */}
                <Breadcrumb>
                  <BreadcrumbList className="text-2xl">
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        onClick={() => navigate(breadcrumbInfo.path)}
                        className="cursor-pointer text-2xl font-bold text-gray-900"
                      >
                        {breadcrumbInfo.section}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="[&>svg]:size-6" />
                    <BreadcrumbItem>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) =>
                            setFormData({ ...formData, title: e.target.value })
                          }
                          className="text-2xl font-bold text-gray-900 border border-gray-300 rounded-md px-2 py-1 bg-white"
                          placeholder="Project title..."
                        />
                      ) : (
                        <BreadcrumbPage className="flex text-2xl h-10 items-center font-bold text-gray-900">
                          {bid.title}
                        </BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>

                {/* Status Badge */}
                {isEditing ? (
                  <div className="relative">
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    >
                      {BID_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <StatusBadge
                      status={formData.status}
                      variant="badge"
                      className="w-32 cursor-pointer"
                    />
                  </div>
                ) : (
                  <StatusBadge
                    status={bid.status}
                    variant="badge"
                    className="w-32"
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {/* Edit Project Button - hide when vendors selected or editing */}
                {selectedVendorIds.length === 0 && !isEditing && (
                  <button
                    onClick={handleEditProject}
                    className="inline-flex items-center px-4 h-10 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PencilSquareIcon className="w-5 h-5 mr-2" />
                    Edit Project
                  </button>
                )}

                {/* State Action Buttons - context dependent based on current project state */}
                {selectedVendorIds.length === 0 && !isEditing && (
                  <>
                    {/* Active Project Buttons */}
                    {isActive && (
                      <>
                        <button
                          onClick={handleMoveToOnHold}
                          className="inline-flex items-center px-4 h-10 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                        >
                          <PauseCircleIcon className="w-5 h-5 mr-2" />
                          Move to On-Hold
                        </button>
                        <button
                          onClick={handleArchiveProject}
                          className="inline-flex items-center px-4 h-10 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                        >
                          <ArchiveBoxIcon className="w-5 h-5 mr-2" />
                          Move to Archive
                        </button>
                      </>
                    )}

                    {/* On-Hold Project Buttons */}
                    {isOnHold && (
                      <>
                        <button
                          onClick={handleMoveToActive}
                          className="inline-flex items-center px-4 h-10 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <PlayIcon className="w-5 h-5 mr-2" />
                          Move to Active
                        </button>
                        <button
                          onClick={handleArchiveProject}
                          className="inline-flex items-center px-4 h-10 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                        >
                          <ArchiveBoxIcon className="w-5 h-5 mr-2" />
                          Move to Archive
                        </button>
                      </>
                    )}

                    {/* Archived Project Buttons */}
                    {isArchived && (
                      <>
                        <button
                          onClick={handleMoveToActive}
                          className="inline-flex items-center px-4 h-10 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <PlayIcon className="w-5 h-5 mr-2" />
                          Move to Active
                        </button>
                        <button
                          onClick={handleMoveToOnHold}
                          className="inline-flex items-center px-4 h-10 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                        >
                          <PauseCircleIcon className="w-5 h-5 mr-2" />
                          Move to On-Hold
                        </button>
                      </>
                    )}
                  </>
                )}

                {/* Save and Cancel Buttons - show when editing */}
                {selectedVendorIds.length === 0 && isEditing && (
                  <>
                    <button
                      onClick={handleSave}
                      className="inline-flex items-center px-4 h-10 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <CheckIcon className="w-5 h-5 mr-2" />
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancel}
                      className="inline-flex items-center px-4 h-10 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      <XMarkIcon className="w-5 h-5 mr-2" />
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Full-width line */}
            <div className="border-b border-gray-200"></div>
          </div>

          <div className="px-6 py-4">
            {/* Project Info Section */}
            <div className="mb-4">
              {/* Project Info Cards Flex Layout */}
              <div className="flex gap-4 mb-4">
                {/* Project Details Card - Address, GC, File Location */}
                <div className="bg-gray-50 rounded-lg p-4 border flex-1 border-gray-200 flex-grow">
                  <div className="space-y-3 text-md">
                    <div>
                      <span className="text-gray-600 block mb-1">Address:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.project_address}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              project_address: e.target.value,
                            })
                          }
                          className="border border-gray-300 rounded px-2 py-1 text-lg w-full"
                          placeholder="Project address..."
                        />
                      ) : (
                        <span className="text-gray-900 text-lg font-medium">
                          {bid.project_address || "Not specified"}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-600 block mb-1">
                        General Contractor:
                      </span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.general_contractor}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              general_contractor: e.target.value,
                            })
                          }
                          className="border border-gray-300 rounded px-2 py-1 text-lg w-full"
                          placeholder="General contractor..."
                        />
                      ) : (
                        <span className="text-gray-900 text-lg font-medium">
                          {bid.general_contractor || "Not assigned"}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-600 block mb-1">
                        File Location:
                      </span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.file_location}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              file_location: e.target.value,
                            })
                          }
                          className="border border-gray-300 rounded px-2 py-1 text-lg w-full"
                          placeholder="File location..."
                        />
                      ) : (
                        <span className="text-gray-900 text-lg font-medium">
                          {bid.file_location || "Not specified"}
                        </span>
                      )}
                    </div>

                    {/* Project Description */}
                    {(bid.project_description || isEditing) && (
                      <div>
                        <span className="text-gray-600 block mb-1">
                          Description:
                        </span>
                        {isEditing ? (
                          <textarea
                            value={formData.project_description}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                project_description: e.target.value,
                              })
                            }
                            className="border border-gray-300 rounded px-2 py-1 text-lg w-full"
                            rows={3}
                            placeholder="Enter project description..."
                          />
                        ) : (
                          <span className="text-gray-900 text-lg font-medium">
                            {bid.project_description}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Due Date and Vendor Costs */}
                <div className="flex flex-1 flex-col gap-4 w-64">
                  {/* Due Date Card */}
                  <div className="bg-yellow-50 rounded-lg p-4 border border-blue-200 flex flex-col items-center justify-center text-center h-[50%]">
                    <div className="text-yellow-600 text-md font-medium">
                      Due Date
                    </div>
                    <div className="text-3xl font-bold text-yellow-700 mb-1">
                      {isEditing ? (
                        <input
                          type="date"
                          value={formData.due_date}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              due_date: e.target.value,
                            })
                          }
                          className="border border-gray-300 rounded px-2 py-1 w-full text-center text-lg"
                        />
                      ) : (
                        formatDate(bid.due_date)
                      )}
                    </div>
                  </div>

                  {/* Vendor Costs Summary Card */}
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200 flex flex-col items-center justify-center text-center h-[50%]">
                    <div className="text-3xl font-bold text-green-700 mb-2">
                      {(() => {
                        const totalVendorCosts = projectVendors
                          .filter(
                            (bv) =>
                              bv.cost_amount !== null &&
                              bv.cost_amount !== undefined
                          )
                          .reduce((sum, bv) => sum + parseFloat(String(bv.cost_amount || 0)), 0);

                        return new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(totalVendorCosts);
                      })()}
                    </div>
                    <div className="text-green-600 text-md font-medium">
                      {(() => {
                        const respondedVendors = projectVendors.filter(
                          (bv) =>
                            bv.response_received_date !== null ||
                            (bv.cost_amount !== null &&
                              bv.cost_amount !== undefined)
                        ).length;
                        const totalVendors = projectVendors.length;
                        return `${respondedVendors}/${totalVendors} responses`;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabbed Interface */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {/* Tab Navigation */}
              <div className="border-b border-gray-200">
                <div className="flex justify-between items-center px-6">
                  <nav className="flex space-x-8">
                    {[
                      {
                        id: "vendors",
                        label: "Vendors",
                        count: projectVendors.length,
                      },
                      {
                        id: "notes",
                        label: "Notes",
                        count: filteredProjectNotes.length,
                      },
                      { id: "timeline", label: "Timeline", count: null },
                      { id: "documents", label: "Documents", count: null },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                          activeTab === tab.id
                            ? "border-[#d4af37] text-[#d4af37]"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {tab.label}
                        {tab.count !== null && (
                          <span
                            className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                              activeTab === tab.id
                                ? "bg-[#d4af37] text-white"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </nav>

                  {/* Tab-specific Action Buttons */}
                  <div className="flex gap-2 py-2">
                    {activeTab === "vendors" && (
                      <>
                        {selectedVendorIds.length === 0 ? (
                          <>
                            <button
                              onClick={handleAddVendor}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              <UserPlusIcon className="w-4 h-4 mr-1" />
                              Add Vendor
                            </button>
                            <button
                              onClick={handleAddNote}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              <PencilIcon className="w-4 h-4 mr-1" />
                              Add Note
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={handleSidebarRemoveVendors}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <TrashIcon className="w-4 h-4 mr-1" />
                            Remove Selected ({selectedVendorIds.length})
                          </button>
                        )}
                      </>
                    )}

                    {activeTab === "notes" && (
                      <button
                        onClick={handleAddNote}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <PencilIcon className="w-4 h-4 mr-1" />
                        Add Note
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tab Content */}
              <div className="min-h-96">
                {activeTab === "vendors" && (
                  <div className="p-6">
                    <VendorTable
                      projectVendors={projectVendors}
                      getVendorById={getVendorById}
                      onEdit={handleEditVendor}
                      hideActions={true}
                      onSelectionChange={handleVendorSelectionChange}
                    />
                  </div>
                )}

                {activeTab === "notes" && (
                  <div className="p-6">
                    {currentUser && (
                      <ProjectNotes
                        bid={bid}
                        users={users}
                        projectNotes={filteredProjectNotes}
                        setProjectNotes={() => {}} // Read-only for now, notes updated via real-time
                      />
                    )}
                    {!currentUser && (
                      <div className="text-center py-12">
                        <p className="text-gray-500">Loading notes...</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "timeline" && (
                  <div className="p-6">
                    <div className="text-center py-12">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <h3 className="mt-4 text-sm font-medium text-gray-900">
                        Timeline Coming Soon
                      </h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Project timeline and activity log will be available
                        here.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === "documents" && (
                  <div className="p-6">
                    <div className="text-center py-12">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <h3 className="mt-4 text-sm font-medium text-gray-900">
                        Documents Coming Soon
                      </h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Project documents and file attachments will be available
                        here.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              {/* Delete Button - hide when vendors selected */}
              {selectedVendorIds.length === 0 && (
                <button
                  onClick={handleDeleteProject}
                  className="inline-flex items-center px-4 h-10 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <TrashIcon className="w-5 h-5 mr-2" />
                  Delete This Bid / Cannot Be Undone
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Archive Confirmation Modal */}
      <AlertDialog
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onConfirm={confirmArchiveProject}
        title="Archive Project"
        message="Are you sure you want to archive this project? Archived projects can be restored later from the Archives page."
        confirmText="Archive Project"
        cancelText="Cancel"
        variant="warning"
      />

      {/* Delete Confirmation Modal */}
      <AlertDialog
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteProject}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone."
        confirmText="Delete Project"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Remove Vendors Confirmation Modal */}
      <AlertDialog
        isOpen={showRemoveVendorsModal}
        onClose={() => {
          setShowRemoveVendorsModal(false);
          setVendorsToRemove([]);
        }}
        onConfirm={confirmRemoveVendors}
        title="Remove Vendors"
        message={`Are you sure you want to remove ${
          vendorsToRemove.length
        } vendor${vendorsToRemove.length === 1 ? "" : "s"} from this project?`}
        confirmText="Remove Vendors"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Add/Edit Vendor Modal */}
      <AddVendorToProjectModal
        isOpen={showVendorModal}
        onClose={() => {
          setShowVendorModal(false);
          setEditingBidVendor(null);
        }}
        onSave={handleSaveVendor}
        vendors={vendors}
        existingVendorData={editingBidVendor}
        getVendorById={getVendorById}
        isLoading={isVendorLoading}
      />

      {/* Add Note Modal */}
      <AddNoteModal
        isOpen={showAddNoteModal}
        onClose={() => setShowAddNoteModal(false)}
        onAddNote={handleAddNoteSubmit}
      />
    </div>
  );
};

export default ProjectDetail;
