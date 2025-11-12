import React from 'react';
import type { Vendor } from '../../../../shared/types';
import type { ContactData } from './VendorCreationWizard';
import DialogModal from '../../../../shared/components/ui/DialogModal';
import VendorCreationWizard from './VendorCreationWizard';

interface AddVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVendor: (vendorData: Omit<Vendor, 'id'>, contacts: ContactData[]) => void;
  isLoading?: boolean;
}

const AddVendorModal: React.FC<AddVendorModalProps> = ({
  isOpen,
  onClose,
  onAddVendor,
  isLoading = false
}) => {
  const handleComplete = async (vendorData: Omit<Vendor, 'id'>, contacts: ContactData[]) => {
    onAddVendor(vendorData, contacts);
  };

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Vendor"
      size="xl"
    >
      <VendorCreationWizard
        onComplete={handleComplete}
        onCancel={onClose}
        isLoading={isLoading}
      />
    </DialogModal>
  );
};

export default AddVendorModal;