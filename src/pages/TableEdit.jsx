import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getRowById, updateRow } from '../lib/supabase'
import styles from './TableEdit.module.css'

export default function TableEdit() {
  const { tableName, id } = useParams()
  const navigate = useNavigate()
  const [row, setRow] = useState(null)
  const [formData, setFormData] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadRow()
  }, [tableName, id])

  async function loadRow() {
    try {
      setLoading(true)
      setError(null)
      const data = await getRowById(tableName, id)
      setRow(data)
      setFormData(data)
    } catch (err) {
      setError(err.message || 'Failed to load row')
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
      await updateRow(tableName, id, formData)
      navigate(`/table/${tableName}`)
    } catch (err) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  if (error && !row) {
    return <div className={styles.error}>{error}</div>
  }

  if (!row) {
    return <div className={styles.notFound}>Row not found</div>
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.title}>
        <Link to={`/table/${tableName}`} className={styles.backBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        Edit Row #{id}
      </h2>

      {error && <div className={styles.error}>{error}</div>}

      {Object.keys(formData).map((field) => (
        <div key={field} className={styles.field}>
          <label className={styles.label}>{field}</label>
          <input
            type="text"
            className={styles.input}
            value={formData[field] ?? ''}
            onChange={(e) => handleChange(field, e.target.value)}
            disabled={field === 'id'}
          />
        </div>
      ))}

      <div className={styles.actions}>
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <Link to={`/table/${tableName}`} className={`${styles.btn} ${styles.btnSecondary}`}>
          Cancel
        </Link>
      </div>
    </form>
  )
}
