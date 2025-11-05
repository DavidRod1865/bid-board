import type { ColumnDef } from "@tanstack/react-table"
import type { BidVendor, Vendor } from "../../types"
import { DataTableColumnHeader } from "../../components/ui/data-table-column-header"
import { formatDate, formatCurrency, getBidUrgency } from "../../utils/formatters"
import { getVendorStatusColor } from "../../utils/statusUtils"
import { Button } from "../../components/ui/Button"

interface BidVendorWithVendor extends BidVendor {
  vendor?: Vendor
}

export function createBidVendorColumns(
  onEdit?: (vendorId: number) => void
): ColumnDef<BidVendorWithVendor>[] {
  return [
    {
      id: "vendor",
      accessorKey: "vendor.company_name",
      meta: {
        width: "w-[25%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Vendor" />
      ),
      cell: ({ row }) => {
        const bidVendor = row.original;
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 text-sm">
              {bidVendor.vendor?.company_name || 'Unknown Vendor'}
            </span>
          </div>
        );
      },
    },
    {
      id: "cost_amount",
      accessorKey: "cost_amount",
      meta: {
        width: "w-[15%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cost Amount" center />
      ),
      cell: ({ row }) => {
        const bidVendor = row.original;
        return (
          <div className="flex items-center justify-center">
            {bidVendor.cost_amount !== null && bidVendor.cost_amount !== undefined ? (
              <span className="text-gray-900 font-medium text-sm">
                {formatCurrency(bidVendor.cost_amount)}
              </span>
            ) : (
              <span className="text-gray-400 text-sm">-</span>
            )}
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        const a = parseFloat(String(rowA.original.cost_amount || 0));
        const b = parseFloat(String(rowB.original.cost_amount || 0));
        return a - b;
      },
    },
    {
      id: "response_received_date",
      accessorKey: "response_received_date",
      meta: {
        width: "w-[15%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Response Date" center />
      ),
      cell: ({ row }) => {
        const bidVendor = row.original;
        return (
          <div className="text-center">
            {bidVendor.response_received_date ? (
              <span className="text-sm text-gray-600">
                {formatDate(bidVendor.response_received_date, "short")}
              </span>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.response_received_date ? new Date(rowA.original.response_received_date).getTime() : 0;
        const b = rowB.original.response_received_date ? new Date(rowB.original.response_received_date).getTime() : 0;
        return a - b;
      },
    },
    {
      id: "due_date",
      accessorKey: "due_date",
      meta: {
        width: "w-[15%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Due Date" center />
      ),
      cell: ({ row }) => {
        const bidVendor = row.original;
        const costsReceived = bidVendor.response_received_date !== null;
        
        return (
          <div className="text-center">
            {bidVendor.due_date ? (
              <div
                className={`inline-block rounded px-2 py-1 ${
                  (() => {
                    if (!costsReceived) {
                      const urgency = getBidUrgency(bidVendor.due_date, 'Gathering Costs');
                      if (urgency.level === "overdue") {
                        return "border-4 border-red-500 text-red-600 font-medium";
                      } else if (urgency.level === "dueToday") {
                        return "border-4 border-orange-500 text-orange-600 font-medium";
                      }
                    }
                    return "text-gray-600";
                  })()
                }`}
              >
                <span className="text-sm">
                  {formatDate(bidVendor.due_date, "short")}
                </span>
              </div>
            ) : (
              <span className="text-sm text-gray-600">-</span>
            )}
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.due_date ? new Date(rowA.original.due_date).getTime() : 0;
        const b = rowB.original.due_date ? new Date(rowB.original.due_date).getTime() : 0;
        return a - b;
      },
    },
    {
      id: "status",
      accessorKey: "status",
      meta: {
        width: "w-[12%]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" center />
      ),
      cell: ({ row }) => {
        const bidVendor = row.original;
        return (
          <div className="text-center">
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${getVendorStatusColor(
                bidVendor.status
              )}`}
            >
              {bidVendor.status.toUpperCase()}
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      meta: {
        width: "w-[13%]",
      },
      header: () => (
        <div className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Actions
        </div>
      ),
      cell: ({ row }) => {
        const bidVendor = row.original;
        return (
          <div className="text-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit?.(bidVendor.vendor?.id || bidVendor.vendor_id)}
            >
              Edit
            </Button>
          </div>
        );
      },
      enableSorting: false,
    },
  ]
}