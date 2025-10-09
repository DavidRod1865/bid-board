import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Bid, Vendor, BidVendor } from '../types';

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
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  if (!isOpen || !bid) return null;

  const handleGoToProject = () => {
    navigate(`/project/${bid.id}`);
    handleClose();
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 200); // Wait for animation to complete
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
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
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className={`bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-all duration-200 ease-out transform ${
        isAnimating 
          ? 'scale-100 opacity-100' 
          : 'scale-95 opacity-0'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              eventType === 'bid_due' ? 'bg-blue-500' : 'bg-red-500'
            }`}></div>
            <h2 className="text-xl font-semibold text-gray-900">
              {eventType === 'bid_due' ? 'Bid Due Date' : 'Vendor Cost Due'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Project Details */}
          <div className="mb-6 bg-blue-50 rounded-lg p-4">
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
            <div className="mb-6 bg-red-50 rounded-lg p-4">
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

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleGoToProject}
              className="px-4 py-2 text-sm font-medium text-white bg-[#d4af37] rounded-lg hover:bg-[#b8941f] transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Go to Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BidPreviewModal;