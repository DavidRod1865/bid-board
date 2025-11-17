import React, { useState, useMemo } from "react";
import type { Vendor, VendorWithContact, VendorType } from "../../../../shared/types";
import { Button } from "../../../../shared/components/ui/Button";
import PageHeader from "../../../../shared/components/ui/PageHeader";
import { DataTable } from "../../../../shared/components/ui/data-table";
import { createVendorColumns } from "../../../../shared/services/table-columns/vendor-columns";
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import VendorSlideOut from './VendorSlideOut';

interface VendorListProps {
  vendors: VendorWithContact[];
  onUpdateVendor?: (vendorId: number, updates: Partial<Vendor>) => Promise<void>;
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
  const [vendorTypeFilter, setVendorTypeFilter] = useState<VendorType[]>([]);
  const [insuranceFilter, setInsuranceFilter] = useState<string[]>([]);  // 'expiring', 'expired', 'valid'
  const [statusFilter, setStatusFilter] = useState<string[]>([]); // Keep for PageHeader compatibility
  const [showFilters, setShowFilters] = useState(false);
  
  // Slide-out state
  const [selectedVendor, setSelectedVendor] = useState<VendorWithContact | null>(null);
  const [isSlideOutOpen, setIsSlideOutOpen] = useState(false);

  const handleVendorClick = (vendor: VendorWithContact) => {
    setSelectedVendor(vendor);
    setIsSlideOutOpen(true);
  };

  const handleVendorSelect = (vendorId: number, selected: boolean) => {
    onVendorSelect?.(vendorId, selected);
  };


  const handleVendorUpdate = async (vendorId: number, updates: Partial<Vendor>) => {
    if (onUpdateVendor) {
      await onUpdateVendor(vendorId, updates);
      // Update selected vendor with new data
      if (selectedVendor && selectedVendor.id === vendorId) {
        setSelectedVendor({ ...selectedVendor, ...updates } as VendorWithContact);
      }
    }
  };

  const handleVendorDelete = async (vendorId: number) => {
    if (onDeleteVendor) {
      await onDeleteVendor(vendorId);
    }
  };

  // Helper function to check insurance status
  const getInsuranceStatus = (expiryDate: string | null): 'valid' | 'expiring' | 'expired' | 'none' => {
    if (!expiryDate) return 'none';
    
    const expiry = new Date(expiryDate);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    if (expiry < today) return 'expired';
    if (expiry <= thirtyDaysFromNow) return 'expiring';
    return 'valid';
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

    // Filter by vendor type
    if (vendorTypeFilter.length > 0) {
      filtered = filtered.filter((vendor) => 
        vendorTypeFilter.includes(vendor.vendor_type)
      );
    }

    // Filter by insurance status
    if (insuranceFilter.length > 0) {
      filtered = filtered.filter((vendor) => {
        const status = getInsuranceStatus(vendor.insurance_expiry_date);
        return insuranceFilter.includes(status);
      });
    }

    return filtered;
  }, [vendors, searchTerm, vendorTypeFilter, insuranceFilter]);

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
      insurance: { expiring: 0, expired: 0, valid: 0, none: 0 }
    };
    
    vendors.forEach((vendor) => {
      // Count vendor types
      counts.vendorTypes[vendor.vendor_type] = (counts.vendorTypes[vendor.vendor_type] || 0) + 1;
      
      // Count insurance statuses
      const insuranceStatus = getInsuranceStatus(vendor.insurance_expiry_date);
      counts.insurance[insuranceStatus]++;
    });
    
    return counts;
  }, [vendors]);
  const activeFilterCount = vendorTypeFilter.length + insuranceFilter.length;
  
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
        
        {/* Custom Vendor Filters */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                Filters
                {activeFilterCount > 0 && (
                  <span className="bg-[#d4af37] text-white px-2 py-1 rounded-full text-xs">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDownIcon className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
              
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setVendorTypeFilter([]);
                    setInsuranceFilter([]);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Clear all filters
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              )}
              
              {/* Active Filter Tags */}
              <div className="flex flex-wrap gap-2">
                {vendorTypeFilter.map((type) => (
                  <span key={type} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                    {type}
                    <button
                      onClick={() => setVendorTypeFilter(prev => prev.filter(t => t !== type))}
                      className="hover:text-blue-900"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {insuranceFilter.map((status) => (
                  <span key={status} className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs">
                    Insurance: {status}
                    <button
                      onClick={() => setInsuranceFilter(prev => prev.filter(s => s !== status))}
                      className="hover:text-amber-900"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              {filteredVendors.length} of {vendors.length} vendors
            </div>
          </div>
          
          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-6">
                {/* Vendor Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Type</label>
                  <div className="space-y-2">
                    {(['Vendor', 'Subcontractor', 'General Contractor'] as VendorType[]).map((type) => (
                      <label key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={vendorTypeFilter.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setVendorTypeFilter(prev => [...prev, type]);
                            } else {
                              setVendorTypeFilter(prev => prev.filter(t => t !== type));
                            }
                          }}
                          className="rounded border-gray-300 text-[#d4af37] focus:ring-[#d4af37] focus:ring-offset-0"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {type} ({filterCounts.vendorTypes[type] || 0})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Insurance Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Status</label>
                  <div className="space-y-2">
                    {[
                      { key: 'expiring', label: 'Expiring Soon (30 days)' },
                      { key: 'expired', label: 'Expired' },
                      { key: 'valid', label: 'Valid' },
                      { key: 'none', label: 'No Insurance Info' }
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={insuranceFilter.includes(key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setInsuranceFilter(prev => [...prev, key]);
                            } else {
                              setInsuranceFilter(prev => prev.filter(s => s !== key));
                            }
                          }}
                          className="rounded border-gray-300 text-[#d4af37] focus:ring-[#d4af37] focus:ring-offset-0"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {label} ({filterCounts.insurance[key as keyof typeof filterCounts.insurance]})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
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
          emptyMessage="No projects found"
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