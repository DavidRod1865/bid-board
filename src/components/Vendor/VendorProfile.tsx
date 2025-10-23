import React from 'react';
import type { Vendor } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Input, Textarea } from '../ui/FormField';

interface VendorProfileProps {
  vendor: Vendor;
  formData: Partial<Vendor>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Vendor>>>;
  isEditing: boolean;
}

const VendorProfile: React.FC<VendorProfileProps> = ({
  vendor,
  formData,
  setFormData,
  isEditing
}) => {
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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