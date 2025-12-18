import React, { useState } from 'react';
import type { Vendor, BidVendor } from '../../../../shared/types';
import DialogModal from '../../../../shared/components/ui/DialogModal';
import { Input, Select } from '../../../../shared/components/ui/FormField';
import { Button } from "../../../../shared/components/ui/Button";
import { Checkbox } from '../../../../shared/components/ui/checkbox';
import { getDefaultAPMFields } from '../../../../shared/utils/bidVendorDefaults';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../shared/components/ui/popover';
import { Calendar } from '../../../../shared/components/ui/calendar';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface AddVendorToProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vendorData: Omit<BidVendor, 'id' | 'bid_id'>) => void;
  vendors: Vendor[];
  existingVendorData?: BidVendor | null;
  getVendorById: (vendorId: number) => Vendor | undefined;
  isLoading?: boolean;
}

const AddVendorToProjectModal: React.FC<AddVendorToProjectModalProps> = ({
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
    due_date: existingVendorData?.due_date || '',
    response_received_date: existingVendorData?.response_received_date || '',
    status: existingVendorData?.status || 'pending',
    is_priority: existingVendorData?.is_priority || false,
    cost_amount: existingVendorData?.cost_amount || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data when existing vendor data changes
  React.useEffect(() => {
    if (existingVendorData) {
      setFormData({
        vendor_id: existingVendorData.vendor_id,
        due_date: existingVendorData.due_date ? new Date(existingVendorData.due_date).toISOString().split('T')[0] : '',
        response_received_date: existingVendorData.response_received_date ? new Date(existingVendorData.response_received_date).toISOString().split('T')[0] : '',
        status: existingVendorData.status,
        is_priority: existingVendorData.is_priority || false,
        cost_amount: existingVendorData.cost_amount || ''
      });
    } else {
      // Reset form for add mode
      setFormData({
        vendor_id: 0,
        due_date: '',
        response_received_date: '',
        status: 'pending',
        is_priority: false,
        cost_amount: ''
      });
    }
    setErrors({});
  }, [existingVendorData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.vendor_id || formData.vendor_id === 0) {
      newErrors.vendor_id = 'Please select a vendor';
    }


    // If cost amount is provided, response date is required
    // If no cost amount, response date will be automatically cleared
    if (formData.cost_amount && formData.cost_amount.toString().trim() !== '' && !formData.response_received_date) {
      newErrors.response_received_date = 'Response date is required when cost amount is provided';
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
    
    const vendorData = {
      vendor_id: formData.vendor_id,
      due_date: formData.due_date ? new Date(formData.due_date + 'T00:00:00').toISOString() : null,
      // Clear response_received_date if no cost_amount is provided
      response_received_date: hasCostAmount && formData.response_received_date ? new Date(formData.response_received_date + 'T00:00:00').toISOString() : null,
      status: formData.status,
      follow_up_count: 0,
      last_follow_up_date: null,
      response_notes: null,
      responded_by: null,
      is_priority: formData.is_priority,
      cost_amount: hasCostAmount ? parseFloat(formData.cost_amount.toString()) : null,
      ...getDefaultAPMFields()
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
        onClick={() => document.getElementById('vendor-to-project-form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))}
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
      <form id="vendor-to-project-form" onSubmit={handleSubmit} className="space-y-6">
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

        {/* Cost Amount and Due Date - Side by Side */}
        <div className="grid grid-cols-2 gap-4">
          {/* Cost Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cost Amount
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.cost_amount}
              onChange={(e) => handleInputChange('cost_amount', e.target.value)}
              placeholder="Enter cost amount"
              disabled={isLoading}
            />
          </div>

          {/* Cost Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cost Due Date
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={isLoading}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed text-left"
                >
                  <span className={formData.due_date ? 'text-gray-900' : 'text-gray-500'}>
                    {formData.due_date ? format(new Date(formData.due_date + 'T12:00:00Z'), 'MMM d, yyyy') : 'Select date'}
                  </span>
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.due_date ? new Date(formData.due_date + 'T12:00:00Z') : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const year = date.getUTCFullYear();
                      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                      const day = String(date.getUTCDate()).padStart(2, '0');
                      handleInputChange('due_date', `${year}-${month}-${day}`);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Priority and Status - Side by Side */}
        <div className="grid grid-cols-2 gap-4">
          {/* Priority Checkbox */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <label className="flex items-center h-[38px] px-3 border border-gray-300 rounded-md bg-white">
              <Checkbox
                checked={formData.is_priority}
                onCheckedChange={(checked) => handleInputChange('is_priority', checked as boolean)}
                className="h-4 w-4 data-[state=checked]:bg-[#d4af37] data-[state=checked]:border-[#d4af37] focus-visible:ring-[#d4af37]/50"
                disabled={isLoading}
              />
              <span className="ml-2 block text-sm text-gray-700">
                Mark as priority
              </span>
            </label>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <Select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              disabled={isLoading}
            >
              <option value="pending">Pending</option>
              <option value="no bid">No Bid</option>
              <option value="yes bid">Yes Bid</option>
            </Select>
          </div>
        </div>

        {/* Response Date (shows when cost amount is provided) */}
        {formData.cost_amount && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Response Received Date *
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={isLoading}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed text-left"
                >
                  <span className={formData.response_received_date ? 'text-gray-900' : 'text-gray-500'}>
                    {formData.response_received_date ? format(new Date(formData.response_received_date + 'T12:00:00Z'), 'MMM d, yyyy') : 'Select date'}
                  </span>
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.response_received_date ? new Date(formData.response_received_date + 'T12:00:00Z') : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const year = date.getUTCFullYear();
                      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                      const day = String(date.getUTCDate()).padStart(2, '0');
                      handleInputChange('response_received_date', `${year}-${month}-${day}`);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
            {errors.response_received_date && <p className="text-red-600 text-sm mt-1">{errors.response_received_date}</p>}
          </div>
        )}

      </form>
    </DialogModal>
  );
};

export default AddVendorToProjectModal;