import { useEffect, useMemo, useState, useCallback } from 'react'
import ReactFlow, { Background, Controls, MiniMap, MarkerType, useNodesState, useEdgesState, Handle, Position } from 'reactflow'
import 'reactflow/dist/style.css'
import './SchemaView.css'

const API = '/api'

// Table Node Component
function TableNode({ data }) {
  const { table, selected, onSelect, relationships } = data
  const columns = table.columns || []

  // Count outgoing and incoming relations
  const outgoingCount = relationships.filter(r => r.from_table === table.name).length
  const incomingCount = relationships.filter(r => r.to_table === table.name).length

  return (
    <div 
      className={`table-node ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(table.name)}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#6366f1' }} />
      
      <div className="node-header">
        <div className="node-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
          </svg>
        </div>
        <div className="node-title">
          <span className="node-name">{table.name}</span>
          <span className="node-type">{table.type || 'TABLE'}</span>
        </div>
      </div>

      <div className="node-stats">
        <span className="stat">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M2 12h20" />
          </svg>
          {columns.length} полей
        </span>
        {outgoingCount > 0 && (
          <span className="stat out">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            {outgoingCount} FK
          </span>
        )}
        {incomingCount > 0 && (
          <span className="stat in">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {incomingCount} refs
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Right} style={{ background: '#6366f1' }} />
    </div>
  )
}

const nodeTypes = { tableNode: TableNode }

export default function SchemaView() {
  const [schema, setSchema] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTable, setSelectedTable] = useState(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [showAllRelations, setShowAllRelations] = useState(true) // По умолчанию показываем все
  const [activeTab, setActiveTab] = useState('tables')

  useEffect(() => { loadSchema() }, [])

  async function loadSchema() {
    try {
      setLoading(true)
      const res = await fetch(`${API}/schema`)
      const data = await res.json()
      
      const tables = (data.tables || []).map(t => {
        const tableName = typeof t === 'string' ? t : t.name || t.table_name
        return {
          name: tableName,
          type: t.type || 'table',
          columns: data.columns?.filter(c => c.table_name === tableName).map(c => ({
            name: c.column_name,
            data_type: c.data_type,
            is_pk: !!c.is_primary_key
          })) || []
        }
      })

      setSchema({ 
        tables: tables.filter(t => t.type !== 'view'),
        views: tables.filter(t => t.type === 'view'),
        functions: data.functions || [],
        relationships: data.relationships || []
      })
    } catch (err) {
      setError('Ошибка загрузки схемы')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!schema) return
    const { tables, relationships } = schema

    const newNodes = tables.map((table, index) => ({
      id: table.name,
      type: 'tableNode',
      position: { x: (index % 5) * 300, y: Math.floor(index / 5) * 200 },
      data: { table, selected: selectedTable === table.name, onSelect: setSelectedTable, relationships }
    }))

    const newEdges = relationships.map((rel, idx) => {
      const isFocused = !selectedTable || rel.from_table === selectedTable || rel.to_table === selectedTable
      if (!showAllRelations && !isFocused) return null

      return {
        id: `e-${idx}`,
        source: rel.from_table,
        target: rel.to_table,
        label: `${rel.from_column} → ${rel.to_column}`,
        type: 'smoothstep',
        animated: isFocused && !!selectedTable,
        style: { 
          stroke: rel.from_table === selectedTable ? '#22c55e' : rel.to_table === selectedTable ? '#6366f1' : '#475569',
          strokeWidth: isFocused ? 2 : 1,
          opacity: isFocused ? 1 : 0.3
        },
        markerEnd: { 
          type: MarkerType.ArrowClosed, 
          color: rel.from_table === selectedTable ? '#22c55e' : rel.to_table === selectedTable ? '#6366f1' : '#475569' 
        }
      }
    }).filter(Boolean)

    setNodes(newNodes)
    setEdges(newEdges)
  }, [schema, selectedTable, showAllRelations])

  if (loading) return <div className="loading">Загрузка...</div>

  return (
    <div className="schema-container">
      <div className="schema-header">
        <h2>Схема БД</h2>
        <div className="controls">
          <label>
            <input type="checkbox" checked={showAllRelations} onChange={e => setShowAllRelations(e.target.checked)} />
            Показать все связи
          </label>
          <button onClick={loadSchema}>Обновить</button>
        </div>
      </div>

      <div className="schema-content">
        <div className="canvas-wrapper">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedTable(node.id)}
            onPaneClick={() => setSelectedTable(null)}
            fitView
          >
            <Background color="#334155" gap={20} />
            <Controls />
            <MiniMap style={{ background: '#12121a' }} />
          </ReactFlow>
        </div>

        <div className="details-panel">
          {selectedTable ? (
            <div className="table-details">
              <h3>{selectedTable}</h3>
              <div className="columns-list">
                {schema.tables.find(t => t.name === selectedTable)?.columns.map(col => (
                  <div key={col.name} className="column-item">
                    {col.is_pk && <span className="pk-badge">PK</span>}
                    <span className="col-name">{col.name}</span>
                    <span className="col-type">{col.data_type}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">Выберите таблицу для деталей</div>
          )}
        </div>
      </div>
    </div>
  )
}
