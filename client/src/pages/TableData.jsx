import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { API_BASE } from '../App'
import './TableData.css'

export default function TableData() {
  const { name } = useParams()
  const [data, setData] = useState({ data: [], total: 0, page: 0, totalPages: 0 })
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [editingRow, setEditingRow] = useState(null)

  useEffect(() => {
    loadData()
  }, [name, page])

  async function loadData() {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page, limit: 50, search })
      const res = await fetch(`${API_BASE}/api/data/${name}?${params}`)
      if (!res.ok) throw new Error('Failed to load data')
      const result = await res.json()
      setData(result)
      if (result.data.length > 0) {
        setColumns(Object.keys(result.data[0]))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      const res = await fetch(`${API_BASE}/api/data/${name}/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setDeleteId(null)
      loadData()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  async function handleSave() {
    if (!editingRow) return
    try {
      const res = await fetch(`${API_BASE}/api/data/${name}/${editingRow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRow)
      })
      if (!res.ok) throw new Error('Update failed')
      setEditingRow(null)
      loadData()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    setPage(0)
    loadData()
  }

  if (loading && !data.data.length) return <div className="loading">Loading data...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="table-data-page">
      <div className="page-header">
        <div className="header-left">
          <Link to="/tables" className="back-link">← Tables</Link>
          <h2>{name}</h2>
          <span className="row-count">{data.total} rows</span>
        </div>
        <Link to={`/tables/${name}/new`} className="btn btn-primary">
          + New Row
        </Link>
      </div>

      <div className="toolbar">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(col => <th key={col}>{col}</th>)}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((row, idx) => (
              <tr key={idx}>
                {columns.map(col => (
                  <td key={col}>
                    {editingRow?.id === row.id ? (
                      <input
                        type="text"
                        value={editingRow[col] ?? ''}
                        onChange={(e) => setEditingRow({ ...editingRow, [col]: e.target.value })}
                        className="edit-input"
                      />
                    ) : (
                      String(row[col] ?? '')
                    )}
                  </td>
                ))}
                <td className="actions-cell">
                  {editingRow?.id === row.id ? (
                    <>
                      <button className="btn btn-sm btn-primary" onClick={handleSave}>Save</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => setEditingRow(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-sm btn-secondary" onClick={() => setEditingRow(row)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => setDeleteId(row.id)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <span>Page {data.page + 1} of {data.totalPages || 1}</span>
        <div className="pagination-buttons">
          <button className="btn btn-sm btn-secondary" disabled={page === 0} onClick={() => setPage(0)}>First</button>
          <button className="btn btn-sm btn-secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</button>
          <button className="btn btn-sm btn-secondary" disabled={page >= data.totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</button>
          <button className="btn btn-sm btn-secondary" disabled={page >= data.totalPages - 1} onClick={() => setPage(data.totalPages - 1)}>Last</button>
        </div>
      </div>

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Delete Row</h3>
            <p>Are you sure you want to delete row #{deleteId}?</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
