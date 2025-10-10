import { useState, useCallback } from 'react';
import { Document, CollectionResponse, CollectionListResponse } from '../types';
import apiService from '../utils/api';

export interface UseApiState {
  loading: boolean;
  error: string | null;
  data: any;
}

export interface UseApiReturn<T> extends UseApiState {
  data: T | null;
  execute: (...args: any[]) => Promise<T>;
  reset: () => void;
}

export function useApi<T = any>(apiFunction: (...args: any[]) => Promise<T>): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState>({
    loading: false,
    error: null,
    data: null,
  });

  const execute = useCallback(async (...args: any[]): Promise<T> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await apiFunction(...args);
      setState({ loading: false, error: null, data: result });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setState({ loading: false, error: errorMessage, data: null });
      throw error;
    }
  }, [apiFunction]);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, data: null });
  }, []);

  return {
    ...state,
    data: state.data as T | null,
    execute,
    reset,
  };
}

// Specific hooks for common operations
export function useCollections() {
  return useApi<CollectionListResponse>(apiService.getCollections);
}

export function useDocuments(collection: string) {
  return useApi<CollectionResponse>(() => apiService.getDocuments(collection));
}

export function useCreateDocument(collection: string) {
  return useApi<Document>((data: any) => apiService.createDocument(collection, data));
}

export function useDeleteDocument(collection: string) {
  return useApi<void>((id: string) => apiService.deleteDocument(collection, id));
}