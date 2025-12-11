import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type {
  Bid,
  User,
  ProjectNote,
  Vendor,
  BidVendor,
} from "../../../../shared/types";
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
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../../shared/components/ui/dropdown-menu";

interface ProjectDetailProps {
  bid: Bid;
  bidVendors: BidVendor[];
  projectNotes: ProjectNote[];
  vendors: Vendor[];
  users: User[];
  onUpdateBid: (bidId: number, updatedBid: Partial<Bid>) => Promise<void>;
  onDeleteBid: (bidId: number) => Promise<void>;
  onAddBidVendor: (
    bidId: number,
    vendorData: Omit<BidVendor, "id" | "bid_id">
  ) => Promise<void>;
  onUpdateBidVendor: (
    bidVendorId: number,
    vendorData: Partial<BidVendor>
  ) => Promise<void>;
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
  const projectVendors = bidVendors.filter((bv) => bv.bid_id === bid.id);
  const filteredProjectNotes = projectNotes.filter(
    (note) => note.bid_id === bid.id
  );
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
        path: "/",
      };
    } else if (isOnHold) {
      return {
        section: "Bids on Hold",
        path: "/on-hold",
      };
    } else if (isArchived) {
      return {
        section: "Archived Bids",
        path: "/archives",
      };
    }
    return {
      section: "Active Bids", // fallback
      path: "/",
    };
  };

  const breadcrumbInfo = getBreadcrumbInfo();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100">
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
    <div className="min-h-screen bg-slate-100">
      <div className="flex h-screen">
        <Sidebar
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          showViewToggle={true}
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
          <div className="bg-slate-100">
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
                    {/* Active Project Actions */}
                    {isActive && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="inline-flex items-center px-4 h-10 border border-gray-300 text-sm font-medium rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Actions
                            <ChevronDownIcon className="w-4 h-4 ml-2" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={handleMoveToOnHold} className="cursor-pointer">
                            <PauseCircleIcon className="w-4 h-4 mr-2" />
                            Move to On-Hold
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleArchiveProject} className="cursor-pointer">
                            <ArchiveBoxIcon className="w-4 h-4 mr-2" />
                            Move to Completed
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={handleDeleteProject} className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50">
                            <TrashIcon className="w-4 h-4 mr-2" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {/* On-Hold Project Actions */}
                    {isOnHold && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="inline-flex items-center px-4 h-10 border border-gray-300 text-sm font-medium rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Actions
                            <ChevronDownIcon className="w-4 h-4 ml-2" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={handleMoveToActive} className="cursor-pointer">
                            <PlayIcon className="w-4 h-4 mr-2" />
                            Move to Active
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleArchiveProject} className="cursor-pointer">
                            <ArchiveBoxIcon className="w-4 h-4 mr-2" />
                            Move to Completed
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={handleDeleteProject} className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50">
                            <TrashIcon className="w-4 h-4 mr-2" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {/* Archived Project Actions */}
                    {isArchived && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="inline-flex items-center px-4 h-10 border border-gray-300 text-sm font-medium rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Actions
                            <ChevronDownIcon className="w-4 h-4 ml-2" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={handleMoveToActive} className="cursor-pointer">
                            <PlayIcon className="w-4 h-4 mr-2" />
                            Move to Active
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleMoveToOnHold} className="cursor-pointer">
                            <PauseCircleIcon className="w-4 h-4 mr-2" />
                            Move to On-Hold
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={handleDeleteProject} className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50">
                            <TrashIcon className="w-4 h-4 mr-2" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

          <div className="px-6 py-4 flex flex-col min-h-0 flex-1">
            {/* Flattened Project Info Header */}
            <div className="mb-4 space-y-4 flex-shrink-0">
              {/* Project Name */}
              <div>
                <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-2">
                  Project Details
                </span>
                <div className="text-3xl font-bold text-gray-900">
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.project_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          project_name: e.target.value,
                        })
                      }
                      className="border border-gray-300 rounded px-2 py-1 text-3xl w-full"
                      placeholder="Project name..."
                    />
                  ) : (
                    <span>{bid.project_name}</span>
                  )}
                </div>
                <div className="text-lg text-gray-700 mb-3">
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
                      className="border border-gray-300 rounded px-3 py-2 text-lg w-full"
                      placeholder="Project address..."
                    />
                  ) : (
                    <span>
                      {bid.project_address || "Address Not Specified"}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6 mt-4">
                  <div>
                    <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1">
                      General Contractor
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
                        className="border border-gray-300 rounded px-3 py-2 text-base w-full"
                        placeholder="General contractor..."
                      />
                    ) : (
                      <span className="text-gray-900 font-medium text-base block">
                        {bid.general_contractor || "Not assigned"}
                      </span>
                    )}

                    {/* File Location */}
                    <div className="mt-4">
                      <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1">
                        File Storage Location
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
                          className="border border-gray-300 rounded px-3 py-2 text-base w-full"
                          placeholder="File location..."
                        />
                      ) : (
                        <span className="text-gray-900 font-medium text-base block">
                          {bid.file_location || "Not specified"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    {/* Empty space to align with left column */}
                  </div>
                </div>
              </div>

              {/* Project Description */}
              {(bid.project_description || isEditing) && (
                <div>
                  <span className="text-gray-600 text-sm font-medium block mb-1">
                    Project Description:
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
                      className="border border-gray-300 rounded px-2 py-1 text-md w-full"
                      rows={2}
                      placeholder="Enter project description..."
                    />
                  ) : (
                    <span className="text-gray-900 text-md">
                      {bid.project_description || "No description provided."}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Two Workflow Cards */}
            <div className="grid grid-cols-2 gap-6 mb-6 flex-shrink-0">
              {/* Card 1: Due Date */}
              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <div className="text-gray-700 text-sm font-semibold mb-3 uppercase tracking-wide">
                  Due Date
                </div>
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
                    className="border border-gray-300 rounded px-3 py-2 text-base w-full"
                  />
                ) : (
                  <>
                    <div className="text-3xl font-bold text-gray-900 mb-3">
                      {formatDate(bid.due_date)}
                    </div>
                    <div className="text-gray-600 text-sm">
                      Project deadline
                    </div>
                  </>
                )}
              </div>

              {/* Card 2: Total Vendor Costs */}
              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <div className="text-gray-700 text-sm font-semibold mb-3 uppercase tracking-wide">
                  Total Vendor Costs
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-3">
                  {(() => {
                    const totalVendorCosts = projectVendors
                      .filter((bv) => bv.status == "yes bid" || bv.status == "no bid")
                      .filter(
                        (bv) =>
                          bv.cost_amount !== null &&
                          bv.cost_amount !== undefined
                      )
                      .reduce(
                        (sum, bv) =>
                          sum + parseFloat(String(bv.cost_amount || 0)),
                        0
                      );

                    return new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(totalVendorCosts);
                  })()}
                </div>
                <div className="text-gray-600 text-sm">
                  {(() => {
                    const respondedVendors = projectVendors
                      .filter((bv) => bv.status == "yes bid" || bv.status == "no bid")
                      .filter(
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

            {/* Tabbed Interface */}
            <div className="bg-white border-t border-b border-gray-300 flex flex-col -mx-6 flex-1 min-h-0">
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
                          <button
                            onClick={handleAddVendor}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <UserPlusIcon className="w-4 h-4 mr-1" />
                            Add Vendor
                          </button>
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
              <div className="flex-1 overflow-y-auto min-h-0">
                {activeTab === "vendors" && (
                    <VendorTable
                      projectVendors={projectVendors}
                      getVendorById={getVendorById}
                      onEdit={handleEditVendor}
                      onUpdateBidVendor={onUpdateBidVendor}
                      hideActions={true}
                      onSelectionChange={handleVendorSelectionChange}
                    />
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
              </div>
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
