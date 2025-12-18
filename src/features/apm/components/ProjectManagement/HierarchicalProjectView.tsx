import React, { useState, useMemo } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import type { BidVendor, Vendor, ProjectEquipment, TimelineEvent } from '../../../../shared/types';
import { dbOperations } from '../../../../shared/services/supabase';
import { TimelineEventDropdown } from '../../../../shared/components/ui/TimelineEventDropdown';

interface HierarchicalProjectViewProps {
  projectId: number;
  bidVendors: BidVendor[];
  vendors: Vendor[];
  equipment: ProjectEquipment[];
  timelineEvents?: TimelineEvent[];
  showAddEquipmentModal?: boolean;
  onCloseAddEquipmentModal?: () => void;
  onEquipmentAdded?: () => void;
}

interface EquipmentGroup {
  name: string;
  equipment: ProjectEquipment[];
  vendors: {
    vendor: Vendor;
    bidVendor: BidVendor;
    phases: Array<{
      id: number;
      phase_name: string;
      status: string;
      follow_up_date: string | null;
      received_date: string | null;
      requested_date: string | null;
    }>;
  }[];
}

const HierarchicalProjectView: React.FC<HierarchicalProjectViewProps> = ({
  projectId,
  bidVendors,
  vendors,
  equipment,
  timelineEvents = [],
  showAddEquipmentModal = false,
  onCloseAddEquipmentModal,
  onEquipmentAdded,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addEquipmentForm, setAddEquipmentForm] = useState({
    project_vendor_id: '',
    description: '',
    quantity: '',
    unit: '',
    po_number: '',
    date_received: '',
    timeline_event_id: null as number | null,
  });

  // Helper to get vendor name
  // const getVendorName = (vendorId: number) => {
  //   return vendors.find(v => v.id === vendorId)?.company_name || 'Unknown Vendor';
  // };

  // Format date helper
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '—';
    const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
    const [year, month, day] = dateOnly.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Group equipment by description/type
  const equipmentGroups = useMemo(() => {
    // Group equipment by description (or create a category field)
    const grouped = equipment.reduce((acc, eq) => {
      const key = eq.description || 'Uncategorized';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(eq);
      return acc;
    }, {} as Record<string, ProjectEquipment[]>);

    // Build hierarchical structure
    const groups: EquipmentGroup[] = Object.entries(grouped).map(([equipmentName, equipmentList]) => {
      // Get unique vendors for this equipment
      const vendorIds = new Set(equipmentList.map(eq => eq.project_vendor_id));
      
      const vendorData = Array.from(vendorIds)
        .map(projectVendorId => {
          const bidVendor = bidVendors.find(bv => bv.id === projectVendorId);
          if (!bidVendor) return null;
          
          const vendor = vendors.find(v => v.id === bidVendor.vendor_id);
          if (!vendor) return null;

          // Get phases for this vendor
          const phases = bidVendor.apm_phases || [];

          return {
            vendor,
            bidVendor,
            phases: phases.map(phase => ({
              id: phase.id,
              phase_name: phase.phase_name,
              status: phase.status,
              follow_up_date: phase.follow_up_date,
              received_date: phase.received_date,
              requested_date: phase.requested_date,
            })),
          };
        })
        .filter((v): v is NonNullable<typeof v> => v !== null);

      return {
        name: equipmentName,
        equipment: equipmentList,
        vendors: vendorData,
      };
    });

    return groups;
  }, [equipment, bidVendors, vendors]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const toggleVendor = (key: string) => {
    setExpandedVendors(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleAddEquipment = async () => {
    if (!addEquipmentForm.project_vendor_id || !addEquipmentForm.description || !addEquipmentForm.quantity) {
      alert('Please fill in all required fields (Vendor, Description, Quantity)');
      return;
    }

    const quantity = parseFloat(addEquipmentForm.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    setIsSubmitting(true);
    try {
      await dbOperations.createProjectEquipment({
        project_vendor_id: parseInt(addEquipmentForm.project_vendor_id),
        description: addEquipmentForm.description,
        quantity: quantity,
        unit: addEquipmentForm.unit || null,
        po_number: addEquipmentForm.po_number || null,
        date_received: addEquipmentForm.date_received || null,
        timeline_event_id: addEquipmentForm.timeline_event_id,
      });

      // Reset form
      setAddEquipmentForm({
        project_vendor_id: '',
        description: '',
        quantity: '',
        unit: '',
        po_number: '',
        date_received: '',
        timeline_event_id: null,
      });

      // Refresh equipment data
      if (onEquipmentAdded) {
        onEquipmentAdded();
      }
    } catch (error) {
      console.error('Failed to add equipment:', error);
      alert('Failed to add equipment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If no equipment, show vendors directly grouped
  const hasEquipment = equipment.length > 0;

  if (!hasEquipment) {
    // Fallback: Group by vendor if no equipment
    const vendorGroups = bidVendors.map(bv => {
      const vendor = vendors.find(v => v.id === bv.vendor_id);
      if (!vendor) return null;
      
      return {
        vendor,
        bidVendor: bv,
        phases: bv.apm_phases || [],
      };
    }).filter((v): v is NonNullable<typeof v> => v !== null);

    return (
      <div className="p-6">
        <div className="text-sm text-gray-600 mb-4">
          No equipment data available. Showing vendors directly.
        </div>
        <div className="space-y-4">
          {vendorGroups.map(({ vendor, phases }) => (
            <div key={vendor.id} className="border border-gray-300 rounded-lg">
              <div className="bg-slate-100 px-4 py-2 font-semibold text-slate-900">
                {vendor.company_name}
              </div>
              {phases.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-300 border-collapse">
                  <thead className="bg-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 uppercase border border-gray-300">
                        Phase
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-slate-700 uppercase border border-gray-300">
                        Status
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-slate-700 uppercase border border-gray-300">
                        Follow-Up Date
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-slate-700 uppercase border border-gray-300">
                        Received Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {phases.map((phase, idx) => (
                      <tr key={phase.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-4 py-2 text-sm font-medium text-slate-900 border border-gray-300">
                          {phase.phase_name}
                        </td>
                        <td className="px-4 py-2 text-center border border-gray-300">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium inline-block ${
                            phase.status === 'Completed' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : phase.status === 'Pending' 
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {phase.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-700 text-center border border-gray-300">
                          {formatDate(phase.follow_up_date)}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-700 text-center border border-gray-300">
                          {formatDate(phase.received_date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  No phases available
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Add Equipment Modal */}
      {showAddEquipmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Equipment</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor <span className="text-red-500">*</span>
                </label>
                <select
                  value={addEquipmentForm.project_vendor_id}
                  onChange={(e) => setAddEquipmentForm(prev => ({ ...prev, project_vendor_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a vendor</option>
                  {bidVendors.map(bv => {
                    const vendor = vendors.find(v => v.id === bv.vendor_id);
                    return vendor ? (
                      <option key={bv.id} value={bv.id}>
                        {vendor.company_name}
                      </option>
                    ) : null;
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addEquipmentForm.description}
                  onChange={(e) => setAddEquipmentForm(prev => ({ ...prev, description: e.target.value }))}
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
                    value={addEquipmentForm.quantity}
                    onChange={(e) => setAddEquipmentForm(prev => ({ ...prev, quantity: e.target.value }))}
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
                    value={addEquipmentForm.unit}
                    onChange={(e) => setAddEquipmentForm(prev => ({ ...prev, unit: e.target.value }))}
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
                  value={addEquipmentForm.po_number}
                  onChange={(e) => setAddEquipmentForm(prev => ({ ...prev, po_number: e.target.value }))}
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
                  value={addEquipmentForm.date_received}
                  onChange={(e) => setAddEquipmentForm(prev => ({ ...prev, date_received: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timeline Event
                </label>
                <TimelineEventDropdown
                  projectId={projectId}
                  value={addEquipmentForm.timeline_event_id}
                  onChange={(timelineEventId) => setAddEquipmentForm(prev => ({ ...prev, timeline_event_id: timelineEventId }))}
                  timelineEvents={timelineEvents}
                  placeholder="Select timeline event..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  if (onCloseAddEquipmentModal) {
                    onCloseAddEquipmentModal();
                  }
                  setAddEquipmentForm({
                    project_vendor_id: '',
                    description: '',
                    quantity: '',
                    unit: '',
                    po_number: '',
                    date_received: '',
                    timeline_event_id: null,
                  });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleAddEquipment}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Adding...' : 'Add Equipment'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {equipmentGroups.map((group) => {
          const isGroupExpanded = expandedGroups.has(group.name);
          const equipmentCount = group.equipment.length;
          const totalVendors = group.vendors.length;

          return (
            <div key={group.name} className="border border-gray-300 rounded-lg overflow-hidden">
              {/* Equipment Group Header */}
              <div
                className="bg-slate-700 px-4 py-3 cursor-pointer hover:bg-slate-600 transition-colors"
                onClick={() => toggleGroup(group.name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroup(group.name);
                      }}
                      className="p-0.5 hover:bg-slate-500 rounded transition-colors"
                    >
                      {isGroupExpanded ? (
                        <ChevronDownIcon className="h-5 w-5 text-white" />
                      ) : (
                        <ChevronRightIcon className="h-5 w-5 text-white" />
                      )}
                    </button>
                    <span className="text-white font-semibold text-sm">
                      📦 {group.name}
                    </span>
                    <span className="text-slate-300 text-xs ml-2">
                      ({equipmentCount} item{equipmentCount !== 1 ? 's' : ''}, {totalVendors} vendor{totalVendors !== 1 ? 's' : ''})
                    </span>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isGroupExpanded && (
                <div className="bg-white">
                  {/* Equipment Details Table - Show First */}
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="mb-2">
                      <h3 className="text-sm font-semibold text-slate-900">Equipment Details</h3>
                    </div>
                    {group.equipment.length > 0 ? (
                      <table className="min-w-full divide-y divide-gray-300 border-collapse">
                        <thead className="bg-slate-200">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 uppercase border border-gray-300">
                              Description
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700 uppercase border border-gray-300">
                              Quantity
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700 uppercase border border-gray-300">
                              Unit
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700 uppercase border border-gray-300">
                              PO Number
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700 uppercase border border-gray-300">
                              Date Received
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-300">
                          {group.equipment.map((eq, eqIdx) => (
                            <tr
                              key={eq.id}
                              className={eqIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                            >
                              <td className="px-3 py-2 text-sm font-medium text-slate-900 border border-gray-300">
                                {eq.description}
                              </td>
                              <td className="px-3 py-2 text-sm text-slate-700 text-center border border-gray-300">
                                {eq.quantity}
                              </td>
                              <td className="px-3 py-2 text-sm text-slate-700 text-center border border-gray-300">
                                {eq.unit || '—'}
                              </td>
                              <td className="px-3 py-2 text-sm text-slate-700 text-center border border-gray-300">
                                {eq.po_number || '—'}
                              </td>
                              <td className="px-3 py-2 text-sm text-slate-700 text-center border border-gray-300">
                                {formatDate(eq.date_received)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-2">
                        No equipment details available
                      </div>
                    )}
                  </div>

                  {/* Vendors Section - Show Second */}
                  {group.vendors.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                      No vendors associated with this equipment
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {group.vendors.map(({ vendor, phases }) => {
                        const vendorKey = `${group.name}-${vendor.id}`;
                        const isVendorExpanded = expandedVendors.has(vendorKey);

                        return (
                          <div key={vendor.id} className="border-b border-gray-200">
                            {/* Vendor Header */}
                            <div
                              className="bg-slate-100 px-4 py-2 cursor-pointer hover:bg-slate-200 transition-colors"
                              onClick={() => toggleVendor(vendorKey)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleVendor(vendorKey);
                                    }}
                                    className="p-0.5 hover:bg-slate-300 rounded transition-colors"
                                  >
                                    {isVendorExpanded ? (
                                      <ChevronDownIcon className="h-4 w-4 text-slate-700" />
                                    ) : (
                                      <ChevronRightIcon className="h-4 w-4 text-slate-700" />
                                    )}
                                  </button>
                                  <span className="text-slate-900 font-semibold text-sm">
                                    {vendor.company_name}
                                  </span>
                                  <span className="text-slate-600 text-xs ml-2">
                                    ({phases.length} phase{phases.length !== 1 ? 's' : ''})
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Vendor Phases Table - Show Third */}
                            {isVendorExpanded && (
                              <div className="px-4 py-3">
                                {phases.length > 0 ? (
                                  <table className="min-w-full divide-y divide-gray-300 border-collapse">
                                    <thead className="bg-slate-200">
                                      <tr>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 uppercase border border-gray-300">
                                          Phase
                                        </th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700 uppercase border border-gray-300">
                                          Status
                                        </th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700 uppercase border border-gray-300">
                                          Requested
                                        </th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700 uppercase border border-gray-300">
                                          Follow-Up
                                        </th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700 uppercase border border-gray-300">
                                          Received
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-300">
                                      {phases.map((phase, phaseIdx) => (
                                        <tr
                                          key={phase.id}
                                          className={phaseIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                                        >
                                          <td className="px-3 py-2 text-sm font-medium text-slate-900 border border-gray-300">
                                            {phase.phase_name}
                                          </td>
                                          <td className="px-3 py-2 text-center border border-gray-300">
                                            <span
                                              className={`px-2 py-1 text-xs rounded-full font-medium inline-block ${
                                                phase.status === 'Completed'
                                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                  : phase.status === 'Pending'
                                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                                              }`}
                                            >
                                              {phase.status}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-sm text-slate-700 text-center border border-gray-300">
                                            {formatDate(phase.requested_date)}
                                          </td>
                                          <td className="px-3 py-2 text-sm text-slate-700 text-center border border-gray-300">
                                            {formatDate(phase.follow_up_date)}
                                          </td>
                                          <td className="px-3 py-2 text-sm text-slate-700 text-center border border-gray-300">
                                            {formatDate(phase.received_date)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <div className="text-sm text-gray-500 text-center py-2">
                                    No phases available for this vendor
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {equipmentGroups.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">No equipment data available for this project.</p>
        </div>
      )}
    </div>
  );
};

export default HierarchicalProjectView;

