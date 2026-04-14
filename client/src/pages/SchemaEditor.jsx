import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './SchemaEditor.css'

export default function SchemaEditor() {
  const [tables, setTables] = useState([])
  const [views, setViews] = useState([])
  const [functions, setFunctions] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [activeTab, setActiveTab] = useState('relationships')
  const [loading, setLoading] = useState(true)
  const [relationships, setRelationships] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editItem, setEditItem] = useState(null)

  // New relationship form state
  const [newRelForm, setNewRelForm] = useState({
    sourceTable: '',
    sourceColumn: '',
    targetTable: '',
    targetColumn: '',
    constraintName: ''
  })

  useEffect(() => {
    fetchSchema()
  }, [])

  const fetchSchema = async () => {
    setLoading(true)
    try {
      const [tablesRes, viewsRes, funcsRes] = await Promise.all([
        fetch('/api/tables'),
        fetch('/api/database/views'),
        fetch('/api/database/functions')
      ])

      const tablesData = await tablesRes.json()
      const viewsData = await viewsRes.json()
      const funcsData = await funcsRes.json()

      setTables(tablesData.tables || [])
      setViews(viewsData.views || [])
      setFunctions(funcsData.functions || [])

      // Fetch relationships for each table
      const allRelationships = []
      for (const table of tablesData.tables || []) {
        try {
          const res = await fetch(`/api/tables/${table.table_name}/relationships`)
          const data = await res.json()
          allRelationships.push(...(data.outgoing || []).map(r => ({ ...r, sourceTable: table.table_name })))
        } catch (e) {}
      }
      setRelationships(allRelationships)

      if (tablesData.tables?.length > 0) {
        setSelectedTable(tablesData.tables[0])
      }
    } catch (error) {
      console.error('Error fetching schema:', error)
    }
    setLoading(false)
  }

  const handleAddRelationship = async () => {
    if (!newRelForm.sourceTable || !newRelForm.targetTable) return

    try {
      const res = await fetch(`/api/tables/${newRelForm.sourceTable}/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          column: newRelForm.sourceColumn,
          foreign_table: newRelForm.targetTable,
          foreign_column: newRelForm.targetColumn,
          constraint_name: newRelForm.constraintName || `${newRelForm.sourceTable}_${newRelForm.targetTable}_fkey`
        })
      })

      if (res.ok) {
        setShowAddModal(false)
        setNewRelForm({ sourceTable: '', sourceColumn: '', targetTable: '', targetColumn: '', constraintName: '' })
        fetchSchema()
      }
    } catch (error) {
      console.error('Error adding relationship:', error)
    }
  }

  const handleDeleteRelationship = async (tableName, constraintName) => {
    if (!confirm(`Удалить связь ${constraintName}?`)) return

    try {
      const res = await fetch(`/api/tables/${tableName}/relationships/${constraintName}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchSchema()
      }
    } catch (error) {
      console.error('Error deleting relationship:', error)
    }
  }

  const getTableColumns = async (tableName) => {
    try {
      const res = await fetch(`/api/tables/${tableName}/columns`)
      const data = await res.json()
      return data.columns || []
    } catch {
      return []
    }
  }

  const [columns, setColumns] = useState({})

  useEffect(() => {
    const loadColumns = async () => {
      const cols = {}
      for (const table of tables) {
        cols[table.table_name] = await getTableColumns(table.table_name)
      }
      setColumns(cols)
    }
    if (tables.length > 0) loadColumns()
  }, [tables])

  if (loading) {
    return (
      <div className="schema-editor">
        <div className="editor-loading">
          <div className="loading-spinner"></div>
          <p>Загрузка схемы базы данных...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="schema-editor">
      <div className="editor-header">
        <h1>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18"/>
          </svg>
          Редактор схемы
          <span className="header-subtitle">Создание и редактирование связей, функций и представлений</span>
        </h1>
        <div className="header-actions">
          <Link to="/schema" className="btn btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
            </svg>
            Схема БД
          </Link>
        </div>
      </div>

      <div className="editor-info-card">
        <div className="info-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
          </svg>
        </div>
        <div className="info-content">
          <strong>Редактор связей и функций</strong>
          <p>Создавайте внешние ключи (FK), редактируйте функции и представления базы данных.</p>
        </div>
      </div>

      <div className="editor-content">
        <div className="editor-sidebar">
          <div className="sidebar-section">
            <div className="section-header">
               <h3>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M3 9h18"/>
                  <path d="M9 21V9"/>
                </svg>
                Таблицы
                <span className="count">{tables.length}</span>
              </h3>
            </div>
            <div className="sidebar-list">
              {tables.map(table => (
                <button
                  key={table.table_name}
                  className={`sidebar-item ${selectedTable?.table_name === table.table_name ? 'active' : ''}`}
                  onClick={() => setSelectedTable(table)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18"/>
                  </svg>
                  <span className="item-name">{table.table_name}</span>
                  <span className="item-hint" title={`Строк: ${table.estimated_row_count || '?'}`}>
                    {table.estimated_row_count ? `${(table.estimated_row_count / 1000).toFixed(0)}k` : '?'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="section-header">
              <h3>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
                Представления
                <span className="count">{views.length}</span>
              </h3>
            </div>
            <div className="sidebar-list">
              {views.map(view => (
                <div key={view.view_name} className="sidebar-item view-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                  <span className="item-name">{view.view_name}</span>
                </div>
              ))}
              {views.length === 0 && (
                <div className="empty-list">Нет представлений</div>
              )}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="section-header">
              <h3>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 20V10"/>
                  <path d="M12 20V4"/>
                  <path d="M6 20v-6"/>
                </svg>
                Функции
                <span className="count">{functions.length}</span>
              </h3>
            </div>
            <div className="sidebar-list">
              {functions.slice(0, 10).map(fn => (
                <div key={fn.function_name} className="sidebar-item function-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 20V10"/>
                    <path d="M12 20V4"/>
                    <path d="M6 20v-6"/>
                  </svg>
                  <span className="item-name">{fn.function_name}</span>
                </div>
              ))}
              {functions.length > 10 && (
                <div className="more-count">+{functions.length - 10} ещё</div>
              )}
              {functions.length === 0 && (
                <div className="empty-list">Нет функций</div>
              )}
            </div>
          </div>
        </div>

        <div className="editor-main">
          {selectedTable ? (
            <>
              <div className="editor-tabs">
                <button
                  className={`editor-tab ${activeTab === 'relationships' ? 'active' : ''}`}
                  onClick={() => setActiveTab('relationships')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                  Связи таблицы
                </button>
                <button
                  className={`editor-tab ${activeTab === 'structure' ? 'active' : ''}`}
                  onClick={() => setActiveTab('structure')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="16 18 22 12 16 6"/>
                    <polyline points="8 6 2 12 8 18"/>
                  </svg>
                  Структура
                </button>
                <button
                  className={`editor-tab ${activeTab === 'info' ? 'active' : ''}`}
                  onClick={() => setActiveTab('info')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                  </svg>
                  Информация
                </button>
              </div>

              <div className="editor-panel">
                {activeTab === 'relationships' && (
                  <div className="relationships-panel">
                    <div className="panel-header">
                      <div className="panel-title">
                        <h2>Связи таблицы <span className="table-name">{selectedTable.table_name}</span></h2>
                        <p>Внешние ключи и ограничения ссылочной целостности</p>
                      </div>
                      <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19"/>
                          <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Добавить связь
                      </button>
                    </div>

                    <div className="relationships-list">
                      <div className="rel-section">
                        <h3>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14"/>
                            <path d="M12 5l7 7-7 7"/>
                          </svg>
                          Исходящие связи (FK)
                        </h3>
                        {relationships.filter(r => r.sourceTable === selectedTable.table_name).length > 0 ? (
                          <div className="rel-cards">
                            {relationships.filter(r => r.sourceTable === selectedTable.table_name).map((rel, idx) => (
                              <div key={idx} className="rel-card outgoing">
                                <div className="rel-card-header">
                                  <span className="constraint-name">{rel.constraint_name || rel.constraint}</span>
                                  <button className="delete-btn" onClick={() => handleDeleteRelationship(selectedTable.table_name, rel.constraint_name || rel.constraint)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <polyline points="3 6 5 6 21 6"/>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                    </svg>
                                  </button>
                                </div>
                                <div className="rel-card-body">
                                  <div className="rel-endpoint">
                                    <span className="endpoint-label">Колонка</span>
                                    <span className="endpoint-value">{rel.column_name}</span>
                                  </div>
                                  <div className="rel-arrow">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M5 12h14"/>
                                      <path d="M12 5l7 7-7 7"/>
                                    </svg>
                                  </div>
                                  <div className="rel-endpoint">
                                    <span className="endpoint-label">Связана с</span>
                                    <span className="endpoint-value">{rel.foreign_table_name}</span>
                                    <span className="endpoint-col">.{rel.foreign_column_name}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="empty-relations">
                            <p>Нет исходящих связей</p>
                            <button className="btn-link" onClick={() => setShowAddModal(true)}>Создать связь</button>
                          </div>
                        )}
                      </div>

                      <div className="rel-section">
                        <h3>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5"/>
                            <path d="M12 19l-7-7 7-7"/>
                          </svg>
                          Входящие связи (ссылки)
                        </h3>
                        {relationships.filter(r => r.foreign_table_name === selectedTable.table_name).length > 0 ? (
                          <div className="rel-cards">
                            {relationships.filter(r => r.foreign_table_name === selectedTable.table_name).map((rel, idx) => (
                              <div key={idx} className="rel-card incoming">
                                <div className="rel-card-header">
                                  <span className="constraint-name">{rel.constraint_name || rel.constraint}</span>
                                </div>
                                <div className="rel-card-body">
                                  <div className="rel-endpoint">
                                    <span className="endpoint-value">{rel.sourceTable}</span>
                                    <span className="endpoint-col">.{rel.column_name}</span>
                                  </div>
                                  <div className="rel-arrow">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M19 12H5"/>
                                      <path d="M12 19l-7-7 7-7"/>
                                    </svg>
                                  </div>
                                  <div className="rel-endpoint">
                                    <span className="endpoint-label">Ссылается на</span>
                                    <span className="endpoint-value">{rel.foreign_table_name}</span>
                                    <span className="endpoint-col">.{rel.foreign_column_name}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="empty-relations">
                            <p>Нет входящих связей</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'structure' && (
                  <div className="structure-panel">
                    <div className="panel-header">
                      <div className="panel-title">
                        <h2>Структура таблицы <span className="table-name">{selectedTable.table_name}</span></h2>
                        <p>Колоны и их типы данных</p>
                      </div>
                    </div>

                    <div className="columns-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Имя</th>
                            <th>Тип</th>
                            <th>Nullable</th>
                            <th>Default</th>
                            <th>Ключ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(columns[selectedTable.table_name] || []).map(col => (
                            <tr key={col.column_name}>
                              <td className="col-name">{col.column_name}</td>
                              <td className="col-type">{col.data_type}</td>
                              <td>{col.is_nullable === 'YES' ? '✓' : '✗'}</td>
                              <td className="col-default">{col.column_default || '—'}</td>
                              <td>
                                {col.is_primary_key && <span className="pk-badge">PK</span>}
                                {col.is_foreign_key && <span className="fk-badge">FK</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'info' && (
                  <div className="info-panel">
                    <div className="panel-header">
                      <div className="panel-title">
                        <h2>Информация о таблице</h2>
                        <p>Метаданные и статистика</p>
                      </div>
                    </div>

                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Имя таблицы</span>
                        <span className="info-value">{selectedTable.table_name}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Тип</span>
                        <span className="info-value">Таблица</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Приблизительное кол-во строк</span>
                        <span className="info-value">{selectedTable.estimated_row_count?.toLocaleString() || '?'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Колонок</span>
                        <span className="info-value">{(columns[selectedTable.table_name] || []).length}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">FK связей</span>
                        <span className="info-value">{relationships.filter(r => r.sourceTable === selectedTable.table_name).length}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Размер (海中)</span>
                        <span className="info-value">{(selectedTable.total_bytes / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-selection">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18"/>
                <path d="M9 21V9"/>
              </svg>
              <h3>Выберите таблицу</h3>
              <p>Выберите таблицу из списка слева для редактирования связей</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Relationship Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Добавить связь (Foreign Key)</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4"/>
                  <path d="M12 8h.01"/>
                </svg>
                <p>Внешний ключ (FK) создаёт связь между таблицами и обеспечивает ссылочную целостность данных.</p>
              </div>

              <div className="form-group">
                <label>Таблица-источник (где создаём FK)</label>
                <select
                  value={newRelForm.sourceTable}
                  onChange={e => setNewRelForm({ ...newRelForm, sourceTable: e.target.value })}
                >
                  <option value="">Выберите таблицу...</option>
                  {tables.map(t => (
                    <option key={t.table_name} value={t.table_name}>{t.table_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Колонка-источник</label>
                <select
                  value={newRelForm.sourceColumn}
                  onChange={e => setNewRelForm({ ...newRelForm, sourceColumn: e.target.value })}
                  disabled={!newRelForm.sourceTable}
                >
                  <option value="">Выберите колонку...</option>
                  {(columns[newRelForm.sourceTable] || []).map(col => (
                    <option key={col.column_name} value={col.column_name}>{col.column_name} ({col.data_type})</option>
                  ))}
                </select>
              </div>

              <div className="form-divider">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14"/>
                  <path d="M12 5l7 7-7 7"/>
                </svg>
              </div>

              <div className="form-group">
                <label>Целевая таблица (на которую ссылаемся)</label>
                <select
                  value={newRelForm.targetTable}
                  onChange={e => setNewRelForm({ ...newRelForm, targetTable: e.target.value })}
                >
                  <option value="">Выберите таблицу...</option>
                  {tables.map(t => (
                    <option key={t.table_name} value={t.table_name}>{t.table_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Целевая колонка (PK или уникальная)</label>
                <select
                  value={newRelForm.targetColumn}
                  onChange={e => setNewRelForm({ ...newRelForm, targetColumn: e.target.value })}
                  disabled={!newRelForm.targetTable}
                >
                  <option value="">Выберите колонку...</option>
                  {(columns[newRelForm.targetTable] || []).map(col => (
                    <option key={col.column_name} value={col.column_name}>{col.column_name} ({col.data_type})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Имя ограничения (опционально)</label>
                <input
                  type="text"
                  value={newRelForm.constraintName}
                  onChange={e => setNewRelForm({ ...newRelForm, constraintName: e.target.value })}
                  placeholder={`${newRelForm.sourceTable || 'source'}_${newRelForm.targetTable || 'target'}_fkey`}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={handleAddRelationship}>
                Создать связь
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}