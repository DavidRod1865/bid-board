import { type ColumnDef } from "@tanstack/table-core"
import type { Vendor } from "../../types"
import { DataTableColumnHeader } from "../../components/ui/data-table-column-header"

export function createVendorColumns(): ColumnDef<Vendor>[] {
  return [
    {
      id: "company_name",
      accessorKey: "company_name",
      meta: {
        width: "w-[26%]"
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Company Name" />
      ),
      cell: ({ row }) => {
        const companyName = row.getValue("company_name") as string
        return (
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-gray-900 text-sm hover:text-blue-600 transition-colors">
              {companyName}
            </span>
          </div>
        )
      },
    },
    {
      id: "address",
      accessorKey: "address",
      meta: {
        width: "w-[26%]"
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Address" />
      ),
      cell: ({ row }) => {
        const address = row.getValue("address") as string
        return (
          <div className="text-sm text-gray-600 truncate" title={address || undefined}>
            {address || '-'}
          </div>
        )
      },
    },
    {
      id: "contact_person",
      accessorKey: "contact_person",
      meta: {
        width: "w-[15%]"
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Contact Person" center />
      ),
      cell: ({ row }) => {
        const contactPerson = row.getValue("contact_person") as string
        return (
          <div className="flex items-center justify-center text-sm text-gray-900 min-w-0">
            <span 
              className="text-center leading-tight overflow-hidden"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                wordBreak: 'break-word'
              }}
              title={contactPerson || undefined}
            >
              {contactPerson || '-'}
            </span>
          </div>
        )
      },
    },
    {
      id: "phone",
      accessorKey: "phone",
      meta: {
        width: "w-[12%]"
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Phone" center />
      ),
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string
        return (
          <div className="flex items-center justify-center text-sm text-gray-600">
            {phone || '-'}
          </div>
        )
      },
    },
    {
      id: "email",
      accessorKey: "email",
      meta: {
        width: "w-[25%]"
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => {
        const email = row.getValue("email") as string
        return (
          <div className="text-sm text-blue-600 hover:underline cursor-pointer">
            {email || '-'}
          </div>
        )
      },
    },
  ]
}