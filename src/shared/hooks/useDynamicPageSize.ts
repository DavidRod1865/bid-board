import { useState, useEffect } from 'react';

export const useDynamicPageSize = (rowHeight: number = 60, minPageSize: number = 5, maxPageSize: number = 20) => {
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const calculatePageSize = () => {
      // Get viewport height
      const viewportHeight = window.innerHeight;
      
      // Estimate space taken by other elements:
      // - Sidebar header: ~60px
      // - Page title: ~40px  
      // - Search card: ~80px
      // - Status tabs: ~60px
      // - Table header: ~50px
      // - Pagination: ~50px
      // - Padding/margins: ~100px
      const reservedHeight = 440;
      
      // Calculate available height for table rows
      const availableHeight = viewportHeight - reservedHeight;
      
      // Calculate how many rows can fit
      const calculatedPageSize = Math.floor(availableHeight / rowHeight);
      
      // Clamp between min and max values
      const newPageSize = Math.max(minPageSize, Math.min(maxPageSize, calculatedPageSize));
      
      setPageSize(newPageSize);
    };

    // Calculate initial page size
    calculatePageSize();

    // Recalculate on window resize
    window.addEventListener('resize', calculatePageSize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', calculatePageSize);
    };
  }, [rowHeight, minPageSize, maxPageSize]);

  return pageSize;
};