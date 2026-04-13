import { useState, useEffect } from 'react'
import './Connections.css'

export default function Connections() {
  const [connectionConfig, setConnectionConfig] = useState({
    host: 'localhost',
    port: '5432',
    database: '',
    user: '',
    password: '',
    ssl: false
  })
  const [apiKeys, setApiKeys] = useState([])
  const [showAddKey, setShowAddKey] = useState(false)
  const [newKeyForm, setNewKeyForm] = useState({ name: '', key: '', description: '' })
  const [testStatus, setTestStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('connection')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/config/connection')
      if (res.ok) {
        const data = await res.json()
        if (data.config) {
          setConnectionConfig(data.config)
        }
      }
    } catch (e) {}
    
    // Load mock API keys for demo
    setApiKeys([
      { id: 1, name: 'Production API Key', key: 'pk_live_xxxxxxxxxxxx', description: 'Для production окружения', created: '2024-01-15' },
      { id: 2, name: 'Test API Key', key: 'pk_test_yyyyyyyyyyyy', description: 'Для тестирования', created: '2024-02-20' }
    ])
  }

  const handleSaveConnection = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/config/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connectionConfig)
      })
      
      if (res.ok) {
        alert('Конфигурация сохранена')
      }
    } catch (error) {
      console.error('Error saving config:', error)
    }
    setLoading(false)
  }

  const handleTestConnection = async () => {
    setTestStatus('testing')
    try {
      const res = await fetch('/api/database/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connectionConfig)
      })
      
      if (res.ok) {
        const data = await res.json()
        setTestStatus(data.success ? 'success' : 'error')
      } else {
        setTestStatus('error')
      }
    } catch {
      setTestStatus('error')
    }
  }

  const handleAddApiKey = () => {
    if (!newKeyForm.name || !newKeyForm.key) return
    
    const newKey = {
      id: Date.now(),
      ...newKeyForm,
      created: new Date().toISOString().split('T')[0]
    }
    
    setApiKeys([...apiKeys, newKey])
    setShowAddKey(false)
    setNewKeyForm({ name: '', key: '', description: '' })
  }

  const handleDeleteApiKey = (id) => {
    if (!confirm('Удалить этот API ключ?')) return
    setApiKeys(apiKeys.filter(k => k.id !== id))
  }

  return (
    <div className="connections-page">
      <div className="connections-header">
        <h1>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
          </svg>
          Подключение и API ключи
        </h1>
      </div>

      <div className="connections-info-card">
        <div className="info-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div className="info-content">
          <strong>Безопасность данных</strong>
          <p>Храните параметры подключения к базе данных и API ключи в защищённом месте. Не передавайте их третьим лицам.</p>
        </div>
      </div>

      <div className="connections-tabs">
        <button 
          className={`conn-tab ${activeTab === 'connection' ? 'active' : ''}`}
          onClick={() => setActiveTab('connection')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="2" width="20" height="8" rx="2"/>
            <rect x="2" y="14" width="20" height="8" rx="2"/>
            <line x1="6" y1="6" x2="6.01" y2="6"/>
            <line x1="6" y1="18" x2="6.01" y2="18"/>
          </svg>
          Подключение к БД
        </button>
        <button 
          className={`conn-tab ${activeTab === 'apikeys' ? 'active' : ''}`}
          onClick={() => setActiveTab('apikeys')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
          </svg>
          API ключи
        </button>
        <button 
          className={`conn-tab ${activeTab === 'env' ? 'active' : ''}`}
          onClick={() => setActiveTab('env')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 17l6-6-6-6"/>
            <path d="M12 19h8"/>
          </svg>
          Переменные окружения
        </button>
      </div>

      <div className="connections-content">
        {activeTab === 'connection' && (
          <div className="connection-form">
            <div className="form-section">
              <div className="section-header">
                <h2>Параметры подключения</h2>
                <p>Настройте подключение к PostgreSQL базе данных</p>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>
                    Хост
                    <span className="tooltip-icon" title="Адрес сервера базы данных. Обычно localhost для локальной разработки">
                      ?
                    </span>
                  </label>
                  <input
                    type="text"
                    value={connectionConfig.host}
                    onChange={e => setConnectionConfig({ ...connectionConfig, host: e.target.value })}
                    placeholder="localhost"
                  />
                  <span className="form-hint">IP адрес или доменное имя сервера БД</span>
                </div>

                <div className="form-group">
                  <label>
                    Порт
                    <span className="tooltip-icon" title="Порт PostgreSQL. По умолчанию 5432">
                      ?
                    </span>
                  </label>
                  <input
                    type="text"
                    value={connectionConfig.port}
                    onChange={e => setConnectionConfig({ ...connectionConfig, port: e.target.value })}
                    placeholder="5432"
                  />
                </div>

                <div className="form-group full-width">
                  <label>
                    Название базы данных
                    <span className="tooltip-icon" title="Имя базы данных, к которой нужно подключиться">
                      ?
                    </span>
                  </label>
                  <input
                    type="text"
                    value={connectionConfig.database}
                    onChange={e => setConnectionConfig({ ...connectionConfig, database: e.target.value })}
                    placeholder="my_database"
                  />
                </div>

                <div className="form-group">
                  <label>
                    Пользователь
                    <span className="tooltip-icon" title="Имя пользователя PostgreSQL с правами на подключение">
                      ?
                    </span>
                  </label>
                  <input
                    type="text"
                    value={connectionConfig.user}
                    onChange={e => setConnectionConfig({ ...connectionConfig, user: e.target.value })}
                    placeholder="postgres"
                  />
                </div>

                <div className="form-group">
                  <label>
                    Пароль
                    <span className="tooltip-icon" title="Пароль пользователя. Хранится локально и не передаётся">
                      ?
                    </span>
                  </label>
                  <div className="password-input">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={connectionConfig.password}
                      onChange={e => setConnectionConfig({ ...connectionConfig, password: e.target.value })}
                      placeholder="••••••••"
                    />
                    <button 
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      type="button"
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="form-group full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={connectionConfig.ssl}
                      onChange={e => setConnectionConfig({ ...connectionConfig, ssl: e.target.checked })}
                    />
                    <span className="checkbox-text">Использовать SSL соединение</span>
                    <span className="tooltip-icon" title="Рекомендуется для production окружения. Шифрует данные при передаче">
                      ?
                    </span>
                  </label>
                  <span className="form-hint">Обеспечивает защищённое соединение с базой данных</span>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button 
                className="btn btn-secondary"
                onClick={handleTestConnection}
                disabled={testStatus === 'testing'}
              >
                {testStatus === 'testing' ? (
                  <>
                    <span className="spinner"></span>
                    Проверка...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Тестировать подключение
                  </>
                )}
              </button>

              <div className="action-group">
                {testStatus === 'success' && (
                  <span className="status-badge success">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Подключение успешно
                  </span>
                )}
                {testStatus === 'error' && (
                  <span className="status-badge error">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="15" y1="9" x2="9" y2="15"/>
                      <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    Ошибка подключения
                  </span>
                )}
                
                <button 
                  className="btn btn-primary"
                  onClick={handleSaveConnection}
                  disabled={loading}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Сохранить настройки
                </button>
              </div>
            </div>

            <div className="form-info">
              <h3>Что такое параметры подключения?</h3>
              <ul>
                <li><strong>Хост</strong> — адрес сервера, где находится база данных</li>
                <li><strong>Порт</strong> — сетевой порт PostgreSQL (по умолчанию 5432)</li>
                <li><strong>База данных</strong> — имя конкретной базы данных</li>
                <li><strong>Пользователь</strong> — учётная запись для авторизации</li>
                <li><strong>Пароль</strong> — секретный ключ для доступа к БД</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'apikeys' && (
          <div className="apikeys-section">
            <div className="section-header">
              <div>
                <h2>API ключи</h2>
                <p>Управление API ключами для внешних интеграций</p>
              </div>
              <button className="btn btn-primary" onClick={() => setShowAddKey(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Добавить ключ
              </button>
            </div>

            <div className="api-keys-list">
              {apiKeys.map(key => (
                <div key={key.id} className="api-key-card">
                  <div className="key-header">
                    <div className="key-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                      </svg>
                    </div>
                    <div className="key-info">
                      <span className="key-name">{key.name}</span>
                      <span className="key-date">Создан: {key.created}</span>
                    </div>
                    <button 
                      className="delete-key-btn"
                      onClick={() => handleDeleteApiKey(key.id)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                  <div className="key-value">
                    <code>{key.key}</code>
                    <button 
                      className="copy-btn"
                      onClick={() => navigator.clipboard.writeText(key.key)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      Копировать
                    </button>
                  </div>
                  <p className="key-desc">{key.description}</p>
                </div>
              ))}

              {apiKeys.length === 0 && (
                <div className="empty-keys">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                  </svg>
                  <h3>Нет API ключей</h3>
                  <p>Создайте API ключ для интеграции с внешними сервисами</p>
                </div>
              )}
            </div>

            <div className="api-info">
              <h3>Что такое API ключи?</h3>
              <p>API ключи используются для аутентификации при запросах к вашему сервису из внешних приложений. Храните их в безопасности и не передавайте публично.</p>
              <ul>
                <li>Каждый ключ имеет уникальный идентификатор</li>
                <li>Ключи могут быть отозваны в любой момент</li>
                <li>Рекомендуется использовать разные ключи для разных приложений</li>
              </ul>
            </div>

            {/* Add Key Modal */}
            {showAddKey && (
              <div className="modal-overlay" onClick={() => setShowAddKey(false)}>
                <div className="modal" onClick={e => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>Добавить API ключ</h3>
                    <button className="close-btn" onClick={() => setShowAddKey(false)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Название</label>
                      <input
                        type="text"
                        value={newKeyForm.name}
                        onChange={e => setNewKeyForm({ ...newKeyForm, name: e.target.value })}
                        placeholder="Production API Key"
                      />
                    </div>
                    <div className="form-group">
                      <label>Ключ</label>
                      <input
                        type="text"
                        value={newKeyForm.key}
                        onChange={e => setNewKeyForm({ ...newKeyForm, key: e.target.value })}
                        placeholder="pk_live_xxxxxxxxxxxx"
                      />
                    </div>
                    <div className="form-group">
                      <label>Описание (опционально)</label>
                      <input
                        type="text"
                        value={newKeyForm.description}
                        onChange={e => setNewKeyForm({ ...newKeyForm, description: e.target.value })}
                        placeholder="Для чего используется этот ключ"
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setShowAddKey(false)}>Отмена</button>
                    <button className="btn btn-primary" onClick={handleAddApiKey}>Добавить</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'env' && (
          <div className="env-section">
            <div className="section-header">
              <div>
                <h2>Переменные окружения</h2>
                <p>Конфигурация через переменные окружения для production</p>
              </div>
            </div>

            <div className="env-list">
              <div className="env-item">
                <div className="env-info">
                  <code className="env-var">DATABASE_URL</code>
                  <p>Строка подключения к базе данных в формате URL</p>
                </div>
                <span className="env-status required">Обязательно</span>
              </div>
              <div className="env-item">
                <div className="env-info">
                  <code className="env-var">DATABASE_SSL</code>
                  <p>Включить SSL для подключения к БД</p>
                </div>
                <span className="env-status optional">Опционально</span>
              </div>
              <div className="env-item">
                <div className="env-info">
                  <code className="env-var">API_KEY</code>
                  <p>API ключ для внешних интеграций</p>
                </div>
                <span className="env-status optional">Опционально</span>
              </div>
              <div className="env-item">
                <div className="env-info">
                  <code className="env-var">NODE_ENV</code>
                  <p>Окружение: development, production, test</p>
                </div>
                <span className="env-status">По умолчанию: development</span>
              </div>
            </div>

            <div className="env-example">
              <h3>Пример .env файла</h3>
              <pre>{`# Database Connection
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
DATABASE_SSL=true

# API Keys
API_KEY=pk_live_xxxxxxxxxxxx

# Environment
NODE_ENV=development`}</pre>
              <button className="btn btn-secondary copy-env-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Копировать
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}