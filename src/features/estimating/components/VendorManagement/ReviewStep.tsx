import React from 'react';
import type { Vendor } from '../../../../shared/types';
import type { ContactData } from './VendorCreationWizard';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../shared/components/ui/CardComponent';
import { Button } from '../../../../shared/components/ui/Button';
import { StarIcon as StarSolid, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { PencilIcon } from '@heroicons/react/24/outline';

interface ReviewStepProps {
  vendorData: Partial<Vendor>;
  contacts: ContactData[];
  onEditVendor: () => void;
  onEditContacts: () => void;
}

const ReviewStep: React.FC<ReviewStepProps> = ({
  vendorData,
  contacts,
  onEditVendor,
  onEditContacts
}) => {
  // Helper function for contact type styling
  const getContactTypeStyle = (type: string) => {
    switch (type) {
      case 'Office': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
      case 'General Contractor': return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
      case 'Sales': return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
      case 'Billing': return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
      default: return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
    }
  };

  const formatInsuranceExpiry = (date: string | null) => {
    if (!date) return 'Not provided';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Review & Submit</h3>
        <p className="text-sm text-gray-600">
          Please review the vendor information and contacts before submitting.
        </p>
      </div>

      {/* Vendor Information Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Vendor Information</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onEditVendor}
              className="flex items-center gap-2"
            >
              <PencilIcon className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Company Name</label>
                <p className="text-sm text-gray-900 font-medium">{vendorData.company_name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Vendor Type</label>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    {vendorData.vendor_type}
                  </span>
                </div>
              </div>
              
              {vendorData.specialty && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Specialty</label>
                  <p className="text-sm text-gray-900">{vendorData.specialty}</p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-500">Address</label>
                <p className="text-sm text-gray-900">{vendorData.address}</p>
              </div>
            </div>

            {/* Insurance & Notes */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Insurance Expiry Date</label>
                <p className="text-sm text-gray-900">{formatInsuranceExpiry(vendorData.insurance_expiry_date || null)}</p>
              </div>
              
              {vendorData.insurance_notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Insurance Notes</label>
                  <p className="text-sm text-gray-900">{vendorData.insurance_notes}</p>
                </div>
              )}
              
              {vendorData.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">General Notes</label>
                  <p className="text-sm text-gray-900">{vendorData.notes}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              Contacts {contacts.length > 0 && <span className="text-sm font-normal text-gray-500">({contacts.length})</span>}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onEditContacts}
              className="flex items-center gap-2"
            >
              <PencilIcon className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">No contacts added</p>
              <p className="text-xs text-gray-400 mt-1">
                You can add contacts later from the vendor detail page
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {contacts.map((contact, index) => {
                const typeStyle = getContactTypeStyle(contact.contact_type);
                
                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-gray-900">{contact.contact_name}</h4>
                          
                          {contact.is_primary && (
                            <div className="flex items-center space-x-1">
                              <StarSolid className="h-4 w-4 text-[#d4af37]" />
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-[#d4af37] text-white rounded-full">
                                Primary
                              </span>
                            </div>
                          )}
                          
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                            {contact.contact_type}
                          </span>
                          
                          {contact.is_emergency_contact && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                              <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                              Emergency
                            </span>
                          )}
                        </div>
                        
                        {contact.contact_title && (
                          <p className="text-sm text-gray-600 mb-2">{contact.contact_title}</p>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {contact.phone && (
                            <div>
                              <label className="text-xs font-medium text-gray-500">Phone</label>
                              <p className="text-gray-900">{contact.phone}</p>
                            </div>
                          )}
                          {contact.email && (
                            <div>
                              <label className="text-xs font-medium text-gray-500">Email</label>
                              <p className="text-gray-900">{contact.email}</p>
                            </div>
                          )}
                        </div>
                        
                        {contact.notes && (
                          <div className="mt-2">
                            <label className="text-xs font-medium text-gray-500">Notes</label>
                            <p className="text-sm text-gray-700">{contact.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Contacts:</span>
                  <span className="font-medium">{contacts.length}</span>
                </div>
                {contacts.some(c => c.is_primary) && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-600">Primary Contact:</span>
                    <span className="font-medium text-[#d4af37]">
                      {contacts.find(c => c.is_primary)?.contact_name}
                    </span>
                  </div>
                )}
                {contacts.some(c => c.is_emergency_contact) && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-600">Emergency Contacts:</span>
                    <span className="font-medium text-red-600">
                      {contacts.filter(c => c.is_emergency_contact).length}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Final Confirmation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Ready to create vendor
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Clicking "Create Vendor" will save the vendor information and all contacts. 
                You can always edit this information later from the vendor detail page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewStep;