import React from 'react';
import type { Bid } from '../../types';

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
  sortField?: keyof T; // The actual field name to sort by
}

interface SelectableTableProps {
  bids: Bid[];
  columns: TableColumn<Bid>[];
  selectedBids: Set<number>;
  onBidSelect: (bidId: number, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onRowClick?: (bid: Bid, event: React.MouseEvent) => void;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  gridCols?: string;
  // Sorting props
  sortField?: keyof Bid | null;
  sortDirection?: "asc" | "desc";
  onSort?: (field: keyof Bid) => void;
}

const SelectableTable: React.FC<SelectableTableProps> = ({
  bids,
  columns,
  selectedBids,
  onBidSelect,
  onSelectAll,
  onRowClick,
  isAllSelected,
  isSomeSelected,
  loading = false,
  emptyMessage = 'No items found',
  emptyIcon: EmptyIcon,
  gridCols = `0.5fr ${columns.map(() => '1fr').join(' ')}`,
  sortField,
  sortDirection,
  onSort
}) => {
  const handleBidSelect = (bidId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    onBidSelect(bidId, event.target.checked);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    onSelectAll(event.target.checked);
  };

  const handleRowClick = (bid: Bid, event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'SELECT' ||
      target.closest('input') ||
      target.closest('button') ||
      target.closest('select')
    ) {
      return;
    }
    
    if (onRowClick) {
      onRowClick(bid, event);
    }
  };

  const handleSort = (field: keyof Bid) => {
    if (onSort) {
      onSort(field);
    }
  };

  const SortableHeader: React.FC<{
    field: keyof Bid;
    children: React.ReactNode;
    className?: string;
  }> = ({ field, children, className }) => {
    const isCentered = className?.includes('text-center');
    const justifyClass = isCentered ? 'justify-center' : '';
    
    return (
      <div
        className={`text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer flex items-center hover:text-gray-700 transition-colors ${justifyClass} ${className || ''}`}
        onClick={() => handleSort(field)}
      >
        {children}
        {sortField === field && (
          <span className="ml-1">
            {sortDirection === "asc" ? "↑" : "↓"}
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="text-center py-12">
          {EmptyIcon && (
            <div className="text-gray-400 mb-4">
              <EmptyIcon className="mx-auto h-24 w-24" />
            </div>
          )}
          <h3 className="text-lg font-medium text-gray-900 mb-2">{emptyMessage}</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
      {/* Table Header */}
      <div 
        className="grid bg-gray-50 border-b border-gray-200 px-4 py-3"
        style={{ gridTemplateColumns: gridCols }}
      >
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(input) => {
              if (input) input.indeterminate = isSomeSelected && !isAllSelected;
            }}
            onChange={handleSelectAll}
            className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded"
          />
        </div>
        {columns.map((column) => (
          <div key={column.key}>
            {column.sortable && onSort ? (
              <SortableHeader 
                field={column.sortField || column.key as keyof Bid} 
                className={column.headerClassName}
              >
                {column.header}
              </SortableHeader>
            ) : (
              <div
                className={`text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center ${column.headerClassName?.includes('text-center') ? 'justify-center' : ''} ${column.headerClassName || ''}`}
              >
                {column.header}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto">
        {bids.map((bid) => (
          <div
            key={bid.id}
            className="grid border-b border-gray-200 px-4 py-3 items-center transition-all relative hover:bg-gray-50 cursor-pointer"
            style={{ gridTemplateColumns: gridCols }}
            onClick={(e) => handleRowClick(bid, e)}
          >
            {/* Checkbox */}
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={selectedBids.has(bid.id)}
                onChange={(e) => handleBidSelect(bid.id, e)}
                className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300 rounded"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Dynamic Columns */}
            {columns.map((column) => (
              <div key={column.key} className={column.className || ''}>
                {column.render(bid)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SelectableTable;