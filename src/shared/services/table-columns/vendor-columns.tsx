import { type ColumnDef } from "@tanstack/table-core";
import type { VendorWithContact, VendorType } from "../../types";
import { DataTableColumnHeader } from "../../components/ui/data-table-column-header";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

// Helper function for vendor type styling
const getVendorTypeStyle = (type: VendorType) => {
  switch (type) {
    case "Vendor":
      return {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
      };
    case "Subcontractor":
      return {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
      };
    case "General Contractor":
      return {
        bg: "bg-purple-50",
        text: "text-purple-700",
        border: "border-purple-200",
      };
    default:
      return {
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-200",
      };
  }
};

// Helper function to check if insurance is overdue (expired)
const isInsuranceOverdue = (expiryDate: string | null): boolean => {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const today = new Date();
  return expiry < today;
};

// Helper function to check if insurance is expiring soon (within 30 days)
const isInsuranceExpiringSoon = (expiryDate: string | null): boolean => {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);
  return expiry <= thirtyDaysFromNow && expiry >= today;
};

export function createVendorColumns(): ColumnDef<VendorWithContact>[] {
  return [
    {
      id: "company_name",
      accessorKey: "company_name",
      meta: {
        width: "w-[20%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Company Name" />
      ),
      cell: ({ row }) => {
        const companyName = row.getValue("company_name") as string;
        const vendor = row.original;

        return (
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 text-xs hover:text-blue-600 transition-colors truncate">
                {companyName}
              </div>
              {vendor.address && (
                <div className="text-xs text-gray-600 truncate" title={vendor.address}>
                  {vendor.address}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "vendor_type",
      accessorKey: "vendor_type",
      meta: {
        width: "w-[14%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" center />
      ),
      cell: ({ row }) => {
        const type = row.getValue("vendor_type") as VendorType;
        const style = getVendorTypeStyle(type);

        return (
          <div className="flex justify-center">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}
            >
              {type}
            </span>
          </div>
        );
      },
    },
    {
      id: "specialty",
      accessorKey: "specialty",
      meta: {
        width: "w-[14%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Specialty" center />
      ),
      cell: ({ row }) => {
        const specialty = row.getValue("specialty") as string;
        return (
          <div className="flex justify-center">
            <div
              className="text-xs text-gray-600 min-w-0"
              title={specialty || undefined}
            >
              {specialty || "-"}
            </div>
          </div>
        );
      },
    },
    {
      id: "contact_person",
      accessorKey: "contact_person",
      meta: {
        width: "w-[13%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Contact" center />
      ),
      cell: ({ row }) => {
        const vendor = row.original;
        const primaryContact = vendor.primary_contact;
        
        // Only use primary contact data from vendor_contacts table
        const contactName = primaryContact?.contact_name;
        const contactTitle = primaryContact?.contact_title;
        
        return (
          <div className="flex items-center justify-center text-xs text-gray-900 min-w-0">
            <div className="text-center">
              <div
                className="leading-tight overflow-hidden font-medium"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: "vertical",
                  wordBreak: "break-word",
                }}
                title={contactName || undefined}
              >
                {contactName || "-"}
              </div>
              {contactTitle && (
                <div
                  className="text-xs text-gray-500 leading-tight overflow-hidden"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: "vertical",
                    wordBreak: "break-word",
                  }}
                  title={contactTitle}
                >
                  {contactTitle}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "phone",
      accessorKey: "phone",
      meta: {
        width: "w-[11%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Phone" center />
      ),
      cell: ({ row }) => {
         const phone = row.original.primary_contact?.phone;

        return (
          <div className="flex items-center justify-center text-xs text-gray-600">
            {phone ? (
              <a
                href={`tel:${phone}`}
                className="hover:text-[#d4af37] transition-colors"
              >
                {phone}
              </a>
            ) : (
              "-"
            )}
          </div>
        );
      },
    },
    {
      id: "email",
      accessorKey: "email",
      meta: {
        width: "w-[16%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => {
        const email = row.original.primary_contact?.email;
        return (

          <div className="text-xs min-w-0">
            {email ? (
              <a
                href={`mailto:${email}`}
                className="text-blue-600 hover:text-[#d4af37] hover:underline transition-colors truncate block"
                title={email}
              >
                {email}
              </a>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
        );
      },
    },
    {
      id: "insurance_expiry_date",
      accessorKey: "insurance_expiry_date",
      meta: {
        width: "w-[14%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Insurance Expiry"
          center
        />
      ),
      cell: ({ row }) => {
        const expiryDate = row.getValue("insurance_expiry_date") as
          | string
          | null;
        const isExpiringSoon = isInsuranceExpiringSoon(expiryDate);
        const isOverdue = isInsuranceOverdue(expiryDate);

        if (!expiryDate) {
          return (
            <div className="flex items-center justify-center text-xs text-gray-400">
              -
            </div>
          );
        }

        const formattedDate = new Date(expiryDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        return (
          <div className="flex items-center justify-center gap-1">
            <span
              className={`text-xs ${
                isOverdue 
                  ? "text-red-600 font-medium" 
                  : isExpiringSoon 
                    ? "text-red-600 font-medium" 
                    : "text-gray-600"
              }`}
            >
              {formattedDate}
            </span>
            {(isExpiringSoon || isOverdue) && (
              <ExclamationTriangleIcon className="h-3 w-3 text-red-500" />
            )}
          </div>
        );
      },
    },
  ];
}
