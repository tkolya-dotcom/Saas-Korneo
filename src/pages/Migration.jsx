import { useState } from 'react'

const API_BASE = ''

export default function Migration() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState(null)

  async function exportSchema() {
    setLoading(true)
    try {
      const res = await fetch(API_BASE + '/api/migration/generate', { method: 'POST' })
      const data = await res.json()
      const blob = new Blob([data.script], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'schema-' + new Date().toISOString().split('T')[0] + '.sql'
      a.click()
      URL.revokeObjectURL(url)
      setStatus('Схема экспортирована!')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function exportAllData() {
    setLoading(true)
    try {
      const res = await fetch(API_BASE + '/api/migration/export-all')
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'backup-' + new Date().toISOString().split('T')[0] + '.json'
      a.click()
      URL.revokeObjectURL(url)
      setStatus('Экспортировано таблиц: ' + data.length)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Миграция</h1>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Инструменты экспорта</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>Экспортируйте схему и данные для миграции</p>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px', flex: '1', minWidth: '200px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Экспорт схемы</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>Генерация CREATE TABLE для всех таблиц</p>
            <button onClick={exportSchema} disabled={loading}
              style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
              Скачать SQL
            </button>
          </div>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px', flex: '1', minWidth: '200px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Экспорт данных</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>Экспорт всех данных таблиц в JSON</p>
            <button onClick={exportAllData} disabled={loading}
              style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
              Скачать JSON
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Импорт данных</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>Импорт из SQL или JSON дампа</p>
        <div style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius)', padding: '32px', textAlign: 'center' }}>
          <input type="file" accept=".sql,.json" id="import-file" style={{ display: 'none' }} />
          <label htmlFor="import-file" style={{ cursor: 'pointer', color: 'var(--accent)', fontWeight: '500' }}>Выбрать файл</label>
          <span style={{ color: 'var(--text-secondary)' }}> или перетащите сюда</span>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>Поддерживаются .sql и .json файлы</p>
        </div>
      </div>

      {error && <div style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '12px', borderRadius: 'var(--radius)' }}>{error}</div>}
      {status && <div style={{ color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '12px', borderRadius: 'var(--radius)' }}>{status}</div>}
    </div>
  )
}
