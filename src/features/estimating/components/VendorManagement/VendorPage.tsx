import React, { useState, useEffect } from "react";
import type { Vendor, VendorWithContact } from "../../../../shared/types";
import type { ContactData } from "./VendorCreationWizard";
import Sidebar from "../../../../shared/components/ui/Sidebar";
import VendorList from "./VendorList";
import AddVendorModal from "./AddVendorModal";
import AlertDialog from "../../../../shared/components/ui/AlertDialog";
import { Toaster } from "../../../../shared/components/ui/sonner";
import { useToast } from "../../../../shared/hooks/useToast";
import { useBulkSelection } from "../../../../shared/hooks/useBulkSelection";
import { useLoading } from "../../../../shared/contexts/LoadingContext";

interface VendorPageProps {
  vendors: VendorWithContact[];
  isLoading?: boolean;
  error?: string | null;
  onAddVendor?: (vendorData: Omit<Vendor, "id">, contacts: ContactData[]) => Promise<void>;
  onEditVendor?: (vendorId: number, vendorData: Partial<Vendor>) => Promise<void>;
  onDeleteVendor?: (vendorId: number) => Promise<void>;
  onVendorUpdated?: () => void;
}

const VendorPage: React.FC<VendorPageProps> = ({
  vendors,
  isLoading: globalLoading = false,
  error,
  onAddVendor,
  onEditVendor,
  onDeleteVendor,
  onVendorUpdated,
}) => {
  const { showSuccess, showError } = useToast();
  const { setOperationLoading, isOperationLoading } = useLoading();
  
  // Operation IDs for different operations
  const DELETE_OPERATION = 'vendor-delete';
  const ADD_OPERATION = 'vendor-add';
  const BULK_DELETE_OPERATION = 'vendor-bulk-delete';
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<VendorWithContact | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  
  // Bulk selection hooks for vendors
  const {
    selectedBids: selectedVendors,
    handleBidSelect: handleVendorSelect,
    clearSelection
  } = useBulkSelection();
  


  const confirmDeleteVendor = async () => {
    if (!onDeleteVendor || !vendorToDelete) {
      return;
    }

    setOperationLoading(DELETE_OPERATION, true);
    try {
      await onDeleteVendor(vendorToDelete.id);
      setShowDeleteModal(false);
      setVendorToDelete(null);
      showSuccess('Vendor Deleted', `Successfully deleted ${vendorToDelete.company_name}`);
    } catch {
      showError('Delete Failed', 'Failed to delete vendor. Please try again.');
    } finally {
      setOperationLoading(DELETE_OPERATION, false);
    }
  };

  const handleAddVendorClick = () => {
    setIsAddModalOpen(true);
  };

  const handleAddVendorSubmit = async (vendorData: Omit<Vendor, "id">, contacts: ContactData[]) => {
    if (isOperationLoading(ADD_OPERATION)) return; // Prevent double submission
    
    setOperationLoading(ADD_OPERATION, true);
    try {
      await onAddVendor?.(vendorData, contacts);
      setIsAddModalOpen(false);
      showSuccess(
        'Vendor Created', 
        `Successfully created ${vendorData.company_name}${contacts.length > 0 ? ` with ${contacts.length} contact(s)` : ''}`
      );
    } catch {
      showError('Creation Failed', 'Failed to create vendor. Please try again.');
    } finally {
      setOperationLoading(ADD_OPERATION, false);
    }
  };

  const handleCloseModal = () => {
    if (!isOperationLoading(ADD_OPERATION)) {
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

    setOperationLoading(BULK_DELETE_OPERATION, true);
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
      setOperationLoading(BULK_DELETE_OPERATION, false);
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
          showViewToggle={true}
        />

        <div className="flex-1 bg-gray-50 flex flex-col">
          <div className="flex-1 overflow-auto mx-auto w-full">
            <VendorList
              vendors={vendors}
              onUpdateVendor={async (vendorId, updates) => {
                await onEditVendor?.(vendorId, updates);
              }}
              onDeleteVendor={onDeleteVendor}
              onAddVendor={handleAddVendorClick}
              isLoading={globalLoading}
              isOperationLoading={isOperationLoading(ADD_OPERATION) || isOperationLoading(DELETE_OPERATION) || isOperationLoading(BULK_DELETE_OPERATION)}
              selectedVendors={selectedVendors}
              onVendorSelect={handleVendorSelect}
              onBulkDelete={handleBulkDelete}
              onVendorUpdated={onVendorUpdated}
            />
          </div>
        </div>
      </div>

      <AddVendorModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        onAddVendor={handleAddVendorSubmit}
        isLoading={isOperationLoading(ADD_OPERATION)}
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
