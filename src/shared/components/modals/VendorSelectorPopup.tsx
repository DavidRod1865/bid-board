import React, { useState, useMemo, useRef } from 'react';
import type { Vendor } from '../../types';
import DialogModal from '../ui/DialogModal';
import { Input } from '../ui/FormField';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/checkbox';

interface VendorSelectorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  vendors: Vendor[];
  selectedVendors: Vendor[];
  onVendorsSelected: (vendors: Vendor[]) => void;
}

const VendorSelectorPopup: React.FC<VendorSelectorPopupProps> = ({
  isOpen,
  onClose,
  vendors,
  selectedVendors,
  onVendorsSelected
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tempSelectedVendors, setTempSelectedVendors] = useState<Vendor[]>([]);
  const initializedRef = useRef(false);
  const selectedVendorsAtOpenRef = useRef<Vendor[]>([]);

  // Initialize temp selection when modal opens
  React.useEffect(() => {
    if (isOpen && !initializedRef.current) {
      selectedVendorsAtOpenRef.current = selectedVendors;
      setTempSelectedVendors(selectedVendors);
      setSearchTerm('');
      initializedRef.current = true;
    } else if (!isOpen && initializedRef.current) {
      // Reset when modal closes
      initializedRef.current = false;
    }
  }, [isOpen, selectedVendors]);

  // Filter vendors based on search term
  const filteredVendors = useMemo(() => {
    if (!searchTerm) return vendors;
    
    const search = searchTerm.toLowerCase();
    return vendors.filter(vendor => 
      vendor.company_name.toLowerCase().includes(search) ||
      (vendor.specialty && vendor.specialty.toLowerCase().includes(search))
    );
  }, [vendors, searchTerm]);

  // Check if a vendor is selected
  const isVendorSelected = (vendor: Vendor) => {
    return tempSelectedVendors.some(selected => selected.id === vendor.id);
  };

  // Toggle vendor selection
  const toggleVendor = (vendor: Vendor) => {
    setTempSelectedVendors(prev => {
      const isSelected = prev.some(v => v.id === vendor.id);
      if (isSelected) {
        return prev.filter(v => v.id !== vendor.id);
      } else {
        return [...prev, vendor];
      }
    });
  };

  // Select all filtered vendors
  const selectAll = () => {
    setTempSelectedVendors(prev => {
      const newSelections = filteredVendors.filter(vendor => 
        !prev.some(selected => selected.id === vendor.id)
      );
      return [...prev, ...newSelections];
    });
  };

  // Clear all selections
  const clearAll = () => {
    setTempSelectedVendors([]);
  };

  // Handle vendor selection save
  const handleSave = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onVendorsSelected(tempSelectedVendors);
    onClose();
  };

  // Handle vendor selection cancel
  const handleCancel = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTempSelectedVendors(selectedVendors);
    onClose();
  };

  const footerButtons = (
    <div className="flex gap-3">
      <Button
        type="button"
        variant="secondary"
        onClick={handleCancel}
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="default"
        onClick={handleSave}
      >
        Add Selected ({tempSelectedVendors.length})
      </Button>
    </div>
  );

  return (
    <DialogModal 
      isOpen={isOpen} 
      onClose={() => handleCancel()}
      title="Select Vendors"
      footer={footerButtons}
      size="sm"
    >
      <div className="space-y-4">
        {/* Search Bar */}
        <div>
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              e.stopPropagation();
              setSearchTerm(e.target.value);
            }}
            placeholder="Search vendors by company name or specialty..."
            className="w-full"
          />
        </div>

        {/* Bulk Actions */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => selectAll()}
              disabled={filteredVendors.length === 0}
            >
              Select All
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => clearAll()}
              disabled={tempSelectedVendors.length === 0}
            >
              Clear All
            </Button>
          </div>
          <span className="text-sm text-gray-600">
            {tempSelectedVendors.length} selected
          </span>
        </div>

        {/* Vendor List */}
        <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
          {filteredVendors.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchTerm ? 'No vendors found matching your search' : 'No vendors available'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredVendors.map(vendor => (
                <div 
                  key={vendor.id}
                  className="p-3 hover:bg-gray-50 cursor-pointer flex items-start gap-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVendor(vendor);
                  }}
                >
                  <div className="pt-0.5">
                    <Checkbox
                      checked={isVendorSelected(vendor)}
                      onCheckedChange={() => toggleVendor(vendor)}
                      className="h-4 w-4 data-[state=checked]:bg-[#d4af37] data-[state=checked]:border-[#d4af37] focus-visible:ring-[#d4af37]/50"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {vendor.company_name}
                    </div>
                    {vendor.specialty && (
                      <div className="text-sm text-gray-500 truncate">
                        {vendor.specialty}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        {tempSelectedVendors.length > 0 && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>{tempSelectedVendors.length}</strong> vendor{tempSelectedVendors.length !== 1 ? 's' : ''} will be assigned to this project with default settings (status: pending, priority: normal).
            </p>
          </div>
        )}
      </div>
    </DialogModal>
  );
};

export default VendorSelectorPopup;