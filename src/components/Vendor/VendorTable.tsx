import React, { useState, useMemo } from "react";
import type { Vendor, BidVendor } from "../../types";
import Button from "../ui/Button";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "../ui/card";
import { DataTable } from "../ui/data-table";
import { createBidVendorColumns } from "../../lib/table-columns/bid-vendor-columns";

interface BidVendorWithVendor extends BidVendor {
  vendor?: Vendor;
}

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

  // Transform data to include vendor information
  const vendorsWithData = useMemo(() => {
    return projectVendors
      .map((bidVendor) => ({
        ...bidVendor,
        vendor: getVendorById(bidVendor.vendor_id),
      }))
      .sort((a, b) => {
        // Priority vendors first, then non-priority
        if (a.is_priority && !b.is_priority) return -1;
        if (!a.is_priority && b.is_priority) return 1;
        
        // Within each group, sort by due date (earliest first)
        // Handle null/undefined due dates by putting them at the end
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
  }, [projectVendors, getVendorById]);

  // Create column definitions
  const columns = useMemo(() => createBidVendorColumns(onEdit), [onEdit]);

  const handleRemoveSelected = () => {
    if (selectedVendors.length > 0 && onRemoveVendors) {
      onRemoveVendors(selectedVendors);
      setSelectedVendors([]);
    }
  };

  // Convert selectedVendors array to TanStack Table row selection format
  const rowSelection = useMemo(() => {
    const selection: Record<string, boolean> = {};
    vendorsWithData.forEach((vendor, index) => {
      if (selectedVendors.includes(vendor.vendor_id)) {
        selection[index.toString()] = true;
      }
    });
    return selection;
  }, [selectedVendors, vendorsWithData]);

  const handleRowSelectionChange = (selection: Record<string, boolean>) => {
    const newSelectedIds: number[] = [];
    Object.entries(selection).forEach(([index, isSelected]) => {
      if (isSelected) {
        const vendorIndex = parseInt(index);
        if (vendorsWithData[vendorIndex]) {
          newSelectedIds.push(vendorsWithData[vendorIndex].vendor_id);
        }
      }
    });

    setSelectedVendors(newSelectedIds);
    onSelectionChange?.(newSelectedIds);
  };

  // Custom row styling for priority, overdue, and selection
  const getRowClassName = (vendor: BidVendorWithVendor) => {
    const isSelected = selectedVendors.includes(vendor.vendor_id);
    const isOverdue = vendor.due_date && !vendor.response_received_date ? new Date() > new Date(vendor.due_date) : false;
    const costsReceived = vendor.response_received_date !== null;

    if (isSelected) {
      return 'bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500';
    }
    if (vendor.is_priority) {
      return 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-l-yellow-500';
    }
    if (isOverdue && !costsReceived) {
      return 'hover:bg-gray-50 border-l-4 border-l-red-500';
    }
    return 'hover:bg-gray-50';
  };

  const tableActions = !hideActions ? (
    <div className="flex gap-2 items-center">
      <Button variant="primary" size="sm" onClick={onAddVendor}>
        + Add Vendor
      </Button>
      {selectedVendors.length > 0 && (
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
      <Card>
        <CardHeader>
          <CardTitle>Project Vendors</CardTitle>
          <CardAction>{tableActions}</CardAction>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No vendors assigned to this project yet.</p>
            <p className="text-xs mt-1">Click "Add Vendor" to get started.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hideActions) {
    // Return table without Card wrapper for project detail
    return (
      <DataTable
        columns={columns}
        data={vendorsWithData}
        enableRowSelection={true}
        rowSelection={rowSelection}
        onRowSelectionChange={handleRowSelectionChange}
        getRowClassName={getRowClassName}
        pageSize={15}
        initialSorting={[{ id: "due_date", desc: false }]}
        emptyMessage="No vendors assigned to this project yet."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Vendors</CardTitle>
        <CardAction>{tableActions}</CardAction>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={vendorsWithData}
          enableRowSelection={true}
          rowSelection={rowSelection}
          onRowSelectionChange={handleRowSelectionChange}
          getRowClassName={getRowClassName}
          pageSize={15}
          initialSorting={[{ id: "due_date", desc: false }]}
          emptyMessage="No vendors assigned to this project yet."
        />
      </CardContent>
    </Card>
  );
};

export default VendorTable;