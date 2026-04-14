import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styles from './TableEdit.module.css'

const API = '/api'

export default function TableEdit() {
  const { tableName, id } = useParams()
  const navigate = useNavigate()
  const [row, setRow] = useState(null)
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [tableName, id])

  async function loadData() {
    try {
      setLoading(true)
      const [rowRes, colsRes] = await Promise.all([
        fetch(`${API}/data/${tableName}/${id}`),
        fetch(`${API}/tables/${tableName}/columns`)
      ])
      
      if (!rowRes.ok) throw new Error('Запись не найдена')
      
      const rowData = await rowRes.json()
      const colsData = await colsRes.json()
      
      setRow(rowData)
      setColumns(colsData.columns || [])
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
      const res = await fetch(`${API}/data/${tableName}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row)
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Ошибка сохранения')
      }
      
      navigate(`/table/${tableName}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleChange(column, value) {
    setRow({ ...row, [column]: value })
  }

  if (loading) return <div className={styles.loading}>Загрузка...</div>
  if (error && !row) return <div className={styles.error}>{error}</div>

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(`/table/${tableName}`)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Назад
        </button>
        <h1>Редактирование: {tableName}</h1>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <form className={styles.form} onSubmit={handleSubmit}>
        {columns.map(col => (
          <div key={col.column_name} className={styles.field}>
            <label>
              {col.column_name}
              {col.is_primary_key && <span className={styles.pk}>PK</span>}
              <span className={styles.type}>{col.data_type}</span>
            </label>
            <input
              type={col.data_type.includes('int') ? 'number' : 'text'}
              value={row?.[col.column_name] ?? ''}
              onChange={e => handleChange(col.column_name, e.target.value)}
              disabled={col.is_primary_key}
            />
          </div>
        ))}
        
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={() => navigate(`/table/${tableName}`)}>
            Отмена
          </button>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  )
}
