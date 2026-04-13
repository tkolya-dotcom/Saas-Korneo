import { useState } from 'react'
import { API_BASE } from '../App'
import './SQLRunner.css'

const EXAMPLE_TABLES = "SELECT * FROM pg_tables WHERE schemaname = 'public';"
const EXAMPLE_COLUMNS = "SELECT * FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position;"
const EXAMPLE_SIZE = "SELECT pg_size_pretty(pg_database_size(current_database()));"

export default function SQLRunner() {
  const [query, setQuery] = useState(EXAMPLE_TABLES)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function executeQuery() {
    if (!query.trim()) return
    
    setLoading(true)
    setError(null)
    setResult(null)
    
    try {
      const res = await fetch(`${API_BASE}/api/sql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Query failed')
      }
      
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function formatValue(val) {
    if (val === null) return <span className="null">NULL</span>
    if (typeof val === 'object') return JSON.stringify(val)
    return String(val)
  }

  return (
    <div className="sql-runner">
      <div className="sql-editor">
        <div className="editor-header">
          <span>SQL Query</span>
          <button 
            className="btn btn-primary" 
            onClick={executeQuery}
            disabled={loading}
          >
            {loading ? 'Running...' : 'Execute (F5)'}
          </button>
        </div>
        <textarea
          className="sql-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'F5') {
              e.preventDefault()
              executeQuery()
            }
          }}
          placeholder="Enter SQL query..."
          spellCheck={false}
        />
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="sql-result">
          <div className="result-header">
            <span>Results</span>
            <span className="result-info">
              {result.rowCount} rows
            </span>
          </div>
          
          {result.rows.length > 0 ? (
            <div className="result-table-wrapper">
              <table className="result-table">
                <thead>
                  <tr>
                    {result.fields.map((field, i) => (
                      <th key={i}>{field}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i}>
                      {result.fields.map((field, j) => (
                        <td key={j}>{formatValue(row[field])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-results">Query executed successfully. No rows returned.</div>
          )}
        </div>
      )}

      <div className="sql-help">
        <h4>Quick Examples</h4>
        <div className="examples">
<button onClick={() => setQuery(EXAMPLE_TABLES)}>
            List Tables
          </button>
          <button onClick={() => setQuery(EXAMPLE_COLUMNS)}>
            List Columns
          </button>
          <button onClick={() => setQuery(EXAMPLE_SIZE)}>
            DB Size
          </button>
        </div>
      </div>
    </div>
  )
}
