import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface LoadingState {
  // Auth loading (during authentication check)
  authLoading: boolean;
  // Global app loading
  appLoading: boolean;
  // Individual operation loading
  operations: Map<string, boolean>;
}

interface LoadingContextType {
  // Auth loading state
  isAuthLoading: boolean;
  setAuthLoading: (loading: boolean) => void;
  
  // Global app loading state
  isAppLoading: boolean;
  setAppLoading: (loading: boolean) => void;
  
  // Unified loading state (auth + app)
  isGlobalLoading: boolean;
  
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
    authLoading: false,
    appLoading: true,
    operations: new Map()
  });
  
  const loadingStartTimeRef = useRef<number>(Date.now());
  const minimumLoadingTimeRef = useRef<NodeJS.Timeout | null>(null);

  const setAuthLoading = useCallback((loading: boolean) => {
    setLoadingState(prev => ({
      ...prev,
      authLoading: loading
    }));
  }, []);

  const setAppLoading = useCallback((loading: boolean) => {
    if (loading) {
      // Starting to load - record start time and clear any existing timer
      loadingStartTimeRef.current = Date.now();
      if (minimumLoadingTimeRef.current) {
        clearTimeout(minimumLoadingTimeRef.current);
      }
      setLoadingState(prev => ({
        ...prev,
        appLoading: true
      }));
    } else {
      // App wants to stop loading - but check minimum duration first
      const currentTime = Date.now();
      const elapsed = currentTime - loadingStartTimeRef.current;
      const minimumDuration = 3000; // 3 seconds for at least one animation cycle
      
      if (elapsed >= minimumDuration) {
        // Minimum time has passed, allow immediate loading completion
        setLoadingState(prev => ({
          ...prev,
          appLoading: false
        }));
      } else {
        // Need to wait for minimum duration
        const remainingTime = minimumDuration - elapsed;
        minimumLoadingTimeRef.current = setTimeout(() => {
          setLoadingState(prev => ({
            ...prev,
            appLoading: false
          }));
        }, remainingTime);
      }
    }
  }, []); // No dependencies to avoid infinite loop

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
    return loadingState.authLoading || loadingState.appLoading || loadingState.operations.size > 0;
  }, [loadingState.authLoading, loadingState.appLoading, loadingState.operations.size]);

  const isGlobalLoading = loadingState.authLoading || loadingState.appLoading;

  const clearAllOperations = useCallback(() => {
    setLoadingState(prev => ({
      ...prev,
      operations: new Map()
    }));
  }, []);

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (minimumLoadingTimeRef.current) {
        clearTimeout(minimumLoadingTimeRef.current);
      }
    };
  }, []);

  const contextValue: LoadingContextType = {
    isAuthLoading: loadingState.authLoading,
    setAuthLoading,
    isAppLoading: loadingState.appLoading,
    setAppLoading,
    isGlobalLoading,
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