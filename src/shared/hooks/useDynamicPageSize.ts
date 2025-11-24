import { useState, useEffect } from 'react';

interface UseDynamicPageSizeOptions {
  rowHeight?: number;
  minPageSize?: number;
  maxPageSize?: number;
  storageKey?: string;
  reservedHeight?: number;
}

interface DynamicPageSizeReturn {
  pageSize: number;
  calculatedPageSize: number;
  isManualOverride: boolean;
  setManualPageSize: (size: number | null) => void;
  availablePageSizes: number[];
}

export const useDynamicPageSize = (options: UseDynamicPageSizeOptions = {}): DynamicPageSizeReturn => {
  const {
    rowHeight = 60,
    minPageSize = 5,
    maxPageSize = 50,
    storageKey = 'table-page-size',
    reservedHeight = 440
  } = options;

  const [calculatedPageSize, setCalculatedPageSize] = useState(10);
  const [manualPageSize, setManualPageSizeState] = useState<number | null>(null);

  // Standard page size options for dropdown
  const availablePageSizes = [10, 15, 20, 25, 30, 50].filter(
    size => size >= minPageSize && size <= maxPageSize
  );

  useEffect(() => {
    // Load saved manual preference
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= minPageSize && parsed <= maxPageSize) {
        setManualPageSizeState(parsed);
      }
    }
  }, [storageKey, minPageSize, maxPageSize]);

  useEffect(() => {
    const calculatePageSize = () => {
      // Get viewport height
      const viewportHeight = window.innerHeight;
      
      // Calculate available height for table rows
      const availableHeight = viewportHeight - reservedHeight;
      
      // Calculate how many rows can fit
      const calculated = Math.floor(availableHeight / rowHeight);
      
      // Clamp between min and max values
      const clampedSize = Math.max(minPageSize, Math.min(maxPageSize, calculated));
      
      setCalculatedPageSize(clampedSize);
    };

    // Calculate initial page size
    calculatePageSize();

    // Recalculate on window resize, but clear manual override
    const handleResize = () => {
      calculatePageSize();
      // Clear manual override on resize to recalculate optimal size
      if (manualPageSize !== null) {
        setManualPageSizeState(null);
        localStorage.removeItem(storageKey);
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [rowHeight, minPageSize, maxPageSize, reservedHeight, storageKey, manualPageSize]);

  const setManualPageSize = (size: number | null) => {
    setManualPageSizeState(size);
    if (size === null) {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, size.toString());
    }
  };

  // Use manual override if set, otherwise use calculated size
  const effectivePageSize = manualPageSize ?? calculatedPageSize;

  return {
    pageSize: effectivePageSize,
    calculatedPageSize,
    isManualOverride: manualPageSize !== null,
    setManualPageSize,
    availablePageSizes
  };
};