import type { ColumnDef } from "@tanstack/react-table"
import type { BidVendor, Vendor } from "../../types"
import { DataTableColumnHeader } from "../../components/ui/data-table-column-header"
import { formatDate, formatCurrency, getBidUrgency } from "../../utils/formatters"
import { getVendorStatusColor } from "../../utils/statusUtils"
import { Button } from "../../components/ui/Button"
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import { StarIcon as StarOutline } from '@heroicons/react/24/outline'

interface BidVendorWithVendor extends BidVendor {
  vendor?: Vendor
}

export function createBidVendorColumns(
  onEdit?: (vendorId: number) => void,
  onUpdatePriority?: (bidVendorId: number, isPriority: boolean) => void,
  editingVendorId?: number | null,
  editValues?: { cost_amount: number | string | null; status: string },
  onStartEdit?: (bidVendorId: number) => void,
  onSaveEdit?: (bidVendorId: number) => void,
  onCancelEdit?: () => void,
  onEditValueChange?: (field: 'cost_amount' | 'status', value: any) => void,
  onDeleteVendor?: (bidVendorId: number) => void,
  parseAmountInput?: (value: string) => number | null,
  formatAmountForInput?: (amount: number | string | null) => string
): ColumnDef<BidVendorWithVendor>[] {
  return [
    {
      id: "priority",
      accessorKey: "is_priority",
      meta: {
        width: "w-12",
      },
      header: () => (
        <div className="flex items-center justify-center w-fit -mr-2">
          <StarOutline className="w-5 h-5 text-gray-400" />
        </div>
      ),
      cell: ({ row }) => {
        const bidVendor = row.original;
        const isPriority = bidVendor.is_priority;
        
        return (
          <div className="flex items-center justify-center w-fit -mr-2">
            <button
              onClick={() => onUpdatePriority?.(bidVendor.id, !isPriority)}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              aria-label={isPriority ? "Remove priority" : "Mark as priority"}
              title={isPriority ? "Remove priority" : "Mark as priority"}
            >
              {isPriority ? (
                <StarSolid className="w-5 h-5 text-yellow-500 hover:text-yellow-600 cursor-pointer" />
              ) : (
                <StarOutline className="w-5 h-5 text-gray-400 hover:text-yellow-400 cursor-pointer transition-colors" />
              )}
            </button>
          </div>
        );
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.is_priority ? 1 : 0;
        const b = rowB.original.is_priority ? 1 : 0;
        return b - a; // Priority items first
      },
    },
    {
      id: "vendor",
      accessorKey: "vendor.company_name",
      meta: {
        width: "w-auto",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Vendor" />
      ),
      cell: ({ row }) => {
        const bidVendor = row.original;
        return (
          <div className="flex items-center gap-2 -ml-2">
            <span className="font-medium text-gray-900 text-sm">
              {bidVendor.vendor?.company_name || 'Unknown Vendor'}
            </span>
          </div>
        );
      },
    },
    {
      id: "status",
      accessorKey: "status",
      meta: {
        width: "w-auto",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" center />
      ),
      cell: ({ row }) => {
        const bidVendor = row.original;
        const isEditing = editingVendorId === bidVendor.id;
        
        if (isEditing && onEditValueChange) {
          return (
            <div className="text-center">
              <select
                value={editValues?.status || bidVendor.status}
                onChange={(e) => onEditValueChange('status', e.target.value)}
                className="border border-blue-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              >
                <option value="pending">PENDING</option>
                <option value="yes bid">YES BID</option>
                <option value="no bid">NO BID</option>
              </select>
            </div>
          );
        }
        
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
      id: "cost_amount",
      accessorKey: "cost_amount",
      meta: {
        width: "w-auto",
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cost Amount" center />
      ),
      cell: ({ row }) => {
        const bidVendor = row.original;
        const isEditing = editingVendorId === bidVendor.id;
        
        if (isEditing && onEditValueChange && formatAmountForInput) {
          return (
            <div className="flex items-center justify-center">
              <input
                type="text"
                value={editValues?.cost_amount !== null && editValues?.cost_amount !== undefined ? `$${formatAmountForInput(editValues.cost_amount)}` : ''}
                onChange={(e) => {
                  if (parseAmountInput) {
                    const parsed = parseAmountInput(e.target.value);
                    onEditValueChange('cost_amount', parsed);
                  }
                }}
                className="w-full px-2 py-1 text-sm text-center border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="$0.00"
                step="0.01"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          );
        }
        
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
        width: "w-auto",
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
        width: "w-auto",
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
      id: "actions",
      meta: {
        width: "w-[15%]",
      },
      header: () => (
        <div className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Actions
        </div>
      ),
      cell: ({ row }) => {
        const bidVendor = row.original;
        const isEditing = editingVendorId === bidVendor.id;
        
        if (isEditing) {
          return (
            <div className="flex items-center justify-center gap-3">
              <button
                className="text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveEdit?.(bidVendor.id);
                }}
              >
                Save
              </button>
              <button
                className="text-gray-600 hover:text-gray-700 font-semibold text-sm transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelEdit?.();
                }}
              >
                Cancel
              </button>
            </div>
          );
        }
        
        return (
          <div className="flex items-center justify-center gap-3">
            <button
              className="text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit?.(bidVendor.id);
              }}
            >
              Edit
            </button>
            {onDeleteVendor && (
              <button
                className="text-red-600 hover:text-red-700 font-semibold text-sm transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteVendor(bidVendor.id);
                }}
              >
                Delete
              </button>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
  ]
}