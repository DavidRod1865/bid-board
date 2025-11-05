import React from 'react';
import type { Vendor } from '../../../../shared/types';
import DialogModal from '../../../../shared/components/ui/DialogModal';
import VendorForm from './VendorForm';

interface AddVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVendor: (vendorData: Omit<Vendor, 'id'>) => void;
  isLoading?: boolean;
}

const AddVendorModal: React.FC<AddVendorModalProps> = ({
  isOpen,
  onClose,
  onAddVendor,
  isLoading = false
}) => {
  const handleSubmit = (vendorData: Omit<Vendor, 'id'>) => {
    onAddVendor(vendorData);
  };

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Vendor"
      size="lg"
    >
      <VendorForm
        onSubmit={handleSubmit}
        onCancel={onClose}
        isLoading={isLoading}
      />
    </DialogModal>
  );
};

export default AddVendorModal;