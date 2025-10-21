import React, { useState, useEffect } from "react";
import type { Vendor } from "../../types";
import Sidebar from "../ui/Sidebar";
import VendorList from "./VendorList";
import AddVendorModal from "./AddVendorModal";
import ConfirmationModal from "../ui/ConfirmationModal";
import ToastContainer from "../ui/ToastContainer";
import { useToast } from "../../hooks/useToast";

interface VendorPageProps {
  vendors: Vendor[];
  isLoading?: boolean;
  error?: string | null;
  onAddVendor?: (vendorData: Omit<Vendor, "id">) => Promise<void>;
  onEditVendor?: (vendorId: number, vendorData: Partial<Vendor>) => Promise<void>;
  onDeleteVendor?: (vendorId: number) => Promise<void>;
}

const VendorPage: React.FC<VendorPageProps> = ({
  vendors,
  isLoading: globalLoading = false,
  error,
  onAddVendor,
  onEditVendor,
  onDeleteVendor,
}) => {
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const handleEditVendor = async (vendorId: number) => {
    if (!onEditVendor) {
      return;
    }
    
    setIsOperationLoading(true);
    try {
      // This would open an edit modal in a full implementation
      // For now, just call the handler with empty data
      await onEditVendor(vendorId, {});
    } catch {
      showError('Edit Failed', 'Failed to edit vendor. Please try again.');
    } finally {
      setIsOperationLoading(false);
    }
  };

  const handleDeleteVendor = (vendorId: number) => {
    const vendor = vendors.find(v => v.id === vendorId);
    if (vendor) {
      setVendorToDelete(vendor);
      setShowDeleteModal(true);
    }
  };

  const confirmDeleteVendor = async () => {
    if (!onDeleteVendor || !vendorToDelete) {
      return;
    }

    setIsOperationLoading(true);
    try {
      await onDeleteVendor(vendorToDelete.id);
      setShowDeleteModal(false);
      setVendorToDelete(null);
      showSuccess('Vendor Deleted', `Successfully deleted ${vendorToDelete.company_name}`);
    } catch {
      showError('Delete Failed', 'Failed to delete vendor. Please try again.');
    } finally {
      setIsOperationLoading(false);
    }
  };

  const handleAddVendorClick = () => {
    setIsAddModalOpen(true);
  };

  const handleAddVendorSubmit = async (vendorData: Omit<Vendor, "id">) => {
    if (isOperationLoading) return; // Prevent double submission
    
    setIsOperationLoading(true);
    try {
      await onAddVendor?.(vendorData);
      setIsAddModalOpen(false);
      showSuccess('Vendor Added', `Successfully added ${vendorData.company_name}`);
    } catch {
      showError('Add Failed', 'Failed to add vendor. Please try again.');
    } finally {
      setIsOperationLoading(false);
    }
  };

  const handleCloseModal = () => {
    if (!isOperationLoading) {
      setIsAddModalOpen(false);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(vendors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVendors = vendors.slice(startIndex, endIndex);

  // Reset to first page when vendors change
  useEffect(() => {
    setCurrentPage(1);
  }, [vendors]);

  // Show error toast when error prop changes
  useEffect(() => {
    if (error) {
      showError('Loading Error', `Error loading vendors: ${error}`);
    }
  }, [error, showError]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Dummy handlers for sidebar (vendors page doesn't need project filtering)
  const handleStatusFilter = () => {};
  const handleNewProject = () => {};

  return (
    <>
      <div className="flex h-screen">
        <Sidebar
          statusFilter={[]}
          setStatusFilter={handleStatusFilter}
          onNewProject={handleNewProject}
          onAddVendor={handleAddVendorClick}
        />

        <div className="flex-1 bg-gray-50 flex flex-col">
          <div className="p-6 pb-0 mx-auto w-full flex-shrink-0">
            {/* Error handling via toast notifications only */}
          </div>
          
          <div className="flex-1 overflow-auto p-6 pt-4 mx-auto w-full">
            <VendorList
              vendors={paginatedVendors}
              onEditVendor={handleEditVendor}
              onDeleteVendor={handleDeleteVendor}
              onAddVendor={handleAddVendorClick}
              isLoading={globalLoading}
              isOperationLoading={isOperationLoading}
            />
          </div>
          
          {/* Pagination Controls - Fixed at bottom of page */}
          {!globalLoading && vendors.length > 0 && (
            <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center text-sm text-gray-700 order-2 sm:order-1">
                <span className="hidden sm:inline">Showing {startIndex + 1} to {Math.min(endIndex, vendors.length)} of {vendors.length} results</span>
                <span className="sm:hidden">{vendors.length} results</span>
              </div>
              
              <div className="flex items-center gap-2 order-1 sm:order-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-2 sm:px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                
                <span className="text-sm text-gray-700 whitespace-nowrap">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-2 sm:px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AddVendorModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        onAddVendor={handleAddVendorSubmit}
        isLoading={isOperationLoading}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setVendorToDelete(null);
        }}
        onConfirm={confirmDeleteVendor}
        title="Delete Vendor"
        message={`Are you sure you want to delete "${vendorToDelete?.company_name}"? This action cannot be undone.`}
        confirmText="Delete Vendor"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </>
  );
};

export default VendorPage;
