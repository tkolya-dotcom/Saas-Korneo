import { useState } from 'react'
import styles from './Dashboard.module.css'

export default function Backup() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [name, setName] = useState('')

  async function createBackup() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/backup/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: name || 'db'})
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      const blob = new Blob([json.content], {type: 'text/plain'})
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = json.filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{padding: '24px'}}>
      <h1 style={{fontSize: '24px', fontWeight: '700', marginBottom: '24px'}}>Резервное копирование</h1>
      <div style={{background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', maxWidth: '500px'}}>
        <div style={{marginBottom: '16px'}}>
            <label style={{display: "block", marginBottom: "8px", color: "var(--text-secondary)"}}>Название резервной копии</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="db"
            style={{width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px', color: 'var(--text)'}}/>
        </div>
        {error && <div className={styles.error} style={{marginBottom: '16px'}}>{error}</div>}
        <button onClick={createBackup} disabled={loading}
          style={{background: 'var(--accent)', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 'var(--radius)', fontWeight: '500', cursor: 'pointer'}}>
          {loading ? 'Создание...' : 'Скачать резервную копиюю'}
        </button>
      </div>
    </div>
  )
}
