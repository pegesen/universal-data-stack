import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import axios from 'axios';
import App from './App';

// Mock axios
vi.mock('axios');

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
    axios.get.mockResolvedValueOnce({ data: { collections: mockCollections } });

    render(<App />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('http://localhost:3000/api/collections');
    });
  });

  it('shows error message when collections fail to load', async () => {
    axios.get.mockRejectedValueOnce(new Error('Network error'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load collections/)).toBeInTheDocument();
    });
  });

  it('shows JSON input when collection is selected', async () => {
    const mockCollections = ['users'];
    axios.get.mockResolvedValueOnce({ data: { collections: mockCollections } });

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
    axios.get.mockResolvedValueOnce({ data: { collections: mockCollections } });

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

    axios.get
      .mockResolvedValueOnce({ data: { collections: mockCollections } })
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: mockDocument });

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
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/users',
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

    axios.get
      .mockResolvedValueOnce({ data: { collections: mockCollections } })
      .mockResolvedValueOnce({ data: { data: mockDocuments } });

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

    axios.get
      .mockResolvedValueOnce({ data: { collections: mockCollections } })
      .mockResolvedValueOnce({ data: { data: mockDocuments } })
      .mockResolvedValueOnce({ data: { data: [] } });

    // Mock window.confirm
    window.confirm = vi.fn(() => true);

    render(<App />);

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'users' } });
    });

    await waitFor(() => {
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);
    });

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this document?');
    expect(axios.delete).toHaveBeenCalledWith('http://localhost:3000/api/users/1');
  });
});
