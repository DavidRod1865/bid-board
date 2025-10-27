import React, { useState, useEffect } from "react";
import type { Vendor } from "../../types";
import Sidebar from "../ui/Sidebar";
import VendorList from "./VendorList";
import AddVendorModal from "./AddVendorModal";
import AlertDialog from "../ui/AlertDialog";
import { Toaster } from "../ui/sonner";
import { useToast } from "../../hooks/useToast";
import { useBulkSelection } from "../../hooks/useBulkSelection";

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
  const { showSuccess, showError } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  
  // Bulk selection hooks for vendors
  const {
    selectedBids: selectedVendors,
    handleBidSelect: handleVendorSelect,
    clearSelection
  } = useBulkSelection();
  

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

  const handleBulkDelete = () => {
    if (selectedVendors.size > 0) {
      setShowBulkDeleteModal(true);
    }
  };

  const confirmBulkDelete = async () => {
    if (!onDeleteVendor || selectedVendors.size === 0) {
      return;
    }

    setIsOperationLoading(true);
    try {
      // Delete all selected vendors
      const deletePromises = Array.from(selectedVendors).map(vendorId => 
        onDeleteVendor(vendorId)
      );
      
      await Promise.all(deletePromises);
      
      setShowBulkDeleteModal(false);
      clearSelection();
      showSuccess('Vendors Deleted', `Successfully deleted ${selectedVendors.size} vendor(s)`);
    } catch {
      showError('Delete Failed', 'Failed to delete vendors. Please try again.');
    } finally {
      setIsOperationLoading(false);
    }
  };


  // Show error toast when error prop changes
  useEffect(() => {
    if (error) {
      showError('Loading Error', `Error loading vendors: ${error}`);
    }
  }, [error, showError]);


  // Dummy handlers for sidebar (vendors page doesn't need project filtering)
  const handleStatusFilter = () => {};

  return (
    <>
      <div className="flex h-screen">
        <Sidebar
          statusFilter={[]}
          setStatusFilter={handleStatusFilter}
        />

        <div className="flex-1 bg-gray-50 flex flex-col">
          <div className="flex-1 overflow-auto mx-auto w-full">
            <VendorList
              vendors={vendors}
              onEditVendor={handleEditVendor}
              onDeleteVendor={handleDeleteVendor}
              onAddVendor={handleAddVendorClick}
              isLoading={globalLoading}
              isOperationLoading={isOperationLoading}
              selectedVendors={selectedVendors}
              onVendorSelect={handleVendorSelect}
              onBulkDelete={handleBulkDelete}
            />
          </div>
        </div>
      </div>

      <AddVendorModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        onAddVendor={handleAddVendorSubmit}
        isLoading={isOperationLoading}
      />

      {/* Delete Confirmation Modal */}
      <AlertDialog
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

      {/* Bulk Delete Confirmation Modal */}
      <AlertDialog
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={confirmBulkDelete}
        title={`Delete ${selectedVendors.size} Vendor(s)`}
        message={`Are you sure you want to delete ${selectedVendors.size} selected vendor(s)? This action cannot be undone.`}
        confirmText={`Delete ${selectedVendors.size} Vendor(s)`}
        cancelText="Cancel"
        variant="danger"
      />

      {/* Toast Container */}
      <Toaster />
    </>
  );
};

export default VendorPage;
