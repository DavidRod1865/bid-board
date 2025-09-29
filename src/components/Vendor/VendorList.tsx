import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Vendor } from "../../types";
import Button from "../ui/Button";
import SearchFilters from "../Dashboard/SearchFilters";

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
  const [sortField, setSortField] = useState<keyof Vendor | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]); // Dummy for SearchFilters compatibility
  const navigate = useNavigate();

  const handleSort = (field: keyof Vendor) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleVendorClick = (vendorId: number, event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (
      target.tagName === "BUTTON" ||
      target.closest("button")
    ) {
      return;
    }
    navigate(`/vendor/${vendorId}`);
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

  React.useMemo(() => {
    if (!sortField) return filteredVendors;

    return [...filteredVendors].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue !== undefined && aValue !== null && bValue !== undefined && bValue !== null) {
        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [filteredVendors, sortField, sortDirection]);

  const SortableHeader: React.FC<{
    field: keyof Vendor;
    children: React.ReactNode;
  }> = ({ field, children }) => (
    <div
      className="text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer flex items-center hover:text-gray-700 transition-colors"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field && (
        <span className="ml-1 font-bold text-gray-700">
          {sortDirection === "asc" ? " ↑" : " ↓"}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col">
      <div className="max-w-7xl mx-auto w-full">
        <SearchFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          searchPlaceholder="Search vendors..."
          showStatusFilter={false}
          showUrgencyFilter={false}
        />
      </div>

      <div className={`bg-white rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col ${isOperationLoading ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Table Header */}
        <div className="grid grid-cols-[1.8fr_2.5fr_1.5fr_1.2fr_2fr] bg-gray-50 border-b border-gray-200 px-4 py-3">
          <SortableHeader field="company_name">Company Name</SortableHeader>
          <SortableHeader field="address">Address</SortableHeader>
          <SortableHeader field="contact_person">Contact Person</SortableHeader>
          <SortableHeader field="phone">Phone</SortableHeader>
          <SortableHeader field="email">Email</SortableHeader>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-500">Loading vendors...</div>
          </div>
        ) : (
          /* Table Body */
          <div className="flex-1 overflow-y-auto">
            {filteredVendors.map((vendor) => (
            <div
              key={vendor.id}
              className="grid grid-cols-[1.8fr_2.5fr_1.5fr_1.2fr_2fr] border-b border-gray-200 px-4 py-3 items-center transition-all hover:bg-gray-50 relative cursor-pointer"
              onClick={(e) => handleVendorClick(vendor.id, e)}
            >

              {/* Company Name */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-gray-900 text-sm hover:text-blue-600 transition-colors">
                  {vendor.company_name}
                </span>
              </div>

              {/* Address */}
              <div className="text-sm text-gray-600 truncate">
                {vendor.address}
              </div>

              {/* Contact Person */}
              <div className="text-sm text-gray-900">
                {vendor.contact_person}
              </div>

              {/* Phone */}
              <div className="text-sm text-gray-600">{vendor.phone}</div>

              {/* Email */}
              <div className="text-sm text-blue-600 hover:underline cursor-pointer">
                {vendor.email}
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Empty State */}
      {!isLoading && vendors.length === 0 && (
        <div className="text-center py-12">
          {searchTerm ? (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No vendors found
              </h3>
              <p className="text-gray-500 mb-4">
                No vendors match your search for "{searchTerm}".
              </p>
              <Button variant="secondary" onClick={() => setSearchTerm("")}>
                Clear Search
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No vendors found
              </h3>
              <p className="text-gray-500 mb-4">
                Get started by adding your first vendor.
              </p>
              <Button variant="primary" onClick={onAddVendor}>
                Add Vendor
              </Button>
            </>
          )}
        </div>
      )}
      
    </div>
  );
};

export default VendorList;
