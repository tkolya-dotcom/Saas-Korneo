import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { fetchTableData, deleteRow } from '../lib/supabase'
import styles from './TableView.module.css'

export default function TableView() {
  const { tableName } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState([])
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)
  const [count, setCount] = useState(0)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const pageSize = 50

  const loadData = useCallback(async () => {
    if (!tableName) return

    try {
      setLoading(true)
      setError(null)

      const result = await fetchTableData(tableName, { page, pageSize, search })

      const rows = result.data || []

      setData(rows)
      setCount(result.count || 0)

      if (rows.length > 0) {
        setColumns(Object.keys(rows[0]))
      } else {
        setColumns([])
      }
    } catch (err) {
      setError(err.message || 'Не удалось загрузить данные')
    } finally {
      setLoading(false)
    }
  }, [tableName, page, search])

  useEffect(() => {
    loadData()
  }, [loadData])

  function handleSearch(e) {
    e.preventDefault()
    setPage(0)
    // loadData НЕ вызываем — useEffect сам сработает
  }

  async function handleDelete() {
    if (!deleteId) return

    try {
      await deleteRow(tableName, deleteId)
      setDeleteId(null)

      // если удалили последнюю запись на странице
      if (data.length === 1 && page > 0) {
        setPage(page - 1)
      } else {
        loadData()
      }
    } catch (err) {
      alert('Ошибка удаления: ' + err.message)
    }
  }

  const totalPages = Math.max(Math.ceil(count / pageSize), 1)

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <form onSubmit={handleSearch} className={styles.search}>
          <svg
            className={styles.searchIcon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>

          <input
            type="text"
            className={styles.searchInput}
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <Link
          to={`/table/${tableName}/new`}
          className={`${styles.btn} ${styles.btnPrimary}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          + Новая запись
        </Link>
      </div>

      {loading ? (
        <div className={styles.loading}>Загрузка данных...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : data.length === 0 ? (
        <div className={styles.empty}>
          <p>Данные не найдены. Добавьте первую запись!</p>
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                  <th>Действия</th>
                </tr>
              </thead>

              <tbody>
                {data.map((row) => (
                  <tr key={row.id}>
                    {columns.map((col) => (
                      <td key={col}>
                        {col === 'id' ? (
                          <span className={styles.cellId}>{row[col]}</span>
                        ) : (
                          String(row[col] ?? '')
                        )}
                      </td>
                    ))}

                    <td>
                      <div className={styles.actions}>
                        <Link
                          to={`/table/${tableName}/edit/${row.id}`}
                          className={`${styles.actionBtn} ${styles.edit}`}
                          title="Редактировать"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </Link>

                        <button
                          className={`${styles.actionBtn} ${styles.delete}`}
                          onClick={() => setDeleteId(row.id)}
                          title="Удалить"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {count > 0 && (
            <div className={styles.pagination}>
              <span className={styles.pageInfo}>
                Показано {page * pageSize + 1}–{Math.min((page + 1) * pageSize, count)} из {count}
              </span>

              <div className={styles.pageButtons}>
                <button onClick={() => setPage(0)} disabled={page === 0}>В начало</button>
                <button onClick={() => setPage(page - 1)} disabled={page === 0}>Назад</button>
                <button onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}>Вперёд</button>
                <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>В конец</button>
              </div>
            </div>
          )}
        </>
      )}

      {deleteId && (
        <div className={styles.confirmDialog}>
          <div className={styles.confirmContent}>
            <h3>Удалить запись</h3>
            <p>
              Вы уверены, что хотите удалить запись с id {deleteId}? Это действие необратимо.
            </p>

            <div className={styles.confirmActions}>
              <button onClick={() => setDeleteId(null)}>Отмена</button>
              <button onClick={handleDelete}>Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}