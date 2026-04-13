import { useEffect, useMemo, useState, useCallback } from 'react'
import ReactFlow, { 
  Background, Controls, MiniMap, MarkerType, 
  useNodesState, useEdgesState, Handle, Position 
} from 'reactflow'
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

// Info Tooltip
function InfoTooltip({ text }) {
  return (
    <div className="info-tooltip-container">
      <span className="info-tooltip-trigger">?</span>
      <div className="info-tooltip-content">{text}</div>
    </div>
  )
}

export default function SchemaView() {
  const [schema, setSchema] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTable, setSelectedTable] = useState(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [showAllRelations, setShowAllRelations] = useState(false)
  const [activeTab, setActiveTab] = useState('tables') // tables | functions | views

  useEffect(() => {
    loadSchema()
  }, [])

  async function loadSchema() {
    try {
      setLoading(true)
      setError('')
      
      const res = await fetch(`${API}/schema`)
      const data = await res.json()
      
      if (!res.ok || data?.error) {
        throw new Error(data?.error || 'Не удалось загрузить схему БД')
      }

      // Normalize data
      const tables = (data.tables || []).map(t => {
        const tableName = typeof t === 'string' ? t : t.name || t.table_name
        return {
          name: tableName,
          type: t.type || 'table',
          columns: data.columns?.filter(c => c.table_name === tableName).map(c => ({
            name: c.column_name,
            data_type: c.data_type,
            is_pk: !!c.is_primary_key,
            is_nullable: c.is_nullable === 'YES'
          })) || []
        }
      })

      // Separate tables, views, and functions
      const normalizedTables = tables.filter(t => t.type !== 'view' && t.type !== 'function')
      const normalizedViews = tables.filter(t => t.type === 'view')
      const normalizedFunctions = (data.functions || []).map(f => ({
        name: f.name || f.routine_name,
        type: 'function',
        args: f.args || '',
        return_type: f.return_type || ''
      }))

      const relationships = data.relationships || []

      setSchema({
        tables: normalizedTables,
        views: normalizedViews,
        functions: normalizedFunctions,
        relationships
      })

      // Auto-select first table
      if (normalizedTables.length > 0) {
        setSelectedTable(normalizedTables[0].name)
      }

    } catch (err) {
      setError(err?.message || 'Ошибка загрузки схемы')
    } finally {
      setLoading(false)
    }
  }

  // Generate nodes and edges
  useEffect(() => {
    if (!schema) return

    const { tables, relationships } = schema

    // Calculate positions using a grid layout
    const cols = Math.ceil(Math.sqrt(tables.length))
    
    const newNodes = tables.map((table, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      
      return {
        id: table.name,
        type: 'tableNode',
        position: { x: col * 280, y:row * 180 },
        data: {
          table,
          selected: selectedTable === table.name,
          onSelect: setSelectedTable,
          relationships
        }
      }
    })

    const newEdges = relationships.map((rel, idx) => {
      const isFocused = !selectedTable || 
        rel.from_table === selectedTable || 
        rel.to_table === selectedTable
      const isSelected = showAllRelations || isFocused

      return {
        id: `e-${idx}`,
        source: rel.from_table,
        target: rel.to_table,
        label: `${rel.from_column} → ${rel.to_column}`,
        type: 'smoothstep',
        animated: selectedTable === rel.from_table || selectedTable === rel.to_table,
        style: {
          stroke: selectedTable === rel.from_table ? '#22c55e' : 
                 selectedTable === rel.to_table ? '#6366f1' : '#475569',
          strokeWidth: selectedTable ? (isFocused ? 2.5 : 1) : 1.5,
          opacity: selectedTable && !isFocused ? 0.3 : 1
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: selectedTable === rel.from_table ? '#22c55e' : 
                 selectedTable === rel.to_table ? '#6366f1' : '#475569'
        }
      }
    })

    setNodes(newNodes)
    setEdges(newEdges)
  }, [schema, selectedTable, showAllRelations, setNodes, setEdges])

  // Get selected table details
  const selectedTableData = useMemo(() => {
    if (!schema || !selectedTable) return null
    return schema.tables.find(t => t.name === selectedTable) || null
  }, [schema, selectedTable])

  // Get table relations
  const { outgoing, incoming } = useMemo(() => {
    if (!schema || !selectedTable) return { outgoing: [], incoming: [] }
    return {
      outgoing: schema.relationships.filter(r => r.from_table === selectedTable),
      incoming: schema.relationships.filter(r => r.to_table === selectedTable)
    }
  }, [schema, selectedTable])

  if (loading) {
    return (
      <div className="schema-loading">
        <div className="spinner" />
        <span>Загрузка схемы базы данных...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="schema-error">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        <span>{error}</span>
        <button onClick={loadSchema}>Повторить</button>
      </div>
    )
  }

  const { tables, views, functions, relationships } = schema

  return (
    <div className="schema-page">
      {/* Header */}
      <div className="schema-header">
        <div className="header-info">
          <h2>Визуализация схемы БД</h2>
          <p>Интерактивная схема с таблицами, связями и функциями</p>
        </div>
        <div className="header-actions">
          <label className="toggle-label">
            <input 
              type="checkbox" 
              checked={showAllRelations}
              onChange={(e) => setShowAllRelations(e.target.checked)}
            />
            <span>Показать все связи</span>
          </label>
          <button className="btn btn-secondary" onClick={loadSchema}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Обновить
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="schema-stats">
        <div className="stat-item">
          <div className="stat-value">{tables.length}</div>
          <div className="stat-label">
            Таблиц
            <InfoTooltip text="Обычные таблицы PostgreSQL, хранящие данные" />
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{views.length}</div>
          <div className="stat-label">
            Представлений
            <InfoTooltip text="Views - виртуальные таблицы, результаты SQL-запросов" />
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{functions.length}</div>
          <div className="stat-label">
            Функций
            <InfoTooltip text="Пользовательские функции PostgreSQL для бизнес-логики" />
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{relationships.length}</div>
          <div className="stat-label">
            Связей FK
            <InfoTooltip text="Foreign Key - связи между таблицами по ключам" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="schema-tabs">
        <button 
          className={`tab ${activeTab === 'tables' ? 'active' : ''}`}
          onClick={() => setActiveTab('tables')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
          </svg>
          Таблицы
        </button>
        <button 
          className={`tab ${activeTab === 'views' ? 'active' : ''}`}
          onClick={() => setActiveTab('views')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Представления ({views.length})
        </button>
        <button 
          className={`tab ${activeTab === 'functions' ? 'active' : ''}`}
          onClick={() => setActiveTab('functions')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
            <path d="M9 9h6M9 13h6M9 17h4" />
          </svg>
          Функции ({functions.length})
        </button>
      </div>

      {/* Content */}
      <div className="schema-content">
        {activeTab === 'tables' && (
          <div className="tables-section">
            {/* React Flow Canvas */}
            <div className="flow-container">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.3}
                maxZoom={1.5}
                onNodeClick={(_, node) => setSelectedTable(node.id)}
                onPaneClick={() => setSelectedTable(null)}
              >
                <Controls 
                  showZoom={true}
                  showFitView={true}
                  showInteractive={false}
                />
                <MiniMap 
                  nodeColor={() => '#334155'}
                  maskColor="rgba(10, 10, 15, 0.8)"
                  style={{ background: '#12121a' }}
                />
                <Background gap={24} size={1} color="#1e293b" />
              </ReactFlow>
            </div>

            {/* Details Panel */}
            <div className="details-panel">
              <div className="panel-header">
                <h3>Детали</h3>
                {selectedTable && (
                  <button 
                    className="btn btn-sm"
                    onClick={() => window.location.href = `/table/${selectedTable}`}
                  >
                    Открыть таблицу
                  </button>
                )}
              </div>
              
              {!selectedTableData ? (
                <div className="panel-empty">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                  <span>Выберите таблицу на схеме</span>
                </div>
              ) : (
                <div className="panel-content">
                  {/* Table Info */}
                  <div className="detail-section">
                    <div className="detail-title">
                      {selectedTableData.name}
                      <span className="badge">{selectedTableData.type}</span>
                    </div>
                  </div>

                  {/* Columns */}
                  <div className="detail-section">
                    <h4>Колонки ({selectedTableData.columns.length})</h4>
                    <div className="columns-list">
                      {selectedTableData.columns.map(col => (
                        <div key={col.name} className="column-item">
                          <div className="column-header">
                            <span className="column-name">
                              {col.is_pk && <span className="badge badge-pk">PK</span>}
                              {col.name}
                            </span>
                            <span className="column-type">{col.data_type}</span>
                          </div>
                          <span className="column-null">
                            {col.is_nullable ? 'nullable' : 'NOT NULL'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

{/* Outgoing FK */}
                  {outgoing.length > 0 && (
                    <div className="detail-section">
                      <h4>
                        Исходящие связи ({outgoing.length})
                        <InfoTooltip text="FK связи, где эта таблица ссылается на другие" />
                      </h4>
                      <div className="relations-list">
                        {outgoing.map((rel, i) => (
                          <div 
                            key={i} 
                            className="relation-item out"
                            onClick={() => setSelectedTable(rel.to_table)}
                          >
                            <div className="relation-path">
                              <span className="col">{rel.from_column}</span>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                              </svg>
                              <span className="table">{rel.to_table}</span>
                              <span className="col">.{rel.to_column}</span>
                            </div>
                            <span className="relation-on">ON DELETE: {rel.on_delete || 'RESTRICT'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Incoming FK */}
                  {incoming.length > 0 && (
                    <div className="detail-section">
                      <h4>
                        Входящие связи ({incoming.length})
                        <InfoTooltip text="FK связи, где другие таблицы ссылаются на эту" />
                      </h4>
                      <div className="relations-list">
                        {incoming.map((rel, i) => (
                          <div 
                            key={i} 
                            className="relation-item in"
                            onClick={() => setSelectedTable(rel.from_table)}
                          >
                            <div className="relation-path">
                              <span className="table">{rel.from_table}</span>
                              <span className="col">.{rel.from_column}</span>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                              </svg>
                              <span className="col">{rel.to_column}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'views' && (
          <div className="views-section">
            <div className="section-header">
              <h3>Представления (Views)</h3>
              <p>Виртуальные таблицы, созданные на основе SQL-запросов</p>
            </div>
            <div className="views-list">
              {views.map(view => (
                <div key={view.name} className="view-card">
                  <div className="view-header">
                    <div className="view-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </div>
                    <span className="view-name">{view.name}</span>
                    <span className="badge">VIEW</span>
                  </div>
                  <div className="view-columns">
                    {view.columns.slice(0, 4).map(col => (
                      <span key={col.name} className="column-tag">{col.name}</span>
                    ))}
                    {view.columns.length > 4 && (
                      <span className="more">+{view.columns.length - 4}</span>
                    )}
                  </div>
                </div>
              ))}
              {views.length === 0 && (
                <div className="empty-state">
                  <p>Представления не найдены</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'functions' && (
          <div className="functions-section">
            <div className="section-header">
              <h3>Функции PostgreSQL</h3>
              <p>Пользовательские функции для выполнения бизнес-логики на сервере БД</p>
            </div>
            <div className="functions-list">
              {functions.map(fn => (
                <div key={fn.name} className="function-card">
                  <div className="function-header">
                    <div className="function-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                        <path d="M9 9h6M9 13h6M9 17h4" />
                      </svg>
                    </div>
                    <div className="function-info">
                      <span className="function-name">{fn.name}</span>
                      <span className="function-return">
                        Возвращает: {fn.return_type || 'void'}
                      </span>
                    </div>
                    <span className="badge fn-badge">FUNCTION</span>
                  </div>
                  {fn.args && (
                    <div className="function-args">
                      <span className="args-label">Аргументы:</span>
                      <code className="args-code">{fn.args}</code>
                    </div>
                  )}
                </div>
              ))}
              {functions.length === 0 && (
                <div className="empty-state">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M18 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                    <path d="M9 9h6M9 13h6M9 17h4" />
                  </svg>
                  <p>Функции не найдены</p>
                  <span>В схеме public нет пользовательских функций</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
