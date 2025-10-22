import { useState, useEffect } from 'react';
import type { Bid } from '../types';

interface UseBulkSelectionReturn {
  selectedBids: Set<number>;
  handleBidSelect: (bidId: number, selected: boolean) => void;
  handleSelectAll: (selected: boolean, visibleBids: Bid[]) => void;
  clearSelection: () => void;
  isAllSelected: (visibleBids: Bid[]) => boolean;
  isSomeSelected: (visibleBids: Bid[]) => boolean;
}

export const useBulkSelection = (): UseBulkSelectionReturn => {
  const [selectedBids, setSelectedBids] = useState<Set<number>>(new Set());

  const handleBidSelect = (bidId: number, selected: boolean) => {
    setSelectedBids(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(bidId);
      } else {
        newSet.delete(bidId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (selected: boolean, visibleBids: Bid[]) => {
    if (selected) {
      // Select all visible bids
      setSelectedBids(new Set(visibleBids.map(bid => bid.id)));
    } else {
      // Deselect all
      setSelectedBids(new Set());
    }
  };

  const clearSelection = () => {
    setSelectedBids(new Set());
  };

  const isAllSelected = (visibleBids: Bid[]): boolean => {
    return visibleBids.length > 0 && visibleBids.every(bid => selectedBids.has(bid.id));
  };

  const isSomeSelected = (visibleBids: Bid[]): boolean => {
    return visibleBids.some(bid => selectedBids.has(bid.id));
  };

  return {
    selectedBids,
    handleBidSelect,
    handleSelectAll,
    clearSelection,
    isAllSelected,
    isSomeSelected
  };
};

// Hook to clear selection when filters change
export const useClearSelectionOnFilterChange = (
  clearSelection: () => void,
  dependencies: any[]
) => {
  useEffect(() => {
    clearSelection();
  }, dependencies);
};