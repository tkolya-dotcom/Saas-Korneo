import { useState, useEffect, useRef } from 'react'
import { API_BASE } from '../App'
import './SchemaVisualizer.css'

export default function SchemaVisualizer() {
  const [schema, setSchema] = useState({ tables: [], columns: [], relationships: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTable, setSelectedTable] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 50, y: 50 })
  const canvasRef = useRef(null)
  const draggingRef = useRef(null)

  useEffect(() => {
    loadSchema()
  }, [])

  async function loadSchema() {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/api/schema`)
      if (!res.ok) throw new Error('Failed to load schema')
      const data = await res.json()
      setSchema(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function getTablePosition(index, total) {
    const cols = Math.ceil(Math.sqrt(total))
    const row = Math.floor(index / cols)
    const col = index % cols
    return {
      x: 100 + col * 280,
      y: 100 + row * 220
    }
  }

  if (loading) return <div className="loading">Loading schema...</div>
  if (error) return <div className="error">{error}</div>

  const tableColumns = {}
  schema.columns.forEach(col => {
    if (!tableColumns[col.table_name]) tableColumns[col.table_name] = []
    tableColumns[col.table_name].push(col)
  })

  return (
    <div className="schema-container">
      <div className="schema-toolbar">
        <span className="schema-info">{schema.tables.length} tables, {schema.relationships.length} relationships</span>
        <div className="zoom-controls">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>-</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))}>+</button>
        </div>
      </div>

      <div className="schema-canvas" ref={canvasRef}>
        <svg 
          className="schema-svg"
          style={{ transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)` }}
        >
          {/* Relationships */}
          {schema.relationships.map((rel, i) => {
            const fromIdx = schema.tables.indexOf(rel.from_table)
            const toIdx = schema.tables.indexOf(rel.to_table)
            const from = getTablePosition(fromIdx, schema.tables.length)
            const to = getTablePosition(toIdx, schema.tables.length)
            
            return (
              <g key={i}>
                <path
                  d={`M ${from.x + 200} ${from.y + 60} 
                      C ${from.x + 300} ${from.y + 60},
                        ${to.x - 100} ${to.y + 60},
                        ${to.x} ${to.y + 60}`}
                  className="relationship-line"
                  markerEnd="url(#arrowhead)"
                />
              </g>
            )
          })}
          
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="var(--accent)" />
            </marker>
          </defs>
        </svg>

        {/* Table Cards */}
        <div 
          className="tables-container"
          style={{ transform: `scale(${zoom})` }}
        >
          {schema.tables.map((table, idx) => {
            const pos = getTablePosition(idx, schema.tables.length)
            const cols = tableColumns[table] || []
            
            return (
              <div
                key={table}
                className={`table-card ${selectedTable === table ? 'selected' : ''}`}
                style={{ left: pos.x, top: pos.y }}
                onClick={() => setSelectedTable(selectedTable === table ? null : table)}
              >
                <div className="table-header">
                  <span className="table-icon">📋</span>
                  <span className="table-name">{table}</span>
                </div>
                <div className="table-columns">
                  {cols.slice(0, 5).map(col => (
                    <div key={col.column_name} className="column-row">
                      <span className="col-name">
                        {col.is_primary_key && <span className="pk-badge">PK</span>}
                        {col.column_name}
                      </span>
                      <span className="col-type">{col.data_type}</span>
                    </div>
                  ))}
                  {cols.length > 5 && (
                    <div className="more-columns">+{cols.length - 5} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selectedTable && (
        <div className="table-detail">
          <div className="detail-header">
            <h3>{selectedTable}</h3>
            <button className="close-btn" onClick={() => setSelectedTable(null)}>×</button>
          </div>
          <div className="detail-columns">
            {(tableColumns[selectedTable] || []).map(col => (
              <div key={col.column_name} className="detail-row">
                <span className="col-name">
                  {col.is_primary_key && <span className="badge pk">PK</span>}
                  {col.column_name}
                </span>
                <span className="col-type">{col.data_type}</span>
                <span className="col-nullable">{col.is_nullable}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
