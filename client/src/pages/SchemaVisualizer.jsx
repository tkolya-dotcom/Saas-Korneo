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
      if (!res.ok) throw new Error('Не удалось загрузить схему')
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
      x: 100 + col * 300,
      y: 100 + row * 240
    }
  }

  // Функция для отрисовки линий связей FK
  function drawRelationshipLine(from, to, fromTable, toTable) {
    const fromCenter = { x: from.x + 130, y: from.y + 100 }
    const toCenter = { x: to.x + 130, y: to.y + 100 }
    
    // Используем кривую Безье для красивых линий
    const dx = toCenter.x - fromCenter.x
    const dy = toCenter.y - fromCenter.y
    const dist = Math.sqrt(dx*dx + dy*dy)
    
    // Контрольные точки для кривой
    const controlOffset = Math.min(dist * 0.3, 50)
    const cp1x = fromCenter.x + (dx > 0 ? controlOffset : -controlOffset)
    const cp1y = fromCenter.y
    const cp2x = toCenter.x - (dx > 0 ? controlOffset : -controlOffset)
    const cp2y = toCenter.y

    const pathData = `M ${fromCenter.x},${fromCenter.y} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${toCenter.x},${toCenter.y}`
    
    return (
      <g key={`${fromTable}-${toTable}`}>
        <path
          d={pathData}
          stroke="#6366f1"
          strokeWidth="2"
          fill="none"
          opacity="0.6"
          markerEnd="url(#arrowhead)"
        />
      </g>
    )
  }

  if (loading) return <div className="loading">Загрузка схемы...</div>
  if (error) return <div className="error">{error}</div>

  const tableColumns = {}
  schema.columns.forEach(col => {
    if (!tableColumns[col.table_name]) tableColumns[col.table_name] = []
    tableColumns[col.table_name].push(col)
  })

  return (
    <div className="schema-container">
      <div className="schema-toolbar">
        <div className="schema-info">
          🗃️ {schema.tables.length} таблиц, {schema.relationships.length} связей
        </div>
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
          {/* Стрелка для линий связей */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#6366f1" />
            </marker>
          </defs>

          {/* Линии связей FK */}
          {schema.relationships.map((rel, i) => {
            const fromIdx = schema.tables.indexOf(rel.from_table)
            const toIdx = schema.tables.indexOf(rel.to_table)
            if (fromIdx === -1 || toIdx === -1) return null
            
            const from = getTablePosition(fromIdx, schema.tables.length)
            const to = getTablePosition(toIdx, schema.tables.length)
            return drawRelationshipLine(from, to, rel.from_table, rel.to_table)
          })}
        </svg>

        {/* Карточки таблиц */}
        <div 
          className="tables-layer"
          style={{ transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)` }}
        >
          {schema.tables.map((table, idx) => {
            const pos = getTablePosition(idx, schema.tables.length)
            const cols = tableColumns[table] || []
            return (
              <div
                key={table}
                className="schema-table"
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
                      {col.is_primary_key && <span className="pk-badge">PK</span>}
                      <span className="col-name">{col.column_name}</span>
                      <span className="col-type">{col.data_type}</span>
                    </div>
                  ))}
                  {cols.length > 5 && (
                    <div className="more-cols">+{cols.length - 5} еще...</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selectedTable && (
        <div className="table-detail-modal">
          <div className="modal-content">
            <h3>{selectedTable}</h3>
            <button className="close-btn" onClick={() => setSelectedTable(null)}>×</button>
            <div className="detail-columns">
              {(tableColumns[selectedTable] || []).map(col => (
                <div key={col.column_name} className="detail-col-row">
                  {col.is_primary_key && <span className="pk-badge">PK</span>}
                  <span className="col-name">{col.column_name}</span>
                  <span className="col-type">{col.data_type}</span>
                  <span className="col-nullable">{col.is_nullable}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
