import React, { useState } from 'react';
import type { ContactData } from './VendorCreationWizard';
import FormField, { Input, Select, Textarea } from '../../../../shared/components/ui/FormField';
import { Button } from "../../../../shared/components/ui/Button";

interface ContactWizardFormProps {
  contact?: ContactData;
  existingContacts?: ContactData[];
  onSubmit: (contactData: ContactData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const contactTypeOptions = [
  { value: 'Office', label: 'Office' },
  { value: 'General Contractor', label: 'General Contractor' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Billing', label: 'Billing' }
];

const ContactWizardForm: React.FC<ContactWizardFormProps> = ({
  contact,
  existingContacts = [],
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<ContactData>({
    contact_name: contact?.contact_name || '',
    contact_title: contact?.contact_title || '',
    phone: contact?.phone || '',
    email: contact?.email || '',
    contact_type: contact?.contact_type || 'Office',
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

    if (!formData.contact_type) {
      newErrors.contact_type = 'Contact type is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Check for primary contact conflicts
    if (formData.is_primary) {
      const otherPrimaryContacts = existingContacts.filter(
        (c, index) => c.is_primary && (!contact || existingContacts.indexOf(contact) !== index)
      );
      
      if (otherPrimaryContacts.length > 0) {
        newErrors.is_primary = 'Only one primary contact is allowed. Another contact is already set as primary.';
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
      {/* Basic Information */}
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
            value={formData.contact_title || ''}
            onChange={(e) => handleInputChange('contact_title', e.target.value)}
            placeholder="e.g., Project Manager"
            disabled={isLoading}
          />
        </FormField>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Phone"
          error={errors.phone}
        >
          <Input
            type="tel"
            value={formData.phone || ''}
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
            value={formData.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="e.g., john@company.com"
            disabled={isLoading}
          />
        </FormField>
      </div>

      {/* Contact Type */}
      <FormField
        label="Contact Type"
        error={errors.contact_type}
      >
        <Select
          value={formData.contact_type}
          onChange={(e) => handleInputChange('contact_type', e.target.value)}
          disabled={isLoading}
        >
          {contactTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      {/* Contact Designations */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900">Contact Designations</h4>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="is_primary"
              checked={formData.is_primary}
              onChange={(e) => handleInputChange('is_primary', e.target.checked)}
              className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded mt-0.5"
              disabled={isLoading}
            />
            <div className="flex-1">
              <label htmlFor="is_primary" className="text-sm font-medium text-gray-700">
                Primary Contact
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Main point of contact for this vendor (only one allowed)
              </p>
              {errors.is_primary && (
                <p className="text-xs text-red-600 mt-1">{errors.is_primary}</p>
              )}
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="is_emergency_contact"
              checked={formData.is_emergency_contact}
              onChange={(e) => handleInputChange('is_emergency_contact', e.target.checked)}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded mt-0.5"
              disabled={isLoading}
            />
            <div className="flex-1">
              <label htmlFor="is_emergency_contact" className="text-sm font-medium text-gray-700">
                Emergency Contact
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Contact for urgent matters (multiple allowed)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <FormField
        label="Notes"
        error={errors.notes}
      >
        <Textarea
          value={formData.notes || ''}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Additional notes about this contact..."
          rows={3}
          disabled={isLoading}
        />
      </FormField>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
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
          {isLoading ? 'Saving...' : contact ? 'Update Contact' : 'Add Contact'}
        </Button>
      </div>
    </form>
  );
};

export default ContactWizardForm;