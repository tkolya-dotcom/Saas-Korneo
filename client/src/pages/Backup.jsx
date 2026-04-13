import { useState } from 'react'
import { API_BASE } from '../App'
import './Backup.css'

export default function Backup() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState(null)
  const [backups, setBackups] = useState([])

  async function createBackup() {
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch(`${API_BASE}/api/backup/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'manual' })
      })
      
      if (!res.ok) throw new Error('Failed to create backup')
      
      const data = await res.json()
      
      // Download the backup file
      const blob = new Blob([data.content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.filename
      a.click()
      URL.revokeObjectURL(url)
      
      setStatus(`Backup created: ${data.filename} (${(data.size / 1024).toFixed(1)} KB)`)
      
      // Add to list
      setBackups(prev => [{
        name: data.filename,
        size: data.size,
        date: new Date().toISOString()
      }, ...prev])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function createJSONBackup() {
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch(`${API_BASE}/api/migration/export-all`)
      const data = await res.json()
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `db-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      
      setStatus(`JSON backup created (${(JSON.stringify(data).length / 1024).toFixed(1)} KB)`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="backup-page">
      <div className="backup-section">
        <h2>Create Backup</h2>
        <p className="section-desc">Create a full backup of your database</p>
        
        <div className="backup-types">
          <div className="backup-card">
            <div className="backup-icon">💾</div>
            <h3>SQL Dump</h3>
            <p>Full database backup with INSERT statements</p>
            <button 
              className="btn btn-primary" 
              onClick={createBackup}
              disabled={loading}
            >
              Create SQL Backup
            </button>
          </div>
          
          <div className="backup-card">
            <div className="backup-icon">📦</div>
            <h3>JSON Export</h3>
            <p>Export all data as structured JSON</p>
            <button 
              className="btn btn-secondary" 
              onClick={createJSONBackup}
              disabled={loading}
            >
              Create JSON Backup
            </button>
          </div>
        </div>
      </div>

      <div className="backup-section">
        <h2>Scheduled Backups</h2>
        <p className="section-desc">Configure automatic backup schedule</p>
        
        <div className="schedule-info">
          <p>To enable automated backups, add this to your crontab:</p>
          <pre className="cron-code">{"0 2 * * * pg_dump -U postgres -d your_db > /backups/db-$(date +%Y%m%d).sql"}</pre>
        </div>
      </div>

      <div className="backup-section">
        <h2>Restore Backup</h2>
        <p className="section-desc">Restore database from a backup file</p>
        
        <div className="restore-area">
          <input type="file" accept=".sql,.json" id="restore-file" className="file-input" />
          <label htmlFor="restore-file" className="file-label">
            <span>Choose backup file</span> to restore
          </label>
          <p className="file-hint">
            Warning: Restoring will overwrite existing data
          </p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {status && <div className="success">{status}</div>}
    </div>
  )
}
