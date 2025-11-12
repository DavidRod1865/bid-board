import React, { useState, useEffect } from 'react';
import type { Vendor, VendorContact, VendorType } from '../../../../shared/types';
import { Card, CardHeader, CardTitle, CardContent } from "../../../../shared/components/ui/CardComponent";
import { Input, Textarea, Select } from '../../../../shared/components/ui/FormField';
import VendorContactsList from './VendorContactsList';
import { dbOperations } from '../../../../shared/services/supabase';
import { useToast } from '../../../../shared/hooks/useToast';

interface VendorProfileProps {
  vendor: Vendor;
  formData: Partial<Vendor>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Vendor>>>;
  isEditing: boolean;
  onVendorUpdated?: () => void;
}

const VendorProfile: React.FC<VendorProfileProps> = ({
  vendor,
  formData,
  setFormData,
  isEditing,
  onVendorUpdated
}) => {
  const [contacts, setContacts] = useState<VendorContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  // Fetch vendor contacts
  useEffect(() => {
    const fetchContacts = async () => {
      if (!vendor?.id) return;
      
      setContactsLoading(true);
      try {
        const vendorContacts = await dbOperations.getVendorContacts(vendor.id);
        setContacts(vendorContacts);
      } catch (error) {
        console.error('Error fetching vendor contacts:', error);
        showError('Error', 'Failed to load vendor contacts');
      } finally {
        setContactsLoading(false);
      }
    };

    fetchContacts();
  }, [vendor?.id, showError]);
  const handleInputChange = (field: keyof Vendor, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Vendor Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
        {/* Company Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            {isEditing ? (
              <Input
                type="text"
                value={formData.company_name || ''}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
              />
            ) : (
              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                {vendor.company_name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vendor Type
            </label>
            {isEditing ? (
              <Select
                value={formData.vendor_type || 'Vendor'}
                onChange={(e) => handleInputChange('vendor_type', e.target.value as VendorType)}
              >
                <option value="Vendor">Vendor</option>
                <option value="Subcontractor">Subcontractor</option>
                <option value="General Contractor">General Contractor</option>
              </Select>
            ) : (
              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                {vendor.vendor_type || 'Vendor'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specialty
            </label>
            {isEditing ? (
              <Input
                type="text"
                value={formData.specialty || ''}
                onChange={(e) => handleInputChange('specialty', e.target.value)}
                placeholder="e.g., Electrical, Plumbing, HVAC"
              />
            ) : (
              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                {vendor.specialty || 'Not specified'}
              </p>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Person
              </label>
              {isEditing ? (
                <Input
                  type="text"
                  value={formData.contact_person || ''}
                  onChange={(e) => handleInputChange('contact_person', e.target.value)}
                />
              ) : (
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {vendor.contact_person || 'Not provided'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              {isEditing ? (
                <Input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              ) : (
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {vendor.phone ? (
                    <a href={`tel:${vendor.phone}`} className="text-blue-600 hover:underline">
                      {vendor.phone}
                    </a>
                  ) : (
                    'Not provided'
                  )}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              {isEditing ? (
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              ) : (
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {vendor.email ? (
                    <a href={`mailto:${vendor.email}`} className="text-blue-600 hover:underline">
                      {vendor.email}
                    </a>
                  ) : (
                    'Not provided'
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Address
            </label>
            {isEditing ? (
              <Textarea
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={3}
              />
            ) : (
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                {vendor.address || 'Not provided'}
              </p>
            )}
          </div>
        </div>

        {/* Insurance Information */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Insurance Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Insurance Expiry Date
              </label>
              {isEditing ? (
                <Input
                  type="date"
                  value={formData.insurance_expiry_date || ''}
                  onChange={(e) => handleInputChange('insurance_expiry_date', e.target.value)}
                />
              ) : (
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {vendor.insurance_expiry_date ? 
                    new Date(vendor.insurance_expiry_date).toLocaleDateString() : 
                    'Not provided'
                  }
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Insurance Notes
              </label>
              {isEditing ? (
                <Textarea
                  value={formData.insurance_notes || ''}
                  onChange={(e) => handleInputChange('insurance_notes', e.target.value)}
                  rows={3}
                  placeholder="Insurance provider, policy details..."
                />
              ) : (
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                  {vendor.insurance_notes || 'No insurance notes'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Contact Management */}
        {!isEditing && (
          <div className="border-t pt-6">
            <VendorContactsList
              contacts={contacts}
              vendorId={vendor.id}
              onAddContact={async (contactData) => {
                try {
                  // If this is the first contact for the vendor, automatically make it primary
                  const isFirstContact = contacts.length === 0;
                  const finalContactData = {
                    ...contactData,
                    is_primary: isFirstContact ? true : contactData.is_primary
                  };
                  
                  await dbOperations.createVendorContact(finalContactData);
                  // Refresh contacts
                  const updatedContacts = await dbOperations.getVendorContacts(vendor.id);
                  setContacts(updatedContacts);
                  showSuccess('Success', 'Contact added successfully');
                  onVendorUpdated?.();
                } catch (error) {
                  console.error('Error adding contact:', error);
                  showError('Error', 'Failed to add contact');
                }
              }}
              onUpdateContact={async (contactId, contactData) => {
                try {
                  // Check if primary status is being changed to true
                  if (contactData.is_primary === true) {
                    // Find the current contact to see if primary status is actually changing
                    const currentContact = contacts.find(c => c.id === contactId);
                    
                    if (!currentContact?.is_primary) {
                      // Primary status is changing from false to true
                      // Use safe setPrimaryContact method to handle the transition
                      await dbOperations.setPrimaryContact(vendor.id, contactId);
                      
                      // Update other fields if there are any (excluding is_primary which was handled above)
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const { is_primary, ...otherFields } = contactData;
                      if (Object.keys(otherFields).length > 0) {
                        await dbOperations.updateVendorContact(contactId, otherFields);
                      }
                    } else {
                      // Contact is already primary, just update other fields
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const { is_primary, ...otherFields } = contactData;
                      if (Object.keys(otherFields).length > 0) {
                        await dbOperations.updateVendorContact(contactId, otherFields);
                      }
                    }
                  } else {
                    // Not setting as primary, safe to use regular update
                    await dbOperations.updateVendorContact(contactId, contactData);
                  }
                  
                  // Refresh contacts
                  const updatedContacts = await dbOperations.getVendorContacts(vendor.id);
                  setContacts(updatedContacts);
                  showSuccess('Success', 'Contact updated successfully');
                  onVendorUpdated?.();
                } catch (error) {
                  console.error('Error updating contact:', error);
                  showError('Error', 'Failed to update contact');
                }
              }}
              onDeleteContact={async (contactId) => {
                try {
                  console.log('Starting contact deletion for contactId:', contactId);
                  
                  // Check if we're deleting the primary contact
                  const contactToDelete = contacts.find(c => c.id === contactId);
                  const remainingContacts = contacts.filter(c => c.id !== contactId);
                  
                  console.log('Contact to delete:', contactToDelete);
                  console.log('Remaining contacts:', remainingContacts.length);
                  
                  if (!contactToDelete) {
                    throw new Error('Contact not found in current contact list');
                  }
                  
                  // If deleting primary contact and there are other contacts,
                  // promote another contact to primary BEFORE deleting
                  if (contactToDelete.is_primary && remainingContacts.length > 0) {
                    console.log('Promoting new primary contact before deletion');
                    const firstRemainingContact = remainingContacts[0];
                    await dbOperations.setPrimaryContact(vendor.id, firstRemainingContact.id);
                    console.log('Successfully promoted contact', firstRemainingContact.id, 'to primary');
                  }
                  
                  console.log('Deleting contact...');
                  await dbOperations.deleteVendorContact(contactId);
                  console.log('Contact deleted successfully');
                  
                  // Refresh contacts
                  const updatedContacts = await dbOperations.getVendorContacts(vendor.id);
                  setContacts(updatedContacts);
                  showSuccess('Success', 'Contact deleted successfully');
                  onVendorUpdated?.();
                } catch (error) {
                  console.error('Contact deletion failed:', error);
                  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                  showError('Error', `Failed to delete contact: ${errorMessage}`);
                }
              }}
              isLoading={contactsLoading}
            />
          </div>
        )}

        {/* Notes */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Information
            </label>
            {isEditing ? (
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
                placeholder="Any additional notes about this vendor..."
              />
            ) : (
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded min-h-[100px]">
                {vendor.notes || 'No additional notes'}
              </p>
            )}
          </div>
        </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VendorProfile;