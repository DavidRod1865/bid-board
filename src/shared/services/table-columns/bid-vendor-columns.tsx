import type { ColumnDef } from "@tanstack/react-table"
import type { BidVendor, Vendor } from "../../types"
import { DataTableColumnHeader } from "../../components/ui/data-table-column-header"
import { formatDate, formatCurrency, getBidUrgency } from "../../utils/formatters"
import { getVendorStatusColor } from "../../utils/statusUtils"
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import { StarIcon as StarOutline, EllipsisVerticalIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { CalendarIcon } from '@heroicons/react/24/outline'
import { Calendar } from "../../components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"

// Controlled component for cost amount input
function CostAmountInput({ 
  value,
  originalValue,
  onChange 
}: { 
  value: string | null;
  originalValue: number | string | null;
  onChange: (value: string) => void;
}) {
  // Derive the display value:
  // - If value is provided (user has typed something), use it directly
  // - Otherwise, format the original value for display
  const displayValue = (() => {
    if (value !== null && value !== undefined) {
      return value;
    }
    if (originalValue === null || originalValue === undefined) return '';
    const numValue = typeof originalValue === 'string' ? parseFloat(originalValue) : originalValue;
    if (isNaN(numValue)) return '';
    return numValue.toFixed(2);
  })();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty input, numbers, and single decimal point
    // Also allow partial input like "." or "1." for better UX
    if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
      onChange(inputValue);
    }
  };

  return (
    <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          className="w-32 pl-5 pr-2 py-1 text-sm text-right border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0.00"
          autoFocus
        />
      </div>
    </div>
  );
}

interface BidVendorWithVendor extends BidVendor {
  vendor?: Vendor
}

export function createBidVendorColumns(
  _onEdit?: (vendorId: number) => void,
  onUpdatePriority?: (bidVendorId: number, isPriority: boolean) => void,
  editingVendorId?: number | null,
  editValues?: { cost_amount: number | string | null; status: string; response_received_date: string | null; due_date: string | null },
  onStartEdit?: (bidVendorId: number) => void,
  onSaveEdit?: (bidVendorId: number) => void,
  onCancelEdit?: () => void,
  onEditValueChange?: (field: 'cost_amount' | 'status' | 'response_received_date' | 'due_date', value: any) => void,
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
        <div className="flex items-center justify-center">
          <StarOutline className="w-5 h-5 text-gray-400" />
        </div>
      ),
      cell: ({ row }) => {
        const bidVendor = row.original;
        const isPriority = bidVendor.is_priority;
        
        return (
          <div className="flex items-center justify-center">
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
          <div className="flex items-center gap-2">
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
      cell: function CostAmountCell({ row }) {
        const bidVendor = row.original;
        const isEditing = editingVendorId === bidVendor.id;
        
        if (isEditing && onEditValueChange) {
          return (
            <CostAmountInput
              value={typeof editValues?.cost_amount === 'string' ? editValues.cost_amount : null}
              originalValue={bidVendor.cost_amount}
              onChange={(value) => onEditValueChange('cost_amount', value)}
            />
          );
        }
        
        const displayAmount = bidVendor.cost_amount !== null && bidVendor.cost_amount !== undefined
          ? Number(bidVendor.cost_amount)
          : null;
        
        return (
          <div className="flex items-center justify-center">
            {displayAmount !== null ? (
              <span className="text-gray-900 font-medium text-sm">
                {formatCurrency(displayAmount)}
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
        const isEditing = editingVendorId === bidVendor.id;
        
        if (isEditing && onEditValueChange) {
          const dateValue = editValues?.response_received_date || '';
          const selectedDate = dateValue ? new Date(dateValue + 'T00:00:00') : undefined;
          
          return (
            <div className="text-center" onClick={(e) => e.stopPropagation()}>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="inline-flex items-center gap-2 border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:bg-gray-50"
                  >
                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                    <span className={dateValue ? "text-gray-900" : "text-gray-400"}>
                      {dateValue ? formatDate(dateValue, "short") : "Select date"}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        const year = date.getUTCFullYear();
                        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                        const day = String(date.getUTCDate()).padStart(2, '0');
                        onEditValueChange('response_received_date', `${year}-${month}-${day}`);
                      } else {
                        onEditValueChange('response_received_date', null);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          );
        }
        
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
        const isEditing = editingVendorId === bidVendor.id;
        
        if (isEditing && onEditValueChange) {
          const dateValue = editValues?.due_date || '';
          const selectedDate = dateValue ? new Date(dateValue + 'T00:00:00') : undefined;
          
          return (
            <div className="text-center" onClick={(e) => e.stopPropagation()}>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="inline-flex items-center gap-2 border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:bg-gray-50"
                  >
                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                    <span className={dateValue ? "text-gray-900" : "text-gray-400"}>
                      {dateValue ? formatDate(dateValue, "short") : "Select date"}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        const year = date.getUTCFullYear();
                        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                        const day = String(date.getUTCDate()).padStart(2, '0');
                        onEditValueChange('due_date', `${year}-${month}-${day}`);
                      } else {
                        onEditValueChange('due_date', null);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          );
        }
        
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
        width: "w-[80px]",
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
          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 rounded-md hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Actions"
                >
                  <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => onStartEdit?.(bidVendor.id)}
                  className="cursor-pointer"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                {onDeleteVendor && (
                  <DropdownMenuItem
                    onClick={() => onDeleteVendor(bidVendor.id)}
                    variant="destructive"
                    className="cursor-pointer"
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      enableSorting: false,
    },
  ]
}