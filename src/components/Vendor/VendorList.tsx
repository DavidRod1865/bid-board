import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Vendor } from "../../types";
import Button from "../ui/Button";
import SearchFilters from "../Dashboard/SearchFilters";
import { DataTable } from "../ui/data-table";
import { createVendorColumns } from "../../lib/table-columns/vendor-columns";

interface VendorListProps {
  vendors: Vendor[];
  onEditVendor?: (vendorId: number) => void;
  onDeleteVendor?: (vendorId: number) => void;
  onAddVendor?: () => void;
  isLoading?: boolean;
  isOperationLoading?: boolean;
}

const VendorList: React.FC<VendorListProps> = ({
  vendors,
  onAddVendor,
  isLoading = false,
  isOperationLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]); // Dummy for SearchFilters compatibility
  const [selectedVendors, setSelectedVendors] = useState<Set<number>>(new Set());
  const navigate = useNavigate();

  const handleVendorClick = (vendor: Vendor) => {
    navigate(`/vendor/${vendor.id}`);
  };

  const handleVendorSelect = (vendorId: number, selected: boolean) => {
    setSelectedVendors(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(vendorId);
      } else {
        newSet.delete(vendorId);
      }
      return newSet;
    });
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
      <div className="mx-auto w-full">
        <SearchFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          searchPlaceholder="Search vendors..."
          showStatusFilter={false}
          showDateFilter={false}
        />
      </div>

      <div className={`flex-1 flex flex-col ${isOperationLoading ? 'opacity-50 pointer-events-none' : ''}`}>
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
              <Button variant="primary" onClick={onAddVendor}>
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