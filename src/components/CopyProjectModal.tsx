import React, { useState } from 'react';
import type { Bid, User } from '../types';
import { useUserProfile } from '../contexts/UserContext';
import DialogModal from './ui/DialogModal';
import { Input, Select, Textarea } from './ui/FormField';
import Button from "./ui/Button";
import { Checkbox } from './ui/checkbox';
import { BID_STATUSES } from '../utils/constants';

interface CopyProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopyProject: (originalProjectId: number, newProjectData: Omit<Bid, 'id'>) => void;
  bids: Bid[];
  users: User[];
  isLoading?: boolean;
}

const CopyProjectModal: React.FC<CopyProjectModalProps> = ({
  isOpen,
  onClose,
  onCopyProject,
  bids,
  users,
  isLoading = false
}) => {
  const { userProfile } = useUserProfile();
  
  // Find the database user that matches the current Auth0 user by email
  const getCurrentDatabaseUser = () => {
    if (!userProfile?.email) return null;
    return users.find(user => user.email === userProfile.email) || null;
  };
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  
  const getInitialFormData = () => {
    const currentDbUser = getCurrentDatabaseUser();
    return {
      title: '',
      project_name: '',
      project_email: '',
      project_address: '',
      general_contractor: '',
      project_description: '',
      due_date: '',
      status: 'New',
      priority: false,
      file_location: '',
      notes: '',
      created_by: currentDbUser?.id || null,
      assign_to: currentDbUser?.id || null
    };
  };
  
  const [formData, setFormData] = useState(getInitialFormData());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedProject = selectedProjectId ? bids.find(bid => bid.id === selectedProjectId) : null;

  const handleProjectSelect = (projectId: string) => {
    const id = parseInt(projectId);
    const project = bids.find(bid => bid.id === id);
    
    if (project) {
      setSelectedProjectId(id);
      const currentDbUser = getCurrentDatabaseUser();
      // Pre-fill form with selected project data
      setFormData({
        title: `Copy of ${project.project_name}`,
        project_name: `Copy of ${project.project_name}`,
        project_email: project.project_email || '',
        project_address: project.project_address || '',
        general_contractor: project.general_contractor || '',
        project_description: project.project_description || '',
        due_date: '', // Clear due date for new project
        status: 'New', // Reset to New status
        priority: project.priority,
        file_location: project.file_location || '',
        notes: project.notes || '',
        created_by: currentDbUser?.id || null,
        assign_to: currentDbUser?.id || null // Auto-assign to current user
      });
      setErrors({});
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedProjectId) {
      newErrors.project = 'Please select a project to copy';
    }
    if (!formData.title.trim()) {
      newErrors.title = 'Project title is required';
    }
    if (!formData.project_name.trim()) {
      newErrors.project_name = 'Project name is required';
    }
    if (formData.project_email.trim() && !/\S+@\S+\.\S+/.test(formData.project_email)) {
      newErrors.project_email = 'Please enter a valid email address';
    }
    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const projectData = {
      ...formData,
      title: formData.project_name, // Set title = project_name
      due_date: new Date(formData.due_date).toISOString(),
      created_by: formData.created_by || null, // Convert empty string to null
      assign_to: formData.assign_to || null, // Convert empty string to null
      file_location: formData.file_location || null, // Use form file_location
      estimated_value: 0, // Set default estimated value
      archived: false,
      archived_at: null,
      archived_by: null,
      on_hold: false,
      on_hold_at: null,
      on_hold_by: null,
    };

    onCopyProject(selectedProjectId!, projectData);
    
    // Reset form
    setSelectedProjectId(null);
    setFormData(getInitialFormData());
    setErrors({});
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
      // Reset form when closing
      setSelectedProjectId(null);
      setFormData(getInitialFormData());
      setErrors({});
    }
  };

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
        variant="primary"
        disabled={isLoading || !selectedProjectId}
        onClick={() => document.getElementById('copy-project-form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))}
      >
        {isLoading ? 'Copying...' : 'Copy Project'}
      </Button>
    </div>
  );

  return (
    <DialogModal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Copy Project"
      footer={footerButtons}
    >
      <form id="copy-project-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Project Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Project to Copy *
          </label>
          <Select
            value={selectedProjectId?.toString() || ''}
            onChange={(e) => handleProjectSelect(e.target.value)}
            disabled={isLoading}
          >
            <option value="">Choose a project to copy...</option>
            {bids.map(bid => (
              <option key={bid.id} value={bid.id.toString()}>
                {bid.project_name}
              </option>
            ))}
          </Select>
          {errors.project && <p className="text-red-600 text-sm mt-1">{errors.project}</p>}
        </div>

        {selectedProject && (
          <>
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
                disabled={isLoading}
              />
              {errors.project_name && <p className="text-red-600 text-sm mt-1">{errors.project_name}</p>}
            </div>

            {/* Project Email & Due Date */}
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
                  disabled={isLoading}
                />
                {errors.project_email && <p className="text-red-600 text-sm mt-1">{errors.project_email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Due Date *
                </label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleInputChange('due_date', e.target.value)}
                  disabled={isLoading}
                />
                {errors.due_date && <p className="text-red-600 text-sm mt-1">{errors.due_date}</p>}
              </div>
            </div>

            {/* Status & File Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <Select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  disabled={isLoading}
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
                  File Location
                </label>
                <Input
                  type="text"
                  value={formData.file_location}
                  onChange={(e) => handleInputChange('file_location', e.target.value)}
                  placeholder="Enter file location or path"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="flex items-center">
                <Checkbox
                  checked={formData.priority}
                  onCheckedChange={(checked) => handleInputChange('priority', checked as boolean)}
                  className="h-4 w-4 data-[state=checked]:bg-[#d4af37] data-[state=checked]:border-[#d4af37] focus-visible:ring-[#d4af37]/50"
                  disabled={isLoading}
                />
                <span className="ml-2 block text-sm text-gray-700">
                  Mark as priority project
                </span>
              </label>
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
                disabled={isLoading}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Enter additional notes"
                rows={3}
                disabled={isLoading}
              />
            </div>
          </>
        )}

      </form>
    </DialogModal>
  );
};

export default CopyProjectModal;