import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Bid, User, ProjectNote, Vendor, BidVendor } from "../types";
import Sidebar from "./ui/Sidebar";
import ConfirmationModal from "./ui/ConfirmationModal";
import VendorTable from "./Vendor/VendorTable";
import ProjectNotes from "./ProjectNotes";
import AddVendorToProjectModal from "./Vendor/AddVendorToProjectModal";
import AddNoteModal from "./AddNoteModal";
import { dbOperations, realtimeManager } from "../lib/supabase";
import supabase from "../lib/supabase";
import { getStatusColor } from "../utils/statusUtils";
import { formatDate } from "../utils/formatters";
import { BID_STATUSES } from "../utils/constants";

interface ProjectDetailProps {
  bid: Bid;
  onUpdateBid: (bidId: number, updatedBid: Partial<Bid>) => Promise<void>;
  onDeleteBid: (bidId: number) => Promise<void>;
  // onRefreshBid?: () => void; // TODO: Implement if needed
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({
  bid,
  onUpdateBid,
  onDeleteBid,
  // onRefreshBid, // TODO: Implement if needed
}) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [projectNotes, setProjectNotes] = useState<ProjectNote[]>([]);
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Sidebar state
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  // Tab state for bottom panel
  const [activeTab, setActiveTab] = useState("vendors");

  // Vendor selection state for sidebar integration
  const [selectedVendorIds, setSelectedVendorIds] = useState<number[]>([]);

  const getVendorById = (vendorId: number) =>
    vendors.find((v) => v.id === vendorId);

  const getUserById = (userId: string) =>
    users.find((u) => u.id === userId);

  const renderUserInfo = (userId: string | null) => {
    if (!userId) return 'Unassigned';
    const user = getUserById(userId);
    if (!user) return 'Unknown User';
    
    return (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-[#d4af37] rounded-full flex items-center justify-center text-xs font-medium text-white">
          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
        </div>
        <span>{user.name}</span>
      </div>
    );
  };

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

        // Load vendors, users, and project data in parallel
        const [vendorsData, notesData, usersData] = await Promise.all([
          dbOperations.getVendors(),
          dbOperations.getProjectNotes(bid.id),
          dbOperations.getUsers(),
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
    realtimeManager.subscribeToProjectNotes(
      bid.id,
      (payload: any) => {
        if (payload.eventType === "INSERT" && payload.new) {
          const newNote = payload.new as ProjectNote;
          if (newNote.id && newNote.content) {
            setProjectNotes((prev) => [...prev, newNote]);
          }
        } else if (payload.eventType === "DELETE" && payload.old) {
          const deletedNote = payload.old as ProjectNote;
          if (deletedNote.id) {
            setProjectNotes((prev) =>
              prev.filter((note) => note.id !== deletedNote.id)
            );
          }
        }
      }
    );

    // Subscribe to bid vendors changes
    realtimeManager.subscribeToBidVendors(
      bid.id,
      (payload: any) => {
        if (payload.eventType === "INSERT" && payload.new) {
          const newBidVendor = payload.new as BidVendor;
          if (newBidVendor.id && newBidVendor.vendor_id) {
            setProjectVendors((prev) => [...prev, newBidVendor]);
          }
        } else if (payload.eventType === "UPDATE" && payload.new) {
          const updatedBidVendor = payload.new as BidVendor;
          if (updatedBidVendor.id) {
            setProjectVendors((prev) =>
              prev.map((bv) =>
                bv.id === updatedBidVendor.id ? updatedBidVendor : bv
              )
            );
          }
        } else if (payload.eventType === "DELETE" && payload.old) {
          const deletedBidVendor = payload.old as BidVendor;
          if (deletedBidVendor.id) {
            setProjectVendors((prev) =>
              prev.filter((bv) => bv.id !== deletedBidVendor.id)
            );
          }
        }
      }
    );

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
    if (!currentUser) return;
    await dbOperations.createProjectNote(bid.id, content, currentUser.id);
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
        archived_by: currentUser.id
      });
      
      navigate("/");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to archive project"
      );
    }
  };

  const isLoading = isLoadingNotes || isLoadingVendors || isLoadingUsers;

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex min-h-screen">
          <Sidebar
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onEditProject={handleEditProject}
            onDeleteProject={handleDeleteProject}
            onArchiveProject={handleArchiveProject}
            onAddNote={handleAddNote}
            onSaveProject={handleSave}
            onCancelProject={handleCancel}
            isEditingProject={isEditing}
            isSavingProject={isLoading}
            onAddProjectVendor={handleAddVendor}
            onRemoveProjectVendors={handleSidebarRemoveVendors}
            selectedVendorsCount={selectedVendorIds.length}
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
          onEditProject={handleEditProject}
          onDeleteProject={handleDeleteProject}
          onArchiveProject={handleArchiveProject}
          onAddNote={handleAddNote}
          onSaveProject={handleSave}
          onCancelProject={handleCancel}
          isEditingProject={isEditing}
          isSavingProject={isLoading}
          onAddProjectVendor={handleAddVendor}
          onRemoveProjectVendors={handleSidebarRemoveVendors}
          selectedVendorsCount={selectedVendorIds.length}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
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

            {/* Split Panel Layout */}
            <div className="flex flex-col gap-6">
              {/* Top Half - Project Overview Dashboard */}
              <div className="h-auto bg-white rounded-lg shadow-sm border p-6">
                {/* Project Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="text-2xl font-bold text-gray-900 border border-gray-300 rounded-md px-2 py-1"
                      />
                    ) : (
                      <h1 className="text-2xl font-bold text-gray-900">{bid.title}</h1>
                    )}
                    {isEditing ? (
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="text-white border-none px-3 py-2 rounded text-xs font-medium cursor-pointer w-32 text-center appearance-none"
                        style={{ backgroundColor: getStatusColor(formData.status) }}
                      >
                        {BID_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span 
                        className="text-white border-none px-3 py-2 rounded text-xs font-medium w-32 text-center inline-block"
                        style={{ backgroundColor: getStatusColor(bid.status) }}
                      >
                        {bid.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Summary Cards Grid */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {/* Project Details Card - 1/2 width */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 col-span-2">
                    <div className="space-y-3 text-md">
                      <div>
                        <span className="text-gray-600 block mb-1">Address:</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.project_address}
                            onChange={(e) => setFormData({ ...formData, project_address: e.target.value })}
                            className="border border-gray-300 rounded px-2 py-1 text-lg w-full"
                            placeholder="Project address..."
                          />
                        ) : (
                          <span className="text-gray-900 text-lg font-medium">{bid.project_address || 'Not specified'}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-600 block mb-1">General Contractor:</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.general_contractor}
                            onChange={(e) => setFormData({ ...formData, general_contractor: e.target.value })}
                            className="border border-gray-300 rounded px-2 py-1 text-lg w-full"
                            placeholder="General contractor..."
                          />
                        ) : (
                          <span className="text-gray-900 text-lg font-medium">{bid.general_contractor || 'Not assigned'}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Response Status Card - 1/4 width */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="grid grid-rows-2 gap-3 text-md">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 block">Due Date:</span>
                        {isEditing ? (
                          <input
                            type="date"
                            value={formData.due_date}
                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                          />
                        ) : (
                          <span className="text-gray-900 font-medium">{formatDate(bid.due_date)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 block">Response Pending:</span>
                        <span className="text-gray-900 font-bold">
                          {(() => {
                            const totalVendors = projectVendors.length;
                            const respondedVendors = projectVendors.filter(bv => 
                              bv.response_received_date !== null || 
                              (bv.cost_amount !== null && bv.cost_amount !== undefined)
                            ).length;
                            return `${respondedVendors}/${totalVendors}`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Assignment Card - 1/4 width */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="space-y-3 text-md">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 block">Assigned To:</span>
                        {isEditing ? (
                          <select
                            value={formData.assign_to}
                            onChange={(e) => setFormData({ ...formData, assign_to: e.target.value })}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                          >
                            <option value="">Select user...</option>
                            {users.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          renderUserInfo(bid.assign_to)
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 block">File Location:</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.file_location}
                            onChange={(e) => setFormData({ ...formData, file_location: e.target.value })}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                            placeholder="File location..."
                          />
                        ) : (
                          <span className="text-gray-900 font-medium">{bid.file_location || 'Not specified'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Project Description */}
                {(bid.project_description || isEditing) && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-6">
                    <h3 className="text-md font-medium text-gray-500 mb-3">Description:</h3>
                    {isEditing ? (
                      <textarea
                        value={formData.project_description}
                        onChange={(e) => setFormData({ ...formData, project_description: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                        rows={3}
                        placeholder="Enter project description..."
                      />
                    ) : (
                      <p className="text-gray-900 text-md">{bid.project_description}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Half - Tabbed Interface */}
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Tab Navigation */}
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-6">
                    {[
                      { id: 'vendors', label: 'Vendors', count: projectVendors.length },
                      { id: 'notes', label: 'Notes', count: projectNotes.length },
                      { id: 'timeline', label: 'Timeline', count: null },
                      { id: 'documents', label: 'Documents', count: null }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                          activeTab === tab.id
                            ? 'border-[#d4af37] text-[#d4af37]'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {tab.label}
                        {tab.count !== null && (
                          <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                            activeTab === tab.id ? 'bg-[#d4af37] text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="min-h-96">
                  {activeTab === 'vendors' && (
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

                  {activeTab === 'notes' && (
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

                  {activeTab === 'timeline' && (
                    <div className="p-6">
                      <div className="text-center py-12">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-4 text-sm font-medium text-gray-900">Timeline Coming Soon</h3>
                        <p className="mt-2 text-sm text-gray-500">Project timeline and activity log will be available here.</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'documents' && (
                    <div className="p-6">
                      <div className="text-center py-12">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="mt-4 text-sm font-medium text-gray-900">Documents Coming Soon</h3>
                        <p className="mt-2 text-sm text-gray-500">Project documents and file attachments will be available here.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Archive Confirmation Modal */}
        <ConfirmationModal
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
        <ConfirmationModal
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
        <ConfirmationModal
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
          } from this project?`}
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
    </div>
  );
};

export default ProjectDetail;
