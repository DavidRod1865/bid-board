import React, { useState, useEffect } from 'react';
import type { Vendor, VendorContact, VendorType } from '../../../../shared/types';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../shared/components/ui/CardComponent';
import { Button } from '../../../../shared/components/ui/Button';
import { Input, Textarea, Select } from '../../../../shared/components/ui/FormField';
import AlertDialog from '../../../../shared/components/ui/AlertDialog';
import FileUpload from '../../../../shared/components/ui/FileUpload';
import VendorContactsList from './VendorContactsList';
import { dbOperations } from '../../../../shared/services/supabase';
import { useToast } from '../../../../shared/hooks/useToast';
import { formatDate, getInsuranceStatus, getInsuranceStatusStyle } from './vendorUtils';
import { 
  uploadInsuranceFile, 
  downloadInsuranceFile, 
  deleteInsuranceFile, 
  replaceInsuranceFile,
  formatFileSize,
  validateFile 
} from '../../../../shared/services/fileStorage';
import { 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon, 
  TrashIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  DocumentIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

interface VendorSlideOutContentProps {
  vendor: Vendor;
  onUpdate: (vendorId: number, updates: Partial<Vendor>) => Promise<void>;
  onDelete: (vendorId: number) => Promise<void>;
  onClose: () => void;
  onVendorUpdated?: () => void;
}

const VendorSlideOutContent: React.FC<VendorSlideOutContentProps> = ({
  vendor,
  onUpdate,
  onDelete,
  onClose,
  onVendorUpdated
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contacts, setContacts] = useState<VendorContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState<Partial<Vendor>>({
    company_name: vendor.company_name || '',
    vendor_type: vendor.vendor_type || 'Vendor',
    specialty: vendor.specialty || '',
    contact_person: vendor.contact_person || '',
    phone: vendor.phone || '',
    email: vendor.email || '',
    address: vendor.address || '',
    insurance_expiry_date: vendor.insurance_expiry_date || '',
    insurance_notes: vendor.insurance_notes || '',
    insurance_file_path: vendor.insurance_file_path || null,
    insurance_file_name: vendor.insurance_file_name || null,
    insurance_file_size: vendor.insurance_file_size || null,
    insurance_file_uploaded_at: vendor.insurance_file_uploaded_at || null,
    notes: vendor.notes || '',
  });

  // Fetch vendor contacts
  useEffect(() => {
    const fetchContacts = async () => {
      setContactsLoading(true);
      try {
        const vendorContacts = await dbOperations.getVendorContacts(vendor.id);
        setContacts(vendorContacts);
      } catch {
        showError('Error', 'Failed to load vendor contacts');
      } finally {
        setContactsLoading(false);
      }
    };

    fetchContacts();
  }, [vendor.id, showError]);

  const handleInputChange = (field: keyof Vendor, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setFileUploadError(null);
    
    try {
      let updatedFormData = { ...formData };
      
      // Handle file upload if a new file was selected
      if (selectedFile) {
        setIsUploadingFile(true);
        setUploadProgress(0);
        
        try {
          const fileResult = await (vendor.insurance_file_path 
            ? replaceInsuranceFile(vendor.id, selectedFile, vendor.insurance_file_path, (progress) => {
                setUploadProgress(progress);
              })
            : uploadInsuranceFile(vendor.id, selectedFile, (progress) => {
                setUploadProgress(progress);
              })
          );
          
          // Update form data with file information
          updatedFormData = {
            ...updatedFormData,
            insurance_file_path: fileResult.filePath,
            insurance_file_name: fileResult.fileName,
            insurance_file_size: fileResult.fileSize,
            insurance_file_uploaded_at: fileResult.uploadedAt,
          };
          
          setUploadProgress(100);
        } catch (fileError) {
          const fileErrorMessage = fileError instanceof Error ? fileError.message : 'File upload failed';
          setFileUploadError(fileErrorMessage);
          throw new Error(`File upload failed: ${fileErrorMessage}`);
        } finally {
          setIsUploadingFile(false);
        }
      }
      
      // Update vendor with all form data (including file metadata if uploaded)
      await onUpdate(vendor.id, updatedFormData);
      
      // Reset file upload state
      setSelectedFile(null);
      setFileUploadError(null);
      setUploadProgress(0);
      
      setIsEditing(false);
      showSuccess('Success', selectedFile ? 'Vendor and insurance file updated successfully' : 'Vendor updated successfully');
      
      onVendorUpdated?.();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('Error', `Failed to update vendor: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setIsUploadingFile(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original vendor values
    setFormData({
      company_name: vendor.company_name || '',
      vendor_type: vendor.vendor_type || 'Vendor',
      specialty: vendor.specialty || '',
      contact_person: vendor.contact_person || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      insurance_expiry_date: vendor.insurance_expiry_date || '',
      insurance_notes: vendor.insurance_notes || '',
      insurance_file_path: vendor.insurance_file_path || null,
      insurance_file_name: vendor.insurance_file_name || null,
      insurance_file_size: vendor.insurance_file_size || null,
      insurance_file_uploaded_at: vendor.insurance_file_uploaded_at || null,
      notes: vendor.notes || '',
    });
    
    // Reset file upload state
    setSelectedFile(null);
    setFileUploadError(null);
    setUploadProgress(0);
    setIsUploadingFile(false);
    
    setIsEditing(false);
  };

  // File handling functions
  const handleFileSelect = (file: File) => {
    const validation = validateFile(file);
    if (validation) {
      setFileUploadError(validation.message);
      return;
    }
    
    setSelectedFile(file);
    setFileUploadError(null);
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    setFileUploadError(null);
  };

  const handleDownloadFile = async () => {
    if (!vendor.insurance_file_path || !vendor.insurance_file_name) {
      showError('Error', 'No insurance file available to download');
      return;
    }

    try {
      const blob = await downloadInsuranceFile(vendor.insurance_file_path);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = vendor.insurance_file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSuccess('Success', 'Insurance file downloaded successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Download failed';
      showError('Error', `Failed to download file: ${errorMessage}`);
    }
  };

  const handleDeleteFile = async () => {
    if (!vendor.insurance_file_path) return;

    try {
      setIsLoading(true);
      
      // Delete file from storage
      await deleteInsuranceFile(vendor.insurance_file_path);
      
      // Update vendor to remove file references
      const updatedData = {
        ...formData,
        insurance_file_path: null,
        insurance_file_name: null,
        insurance_file_size: null,
        insurance_file_uploaded_at: null,
      };
      
      await onUpdate(vendor.id, updatedData);
      
      setFormData(updatedData);
      showSuccess('Success', 'Insurance file deleted successfully');
      onVendorUpdated?.();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Deletion failed';
      showError('Error', `Failed to delete file: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(vendor.id);
      
      setShowDeleteModal(false);
      onClose();
      showSuccess('Success', 'Vendor deleted successfully');
      
      // Trigger vendor list refresh
      onVendorUpdated?.();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('Error', `Failed to delete vendor: ${errorMessage}`);
      setShowDeleteModal(false);
    }
  };

  const refreshContacts = async () => {
    try {
      const updatedContacts = await dbOperations.getVendorContacts(vendor.id);
      setContacts(updatedContacts);
    } catch {
      console.error('Error refreshing contacts');
    }
  };

  // Get current insurance status
  const insuranceStatus = getInsuranceStatus(formData.insurance_expiry_date || null);
  const insuranceStyle = getInsuranceStatusStyle(insuranceStatus);

  return (
    <div className="p-6 space-y-6 bg-gray-50">
      {/* Action Bar */}
      <div className="flex items-center justify-between bg-gray-50 -mx-6 -mt-6 px-6 py-4 border-b">
        {!isEditing ? (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2"
            >
              <PencilIcon className="h-4 w-4" />
              Edit Vendor
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:border-red-300"
            >
              <TrashIcon className="h-4 w-4" />
              Delete
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <CheckIcon className="h-4 w-4" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCancel}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <XMarkIcon className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Vendor Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Vendor Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              {isEditing ? (
                <Input
                  type="text"
                  value={formData.company_name || ''}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  placeholder="Company name"
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
        </CardContent>
        <CardContent>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Address
            </label>
            {isEditing ? (
              <Textarea
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={3}
                placeholder="Street address, city, state, zip code"
              />
            ) : (
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                {vendor.address || 'Not provided'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insurance Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Insurance Information
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                <div className="text-sm bg-gray-50 p-2 rounded">
                  {vendor.insurance_expiry_date ? (
                    <div className="flex items-center gap-2">
                      <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
                      <span className={insuranceStyle.text}>
                        {formatDate(vendor.insurance_expiry_date)}
                      </span>
                      {(insuranceStatus === 'expiring' || insuranceStatus === 'expired') && (
                        <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                  ) : (
                    'Not provided'
                  )}
                </div>
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
          
          {/* Insurance File Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Insurance Certificate File
            </label>
            
            {isEditing ? (
              <div className="space-y-4">
                <FileUpload
                  onFileSelect={handleFileSelect}
                  onFileRemove={handleFileRemove}
                  selectedFile={selectedFile}
                  existingFileName={vendor.insurance_file_name}
                  existingFileSize={vendor.insurance_file_size}
                  isUploading={isUploadingFile}
                  uploadProgress={uploadProgress}
                  error={fileUploadError}
                  disabled={isLoading}
                />
                
                {vendor.insurance_file_name && !selectedFile && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <DocumentIcon className="h-5 w-5 text-blue-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-900 truncate">
                        Current file: {vendor.insurance_file_name}
                      </p>
                      <p className="text-xs text-blue-700">
                        {vendor.insurance_file_size && formatFileSize(vendor.insurance_file_size)}
                        {vendor.insurance_file_uploaded_at && ` • Uploaded ${formatDate(vendor.insurance_file_uploaded_at)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadFile}
                        className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteFile}
                        className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                        disabled={isLoading}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {vendor.insurance_file_name ? (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <DocumentIcon className="h-5 w-5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {vendor.insurance_file_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {vendor.insurance_file_size && formatFileSize(vendor.insurance_file_size)}
                        {vendor.insurance_file_uploaded_at && ` • Uploaded ${formatDate(vendor.insurance_file_uploaded_at)}`}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadFile}
                      className="flex items-center gap-2"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                    No insurance certificate file uploaded
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contacts Management */}
      {!isEditing && (
        <Card>
          <CardContent>
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
                  await refreshContacts();
                  showSuccess('Success', 'Contact added successfully');
                  onVendorUpdated?.();
                } catch {
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
                  
                  await refreshContacts();
                  showSuccess('Success', 'Contact updated successfully');
                  onVendorUpdated?.();
                } catch {
                  showError('Error', 'Failed to update contact');
                }
              }}
              onDeleteContact={async (contactId) => {
                try {
                  // Check if we're deleting the primary contact
                  const contactToDelete = contacts.find(c => c.id === contactId);
                  const remainingContacts = contacts.filter(c => c.id !== contactId);
                  
                  if (!contactToDelete) {
                    throw new Error('Contact not found in current contact list');
                  }
                  
                  // If deleting primary contact and there are other contacts,
                  // promote another contact to primary BEFORE deleting
                  if (contactToDelete.is_primary && remainingContacts.length > 0) {
                    const firstRemainingContact = remainingContacts[0];
                    await dbOperations.setPrimaryContact(vendor.id, firstRemainingContact.id);
                  }
                  
                  await dbOperations.deleteVendorContact(contactId);
                  
                  await refreshContacts();
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
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            {isEditing ? (
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
                placeholder="Any additional notes about this vendor..."
              />
            ) : (
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded min-h-[100px] whitespace-pre-wrap">
                {vendor.notes || 'No additional notes'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <AlertDialog
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Vendor"
        message={`Are you sure you want to delete "${vendor.company_name}"? This action cannot be undone.`}
        confirmText="Delete Vendor"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default VendorSlideOutContent;