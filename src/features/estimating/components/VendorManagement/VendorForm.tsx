import React, { useState } from 'react';
import type { Vendor, VendorType } from '../../../../shared/types';
import FormField, { Input, Textarea, Select } from '../../../../shared/components/ui/FormField';
import { Button } from "../../../../shared/components/ui/Button";

interface VendorFormProps {
  vendor?: Partial<Vendor>;
  onSubmit: (vendorData: Omit<Vendor, 'id'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const VendorForm: React.FC<VendorFormProps> = ({
  vendor,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    company_name: vendor?.company_name || '',
    address: vendor?.address || '',
    contact_person: vendor?.contact_person || '',
    phone: vendor?.phone || '',
    email: vendor?.email || '',
    notes: vendor?.notes || '',
    specialty: vendor?.specialty || '',
    is_priority: vendor?.is_priority || false,
    vendor_type: vendor?.vendor_type || 'Vendor' as VendorType,
    insurance_expiry_date: vendor?.insurance_expiry_date || '',
    insurance_notes: vendor?.insurance_notes || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    }

    // Contact fields are now optional since we have VendorContacts table
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit({
        ...formData,
        primary_contact_id: null,  // Will be set later when contact management is used
        insurance_file_path: null,
        insurance_file_name: null,
        insurance_file_size: null,
        insurance_file_uploaded_at: null
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Basic Company Information */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
          Company Information
        </h3>
        
        <FormField
          label="Company Name"
          required
          error={errors.company_name}
        >
          <Input
            type="text"
            value={formData.company_name}
            onChange={(e) => handleInputChange('company_name', e.target.value)}
            placeholder="Enter company name"
            disabled={isLoading}
            className={errors.company_name ? 'border-red-300 focus:border-red-500' : ''}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Vendor Type"
            required
            error={errors.vendor_type}
          >
            <Select
              value={formData.vendor_type}
              onChange={(e) => handleInputChange('vendor_type', e.target.value as VendorType)}
              disabled={isLoading}
              className={errors.vendor_type ? 'border-red-300 focus:border-red-500' : ''}
            >
              <option value="Vendor">Vendor</option>
              <option value="Subcontractor">Subcontractor</option>
              <option value="General Contractor">General Contractor</option>
            </Select>
          </FormField>

          <FormField
            label="Specialty"
            error={errors.specialty}
          >
            <Input
              type="text"
              value={formData.specialty}
              onChange={(e) => handleInputChange('specialty', e.target.value)}
              placeholder="e.g., Electrical, Plumbing"
              disabled={isLoading}
              className={errors.specialty ? 'border-red-300 focus:border-red-500' : ''}
            />
          </FormField>
        </div>

        <FormField
          label="Address"
          required
          error={errors.address}
        >
          <Input
            type="text"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Enter full address"
            disabled={isLoading}
            className={errors.address ? 'border-red-300 focus:border-red-500' : ''}
          />
        </FormField>
      </div>

      {/* Section 2: Legacy Contact Information */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
          Primary Contact <span className="text-sm font-normal text-gray-500">(Optional - use Contact Management below)</span>
        </h3>
        
        <FormField
          label="Contact Person"
          error={errors.contact_person}
        >
          <Input
            type="text"
            value={formData.contact_person}
            onChange={(e) => handleInputChange('contact_person', e.target.value)}
            placeholder="Enter contact person name"
            disabled={isLoading}
            className={errors.contact_person ? 'border-red-300 focus:border-red-500' : ''}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Phone"
            error={errors.phone}
          >
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="(555) 123-4567"
              disabled={isLoading}
              className={errors.phone ? 'border-red-300 focus:border-red-500' : ''}
            />
          </FormField>

          <FormField
            label="Email"
            error={errors.email}
          >
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="contact@company.com"
              disabled={isLoading}
              className={errors.email ? 'border-red-300 focus:border-red-500' : ''}
            />
          </FormField>
        </div>
      </div>

      {/* Section 3: Insurance Information */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
          Insurance Information
        </h3>
        
        <FormField
          label="Insurance Expiry Date"
          error={errors.insurance_expiry_date}
        >
          <Input
            type="date"
            value={formData.insurance_expiry_date}
            onChange={(e) => handleInputChange('insurance_expiry_date', e.target.value)}
            disabled={isLoading}
            className={errors.insurance_expiry_date ? 'border-red-300 focus:border-red-500' : ''}
          />
        </FormField>
      </div>

      {/* Section 4: Additional Notes */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
          Additional Information
        </h3>
        
        <FormField
          label="General Notes"
          error={errors.notes}
        >
          <Textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Additional notes about this vendor..."
            rows={3}
            disabled={isLoading}
            className={errors.notes ? 'border-red-300 focus:border-red-500' : ''}
          />
        </FormField>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="default"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : vendor?.id ? 'Update Vendor' : 'Add Vendor'}
        </Button>
      </div>
    </form>
  );
};

export default VendorForm;