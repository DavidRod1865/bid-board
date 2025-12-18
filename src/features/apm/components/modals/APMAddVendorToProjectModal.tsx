import React, { useState } from 'react';
import type { Vendor, BidVendor } from '../../../../shared/types';
import DialogModal from '../../../../shared/components/ui/DialogModal';
import { Input, Select } from '../../../../shared/components/ui/FormField';
import { Button } from "../../../../shared/components/ui/Button";
import { getDefaultAPMFields } from '../../../../shared/utils/bidVendorDefaults';

interface APMAddVendorToProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vendorData: Omit<BidVendor, 'id' | 'bid_id'>) => void;
  vendors: Vendor[];
  existingVendorData?: BidVendor | null;
  getVendorById: (vendorId: number) => Vendor | undefined;
  isLoading?: boolean;
}

const APMAddVendorToProjectModal: React.FC<APMAddVendorToProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  vendors,
  existingVendorData,
  getVendorById,
  isLoading = false
}) => {
  const isEditMode = !!existingVendorData;
  
  const [formData, setFormData] = useState({
    vendor_id: existingVendorData?.vendor_id || 0,
    cost_amount: existingVendorData?.cost_amount || '',
    final_quote_amount: existingVendorData?.final_quote_amount || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data when existing vendor data changes
  React.useEffect(() => {
    if (existingVendorData) {
      setFormData({
        vendor_id: existingVendorData.vendor_id,
        cost_amount: existingVendorData.cost_amount || '',
        final_quote_amount: existingVendorData.final_quote_amount || ''
      });
    } else {
      // Reset form for add mode
      setFormData({
        vendor_id: 0,
        cost_amount: '',
        final_quote_amount: ''
      });
    }
    setErrors({});
  }, [existingVendorData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.vendor_id || formData.vendor_id === 0) {
      newErrors.vendor_id = 'Please select a vendor';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Prepare data for submission
    const hasCostAmount = formData.cost_amount && formData.cost_amount.toString().trim() !== '';
    const hasFinalQuoteAmount = formData.final_quote_amount && formData.final_quote_amount.toString().trim() !== '';
    
    // Use the same pattern as the original modal but with APM-specific overrides
    const vendorData = {
      ...getDefaultAPMFields(),
      vendor_id: formData.vendor_id,
      due_date: null, // APM doesn't use due dates
      response_received_date: null, // APM doesn't track response dates
      status: 'pending',
      follow_up_count: 0,
      last_follow_up_date: null,
      response_notes: null,
      responded_by: null,
      is_priority: false, // APM doesn't use priority flags
      cost_amount: hasCostAmount ? parseFloat(formData.cost_amount.toString()) : null,
      final_quote_amount: hasFinalQuoteAmount ? parseFloat(formData.final_quote_amount.toString()) : null
    };

    onSave(vendorData);
  };

  const handleInputChange = (field: keyof typeof formData, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const selectedVendor = formData.vendor_id ? getVendorById(formData.vendor_id) : null;

  const footerButtons = (
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
        disabled={isLoading}
        onClick={() => document.getElementById('apm-vendor-to-project-form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))}
      >
        {isLoading ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Vendor' : 'Add Vendor')}
      </Button>
    </div>
  );

  return (
    <DialogModal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={isEditMode ? "Edit Project Vendor" : "Add Vendor to Project"}
      footer={footerButtons}
    >
      <form id="apm-vendor-to-project-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Vendor Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Vendor *
          </label>
          <Select
            value={formData.vendor_id.toString()}
            onChange={(e) => handleInputChange('vendor_id', parseInt(e.target.value))}
            disabled={isLoading || isEditMode} // Disable vendor selection in edit mode
          >
            <option value="0">Choose a vendor...</option>
            {vendors.map(vendor => (
              <option key={vendor.id} value={vendor.id.toString()}>
                {vendor.company_name}
              </option>
            ))}
          </Select>
          {errors.vendor_id && <p className="text-red-600 text-sm mt-1">{errors.vendor_id}</p>}
        </div>

        {selectedVendor && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Contact:</span> {
                (selectedVendor as any).primary_contact?.contact_name || 
                selectedVendor.contact_person || 
                'N/A'
              }
            </p>
            {(selectedVendor as any).primary_contact?.contact_title && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Title:</span> {(selectedVendor as any).primary_contact.contact_title}
              </p>
            )}
            <p className="text-sm text-gray-600">
              <span className="font-medium">Email:</span> {
                (selectedVendor as any).primary_contact?.email || 
                selectedVendor.email || 
                'N/A'
              }
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Phone:</span> {
                (selectedVendor as any).primary_contact?.phone || 
                selectedVendor.phone || 
                'N/A'
              }
            </p>
          </div>
        )}

        {/* Original Quote Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Original Quote Amount
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.cost_amount}
            onChange={(e) => handleInputChange('cost_amount', e.target.value)}
            placeholder="Enter original quote amount"
            disabled={isLoading}
          />
        </div>

        {/* Final Quote Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Final Quote Amount
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.final_quote_amount}
            onChange={(e) => handleInputChange('final_quote_amount', e.target.value)}
            placeholder="Enter final quote amount"
            disabled={isLoading}
          />
        </div>


      </form>
    </DialogModal>
  );
};

export default APMAddVendorToProjectModal;