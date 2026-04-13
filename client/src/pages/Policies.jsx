import { useState, useEffect } from 'react'
import { API_BASE } from '../App'
import './Policies.css'

export default function Policies() {
  const [tables, setTables] = useState([])
  const [policies, setPolicies] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editPolicy, setEditPolicy] = useState(null)
  const [newPolicy, setNewPolicy] = useState({
    policyname: '',
    cmd: 'SELECT',
    qual: '',
    with_check: ''
  })

  useEffect(() => {
    loadRLSTables()
  }, [])

  async function loadRLSTables() {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/api/policies`)
      if (!res.ok) throw new Error('Failed to load policies')
      const data = await res.json()
      setTables(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadPolicies(tableName) {
    try {
      setSelectedTable(tableName)
      const res = await fetch(`${API_BASE}/api/policies/${encodeURIComponent(tableName)}`)
      if (!res.ok) throw new Error('Failed to load policies for table')
      const data = await res.json()
      setPolicies(data)
    } catch (err) {
      setError(err.message)
    }
  }

  async function toggleRLS(tableName, enabled) {
    try {
      setSaving(true)
      const res = await fetch(`${API_BASE}/api/policies/${encodeURIComponent(tableName)}/rls`, {
        method: enabled ? 'POST' : 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to toggle RLS')
      await loadRLSTables()
      if (selectedTable === tableName) {
        await loadPolicies(tableName)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function createPolicy() {
    try {
      setSaving(true)
      const res = await fetch(`${API_BASE}/api/policies/${encodeURIComponent(selectedTable)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPolicy)
      })
      if (!res.ok) throw new Error('Failed to create policy')
      await loadPolicies(selectedTable)
      await loadRLSTables()
      setShowModal(false)
      setNewPolicy({ policyname: '', cmd: 'SELECT', qual: '', with_check: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deletePolicy(policyname) {
    if (!confirm(`Delete policy "${policyname}"?`)) return
    try {
      setSaving(true)
      const res = await fetch(`${API_BASE}/api/policies/${encodeURIComponent(selectedTable)}/${encodeURIComponent(policyname)}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete policy')
      await loadPolicies(selectedTable)
      await loadRLSTables()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function openEditModal(policy) {
    setEditPolicy({ ...policy })
    setShowModal(true)
  }

  async function updatePolicy() {
    try {
      setSaving(true)
      const res = await fetch(`${API_BASE}/api/policies/${encodeURIComponent(selectedTable)}/${encodeURIComponent(editPolicy.policyname)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPolicy)
      })
      if (!res.ok) throw new Error('Failed to update policy')
      await loadPolicies(selectedTable)
      setShowModal(false)
      setEditPolicy(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading">Loading policies...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="policies-page">
      <div className="policies-header">
        <h2>Row Level Security Policies</h2>
        <p className="section-desc">Manage RLS policies for your database tables</p>
      </div>

      <div className="policies-content">
        <div className="tables-list">
          <h3>Tables</h3>
          {tables.map(table => (
            <div
              key={table.table_name}
              className={`table-item ${selectedTable === table.table_name ? 'selected' : ''}`}
              onClick={() => loadPolicies(table.table_name)}
            >
              <div className="table-info">
                <span className="table-name">{table.table_name}</span>
                <span className={`rls-badge ${table.rls_enabled ? 'enabled' : 'disabled'}`}>
                  {table.rls_enabled ? 'RLS ON' : 'RLS OFF'}
                </span>
              </div>
              <div className="table-actions">
                <button
                  className={`btn-toggle ${table.rls_enabled ? 'on' : 'off'}`}
                  onClick={(e) => { e.stopPropagation(); toggleRLS(table.table_name, !table.rls_enabled) }}
                  disabled={saving}
                >
                  {table.rls_enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))}
          {tables.length === 0 && (
            <p className="empty">No tables found</p>
          )}
        </div>

        <div className="policies-panel">
          {selectedTable ? (
            <>
              <div className="panel-header">
                <h3>Policies for: {selectedTable}</h3>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                  + New Policy
                </button>
              </div>

              <div className="policies-list">
                {policies.length === 0 ? (
                  <div className="empty-policies">
                    <p>No policies defined for this table</p>
                    <button className="btn btn-secondary" onClick={() => setShowModal(true)}>
                      Create First Policy
                    </button>
                  </div>
                ) : (
                  policies.map(policy => (
                    <div key={policy.policyname} className="policy-card">
                      <div className="policy-header">
                        <span className="policy-name">{policy.policyname}</span>
                        <span className={`cmd-badge ${policy.cmd.toLowerCase()}`}>{policy.cmd}</span>
                      </div>
                      <div className="policy-details">
                        {policy.qual && (
                          <div className="policy-section">
                            <label>USING Expression:</label>
                            <pre className="code-block">{policy.qual}</pre>
                          </div>
                        )}
                        {policy.with_check && (
                          <div className="policy-section">
                            <label>WITH CHECK Expression:</label>
                            <pre className="code-block">{policy.with_check}</pre>
                          </div>
                        )}
                      </div>
                      <div className="policy-actions">
                        <button className="btn-edit" onClick={() => openEditModal(policy)}>Edit</button>
                        <button className="btn-delete" onClick={() => deletePolicy(policy.policyname)}>Delete</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>Select a table to view its policies</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editPolicy ? 'Edit Policy' : 'New Policy'}</h3>
              <button className="close-btn" onClick={() => { setShowModal(false); setEditPolicy(null) }}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Policy Name</label>
                <input
                  type="text"
                  value={editPolicy ? editPolicy.policyname : newPolicy.policyname}
                  onChange={e => editPolicy
                    ? setEditPolicy({ ...editPolicy, policyname: e.target.value })
                    : setNewPolicy({ ...newPolicy, policyname: e.target.value })
                  }
                  placeholder="my_policy"
                  disabled={!!editPolicy}
                />
              </div>
              <div className="form-group">
                <label>Command</label>
                <select
                  value={editPolicy ? editPolicy.cmd : newPolicy.cmd}
                  onChange={e => editPolicy
                    ? setEditPolicy({ ...editPolicy, cmd: e.target.value })
                    : setNewPolicy({ ...newPolicy, cmd: e.target.value })
                  }
                >
                  <option value="SELECT">SELECT</option>
                  <option value="INSERT">INSERT</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                  <option value="ALL">ALL</option>
                </select>
              </div>
              <div className="form-group">
                <label>USING Expression (optional)</label>
                <textarea
                  value={editPolicy ? editPolicy.qual : newPolicy.qual}
                  onChange={e => editPolicy
                    ? setEditPolicy({ ...editPolicy, qual: e.target.value })
                    : setNewPolicy({ ...newPolicy, qual: e.target.value })
                  }
                  placeholder="(auth.uid() = user_id)"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>WITH CHECK Expression (optional)</label>
                <textarea
                  value={editPolicy ? editPolicy.with_check : newPolicy.with_check}
                  onChange={e => editPolicy
                    ? setEditPolicy({ ...editPolicy, with_check: e.target.value })
                    : setNewPolicy({ ...newPolicy, with_check: e.target.value })
                  }
                  placeholder="(auth.uid() = user_id)"
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowModal(false); setEditPolicy(null) }}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={editPolicy ? updatePolicy : createPolicy}
                disabled={saving}
              >
                {saving ? 'Saving...' : (editPolicy ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
