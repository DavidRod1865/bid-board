import React, { useState, useMemo } from 'react';
import { PencilIcon, TrashIcon, UserIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import type { VendorContact, ContactType } from '../../../../shared/types';
import { DataTable } from '../../../../shared/components/ui/data-table';
import { DataTableColumnHeader } from '../../../../shared/components/ui/data-table-column-header';
import type { ColumnDef } from '@tanstack/react-table';
import DialogModal from '../../../../shared/components/ui/DialogModal';
import VendorContactForm from './VendorContactForm';
import AlertDialog from '../../../../shared/components/ui/AlertDialog';
import { Button } from "../../../../shared/components/ui/Button";
import { useDynamicPageSize } from '../../../../shared/hooks/useDynamicPageSize';

interface VendorContactsListProps {
  contacts: VendorContact[];
  vendorId: number;
  onAddContact: (contactData: Omit<VendorContact, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdateContact: (contactId: number, contactData: Partial<VendorContact>) => Promise<void>;
  onDeleteContact: (contactId: number) => Promise<void>;
  isLoading?: boolean;
}

const getContactTypeStyle = (type: ContactType) => {
  switch (type) {
    case 'Office': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case 'General Contractor': return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
    case 'Sales': return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    case 'Billing': return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
    default: return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
  }
};

const VendorContactsList: React.FC<VendorContactsListProps> = ({
  contacts,
  vendorId,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  isLoading = false
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<VendorContact | null>(null);
  const [deletingContact, setDeletingContact] = useState<VendorContact | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);

  // Dynamic page size management
  const { 
    pageSize, 
    availablePageSizes, 
    setManualPageSize 
  } = useDynamicPageSize({
    storageKey: 'vendor-contacts-page-size',
    rowHeight: 50, // Compact rows for contact list
    reservedHeight: 200, // Minimal space in slideout/modal context
    minPageSize: 5,
    maxPageSize: 20 // Smaller range since typically fewer contacts
  });

  const handleAddContact = async (contactData: Omit<VendorContact, 'id' | 'created_at' | 'updated_at'>) => {
    setOperationLoading(true);
    try {
      await onAddContact(contactData);
      setIsAddModalOpen(false);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleUpdateContact = async (contactData: Omit<VendorContact, 'id' | 'created_at' | 'updated_at'>) => {
    if (!editingContact) return;
    
    setOperationLoading(true);
    try {
      await onUpdateContact(editingContact.id, contactData);
      setEditingContact(null);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!deletingContact) return;
    
    setOperationLoading(true);
    try {
      await onDeleteContact(deletingContact.id);
      setDeletingContact(null);
    } finally {
      setOperationLoading(false);
    }
  };

  // Create columns for the contact table
  const columns: ColumnDef<VendorContact>[] = useMemo(() => [
    {
      accessorKey: "contact_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const contact = row.original;
        
        return (
          <div className="flex items-center space-x-2 min-w-0">
            {contact.is_primary && (
              <StarSolid className="h-4 w-4 text-[#d4af37]" title="Primary Contact" />
            )}
            {contact.is_emergency_contact && (
              <ExclamationTriangleIcon className="h-4 w-4 text-red-500" title="Emergency Contact" />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 truncate">{contact.contact_name}</div>
              {contact.contact_title && (
                <div className="text-sm text-gray-500 truncate">{contact.contact_title}</div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "contact_type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const type = row.getValue("contact_type") as ContactType;
        const style = getContactTypeStyle(type);
        
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
            {type}
          </span>
        );
      },
    },
    {
      accessorKey: "phone",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Phone" />
      ),
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string;
        return phone ? (
          <a href={`tel:${phone}`} className="text-sm text-gray-600 hover:text-[#d4af37]">
            {phone}
          </a>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        );
      },
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => {
        const email = row.getValue("email") as string;
        return email ? (
          <a href={`mailto:${email}`} className="text-sm text-gray-600 hover:text-[#d4af37] truncate block max-w-[180px]" title={email}>
            {email}
          </a>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const contact = row.original;
        
        return (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setEditingContact(contact)}
              className="p-1 text-gray-400 hover:text-[#d4af37] transition-colors"
              title="Edit contact"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeletingContact(contact)}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete contact"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ], []);

  // Sort contacts to show primary first
  const sortedContacts = useMemo(() => {
    return [...contacts].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return a.contact_name.localeCompare(b.contact_name);
    });
  }, [contacts]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Contacts</h3>
        <Button
          variant="default"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          disabled={isLoading}
        >
          Add Contact
        </Button>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a contact.</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={sortedContacts}
          isLoading={isLoading}
          pageSize={pageSize}
          enablePageSizeSelector={true}
          availablePageSizes={availablePageSizes}
          onPageSizeChange={setManualPageSize}
          emptyMessage="No contacts found"
        />
      )}

      {/* Add Contact Modal */}
      <DialogModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Contact"
      >
        <VendorContactForm
          vendorId={vendorId}
          existingContacts={contacts}
          onSubmit={handleAddContact}
          onCancel={() => setIsAddModalOpen(false)}
          isLoading={operationLoading}
        />
      </DialogModal>

      {/* Edit Contact Modal */}
      <DialogModal
        isOpen={!!editingContact}
        onClose={() => setEditingContact(null)}
        title="Edit Contact"
      >
        {editingContact && (
          <VendorContactForm
            contact={editingContact}
            vendorId={vendorId}
            existingContacts={contacts}
            onSubmit={handleUpdateContact}
            onCancel={() => setEditingContact(null)}
            isLoading={operationLoading}
          />
        )}
      </DialogModal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={!!deletingContact}
        onClose={() => setDeletingContact(null)}
        onConfirm={handleDeleteContact}
        title="Delete Contact"
        message={`Are you sure you want to delete ${deletingContact?.contact_name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default VendorContactsList;