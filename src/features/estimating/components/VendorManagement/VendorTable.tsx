import React, { useState, useMemo, useCallback } from "react";
import type { Vendor, BidVendor } from "../../../../shared/types";
import { Button } from "../../../../shared/components/ui/Button";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "../../../../shared/components/ui/CardComponent";
import { DataTable } from "../../../../shared/components/ui/data-table";
import { createBidVendorColumns } from "../../../../shared/services/table-columns/bid-vendor-columns";
import { useDynamicPageSize } from "../../../../shared/hooks/useDynamicPageSize";

interface BidVendorWithVendor extends BidVendor {
  vendor?: Vendor;
}

interface VendorTableProps {
  projectVendors: BidVendor[];
  getVendorById: (vendorId: number) => Vendor | undefined;
  onAddVendor?: () => void;
  onEdit?: (vendorId: number) => void;
  onRemoveVendors?: (vendorIds: number[]) => void;
  onUpdateBidVendor?: (bidVendorId: number, vendorData: Partial<BidVendor>) => void;
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
  onUpdateBidVendor,
  hideActions = false,
  onSelectionChange,
}) => {
  const [selectedVendors, setSelectedVendors] = useState<number[]>([]);
  
  // Inline editing state
  const [editingVendorId, setEditingVendorId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{
    cost_amount: number | string | null;
    status: string;
    response_received_date: string | null;
    due_date: string | null;
  }>({
    cost_amount: null,
    status: '',
    response_received_date: null,
    due_date: null,
  });

  // Dynamic page size management
  const { 
    pageSize, 
    availablePageSizes, 
    setManualPageSize 
  } = useDynamicPageSize({
    storageKey: 'vendor-table-page-size',
    rowHeight: 55, // Compact for table within project view
    reservedHeight: 300 // Less space needed in component view
  });

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

  // Priority update handler
  const handlePriorityUpdate = useCallback((bidVendorId: number, isPriority: boolean) => {
    onUpdateBidVendor?.(bidVendorId, { is_priority: isPriority });
  }, [onUpdateBidVendor]);

  // Helper to format date for input (YYYY-MM-DD)
  const formatDateForInput = useCallback((date: string | null): string => {
    if (!date) return '';
    // Handle both ISO strings and date-only strings
    const dateOnly = date.includes('T') ? date.split('T')[0] : date;
    return dateOnly;
  }, []);

  // Inline editing handlers
  const handleStartEdit = useCallback((bidVendorId: number) => {
    const vendor = vendorsWithData.find(v => v.id === bidVendorId);
    if (vendor) {
      setEditingVendorId(bidVendorId);
      setEditValues({
        cost_amount: vendor.cost_amount,
        status: vendor.status,
        response_received_date: formatDateForInput(vendor.response_received_date),
        due_date: formatDateForInput(vendor.due_date),
      });
    }
  }, [vendorsWithData, formatDateForInput]);

  const handleCancelEdit = useCallback(() => {
    setEditingVendorId(null);
    setEditValues({
      cost_amount: null,
      status: '',
      response_received_date: null,
      due_date: null,
    });
  }, []);

  const handleSaveEdit = useCallback(async (bidVendorId: number) => {
    const vendor = vendorsWithData.find(v => v.id === bidVendorId);
    if (!vendor || !onUpdateBidVendor) return;

    try {
      const updates: Partial<BidVendor> = {};
      
      // Parse cost_amount - convert string to decimal number for Supabase
      let finalCostAmount: number | null = null;
      if (editValues.cost_amount !== null && editValues.cost_amount !== undefined && editValues.cost_amount !== '') {
        if (typeof editValues.cost_amount === 'number') {
          // Unchanged from initial load
          finalCostAmount = editValues.cost_amount;
        } else {
          // User modified - parse the string to a number
          const cleanedValue = String(editValues.cost_amount).replace(/[^0-9.]/g, '');
          const parsed = parseFloat(cleanedValue);
          if (!isNaN(parsed)) {
            finalCostAmount = parsed;
          }
        }
      }
      
      if (finalCostAmount !== vendor.cost_amount) {
        updates.cost_amount = finalCostAmount;
      }
      if (editValues.status !== vendor.status) {
        updates.status = editValues.status;
      }
      
      // Compare dates - need to normalize for comparison
      const vendorResponseDate = formatDateForInput(vendor.response_received_date);
      const vendorDueDate = formatDateForInput(vendor.due_date);
      
      if (editValues.response_received_date !== vendorResponseDate) {
        updates.response_received_date = editValues.response_received_date || null;
      }
      if (editValues.due_date !== vendorDueDate) {
        updates.due_date = editValues.due_date || null;
      }

      if (Object.keys(updates).length > 0) {
        await onUpdateBidVendor(bidVendorId, updates);
      }
      
      setEditingVendorId(null);
      setEditValues({
        cost_amount: null,
        status: '',
        response_received_date: null,
        due_date: null,
      });
    } catch (error) {
      console.error('Failed to save vendor updates:', error);
    }
  }, [editValues, vendorsWithData, onUpdateBidVendor, formatDateForInput]);

  const handleEditValueChange = useCallback((field: 'cost_amount' | 'status' | 'response_received_date' | 'due_date', value: any) => {
    setEditValues(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleDeleteVendor = useCallback((bidVendorId: number) => {
    // For now, we'll just call onRemoveVendors with a single vendor
    // In the future, this could show a confirmation dialog
    if (onRemoveVendors) {
      const vendor = vendorsWithData.find(v => v.id === bidVendorId);
      if (vendor) {
        onRemoveVendors([vendor.vendor_id]);
      }
    }
  }, [vendorsWithData, onRemoveVendors]);

  // Helper to parse amount input (remove $ and commas, preserve decimals)
  const parseAmountInput = useCallback((value: string): number | null => {
    if (!value || value.trim() === '') return null;
    const cleaned = value.replace(/[$,]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }, []);

  // Helper to format amount for input display - returns raw value for typing, no reformatting
  const formatAmountForInput = useCallback((amount: number | string | null): string => {
    if (amount === null || amount === undefined) return '';
    if (amount === 0) return '0';
    // Return as-is for strings (user is typing)
    if (typeof amount === 'string') {
      return amount;
    }
    // For numbers, convert to string without forced decimal places
    return String(amount);
  }, []);

  // Create column definitions - note: editValues intentionally not in deps to prevent re-renders while typing
  const columns = useMemo(() => createBidVendorColumns(
    onEdit,
    handlePriorityUpdate,
    editingVendorId,
    editValues,
    handleStartEdit,
    handleSaveEdit,
    handleCancelEdit,
    handleEditValueChange,
    handleDeleteVendor,
    parseAmountInput,
    formatAmountForInput
  ), [
    onEdit,
    handlePriorityUpdate,
    editingVendorId,
    handleStartEdit,
    handleSaveEdit,
    handleCancelEdit,
    handleEditValueChange,
    handleDeleteVendor,
    parseAmountInput,
    formatAmountForInput
  ]);

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
      <Button variant="default" size="sm" onClick={onAddVendor}>
        + Add Vendor
      </Button>
      {selectedVendors.length > 0 && (
        <Button 
          variant="destructive" 
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
      <div className="h-full flex flex-col">
        <DataTable
          columns={columns}
          data={vendorsWithData}
          enableRowSelection={true}
          rowSelection={rowSelection}
          onRowSelectionChange={handleRowSelectionChange}
          getRowClassName={getRowClassName}
          pageSize={pageSize}
          enablePageSizeSelector={true}
          availablePageSizes={availablePageSizes}
          onPageSizeChange={setManualPageSize}
          initialSorting={[{ id: "due_date", desc: false }]}
          emptyMessage="No vendors assigned to this project yet."
        />
      </div>
    );
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Project Vendors</CardTitle>
        <CardAction>{tableActions}</CardAction>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        <DataTable
          columns={columns}
          data={vendorsWithData}
          enableRowSelection={true}
          rowSelection={rowSelection}
          onRowSelectionChange={handleRowSelectionChange}
          getRowClassName={getRowClassName}
          pageSize={pageSize}
          enablePageSizeSelector={true}
          availablePageSizes={availablePageSizes}
          onPageSizeChange={setManualPageSize}
          initialSorting={[{ id: "due_date", desc: false }]}
          emptyMessage="No vendors assigned to this project yet."
        />
      </CardContent>
    </Card>
  );
};

export default VendorTable;