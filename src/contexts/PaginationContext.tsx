import React, { createContext, useContext, useState, useCallback } from 'react';

// Pagination state type
export interface PaginationState {
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
  loading: boolean;
}

// Filter options for bids
export interface BidFilters {
  statusFilter: string[];
  searchTerm: string;
  userFilter: string;
  departmentFilter: string;
}

// Context value type
interface PaginationContextValue {
  // Main dashboard bids pagination
  bidsPagination: PaginationState;
  bidFilters: BidFilters;
  setBidsPagination: (state: PaginationState | ((prev: PaginationState) => PaginationState)) => void;
  setBidFilters: (filters: BidFilters) => void;
  updateBidsPage: (page: number) => void;
  
  // APM Pages pagination
  apmDashboardPagination: PaginationState;
  setAPMDashboardPagination: (state: PaginationState | ((prev: PaginationState) => PaginationState)) => void;
  updateAPMDashboardPage: (page: number) => void;

  apmActivePagination: PaginationState;
  setAPMActivePagination: (state: PaginationState | ((prev: PaginationState) => PaginationState)) => void;
  updateAPMActivePage: (page: number) => void;
  
  apmArchivesPagination: PaginationState;
  setAPMArchivesPagination: (state: PaginationState | ((prev: PaginationState) => PaginationState)) => void;
  updateAPMArchivesPage: (page: number) => void;
  
  apmOnHoldPagination: PaginationState;
  setAPMOnHoldPagination: (state: PaginationState | ((prev: PaginationState) => PaginationState)) => void;
  updateAPMOnHoldPage: (page: number) => void;
  
  // Estimating Pages pagination
  estimatingArchivesPagination: PaginationState;
  setEstimatingArchivesPagination: (state: PaginationState | ((prev: PaginationState) => PaginationState)) => void;
  updateEstimatingArchivesPage: (page: number) => void;
  
  estimatingOnHoldPagination: PaginationState;
  setEstimatingOnHoldPagination: (state: PaginationState | ((prev: PaginationState) => PaginationState)) => void;
  updateEstimatingOnHoldPage: (page: number) => void;
  
  sentToAPMPagination: PaginationState;
  setSentToAPMPagination: (state: PaginationState | ((prev: PaginationState) => PaginationState)) => void;
  updateSentToAPMPage: (page: number) => void;
  
  // Legacy pagination (keep for compatibility)
  bidVendorsPagination: PaginationState;
  setBidVendorsPagination: (state: PaginationState) => void;
  updateBidVendorsPage: (page: number) => void;
  
  notesPagination: PaginationState;
  setNotesPagination: (state: PaginationState) => void;
  updateNotesPage: (page: number) => void;
  
  // Global loading state
  isGlobalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
}

// Default pagination state - page 0 indicates uninitialized
const defaultPaginationState: PaginationState = {
  page: 0,
  limit: 25,
  totalPages: 1,
  totalCount: 0,
  loading: false
};

// Default filters
const defaultBidFilters: BidFilters = {
  statusFilter: [],
  searchTerm: '',
  userFilter: '',
  departmentFilter: 'Estimating'  // Set default to Estimating for initial load
};

// Create context
const PaginationContext = createContext<PaginationContextValue | undefined>(undefined);

// Provider component
export const PaginationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Main dashboard bids pagination state
  const [bidsPagination, setBidsPaginationInternal] = useState<PaginationState>(defaultPaginationState);
  const [bidFilters, setBidFilters] = useState<BidFilters>(defaultBidFilters);

  // APM Pages pagination states
  const [apmDashboardPagination, setAPMDashboardPaginationInternal] = useState<PaginationState>(defaultPaginationState);
  const [apmArchivesPagination, setAPMArchivesPaginationInternal] = useState<PaginationState>(defaultPaginationState);
  const [apmOnHoldPagination, setAPMOnHoldPaginationInternal] = useState<PaginationState>(defaultPaginationState);
  const [apmActivePagination, setAPMActivePaginationInternal] = useState<PaginationState>(defaultPaginationState);
  
  // Estimating Pages pagination states
  const [estimatingArchivesPagination, setEstimatingArchivesPaginationInternal] = useState<PaginationState>(defaultPaginationState);
  const [estimatingOnHoldPagination, setEstimatingOnHoldPaginationInternal] = useState<PaginationState>(defaultPaginationState);
  const [sentToAPMPagination, setSentToAPMPaginationInternal] = useState<PaginationState>(defaultPaginationState);
  
  // Legacy pagination states (keep for compatibility)
  const [bidVendorsPagination, setBidVendorsPagination] = useState<PaginationState>(defaultPaginationState);
  const [notesPagination, setNotesPagination] = useState<PaginationState>(defaultPaginationState);
  
  // Global loading state
  const [isGlobalLoading, setGlobalLoading] = useState(false);

  // Wrapper functions to handle both direct state and functional updates
  const setBidsPagination = useCallback((state: PaginationState | ((prev: PaginationState) => PaginationState)) => {
    if (typeof state === 'function') {
      setBidsPaginationInternal(state);
    } else {
      setBidsPaginationInternal(state);
    }
  }, []);

  const setAPMDashboardPagination = useCallback((state: PaginationState | ((prev: PaginationState) => PaginationState)) => {
    if (typeof state === 'function') {
      setAPMDashboardPaginationInternal(state);
    } else {
      setAPMDashboardPaginationInternal(state);
    }
  }, []);

  const setAPMActivePagination = useCallback((state: PaginationState | ((prev: PaginationState) => PaginationState)) => {
    if (typeof state === 'function') {
      setAPMActivePaginationInternal(state);
    } else {
      setAPMActivePaginationInternal(state);
    }
  }, []);

  const setAPMArchivesPagination = useCallback((state: PaginationState | ((prev: PaginationState) => PaginationState)) => {
    if (typeof state === 'function') {
      setAPMArchivesPaginationInternal(state);
    } else {
      setAPMArchivesPaginationInternal(state);
    }
  }, []);

  const setAPMOnHoldPagination = useCallback((state: PaginationState | ((prev: PaginationState) => PaginationState)) => {
    if (typeof state === 'function') {
      setAPMOnHoldPaginationInternal(state);
    } else {
      setAPMOnHoldPaginationInternal(state);
    }
  }, []);

  const setEstimatingArchivesPagination = useCallback((state: PaginationState | ((prev: PaginationState) => PaginationState)) => {
    if (typeof state === 'function') {
      setEstimatingArchivesPaginationInternal(state);
    } else {
      setEstimatingArchivesPaginationInternal(state);
    }
  }, []);

  const setEstimatingOnHoldPagination = useCallback((state: PaginationState | ((prev: PaginationState) => PaginationState)) => {
    if (typeof state === 'function') {
      setEstimatingOnHoldPaginationInternal(state);
    } else {
      setEstimatingOnHoldPaginationInternal(state);
    }
  }, []);

  const setSentToAPMPagination = useCallback((state: PaginationState | ((prev: PaginationState) => PaginationState)) => {
    if (typeof state === 'function') {
      setSentToAPMPaginationInternal(state);
    } else {
      setSentToAPMPaginationInternal(state);
    }
  }, []);

  // Update functions
  const updateBidsPage = useCallback((page: number) => {
    setBidsPagination(prev => ({ ...prev, page, loading: true }));
  }, []);

  const updateAPMDashboardPage = useCallback((page: number) => {
    setAPMDashboardPagination(prev => ({ ...prev, page, loading: true }));
  }, []);

  const updateAPMActivePage = useCallback((page: number) => {
    setAPMActivePagination(prev => ({ ...prev, page, loading: true }));
  }, []);

  const updateAPMArchivesPage = useCallback((page: number) => {
    setAPMArchivesPagination(prev => ({ ...prev, page, loading: true }));
  }, []);

  const updateAPMOnHoldPage = useCallback((page: number) => {
    setAPMOnHoldPagination(prev => ({ ...prev, page, loading: true }));
  }, []);

  const updateEstimatingArchivesPage = useCallback((page: number) => {
    setEstimatingArchivesPagination(prev => ({ ...prev, page, loading: true }));
  }, []);

  const updateEstimatingOnHoldPage = useCallback((page: number) => {
    setEstimatingOnHoldPagination(prev => ({ ...prev, page, loading: true }));
  }, []);

  const updateSentToAPMPage = useCallback((page: number) => {
    setSentToAPMPagination(prev => ({ ...prev, page, loading: true }));
  }, []);

  const updateBidVendorsPage = useCallback((page: number) => {
    setBidVendorsPagination(prev => ({ ...prev, page, loading: true }));
  }, []);

  const updateNotesPage = useCallback((page: number) => {
    setNotesPagination(prev => ({ ...prev, page, loading: true }));
  }, []);

  const contextValue: PaginationContextValue = {
    // Main dashboard bids pagination
    bidsPagination,
    bidFilters,
    setBidsPagination,
    setBidFilters,
    updateBidsPage,
    
    // APM Pages pagination
    apmDashboardPagination,
    setAPMDashboardPagination,
    updateAPMDashboardPage,
  
    apmActivePagination,
    setAPMActivePagination,
    updateAPMActivePage,

    apmArchivesPagination,
    setAPMArchivesPagination,
    updateAPMArchivesPage,
    
    apmOnHoldPagination,
    setAPMOnHoldPagination,
    updateAPMOnHoldPage,
    
    // Estimating Pages pagination
    estimatingArchivesPagination,
    setEstimatingArchivesPagination,
    updateEstimatingArchivesPage,
    
    estimatingOnHoldPagination,
    setEstimatingOnHoldPagination,
    updateEstimatingOnHoldPage,
    
    sentToAPMPagination,
    setSentToAPMPagination,
    updateSentToAPMPage,
    
    // Legacy pagination (keep for compatibility)
    bidVendorsPagination,
    setBidVendorsPagination,
    updateBidVendorsPage,
    
    notesPagination,
    setNotesPagination,
    updateNotesPage,
    
    // Global loading state
    isGlobalLoading,
    setGlobalLoading
  };

  return (
    <PaginationContext.Provider value={contextValue}>
      {children}
    </PaginationContext.Provider>
  );
};

// Custom hook to use pagination context
export const usePagination = (): PaginationContextValue => {
  const context = useContext(PaginationContext);
  if (context === undefined) {
    throw new Error('usePagination must be used within a PaginationProvider');
  }
  return context;
};