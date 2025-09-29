import React, { useState } from "react";
import type { Vendor, BidVendor } from "../../types";
import {
  getVendorDueDate,
  isVendorOverdue,
  getVendorStatusColor,
} from "../../utils/statusUtils";
import { formatDate, formatCurrency } from "../../utils/formatters";
import Button from "../ui/Button";
import Card from "../ui/Card";

interface VendorTableProps {
  projectVendors: BidVendor[];
  getVendorById: (vendorId: number) => Vendor | undefined;
  onAddVendor?: () => void;
  onEdit?: (vendorId: number) => void;
  onRemoveVendors?: (vendorIds: number[]) => void;
  // New props for sidebar integration
  hideActions?: boolean;
  onSelectionChange?: (selectedVendors: number[]) => void;
}

const VendorTable: React.FC<VendorTableProps> = ({
  projectVendors,
  getVendorById,
  onAddVendor,
  onEdit,
  onRemoveVendors,
  hideActions = false,
  onSelectionChange,
}) => {
  const [selectedVendors, setSelectedVendors] = useState<number[]>([]);

  const handleVendorSelect = (vendorId: number, checked: boolean) => {
    const newSelected = checked 
      ? [...selectedVendors, vendorId]
      : selectedVendors.filter(id => id !== vendorId);
    
    setSelectedVendors(newSelected);
    onSelectionChange?.(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    const newSelected = checked 
      ? projectVendors.map(bv => bv.vendor_id)
      : [];
    
    setSelectedVendors(newSelected);
    onSelectionChange?.(newSelected);
  };

  const handleRemoveSelected = () => {
    if (selectedVendors.length > 0 && onRemoveVendors) {
      onRemoveVendors(selectedVendors);
      setSelectedVendors([]);
    }
  };

  const allSelected = selectedVendors.length === projectVendors.length && projectVendors.length > 0;
  const someSelected = selectedVendors.length > 0;

  const tableActions = !hideActions ? (
    <div className="flex gap-2 items-center">
      <Button variant="primary" size="sm" onClick={onAddVendor}>
        + Add Vendor
      </Button>
      {someSelected && (
        <Button 
          variant="danger" 
          size="sm" 
          onClick={handleRemoveSelected}
        >
          Remove Selected ({selectedVendors.length})
        </Button>
      )}
    </div>
  ) : null;

  if (projectVendors.length === 0) {
    if (hideActions) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No vendors assigned to this project yet.</p>
          <p className="text-xs mt-1">Use the sidebar to add vendors.</p>
        </div>
      );
    }
    return (
      <Card title="Project Vendors" actions={tableActions}>
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No vendors assigned to this project yet.</p>
          <p className="text-xs mt-1">Click "Add Vendor" to get started.</p>
        </div>
      </Card>
    );
  }

  if (hideActions) {
    // Return table without Card wrapper for project detail
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded"
                />
              </th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Vendor
              </th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Cost Amount
              </th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Response Date
              </th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Due Date
              </th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {projectVendors.map((bidVendor) => {
              const vendor = getVendorById(bidVendor.vendor_id);
              if (!vendor) return null;

              const isOverdue = bidVendor.due_date && !bidVendor.response_received_date ? new Date() > new Date(bidVendor.due_date) : false;
              const costsReceived = bidVendor.response_received_date !== null;
              const isSelected = selectedVendors.includes(bidVendor.vendor_id);

              // Determine row styling based on priority, overdue status, and selection
              const getRowStyling = () => {
                if (isSelected) {
                  return 'bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500';
                }
                if (isOverdue && !costsReceived) {
                  return 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500';
                }
                if (bidVendor.is_priority) {
                  return 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-l-yellow-500';
                }
                return 'hover:bg-gray-50';
              };

              return (
                <tr
                  key={bidVendor.id}
                  className={`transition-colors ${getRowStyling()}`}
                >
                  <td className="py-4 px-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleVendorSelect(bidVendor.vendor_id, e.target.checked)}
                      className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded"
                    />
                  </td>

                  <td className="py-4 px-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">
                        {vendor.company_name}
                      </span>
                    </div>
                  </td>

                  <td className="py-4 px-2 text-center">
                    <div className="flex items-center justify-center">
                      {bidVendor.cost_amount !== null && bidVendor.cost_amount !== undefined ? (
                        <span className="text-gray-900 font-medium text-sm">
                          {formatCurrency(bidVendor.cost_amount)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </div>
                  </td>

                  <td className="py-4 px-2 text-center">
                    {bidVendor.response_received_date ? (
                      <span className="text-sm text-gray-600">
                        {formatDate(bidVendor.response_received_date, "short")}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>

                  <td className="py-4 px-2 text-center">
                    <span
                      className={`text-sm ${
                        isOverdue && !costsReceived
                          ? "text-red-600 font-medium"
                          : "text-gray-600"
                      }`}
                    >
                      {bidVendor.due_date ? formatDate(bidVendor.due_date, "short") : '-'}
                    </span>
                  </td>

                  <td className="py-4 px-2 text-center">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${getVendorStatusColor(
                        bidVendor.status
                      )}`}
                    >
                      {bidVendor.status.toUpperCase()}
                    </span>
                  </td>

                  <td className="py-4 px-2 text-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onEdit?.(vendor.id)}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <Card title="Project Vendors" actions={tableActions}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded"
                />
              </th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Vendor
              </th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Cost Amount
              </th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Response Date
              </th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Due Date
              </th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {projectVendors.map((bidVendor) => {
              const vendor = getVendorById(bidVendor.vendor_id);
              if (!vendor) return null;

              const isOverdue = bidVendor.due_date && !bidVendor.response_received_date ? new Date() > new Date(bidVendor.due_date) : false;
              const costsReceived = bidVendor.response_received_date !== null;
              const isSelected = selectedVendors.includes(bidVendor.vendor_id);

              // Determine row styling based on priority, overdue status, and selection
              const getRowStyling = () => {
                if (isSelected) {
                  return 'bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500';
                }
                if (isOverdue && !costsReceived) {
                  return 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500';
                }
                if (bidVendor.is_priority) {
                  return 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-l-yellow-500';
                }
                return 'hover:bg-gray-50';
              };

              return (
                <tr
                  key={bidVendor.id}
                  className={`transition-colors ${getRowStyling()}`}
                >
                  <td className="py-4 px-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleVendorSelect(bidVendor.vendor_id, e.target.checked)}
                      className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded"
                    />
                  </td>

                  <td className="py-4 px-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">
                        {vendor.company_name}
                      </span>
                    </div>
                  </td>

                  <td className="py-4 px-2 text-center">
                    <div className="flex items-center justify-center">
                      {bidVendor.cost_amount !== null && bidVendor.cost_amount !== undefined ? (
                        <span className="text-gray-900 font-medium text-sm">
                          {formatCurrency(bidVendor.cost_amount)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </div>
                  </td>

                  <td className="py-4 px-2 text-center">
                    {bidVendor.response_received_date ? (
                      <span className="text-sm text-gray-600">
                        {formatDate(bidVendor.response_received_date, "short")}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>

                  <td className="py-4 px-2 text-center">
                    <span
                      className={`text-sm ${
                        isOverdue && !costsReceived
                          ? "text-red-600 font-medium"
                          : "text-gray-600"
                      }`}
                    >
                      {bidVendor.due_date ? formatDate(bidVendor.due_date, "short") : '-'}
                    </span>
                  </td>

                  <td className="py-4 px-2 text-center">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${getVendorStatusColor(
                        bidVendor.status
                      )}`}
                    >
                      {bidVendor.status.toUpperCase()}
                    </span>
                  </td>

                  <td className="py-4 px-2 text-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onEdit?.(vendor.id)}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default VendorTable;
