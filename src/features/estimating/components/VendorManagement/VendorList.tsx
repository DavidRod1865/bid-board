import React, { useState, useMemo } from "react";
import type {
  Vendor,
  VendorWithContact,
  VendorType,
} from "../../../../shared/types";
import { Button } from "../../../../shared/components/ui/Button";
import PageHeader from "../../../../shared/components/ui/PageHeader";
import { DataTable } from "../../../../shared/components/ui/data-table";
import {
  createVendorColumns,
  getVendorTypeBorderColor,
} from "../../../../shared/services/table-columns/vendor-columns";
import { useDynamicPageSize } from "../../../../shared/hooks/useDynamicPageSize";
import VendorSlideOut from "./VendorSlideOut";

interface VendorListProps {
  vendors: VendorWithContact[];
  onUpdateVendor?: (
    vendorId: number,
    updates: Partial<Vendor>
  ) => Promise<void>;
  onDeleteVendor?: (vendorId: number) => Promise<void>;
  onAddVendor?: () => void;
  isLoading?: boolean;
  isOperationLoading?: boolean;
  selectedVendors?: Set<number>;
  onVendorSelect?: (vendorId: number, selected: boolean) => void;
  onBulkDelete?: () => void;
  onVendorUpdated?: () => void;
}

const VendorList: React.FC<VendorListProps> = ({
  vendors,
  onAddVendor,
  onUpdateVendor,
  onDeleteVendor,
  isLoading = false,
  isOperationLoading = false,
  selectedVendors = new Set(),
  onVendorSelect,
  onBulkDelete,
  onVendorUpdated,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendorType, setSelectedVendorType] = useState<VendorType | null>(null);
  const [selectedInsuranceStatus, setSelectedInsuranceStatus] = useState<string>(""); // 'expiring', 'expired', 'valid', 'none'
  const [statusFilter, setStatusFilter] = useState<string[]>([]); // Keep for PageHeader compatibility

  // Slide-out state
  const [selectedVendor, setSelectedVendor] =
    useState<VendorWithContact | null>(null);
  const [isSlideOutOpen, setIsSlideOutOpen] = useState(false);

  // Dynamic page size management
  const { pageSize, availablePageSizes, setManualPageSize } =
    useDynamicPageSize({
      storageKey: "vendor-list-page-size",
      rowHeight: 60, // Slightly smaller for vendor rows
      reservedHeight: 500, // More space for vendor filters
    });

  const handleVendorClick = (vendor: VendorWithContact) => {
    setSelectedVendor(vendor);
    setIsSlideOutOpen(true);
  };

  const handleVendorSelect = (vendorId: number, selected: boolean) => {
    onVendorSelect?.(vendorId, selected);
  };

  const handleVendorUpdate = async (
    vendorId: number,
    updates: Partial<Vendor>
  ) => {
    if (onUpdateVendor) {
      await onUpdateVendor(vendorId, updates);
      // Update selected vendor with new data
      if (selectedVendor && selectedVendor.id === vendorId) {
        setSelectedVendor({
          ...selectedVendor,
          ...updates,
        } as VendorWithContact);
      }
    }
  };

  const handleVendorDelete = async (vendorId: number) => {
    if (onDeleteVendor) {
      await onDeleteVendor(vendorId);
    }
  };

  // Helper function to check insurance status
  const getInsuranceStatus = (
    expiryDate: string | null
  ): "valid" | "expiring" | "expired" | "none" => {
    if (!expiryDate) return "none";

    const expiry = new Date(expiryDate);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    if (expiry < today) return "expired";
    if (expiry <= thirtyDaysFromNow) return "expiring";
    return "valid";
  };

  // Filter vendors based on search term and filters
  const filteredVendors = useMemo(() => {
    let filtered = vendors;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (vendor) =>
          vendor.company_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (vendor.contact_person &&
            vendor.contact_person
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          (vendor.email &&
            vendor.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (vendor.phone &&
            vendor.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (vendor.address &&
            vendor.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (vendor.specialty &&
            vendor.specialty
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          (vendor.notes &&
            vendor.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (vendor.vendor_type &&
            vendor.vendor_type.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by vendor type (single selection)
    if (selectedVendorType) {
      filtered = filtered.filter((vendor) => vendor.vendor_type === selectedVendorType);
    }

    // Filter by insurance status (single selection)
    if (selectedInsuranceStatus) {
      filtered = filtered.filter((vendor) => {
        const status = getInsuranceStatus(vendor.insurance_expiry_date);
        return status === selectedInsuranceStatus;
      });
    }

    return filtered;
  }, [vendors, searchTerm, selectedVendorType, selectedInsuranceStatus]);

  // Create column definitions
  const columns = useMemo(() => createVendorColumns(), []);

  // Convert Set to TanStack Table row selection format
  const rowSelection = useMemo(() => {
    const selection: Record<string, boolean> = {};
    filteredVendors.forEach((vendor, index) => {
      if (selectedVendors.has(vendor.id)) {
        selection[index.toString()] = true;
      }
    });
    return selection;
  }, [selectedVendors, filteredVendors]);

  const handleRowSelectionChange = (selection: Record<string, boolean>) => {
    const newSelectedIds = new Set<number>();
    Object.entries(selection).forEach(([index, isSelected]) => {
      if (isSelected) {
        const vendorIndex = parseInt(index);
        if (filteredVendors[vendorIndex]) {
          newSelectedIds.add(filteredVendors[vendorIndex].id);
        }
      }
    });

    // Call handleVendorSelect for each change
    filteredVendors.forEach((vendor) => {
      const wasSelected = selectedVendors.has(vendor.id);
      const isSelected = newSelectedIds.has(vendor.id);

      if (wasSelected !== isSelected) {
        handleVendorSelect(vendor.id, isSelected);
      }
    });
  };

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const counts = {
      vendorTypes: {} as Record<VendorType, number>,
      insurance: { expiring: 0, expired: 0, valid: 0, none: 0 },
    };

    vendors.forEach((vendor) => {
      // Count vendor types
      counts.vendorTypes[vendor.vendor_type] =
        (counts.vendorTypes[vendor.vendor_type] || 0) + 1;

      // Count insurance statuses
      const insuranceStatus = getInsuranceStatus(vendor.insurance_expiry_date);
      counts.insurance[insuranceStatus]++;
    });

    return counts;
  }, [vendors]);
  const activeFilterCount = (selectedVendorType ? 1 : 0) + (selectedInsuranceStatus ? 1 : 0);

  // Clear all filters function
  const clearAllFilters = () => {
    setSelectedVendorType(null);
    setSelectedInsuranceStatus("");
  };

  // Helper function to get vendor type hover class
  const getVendorTypeHoverClass = (type: VendorType) => {
    switch (type) {
      case "Vendor":
        return "hover:bg-blue-50";
      case "Subcontractor":
        return "hover:bg-green-50";
      case "General Contractor":
        return "hover:bg-purple-50";
      default:
        return "hover:bg-gray-50";
    }
  };

  // Add row className styling with type-specific hover colors
  const getRowClassName = (vendor: VendorWithContact) => {
    const typeHoverClass = getVendorTypeHoverClass(vendor.vendor_type || "Vendor");
    return `${typeHoverClass} hover:-translate-y-px active:translate-y-0 border-l-4 transition-all`;
  };

  const getRowStyle = (vendor: VendorWithContact) => {
    // Show vendor type color on left border like Archives
    const statusColor = getVendorTypeBorderColor(vendor.vendor_type || "Vendor");
    return { borderLeftColor: statusColor };
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100">
      <div className="flex-shrink-0">
        {/* Page Title */}
        <div className="px-6 pt-4">
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
        </div>

        <PageHeader
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          searchPlaceholder="Search vendors..."
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          showStatusFilter={false}
          showDateFilter={false}
          actionButton={{
            label: "Add Vendor",
            onClick: onAddVendor || (() => {}),
            color: "green",
          }}
          bulkActions={
            selectedVendors.size > 0
              ? {
                  selectedCount: selectedVendors.size,
                  actions: [],
                  onDelete: onBulkDelete,
                }
              : undefined
          }
        />

        {/* Vendor Filter Tabs */}
        <div className="border-b border-gray-200 bg-slate-100">
          <div className="px-6">
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center justify-between gap-6">
                {/* Vendor Type Tabs */}
                <nav role="tablist" aria-label="Filter vendors by type" className="flex space-x-6">
                  <button
                    role="tab"
                    aria-selected={selectedVendorType === null}
                    onClick={() => setSelectedVendorType(null)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm focus:outline-none transition-colors duration-200 ${
                      selectedVendorType === null
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    All ({vendors.length})
                  </button>
                  
                  {(["Vendor", "Subcontractor", "General Contractor"] as VendorType[]).map((type) => (
                    <button
                      key={type}
                      role="tab"
                      aria-selected={selectedVendorType === type}
                      onClick={() => setSelectedVendorType(type)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm focus:outline-none transition-colors duration-200 ${
                        selectedVendorType === type
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {type} ({filterCounts.vendorTypes[type] || 0})
                    </button>
                  ))}
                </nav>

                {/* Insurance Status Dropdown */}
                <div className="flex items-center gap-1">
                  <label htmlFor="insurance-filter" className="text-sm font-medium text-gray-500">
                    Filter:
                  </label>
                  <select
                    id="insurance-filter"
                    value={selectedInsuranceStatus}
                    onChange={(e) => setSelectedInsuranceStatus(e.target.value)}
                    className="text-sm border border-gray-00 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="">All Insurance ({vendors.length})</option>
                    <option value="valid">Valid ({filterCounts.insurance.valid})</option>
                    <option value="expiring">Expiring ({filterCounts.insurance.expiring})</option>
                    <option value="expired">Expired ({filterCounts.insurance.expired})</option>
                    <option value="none">No Info ({filterCounts.insurance.none})</option>
                  </select>
                  
                {/* Clear Filters Button */}
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </Button>
                )}
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`flex-1 overflow-hidden ${
          isOperationLoading ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <DataTable
          columns={columns}
          data={filteredVendors}
          enableRowSelection={true}
          rowSelection={rowSelection}
          onRowSelectionChange={handleRowSelectionChange}
          onRowClick={handleVendorClick}
          isLoading={isLoading}
          pageSize={pageSize}
          enablePageSizeSelector={true}
          availablePageSizes={availablePageSizes}
          onPageSizeChange={setManualPageSize}
          emptyMessage="No vendors found"
          getRowClassName={getRowClassName}
          getRowStyle={getRowStyle}
        />

        {/* Empty State Actions */}
        {!isLoading && filteredVendors.length === 0 && (
          <div className="text-center py-8">
            {searchTerm ? (
              <Button variant="secondary" onClick={() => setSearchTerm("")}>
                Clear Search
              </Button>
            ) : (
              vendors.length === 0 && (
                <Button variant="default" onClick={onAddVendor}>
                  Add Vendor
                </Button>
              )
            )}
          </div>
        )}
      </div>

      {/* Vendor Slide-Out */}
      <VendorSlideOut
        vendor={selectedVendor}
        isOpen={isSlideOutOpen}
        onOpenChange={setIsSlideOutOpen}
        onUpdate={handleVendorUpdate}
        onDelete={handleVendorDelete}
        onVendorUpdated={onVendorUpdated}
      />
    </div>
  );
};

export default VendorList;
