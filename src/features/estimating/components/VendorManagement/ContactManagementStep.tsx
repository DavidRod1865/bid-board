import React, { useState } from 'react';
import { PencilIcon, TrashIcon, UserIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import type { ContactData } from './VendorCreationWizard';
import { Button } from '../../../../shared/components/ui/Button';
import { DataTable } from '../../../../shared/components/ui/data-table';
import { DataTableColumnHeader } from '../../../../shared/components/ui/data-table-column-header';
import type { ColumnDef } from '@tanstack/react-table';
import DialogModal from '../../../../shared/components/ui/DialogModal';
import ContactWizardForm from './ContactWizardForm';

interface ContactManagementStepProps {
  contacts: ContactData[];
  onAddContact: (contact: ContactData) => void;
  onUpdateContact: (index: number, contact: ContactData) => void;
  onRemoveContact: (index: number) => void;
  onSetPrimaryContact: (index: number) => void;
}

const ContactManagementStep: React.FC<ContactManagementStepProps> = ({
  contacts,
  onAddContact,
  onUpdateContact,
  onRemoveContact,
  onSetPrimaryContact
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Helper function for contact type styling
  const getContactTypeStyle = (type: string) => {
    switch (type) {
      case 'Office': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
      case 'General Contractor': return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
      case 'Sales': return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
      case 'Billing': return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
      default: return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
    }
  };

  // Table columns definition
  const columns: ColumnDef<ContactData>[] = [
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
        const type = row.getValue("contact_type") as string;
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
        return (
          <div className="text-sm text-gray-600">
            {phone || '-'}
          </div>
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
        return (
          <div className="text-sm text-gray-600 truncate max-w-[180px]" title={email || undefined}>
            {email || '-'}
          </div>
        );
      },
    },
    {
      accessorKey: "is_primary",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Primary" center />
      ),
      cell: ({ row }) => {
        const contact = row.original;
        const index = contacts.indexOf(contact);
        
        return (
          <div className="flex justify-center">
            <input
              type="radio"
              name="primary_contact"
              checked={contact.is_primary}
              onChange={() => onSetPrimaryContact(index)}
              className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300"
            />
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const contact = row.original;
        const index = contacts.indexOf(contact);
        
        return (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setEditingIndex(index)}
              className="p-1 text-gray-400 hover:text-[#d4af37] transition-colors"
              title="Edit contact"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onRemoveContact(index)}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete contact"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  const handleAddContact = (contactData: ContactData) => {
    onAddContact(contactData);
    setIsAddModalOpen(false);
  };

  const handleUpdateContact = (contactData: ContactData) => {
    if (editingIndex !== null) {
      onUpdateContact(editingIndex, contactData);
      setEditingIndex(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Contact Management</h3>
        <p className="text-sm text-gray-600">
          Add contacts for this vendor. You can designate a primary contact and mark emergency contacts.
        </p>
      </div>

      {/* Add Contact Button */}
      <div className="flex justify-center">
        <Button
          variant="default"
          onClick={() => setIsAddModalOpen(true)}
        >
          Add Contact
        </Button>
      </div>

      {/* Contacts List */}
      {contacts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-sm font-medium text-gray-900">No contacts added</h3>
          <p className="mt-2 text-sm text-gray-500">
            Contacts are optional, but adding them helps with project communication.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium text-gray-900">
              Contacts ({contacts.length})
            </h4>
          </div>
          
          <DataTable
            columns={columns}
            data={contacts}
            pageSize={5}
            emptyMessage="No contacts added"
          />
          
          {/* Contact Designation Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <UserIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Contact Designations
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>• <strong>Primary Contact:</strong> Select one contact to be the main point of contact</p>
                  <p>• <strong>Emergency Contact:</strong> Can be checked for multiple contacts for urgent matters</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Skip Option */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          You can skip this step and add contacts later from the vendor detail page.
        </p>
      </div>

      {/* Add Contact Modal */}
      <DialogModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Contact"
      >
        <ContactWizardForm
          onSubmit={handleAddContact}
          onCancel={() => setIsAddModalOpen(false)}
          existingContacts={contacts}
        />
      </DialogModal>

      {/* Edit Contact Modal */}
      <DialogModal
        isOpen={editingIndex !== null}
        onClose={() => setEditingIndex(null)}
        title="Edit Contact"
      >
        {editingIndex !== null && (
          <ContactWizardForm
            contact={contacts[editingIndex]}
            onSubmit={handleUpdateContact}
            onCancel={() => setEditingIndex(null)}
            existingContacts={contacts}
          />
        )}
      </DialogModal>
    </div>
  );
};

export default ContactManagementStep;