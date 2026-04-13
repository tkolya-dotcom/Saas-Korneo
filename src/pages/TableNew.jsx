import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchTableData, insertRow } from '../lib/supabase'
import styles from './TableEdit.module.css'

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
      const result = await fetchTableData(tableName, { page: 0, pageSize: 1 })
      if (result.data?.length > 0) {
        const cols = Object.keys(result.data[0])
        setColumns(cols.filter(c => c !== 'id'))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      setSaving(true)
      setError(null)
      await insertRow(tableName, formData)
      navigate(`/table/${tableName}`)
    } catch (err) {
      setError(err.message || 'Failed to create row')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.title}>
        <Link to={`/table/${tableName}`} className={styles.backBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        New Row
      </h2>

      {error && <div className={styles.error}>{error}</div>}

      {columns.map((field) => (
        <div key={field} className={styles.field}>
          <label className={styles.label}>{field}</label>
          <input
            type="text"
            className={styles.input}
            value={formData[field] ?? ''}
            onChange={(e) => handleChange(field, e.target.value)}
            placeholder={`Enter ${field}...`}
          />
        </div>
      ))}

      {columns.length === 0 && (
        <div className={styles.field}>
          <label className={styles.label}>Data (JSON)</label>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={JSON.stringify(formData, null, 2)}
            onChange={(e) => {
              try {
                setFormData(JSON.parse(e.target.value))
              } catch {}
            }}
            placeholder='{"key": "value"}'
          />
        </div>
      )}

      <div className={styles.actions}>
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>
          {saving ? 'Creating...' : 'Create Row'}
        </button>
        <Link to={`/table/${tableName}`} className={`${styles.btn} ${styles.btnSecondary}`}>
          Cancel
        </Link>
      </div>
    </form>
  )
}
