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
import {
  dbOperations,
  realtimeManager,
} from "../../../../shared/services/supabase";
import supabase from "../../../../shared/services/supabase";
import { getCurrentPhasesWithSoonestFollowUp, getVendorFollowUpUrgency, getPhaseFollowUpDate } from "../../../../shared/utils/phaseFollowUpUtils";
import {
  UserPlusIcon,
  PencilSquareIcon,
  PauseCircleIcon,
  ArchiveBoxIcon,
  PlayIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface APMProjectDetailProps {
  bid: Bid;
  onUpdateBid: (bidId: number, updatedBid: Partial<Bid>) => Promise<void>;
  onDeleteBid: (bidId: number) => Promise<void>;
  onUpdateBidVendor: (
    bidVendorId: number,
    vendorData: Partial<BidVendor>
  ) => Promise<void>;
}

const APMProjectDetail: React.FC<APMProjectDetailProps> = ({
  bid,
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

  // Loading states
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projectVendors, setProjectVendors] = useState<BidVendor[]>([]);
  const [projectNotes, setProjectNotes] = useState<ProjectNote[]>([]);
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
  });

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);

        // Load vendors, users, notes, and project data in parallel
        const [vendorsData, usersData, notesData] = await Promise.all([
          dbOperations.getVendors(),
          dbOperations.getUsers(),
          dbOperations.getProjectNotes(bid.id),
        ]);

        setUsers(usersData);
        setCurrentUser(usersData[0] || null);
        setVendors(vendorsData);
        setProjectNotes(
          notesData.map((note) => ({
            id: note.id,
            bid_id: note.bid_id,
            user_id: note.user_id,
            content: note.content,
            created_at: note.created_at,
          }))
        );

        // Load bid vendors for this project
        const { data: bidVendorsData, error: bidVendorsError } = await supabase
          .from("bid_vendors")
          .select("*")
          .eq("bid_id", bid.id);

        if (bidVendorsError) throw bidVendorsError;
        setProjectVendors(bidVendorsData || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load project data"
        );
      } finally {
        setIsLoadingNotes(false);
        setIsLoadingVendors(false);
        setIsLoadingUsers(false);
      }
    };

    loadData();
  }, [bid.id]);

  // Set up real-time subscriptions for project-specific updates
  useEffect(() => {
    // Subscribe to project notes changes
    realtimeManager.subscribeToProjectNotes(bid.id, (payload) => {
      if (payload.eventType === "INSERT" && payload.new) {
        const newNote = payload.new as unknown as ProjectNote;
        if (newNote.id && newNote.bid_id === bid.id) {
          setProjectNotes((prev) => [newNote, ...prev]);
        }
      } else if (payload.eventType === "UPDATE" && payload.new) {
        const updatedNote = payload.new as unknown as ProjectNote;
        if (updatedNote.id) {
          setProjectNotes((prev) =>
            prev.map((note) =>
              note.id === updatedNote.id ? updatedNote : note
            )
          );
        }
      } else if (payload.eventType === "DELETE" && payload.old) {
        const deletedNote = payload.old as unknown as ProjectNote;
        if (deletedNote.id) {
          setProjectNotes((prev) =>
            prev.filter((note) => note.id !== deletedNote.id)
          );
        }
      }
    });

    // Subscribe to bid vendors changes
    realtimeManager.subscribeToBidVendors(bid.id, (payload) => {
      if (payload.eventType === "INSERT" && payload.new) {
        const newBidVendor = payload.new as unknown as BidVendor;
        if (newBidVendor.id && newBidVendor.vendor_id) {
          setProjectVendors((prev) => [...prev, newBidVendor]);
        }
      } else if (payload.eventType === "UPDATE" && payload.new) {
        const updatedBidVendor = payload.new as unknown as BidVendor;
        if (updatedBidVendor.id) {
          setProjectVendors((prev) =>
            prev.map((bv) =>
              bv.id === updatedBidVendor.id ? updatedBidVendor : bv
            )
          );
        }
      } else if (payload.eventType === "DELETE" && payload.old) {
        const deletedBidVendor = payload.old as unknown as BidVendor;
        if (deletedBidVendor.id) {
          setProjectVendors((prev) =>
            prev.filter((bv) => bv.id !== deletedBidVendor.id)
          );
        }
      }
    });

    return () => {
      realtimeManager.unsubscribe(`project_notes_${bid.id}`);
      realtimeManager.unsubscribe(`bid_vendors_${bid.id}`);
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

      // Update local state to reflect the removal
      setProjectVendors((prev) =>
        prev.filter((bv) => !vendorsToRemove.includes(bv.vendor_id))
      );

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
    if (!currentUser) return;
    await dbOperations.createProjectNote(bid.id, content, currentUser.id);
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

  const isLoading = isLoadingNotes || isLoadingVendors || isLoadingUsers;

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
      <div className="min-h-screen bg-gray-50">
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

                {/* Status Badge - Hidden for APM Projects */}
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
                    {/* APM Active Project Buttons */}
                    {isAPMActive && (
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

                    {/* APM On-Hold Project Buttons */}
                    {isAPMOnHold && (
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

                    {/* APM Archived Project Buttons */}
                    {isAPMArchived && (
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
                <span className="text-gray-600 text-sm font-medium">Project Details:</span>
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
                  <span className="text-gray-600 text-lg font-medium">General Contractor:</span>
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
            <div className="grid grid-cols-3 gap-4">
              {/* Card 1: Overall Progress */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-blue-600 text-sm font-medium mb-2">
                  Overall Progress
                </div>
                <div className="text-2xl font-bold text-blue-700 mb-2">
                  {(() => {
                    const completedVendors = projectVendors.filter(vendor => 
                      vendor.closeout_received_date !== null
                    ).length;
                    const totalVendors = projectVendors.length;
                    const percentage = totalVendors > 0 ? Math.round((completedVendors / totalVendors) * 100) : 0;
                    return `${percentage}%`;
                  })()}
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 mb-1">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{
                      width: `${(() => {
                        const completedVendors = projectVendors.filter(vendor => 
                          vendor.closeout_received_date !== null
                        ).length;
                        const totalVendors = projectVendors.length;
                        return totalVendors > 0 ? (completedVendors / totalVendors) * 100 : 0;
                      })()}%`
                    }}
                  ></div>
                </div>
                <div className="text-blue-600 text-xs">
                  {(() => {
                    const completedVendors = projectVendors.filter(vendor => 
                      vendor.closeout_received_date !== null
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
                    
                    projectVendors.forEach(vendor => {
                      if (vendor.closeout_received_date) return; // Skip completed vendors
                      
                      const urgency = getVendorFollowUpUrgency(vendor);
                      if (urgency.level === 'overdue') {
                        overdueCount++;
                      } else if (urgency.level === 'due_today') {
                        dueTodayCount++;
                      } else if (urgency.level === 'critical') {
                        dueSoonCount++; // 1-3 business days = "due soon"
                      }
                    });
                    
                    const totalUrgent = overdueCount + dueTodayCount + dueSoonCount;
                    return totalUrgent;
                  })()}
                </div>
                <div className="text-amber-600 text-xs">
                  {(() => {
                    // Show breakdown with clear business terminology
                    let overdueCount = 0;
                    let dueTodayCount = 0;
                    let dueSoonCount = 0;
                    
                    projectVendors.forEach(vendor => {
                      if (vendor.closeout_received_date) return; // Skip completed vendors
                      
                      const urgency = getVendorFollowUpUrgency(vendor);
                      if (urgency.level === 'overdue') {
                        overdueCount++;
                      } else if (urgency.level === 'due_today') {
                        dueTodayCount++;
                      } else if (urgency.level === 'critical') {
                        dueSoonCount++; // 1-3 business days = "due soon"
                      }
                    });
                    
                    const parts = [];
                    if (overdueCount > 0) parts.push(`${overdueCount} overdue`);
                    if (dueTodayCount > 0) parts.push(`${dueTodayCount} due today`);
                    if (dueSoonCount > 0) parts.push(`${dueSoonCount} due within 4 days`);
                    
                    return parts.length > 0 ? parts.join(', ') : 'No urgent follow-ups';
                  })()}
                </div>
              </div>

              {/* Card 3: Upcoming Deadlines */}
              {(() => {
                // Determine urgency level for card styling
                const soonestUrgency = (() => {
                  let mostUrgent = 'normal';
                  
                  projectVendors.forEach(vendor => {
                    if (vendor.closeout_received_date) return; // Skip completed vendors
                    
                    const urgency = getVendorFollowUpUrgency(vendor);
                    if (urgency.level === 'overdue' || urgency.level === 'due_today') {
                      mostUrgent = 'red';
                    } else if (urgency.level === 'critical' && mostUrgent === 'normal') {
                      mostUrgent = 'orange';
                    }
                  });
                  
                  return mostUrgent;
                })();
                
                // Set card colors based on urgency
                const cardClasses = soonestUrgency === 'red' 
                  ? 'bg-red-50 rounded-lg p-4 border border-red-200'
                  : soonestUrgency === 'orange'
                  ? 'bg-orange-50 rounded-lg p-4 border border-orange-200'
                  : 'bg-green-50 rounded-lg p-4 border border-green-200';
                
                const titleClasses = soonestUrgency === 'red'
                  ? 'text-red-600 text-sm font-medium mb-2'
                  : soonestUrgency === 'orange'
                  ? 'text-orange-600 text-sm font-medium mb-2'
                  : 'text-green-600 text-sm font-medium mb-2';
                
                const valueClasses = soonestUrgency === 'red'
                  ? 'text-2xl font-bold text-red-700 mb-2'
                  : soonestUrgency === 'orange'
                  ? 'text-2xl font-bold text-orange-700 mb-2'
                  : 'text-2xl font-bold text-green-700 mb-2';
                
                const subtitleClasses = soonestUrgency === 'red'
                  ? 'text-red-600 text-xs'
                  : soonestUrgency === 'orange'
                  ? 'text-orange-600 text-xs'
                  : 'text-green-600 text-xs';
                
                return (
                  <div className={cardClasses}>
                    <div className={titleClasses}>
                      Next Deadline
                    </div>
                    <div className={valueClasses}>
                      {(() => {
                        // Get the soonest deadline using exact same logic as vendor table NEXT FOLLOW-UP column
                        const allFollowUpDates: string[] = [];
                        
                        projectVendors.forEach(vendor => {
                          if (vendor.closeout_received_date) return; // Skip completed vendors
                          
                          // Use EXACT same logic as vendor table "Next Follow-up" column
                          const { soonestDate } = getCurrentPhasesWithSoonestFollowUp(vendor);
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
                          return 'None scheduled';
                        }
                        
                        // Debug: Console log all dates to see what we're finding
                        console.log('All follow-up dates found:', allFollowUpDates);
                        
                        // Find the earliest date using safe date comparison (avoiding timezone issues)
                        const earliestDateStr = allFollowUpDates
                          .sort((a, b) => {
                            // Parse dates safely without timezone conversion
                            const parseDate = (dateString: string) => {
                              const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
                              const [year, month, day] = dateOnly.split('-').map(Number);
                              return new Date(year, month - 1, day);
                            };
                            return parseDate(a).getTime() - parseDate(b).getTime();
                          })[0];
                        
                        console.log('Earliest date string:', earliestDateStr);
                        
                        // Format the date safely (same approach as vendor table)
                        const formatDateSafe = (dateString: string): string => {
                          const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
                          const [year, month, day] = dateOnly.split('-').map(Number);
                          const localDate = new Date(year, month - 1, day);
                          return localDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        };
                        
                        return formatDateSafe(earliestDateStr);
                      })()}
                    </div>
                    <div className={subtitleClasses}>
                      {(() => {
                        // Get phase and vendor info for the earliest deadline
                        const allFollowUpDates: string[] = [];
                        
                        projectVendors.forEach(vendor => {
                          if (vendor.closeout_received_date) return;
                          const { soonestDate } = getCurrentPhasesWithSoonestFollowUp(vendor);
                          if (soonestDate) {
                            allFollowUpDates.push(soonestDate);
                          }
                        });
                        
                        if (allFollowUpDates.length === 0) {
                          return 'No deadlines upcoming';
                        }
                        
                        // Find the earliest date
                        const earliestDateStr = allFollowUpDates
                          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
                        
                        // Count vendors and phases for that earliest date
                        const vendorsWithEarliestDate: { vendor: BidVendor; phases: { displayName: string }[] }[] = [];
                        
                        projectVendors.forEach(vendor => {
                          if (vendor.closeout_received_date) return;
                          const { soonestDate, phases } = getCurrentPhasesWithSoonestFollowUp(vendor);
                          if (soonestDate === earliestDateStr && phases.length > 0) {
                            vendorsWithEarliestDate.push({ vendor, phases });
                          }
                        });
                        
                        if (vendorsWithEarliestDate.length === 0) {
                          return 'No deadlines upcoming';
                        }
                        
                        // Collect unique phase names for the earliest date
                        const phaseNames = new Set<string>();
                        vendorsWithEarliestDate.forEach(({ phases }) => {
                          phases.forEach(phase => phaseNames.add(phase.displayName));
                        });
                        
                        const phaseText = Array.from(phaseNames).join(', ');
                        return `${phaseText} (${vendorsWithEarliestDate.length} vendors)`;
                      })()}
                    </div>
                  </div>
                );
              })()}
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
                      count: projectNotes.length,
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
                <div className="p-6">
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
                </div>
              )}

              {activeTab === "notes" && (
                <div className="p-6">
                  {currentUser && (
                    <ProjectNotes
                      bid={bid}
                      users={users}
                      projectNotes={projectNotes}
                      setProjectNotes={setProjectNotes}
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

          {/* Delete Button - hide when vendors selected */}
          <div className="p-6 flex justify-end space-x-2">
            {selectedVendorIds.size === 0 && (
              <button
                onClick={handleDeleteProject}
                className="inline-flex items-center px-4 h-10 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <TrashIcon className="w-5 h-5 mr-2" />
                Delete This Project
              </button>
            )}
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
