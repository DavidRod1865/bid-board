import React from 'react';
import type { Vendor } from '../../types';
import Modal from '../ui/Modal';
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
    <Modal
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
    </Modal>
  );
};

export default AddVendorModal;