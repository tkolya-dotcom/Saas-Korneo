import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchTables, saveCustomTables } from '../lib/supabase'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newTableName, setNewTableName] = useState('')

  useEffect(() => {
    loadTables()
  }, [])

  async function loadTables() {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchTables()
      setTables(data)
    } catch (err) {
      setError('Failed to load tables. Check your Supabase connection.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function addTable(e) {
    e.preventDefault()
    if (!newTableName.trim()) return
    
    const name = newTableName.trim()
    const exists = tables.some(t => t.tablename === name)
    if (exists) {
      setError('Table already exists')
      return
    }
    
    const newTables = [...tables, { tablename: name }]
    setTables(newTables)
    saveCustomTables(newTables.map(t => t.tablename))
    setNewTableName('')
    setError(null)
  }

  if (loading) {
    return <div className={styles.loading}>Loading tables...</div>
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Database Tables</h1>
          <p className={styles.subtitle}>{tables.length} tables configured</p>
        </div>
      </div>

      <form onSubmit={addTable} className={styles.toolbar}>
        <input
          type="text"
          placeholder="Enter table name..."
          value={newTableName}
          onChange={(e) => setNewTableName(e.target.value)}
          className={styles.addInput}
        />
        <button type="submit" className={styles.addBtn}>
          + Add Table
        </button>
      </form>

      {error && tables.length > 0 && (
        <div className={styles.errorMsg}>{error}</div>
      )}

      {tables.length === 0 ? (
        <div className={styles.empty}>
          <p>No tables configured.</p>
          <p>Enter your table name above and click "Add Table" to get started.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {tables.map((table) => (
            <Link 
              key={table.tablename} 
              to={`/table/${table.tablename}`}
              className={styles.card}
            >
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9h18"/>
                    <path d="M9 21V9"/>
                  </svg>
                </div>
              </div>
              <div className={styles.cardName}>{table.tablename}</div>
              <div className={styles.cardMeta}>
                Click to view data
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
