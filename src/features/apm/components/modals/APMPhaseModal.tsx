import React, { useState, useEffect } from 'react';
import type { BidVendor } from '../../../../shared/types';
import DialogModal from '../../../../shared/components/ui/DialogModal';
import { Input, Textarea } from '../../../../shared/components/ui/FormField';
import { Button } from '../../../../shared/components/ui/Button';

// APM Phase types based on database enum
const APM_PHASE_TYPES = [
  'Buy Number',
  'Purchase Order', 
  'Submittals',
  'RFI',
  'Revised Plans',
  'Equipment Release',
  'Change Orders',
  'Closeout',
  'Invoicing'
] as const;

// APM Phase statuses based on database enum
const APM_PHASE_STATUSES = [
  'Pending',
  'Completed', 
  'Rejected & Revised'
] as const;

interface APMPhaseData {
  id?: number;
  phase_name: string;
  status: string;
  requested_date: string | null;
  follow_up_date: string | null;
  received_date: string | null;
  notes: string | null;
}

interface APMPhaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (phaseData: Omit<APMPhaseData, 'id'>) => Promise<void>;
  vendor: BidVendor | null;
  vendorName?: string;
  existingPhase?: APMPhaseData | null; // For edit mode
  mode: 'add' | 'edit';
  isLoading?: boolean;
}

const APMPhaseModal: React.FC<APMPhaseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  vendor,
  vendorName,
  existingPhase,
  mode,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<APMPhaseData>({
    phase_name: '',
    status: 'Pending',
    requested_date: '',
    follow_up_date: '',
    received_date: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && existingPhase) {
        // Edit mode - populate with existing data
        setFormData({
          phase_name: existingPhase.phase_name,
          status: existingPhase.status,
          requested_date: existingPhase.requested_date?.split('T')[0] || '',
          follow_up_date: existingPhase.follow_up_date?.split('T')[0] || '',
          received_date: existingPhase.received_date?.split('T')[0] || '',
          notes: existingPhase.notes || '',
        });
      } else {
        // Add mode - reset form
        setFormData({
          phase_name: '',
          status: 'Pending',
          requested_date: '',
          follow_up_date: '',
          received_date: '',
          notes: '',
        });
      }
      setErrors({});
    }
  }, [isOpen, mode, existingPhase]);

  // Get vendor name for display
  const getVendorName = () => {
    if (vendorName) return vendorName;
    return vendor ? `Vendor ID ${vendor.vendor_id}` : 'Unknown Vendor';
  };

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.phase_name.trim()) {
      newErrors.phase_name = 'Phase is required';
    }

    if (!formData.status.trim()) {
      newErrors.status = 'Status is required';
    }

    // Date validation
    if (formData.requested_date && formData.received_date) {
      const requestedDate = new Date(formData.requested_date);
      const receivedDate = new Date(formData.received_date);
      if (receivedDate < requestedDate) {
        newErrors.received_date = 'Received date cannot be before requested date';
      }
    }

    if (formData.requested_date && formData.follow_up_date) {
      const requestedDate = new Date(formData.requested_date);
      const followUpDate = new Date(formData.follow_up_date);
      if (followUpDate < requestedDate) {
        newErrors.follow_up_date = 'Follow-up date should not be before requested date';
      }
    }

    // Status-based validation
    if (formData.status === 'Completed' && !formData.received_date) {
      newErrors.received_date = 'Received date is required when status is Completed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading || isSubmitting) return;

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare phase data with proper date formatting
      const phaseData = {
        phase_name: formData.phase_name,
        status: formData.status,
        requested_date: formData.requested_date || null,
        follow_up_date: formData.follow_up_date || null,
        received_date: formData.received_date || null,
        notes: formData.notes || null,
      };

      await onSubmit(phaseData);
      
      // Reset form and close modal on success
      setFormData({
        phase_name: '',
        status: 'Pending',
        requested_date: '',
        follow_up_date: '',
        received_date: '',
        notes: '',
      });
      setErrors({});
      onClose();
    } catch (error) {
      // Error handling is done in parent component
      console.error('Failed to submit phase data:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes
  const handleInputChange = (
    field: keyof APMPhaseData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!isLoading && !isSubmitting) {
      onClose();
      // Reset form when closing
      setFormData({
        phase_name: '',
        status: 'Pending',
        requested_date: '',
        follow_up_date: '',
        received_date: '',
        notes: '',
      });
      setErrors({});
    }
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
        type="submit"
        variant="default"
        disabled={isLoading || isSubmitting}
        form="apm-phase-form"
      >
        {isLoading || isSubmitting 
          ? (mode === 'edit' ? 'Updating...' : 'Adding...') 
          : (mode === 'edit' ? 'Update Phase' : 'Add Phase')}
      </Button>
    </div>
  );

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`${mode === 'edit' ? 'Edit' : 'Add'} APM Phase for ${getVendorName()}`}
      footer={footerButtons}
    >
      <form
        id="apm-phase-form"
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Phase Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phase *
          </label>
          <select
            value={formData.phase_name}
            onChange={(e) => handleInputChange('phase_name', e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-[#d4af37] focus:border-[#d4af37] sm:text-sm rounded-md"
            disabled={isLoading || isSubmitting}
          >
            <option value="">Select a phase</option>
            {APM_PHASE_TYPES.map((phaseType) => (
              <option key={phaseType} value={phaseType}>
                {phaseType}
              </option>
            ))}
          </select>
          {errors.phase_name && (
            <p className="text-red-600 text-sm mt-1">{errors.phase_name}</p>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status *
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-[#d4af37] focus:border-[#d4af37] sm:text-sm rounded-md"
            disabled={isLoading || isSubmitting}
          >
            {APM_PHASE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          {errors.status && (
            <p className="text-red-600 text-sm mt-1">{errors.status}</p>
          )}
        </div>

        {/* Date Fields Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Requested Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Requested Date
            </label>
            <Input
              type="date"
              value={formData.requested_date || ''}
              onChange={(e) => handleInputChange('requested_date', e.target.value)}
              onClick={(e) => (e.currentTarget as any).showPicker?.()}
              disabled={isLoading || isSubmitting}
            />
            {errors.requested_date && (
              <p className="text-red-600 text-sm mt-1">{errors.requested_date}</p>
            )}
          </div>

          {/* Follow-up Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Follow-up Date
            </label>
            <Input
              type="date"
              value={formData.follow_up_date || ''}
              onChange={(e) => handleInputChange('follow_up_date', e.target.value)}
              onClick={(e) => (e.currentTarget as any).showPicker?.()}
              disabled={isLoading || isSubmitting}
            />
            {errors.follow_up_date && (
              <p className="text-red-600 text-sm mt-1">{errors.follow_up_date}</p>
            )}
          </div>

          {/* Received Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Received Date
            </label>
            <Input
              type="date"
              value={formData.received_date || ''}
              onChange={(e) => handleInputChange('received_date', e.target.value)}
              onClick={(e) => (e.currentTarget as any).showPicker?.()}
              disabled={isLoading || isSubmitting}
            />
            {errors.received_date && (
              <p className="text-red-600 text-sm mt-1">{errors.received_date}</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <Textarea
            value={formData.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Enter any additional notes or comments..."
            rows={4}
            disabled={isLoading || isSubmitting}
          />
          {errors.notes && (
            <p className="text-red-600 text-sm mt-1">{errors.notes}</p>
          )}
        </div>

        {/* Form Hints */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="text-sm text-blue-800">
            <strong>Tips:</strong>
            <ul className="mt-1 list-disc list-inside space-y-1">
              <li>The phase determines the workflow step for this vendor</li>
              <li>Set status to "Completed" when phase is finished</li>
              <li>Follow-up date helps track pending activities</li>
              <li>Received date marks when deliverables are received</li>
            </ul>
          </div>
        </div>
      </form>
    </DialogModal>
  );
};

export default APMPhaseModal;