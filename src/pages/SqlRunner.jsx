import { useState } from 'react'
import styles from './TableView.module.css'

export default function SqlRunner() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function runQuery() {
    if (!query.trim()) return
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/sql', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({query})
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setResult(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px'}}>
      <h1 style={{fontSize: '24px', fontWeight: '700'}}>SQL Runner</h1>
      <textarea
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="SELECT * FROM users LIMIT 10;"
        style={{width: '100%', minHeight: '150px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: '14px', resize: 'vertical'}}
      />
      <button onClick={runQuery} disabled={loading}
        style={{alignSelf: 'flex-start', background: 'var(--accent)', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 'var(--radius)', fontWeight: '500', cursor: 'pointer'}}>
        {loading ? 'Running...' : 'Run Query'}
      </button>
      {error && <div className={styles.error}>{error}</div>}
      {result && (
        <div>
          <div style={{color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px'}}>Rows: {result.rowCount}</div>
          {result.rows.length > 0 && (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead><tr>{result.fields.map(f => <th key={f}>{f}</th>)}</tr></thead>
                <tbody>{result.rows.map((row, i) => (
                  <tr key={i}>{result.fields.map(f => <td key={f}>{String(row[f] ?? '')}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
