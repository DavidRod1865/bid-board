import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dbOperations } from "../../../shared/services/supabase";
import { PencilIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon, EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../shared/components/ui/dropdown-menu";
import type { ProjectEquipment, BidVendor, VendorWithContact, User, EquipmentOverview } from "../../../shared/types";

// Define Project interface to match the projects table structure
interface Project {
  id: number;
  project_name: string;
  project_address?: string;
  general_contractor?: string;
  created_at: string;
  start_date?: string;
}
import { formatDateSafe } from "../../../shared/utils/formatters";

interface ReceivingLogsProps {
  equipment: ProjectEquipment[];
  equipmentOverview?: EquipmentOverview[]; // New: use the efficient view data
  projects: Project[];
  projectVendors: BidVendor[]; // This represents project_vendors relationships
  vendors: VendorWithContact[];
  users: User[];
  isLoading?: boolean;
  className?: string;
  searchTerm?: string; // Accept searchTerm as prop instead of managing internally
  dateRange?: { startDate: Date | null; endDate: Date | null }; // Date filter for receiving logs
  onEquipmentUpdated?: () => void; // Callback to refresh data after edit/delete
}

interface EquipmentWithDetails extends ProjectEquipment {
  project: Project;
  vendor: VendorWithContact;
  projectVendor: BidVendor;
  receivedBy?: User;
}

// New interface using the equipment overview view data
interface EquipmentOverviewWithDetails {
  equipment_id: number;
  equipment_description: string;
  quantity: number;
  unit: string | null;
  po_number: string | null;
  date_received: string | null;
  project_id: number;
  project_name: string;
  project_address: string | null;
  vendor_name: string;
  vendor_specialty: string | null;
  assigned_by_name: string | null;
}


const ReceivingLogs: React.FC<ReceivingLogsProps> = ({
  equipment,
  equipmentOverview,
  projects,
  projectVendors,
  vendors,
  users,
  isLoading = false,
  className = "",
  searchTerm = "", // Use prop instead of internal state
  dateRange = { startDate: null, endDate: null }, // Date filter for receiving logs
  onEquipmentUpdated
}) => {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentWithDetails | EquipmentOverviewWithDetails | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editForm, setEditForm] = useState({
    description: '',
    quantity: '',
    unit: '',
    po_number: '',
    date_received: '',
  });

  // Transform equipment data with project and vendor details
  const equipmentWithDetails = useMemo(() => {
    // Use equipment overview if available (much more efficient)
    if (equipmentOverview) {
      return equipmentOverview
        .filter(eq => eq.date_received) // Only show received equipment
        .map(eq => ({
          equipment_id: eq.equipment_id,
          equipment_description: eq.equipment_description,
          quantity: eq.quantity,
          unit: eq.unit,
          po_number: eq.po_number,
          date_received: eq.date_received,
          project_id: eq.project_id,
          project_name: eq.project_name,
          project_address: eq.project_address,
          vendor_name: eq.vendor_name,
          vendor_specialty: eq.vendor_specialty,
          assigned_by_name: eq.assigned_by_name,
        })) as EquipmentOverviewWithDetails[];
    }

    // Fallback to legacy data transformation
    const details: EquipmentWithDetails[] = [];

    equipment.forEach((equip) => {
      // Skip equipment that hasn't been received yet
      if (!equip.date_received) return;

      // Find the associated project vendor relationship
      const projectVendor = projectVendors.find((pv) => pv.id === equip.project_vendor_id);
      if (!projectVendor) return;

      // Find the project and vendor
      // Note: projectVendor has a project_id field that links to the projects table
      const project = projects.find((p) => p.id === (projectVendor as any).project_id || p.id === projectVendor.bid_id);
      const vendor = vendors.find((v) => v.id === projectVendor.vendor_id);
      
      if (!project || !vendor) return;

      // Try to find who received it - use the assigned APM user
      const receivedBy = users.find((u) => u.id === projectVendor.assigned_apm_user);

      details.push({
        ...equip,
        project,
        vendor,
        projectVendor,
        receivedBy,
      });
    });

    return details;
  }, [equipment, equipmentOverview, projects, projectVendors, vendors, users]);

  // Filter equipment based on search term and date range
  const filteredEquipment = useMemo(() => {
    let filtered: (EquipmentWithDetails | EquipmentOverviewWithDetails)[] = equipmentWithDetails;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((equip) => {
        const description = 'description' in equip ? equip.description : equip.equipment_description;
        const projectName = 'project' in equip ? equip.project.project_name : equip.project_name;
        const vendorName = 'vendor' in equip ? equip.vendor.company_name : equip.vendor_name;
        const poNumber = equip.po_number;

        return (
          description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
        );
      });
    }

    // Filter by date range
    if (dateRange.startDate || dateRange.endDate) {
      filtered = filtered.filter((equip) => {
        if (!equip.date_received) return false;
        
        // Extract date string in YYYY-MM-DD format to avoid timezone issues
        const receivedDateStr = equip.date_received.split('T')[0]; // Get just the date part
        
        // Helper to format date as YYYY-MM-DD string
        const formatDateString = (date: Date): string => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        // If only start date is set, filter from that date onwards
        if (dateRange.startDate && !dateRange.endDate) {
          const startDateStr = formatDateString(dateRange.startDate);
          return receivedDateStr >= startDateStr;
        }
        
        // If only end date is set, filter up to that date
        if (!dateRange.startDate && dateRange.endDate) {
          const endDateStr = formatDateString(dateRange.endDate);
          return receivedDateStr <= endDateStr;
        }
        
        // If both dates are set, filter within the range
        if (dateRange.startDate && dateRange.endDate) {
          const startDateStr = formatDateString(dateRange.startDate);
          const endDateStr = formatDateString(dateRange.endDate);
          return receivedDateStr >= startDateStr && receivedDateStr <= endDateStr;
        }
        
        return true;
      });
    }

    return filtered;
  }, [equipmentWithDetails, searchTerm, dateRange]);

  // Sort filtered equipment by date received (most recent first)
  const sortedEquipment = useMemo(() => {
    return [...filteredEquipment].sort((a, b) => {
      const dateA = a.date_received ? new Date(a.date_received).getTime() : 0;
      const dateB = b.date_received ? new Date(b.date_received).getTime() : 0;
      return dateB - dateA;
    });
  }, [filteredEquipment]);

  // Sort function for equipment
  const sortEquipment = (a: EquipmentWithDetails | EquipmentOverviewWithDetails, b: EquipmentWithDetails | EquipmentOverviewWithDetails): number => {
    if (!sortColumn) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case 'project':
        aValue = 'project' in a ? a.project.project_name : a.project_name;
        bValue = 'project' in b ? b.project.project_name : b.project_name;
        break;
      case 'vendor':
        aValue = 'vendor' in a ? a.vendor.company_name : a.vendor_name;
        bValue = 'vendor' in b ? b.vendor.company_name : b.vendor_name;
        break;
      case 'po_number':
        aValue = a.po_number || '';
        bValue = b.po_number || '';
        break;
      case 'quantity':
        aValue = a.quantity;
        bValue = b.quantity;
        break;
      case 'unit':
        aValue = a.unit || '';
        bValue = b.unit || '';
        break;
      case 'description':
        aValue = 'description' in a ? a.description : a.equipment_description;
        bValue = 'description' in b ? b.description : b.equipment_description;
        break;
      default:
        return 0;
    }

    // Handle string comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return sortDirection === 'asc' ? comparison : -comparison;
    }

    // Handle number comparison
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    return 0;
  };

  // Group equipment by date and apply sorting
  const equipmentByDate = useMemo(() => {
    const grouped: Record<string, (EquipmentWithDetails | EquipmentOverviewWithDetails)[]> = {};
    
    sortedEquipment.forEach((equip) => {
      const dateKey = equip.date_received 
        ? formatDateSafe(equip.date_received) 
        : 'No Date';
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(equip);
    });

    // Apply sorting to each date group if a sort column is selected
    if (sortColumn) {
      Object.keys(grouped).forEach((dateKey) => {
        grouped[dateKey] = [...grouped[dateKey]].sort(sortEquipment);
      });
    }
    
    return grouped;
  }, [sortedEquipment, sortColumn, sortDirection]);

  const handleEditEquipment = (equipment: EquipmentWithDetails | EquipmentOverviewWithDetails) => {
    setEditingEquipment(equipment);
    const description = 'description' in equipment ? equipment.description : equipment.equipment_description;
    const quantity = equipment.quantity.toString();
    const unit = equipment.unit || '';
    const poNumber = equipment.po_number || '';
    const dateReceived = equipment.date_received ? equipment.date_received.split('T')[0] : '';
    
    setEditForm({
      description,
      quantity,
      unit,
      po_number: poNumber,
      date_received: dateReceived,
    });
    setShowEditModal(true);
  };

  const resetEditForm = () => {
    setEditForm({
      description: '',
      quantity: '',
      unit: '',
      po_number: '',
      date_received: '',
    });
    setEditingEquipment(null);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    resetEditForm();
  };

  const handleUpdateEquipment = async () => {
    if (!editingEquipment || !editForm.description || !editForm.quantity) {
      alert('Please fill in all required fields (Description, Quantity)');
      return;
    }

    const quantity = parseFloat(editForm.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    const equipmentId = 'id' in editingEquipment ? editingEquipment.id : editingEquipment.equipment_id;

    setIsUpdating(true);
    try {
      await dbOperations.updateProjectEquipment(equipmentId, {
        description: editForm.description,
        quantity: quantity,
        unit: editForm.unit || null,
        po_number: editForm.po_number || null,
        date_received: editForm.date_received || null,
      });

      setShowEditModal(false);
      resetEditForm();
      if (onEquipmentUpdated) {
        onEquipmentUpdated();
      }
    } catch (error) {
      console.error('Failed to update equipment:', error);
      alert('Failed to update equipment. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteEquipment = async (equipmentId: number) => {
    setIsDeleting(equipmentId);
    try {
      // Update equipment to clear received date and received_at_wp flag
      // This removes it from the receiving logs table (filtered by date_received)
      await dbOperations.updateProjectEquipment(equipmentId, {
        date_received: null,
        received_at_wp: false
      });
      if (onEquipmentUpdated) {
        onEquipmentUpdated();
      }
    } catch (error) {
      console.error('Failed to remove equipment:', error);
      throw error; // Re-throw to let the column handler show the alert
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEquipmentClick = (equipment: EquipmentWithDetails | EquipmentOverviewWithDetails) => {
    const projectId = 'project' in equipment ? equipment.project.id : equipment.project_id;
    navigate(`/apm/project/${projectId}`);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sortable header component
  const SortableHeader = ({ column, children, className = "" }: { column: string; children: React.ReactNode; className?: string }) => {
    const isSorted = sortColumn === column;
    const isAsc = sortDirection === 'asc';
    const isCenter = className.includes('text-center');
    const isLeft = className.includes('text-left');
    
    return (
      <th 
        className={`${className} cursor-pointer hover:bg-gray-100 select-none`}
        onClick={() => handleSort(column)}
      >
        <div className={`flex items-center gap-1 ${isCenter ? 'justify-center' : isLeft ? 'justify-start' : 'justify-start'}`}>
          <span>{children}</span>
          {isSorted && (
            isAsc ? (
              <ChevronUpIcon className="w-4 h-4 text-gray-600 flex-shrink-0" />
            ) : (
              <ChevronDownIcon className="w-4 h-4 text-gray-600 flex-shrink-0" />
            )
          )}
          {!isSorted && (
            <div className="w-4 h-4 flex flex-col opacity-30 flex-shrink-0">
              <ChevronUpIcon className="w-3 h-3 -mb-1" />
              <ChevronDownIcon className="w-3 h-3" />
            </div>
          )}
        </div>
      </th>
    );
  };

  // Get row className for styling
  const getRowClassName = (_equipment: EquipmentWithDetails | EquipmentOverviewWithDetails) => {
    return "hover:bg-blue-50 hover:-translate-y-px active:translate-y-0";
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center w-full ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4af37] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading receiving logs...</p>
        </div>
      </div>
    );
  }

  // Get project and vendor names for display in edit modal
  const getEquipmentDisplayInfo = (equipment: EquipmentWithDetails | EquipmentOverviewWithDetails) => {
    if ('project' in equipment) {
      return {
        projectName: equipment.project.project_name,
        vendorName: equipment.vendor.company_name,
      };
    } else {
      return {
        projectName: equipment.project_name,
        vendorName: equipment.vendor_name,
      };
    }
  };

  // Get sorted date keys (most recent first)
  const sortedDateKeys = useMemo(() => {
    return Object.keys(equipmentByDate).sort((a, b) => {
      // Handle "No Date" case
      if (a === 'No Date') return 1;
      if (b === 'No Date') return -1;
      
      // Get the actual date from the first equipment item in each group
      const equipA = equipmentByDate[a][0];
      const equipB = equipmentByDate[b][0];
      const dateA = equipA.date_received ? new Date(equipA.date_received).getTime() : 0;
      const dateB = equipB.date_received ? new Date(equipB.date_received).getTime() : 0;
      return dateB - dateA; // Most recent first
    });
  }, [equipmentByDate]);

  return (
    <div className={`flex flex-col h-full w-full ${className}`}>
      {/* Grouped Equipment by Date */}
      <div className="flex-1 overflow-auto flex flex-col min-w-0 w-full">
        {isLoading ? (
          <div className="flex items-center justify-center w-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4af37] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading receiving logs...</p>
            </div>
          </div>
        ) : sortedDateKeys.length === 0 ? (
          <div className="flex items-center justify-center w-full">
            <p className="text-gray-600">No equipment has been received yet. Equipment will appear here once it's marked as received in project details.</p>
          </div>
        ) : (
          <div className="w-full space-y-6">
            {sortedDateKeys.map((dateKey) => {
              const equipmentForDate = equipmentByDate[dateKey];
              return (
                <div key={dateKey} className="bg-white border-b border-gray-200 overflow-hidden w-full">
                  {/* Date Header */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-b-2 border-blue-200 w-full py-2">
                    <h3 className="text-lg font-semibold text-blue-900 ml-4">
                      {dateKey}
                    </h3>
                  </div>
                  
                  {/* Equipment Table for this Date */}
                  <div className="overflow-x-auto w-full">
                    <table className="w-full table-fixed border-collapse border border-gray-300">
                      <thead className="bg-slate-50 border-b border-gray-300">
                        <tr>
                          <SortableHeader 
                            column="project" 
                            className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-left w-[150px] pl-4 border-r border-gray-300 py-1"
                          >
                            Project
                          </SortableHeader>
                          <SortableHeader 
                            column="vendor" 
                            className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center w-[120px] border-r border-gray-300 py-1"
                          >
                            Vendor
                          </SortableHeader>
                          <SortableHeader 
                            column="po_number" 
                            className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center w-[100px] border-r border-gray-300 py-1"
                          >
                            PO Number
                          </SortableHeader>
                          <SortableHeader 
                            column="quantity" 
                            className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center w-[80px] border-r border-gray-300 py-1"
                          >
                            QTY
                          </SortableHeader>
                          <SortableHeader 
                            column="unit" 
                            className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center w-[60px] border-r border-gray-300 py-1"
                          >
                            Unit
                          </SortableHeader>
                          <SortableHeader 
                            column="description" 
                            className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-left w-[200px] pl-4 border-r border-gray-300 py-1"
                          >
                            Description
                          </SortableHeader>
                          <th className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center w-[70px] py-1">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {equipmentForDate.map((equip, index) => {
                          const projectName = 'project' in equip ? equip.project.project_name : equip.project_name;
                          const projectAddress = 'project' in equip ? equip.project.project_address : equip.project_address;
                          const vendorName = 'vendor' in equip ? equip.vendor.company_name : equip.vendor_name;
                          const description = 'description' in equip ? equip.description : equip.equipment_description;
                          const equipmentId = 'id' in equip ? equip.id : equip.equipment_id;
                          const isEven = index % 2 === 0;
                          
                          return (
                            <tr
                              key={equipmentId}
                              className={`${isEven ? 'bg-white' : 'bg-gray-50'} border-b border-gray-300 hover:bg-blue-50 cursor-pointer transition-colors ${getRowClassName(equip)}`}
                              onClick={() => handleEquipmentClick(equip)}
                            >
                              <td className="pl-4 border-r border-gray-300 w-[150px] py-1">
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-gray-900 text-xs truncate">
                                    {projectName}
                                  </div>
                                  <div className="text-gray-600 text-xs truncate">
                                    {projectAddress || "No address provided"}
                                  </div>
                                </div>
                              </td>
                              <td className="text-center border-r border-gray-300 w-[120px] py-1">
                                <div className="flex items-center justify-center text-gray-900 text-sm">
                                  <span className="text-center mx-1 whitespace-normal">
                                    {vendorName}
                                  </span>
                                </div>
                              </td>
                              <td className="text-center border-r border-gray-300 w-[100px] py-1">
                                <div className="flex items-center justify-center text-gray-900 text-sm">
                                  {equip.po_number || "—"}
                                </div>
                              </td>
                              <td className="text-center border-r border-gray-300 w-[80px] py-1">
                                <div className="flex items-center justify-center text-gray-900 text-sm">
                                  {equip.quantity}
                                </div>
                              </td>
                              <td className="text-center border-r border-gray-300 w-[60px] py-1">
                                <div className="flex items-center justify-center text-gray-900 text-sm">
                                  {equip.unit}
                                </div>
                              </td>
                              <td className="border-r border-gray-300 pl-4 w-[200px] py-1">
                                <div className="font-medium text-gray-900 text-sm truncate" title={description}>
                                  {description}
                                </div>
                              </td>
                              <td className="w-[70px] py-1" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        className="inline-flex items-center justify-center p-1.5 rounded hover:bg-gray-100 focus:outline-none"
                                        aria-label="Equipment actions"
                                      >
                                        <EllipsisVerticalIcon className="w-5 h-5 text-gray-600" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40">
                                      <DropdownMenuItem
                                        className="cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditEquipment(equip);
                                        }}
                                      >
                                        <PencilIcon className="w-4 h-4 mr-2" />
                                        Edit equipment
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="cursor-pointer text-red-600 focus:text-red-700"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (window.confirm('Are you sure you want to remove this equipment from the receiving logs?')) {
                                            try {
                                              await handleDeleteEquipment(equipmentId);
                                            } catch (error) {
                                              console.error('Failed to remove equipment:', error);
                                              alert('Failed to remove equipment. Please try again.');
                                            }
                                          }
                                        }}
                                        disabled={isDeleting === equipmentId}
                                      >
                                        <TrashIcon className="w-4 h-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Equipment Modal */}
      {showEditModal && editingEquipment && (
        <div className="fixed inset-0 flex items-center justify-center z-50" onClick={handleCloseEditModal}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Equipment</h2>
            
            <div className="space-y-4">
              {/* Read-only Project and Vendor display */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 text-sm">
                    {getEquipmentDisplayInfo(editingEquipment).projectName}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 text-sm">
                    {getEquipmentDisplayInfo(editingEquipment).vendorName}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., HVAC Unit, Ductwork"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={editForm.unit}
                    onChange={(e) => setEditForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., each, feet, tons"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PO Number
                </label>
                <input
                  type="text"
                  value={editForm.po_number}
                  onChange={(e) => setEditForm(prev => ({ ...prev, po_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Purchase order number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Received
                </label>
                <input
                  type="date"
                  value={editForm.date_received}
                  onChange={(e) => setEditForm(prev => ({ ...prev, date_received: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={(e) => {
                    // Open the date picker on click
                    if ('showPicker' in e.currentTarget && typeof (e.currentTarget as any).showPicker === 'function') {
                      try {
                        (e.currentTarget as any).showPicker();
                      } catch (err) {
                        // showPicker might not be available, fallback to default behavior
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCloseEditModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateEquipment}
                disabled={isUpdating}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Updating...' : 'Update Equipment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceivingLogs;