import React, { useState, useMemo } from 'react';
import type { Vendor } from '../../../../shared/types';
import DialogModal from '../../../../shared/components/ui/DialogModal';
import { Input } from '../../../../shared/components/ui/FormField';
import { Button } from "../../../../shared/components/ui/Button";
import { Checkbox } from '../../../../shared/components/ui/checkbox';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface BulkAddVendorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (vendorIds: number[]) => Promise<void>;
  vendors: Vendor[];
  existingVendorIds: number[];
  isLoading?: boolean;
}

const BulkAddVendorsModal: React.FC<BulkAddVendorsModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  vendors,
  existingVendorIds,
  isLoading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendorIds, setSelectedVendorIds] = useState<number[]>([]);

  // Filter out vendors already on the project and apply search filter
  const availableVendors = useMemo(() => {
    return vendors
      .filter(vendor => !existingVendorIds.includes(vendor.id))
      .filter(vendor =>
        vendor.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (vendor.specialty?.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .sort((a, b) => a.company_name.localeCompare(b.company_name));
  }, [vendors, existingVendorIds, searchQuery]);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedVendorIds([]);
    }
  }, [isOpen]);

  const handleToggleVendor = (vendorId: number) => {
    setSelectedVendorIds(prev =>
      prev.includes(vendorId)
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const handleSelectAll = () => {
    if (selectedVendorIds.length === availableVendors.length) {
      // Deselect all
      setSelectedVendorIds([]);
    } else {
      // Select all available vendors
      setSelectedVendorIds(availableVendors.map(v => v.id));
    }
  };

  const handleSubmit = async () => {
    if (selectedVendorIds.length === 0) return;

    await onAdd(selectedVendorIds);
    onClose();
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const isAllSelected = availableVendors.length > 0 && selectedVendorIds.length === availableVendors.length;
  const isSomeSelected = selectedVendorIds.length > 0 && selectedVendorIds.length < availableVendors.length;

  const footerButtons = (
    <div className="flex justify-between items-center w-full">
      <span className="text-sm text-gray-500">
        {selectedVendorIds.length} vendor{selectedVendorIds.length !== 1 ? 's' : ''} selected
      </span>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={handleClose}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="default"
          disabled={isLoading || selectedVendorIds.length === 0}
          onClick={handleSubmit}
        >
          {isLoading ? 'Adding...' : `Add ${selectedVendorIds.length} Vendor${selectedVendorIds.length !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  );

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Vendors to Project"
      description="Select multiple vendors to add to this project"
      footer={footerButtons}
      size="lg"
    >
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search vendors by name or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            disabled={isLoading}
          />
        </div>

        {/* Select All / Summary */}
        <div className="flex items-center justify-between py-2 border-b border-gray-200">
          <label className="flex items-center cursor-pointer">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
              className="h-4 w-4 data-[state=checked]:bg-[#d4af37] data-[state=checked]:border-[#d4af37] data-[state=indeterminate]:bg-[#d4af37] data-[state=indeterminate]:border-[#d4af37]"
              disabled={isLoading || availableVendors.length === 0}
              ref={(ref) => {
                if (ref && isSomeSelected) {
                  (ref as HTMLButtonElement).dataset.state = 'indeterminate';
                }
              }}
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
              Select All ({availableVendors.length} available)
            </span>
          </label>
        </div>

        {/* Vendor List */}
        <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-md">
          {availableVendors.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchQuery
                ? 'No vendors match your search'
                : 'All vendors have already been added to this project'}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {availableVendors.map(vendor => (
                <li
                  key={vendor.id}
                  className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedVendorIds.includes(vendor.id) ? 'bg-amber-50' : ''
                  }`}
                  onClick={() => !isLoading && handleToggleVendor(vendor.id)}
                >
                  <div className="flex items-center">
                    <Checkbox
                      checked={selectedVendorIds.includes(vendor.id)}
                      onCheckedChange={() => handleToggleVendor(vendor.id)}
                      className="h-4 w-4 data-[state=checked]:bg-[#d4af37] data-[state=checked]:border-[#d4af37]"
                      disabled={isLoading}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {vendor.company_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {vendor.specialty && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded">
                            {vendor.specialty}
                          </span>
                        )}
                        {vendor.vendor_type && (
                          <span className="text-gray-400">
                            {vendor.vendor_type}
                          </span>
                        )}
                      </div>
                    </div>
                    {vendor.is_priority && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                        Priority
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Info text */}
        <p className="text-xs text-gray-500">
          Selected vendors will be added with "Pending" status. You can edit individual vendor details after adding.
        </p>
      </div>
    </DialogModal>
  );
};

export default BulkAddVendorsModal;
