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
import { useState, useEffect } from "react"
import NoDataFound from "./NoDataFound"

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
  emptyActionLabel?: string
  onEmptyAction?: () => void
  // Custom row styling
  getRowClassName?: (row: TData) => string
  getRowStyle?: (row: TData) => React.CSSProperties
  getRowBorderColor?: (row: TData) => string
  // Initial sorting
  initialSorting?: SortingState
  // Disable sorting
  enableSorting?: boolean
  // Page size for pagination
  pageSize?: number
  // Dynamic page size controls
  enablePageSizeSelector?: boolean
  availablePageSizes?: number[]
  onPageSizeChange?: (size: number) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  enableRowSelection = false,
  rowSelection = {},
  onRowSelectionChange,
  onRowClick,
  isLoading = false,
  emptyActionLabel,
  onEmptyAction,
  getRowClassName,
  getRowStyle,
  getRowBorderColor,
  initialSorting = [],
  enableSorting = true,
  pageSize = 25,
  enablePageSizeSelector = false,
  availablePageSizes = [10, 15, 20, 25, 30, 50],
  onPageSizeChange,
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
            width: "w-[2.5%]",
          },
          header: ({ table }: { table: Table<TData> }) => (
            <input
              type="checkbox"
              checked={table.getIsAllPageRowsSelected()}
              ref={(el) => {
                if (el) el.indeterminate = table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()
              }}
              onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
              aria-label="Select all"
              className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
            />
          ),
          cell: ({ row }: { row: Row<TData> }) => {
            const isSelected = row.getIsSelected();
            return (
              <div className="flex items-center justify-center w-full h-full py-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    row.toggleSelected(e.target.checked);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Select row"
                  className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500 cursor-pointer"
                />
              </div>
            );
          },
          enableResizing: true,
          enableSorting: false,
          enableHiding: false,
        },
        ...columns,
      ]
    : columns

  const table = useReactTable({
    data,
    columns: tableColumns,
    onSortingChange: enableSorting ? setSorting : undefined,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: getFilteredRowModel(),
    enableSorting,
    enableRowSelection,
    initialState: {
      pagination: {
        pageSize,
      },
    },
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

  // Update table page size when pageSize prop changes
  useEffect(() => {
    if (table && pageSize !== table.getState().pagination.pageSize) {
      table.setPageSize(pageSize)
    }
  }, [pageSize, table])

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
      <div className="bg-slate-100 rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-100 shadow-sm flex-1 flex flex-col h-full relative">
      <div className="overflow-x-scroll overflow-y-auto flex-1 min-w-0 pb-4 data-table-scroll" style={{ scrollbarWidth: 'thin', scrollbarColor: '#94a3b8 #f1f5f9' }}>
        <table className="table-auto w-full">
          <thead className="bg-slate-100 border-b-2 border-gray-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const columnId = header.column.id;
                  const shouldCenter = columnId !== 'project' && columnId !== 'notes' && columnId !== 'description';
                  const isStickyProjectColumn = columnId === 'project';
                  return (
                    <th
                      key={header.id}
                      className={`px-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 last:border-r-0 ${
                        header.column.columnDef.meta?.width || ''
                      } ${
                        isStickyProjectColumn 
                          ? 'sticky left-0 z-20 bg-slate-100 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]' 
                          : ''
                      } ${
                        shouldCenter ? 'text-center' : 'text-left'
                      }`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, rowIndex) => {
                const borderColor = getRowBorderColor ? getRowBorderColor(row.original) : '';
                const isEven = rowIndex % 2 === 0;
                // Always apply default background color for alternating rows
                const baseBgColor = isEven ? 'bg-white' : 'bg-gray-50';
                const baseBgColorValue = isEven ? '#ffffff' : '#f9fafb';
                const rowStyle = getRowStyle ? getRowStyle(row.original) : {};
                // Merge row style with background color to ensure alternating colors work
                const mergedRowStyle = {
                  backgroundColor: rowStyle.backgroundColor || baseBgColorValue,
                  ...rowStyle,
                };
                return (
                  <tr
                  key={row.id}
                  className={`relative ${baseBgColor} border-b border-gray-200 transition-all group hover:bg-blue-50 cursor-pointer ${
                    getRowClassName ? getRowClassName(row.original) : ''
                    }`}
                    style={mergedRowStyle}
                    onClick={(e) => handleRowClick(row.original, e)}
                    >
                    {borderColor && (
                      <div 
                        className={`absolute left-0 top-0 bottom-0 w-1 ${borderColor}`}
                      />
                    )}
                    {row.getVisibleCells().map((cell) => {
                      const columnId = cell.column.id;
                      const isProjectColumn = columnId === 'project';
                      // For sticky project column, ensure it has the same background as the row
                      const cellBgColor = isProjectColumn ? baseBgColor : '';
                      // For sticky column, use CSS variable approach or ensure hover works with inline style
                      // Remove backgroundColor from inline style for sticky column to allow hover to work properly
                      const cellStyle = isProjectColumn
                        ? Object.fromEntries(Object.entries(rowStyle).filter(([key]) => key !== 'backgroundColor'))
                        : {};
                      const shouldCenter = columnId !== 'project' && columnId !== 'notes' && columnId !== 'description';
                      const shouldWrap = columnId === 'notes' || columnId === 'project';
                      return (
                        <td 
                          key={cell.id} 
                          className={`px-2 py-3 border-r border-gray-200 last:border-r-0 transition-colors ${
                            shouldWrap ? '' : 'whitespace-nowrap'
                          } ${
                            cell.column.columnDef.meta?.width || ''
                          } ${
                            isProjectColumn 
                              ? `sticky left-0 z-20 ${cellBgColor} group-hover:bg-blue-50 text-left shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]` 
                              : 'group-hover:bg-blue-50'
                          } ${
                            shouldCenter ? 'text-center' : ''
                          }`}
                          style={cellStyle}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={tableColumns.length}
                  className="text-center border-r border-gray-200"
                >
                  <NoDataFound 
                    onAddNew={onEmptyAction}
                    actionLabel={emptyActionLabel}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls */}
      {(table.getPageCount() > 1 || enablePageSizeSelector) && (
        <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center text-sm text-gray-700 order-2 sm:order-1">
            <span className="hidden sm:inline">
              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
              {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} of{' '}
              {table.getFilteredRowModel().rows.length} results
            </span>
            <span className="sm:hidden">{table.getFilteredRowModel().rows.length} results</span>
          </div>
          
          <div className="flex items-center gap-3 order-1 sm:order-2">
            {/* Page Size Selector */}
            {enablePageSizeSelector && onPageSizeChange && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 whitespace-nowrap">Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newPageSize = Number(e.target.value)
                    table.setPageSize(newPageSize)
                    onPageSizeChange(newPageSize)
                  }}
                  className="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {availablePageSizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="px-2 sm:px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-yellow-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              
              <span className="text-sm text-gray-700 whitespace-nowrap">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="px-2 sm:px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-yellow-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}