import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Vendor } from "../../../../shared/types";
import { Button } from "../../../../shared/components/ui/Button";
import PageHeader from "../../../../shared/components/ui/PageHeader";
import { DataTable } from "../../../../shared/components/ui/data-table";
import { createVendorColumns } from "../../../../shared/services/table-columns/vendor-columns";

interface VendorListProps {
  vendors: Vendor[];
  onEditVendor?: (vendorId: number) => void;
  onDeleteVendor?: (vendorId: number) => void;
  onAddVendor?: () => void;
  isLoading?: boolean;
  isOperationLoading?: boolean;
  selectedVendors?: Set<number>;
  onVendorSelect?: (vendorId: number, selected: boolean) => void;
  onBulkDelete?: () => void;
}

const VendorList: React.FC<VendorListProps> = ({
  vendors,
  onAddVendor,
  isLoading = false,
  isOperationLoading = false,
  selectedVendors = new Set(),
  onVendorSelect,
  onBulkDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]); // Dummy for compatibility
  const navigate = useNavigate();

  const handleVendorClick = (vendor: Vendor) => {
    navigate(`/vendor/${vendor.id}`);
  };

  const handleVendorSelect = (vendorId: number, selected: boolean) => {
    onVendorSelect?.(vendorId, selected);
  };

  // Filter vendors based on search term
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
            vendor.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered;
  }, [vendors, searchTerm]);

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

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-shrink-0">
        <PageHeader
          title="Vendors"
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
            color: "green"
          }}
          bulkActions={selectedVendors.size > 0 ? {
            selectedCount: selectedVendors.size,
            actions: [],
            onDelete: onBulkDelete
          } : undefined}
        />
      </div>

      <div className={`flex-1 overflow-auto pt-0 ${isOperationLoading ? 'opacity-50 pointer-events-none' : ''}`}>
        <DataTable
          columns={columns}
          data={filteredVendors}
          enableRowSelection={true}
          rowSelection={rowSelection}
          onRowSelectionChange={handleRowSelectionChange}
          onRowClick={handleVendorClick}
          isLoading={isLoading}
          pageSize={15}
          emptyMessage={
            searchTerm 
              ? `No vendors match your search for "${searchTerm}"`
              : vendors.length === 0 
                ? 'No vendors found. Get started by adding your first vendor.'
                : 'No vendors found'
          }
        />

        {/* Empty State Actions */}
        {!isLoading && filteredVendors.length === 0 && (
          <div className="text-center py-8">
            {searchTerm ? (
              <Button variant="secondary" onClick={() => setSearchTerm("")}>
                Clear Search
              </Button>
            ) : vendors.length === 0 && (
              <Button variant="default" onClick={onAddVendor}>
                Add Vendor
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorList;