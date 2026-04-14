import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styles from './TableView.module.css'

const API = '/api'

export default function TableNew() {
  const { tableName } = useParams()
  const navigate = useNavigate()
  const [columns, setColumns] = useState([])
  const [formData, setFormData] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadColumns()
  }, [tableName])

  async function loadColumns() {
    try {
      setLoading(true)
      const res = await fetch(`${API}/tables/${tableName}/columns`)
      const data = await res.json()
      setColumns(data.columns || [])
      
      const initial = {}
      data.columns?.forEach(col => {
        if (!col.is_primary_key) {
          initial[col.column_name] = ''
        }
      })
      setFormData(initial)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    
    try {
      const res = await fetch(`${API}/data/${tableName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Ошибка создания')
      }
      
      navigate(`/table/${tableName}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleChange(column, value) {
    setFormData({ ...formData, [column]: value })
  }

  if (loading) return <div className={styles.loading}>Загрузка...</div>

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(`/table/${tableName}`)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Назад
        </button>
        <h1>Новая запись: {tableName}</h1>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <form className={styles.form} onSubmit={handleSubmit}>
        {columns.filter(col => !col.is_primary_key).map(col => (
          <div key={col.column_name} className={styles.field}>
            <label>
              {col.column_name}
              <span className={styles.type}>{col.data_type}</span>
              {col.is_nullable === 'YES' && <span className={styles.nullable}>nullable</span>}
            </label>
            <input
              type={col.data_type.includes('int') ? 'number' : 'text'}
              value={formData[col.column_name] ?? ''}
              onChange={e => handleChange(col.column_name, e.target.value)}
              placeholder={col.column_default || ''}
            />
          </div>
        ))}
        
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={() => navigate(`/table/${tableName}`)}>
            Отмена
          </button>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </form>
    </div>
  )
}
