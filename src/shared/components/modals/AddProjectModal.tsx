import React, { useState } from 'react';
import type { Bid, User, Vendor } from '../../types';
import { useUserProfile } from '../../../contexts/UserContext';
import DialogModal from '../ui/DialogModal';
import { Input, Select, Textarea } from '../ui/FormField';
import { Button } from "../ui/Button";
import { Checkbox } from '../ui/checkbox';
import { BID_STATUSES } from '../../utils/constants';
import VendorSelectorPopup from './VendorSelectorPopup';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProject: (projectData: Omit<Bid, 'id'>) => void;
  onCreateProjectWithVendors?: (projectData: Omit<Bid, 'id'>, selectedVendorIds: number[]) => Promise<void>;
  users: User[];
  vendors?: Vendor[];
  isLoading?: boolean;
  defaultDepartment?: 'Estimating' | 'APM';
}

const AddProjectModal: React.FC<AddProjectModalProps> = ({
  isOpen,
  onClose,
  onAddProject,
  onCreateProjectWithVendors,
  users,
  vendors = [],
  isLoading = false,
  defaultDepartment = 'Estimating'
}) => {
  const { userProfile } = useUserProfile();
  
  // Find the database user that matches the current Auth0 user by email
  const getCurrentDatabaseUser = () => {
    if (!userProfile?.email) return null;
    return users.find(user => user.email === userProfile.email) || null;
  };
  
  const getInitialFormData = () => {
    const currentDbUser = getCurrentDatabaseUser();
    return {
      project_name: '',
      project_email: '',
      project_address: '',
      general_contractor: '',
      project_description: '',
      due_date: '',
      status: 'New',
      priority: false,
      file_location: '',
      created_by: currentDbUser?.id || null, // Auto-assign to matched database user
      assign_to: currentDbUser?.id || null // Auto-assign to matched database user
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());
  const [selectedVendors, setSelectedVendors] = useState<Vendor[]>([]);
  const [showVendorSelector, setShowVendorSelector] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Department selection for Admin users
  const getDepartmentForUser = (): 'Estimating' | 'APM' => {
    if (!userProfile?.role) return defaultDepartment;
    
    switch (userProfile.role) {
      case 'Estimating':
        return 'Estimating';
      case 'APM':
        return 'APM';
      case 'Admin':
        return defaultDepartment; // Admin can choose, defaults to route context
      default:
        return defaultDepartment;
    }
  };

  const [selectedDepartment, setSelectedDepartment] = useState<'Estimating' | 'APM'>(getDepartmentForUser());
  const isAdmin = userProfile?.role === 'Admin';

  // Update form data when modal opens or user/users data changes
  React.useEffect(() => {
    if (isOpen) {
      setFormData(formData);
      setSelectedDepartment(getDepartmentForUser());
      setErrors({});
    }
  }, [isOpen, users, userProfile, formData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.project_name.trim()) {
      newErrors.project_name = 'Project name is required';
    }
    if (formData.project_email.trim() && !/\S+@\S+\.\S+/.test(formData.project_email)) {
      newErrors.project_email = 'Please enter a valid email address';
    }
    if (!formData.project_address.trim()) {
      newErrors.project_address = 'Project address is required';
    }
    if (!formData.general_contractor.trim()) {
      newErrors.general_contractor = 'General contractor is required';
    }
    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading || isSubmitting) return;

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Convert due_date to ISO string format and set title = project_name
    const projectData = {
      ...formData,
      title: formData.project_name, // Use project_name as the title
      due_date: new Date(formData.due_date).toISOString(),
      created_by: formData.created_by || null, // Convert empty string to null
      assign_to: formData.assign_to || null, // Convert empty string to null
      estimated_value: 0, // Add default estimated_value
      notes: '', // Add default notes
      archived: false,
      archived_at: null,
      archived_by: null,
      on_hold: false,
      on_hold_at: null,
      on_hold_by: null,
      department: selectedDepartment,
      sent_to_apm: false,
      sent_to_apm_at: null,
      apm_on_hold: false,
      apm_on_hold_at: null,
      apm_archived: false,
      apm_archived_at: null,
      gc_system: null, // Default GC system
      added_to_procore: false // Default Procore status
    };

    try {
      // If vendors are selected and we have the enhanced handler, use it
      if (selectedVendors.length > 0 && onCreateProjectWithVendors) {
        const vendorIds = selectedVendors.map(vendor => vendor.id);
        await onCreateProjectWithVendors(projectData, vendorIds);
      } else {
        // Allow onAddProject to be synchronous or return a promise
        await Promise.resolve(onAddProject(projectData));
      }

      // Reset form after successful submission
      setFormData(getInitialFormData());
      setSelectedVendors([]);
      setErrors({});

      // Close the modal after successful creation
      onClose();
    } catch (err) {
      // Keep the modal open so user can see errors; consider showing toast later
      console.error('Failed to create project', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleClose = () => {
    if (!isLoading && !isSubmitting) {
      onClose();
      // Reset form when closing
      setFormData(getInitialFormData());
      setSelectedVendors([]);
      setErrors({});
    }
  };

  // Vendor handling functions
  const handleVendorSelection = (newSelectedVendors: Vendor[]) => {
    setSelectedVendors(newSelectedVendors);
  };

  const removeVendor = (vendorId: number) => {
    setSelectedVendors(prev => prev.filter(vendor => vendor.id !== vendorId));
  };

  const footerButtons = (
    <div className="flex gap-3">
      <Button
        type="button"
        variant="secondary"
        onClick={handleClose}
        disabled={isLoading || isSubmitting}
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="default"
        disabled={isLoading || isSubmitting}
        onClick={() => document.getElementById('add-project-form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))}
      >
        {isLoading || isSubmitting ? 'Creating...' : 'Create Project'}
      </Button>
    </div>
  );

  return (
    <DialogModal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Add New Project"
      footer={footerButtons}
    >
      <form id="add-project-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Project Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Name *
          </label>
          <Input
            type="text"
            value={formData.project_name}
            onChange={(e) => handleInputChange('project_name', e.target.value)}
            placeholder="Enter project name"
            disabled={isLoading || isSubmitting}
          />
          {errors.project_name && <p className="text-red-600 text-sm mt-1">{errors.project_name}</p>}
        </div>

        {/* Project Email & General Contractor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Email
            </label>
            <Input
              type="email"
              value={formData.project_email}
              onChange={(e) => handleInputChange('project_email', e.target.value)}
              placeholder="Enter project email"
              disabled={isLoading || isSubmitting}
            />
            {errors.project_email && <p className="text-red-600 text-sm mt-1">{errors.project_email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              General Contractor *
            </label>
            <Input
              type="text"
              value={formData.general_contractor}
              onChange={(e) => handleInputChange('general_contractor', e.target.value)}
              placeholder="Enter contractor name"
              disabled={isLoading || isSubmitting}
            />
            {errors.general_contractor && <p className="text-red-600 text-sm mt-1">{errors.general_contractor}</p>}
          </div>
        </div>

        {/* Project Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Address *
          </label>
          <Input
            type="text"
            value={formData.project_address}
            onChange={(e) => handleInputChange('project_address', e.target.value)}
            placeholder="Enter project address"
            disabled={isLoading || isSubmitting}
          />
          {errors.project_address && <p className="text-red-600 text-sm mt-1">{errors.project_address}</p>}
        </div>

        {/* Status, Due Date, Priority */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <Select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              disabled={isLoading || isSubmitting}
            >
              {BID_STATUSES.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date *
            </label>
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) => handleInputChange('due_date', e.target.value)}
              disabled={isLoading || isSubmitting}
            />
            {errors.due_date && <p className="text-red-600 text-sm mt-1">{errors.due_date}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File Location
            </label>
            <Input
              type="text"
              value={formData.file_location}
              onChange={(e) => handleInputChange('file_location', e.target.value)}
              placeholder="Enter file location"
              disabled={isLoading || isSubmitting}
            />
          </div>
        </div>

        {/* Priority Checkbox */}
        <div>
          <label className="flex items-center">
            <Checkbox
              checked={formData.priority}
              onCheckedChange={(checked) => handleInputChange('priority', checked as boolean)}
              className="h-4 w-4 data-[state=checked]:bg-[#d4af37] data-[state=checked]:border-[#d4af37] focus-visible:ring-[#d4af37]/50"
              disabled={isLoading || isSubmitting}
            />
            <span className="ml-2 block text-sm text-gray-700">
              Mark as priority project
            </span>
          </label>
        </div>

        {/* Assign To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assign To
          </label>
          <Select
            value={formData.assign_to || ''}
            onChange={(e) => handleInputChange('assign_to', e.target.value)}
            disabled={isLoading || isSubmitting}
          >
            <option value="">Select user...</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Project Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Description
          </label>
          <Textarea
            value={formData.project_description}
            onChange={(e) => handleInputChange('project_description', e.target.value)}
            placeholder="Enter project description"
            rows={3}
            disabled={isLoading || isSubmitting}
          />
        </div>

        {/* Vendor Assignment Section */}
        {vendors.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vendor Assignment
            </label>
            
            {/* Add Vendors Button */}
            <div className="mb-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowVendorSelector(true)}
                disabled={isLoading || isSubmitting}
              >
                Add Vendors ({selectedVendors.length} selected)
              </Button>
            </div>

            {/* Selected Vendors Table */}
            {selectedVendors.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Selected Vendors
                </h4>
                <div className="space-y-2">
                  {selectedVendors.map(vendor => (
                    <div 
                      key={vendor.id}
                      className="flex items-center justify-between bg-white border border-gray-200 rounded px-3 py-2"
                    >
                      <span className="text-sm text-gray-900">
                        {vendor.company_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeVendor(vendor.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                        disabled={isLoading || isSubmitting}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Vendors will be assigned with default settings (status: pending, priority: normal)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Department Selector - Admin Only */}
        {isAdmin && (
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department Assignment (Admin)
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="department"
                  value="Estimating"
                  checked={selectedDepartment === 'Estimating'}
                  onChange={(e) => setSelectedDepartment(e.target.value as 'Estimating' | 'APM')}
                  disabled={isLoading || isSubmitting}
                  className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Estimating</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="department"
                  value="APM"
                  checked={selectedDepartment === 'APM'}
                  onChange={(e) => setSelectedDepartment(e.target.value as 'Estimating' | 'APM')}
                  disabled={isLoading || isSubmitting}
                  className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">APM</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Choose which department this project belongs to
            </p>
          </div>
        )}

      </form>

      {/* Vendor Selector Popup */}
      <VendorSelectorPopup
        isOpen={showVendorSelector}
        onClose={() => setShowVendorSelector(false)}
        vendors={vendors}
        selectedVendors={selectedVendors}
        onVendorsSelected={handleVendorSelection}
      />
    </DialogModal>
  );
};

export default AddProjectModal;