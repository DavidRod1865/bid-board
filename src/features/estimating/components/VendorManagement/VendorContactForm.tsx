import React, { useState } from 'react';
import type { VendorContact, ContactType } from '../../../../shared/types';
import FormField, { Input, Select, Textarea } from '../../../../shared/components/ui/FormField';
import { Button } from "../../../../shared/components/ui/Button";

interface VendorContactFormProps {
  contact?: Partial<VendorContact>;
  vendorId: number;
  existingContacts?: VendorContact[];
  onSubmit: (contactData: Omit<VendorContact, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const contactTypeOptions = [
  { value: 'Office', label: 'Office' },
  { value: 'General Contractor', label: 'General Contractor' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Billing', label: 'Billing' }
];

const VendorContactForm: React.FC<VendorContactFormProps> = ({
  contact,
  vendorId,
  existingContacts = [],
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    vendor_id: vendorId,
    contact_name: contact?.contact_name || '',
    contact_title: contact?.contact_title || '',
    phone: contact?.phone || '',
    email: contact?.email || '',
    contact_type: (contact?.contact_type || 'Office') as ContactType,
    is_primary: contact?.is_primary || false,
    is_emergency_contact: contact?.is_emergency_contact || false,
    notes: contact?.notes || ''
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

    if (!formData.contact_name.trim()) {
      newErrors.contact_name = 'Contact name is required';
    }

    // Check if trying to set as primary when another primary exists
    if (formData.is_primary && !contact?.id) {
      const hasPrimary = existingContacts.some(c => c.is_primary && c.id !== contact?.id);
      if (hasPrimary) {
        newErrors.is_primary = 'Only one primary contact is allowed per vendor';
      }
    }

    // Email validation if provided
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Contact Name"
          required
          error={errors.contact_name}
        >
          <Input
            value={formData.contact_name}
            onChange={(e) => handleInputChange('contact_name', e.target.value)}
            placeholder="e.g., John Smith"
            disabled={isLoading}
          />
        </FormField>

        <FormField
          label="Job Title"
          error={errors.contact_title}
        >
          <Input
            value={formData.contact_title}
            onChange={(e) => handleInputChange('contact_title', e.target.value)}
            placeholder="e.g., Project Manager"
            disabled={isLoading}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Phone"
          error={errors.phone}
        >
          <Input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="e.g., (555) 123-4567"
            disabled={isLoading}
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
            placeholder="e.g., john@company.com"
            disabled={isLoading}
          />
        </FormField>
      </div>

      <FormField
        label="Contact Type"
        error={errors.contact_type}
      >
        <Select
          value={formData.contact_type}
          onChange={(e) => handleInputChange('contact_type', e.target.value as ContactType)}
          disabled={isLoading}
        >
          {contactTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="is_primary"
            checked={formData.is_primary}
            onChange={(e) => handleInputChange('is_primary', e.target.checked)}
            className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded"
          />
          <label htmlFor="is_primary" className="text-sm font-medium text-gray-700">
            Primary Contact
          </label>
        </div>
        {errors.is_primary && (
          <p className="text-sm text-red-600">{errors.is_primary}</p>
        )}

        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="is_emergency_contact"
            checked={formData.is_emergency_contact}
            onChange={(e) => handleInputChange('is_emergency_contact', e.target.checked)}
            className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded"
          />
          <label htmlFor="is_emergency_contact" className="text-sm font-medium text-gray-700">
            Emergency Contact
          </label>
        </div>
      </div>

      <FormField
        label="Notes"
        error={errors.notes}
      >
        <Textarea
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Additional notes about this contact..."
          rows={3}
          disabled={isLoading}
        />
      </FormField>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
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
          {contact?.id ? 'Update Contact' : 'Add Contact'}
        </Button>
      </div>
    </form>
  );
};

export default VendorContactForm;