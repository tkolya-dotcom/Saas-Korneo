import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Tables.css'

const API = '/api'

// Tooltip component
function Tooltip({ text, children }) {
  return (
    <div className="tooltip">
      {children}
      <span className="tooltip-text">{text}</span>
    </div>
  )
}

export default function Tables() {
  const [tables, setTables] = useState([])
  const [columns, setColumns] = useState({})
  const [relationships, setRelationships] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTable, setSelectedTable] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [tRes, rRes] = await Promise.all([
        fetch(`${API}/tables`),
        fetch(`${API}/relationships`)
      ])
      
      const tablesData = await tRes.json()
      const relData = await rRes.json()
      
      setTables(tablesData)
      setRelationships(relData)

      // Load columns for tables
      const cols = {}
      await Promise.all(tablesData.map(async (table) => {
        const cRes = await fetch(`${API}/tables/${table.table_name}/columns`)
        if (cRes.ok) cols[table.table_name] = await cRes.json()
      }))
      setColumns(cols)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredTables = tables.filter(t => t.table_name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="tables-container">
      <div className="tables-header">
        <h2>Таблицы ({tables.length})</h2>
        <div className="search-bar">
          <input 
            type="text" 
            placeholder="Поиск по названию..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="tables-grid">
        {filteredTables.map(table => {
          const tableCols = columns[table.table_name] || []
          const outgoing = relationships.filter(r => r.from_table === table.table_name)
          const incoming = relationships.filter(r => r.to_table === table.table_name)
          
          return (
            <div 
              key={table.table_name} 
              className={`table-card ${selectedTable === table.table_name ? 'active' : ''}`}
              onClick={() => setSelectedTable(selectedTable === table.table_name ? null : table.table_name)}
            >
              <div className="card-header">
                <h3>{table.table_name}</h3>
                <Link to={`/table/${table.table_name}`} className="open-btn" onClick={e => e.stopPropagation()}>
                  Открыть
                </Link>
              </div>
              
              <div className="card-stats">
                <span>{tableCols.length} колонок</span>
                <span>{outgoing.length + incoming.length} связей</span>
              </div>

              {selectedTable === table.table_name && (
                <div className="card-details">
                  <div className="section">
                    <h4>Связи</h4>
                    {outgoing.map((r, i) => (
                      <div key={i} className="rel-item out">
                        {r.from_column} → <strong>{r.to_table}</strong>.{r.to_column}
                      </div>
                    ))}
                    {incoming.map((r, i) => (
                      <div key={i} className="rel-item in">
                        <strong>{r.from_table}</strong>.{r.from_column} → {r.to_column}
                      </div>
                    ))}
                    {outgoing.length === 0 && incoming.length === 0 && <div className="no-data">Нет связей</div>}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
