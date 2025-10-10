import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

// Mock API service
vi.mock('./utils/api', () => ({
  default: {
    getCollections: vi.fn(),
    getDocuments: vi.fn(),
    createDocument: vi.fn(),
    deleteDocument: vi.fn(),
  }
}));

describe('App Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('renders the main title', () => {
    render(<App />);
    expect(screen.getByText('Universal Data Stack')).toBeInTheDocument();
  });

  it('renders collection selection dropdown', () => {
    render(<App />);
    expect(screen.getByText('Select Collection:')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('loads collections on mount', async () => {
    const mockCollections = ['users', 'products', 'orders'];
    const { default: apiService } = await import('./utils/api');
    apiService.getCollections.mockResolvedValueOnce({ collections: mockCollections });

    render(<App />);

    await waitFor(() => {
      expect(apiService.getCollections).toHaveBeenCalled();
    });
  });

  it('shows error message when collections fail to load', async () => {
    const { default: apiService } = await import('./utils/api');
    apiService.getCollections.mockRejectedValueOnce(new Error('Network error'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load collections/)).toBeInTheDocument();
    });
  });

  it('shows JSON input when collection is selected', async () => {
    const mockCollections = ['users'];
    const { default: apiService } = await import('./utils/api');
    apiService.getCollections.mockResolvedValueOnce({ collections: mockCollections });
    apiService.getDocuments.mockResolvedValueOnce({ data: [], pagination: { page: 1, limit: 100, total: 0, pages: 0 } });

    render(<App />);

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'users' } });
    });

    await waitFor(() => {
      expect(screen.getByText(/Add New Document to "users"/)).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  it('validates JSON input', async () => {
    const mockCollections = ['users'];
    const { default: apiService } = await import('./utils/api');
    apiService.getCollections.mockResolvedValueOnce({ collections: mockCollections });
    apiService.getDocuments.mockResolvedValueOnce({ data: [], pagination: { page: 1, limit: 100, total: 0, pages: 0 } });

    render(<App />);

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'users' } });
    });

    await waitFor(() => {
      const textarea = screen.getByRole('textbox');
      const saveButton = screen.getByText('Save Document');

      // Test invalid JSON
      fireEvent.change(textarea, { target: { value: 'invalid json' } });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Invalid JSON format/)).toBeInTheDocument();
    });
  });

  it('saves document with valid JSON', async () => {
    const mockCollections = ['users'];
    const mockDocument = { _id: '123', name: 'John Doe', email: 'john@example.com' };
    const { default: apiService } = await import('./utils/api');
    
    apiService.getCollections.mockResolvedValueOnce({ collections: mockCollections });
    apiService.getDocuments.mockResolvedValueOnce({ data: [], pagination: { page: 1, limit: 100, total: 0, pages: 0 } });
    apiService.createDocument.mockResolvedValueOnce(mockDocument);

    render(<App />);

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'users' } });
    });

    await waitFor(() => {
      const textarea = screen.getByRole('textbox');
      const saveButton = screen.getByText('Save Document');

      fireEvent.change(textarea, { 
        target: { value: '{"name": "John Doe", "email": "john@example.com"}' } 
      });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(apiService.createDocument).toHaveBeenCalledWith(
        { name: 'John Doe', email: 'john@example.com' }
      );
    });
  });

  it('loads documents when collection is selected', async () => {
    const mockCollections = ['users'];
    const mockDocuments = [
      { _id: '1', name: 'John Doe' },
      { _id: '2', name: 'Jane Smith' }
    ];
    const { default: apiService } = await import('./utils/api');
    
    apiService.getCollections.mockResolvedValueOnce({ collections: mockCollections });
    apiService.getDocuments.mockResolvedValueOnce({ 
      data: mockDocuments, 
      pagination: { page: 1, limit: 100, total: 2, pages: 1 } 
    });

    render(<App />);

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'users' } });
    });

    await waitFor(() => {
      expect(screen.getByText('Documents in "users" (2)')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('deletes document when delete button is clicked', async () => {
    const mockCollections = ['users'];
    const mockDocuments = [{ _id: '1', name: 'John Doe' }];
    const { default: apiService } = await import('./utils/api');
    
    apiService.getCollections.mockResolvedValueOnce({ collections: mockCollections });
    apiService.getDocuments
      .mockResolvedValueOnce({ 
        data: mockDocuments, 
        pagination: { page: 1, limit: 100, total: 1, pages: 1 } 
      })
      .mockResolvedValueOnce({ 
        data: [], 
        pagination: { page: 1, limit: 100, total: 0, pages: 0 } 
      });
    apiService.deleteDocument.mockResolvedValueOnce();

    render(<App />);

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'users' } });
    });

    await waitFor(() => {
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
    });

    await waitFor(() => {
      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);
    });

    expect(apiService.deleteDocument).toHaveBeenCalledWith('1');
  });
});
