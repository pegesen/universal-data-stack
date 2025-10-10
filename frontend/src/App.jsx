import React, { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function App() {
  const [collections, setCollections] = useState([])
  const [currentCollection, setCurrentCollection] = useState('')
  const [documents, setDocuments] = useState([])
  const [jsonInput, setJsonInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Load collections on mount
  useEffect(() => {
    loadCollections()
  }, [])

  // Load documents when collection changes
  useEffect(() => {
    if (currentCollection) {
      // AbortController für Race Condition Prevention
      const abortController = new AbortController()
      
      const loadDocumentsWithAbort = async () => {
        if (!currentCollection) return
        
        setLoading(true)
        try {
          const response = await axios.get(`${API_BASE_URL}/api/${currentCollection}`, {
            signal: abortController.signal
          })
          setDocuments(response.data.data || [])
          setError('')
        } catch (err) {
          if (err.name !== 'CanceledError') {
            setError('Failed to load documents: ' + err.message)
            setDocuments([])
          }
        } finally {
          setLoading(false)
        }
      }
      
      loadDocumentsWithAbort()
      
      // Cleanup function to abort request if component unmounts or collection changes
      return () => {
        abortController.abort()
      }
    }
  }, [currentCollection])

  const loadCollections = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/collections`)
      setCollections(response.data.collections)
    } catch (err) {
      setError('Failed to load collections: ' + err.message)
    }
  }

  const loadDocuments = async (signal = null) => {
    if (!currentCollection) return
    
    setLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/${currentCollection}`, {
        signal: signal
      })
      setDocuments(response.data.data || [])
      setError('')
    } catch (err) {
      if (err.name !== 'CanceledError') {
        setError('Failed to load documents: ' + err.message)
        setDocuments([])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCollectionChange = (e) => {
    const value = e.target.value
    setCurrentCollection(value)
    setJsonInput('')
    setError('')
    setSuccess('')
  }

  const handleJsonInputChange = (e) => {
    setJsonInput(e.target.value)
    setError('')
  }

  const validateJson = (jsonString) => {
    if (!jsonString.trim()) {
      throw new Error('JSON input cannot be empty')
    }
    
    try {
      const parsed = JSON.parse(jsonString)
      
      // Basic validation
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('JSON must be an object')
      }
      
      // Check for dangerous properties
      const dangerousProps = ['__proto__', 'constructor', 'prototype']
      for (const prop of dangerousProps) {
        if (prop in parsed) {
          throw new Error(`Property '${prop}' is not allowed`)
        }
      }
      
      return parsed
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error('Invalid JSON format')
      }
      throw err
    }
  }

  const handleSaveDocument = async () => {
    if (!currentCollection) {
      setError('Please select a collection first')
      return
    }

    if (!jsonInput.trim()) {
      setError('Please enter JSON data')
      return
    }

    setLoading(true)
    try {
      const data = validateJson(jsonInput)
      await axios.post(`${API_BASE_URL}/api/${currentCollection}`, data)
      setSuccess('Document saved successfully!')
      setJsonInput('')
      // Reload documents after successful save
      await loadDocuments()
    } catch (err) {
      setError('Failed to save document: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDocument = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return
    }

    setLoading(true)
    try {
      await axios.delete(`${API_BASE_URL}/api/${currentCollection}/${id}`)
      setSuccess('Document deleted successfully!')
      // Reload documents after successful deletion
      await loadDocuments()
    } catch (err) {
      setError('Failed to delete document: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDocument = (doc) => {
    return JSON.stringify(doc, null, 2)
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          color: 'white',
          padding: '30px',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', fontWeight: '700' }}>
            Universal Data Stack
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>
            Dynamic JSON Document Management with MongoDB
          </p>
        </div>

        <div style={{ padding: '30px' }}>
          {/* Collection Selection */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '10px', 
              fontWeight: '600',
              fontSize: '1.1rem',
              color: '#333'
            }}>
              Select Collection:
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                value={currentCollection}
                onChange={handleCollectionChange}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4facfe'}
                onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
              >
                <option value="">Choose a collection...</option>
                {collections.map(collection => (
                  <option key={collection} value={collection}>
                    {collection}
                  </option>
                ))}
              </select>
              <button
                onClick={loadCollections}
                disabled={loading}
                style={{
                  padding: '12px 20px',
                  background: loading ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.target.style.background = '#218838'
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading) {
                    e.target.style.background = '#28a745'
                  }
                }}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* JSON Input */}
          {currentCollection && (
            <div style={{ marginBottom: '30px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '10px', 
                fontWeight: '600',
                fontSize: '1.1rem',
                color: '#333'
              }}>
                Add New Document to "{currentCollection}":
              </label>
              <textarea
                value={jsonInput}
                onChange={handleJsonInputChange}
                placeholder='{"name": "John Doe", "email": "john@example.com", "age": 30}'
                style={{
                  width: '100%',
                  height: '120px',
                  padding: '15px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                  outline: 'none',
                  resize: 'vertical',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4facfe'}
                onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
              />
              <button
                onClick={handleSaveDocument}
                disabled={loading || !jsonInput.trim()}
                style={{
                  marginTop: '10px',
                  padding: '12px 24px',
                  background: loading || !jsonInput.trim() ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading || !jsonInput.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => {
                  if (!loading && jsonInput.trim()) {
                    e.target.style.background = '#0056b3'
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading && jsonInput.trim()) {
                    e.target.style.background = '#007bff'
                  }
                }}
              >
                {loading ? 'Saving...' : 'Save Document'}
              </button>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div style={{
              padding: '15px',
              background: '#f8d7da',
              color: '#721c24',
              border: '1px solid #f5c6cb',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              padding: '15px',
              background: '#d4edda',
              color: '#155724',
              border: '1px solid #c3e6cb',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              {success}
            </div>
          )}

          {/* Documents List */}
          {currentCollection && (
            <div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h2 style={{ color: '#333', fontSize: '1.5rem' }}>
                  Documents in "{currentCollection}" ({documents.length})
                </h2>
                <button
                  onClick={() => loadDocuments()}
                  disabled={loading}
                  style={{
                    padding: '8px 16px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '18px', color: '#666' }}>Loading documents...</div>
                </div>
              ) : documents.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  color: '#666'
                }}>
                  No documents found in this collection
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '20px' }}>
                  {documents.map((doc, index) => (
                    <div
                      key={doc._id || index}
                      style={{
                        border: '1px solid #e1e5e9',
                        borderRadius: '8px',
                        padding: '20px',
                        background: '#f8f9fa'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        marginBottom: '15px'
                      }}>
                        <div style={{ fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>
                          ID: {doc._id}
                        </div>
                        <button
                          onClick={() => handleDeleteDocument(doc._id)}
                          style={{
                            padding: '6px 12px',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                          onMouseOver={(e) => e.target.style.background = '#c82333'}
                          onMouseOut={(e) => e.target.style.background = '#dc3545'}
                        >
                          Delete
                        </button>
                      </div>
                      <pre style={{
                        background: 'white',
                        padding: '15px',
                        borderRadius: '6px',
                        border: '1px solid #e1e5e9',
                        fontSize: '12px',
                        overflow: 'auto',
                        maxHeight: '300px',
                        fontFamily: 'Monaco, Consolas, "Courier New", monospace'
                      }}>
                        {formatDocument(doc)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
