import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type {
  Bid,
  User,
  Vendor,
  BidVendor,
  ProjectNote,
  ProjectEquipment,
  TimelineEvent,
  TimelineEventTemplate,
} from "../../../../shared/types";
import Sidebar from "../../../../shared/components/ui/Sidebar";
import AlertDialog from "../../../../shared/components/ui/AlertDialog";
import APMVendorTable from "../VendorManagement/APMVendorTable";
import APMAddVendorToProjectModal from "../modals/APMAddVendorToProjectModal";
import AddNoteModal from "../../../../shared/components/modals/AddNoteModal";
import ProjectNotes from "../../../../shared/components/modals/ProjectNotes";
import HierarchicalProjectView from "./HierarchicalProjectView";
import { ProjectTimeline } from "../timeline/ProjectTimeline";
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
  PlusIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../../shared/components/ui/dropdown-menu";
import { Checkbox } from "../../../../shared/components/ui/checkbox";
import { AddTimelineEventModal } from "../timeline/AddTimelineEventModal";
import { TimelineEventDropdown } from "../../../../shared/components/ui/TimelineEventDropdown";

interface APMProjectDetailProps {
  bid: Bid;
  bidVendors: BidVendor[];
  projectNotes: ProjectNote[];
  vendors: Vendor[];
  users: User[];
  timelineEvents?: TimelineEvent[];
  timelineEventTemplates?: TimelineEventTemplate[];
  onUpdateBid: (bidId: number, updatedBid: Partial<Bid>) => Promise<void>;
  onDeleteBid: (bidId: number) => Promise<void>;
  onUpdateBidVendor: (
    bidVendorId: number,
    vendorData: Partial<BidVendor>
  ) => Promise<void>;
  onTimelineEventAdd?: (event: Omit<TimelineEvent, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onTimelineEventUpdate?: (event: TimelineEvent) => Promise<void>;
  onTimelineEventDelete?: (eventId: number) => Promise<void>;
}

// SortableHeader component for EquipmentTable
interface SortableHeaderProps {
  field: keyof ProjectEquipment;
  currentSortField: keyof ProjectEquipment;
  sortDirection: 'asc' | 'desc';
  onSort: (field: keyof ProjectEquipment) => void;
  children: React.ReactNode;
  className?: string;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  field,
  currentSortField,
  sortDirection,
  onSort,
  children,
  className = ""
}) => {
  const alignmentClass = className.includes('text-center') ? 'text-center' : 'text-left';
  const isActive = currentSortField === field;
  
  return (
    <th
      className={`px-2 py-1 ${alignmentClass} text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:bg-slate-600 transition-colors border-r border-gray-300 ${className}`}
      onClick={() => onSort(field)}
    >
      <div className={`flex items-center space-x-1 ${alignmentClass === 'text-center' ? 'justify-center' : ''}`}>
        <span>{children}</span>
        {isActive && (
          <span className="text-blue-300">
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );
};

// Equipment Table Component (normalized structure only)
interface EquipmentTableProps {
  projectId: number;
  vendors: Vendor[];
  timelineEvents: TimelineEvent[];
}

const EquipmentTable: React.FC<EquipmentTableProps> = ({ 
  projectId,
  vendors,
  timelineEvents
}) => {
  const [expandedVendor, setExpandedVendor] = useState<number | null>(null);
  const [equipment, setEquipment] = useState<ProjectEquipment[]>([]);
  const [loadingEquipment, setLoadingEquipment] = useState<Set<number>>(new Set());
  const [nextFormId, setNextFormId] = useState<number>(1);
  const [openForms, setOpenForms] = useState<Set<number>>(new Set());
  const [formVendorMap, setFormVendorMap] = useState<Record<number, number>>({});
  const [editingEquipment, setEditingEquipment] = useState<ProjectEquipment | null>(null);
  const [projectVendors, setProjectVendors] = useState<any[]>([]);
  const [loadingProjectVendors, setLoadingProjectVendors] = useState(true);
  const [addFormData, setAddFormData] = useState<Record<number, {
    po_number: string;
    description: string;
    quantity: string;
    unit: string;
    date_received: string;
    timeline_event_id: number | null;
    received_at_wp: boolean;
  }>>({});
  const [editFormData, setEditFormData] = useState<Record<number, {
    po_number: string;
    description: string;
    quantity: string;
    unit: string;
    date_received: string;
    timeline_event_id: number | null;
    received_at_wp: boolean;
  }>>({});
  const [sortField, setSortField] = useState<keyof ProjectEquipment>('date_received');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const getVendorName = (vendorId: number) => {
    return vendors.find(v => v.id === vendorId)?.company_name || 'Unknown Vendor';
  };

  // Load project vendors when component mounts
  useEffect(() => {
    const loadProjectVendors = async () => {
      try {
        setLoadingProjectVendors(true);
        const vendorData = await dbOperations.getProjectVendors(projectId);
        setProjectVendors(vendorData);
      } catch (error) {
        console.error('Failed to load project vendors:', error);
      } finally {
        setLoadingProjectVendors(false);
      }
    };

    if (projectId) {
      loadProjectVendors();
    }
  }, [projectId]);

  // Helper function to format date for date input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string | null): string => {
    if (!dateString) return '';
    // Extract just the date part from timestamps
    const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
    return dateOnly;
  };

  // Helper function to format date for display, avoiding timezone conversion issues
  const formatDateForDisplay = (dateString: string | null): string => {
    if (!dateString) return '—';
    // Extract just the date part from timestamps to avoid timezone conversion
    const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
    const [year, month, day] = dateOnly.split('-').map(Number);
    // Create local date to avoid timezone shifts
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Load equipment when vendor is expanded
  const toggleExpanded = async (vendorId: number) => {
    const newExpandedVendor = expandedVendor === vendorId ? null : vendorId;
    setExpandedVendor(newExpandedVendor);
    
    if (newExpandedVendor !== null) {
      setLoadingEquipment(prev => new Set(prev).add(vendorId));
      try {
        const equipmentData = await dbOperations.getProjectEquipment(vendorId);
        setEquipment(prev => [
          ...prev.filter(e => e.project_vendor_id !== vendorId),
          ...equipmentData
        ]);
      } catch (error) {
        console.error('Failed to load equipment:', error);
      } finally {
        setLoadingEquipment(prev => {
          const newSet = new Set(prev);
          newSet.delete(vendorId);
          return newSet;
        });
      }
    }
  };

  const handleSort = (field: keyof ProjectEquipment) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getVendorEquipment = (projectVendorId: number) => {
    const vendorEquipment = equipment.filter(e => e.project_vendor_id === projectVendorId);
    
    return [...vendorEquipment].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      // Special handling for date_received (string comparison)
      if (sortField === 'date_received') {
        const aDate = aValue && typeof aValue === 'string' ? (aValue.includes('T') ? aValue.split('T')[0] : aValue) : '';
        const bDate = bValue && typeof bValue === 'string' ? (bValue.includes('T') ? bValue.split('T')[0] : bValue) : '';
        const comparison = aDate.localeCompare(bDate);
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      
      // Special handling for quantity (numeric)
      if (sortField === 'quantity') {
        const comparison = aValue - bValue;
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      
      // String comparison for text fields
      const comparison = String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  if (loadingProjectVendors) {
    return (
      <div className="border border-gray-300 p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading project vendors...</p>
      </div>
    );
  }

  if (!projectVendors || projectVendors.length === 0) {
    return (
      <div className="border border-gray-300 p-8 text-center">
        <p className="text-sm text-gray-500">No vendors assigned to this project.</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-300">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-slate-700">
          <tr>
            <th className="px-2 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-gray-300">
              Vendor
            </th>
            <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase tracking-wider">
              Equipment Count
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-300">
          {projectVendors.map((projectVendor, index) => {
            const isExpanded = expandedVendor === projectVendor.id;
            const rowClasses = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';
            const equipmentCount = getVendorEquipment(projectVendor.id).length;
            
            return (
              <React.Fragment key={projectVendor.id}>
                <tr 
                  className={`${rowClasses} hover:bg-slate-100 transition-colors cursor-pointer`}
                  onClick={() => toggleExpanded(projectVendor.id)}
                >
                  <td className="px-2 py-2 whitespace-nowrap border-r border-gray-300">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpanded(projectVendor.id);
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
                        {getVendorName(projectVendor.vendor_id)}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center text-sm font-medium text-slate-800">
                    {equipmentCount > 0 ? equipmentCount : '—'}
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={2} className="px-0 py-0">
                      <div className="bg-gray-50 border-t border-gray-200">
                        <table className="min-w-full divide-y divide-gray-300">
                          <thead className="bg-slate-500">
                            <tr>
                              <SortableHeader 
                                field="po_number" 
                                currentSortField={sortField}
                                sortDirection={sortDirection}
                                onSort={handleSort}
                                className="text-left"
                              >
                                PO Number
                              </SortableHeader>
                              <SortableHeader 
                                field="quantity" 
                                currentSortField={sortField}
                                sortDirection={sortDirection}
                                onSort={handleSort}
                                className="text-center w-24"
                              >
                                QTY
                              </SortableHeader>
                              <SortableHeader 
                                field="unit" 
                                currentSortField={sortField}
                                sortDirection={sortDirection}
                                onSort={handleSort}
                                className="text-center"
                              >
                                Unit
                              </SortableHeader>
                              <SortableHeader 
                                field="description" 
                                currentSortField={sortField}
                                sortDirection={sortDirection}
                                onSort={handleSort}
                                className="text-left"
                              >
                                Description
                              </SortableHeader>
                              <SortableHeader 
                                field="date_received" 
                                currentSortField={sortField}
                                sortDirection={sortDirection}
                                onSort={handleSort}
                                className="text-center w-36"
                              >
                                Date Received
                              </SortableHeader>
                              <th className="px-2 py-1 text-center text-xs font-semibold text-white uppercase tracking-wider w-16 border-r border-gray-300">WP</th>
                              <th className="px-2 py-1 text-center text-xs font-semibold text-white uppercase tracking-wider w-48 border-r border-gray-300">Timeline Event</th>
                              <th className="px-2 py-1 text-center text-xs font-semibold text-white uppercase tracking-wider w-16 border-r border-gray-300">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-300">
                            {/* Inline Add Equipment Form Rows */}
                            {Array.from(openForms).filter(formId => formVendorMap[formId] === projectVendor.id).map((formId) => (
                              <tr key={formId} className="bg-blue-50">
                                <td className="px-2 py-2 border-r border-gray-300">
                                  <input
                                    type="text"
                                    placeholder="PO Number"
                                    className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                                    value={addFormData[formId]?.po_number || ''}
                                    onChange={(e) => setAddFormData(prev => ({
                                      ...prev,
                                      [formId]: {
                                        ...prev[formId],
                                        po_number: e.target.value,
                                        description: prev[formId]?.description || '',
                                        quantity: prev[formId]?.quantity || '',
                                        unit: prev[formId]?.unit || '',
                                        date_received: prev[formId]?.date_received || '',
                                        timeline_event_id: prev[formId]?.timeline_event_id || null,
                                        received_at_wp: prev[formId]?.received_at_wp || false,
                                      }
                                    }))}
                                  />
                                </td>
                                <td className="px-2 py-2 w-24 border-r border-gray-300">
                                  <input
                                    type="number"
                                    placeholder="QTY"
                                    step="0.01"
                                    min="0"
                                    className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                                    value={addFormData[formId]?.quantity || ''}
                                    onChange={(e) => setAddFormData(prev => ({
                                      ...prev,
                                      [formId]: {
                                        ...prev[formId],
                                        po_number: prev[formId]?.po_number || '',
                                        description: prev[formId]?.description || '',
                                        quantity: e.target.value,
                                        unit: prev[formId]?.unit || '',
                                        date_received: prev[formId]?.date_received || '',
                                        timeline_event_id: prev[formId]?.timeline_event_id || null,
                                        received_at_wp: prev[formId]?.received_at_wp || false,
                                      }
                                    }))}
                                  />
                                </td>
                                <td className="px-2 py-2 border-r border-gray-300">
                                  <input
                                    type="text"
                                    placeholder="Unit"
                                    className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                                    value={addFormData[formId]?.unit || ''}
                                    onChange={(e) => setAddFormData(prev => ({
                                      ...prev,
                                      [formId]: {
                                        ...prev[formId],
                                        po_number: prev[formId]?.po_number || '',
                                        description: prev[formId]?.description || '',
                                        quantity: prev[formId]?.quantity || '',
                                        unit: e.target.value,
                                        date_received: prev[formId]?.date_received || '',
                                        timeline_event_id: prev[formId]?.timeline_event_id || null,
                                        received_at_wp: prev[formId]?.received_at_wp || false,
                                      }
                                    }))}
                                  />
                                </td>
                                <td className="px-2 py-2 border-r border-gray-300">
                                  <input
                                    type="text"
                                    placeholder="Description"
                                    className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                                    value={addFormData[formId]?.description || ''}
                                    onChange={(e) => setAddFormData(prev => ({
                                      ...prev,
                                      [formId]: {
                                        ...prev[formId],
                                        po_number: prev[formId]?.po_number || '',
                                        description: e.target.value,
                                        quantity: prev[formId]?.quantity || '',
                                        unit: prev[formId]?.unit || '',
                                        date_received: prev[formId]?.date_received || '',
                                        timeline_event_id: prev[formId]?.timeline_event_id || null,
                                        received_at_wp: prev[formId]?.received_at_wp || false,
                                      }
                                    }))}
                                  />
                                </td>
                                <td className="px-2 py-2 w-36 border-r border-gray-300" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="date"
                                    className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                                    value={addFormData[formId]?.date_received || ''}
                                    onChange={(e) => setAddFormData(prev => ({
                                      ...prev,
                                      [formId]: {
                                        ...prev[formId],
                                        po_number: prev[formId]?.po_number || '',
                                        description: prev[formId]?.description || '',
                                        quantity: prev[formId]?.quantity || '',
                                        unit: prev[formId]?.unit || '',
                                        date_received: e.target.value,
                                        timeline_event_id: prev[formId]?.timeline_event_id || null,
                                        received_at_wp: prev[formId]?.received_at_wp || false,
                                      }
                                    }))}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Explicitly show the date picker if supported
                                      if ('showPicker' in e.currentTarget && typeof (e.currentTarget as any).showPicker === 'function') {
                                        try {
                                          (e.currentTarget as any).showPicker();
                                        } catch (err) {
                                          // showPicker might not be available or might throw, ignore
                                        }
                                      }
                                    }}
                                    onFocus={(e) => e.stopPropagation()}
                                  />
                                </td>
                                <td className="px-2 py-2 text-center w-16 border-r border-gray-300">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                    checked={addFormData[formId]?.received_at_wp || false}
                                    onChange={(e) => setAddFormData(prev => ({
                                      ...prev,
                                      [formId]: {
                                        ...prev[formId],
                                        po_number: prev[formId]?.po_number || '',
                                        description: prev[formId]?.description || '',
                                        quantity: prev[formId]?.quantity || '',
                                        unit: prev[formId]?.unit || '',
                                        date_received: prev[formId]?.date_received || '',
                                        timeline_event_id: prev[formId]?.timeline_event_id || null,
                                        received_at_wp: e.target.checked,
                                      }
                                    }))}
                                  />
                                </td>
                                <td className="px-2 py-2 w-48 border-r border-gray-300" onClick={(e) => e.stopPropagation()}>
                                  <TimelineEventDropdown
                                    projectId={projectId}
                                    value={addFormData[formId]?.timeline_event_id || null}
                                    onChange={(timelineEventId) => setAddFormData(prev => ({
                                      ...prev,
                                      [formId]: {
                                        ...prev[formId],
                                        po_number: prev[formId]?.po_number || '',
                                        description: prev[formId]?.description || '',
                                        quantity: prev[formId]?.quantity || '',
                                        unit: prev[formId]?.unit || '',
                                        date_received: prev[formId]?.date_received || '',
                                        timeline_event_id: timelineEventId,
                                        received_at_wp: prev[formId]?.received_at_wp || false,
                                      }
                                    }))}
                                    timelineEvents={timelineEvents}
                                    placeholder="Select timeline event..."
                                  />
                                </td>
                                <td className="px-2 py-2 w-16">
                                  <div className="flex gap-2 justify-center">
                                    <button
                                      onClick={async () => {
                                        const formData = addFormData[formId] || {
                                          po_number: '',
                                          description: '',
                                          quantity: '',
                                          unit: '',
                                          date_received: '',
                                          timeline_event_id: null,
                                          received_at_wp: false,
                                        };
                                        const quantity = parseFloat(formData.quantity || '0');
                                        
                                        if (quantity <= 0) {
                                          alert('Please enter a quantity greater than 0');
                                          return;
                                        }
                                        
                                        try {
                                          const equipmentData = {
                                            po_number: formData.po_number || null,
                                            quantity,
                                            description: formData.description,
                                            unit: formData.unit || null,
                                            date_received: formData.date_received || null,
                                            timeline_event_id: formData.timeline_event_id,
                                            received_at_wp: formData.received_at_wp || false
                                          };
                                          
                                          await dbOperations.createProjectEquipment({
                                            project_vendor_id: projectVendor.id,
                                            ...equipmentData
                                          });
                                          
                                          // Reload equipment data
                                          const updatedEquipment = await dbOperations.getProjectEquipment(projectVendor.id);
                                          setEquipment(prev => [
                                            ...prev.filter(e => e.project_vendor_id !== projectVendor.id),
                                            ...updatedEquipment
                                          ]);
                                          
                                          // Remove this form
                                          setOpenForms(prev => {
                                            const newSet = new Set(prev);
                                            newSet.delete(formId);
                                            return newSet;
                                          });
                                          setFormVendorMap(prev => {
                                            const newMap = { ...prev };
                                            delete newMap[formId];
                                            return newMap;
                                          });
                                          setAddFormData(prev => {
                                            const newData = { ...prev };
                                            delete newData[formId];
                                            return newData;
                                          });
                                        } catch (error) {
                                          console.error('Failed to add equipment:', error);
                                          alert('Failed to add equipment. Please try again.');
                                        }
                                      }}
                                      className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                    >
                                      Add
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOpenForms(prev => {
                                          const newSet = new Set(prev);
                                          newSet.delete(formId);
                                          return newSet;
                                        });
                                        setFormVendorMap(prev => {
                                          const newMap = { ...prev };
                                          delete newMap[formId];
                                          return newMap;
                                        });
                                        setAddFormData(prev => {
                                          const newData = { ...prev };
                                          delete newData[formId];
                                          return newData;
                                        });
                                      }}
                                      className="text-xs px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}

                            {/* Equipment List */}
                            {loadingEquipment.has(projectVendor.id) ? (
                              <tr>
                                <td colSpan={8} className="px-2 py-4 text-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                                  <span className="text-xs text-gray-500 mt-1 block">Loading equipment...</span>
                                </td>
                              </tr>
                            ) : getVendorEquipment(projectVendor.id).length === 0 ? (
                              <tr>
                                <td colSpan={8} className="px-2 py-4 text-center">
                                  <button
                                    onClick={() => {
                                      const newFormId = nextFormId;
                                      setNextFormId(prev => prev + 1);
                                      setOpenForms(prev => new Set(prev).add(newFormId));
                                      setFormVendorMap(prev => ({ ...prev, [newFormId]: projectVendor.id }));
                                      setAddFormData(prev => ({
                                        ...prev,
                                        [newFormId]: {
                                          po_number: '',
                                          description: '',
                                          quantity: '',
                                          unit: '',
                                          date_received: '',
                                          timeline_event_id: null,
                                          received_at_wp: false,
                                        }
                                      }));
                                    }}
                                    className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm transition-colors font-semibold"
                                  >
                                    Add New Equipment
                                  </button>
                                </td>
                              </tr>
                            ) : (
                              <>
                                {getVendorEquipment(projectVendor.id).map((eq, eqIndex) => (
                                  <tr 
                                    key={eq.id}
                                    className={`${eqIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'} ${
                                      editingEquipment?.id === eq.id ? 'ring-2 ring-blue-500' : ''
                                    }`}
                                  >
                                    {editingEquipment?.id === eq.id ? (
                                      /* Inline Edit Form */
                                      <>
                                        <td className="px-2 py-2 border-r border-gray-300">
                                          <input
                                            type="text"
                                            placeholder="PO Number"
                                            className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                                            value={editFormData[eq.id]?.po_number ?? (eq.po_number || '')}
                                            onChange={(e) => setEditFormData(prev => ({
                                              ...prev,
                                              [eq.id]: {
                                                ...prev[eq.id],
                                                po_number: e.target.value,
                                                description: prev[eq.id]?.description ?? eq.description,
                                                quantity: prev[eq.id]?.quantity ?? String(eq.quantity),
                                                unit: prev[eq.id]?.unit ?? (eq.unit || ''),
                                                date_received: prev[eq.id]?.date_received ?? formatDateForInput(eq.date_received),
                                                timeline_event_id: prev[eq.id]?.timeline_event_id ?? eq.timeline_event_id,
                                                received_at_wp: prev[eq.id]?.received_at_wp ?? (eq.received_at_wp || false),
                                              }
                                            }))}
                                          />
                                        </td>
                                        <td className="px-2 py-2 w-24 border-r border-gray-300">
                                          <input
                                            type="number"
                                            placeholder="Quantity"
                                            step="0.01"
                                            min="0"
                                            className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                                            value={editFormData[eq.id]?.quantity ?? String(eq.quantity)}
                                            onChange={(e) => setEditFormData(prev => ({
                                              ...prev,
                                              [eq.id]: {
                                                ...prev[eq.id],
                                                po_number: prev[eq.id]?.po_number ?? (eq.po_number || ''),
                                                description: prev[eq.id]?.description ?? eq.description,
                                                quantity: e.target.value,
                                                unit: prev[eq.id]?.unit ?? (eq.unit || ''),
                                                date_received: prev[eq.id]?.date_received ?? formatDateForInput(eq.date_received),
                                                timeline_event_id: prev[eq.id]?.timeline_event_id ?? eq.timeline_event_id,
                                                received_at_wp: prev[eq.id]?.received_at_wp ?? (eq.received_at_wp || false),
                                              }
                                            }))}
                                          />
                                        </td>
                                        <td className="px-2 py-2 border-r border-gray-300">
                                          <input
                                            type="text"
                                            placeholder="Unit"
                                            className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                                            value={editFormData[eq.id]?.unit ?? (eq.unit || '')}
                                            onChange={(e) => setEditFormData(prev => ({
                                              ...prev,
                                              [eq.id]: {
                                                ...prev[eq.id],
                                                po_number: prev[eq.id]?.po_number ?? (eq.po_number || ''),
                                                description: prev[eq.id]?.description ?? eq.description,
                                                quantity: prev[eq.id]?.quantity ?? String(eq.quantity),
                                                unit: e.target.value,
                                                date_received: prev[eq.id]?.date_received ?? formatDateForInput(eq.date_received),
                                                timeline_event_id: prev[eq.id]?.timeline_event_id ?? eq.timeline_event_id,
                                                received_at_wp: prev[eq.id]?.received_at_wp ?? (eq.received_at_wp || false),
                                              }
                                            }))}
                                          />
                                        </td>
                                        <td className="px-2 py-2 border-r border-gray-300">
                                          <input
                                            type="text"
                                            placeholder="Description"
                                            className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                                            value={editFormData[eq.id]?.description ?? eq.description}
                                            onChange={(e) => setEditFormData(prev => ({
                                              ...prev,
                                              [eq.id]: {
                                                ...prev[eq.id],
                                                po_number: prev[eq.id]?.po_number ?? (eq.po_number || ''),
                                                description: e.target.value,
                                                quantity: prev[eq.id]?.quantity ?? String(eq.quantity),
                                                unit: prev[eq.id]?.unit ?? (eq.unit || ''),
                                                date_received: prev[eq.id]?.date_received ?? formatDateForInput(eq.date_received),
                                                timeline_event_id: prev[eq.id]?.timeline_event_id ?? eq.timeline_event_id,
                                                received_at_wp: prev[eq.id]?.received_at_wp ?? (eq.received_at_wp || false),
                                              }
                                            }))}
                                          />
                                        </td>
                                        <td className="px-2 py-2 w-36 border-r border-gray-300" onClick={(e) => e.stopPropagation()}>
                                          <input
                                            type="date"
                                            className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
                                            value={editFormData[eq.id]?.date_received ?? formatDateForInput(eq.date_received)}
                                            onChange={(e) => setEditFormData(prev => ({
                                              ...prev,
                                              [eq.id]: {
                                                ...prev[eq.id],
                                                po_number: prev[eq.id]?.po_number ?? (eq.po_number || ''),
                                                description: prev[eq.id]?.description ?? eq.description,
                                                quantity: prev[eq.id]?.quantity ?? String(eq.quantity),
                                                unit: prev[eq.id]?.unit ?? (eq.unit || ''),
                                                date_received: e.target.value,
                                                timeline_event_id: prev[eq.id]?.timeline_event_id ?? eq.timeline_event_id,
                                                received_at_wp: prev[eq.id]?.received_at_wp ?? (eq.received_at_wp || false),
                                              }
                                            }))}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // Explicitly show the date picker if supported
                                              if ('showPicker' in e.currentTarget && typeof (e.currentTarget as any).showPicker === 'function') {
                                                try {
                                                  (e.currentTarget as any).showPicker();
                                                } catch (err) {
                                                  // showPicker might not be available or might throw, ignore
                                                }
                                              }
                                            }}
                                            onFocus={(e) => e.stopPropagation()}
                                          />
                                        </td>
                                        <td className="px-2 py-2 text-center w-16 border-r border-gray-300">
                                          <input
                                            type="checkbox"
                                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                            checked={editFormData[eq.id]?.received_at_wp ?? (eq.received_at_wp || false)}
                                            onChange={(e) => setEditFormData(prev => ({
                                              ...prev,
                                              [eq.id]: {
                                                ...prev[eq.id],
                                                po_number: prev[eq.id]?.po_number ?? (eq.po_number || ''),
                                                description: prev[eq.id]?.description ?? eq.description,
                                                quantity: prev[eq.id]?.quantity ?? String(eq.quantity),
                                                unit: prev[eq.id]?.unit ?? (eq.unit || ''),
                                                date_received: prev[eq.id]?.date_received ?? formatDateForInput(eq.date_received),
                                                timeline_event_id: prev[eq.id]?.timeline_event_id ?? eq.timeline_event_id,
                                                received_at_wp: e.target.checked,
                                              }
                                            }))}
                                          />
                                        </td>
                                        <td className="px-2 py-2 w-48 border-r border-gray-300" onClick={(e) => e.stopPropagation()}>
                                          <TimelineEventDropdown
                                            projectId={projectId}
                                            value={editFormData[eq.id]?.timeline_event_id ?? eq.timeline_event_id}
                                            onChange={(timelineEventId) => setEditFormData(prev => ({
                                              ...prev,
                                              [eq.id]: {
                                                ...prev[eq.id],
                                                po_number: prev[eq.id]?.po_number ?? (eq.po_number || ''),
                                                description: prev[eq.id]?.description ?? eq.description,
                                                quantity: prev[eq.id]?.quantity ?? String(eq.quantity),
                                                unit: prev[eq.id]?.unit ?? (eq.unit || ''),
                                                date_received: prev[eq.id]?.date_received ?? formatDateForInput(eq.date_received),
                                                timeline_event_id: timelineEventId,
                                                received_at_wp: prev[eq.id]?.received_at_wp ?? (eq.received_at_wp || false),
                                              }
                                            }))}
                                            timelineEvents={timelineEvents}
                                            placeholder="Select timeline event..."
                                          />
                                        </td>
                                        <td className="px-2 py-2 w-16">
                                          <div className="flex gap-2 justify-center">
                                            <button
                                              onClick={async () => {
                                                const formData = editFormData[eq.id] || {
                                                  po_number: eq.po_number || '',
                                                  description: eq.description,
                                                  quantity: String(eq.quantity),
                                                  unit: eq.unit || '',
                                                  date_received: formatDateForInput(eq.date_received),
                                                  timeline_event_id: eq.timeline_event_id,
                                                  received_at_wp: eq.received_at_wp || false,
                                                };
                                                const quantity = parseFloat(formData.quantity || '0');
                                                
                                                if (!formData.description || quantity <= 0) {
                                                  alert('Please enter a description and quantity greater than 0');
                                                  return;
                                                }
                                                
                                                try {
                                                  await dbOperations.updateProjectEquipment(eq.id, {
                                                    po_number: formData.po_number || null,
                                                    quantity,
                                                    description: formData.description,
                                                    unit: formData.unit || null,
                                                    date_received: formData.date_received || null,
                                                    timeline_event_id: formData.timeline_event_id,
                                                    received_at_wp: formData.received_at_wp || false
                                                  });
                                                  
                                                  // Reload equipment data
                                                  const updatedEquipment = await dbOperations.getProjectEquipment(projectVendor.id);
                                                  setEquipment(prev => [
                                                    ...prev.filter(e => e.project_vendor_id !== projectVendor.id),
                                                    ...updatedEquipment
                                                  ]);
                                                  
                                                  // Clear edit form data
                                                  setEditFormData(prev => {
                                                    const newData = { ...prev };
                                                    delete newData[eq.id];
                                                    return newData;
                                                  });
                                                  setEditingEquipment(null);
                                                } catch (error) {
                                                  console.error('Failed to update equipment:', error);
                                                  alert('Failed to update equipment. Please try again.');
                                                }
                                              }}
                                              className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                            >
                                              Save
                                            </button>
                                            <button
                                              onClick={() => {
                                                setEditFormData(prev => {
                                                  const newData = { ...prev };
                                                  delete newData[eq.id];
                                                  return newData;
                                                });
                                                setEditingEquipment(null);
                                              }}
                                              className="text-xs px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </td>
                                      </>
                                    ) : (
                                      /* Display Mode */
                                      <>
                                        <td className="px-2 py-2 text-sm text-slate-800 border-r border-gray-300">
                                          {eq.po_number || '—'}
                                        </td>
                                        <td className="px-2 py-2 text-sm text-slate-800 text-center w-24 border-r border-gray-300">
                                          {eq.quantity}
                                        </td>
                                        <td className="px-2 py-2 text-sm text-slate-800 text-center border-r border-gray-300">
                                          {eq.unit || '—'}
                                        </td>
                                        <td className="px-2 py-2 text-sm font-medium text-slate-900 border-r border-gray-300">
                                          {eq.description}
                                        </td>
                                        <td className="px-2 py-2 text-sm text-slate-800 text-center w-36 border-r border-gray-300">
                                          {formatDateForDisplay(eq.date_received)}
                                        </td>
                                        <td className="px-2 py-2 text-sm text-center w-16 border-r border-gray-300">
                                          {eq.received_at_wp ? (
                                            <span className="text-green-600 font-bold text-lg">✓</span>
                                          ) : (
                                            <span className="text-red-600 font-bold text-lg">✗</span>
                                          )}
                                        </td>
                                        <td className="px-2 py-2 text-sm text-center w-48 border-r border-gray-300">
                                          <TimelineEventDropdown
                                            projectId={projectId}
                                            value={eq.timeline_event_id}
                                            onChange={async (timelineEventId) => {
                                              try {
                                                await dbOperations.updateProjectEquipment(eq.id, {
                                                  timeline_event_id: timelineEventId
                                                });
                                                // Reload equipment data
                                                const updatedEquipment = await dbOperations.getProjectEquipment(projectVendor.id);
                                                setEquipment(prev => [
                                                  ...prev.filter(e => e.project_vendor_id !== projectVendor.id),
                                                  ...updatedEquipment
                                                ]);
                                              } catch (error) {
                                                console.error('Failed to update equipment timeline event:', error);
                                                alert('Failed to update timeline event. Please try again.');
                                              }
                                            }}
                                            timelineEvents={timelineEvents}
                                            placeholder="Select timeline event..."
                                          />
                                        </td>
                                        <td className="px-2 py-2 text-sm text-center w-16" onClick={(e) => e.stopPropagation()}>
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
                                                    setEditingEquipment(eq);
                                                  }}
                                                >
                                                  <PencilSquareIcon className="w-4 h-4 mr-2" />
                                                  Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                  className="cursor-pointer text-red-600 focus:text-red-700"
                                                  onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (confirm('Are you sure you want to delete this equipment?')) {
                                                      try {
                                                        await dbOperations.deleteProjectEquipment(eq.id);
                                                        setEquipment(prev => prev.filter(e => e.id !== eq.id));
                                                      } catch (error) {
                                                        console.error('Failed to delete equipment:', error);
                                                        alert('Failed to delete equipment. Please try again.');
                                                      }
                                                    }
                                                  }}
                                                >
                                                  <TrashIcon className="w-4 h-4 mr-2" />
                                                  Delete
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                ))}
                                
                                {/* Add Equipment Button Row (when equipment exists) */}
                                {getVendorEquipment(projectVendor.id).length > 0 && (
                                  <tr className="bg-slate-100">
                                    <td colSpan={8} className="px-2 py-2 text-center">
                                      <button 
                                        className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm transition-colors font-semibold"
                                        onClick={() => {
                                          const newFormId = nextFormId;
                                          setNextFormId(prev => prev + 1);
                                          setOpenForms(prev => new Set(prev).add(newFormId));
                                          setFormVendorMap(prev => ({ ...prev, [newFormId]: projectVendor.id }));
                                          setAddFormData(prev => ({
                                            ...prev,
                                            [newFormId]: {
                                              po_number: '',
                                              description: '',
                                              quantity: '',
                                              unit: '',
                                              date_received: '',
                                              timeline_event_id: null,
                                              received_at_wp: false,
                                            }
                                          }));
                                        }}
                                      >
                                        Add New Equipment
                                      </button>
                                    </td>
                                  </tr>
                                )}
                              </>
                            )}
                          </tbody>
                        </table>
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

// Schedule tab removed (per product request)

const APMProjectDetail: React.FC<APMProjectDetailProps> = ({
  bid,
  bidVendors,
  projectNotes,
  vendors,
  users,
  timelineEvents = [],
  timelineEventTemplates = [],
  onUpdateBid,
  onDeleteBid,
  onUpdateBidVendor,
  onTimelineEventAdd,
  onTimelineEventUpdate,
  onTimelineEventDelete,
}) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showRemoveVendorsModal, setShowRemoveVendorsModal] = useState(false);
  const [showTimelineAddModal, setShowTimelineAddModal] = useState(false);
  const [vendorsToRemove, setVendorsToRemove] = useState<number[]>([]);
  const [editingBidVendor, setEditingBidVendor] = useState<BidVendor | null>(
    null
  );
  const [isVendorLoading, setIsVendorLoading] = useState(false);

  // State that's still needed
  const [error, setError] = useState<string | null>(null);
  // const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Local state for project notes so new notes appear immediately
  const [projectNotesState, setProjectNotesState] = useState<ProjectNote[]>(projectNotes || []);

  // Filter bid vendors for this specific project
  const projectVendors = bidVendors.filter((bv) => bv.bid_id === bid.id);

  // Filter project notes for this specific project
  const filteredProjectNotes = projectNotesState.filter(
    (note) => note.bid_id === bid.id
  );

  // Keep local notes state in sync when prop changes
  useEffect(() => {
    setProjectNotesState(projectNotes || []);
  }, [projectNotes]);

  // Set current user from users prop
  useEffect(() => {
    setCurrentUser(users[0] || null);
  }, [users]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Load equipment data for hierarchical view
  useEffect(() => {
    const loadEquipment = async () => {
      try {
        // Get all equipment for this project
        const allEquipment = await dbOperations.getAllProjectEquipment();
        const projectEquipmentList = allEquipment.filter((eq: any) => {
          // Filter equipment that belongs to vendors in this project
          const projectVendor = projectVendors.find(bv => bv.id === eq.project_vendor_id);
          return projectVendor !== undefined;
        });
        setProjectEquipment(projectEquipmentList);
      } catch (error) {
        console.error('Failed to load equipment:', error);
        setProjectEquipment([]);
      }
    };
    
    if (projectVendors.length > 0) {
      loadEquipment();
    }
  }, [bid.id, projectVendors.length]);

  // Sidebar state
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  // Tab state for bottom panel
  // Default to Vendors tab when opening the page
  const [activeTab, setActiveTab] = useState("vendors");

  // Equipment state for hierarchical view
  const [projectEquipment, setProjectEquipment] = useState<ProjectEquipment[]>([]);
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);

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
    const trimmed = content.trim();
    if (!trimmed) return;

    try {
      // Let the database function auto-detect current user via Auth
      const newNote = await dbOperations.createProjectNote({
        bid_id: bid.id,
        content: trimmed,
      });

      // Update local notes state so the new note appears immediately
      setProjectNotesState((prev) => [...prev, newNote]);
      setShowAddNoteModal(false);
    } catch (error) {
      console.error("Failed to add project note:", error);
    }
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

            {/* Next Vendor Deadline - inline info row */}
            <div className="mt-2 mb-6">
              <span className="text-gray-600 text-sm font-medium">
                Next Vendor Deadline:
              </span>{" "}
              <span className="text-sm text-gray-900">
                {(() => {
                  // Collect all relevant follow-up dates across vendors
                  const allFollowUpDates: string[] = [];

                  projectVendors.forEach((vendor) => {
                    if (vendor.closeout_received_date) return; // Skip completed vendors

                    const { soonestDate } =
                      getCurrentPhasesWithSoonestFollowUp(vendor);
                    let followUpDate = soonestDate;

                    // Fallback to getPhaseFollowUpDate if no soonest date (same as vendor table)
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
                  const earliestDateStr = allFollowUpDates.sort((a, b) => {
                    const parseDate = (dateString: string) => {
                      const dateOnly = dateString.includes("T")
                        ? dateString.split("T")[0]
                        : dateString;
                      const [year, month, day] = dateOnly
                        .split("-")
                        .map(Number);
                      return new Date(year, month - 1, day);
                    };
                    return parseDate(a).getTime() - parseDate(b).getTime();
                  })[0];

                  // Find vendors and phases associated with that earliest date
                  const vendorsWithEarliestDate: {
                    vendor: BidVendor;
                    phases: { displayName: string }[];
                  }[] = [];

                  projectVendors.forEach((vendor) => {
                    if (vendor.closeout_received_date) return;
                    const { soonestDate, phases } =
                      getCurrentPhasesWithSoonestFollowUp(vendor);
                    if (soonestDate === earliestDateStr && phases.length > 0) {
                      vendorsWithEarliestDate.push({ vendor, phases });
                    }
                  });

                  // Format the earliest date
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

                  const dateLabel = formatDateSafe(earliestDateStr);

                  if (vendorsWithEarliestDate.length === 0) {
                    return `${dateLabel} – No deadlines upcoming`;
                  }

                  // Collect unique phase names
                  const phaseNames = new Set<string>();
                  vendorsWithEarliestDate.forEach(({ phases }) => {
                    phases.forEach((phase) =>
                      phaseNames.add(phase.displayName)
                    );
                  });

                  const phaseText = Array.from(phaseNames).join(", ");
                  return `${dateLabel} – ${phaseText} (${vendorsWithEarliestDate.length} vendors)`;
                })()}
              </span>
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
                        id: "timeline",
                        label: "Timeline",
                        count: timelineEvents.length,
                      },
                      {
                        id: "notes",
                        label: "Project Notes",
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

                    {activeTab === "hierarchy" && (
                      <button
                        onClick={() => setShowAddEquipmentModal(true)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <UserPlusIcon className="w-4 h-4 mr-1" />
                        Add Equipment
                      </button>
                    )}

                    {activeTab === "timeline" && onTimelineEventAdd && (
                      <button
                        onClick={() => setShowTimelineAddModal(true)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <PlusIcon className="w-4 h-4 mr-1" />
                        Add Event
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

                {activeTab === "hierarchy" && (
                  <HierarchicalProjectView
                    projectId={bid.id}
                    bidVendors={projectVendors}
                    vendors={vendors}
                    equipment={projectEquipment}
                    showAddEquipmentModal={showAddEquipmentModal}
                    onCloseAddEquipmentModal={() => setShowAddEquipmentModal(false)}
                    onEquipmentAdded={async () => {
                      // Reload equipment data
                      try {
                        const allEquipment = await dbOperations.getAllProjectEquipment();
                        const projectEquipmentList = allEquipment.filter((eq: any) => {
                          const projectVendor = projectVendors.find(bv => bv.id === eq.project_vendor_id);
                          return projectVendor !== undefined;
                        });
                        setProjectEquipment(projectEquipmentList);
                        setShowAddEquipmentModal(false);
                      } catch (error) {
                        console.error('Failed to reload equipment:', error);
                      }
                    }}
                  />
                )}

                {activeTab === "equipment" && (
                  <EquipmentTable
                    projectId={bid.id}
                    vendors={vendors}
                    timelineEvents={timelineEvents || []}
                  />
                )}

                {activeTab === "timeline" && onTimelineEventAdd && onTimelineEventUpdate && onTimelineEventDelete && (
                  <div>
                    <ProjectTimeline
                      projectId={bid.id}
                      events={timelineEvents}
                      eventTemplates={timelineEventTemplates}
                      onEventAdd={onTimelineEventAdd}
                      onEventUpdate={onTimelineEventUpdate}
                      onEventDelete={onTimelineEventDelete}
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
                        setProjectNotes={setProjectNotesState}
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

      {/* Timeline Add Event Modal */}
      {onTimelineEventAdd && timelineEventTemplates && (
        <AddTimelineEventModal
          open={showTimelineAddModal}
          onOpenChange={setShowTimelineAddModal}
          projectId={bid.id}
          eventTemplates={timelineEventTemplates}
          onSubmit={onTimelineEventAdd}
        />
      )}
    </div>
  );
};

export default APMProjectDetail;
