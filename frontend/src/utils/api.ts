import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  ApiResponse, 
  CollectionListResponse, 
  CollectionResponse, 
  Document, 
  DocumentCreateRequest, 
  DocumentUpdateRequest, 
  QueryParams 
} from '../types';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('API Response Error:', error);
        return Promise.reject(error);
      }
    );
  }

  async getCollections(): Promise<CollectionListResponse> {
    try {
      const response = await this.client.get<CollectionListResponse>('/api/collections');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch collections');
    }
  }

  async getDocuments(collection: string, params?: QueryParams): Promise<CollectionResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.sort) queryParams.append('sort', params.sort);
      if (params?.order) queryParams.append('order', params.order);

      const url = `/api/${collection}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await this.client.get<CollectionResponse>(url);
      return response.data;
    } catch (error) {
      throw this.handleError(error, `Failed to fetch documents from ${collection}`);
    }
  }

  async createDocument(collection: string, data: DocumentCreateRequest): Promise<Document> {
    try {
      const response = await this.client.post<Document>(`/api/${collection}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error, `Failed to create document in ${collection}`);
    }
  }

  async getDocument(collection: string, id: string): Promise<Document> {
    try {
      const response = await this.client.get<Document>(`/api/${collection}/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, `Failed to fetch document ${id} from ${collection}`);
    }
  }

  async updateDocument(collection: string, id: string, data: DocumentUpdateRequest): Promise<Document> {
    try {
      const response = await this.client.put<Document>(`/api/${collection}/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error, `Failed to update document ${id} in ${collection}`);
    }
  }

  async deleteDocument(collection: string, id: string): Promise<void> {
    try {
      await this.client.delete(`/api/${collection}/${id}`);
    } catch (error) {
      throw this.handleError(error, `Failed to delete document ${id} from ${collection}`);
    }
  }

  private handleError(error: any, message: string): Error {
    if (error.response) {
      // Server responded with error status
      const errorMessage = error.response.data?.error || error.response.data?.message || message;
      return new Error(`${errorMessage} (${error.response.status})`);
    } else if (error.request) {
      // Request was made but no response received
      return new Error(`${message}: No response from server`);
    } else {
      // Something else happened
      return new Error(`${message}: ${error.message}`);
    }
  }
}

export default new ApiService();