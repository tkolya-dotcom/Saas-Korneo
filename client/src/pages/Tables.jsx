import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Tables.css'

const API = '/api'

// Enhanced Tooltip component
function Tooltip({ text, children }) {
  return (
    <div className="tooltip-container">
      {children}
      <div className="tooltip-box">
        {text}
      </div>
    </div>
  )
}

// Data Type Info Map
const typeInfo = {
  'uuid': 'Уникальный идентификатор (128-бит). Идеально для первичных ключей.',
  'text': 'Текстовая строка неограниченной длины.',
  'varchar': 'Строка ограниченной длины.',
  'int4': 'Целое число (4 байта, до 2 млрд).',
  'int8': 'Большое целое число (8 байт).',
  'bool': 'Логическое значение (true/false).',
  'jsonb': 'JSON данные в бинарном формате. Поддерживает индексацию.',
  'timestamptz': 'Дата и время с часовым поясом.',
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
        <div className="header-title">
          <h2>Таблицы БД</h2>
          <span className="badge">{tables.length}</span>
        </div>
        <div className="search-bar">
          <input 
            type="text" 
            placeholder="Поиск таблиц..." 
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
          const isSelected = selectedTable === table.table_name
          
          return (
            <div 
              key={table.table_name} 
              className={`table-card ${isSelected ? 'active' : ''}`}
              onClick={() => setSelectedTable(isSelected ? null : table.table_name)}
            >
              <div className="card-main">
                <div className="card-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                </div>
                <div className="card-info">
                  <h3>{table.table_name}</h3>
                  <div className="card-meta">
                    <span>{tableCols.length} колонок</span>
                    <span className="dot">•</span>
                    <span>{outgoing.length + incoming.length} связей</span>
                  </div>
                </div>
                <Link to={`/table/${table.table_name}`} className="card-action" onClick={e => e.stopPropagation()}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                  </svg>
                </Link>
              </div>

              {isSelected && (
                <div className="card-expand">
                  <div className="expand-section">
                    <h4>Колонки</h4>
                    <div className="cols-preview">
                      {tableCols.map(col => (
                        <div key={col.column_name} className="col-tag">
                          {col.is_primary_key && <span className="pk">PK</span>}
                          <span className="name">{col.column_name}</span>
                          <Tooltip text={typeInfo[col.data_type] || `Тип данных: ${col.data_type}`}>
                            <span className="type">{col.data_type}</span>
                          </Tooltip>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {(outgoing.length > 0 || incoming.length > 0) && (
                    <div className="expand-section">
                      <h4>Связи</h4>
                      <div className="rels-list">
                        {outgoing.map((r, i) => (
                          <div key={i} className="rel-row out">
                            <span className="col">{r.from_column}</span>
                            
                            <span className="arrow">→</span>
                            <span className="target">{r.to_table}.{r.to_column}</span>
                          </div>
                        ))}
                        {incoming.map((r, i) => (
                          <div key={i} className="rel-row in">
                            <span className="target">{r.from_table}.{r.from_column}</span>
                            <span className="arrow">→</span>
                            <span className="col">{r.to_column}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
