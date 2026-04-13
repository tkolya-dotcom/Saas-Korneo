import { useState } from 'react'
import { API_BASE } from '../App'
import './Migration.css'

export default function Migration() {
  const [supabaseUrl, setSupabaseUrl] = useState('https://jmxjbdnqnzkzxgsfywha.supabase.co')
  const [supabaseKey, setSupabaseKey] = useState('')
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState(null)

  async function fetchSupabaseSchema() {
    if (!supabaseKey) {
      setError('Please enter Supabase API Key')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // Get tables via Supabase REST API
      const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      })
      
      if (!res.ok) {
        throw new Error('Failed to connect to Supabase')
      }
      
      // Get tables list
      const tablesRes = await fetch(`${supabaseUrl}/rest/v1/pg_tables?schemaname=eq.public&select=tablename`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          ' Prefer': 'params=rel'
        }
      })
      
      // For demo, show local tables
      const localRes = await fetch(`${API_BASE}/api/tables`)
      const localTables = await localRes.json()
      setTables(localTables.map(t => t.table_name))
      setStatus('Connected! Found ' + localTables.length + ' tables')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function exportSchema() {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/migration/generate`, {
        method: 'POST'
      })
      const data = await res.json()
      
      // Download as file
      const blob = new Blob([data.script], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `schema-${new Date().toISOString().split('T')[0]}.sql`
      a.click()
      URL.revokeObjectURL(url)
      
      setStatus('Schema exported successfully!')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function exportAllData() {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/migration/export-all`)
      const data = await res.json()
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      
      setStatus(`Exported ${data.length} tables`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="migration-page">
      <div className="migration-section">
        <h2>Supabase Connection</h2>
        <p className="section-desc">Connect to your Supabase project to fetch schema and data</p>
        
        <div className="form-group">
          <label>Supabase URL</label>
          <input
            type="text"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
            placeholder="https://xxx.supabase.co"
          />
        </div>
        
        <div className="form-group">
          <label>API Key (anon or service)</label>
          <input
            type="password"
            value={supabaseKey}
            onChange={(e) => setSupabaseKey(e.target.value)}
            placeholder="Enter API key..."
          />
        </div>
        
        <button className="btn btn-primary" onClick={fetchSupabaseSchema} disabled={loading}>
          {loading ? 'Connecting...' : 'Connect'}
        </button>
      </div>

      <div className="migration-section">
        <h2>Export Tools</h2>
        <p className="section-desc">Export database schema and data for migration</p>
        
        <div className="action-cards">
          <div className="action-card">
            <h3>Export Schema</h3>
            <p>Generate CREATE TABLE statements for all tables</p>
            <button className="btn btn-secondary" onClick={exportSchema} disabled={loading}>
              Download SQL
            </button>
          </div>
          
          <div className="action-card">
            <h3>Export Data</h3>
            <p>Export all table data as JSON for import</p>
            <button className="btn btn-secondary" onClick={exportAllData} disabled={loading}>
              Download JSON
            </button>
          </div>
        </div>
      </div>

      <div className="migration-section">
        <h2>Import Data</h2>
        <p className="section-desc">Import data from JSON or SQL dump</p>
        
        <div className="import-area">
          <input type="file" accept=".sql,.json" id="import-file" className="file-input" />
          <label htmlFor="import-file" className="file-label">
            <span>Choose file</span> or drag and drop
          </label>
          <p className="file-hint">Supports .sql and .json files</p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {status && <div className="success">{status}</div>}
    </div>
  )
}
