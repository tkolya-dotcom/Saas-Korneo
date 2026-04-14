import { useState } from 'react'
import './Migration.css'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export default function Migration() {
  const [supabaseUrl, setSupabaseUrl] = useState('https://jmxjbdnqnzkzxgsfywha.supabase.co')
  const [supabaseKey, setSupabaseKey] = useState('')
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState(null)

  async function fetchSupabaseSchema() {
    if (!supabaseKey) {
      setError('Введите Supabase API Key')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      })

      if (!res.ok) {
        throw new Error('Не удалось подключиться к Supabase')
      }

      const tablesRes = await fetch(`${supabaseUrl}/rest/v1/pg_tables?schemaname=eq.public&select=tablename`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          ' Prefer': 'params=rel'
        }
      })

      const localRes = await fetch(`${API_BASE}/api/tables`)
      const localTables = await localRes.json()
      setTables(localTables.map(t => t.table_name))
      setStatus('Подключено! Найдено ' + localTables.length + ' таблиц')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function exportSchema() {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/migration/generate`, {
        method: 'POST'
      })
      const data = await res.json()
      const blob = new Blob([data.script], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `schema-${new Date().toISOString().split('T')[0]}.sql`
      a.click()
      URL.revokeObjectURL(url)
      setStatus('Схема успешно экспортирована!')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function exportAllData() {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/migration/export-all`)
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      setStatus(`Экспортировано ${data.length} таблиц`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="migration-page">
      <div className="migration-section">
        <h2>Подключение к Supabase</h2>
        <p className="section-desc">Подключитесь к вашему Supabase проекту для получения схемы и данных</p>
        <div className="form-group">
          <label>Supabase URL</label>
          <input type="text" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} placeholder="https://xxx.supabase.co" />
        </div>
        <div className="form-group">
          <label>API Key (anon или service)</label>
          <input type="password" value={supabaseKey} onChange={(e) => setSupabaseKey(e.target.value)} placeholder="Введите API ключ..." />
        </div>
        <button onClick={fetchSupabaseSchema} disabled={loading}>
          {loading ? 'Подключение...' : 'Подключиться'}
        </button>
      </div>

      <div className="migration-section">
        <h2>Инструменты экспорта</h2>
        <p className="section-desc">Экспорт схемы и данных базы для миграции</p>
        <div className="backup-types">
          <div className="backup-card">
            <div className="backup-icon">🗂️</div>
            <h3>Экспорт схемы</h3>
            <p>Сгенерировать операторы CREATE TABLE для всех таблиц</p>
            <button onClick={exportSchema} disabled={loading}>Скачать SQL</button>
          </div>
          <div className="backup-card">
            <div className="backup-icon">📦</div>
            <h3>Экспорт данных</h3>
            <p>Экспорт всех данных таблиц в JSON для импорта</p>
            <button onClick={exportAllData} disabled={loading}>Скачать JSON</button>
          </div>
        </div>
      </div>

      <div className="migration-section">
        <h2>Импорт данных</h2>
        <p className="section-desc">Импорт данных из JSON или SQL дампа</p>
        <div className="import-area">
          <input type="file" accept=".sql,.json" id="import-file" className="file-input" />
          <label htmlFor="import-file">Выберите файл</label>
          <span>или перетащите</span>
        </div>
        <p className="section-desc">Поддерживается: .sql и .json</p>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {status && <div className="status-msg">{status}</div>}
    </div>
  )
}
