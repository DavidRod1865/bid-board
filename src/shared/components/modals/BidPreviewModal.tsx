import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Bid, Vendor, BidVendor } from '../../types';
import DialogModal from '../ui/DialogModal';
import { Button } from '../ui/Button';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface BidPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bid?: Bid;
  vendor?: Vendor;
  bidVendor?: BidVendor;
  eventType: 'bid_due' | 'vendor_due';
}

const BidPreviewModal: React.FC<BidPreviewModalProps> = ({
  isOpen,
  onClose,
  bid,
  vendor,
  bidVendor,
  eventType
}) => {
  const navigate = useNavigate();

  if (!bid) return null;

  const handleGoToProject = () => {
    navigate(`/project/${bid.id}`);
    onClose();
  };

  // Helper function to properly parse date strings avoiding timezone issues
  const parseDate = (dateString: string): Date => {
    // If the date string doesn't include time, treat it as local date
    if (!dateString.includes('T') && !dateString.includes(' ')) {
      // For date-only strings like "2025-10-13", create local date to avoid timezone shifts
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(dateString);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not set';
    return parseDate(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      title={eventType === 'bid_due' ? 'Bid Due Date' : 'Vendor Cost Due'}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button 
            variant="default" 
            onClick={handleGoToProject}
            className="flex items-center gap-2"
          >
            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
            Go to Project
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Project Details */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Project Name</label>
              <p className="text-xl font-semibold text-gray-900">{bid.project_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Project Due Date</label>
              <p className="text-gray-900">{formatDate(bid.due_date)}</p>
            </div>
          </div>
        </div>

        {/* Vendor Information (if vendor event) */}
        {eventType === 'vendor_due' && vendor && bidVendor && (
          <div className="bg-red-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Vendor Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Company</label>
                <p className="text-gray-900 font-medium">{vendor.company_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Cost Due Date</label>
                <p className="text-gray-900">{formatDate(bidVendor.due_date)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                <p className="text-gray-900">{vendor.phone || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                <p className="text-gray-900">{vendor.email || 'Not specified'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DialogModal>
  );
};

export default BidPreviewModal;