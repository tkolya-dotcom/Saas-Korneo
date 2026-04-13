import { useEffect, useMemo, useState } from 'react'
import ReactFlow, { Background, Controls, MiniMap, MarkerType } from 'reactflow'
import 'reactflow/dist/style.css'

function TableNode({ data, selected }) {
  const table = data.table
  const columns = Array.isArray(table.columns) ? table.columns : []

  return (
    <div
      style={{
        minWidth: 180,
        maxWidth: 200,
        border: selected ? '1px solid #60a5fa' : '1px solid #334155',
        borderRadius: 12,
        background: selected ? '#0f172a' : '#111827',
        color: '#e5e7eb',
        boxShadow: selected
          ? '0 0 0 1px rgba(96,165,250,0.35), 0 10px 30px rgba(0,0,0,0.35)'
          : '0 8px 24px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '10px 12px',
          background: selected ? '#172554' : '#1f2937',
          borderBottom: '1px solid #334155',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13 }}>{table.name}</div>
        <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>
          {columns.length} полей • {table.type || 'table'}
        </div>
      </div>
    </div>
  )
}

const nodeTypes = { tableNode: TableNode }

function getTablePosition(index) {
  const cols = 5
  const col = index % cols
  const row = Math.floor(index / cols)
  return {
    x: 60 + col * 220,
    y: 40 + row * 120,
  }
}

export default function SchemaView() {
  const [schema, setSchema] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTable, setSelectedTable] = useState(null)

  useEffect(() => {
    let active = true

    async function loadSchema() {
      try {
        setLoading(true)
        setError('')

        const res = await fetch('/api/schema')
        const data = await res.json()

        if (!res.ok || data?.error) {
          throw new Error(data?.error || 'Не удалось загрузить схему БД')
        }

        if (!active) return

        const normalizedTables = (data.tables || []).map(table => ({
          name: table.name || table,
          type: table.type || 'table',
          columns: data.columns?.filter(c => (table.name || table) === c.table_name).map(c => ({
            name: c.column_name,
            data_type: c.data_type,
            is_pk: !!c.is_primary_key,
          })) || []
        }))

        const normalizedViews = (data.views || []).map(view => ({
          name: view.name || view,
          type: 'view',
          columns: data.columns?.filter(c => (view.name || view) === c.table_name).map(c => ({
            name: c.column_name,
            data_type: c.data_type,
            is_pk: !!c.is_primary_key,
          })) || []
        }))

        const normalizedFunctions = (data.functions || []).map(func => ({
          name: func.name || func,
          type: 'function'
        }))

        const allTables = [...normalizedTables, ...normalizedViews]

        const normalizedRelationships = Array.isArray(data?.relationships)
          ? data.relationships
          : []

        const prepared = {
          tables: allTables,
          views: normalizedViews,
          functions: normalizedFunctions,
          relationships: normalizedRelationships,
        }

        setSchema(prepared)
        setSelectedTable(
          allTables.find(t => t.name === 'materials_request_items') || allTables.find(t => t.name === 'messages') || allTables[0] || null
        )
      } catch (err) {
        if (!active) return
        setError(err?.message || 'Не удалось загрузить схему БД')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSchema()

    return () => {
      active = false
    }
  }, [])

  const tables = schema?.tables || []
  const relationships = schema?.relationships || []
  const functions = schema?.functions || []
  const selectedTableName = selectedTable?.name || null

  const nodes = useMemo(
    () => tables.map((table, index) => ({
      id: table.name,
      type: 'tableNode',
      position: getTablePosition(index),
      data: { table },
      selected: selectedTableName === table.name,
    })),
    [tables, selectedTableName]
  )

  const edges = useMemo(
    () => relationships.map((rel, idx) => {
      const isFocused = selectedTableName &&
        (rel.from_table === selectedTableName || rel.to_table === selectedTableName)

      return {
        id: `e-${idx}-${rel.from_table}-${rel.to_column}`,
        source: rel.from_table,
        target: rel.to_table,
        type: 'smoothstep',
        hidden: !isFocused,
        animated: !!isFocused,
        zIndex: isFocused ? 999 : 1,
        style: {
          stroke: isFocused ? '#10b981' : '#60a5fa',
          strokeWidth: isFocused ? 3.5 : 1.5,
          opacity: isFocused ? 1 : 0.6,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: isFocused ? '#10b981' : '#60a5fa',
        },
      }
    }),
    [relationships, selectedTableName]
  )

  const outgoing = useMemo(
    () => relationships.filter(r => r.from_table === selectedTableName),
    [relationships, selectedTableName]
  )

  const incoming = useMemo(
    () => relationships.filter(r => r.to_table === selectedTableName),
    [relationships, selectedTableName]
  )

  const totalColumns = useMemo(
    () => tables.reduce((sum, t) => sum + (t.columns?.length || 0), 0),
    [tables]
  )

  if (loading) {
    return (
      <div style={{ padding: 16, color: '#e5e7eb', background: '#020617', minHeight: '100vh' }}>
        Загрузка схемы…
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 16, color: '#fca5a5', background: '#020617', minHeight: '100vh' }}>
        {error}
      </div>
    )
  }

  return (
    <div style={{ padding: 16, background: '#020617', color: '#e5e7eb', minHeight: '100vh' }}>
      <div style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 26, color: '#f8fafc' }}>Схема БД</h1>
        <p style={{ margin: '8px 0 0', color: '#94a3b8' }}>
          Линии FK для выбранной таблицы • Functions/views теперь работают!
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <StatCard label="Таблиц/Views" value={tables.length} />
        <StatCard label="Колонок" value={totalColumns} />
        <StatCard label="Связей" value={relationships.length} />
        <StatCard label="Функций" value={functions.length} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
        <div
          style={{
            height: '78vh',
            background: '#0b1220',
            border: '1px solid #1e293b',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.22 }}
            minZoom={0.2}
            maxZoom={1.4}
            onNodeClick={(_, node) => {
              const table = tables.find(t => t.name === node.id)
              setSelectedTable(table || null)
            }}
          >
            <MiniMap nodeColor={() => '#334155'} maskColor="rgba(2,6,23,0.65)" style={{ background: '#0f172a' }} />
            <Controls />
            <Background gap={24} size={1} color="#1e293b" />
          </ReactFlow>
        </div>

        <aside
          style={{
            height: '78vh',
            overflow: 'auto',
            border: '1px solid #1e293b',
            borderRadius: 14,
            background: '#0b1220',
            padding: 16,
          }}
        >
          {!selectedTable ? (
            <div style={{ color: '#94a3b8' }}>Выбери таблицу на canvas.</div>
          ) : (
            <>
              <h2 style={{ marginTop: 0, color: '#f8fafc' }}>{selectedTable.name}</h2>
              <p style={{ color: '#94a3b8' }}>{selectedTable.type?.toUpperCase()}</p>

              <h3 style={sectionTitle}>Поля</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {(selectedTable.columns || []).map(col => (
                  <div key={col.name} style={panelCard}>
                    <div style={{ fontWeight: 700, color: '#e5e7eb' }}>{col.name}</div>
                    <div style={{ fontSize: 13, color: '#93c5fd' }}>{col.data_type}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: '#94a3b8' }}>
                      {col.is_pk ? '🔑 Первичный ключ' : col.data_type?.includes('uuid') ? 'UUID ID' : col.data_type?.includes('timestamp') ? 'Дата/время' : ''}
                    </div>
                  </div>
                ))}
              </div>

              <h3 style={sectionTitle}>Исходящие FK ({outgoing.length})</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {outgoing.map((rel, i) => (
                  <div key={i} style={panelCard}>
                    <div><b>{rel.from_column}</b> → <b>{rel.to_table}.{rel.to_column}</b></div>
                    <div style={mutedText}>Каскад: {rel.on_delete || 'RESTRICT'}</div>
                  </div>
                ))}
              </div>

              <h3 style={sectionTitle}>Входящие FK ({incoming.length})</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {incoming.map((rel, i) => (
                  <div key={i} style={panelCard}>
                    <div><b>{rel.from_table}.{rel.from_column}</b> → <b>{rel.to_column}</b></div>
                    <div style={mutedText}>Из {rel.from_table}</div>
                  </div>
                ))}
              </div>

              {functions.length > 0 && (
                <div>
                  <h3 style={sectionTitle}>Функции ({functions.length})</h3>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {functions.slice(0, 3).map((fn, i) => (
                      <div key={i} style={panelCard}>
                        <div style={{ fontWeight: 700 }}>{fn.name}</div>
                        <div style={mutedText}>Custom function</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div
      style={{
        minWidth: 120,
        background: '#0b1220',
        border: '1px solid #1e293b',
        borderRadius: 12,
        padding: '10px 14px',
      }}
    >
      <div style={{ color: '#94a3b8', fontSize: 12 }}>{label}</div>
      <div style={{ color: '#f8fafc', fontSize: 28, fontWeight: 800 }}>{value}</div>
    </div>
  )
}

const sectionTitle = {
  marginTop: 18,
  marginBottom: 10,
  color: '#f8fafc',
}

const panelCard = {
  border: '1px solid #1e293b',
  borderRadius: 10,
  padding: 10,
  background: '#111827',
  color: '#e5e7eb',
}

const mutedText = {
  marginTop: 4,
  fontSize: 12,
  color: '#94a3b8',
}
