import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type {
  Bid,
  User,
  Vendor,
  BidVendor,
  ProjectNote,
} from "../../../../shared/types";
import Sidebar from "../../../../shared/components/ui/Sidebar";
import AlertDialog from "../../../../shared/components/ui/AlertDialog";
import APMVendorTable from "../VendorManagement/APMVendorTable";
import APMAddVendorToProjectModal from "../modals/APMAddVendorToProjectModal";
import AddNoteModal from "../../../../shared/components/modals/AddNoteModal";
import ProjectNotes from "../../../../shared/components/modals/ProjectNotes";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "../../../../shared/components/ui/breadcrumb";
import { dbOperations, supabase } from "../../../../shared/services/supabase";
// Real-time updates handled by AppContent
import {
  getCurrentPhasesWithSoonestFollowUp,
  getVendorFollowUpUrgency,
  getPhaseFollowUpDate,
} from "../../../../shared/utils/phaseFollowUpUtils";
import {
  UserPlusIcon,
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
import { Checkbox } from "../../../../shared/components/ui/checkbox";

interface APMProjectDetailProps {
  bid: Bid;
  bidVendors: BidVendor[];
  projectNotes: ProjectNote[];
  vendors: Vendor[];
  users: User[];
  onUpdateBid: (bidId: number, updatedBid: Partial<Bid>) => Promise<void>;
  onDeleteBid: (bidId: number) => Promise<void>;
  onUpdateBidVendor: (
    bidVendorId: number,
    vendorData: Partial<BidVendor>
  ) => Promise<void>;
}

const APMProjectDetail: React.FC<APMProjectDetailProps> = ({
  bid,
  bidVendors,
  projectNotes,
  vendors,
  users,
  onUpdateBid,
  onDeleteBid,
  onUpdateBidVendor,
}) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
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

  // State that's still needed
  const [error, setError] = useState<string | null>(null);
  // const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Filter bid vendors for this specific project
  const projectVendors = bidVendors.filter((bv) => bv.bid_id === bid.id);
  // Filter project notes for this specific project
  const filteredProjectNotes = projectNotes.filter(
    (note) => note.bid_id === bid.id
  );

  // Set current user from users prop
  useEffect(() => {
    setCurrentUser(users[0] || null);
  }, [users]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Sidebar state
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  // Tab state for bottom panel
  const [activeTab, setActiveTab] = useState("vendors");

  // Vendor selection state for APM vendor table
  const [selectedVendorIds, setSelectedVendorIds] = useState<Set<number>>(
    new Set()
  );

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
    gc_system: bid.gc_system,
    added_to_procore: bid.added_to_procore,
  });

  // Data is now provided via props from AppContent - no local loading needed

  // Set up real-time subscriptions for bid_vendors changes
  useEffect(() => {
    const channel = supabase
      .channel("apm_project_detail_bid_vendors")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bid_vendors",
          filter: `bid_id=eq.${bid.id}`,
        },
        () => {
          // Since we're receiving bid_vendors via props, the parent component
          // should handle the real-time updates. This subscription ensures
          // immediate feedback for any changes made within this component.
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_notes",
          filter: `bid_id=eq.${bid.id}`,
        },
        () => {}
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [bid.id]);

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
      gc_system: bid.gc_system,
      added_to_procore: bid.added_to_procore,
    });
  }, [bid]);

  const handleSave = async () => {
    try {
      // Convert empty strings to null for UUID fields and other fields that require null
      const dataToSave = {
        ...formData,
        created_by: formData.created_by || null,
        assign_to: formData.assign_to || null,
        // Ensure proper formatting for new fields
        gc_system: formData.gc_system || null,
        added_to_procore: Boolean(formData.added_to_procore),
      };
      await onUpdateBid(bid.id, dataToSave);
      setIsEditing(false);
    } catch (error) {
      console.error("Save error:", error);
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
      gc_system: bid.gc_system,
      added_to_procore: bid.added_to_procore,
    });
    setIsEditing(false);
  };

  // Vendor modal handlers
  const handleAddVendor = () => {
    setEditingBidVendor(null);
    setShowVendorModal(true);
  };

  const handleSaveVendor = async (
    vendorData: Omit<BidVendor, "id" | "bid_id">
  ) => {
    setIsVendorLoading(true);
    try {
      if (editingBidVendor) {
        // Update existing bid vendor
        await dbOperations.updateBidVendor(editingBidVendor.id, vendorData);
      } else {
        // Add new bid vendor
        await dbOperations.addVendorToBid(bid.id, vendorData);
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

  // APM Vendor management handlers
  const handleAPMVendorUpdate = async (
    vendorId: number,
    updates: Partial<BidVendor>
  ) => {
    try {
      await onUpdateBidVendor(vendorId, updates);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update vendor workflow"
      );
    }
  };

  const handleVendorSelectionChange = (vendorId: number, selected: boolean) => {
    const newSelection = new Set(selectedVendorIds);
    if (selected) {
      newSelection.add(vendorId);
    } else {
      newSelection.delete(vendorId);
    }
    setSelectedVendorIds(newSelection);
  };

  const handleBulkVendorSelection = (
    vendorIds: number[],
    selected: boolean
  ) => {
    setSelectedVendorIds((prevSelected) => {
      const newSelection = new Set(prevSelected);
      vendorIds.forEach((vendorId) => {
        if (selected) {
          newSelection.add(vendorId);
        } else {
          newSelection.delete(vendorId);
        }
      });
      return newSelection;
    });
  };

  const confirmRemoveVendors = async () => {
    try {
      setIsVendorLoading(true);

      // Convert vendor IDs to bid_vendor IDs
      const bidVendorIds = projectVendors
        .filter((bv) => vendorsToRemove.includes(bv.vendor_id))
        .map((bv) => bv.id);

      // Remove vendors one by one using the existing operation
      await Promise.all(
        bidVendorIds.map((id) => dbOperations.removeVendorFromBid(id))
      );

      // Removal will be reflected via real-time updates from AppContent

      // Close modal and reset state
      setShowRemoveVendorsModal(false);
      setVendorsToRemove([]);
      setSelectedVendorIds(new Set());
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
      navigate("/apm/projects");
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

      // Use onUpdateBid to update both database and local state - APM Archive
      await onUpdateBid(bid.id, {
        apm_archived: true,
        apm_archived_at: new Date().toISOString(),
      });

      navigate("/apm/projects");
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

      // Use onUpdateBid to update both database and local state - APM On Hold
      await onUpdateBid(bid.id, {
        apm_on_hold: true,
        apm_on_hold_at: new Date().toISOString(),
      });

      navigate("/apm/projects");
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

      // Use onUpdateBid to update both database and local state - APM Active
      await onUpdateBid(bid.id, {
        apm_on_hold: false,
        apm_on_hold_at: null,
        apm_archived: false,
        apm_archived_at: null,
      });

      navigate("/apm/projects");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to move project to active"
      );
    }
  };

  const isLoading = false; // Data comes from props

  // Helper functions to determine APM project state
  const isAPMActive = bid.sent_to_apm && !bid.apm_archived && !bid.apm_on_hold;
  const isAPMOnHold = bid.sent_to_apm && bid.apm_on_hold && !bid.apm_archived;
  const isAPMArchived = bid.sent_to_apm && bid.apm_archived;

  // Get breadcrumb information based on APM project state
  const getBreadcrumbInfo = () => {
    if (isAPMActive) {
      return {
        section: "APM Projects",
        path: "/apm/projects",
      };
    } else if (isAPMOnHold) {
      return {
        section: "APM On-Hold",
        path: "/apm/on-hold",
      };
    } else if (isAPMArchived) {
      return {
        section: "APM Archives",
        path: "/apm/archives",
      };
    }
    return {
      section: "APM Projects", // fallback
      path: "/apm/projects",
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
              <p className="text-gray-600">Loading APM project details...</p>
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
                      <BreadcrumbPage className="flex text-2xl h-10 items-center font-bold text-gray-900">
                        {bid.title}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {/* Edit Project Button - hide when vendors selected or editing */}
                {selectedVendorIds.size === 0 && !isEditing && (
                  <button
                    onClick={handleEditProject}
                    className="inline-flex items-center px-4 h-10 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PencilSquareIcon className="w-5 h-5 mr-2" />
                    Edit Project
                  </button>
                )}

                {/* APM State Action Buttons - context dependent based on current APM project state */}
                {selectedVendorIds.size === 0 && !isEditing && (
                  <>
                    {/* APM Active Project Actions */}
                    {isAPMActive && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="inline-flex items-center px-4 h-10 border border-gray-300 text-sm font-medium rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Actions
                            <ChevronDownIcon className="w-4 h-4 ml-2" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={handleMoveToOnHold}
                            className="cursor-pointer"
                          >
                            <PauseCircleIcon className="w-4 h-4 mr-2" />
                            Move to Closeouts
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={handleArchiveProject}
                            className="cursor-pointer"
                          >
                            <ArchiveBoxIcon className="w-4 h-4 mr-2" />
                            Move to Completed
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={handleDeleteProject}
                            className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <TrashIcon className="w-4 h-4 mr-2" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {/* APM On-Hold Project Actions */}
                    {isAPMOnHold && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="inline-flex items-center px-4 h-10 border border-gray-300 text-sm font-medium rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Actions
                            <ChevronDownIcon className="w-4 h-4 ml-2" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={handleMoveToActive}
                            className="cursor-pointer"
                          >
                            <PlayIcon className="w-4 h-4 mr-2" />
                            Move to Active
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={handleArchiveProject}
                            className="cursor-pointer"
                          >
                            <ArchiveBoxIcon className="w-4 h-4 mr-2" />
                            Move to Completed
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={handleDeleteProject}
                            className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <TrashIcon className="w-4 h-4 mr-2" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {/* APM Archived Project Actions */}
                    {isAPMArchived && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="inline-flex items-center px-4 h-10 border border-gray-300 text-sm font-medium rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Actions
                            <ChevronDownIcon className="w-4 h-4 ml-2" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={handleMoveToActive}
                            className="cursor-pointer"
                          >
                            <PlayIcon className="w-4 h-4 mr-2" />
                            Move to Active
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={handleMoveToOnHold}
                            className="cursor-pointer"
                          >
                            <PauseCircleIcon className="w-4 h-4 mr-2" />
                            Move to Closeouts
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={handleDeleteProject}
                            className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <TrashIcon className="w-4 h-4 mr-2" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </>
                )}

                {/* Save and Cancel Buttons - show when editing */}
                {selectedVendorIds.size === 0 && isEditing && (
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
            {/* Flattened Project Info Header */}
            <div className="mb-4 space-y-4">
              {/* Project Name */}
              <div>
                <span className="text-gray-600 text-sm font-medium">
                  Project Details:
                </span>
                <div className="text-2xl font-bold text-gray-900 mt-1">
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
                      className="border border-gray-300 rounded px-2 py-1 text-2xl w-full"
                      placeholder="Project name..."
                    />
                  ) : (
                    <span>{bid.project_name}</span>
                  )}
                </div>
                <div>
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
                      {bid.project_address || "Address Not Specified"}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-gray-600 text-lg font-medium">
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
                    <span className="text-gray-900 font-medium text-lg ml-2">
                      {bid.general_contractor || "Not assigned"}
                    </span>
                  )}
                </div>

                {/* GC System and Procore Status */}
                <div className="mt-2 space-y-1">
                  {/* GC System */}
                  <div>
                    <span className="text-gray-600 text-sm font-medium">
                      GC System:{" "}
                    </span>
                    {isEditing ? (
                      <select
                        value={formData.gc_system || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({
                            ...formData,
                            gc_system:
                              value === ""
                                ? null
                                : (value as
                                    | "Procore"
                                    | "AutoDesk"
                                    | "Email"
                                    | "Other"),
                          });
                        }}
                        className="border border-gray-300 rounded px-2 py-1 text-sm ml-1"
                      >
                        <option value="">Select system type</option>
                        <option value="Procore">Procore</option>
                        <option value="AutoDesk">AutoDesk</option>
                        <option value="Email">Email</option>
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      <>
                        {bid.gc_system === "Procore" && (
                          <span className="text-blue-600 text-sm font-medium">
                            Procore
                          </span>
                        )}
                        {bid.gc_system === "AutoDesk" && (
                          <span className="text-purple-600 text-sm font-medium">
                            AutoDesk
                          </span>
                        )}
                        {bid.gc_system === "Email" && (
                          <span className="text-green-600 text-sm font-medium">
                            Email
                          </span>
                        )}
                        {bid.gc_system === "Other" && (
                          <span className="text-gray-600 text-sm font-medium">
                            Other
                          </span>
                        )}
                        {!bid.gc_system && (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Procore Status */}
                  <div className="flex items-center">
                    <span className="text-gray-600 text-sm font-medium">
                      Procore Status:{" "}
                    </span>
                    {isEditing ? (
                      <div className="flex items-center ml-2">
                        <Checkbox
                          checked={formData.added_to_procore || false}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              added_to_procore: checked === true,
                            })
                          }
                        />
                        <span className="ml-2 text-sm text-gray-600">
                          Added to Procore
                        </span>
                      </div>
                    ) : (
                      <>
                        {bid.added_to_procore ? (
                          <span className="text-green-600 text-sm font-medium ml-1">
                            Added to Procore
                          </span>
                        ) : (
                          <span className="text-red-600 text-sm font-medium ml-1">
                            Not in Procore
                          </span>
                        )}
                      </>
                    )}
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

            {/* Three Workflow Progress Cards */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* Card 1: Overall Progress */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-blue-600 text-sm font-medium mb-2">
                  Overall Progress
                </div>
                <div className="text-2xl font-bold text-blue-700 mb-2">
                  {(() => {
                    const completedVendors = projectVendors.filter(
                      (vendor) => vendor.closeout_received_date !== null
                    ).length;
                    const totalVendors = projectVendors.length;
                    const percentage =
                      totalVendors > 0
                        ? Math.round((completedVendors / totalVendors) * 100)
                        : 0;
                    return `${percentage}%`;
                  })()}
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 mb-1">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${(() => {
                        const completedVendors = projectVendors.filter(
                          (vendor) => vendor.closeout_received_date !== null
                        ).length;
                        const totalVendors = projectVendors.length;
                        return totalVendors > 0
                          ? (completedVendors / totalVendors) * 100
                          : 0;
                      })()}%`,
                    }}
                  ></div>
                </div>
                <div className="text-blue-600 text-xs">
                  {(() => {
                    const completedVendors = projectVendors.filter(
                      (vendor) => vendor.closeout_received_date !== null
                    ).length;
                    const totalVendors = projectVendors.length;
                    return `${completedVendors}/${totalVendors} vendors completed`;
                  })()}
                </div>
              </div>

              {/* Card 2: Critical Follow-ups */}
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <div className="text-amber-600 text-sm font-medium mb-2">
                  Critical Follow-ups
                </div>
                <div className="text-2xl font-bold text-amber-700 mb-2">
                  {(() => {
                    // Count vendors by urgency level using same rules as vendor table
                    let overdueCount = 0;
                    let dueTodayCount = 0;
                    let dueSoonCount = 0;

                    projectVendors.forEach((vendor) => {
                      if (vendor.closeout_received_date) return; // Skip completed vendors

                      const urgency = getVendorFollowUpUrgency(vendor);
                      if (urgency.level === "overdue") {
                        overdueCount++;
                      } else if (urgency.level === "due_today") {
                        dueTodayCount++;
                      } else if (urgency.level === "critical") {
                        dueSoonCount++; // 1-3 business days = "due soon"
                      }
                    });

                    const totalUrgent =
                      overdueCount + dueTodayCount + dueSoonCount;
                    return totalUrgent;
                  })()}
                </div>
                <div className="text-amber-600 text-xs">
                  {(() => {
                    // Show breakdown with clear business terminology
                    let overdueCount = 0;
                    let dueTodayCount = 0;
                    let dueSoonCount = 0;

                    projectVendors.forEach((vendor) => {
                      if (vendor.closeout_received_date) return; // Skip completed vendors

                      const urgency = getVendorFollowUpUrgency(vendor);
                      if (urgency.level === "overdue") {
                        overdueCount++;
                      } else if (urgency.level === "due_today") {
                        dueTodayCount++;
                      } else if (urgency.level === "critical") {
                        dueSoonCount++; // 1-3 business days = "due soon"
                      }
                    });

                    const parts = [];
                    if (overdueCount > 0) parts.push(`${overdueCount} overdue`);
                    if (dueTodayCount > 0)
                      parts.push(`${dueTodayCount} due today`);
                    if (dueSoonCount > 0)
                      parts.push(`${dueSoonCount} due within 4 days`);

                    return parts.length > 0
                      ? parts.join(", ")
                      : "No urgent follow-ups";
                  })()}
                </div>
              </div>

              {/* Card 3: Upcoming Deadlines */}
              {(() => {
                // Determine urgency level for card styling
                const soonestUrgency = (() => {
                  let mostUrgent = "normal";

                  projectVendors.forEach((vendor) => {
                    if (vendor.closeout_received_date) return; // Skip completed vendors

                    const urgency = getVendorFollowUpUrgency(vendor);
                    if (
                      urgency.level === "overdue" ||
                      urgency.level === "due_today"
                    ) {
                      mostUrgent = "red";
                    } else if (
                      urgency.level === "critical" &&
                      mostUrgent === "normal"
                    ) {
                      mostUrgent = "orange";
                    }
                  });

                  return mostUrgent;
                })();

                // Set card colors based on urgency
                const cardClasses =
                  soonestUrgency === "red"
                    ? "bg-red-50 rounded-lg p-4 border border-red-200"
                    : soonestUrgency === "orange"
                    ? "bg-orange-50 rounded-lg p-4 border border-orange-200"
                    : "bg-green-50 rounded-lg p-4 border border-green-200";

                const titleClasses =
                  soonestUrgency === "red"
                    ? "text-red-600 text-sm font-medium mb-2"
                    : soonestUrgency === "orange"
                    ? "text-orange-600 text-sm font-medium mb-2"
                    : "text-green-600 text-sm font-medium mb-2";

                const valueClasses =
                  soonestUrgency === "red"
                    ? "text-2xl font-bold text-red-700 mb-2"
                    : soonestUrgency === "orange"
                    ? "text-2xl font-bold text-orange-700 mb-2"
                    : "text-2xl font-bold text-green-700 mb-2";

                const subtitleClasses =
                  soonestUrgency === "red"
                    ? "text-red-600 text-xs"
                    : soonestUrgency === "orange"
                    ? "text-orange-600 text-xs"
                    : "text-green-600 text-xs";

                return (
                  <div className={cardClasses}>
                    <div className={titleClasses}>Next Deadline</div>
                    <div className={valueClasses}>
                      {(() => {
                        // Get the soonest deadline using exact same logic as vendor table NEXT FOLLOW-UP column
                        const allFollowUpDates: string[] = [];

                        projectVendors.forEach((vendor) => {
                          if (vendor.closeout_received_date) return; // Skip completed vendors

                          // Use EXACT same logic as vendor table "Next Follow-up" column
                          const { soonestDate } =
                            getCurrentPhasesWithSoonestFollowUp(vendor);
                          let followUpDate = soonestDate;

                          // Fallback to getPhaseFollowUpDate if no soonest date (same as table)
                          if (!followUpDate) {
                            followUpDate = getPhaseFollowUpDate(vendor);
                          }

                          if (followUpDate) {
                            allFollowUpDates.push(followUpDate);
                          }
                        });

                        if (allFollowUpDates.length === 0) {
                          return "None scheduled";
                        }

                        // Find the earliest date using safe date comparison (avoiding timezone issues)
                        const earliestDateStr = allFollowUpDates.sort(
                          (a, b) => {
                            // Parse dates safely without timezone conversion
                            const parseDate = (dateString: string) => {
                              const dateOnly = dateString.includes("T")
                                ? dateString.split("T")[0]
                                : dateString;
                              const [year, month, day] = dateOnly
                                .split("-")
                                .map(Number);
                              return new Date(year, month - 1, day);
                            };
                            return (
                              parseDate(a).getTime() - parseDate(b).getTime()
                            );
                          }
                        )[0];

                        // Format the date safely (same approach as vendor table)
                        const formatDateSafe = (dateString: string): string => {
                          const dateOnly = dateString.includes("T")
                            ? dateString.split("T")[0]
                            : dateString;
                          const [year, month, day] = dateOnly
                            .split("-")
                            .map(Number);
                          const localDate = new Date(year, month - 1, day);
                          return localDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          });
                        };

                        return formatDateSafe(earliestDateStr);
                      })()}
                    </div>
                    <div className={subtitleClasses}>
                      {(() => {
                        // Get phase and vendor info for the earliest deadline
                        const allFollowUpDates: string[] = [];

                        projectVendors.forEach((vendor) => {
                          if (vendor.closeout_received_date) return;
                          const { soonestDate } =
                            getCurrentPhasesWithSoonestFollowUp(vendor);
                          if (soonestDate) {
                            allFollowUpDates.push(soonestDate);
                          }
                        });

                        if (allFollowUpDates.length === 0) {
                          return "No deadlines upcoming";
                        }

                        // Find the earliest date
                        const earliestDateStr = allFollowUpDates.sort(
                          (a, b) =>
                            new Date(a).getTime() - new Date(b).getTime()
                        )[0];

                        // Count vendors and phases for that earliest date
                        const vendorsWithEarliestDate: {
                          vendor: BidVendor;
                          phases: { displayName: string }[];
                        }[] = [];

                        projectVendors.forEach((vendor) => {
                          if (vendor.closeout_received_date) return;
                          const { soonestDate, phases } =
                            getCurrentPhasesWithSoonestFollowUp(vendor);
                          if (
                            soonestDate === earliestDateStr &&
                            phases.length > 0
                          ) {
                            vendorsWithEarliestDate.push({ vendor, phases });
                          }
                        });

                        if (vendorsWithEarliestDate.length === 0) {
                          return "No deadlines upcoming";
                        }

                        // Collect unique phase names for the earliest date
                        const phaseNames = new Set<string>();
                        vendorsWithEarliestDate.forEach(({ phases }) => {
                          phases.forEach((phase) =>
                            phaseNames.add(phase.displayName)
                          );
                        });

                        const phaseText = Array.from(phaseNames).join(", ");
                        return `${phaseText} (${vendorsWithEarliestDate.length} vendors)`;
                      })()}
                    </div>
                  </div>
                );
              })()}
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
                        {selectedVendorIds.size === 0 ? (
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
                              <PencilSquareIcon className="w-4 h-4 mr-1" />
                              Add Note
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() =>
                              handleRemoveVendors(Array.from(selectedVendorIds))
                            }
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <TrashIcon className="w-4 h-4 mr-1" />
                            Remove Selected ({selectedVendorIds.size})
                          </button>
                        )}
                      </>
                    )}

                    {activeTab === "notes" && (
                      <button
                        onClick={handleAddNote}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <PencilSquareIcon className="w-4 h-4 mr-1" />
                        Add Note
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tab Content */}
              <div className="min-h-96">
                {activeTab === "vendors" && (
                  <APMVendorTable
                    bidVendors={projectVendors}
                    vendors={vendors}
                    bids={[bid]}
                    users={users}
                    onUpdateVendor={handleAPMVendorUpdate}
                    selectedVendors={selectedVendorIds}
                    onVendorSelect={handleVendorSelectionChange}
                    onBulkVendorSelect={handleBulkVendorSelection}
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
        title="Archive APM Project"
        message="Are you sure you want to archive this APM project? Archived projects can be restored later from the APM Archives page."
        confirmText="Archive Project"
        cancelText="Cancel"
        variant="warning"
      />

      {/* Delete Confirmation Modal */}
      <AlertDialog
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteProject}
        title="Delete APM Project"
        message="Are you sure you want to delete this APM project? This action cannot be undone."
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
        } vendor${
          vendorsToRemove.length === 1 ? "" : "s"
        } from this APM project?`}
        confirmText="Remove Vendors"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Add/Edit Vendor Modal */}
      <APMAddVendorToProjectModal
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

export default APMProjectDetail;
