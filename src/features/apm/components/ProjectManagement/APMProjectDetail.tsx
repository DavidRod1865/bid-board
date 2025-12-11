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
  ChevronRightIcon,
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

// Equipment Table Component
interface EquipmentTableProps {
  bidVendors: BidVendor[];
  vendors: Vendor[];
}

const EquipmentTable: React.FC<EquipmentTableProps> = ({ bidVendors, vendors }) => {
  const [expandedVendor, setExpandedVendor] = useState<number | null>(null);

  const getVendorName = (vendorId: number) => {
    return vendors.find(v => v.id === vendorId)?.company_name || 'Unknown Vendor';
  };

  const toggleExpanded = (vendorId: number) => {
    setExpandedVendor(expandedVendor === vendorId ? null : vendorId);
  };

  return (
    <div className="border border-gray-300">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-slate-700">
          <tr>
            <th className="px-2 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider">
              Vendor
            </th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider">
              Original Quote
            </th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider">
              Final Quote
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-300">
          {bidVendors.map((vendor, index) => {
            const isExpanded = expandedVendor === vendor.id;
            const rowClasses = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';
            
            return (
              <React.Fragment key={vendor.id}>
                <tr 
                  className={`${rowClasses} hover:bg-slate-100 transition-colors cursor-pointer`}
                  onClick={() => toggleExpanded(vendor.id)}
                >
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpanded(vendor.id);
                        }}
                        className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDownIcon className="h-4 w-4 text-gray-600" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4 text-gray-600" />
                        )}
                      </button>
                      <span className="text-sm font-semibold text-slate-900">
                        {getVendorName(vendor.vendor_id)}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-slate-800">
                    {vendor.cost_amount ? `$${Number(vendor.cost_amount).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-slate-800">
                    {vendor.final_quote_amount ? `$${Number(vendor.final_quote_amount).toLocaleString()}` : '—'}
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={3} className="px-0 py-0">
                      <div className="bg-gray-50 border-t border-gray-200">
                        <div className="p-4">
                          <div className="text-sm text-gray-600 mb-2">Equipment items will be added here</div>
                          {/* Equipment items will be added here later */}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Schedule Table Component
interface ScheduleTableProps {
  bidVendors: BidVendor[];
  vendors: Vendor[];
}

const ScheduleTable: React.FC<ScheduleTableProps> = ({ bidVendors, vendors }) => {
  const [expandedVendor, setExpandedVendor] = useState<number | null>(null);

  const getVendorName = (vendorId: number) => {
    return vendors.find(v => v.id === vendorId)?.company_name || 'Unknown Vendor';
  };

  const toggleExpanded = (vendorId: number) => {
    setExpandedVendor(expandedVendor === vendorId ? null : vendorId);
  };

  return (
    <div className="border border-gray-300">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-slate-700">
          <tr>
            <th className="px-2 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider">
              Vendor
            </th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider">
              Original Quote
            </th>
            <th className="px-2 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider">
              Final Quote
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-300">
          {bidVendors.map((vendor, index) => {
            const isExpanded = expandedVendor === vendor.id;
            const rowClasses = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';
            
            return (
              <React.Fragment key={vendor.id}>
                <tr 
                  className={`${rowClasses} hover:bg-slate-100 transition-colors cursor-pointer`}
                  onClick={() => toggleExpanded(vendor.id)}
                >
                  <td className="px-2 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpanded(vendor.id);
                        }}
                        className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDownIcon className="h-4 w-4 text-gray-600" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4 text-gray-600" />
                        )}
                      </button>
                      <span className="text-sm font-semibold text-slate-900">
                        {getVendorName(vendor.vendor_id)}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-slate-800">
                    {vendor.cost_amount ? `$${Number(vendor.cost_amount).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-slate-800">
                    {vendor.final_quote_amount ? `$${Number(vendor.final_quote_amount).toLocaleString()}` : '—'}
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={3} className="px-0 py-0">
                      <div className="bg-gray-50 border-t border-gray-200">
                        <div className="p-4">
                          <div className="text-sm text-gray-600 mb-2">Schedule items will be added here</div>
                          {/* Schedule items will be added here later */}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

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
    gc_contact_id: (bid as any).gc_contact_id || null,
    project_description: bid.project_description || "",
    estimated_value: bid.estimated_value || 0,
    created_by: bid.created_by || "",
    assign_to: bid.assign_to || "",
    file_location: bid.file_location || "",
    gc_system: bid.gc_system,
    added_to_procore: bid.added_to_procore,
    project_start_date: bid.project_start_date,
  });

  // State for GC contacts
  const [gcContacts, setGcContacts] = useState<any[]>([]);
  const [loadingGcContacts, setLoadingGcContacts] = useState(false);

  // Data is now provided via props from AppContent - no local loading needed

  // Set up real-time subscriptions for project_vendors changes
  useEffect(() => {
    const channel = supabase
      .channel("apm_project_detail_project_vendors")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_vendors",
          filter: `project_id=eq.${bid.id}`,
        },
        () => {
          // Since we're receiving project_vendors via props, the parent component
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
      gc_contact_id: (bid as any).gc_contact_id || null,
      project_description: bid.project_description || "",
      estimated_value: bid.estimated_value || 0,
      created_by: bid.created_by || "",
      assign_to: bid.assign_to || "",
      file_location: bid.file_location || "",
      gc_system: bid.gc_system,
      added_to_procore: bid.added_to_procore,
      project_start_date: bid.project_start_date,
    });
  }, [bid]);

  // Fetch GC contacts when general contractor is selected
  useEffect(() => {
    const fetchGcContacts = async () => {
      const gcName = isEditing ? formData.general_contractor : bid.general_contractor;
      
      if (!gcName) {
        setGcContacts([]);
        return;
      }

      // Find vendor by company name
      const gcVendor = vendors.find(
        (v) => v.company_name.toLowerCase() === gcName.toLowerCase()
      );

      if (!gcVendor) {
        setGcContacts([]);
        return;
      }

      setLoadingGcContacts(true);
      try {
        const contacts = await dbOperations.getVendorContacts(gcVendor.id);
        setGcContacts(contacts || []);
      } catch (error) {
        console.error('Error fetching GC contacts:', error);
        setGcContacts([]);
      } finally {
        setLoadingGcContacts(false);
      }
    };

    fetchGcContacts();
  }, [formData.general_contractor, bid.general_contractor, isEditing, vendors]);

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
        gc_contact_id: formData.gc_contact_id || null,
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
      gc_contact_id: (bid as any).gc_contact_id || null,
      project_description: bid.project_description || "",
      estimated_value: bid.estimated_value || 0,
      created_by: bid.created_by || "",
      assign_to: bid.assign_to || "",
      file_location: bid.file_location || "",
      gc_system: bid.gc_system,
      added_to_procore: bid.added_to_procore,
      project_start_date: bid.project_start_date,
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

  const handleDeleteVendor = async (bidVendorId: number) => {
    try {
      await dbOperations.removeVendorFromBid(bidVendorId);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to remove vendor from project"
      );
      throw error; // Re-throw so the table can handle it
    }
  };

  // APM Phase management handlers
  const handleCreatePhase = async (vendorId: number, phaseData: any) => {
    try {
      // Find the project_vendor ID from the bidVendor data
      const bidVendor = projectVendors.find(bv => bv.vendor_id === vendorId);
      if (!bidVendor?.id) {
        throw new Error('Project vendor relationship not found');
      }
      
      await dbOperations.createAPMPhase(bidVendor.id, {
        phase_name: phaseData.phase_name,
        status: phaseData.status,
        requested_date: phaseData.requested_date,
        follow_up_date: phaseData.follow_up_date,
        received_date: phaseData.received_date,
        notes: phaseData.notes
      });
    } catch (error) {
      console.error('Failed to create APM phase:', error);
      throw error; // Re-throw to let the modal handle error display
    }
  };

  const handleUpdatePhase = async (phaseId: number, updates: any) => {
    try {
      await dbOperations.updateAPMPhase(phaseId, updates);
    } catch (error) {
      console.error('Failed to update APM phase:', error);
      throw error; // Re-throw to let the modal handle error display
    }
  };

  const handleDeletePhase = async (phaseId: number) => {
    try {
      await dbOperations.deleteAPMPhase(phaseId);
    } catch (error) {
      console.error('Failed to delete APM phase:', error);
      throw error; // Re-throw to let confirmation dialog handle error display
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
    await dbOperations.createProjectNote({
      bid_id: bid.id,
      content: content
    });
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

          <div className="px-6 py-4 flex flex-col min-h-0 flex-1">
            {/* Flattened Project Info Header */}
            <div className="mb-4 space-y-4 flex-shrink-0">
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
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            general_contractor: e.target.value,
                            gc_contact_id: null, // Reset contact when GC changes
                          });
                        }}
                        className="border border-gray-300 rounded px-3 py-2 text-base w-full"
                        placeholder="General contractor..."
                      />
                    ) : (
                      <span className="text-gray-900 font-medium text-base block">
                        {bid.general_contractor || "Not assigned"}
                      </span>
                    )}
                    
                    {/* GC Contact - only show if GC is selected */}
                    {formData.general_contractor && (
                      <div className="mt-4">
                        <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1">
                          GC Contact
                        </span>
                        {isEditing ? (
                          <div>
                            {loadingGcContacts ? (
                              <span className="text-gray-400 text-sm">Loading contacts...</span>
                            ) : gcContacts.length > 0 ? (
                              <select
                                value={formData.gc_contact_id || ""}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    gc_contact_id: e.target.value ? Number(e.target.value) : null,
                                  })
                                }
                                className="border border-gray-300 rounded px-3 py-2 text-base w-full"
                              >
                                <option value="">Select a contact</option>
                                {gcContacts.map((contact) => (
                                  <option key={contact.id} value={contact.id}>
                                    {contact.contact_name}
                                    {contact.contact_title ? ` - ${contact.contact_title}` : ''}
                                    {contact.is_primary ? ' (Primary)' : ''}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-gray-400 text-sm">
                                No contacts found for this contractor
                              </span>
                            )}
                          </div>
                        ) : (
                          <div>
                            {(() => {
                              if (!(bid as any).gc_contact_id) {
                                return <span className="text-gray-900 font-medium text-base block">Not assigned</span>;
                              }
                              // Try to find contact in current gcContacts, or show placeholder
                              const contact = gcContacts.find(c => c.id === (bid as any).gc_contact_id);
                              if (!contact) {
                                return <span className="text-gray-900 font-medium text-base block">Contact selected</span>;
                              }
                              return (
                                <>
                                  <span className="text-gray-900 font-medium text-base block">
                                    {contact.contact_name}{contact.contact_title ? ` - ${contact.contact_title}` : ''}
                                  </span>
                                  {(contact.phone || contact.email) && (
                                    <div className="text-gray-600 text-xs mt-1">
                                      {contact.phone && (
                                        <span>{contact.phone}</span>
                                      )}
                                      {contact.phone && contact.email && (
                                        <span className="mx-1">•</span>
                                      )}
                                      {contact.email && (
                                        <span>{contact.email}</span>
                                      )}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1">
                      Project Start Date
                    </span>
                  {isEditing ? (
                    <input
                      type="date"
                      value={
                        formData.project_start_date
                          ? formData.project_start_date.slice(0, 10)
                          : ""
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          project_start_date: e.target.value || null,
                        })
                      }
                      className="border border-gray-300 rounded px-3 py-2 text-base w-full"
                    />
                  ) : (
                    <>
                      {bid.project_start_date ? (
                        <span className="text-gray-900 text-base font-medium block">
                          {(() => {
                          const dateStr = bid.project_start_date!;
                          const dateOnly = dateStr.includes("T")
                            ? dateStr.split("T")[0]
                            : dateStr;
                          const [year, month, day] = dateOnly.split("-").map(Number);
                          const localDate = new Date(year, month - 1, day);
                          return localDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          });
                          })()}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-base">-</span>
                      )}
                    </>
                  )}
                  
                  {/* GC System and Procore Status */}
                  <div className="mt-4">
                    <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-2">
                      GC System & Procore Status
                    </span>
                    <div className="flex items-center gap-4">
                      {/* GC System */}
                      <div>
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
                            className="border border-gray-300 rounded px-3 py-2 text-base"
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
                              <span className="text-blue-600 text-base font-medium">
                                Procore
                              </span>
                            )}
                            {bid.gc_system === "AutoDesk" && (
                              <span className="text-purple-600 text-base font-medium">
                                AutoDesk
                              </span>
                            )}
                            {bid.gc_system === "Email" && (
                              <span className="text-green-600 text-base font-medium">
                                Email
                              </span>
                            )}
                            {bid.gc_system === "Other" && (
                              <span className="text-gray-600 text-base font-medium">
                                Other
                              </span>
                            )}
                            {!bid.gc_system && (
                              <span className="text-gray-400 text-base">N/A</span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Procore Status */}
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <Checkbox
                              checked={formData.added_to_procore || false}
                              onCheckedChange={(checked) =>
                                setFormData({
                                  ...formData,
                                  added_to_procore: checked === true,
                                })
                              }
                            />
                            <span className="text-base text-gray-600">
                              Added to Procore
                            </span>
                          </>
                        ) : (
                          <>
                            {bid.added_to_procore ? (
                              <span className="text-green-600 text-base font-medium">
                                Added to Procore
                              </span>
                            ) : (
                              <span className="text-red-600 text-base font-medium">
                                Not in Procore
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
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

            {/* Two Workflow Progress Cards */}
            <div className="grid grid-cols-2 gap-6 mb-6 flex-shrink-0">
              {/* Card 1: Critical Follow-ups */}
              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                <div className="text-gray-700 text-sm font-semibold mb-3 uppercase tracking-wide">
                  Critical Follow-ups
                </div>
                <div className="text-3xl font-bold text-amber-600 mb-3">
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
                <div className="text-gray-600 text-sm">
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

              {/* Card 2: Upcoming Deadlines */}
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

                // Set value color based on urgency
                const valueClasses =
                  soonestUrgency === "red"
                    ? "text-3xl font-bold text-red-600 mb-3"
                    : soonestUrgency === "orange"
                    ? "text-3xl font-bold text-orange-600 mb-3"
                    : "text-3xl font-bold text-green-600 mb-3";

                return (
                  <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                    <div className="text-gray-700 text-sm font-semibold mb-3 uppercase tracking-wide">Next Deadline</div>
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
                    <div className="text-gray-600 text-sm">
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
            <div className="bg-white border-t border-b border-gray-300 flex flex-col -mx-6 flex-1 min-h-0">
              {/* Tab Navigation */}
              <div className="border-b border-gray-200 flex-shrink-0">
                <div className="flex justify-between items-center px-6">
                  <nav className="flex space-x-8">
                    {[
                      {
                        id: "vendors",
                        label: "Vendors",
                        count: projectVendors.length,
                      },
                      {
                        id: "equipment",
                        label: "Equipment",
                        count: null,
                      },
                      {
                        id: "schedule",
                        label: "Schedule",
                        count: null,
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
                          <button
                            onClick={handleAddVendor}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <UserPlusIcon className="w-4 h-4 mr-1" />
                            Add Vendor
                          </button>
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

                    {activeTab === "equipment" && (
                      <button
                        onClick={() => {
                          // TODO: Implement add equipment functionality
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <UserPlusIcon className="w-4 h-4 mr-1" />
                        Add Equipment
                      </button>
                    )}

                    {activeTab === "schedule" && (
                      <button
                        onClick={() => {
                          // TODO: Implement add schedule functionality
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <UserPlusIcon className="w-4 h-4 mr-1" />
                        Add Schedule
                      </button>
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
              <div className="flex-1 overflow-y-auto min-h-0">
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
                    onCreatePhase={handleCreatePhase}
                    onUpdatePhase={handleUpdatePhase}
                    onDeletePhase={handleDeletePhase}
                    onDeleteVendor={handleDeleteVendor}
                  />
                )}

                {activeTab === "equipment" && (
                  <EquipmentTable
                    bidVendors={projectVendors}
                    vendors={vendors}
                  />
                )}

                {activeTab === "schedule" && (
                  <ScheduleTable
                    bidVendors={projectVendors}
                    vendors={vendors}
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
