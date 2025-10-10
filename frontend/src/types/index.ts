// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Document Types
export interface Document {
  _id: string;
  [key: string]: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface CollectionResponse {
  data: Document[];
  pagination: PaginationInfo;
}

export interface CollectionListResponse {
  collections: string[];
}

// Component Props Types
export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorBoundaryState>;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

// App State Types
export interface AppState {
  collections: string[];
  currentCollection: string;
  documents: Document[];
  jsonInput: string;
  loading: boolean;
  error: string;
  success: string;
  showConfirmDialog: boolean;
  documentToDelete: string | null;
}

// API Service Types
export interface ApiService {
  getCollections(): Promise<CollectionListResponse>;
  getDocuments(collection: string, params?: QueryParams): Promise<CollectionResponse>;
  createDocument(collection: string, data: DocumentCreateRequest): Promise<Document>;
  getDocument(collection: string, id: string): Promise<Document>;
  updateDocument(collection: string, id: string, data: DocumentUpdateRequest): Promise<Document>;
  deleteDocument(collection: string, id: string): Promise<void>;
}

// Query Parameters
export interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Document Request Types
export interface DocumentCreateRequest {
  [key: string]: any;
}

export interface DocumentUpdateRequest {
  [key: string]: any;
}

// Error Types
export interface ApiError {
  error: string;
  message: string;
  field?: string;
  details?: string;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Event Handler Types
export type CollectionChangeHandler = (collection: string) => void;
export type JsonInputChangeHandler = (value: string) => void;
export type DocumentDeleteHandler = (id: string) => void;
export type ConfirmDeleteHandler = () => void;
export type CancelDeleteHandler = () => void;

// Utility Types
export type SizeVariant = 'small' | 'medium' | 'large';
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Environment Types
export interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

export interface ImportMeta {
  readonly env: ImportMetaEnv;
}