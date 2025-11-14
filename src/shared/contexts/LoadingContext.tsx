import React, { createContext, useContext, useState, useCallback } from 'react';

interface LoadingState {
  // Global app loading
  appLoading: boolean;
  // Individual operation loading
  operations: Map<string, boolean>;
}

interface LoadingContextType {
  // Global loading state
  isAppLoading: boolean;
  setAppLoading: (loading: boolean) => void;
  
  // Operation-specific loading
  isOperationLoading: (operationId: string) => boolean;
  setOperationLoading: (operationId: string, loading: boolean) => void;
  
  // Utility methods
  hasAnyLoading: () => boolean;
  clearAllOperations: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    appLoading: true,
    operations: new Map()
  });

  const setAppLoading = useCallback((loading: boolean) => {
    setLoadingState(prev => ({
      ...prev,
      appLoading: loading
    }));
  }, []);

  const setOperationLoading = useCallback((operationId: string, loading: boolean) => {
    setLoadingState(prev => {
      const newOperations = new Map(prev.operations);
      if (loading) {
        newOperations.set(operationId, true);
      } else {
        newOperations.delete(operationId);
      }
      return {
        ...prev,
        operations: newOperations
      };
    });
  }, []);

  const isOperationLoading = useCallback((operationId: string) => {
    return loadingState.operations.has(operationId);
  }, [loadingState.operations]);

  const hasAnyLoading = useCallback(() => {
    return loadingState.appLoading || loadingState.operations.size > 0;
  }, [loadingState.appLoading, loadingState.operations.size]);

  const clearAllOperations = useCallback(() => {
    setLoadingState(prev => ({
      ...prev,
      operations: new Map()
    }));
  }, []);

  const contextValue: LoadingContextType = {
    isAppLoading: loadingState.appLoading,
    setAppLoading,
    isOperationLoading,
    setOperationLoading,
    hasAnyLoading,
    clearAllOperations
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};