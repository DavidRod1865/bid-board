import { flexRender, useReactTable } from "@tanstack/react-table"
import {
  type ColumnDef,
  type ColumnFiltersState, 
  type SortingState,
  type VisibilityState,
  type Table,
  type Row,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/table-core"
import { useState } from "react"
import { Checkbox } from "./checkbox"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  // Selection props
  enableRowSelection?: boolean
  rowSelection?: Record<string, boolean>
  onRowSelectionChange?: (selection: Record<string, boolean>) => void
  // Row click handler
  onRowClick?: (row: TData) => void
  // Loading state
  isLoading?: boolean
  // Empty state
  emptyMessage?: string
  emptyIcon?: React.ComponentType<{ className?: string }>
  // Custom row styling
  getRowClassName?: (row: TData) => string
  getRowStyle?: (row: TData) => React.CSSProperties
  // Initial sorting
  initialSorting?: SortingState
}

export function DataTable<TData, TValue>({
  columns,
  data,
  enableRowSelection = false,
  rowSelection = {},
  onRowSelectionChange,
  onRowClick,
  isLoading = false,
  emptyMessage = "No results.",
  emptyIcon: EmptyIcon,
  getRowClassName,
  getRowStyle,
  initialSorting = [],
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  // Add row selection column if enabled
  const tableColumns = enableRowSelection
    ? [
        {
          id: "select",
          meta: {
            width: "w-[2.5%]"
          },
          header: ({ table }: { table: Table<TData> }) => (
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Select all"
              className="h-4 w-4 data-[state=checked]:bg-[#d4af37] data-[state=checked]:border-[#d4af37] focus-visible:ring-[#d4af37]/50"
            />
          ),
          cell: ({ row }: { row: Row<TData> }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
              className="h-4 w-4 data-[state=checked]:bg-[#d4af37] data-[state=checked]:border-[#d4af37] focus-visible:ring-[#d4af37]/50"
            />
          ),
          enableSorting: false,
          enableHiding: false,
        },
        ...columns,
      ]
    : columns

  const table = useReactTable({
    data,
    columns: tableColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: onRowSelectionChange ? (updater) => {
      if (typeof updater === 'function') {
        const newSelection = updater(rowSelection);
        onRowSelectionChange(newSelection);
      } else {
        onRowSelectionChange(updater);
      }
    } : undefined,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  const handleRowClick = (row: TData, event: React.MouseEvent) => {
    const target = event.target as HTMLElement
    // Don't trigger row click if clicking on interactive elements
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'SELECT' ||
      target.closest('input') ||
      target.closest('button') ||
      target.closest('select')
    ) {
      return
    }
    
    if (onRowClick) {
      onRowClick(row)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
      <div className="overflow-auto flex-1">
        <table className="w-full table-fixed">
          <thead className="bg-gray-50 border-b border-gray-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`px-2 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide ${
                      header.column.columnDef.meta?.width || ''
                    }`}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-gray-200 transition-all hover:bg-gray-50 cursor-pointer ${
                    getRowClassName ? getRowClassName(row.original) : ''
                  }`}
                  style={getRowStyle ? getRowStyle(row.original) : {}}
                  onClick={(e) => handleRowClick(row.original, e)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td 
                      key={cell.id} 
                      className={`px-2 py-3 ${
                        cell.column.columnDef.meta?.width || ''
                      }`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={tableColumns.length}
                  className="h-24 text-center"
                >
                  <div className="text-center py-12">
                    {EmptyIcon && (
                      <div className="text-gray-400 mb-4">
                        <EmptyIcon className="mx-auto h-24 w-24" />
                      </div>
                    )}
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{emptyMessage}</h3>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}