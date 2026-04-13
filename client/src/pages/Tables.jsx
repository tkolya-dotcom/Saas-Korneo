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

// Info tooltip icon
function InfoTooltip({ text }) {
  return (
    <Tooltip text={text}>
      <span className="tooltip-icon">?</span>
    </Tooltip>
  )
}

export default function Tables() {
  const [tables, setTables] = useState([])
  const [columns, setColumns] = useState({})
  const [relationships, setRelationships] = useState([])
  const [functions, setFunctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTable, setSelectedTable] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      // Load tables
      const tablesRes = await fetch(`${API}/tables`)
      const tablesData = await tablesRes.json()
      setTables(tablesData)

      // Load relationships
      const relRes = await fetch(`${API}/relationships`)
      const relData = await relRes.json()
      setRelationships(relData)

      // Load columns for each table
      const cols = {}
      for (const table of tablesData) {
        const colRes = await fetch(`${API}/tables/${table.table_name}/columns`)
        if (colRes.ok) {
          cols[table.table_name] = await colRes.json()
        }
      }
      setColumns(cols)

      // Load functions
      try {
        const schemaRes = await fetch(`${API}/schema`)
        const schemaData = await schemaRes.json()
        if (schemaData.functions) {
          setFunctions(schemaData.functions)
        }
      } catch (e) {
        console.log('Functions not available')
      }

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Get table relationships
  function getTableRelations(tableName) {
    const outgoing = relationships.filter(r => r.from_table === tableName)
    const incoming = relationships.filter(r => r.to_table === tableName)
    return { outgoing, incoming }
  }

  // Filter tables
  const filteredTables = tables.filter(t => 
    t.table_name.toLowerCase().includes(search.toLowerCase())
  )

  // Get table columns
  function getColumns(tableName) {
    return columns[tableName] || []
  }

  if (loading) {
    return <div className="loading">Загрузка таблиц...</div>
  }

  if (error) {
    return <div className="error-message">{error}</div>
  }

  return (
    <div className="tables-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <h2 className="page-title">Таблицы базы данных</h2>
          <span className="table-count">{tables.length} таблиц</span>
        </div>
        <div className="header-right">
          <div className="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Поиск таблиц..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary" onClick={loadData}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Обновить
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon tables-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{tables.length}</span>
            <span className="stat-label">Таблиц</span>
          </div>
          <InfoTooltip text="Все таблицы в схеме public вашей базы данных PostgreSQL" />
        </div>
        <div className="stat-card">
          <div className="stat-icon relations-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{relationships.length}</span>
            <span className="stat-label">Связей</span>
          </div>
          <InfoTooltip text="Foreign Key (FK) связи между таблицами, определяющие отношения" />
        </div>
        <div className="stat-card">
          <div className="stat-icon columns-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M2 12h20" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">
              {Object.values(columns).reduce((sum, cols) => sum + (cols?.length || 0), 0)}
            </span>
            <span className="stat-label">Колонок</span>
          </div>
          <InfoTooltip text="Все колонки (поля) во всех таблицах" />
        </div>
        <div className="stat-card">
          <div className="stat-icon functions-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
              <path d="M9 9h6M9 13h6M9 17h4" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{functions.length}</span>
            <span className="stat-label">Функций</span>
          </div>
          <InfoTooltip text="Пользовательские функции PostgreSQL в схеме public" />
        </div>
      </div>

      {/* Tables Grid */}
      <div className="tables-grid">
        {filteredTables.map(table => {
          const cols = getColumns(table.table_name)
          const { outgoing, incoming } = getTableRelations(table.table_name)
          const isSelected = selectedTable === table.table_name

          return (
            <div 
              key={table.table_name} 
              className={`table-card ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedTable(isSelected ? null : table.table_name)}
            >
              <div className="table-card-header">
                <div className="table-info">
                  <span className="table-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M9 21V9" />
                    </svg>
                  </span>
                  <h3 className="table-name">{table.table_name}</h3>
                </div>
                <div className="table-actions">
                  <Link 
                    to={`/table/${table.table_name}`} 
                    className="btn btn-primary btn-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Открыть
                  </Link>
                </div>
              </div>

              {/* Table Description */}
              <div className="table-meta">
                <span className="meta-item">
                  <span className="meta-label">Колонок:</span>
                  <span className="meta-value">{cols.length}</span>
                </span>
                <span className="meta-item">
                  <span className="meta-label">Связей:</span>
                  <span className="meta-value">{outgoing.length + incoming.length}</span>
                </span>
              </div>

              {/* Expanded Info */}
              {isSelected && (
                <div className="table-details">
                  {/* Columns */}
                  <div className="detail-section">
                    <h4 className="detail-title">
                      Колонки
                      <InfoTooltip text="Поля (колонки) таблицы с их типами данных" />
                    </h4>
                    <div className="columns-list">
                      {cols.slice(0, 6).map(col => (
                        <div key={col.column_name} className="column-item">
                          <div className="column-main">
                            <span className="column-name">
                              {col.is_primary_key && (
                                <span className="badge badge-pk" title="Первичный ключ">PK</span>
                              )}
                              {col.is_foreign_key && (
                                <span className="badge badge-fk" title="Внешний ключ">FK</span>
                              )}
                              {col.column_name}
                            </span>
                            <span className="column-type">{col.data_type}</span>
                          </div>
                          {col.is_nullable === 'YES' && (
                            <span className="column-nullable">nullable</span>
                          )}
                        </div>
                      ))}
                      {cols.length > 6 && (
                        <div className="more-columns">+{cols.length - 6} ещё...</div>
                      )}
                    </div>
                  </div>

                  {/* Outgoing Relations */}
                  {outgoing.length > 0 && (
                    <div className="detail-section">
                      <h4 className="detail-title">
                        Исходящие связи (FK)
                        <InfoTooltip text="Связи, где эта таблица является источником (родительская таблица)" />
                      </h4>
                      <div className="relations-list">
                        {outgoing.map((rel, i) => (
                          <div key={i} className="relation-item relation-out">
                            <div className="relation-main">
                              <span className="relation-from">
                                <span className="relation-col">{rel.from_column}</span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                              </span>
                              <span className="relation-to">
                                <span className="relation-table">{rel.to_table}</span>
                                <span className="relation-col">.{rel.to_column}</span>
                              </span>
                            </div>
                            <span className="relation-on">ON DELETE: {rel.on_delete || 'RESTRICT'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Incoming Relations */}
                  {incoming.length > 0 && (
                    <div className="detail-section">
                      <h4 className="detail-title">
                        Входящие связи
                        <InfoTooltip text="Связи, где эта таблица является целью (дочерняя таблица)" />
                      </h4>
                      <div className="relations-list">
                        {incoming.map((rel, i) => (
                          <div key={i} className="relation-item relation-in">
                            <div className="relation-main">
                              <span className="relation-from">
                                <span className="relation-table">{rel.from_table}</span>
                                <span className="relation-col">.{rel.from_column}</span>
                              </span>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                              </svg>
                              <span className="relation-to">
<span className="relation-col">{rel.to_column}</span>
                              </span>
                            </div>
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

      {filteredTables.length === 0 && (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
          </svg>
          <p>Таблицы не найдены</p>
          <span>Попробуйте изменить параметры поиска</span>
        </div>
      )}
    </div>
  )
}
