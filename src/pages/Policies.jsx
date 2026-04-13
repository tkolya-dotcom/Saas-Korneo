import { useEffect, useMemo, useState } from 'react'

const API_BASE = ''

const COMMAND_OPTIONS = [
  { value: 'SELECT', label: 'SELECT / Чтение', purpose: 'Разрешает просматривать строки таблицы.' },
  { value: 'INSERT', label: 'INSERT / Вставка', purpose: 'Разрешает добавлять новые строки в таблицу.' },
  { value: 'UPDATE', label: 'UPDATE / Обновление', purpose: 'Разрешает изменять существующие строки.' },
  { value: 'DELETE', label: 'DELETE / Удаление', purpose: 'Разрешает удалять строки.' },
  { value: 'ALL', label: 'ALL / Полный доступ', purpose: 'Одна политика сразу на все операции. Использовать осторожно.' },
]

function buildPolicySQL(tableName, policy) {
  const name = policy.policyname?.trim() || 'policy_name'
  const cmd = policy.cmd || 'SELECT'
  const usingExpr = (policy.qual || '').trim()
  const checkExpr = (policy.with_check || '').trim()

  if (cmd === 'SELECT') {
    return `CREATE POLICY "${name}"
ON "${tableName}"
FOR SELECT
USING (${usingExpr || 'true'});`
  }

  if (cmd === 'INSERT') {
    return `CREATE POLICY "${name}"
ON "${tableName}"
FOR INSERT
WITH CHECK (${checkExpr || 'true'});`
  }

  if (cmd === 'DELETE') {
    return `CREATE POLICY "${name}"
ON "${tableName}"
FOR DELETE
USING (${usingExpr || 'true'});`
  }

  return `CREATE POLICY "${name}"
ON "${tableName}"
FOR ${cmd}
USING (${usingExpr || 'true'})
WITH CHECK (${checkExpr || 'true'});`
}

function getCommandMeta(cmd) {
  return COMMAND_OPTIONS.find(x => x.value === cmd) || COMMAND_OPTIONS[0]
}

function getRiskAnalysis(policy) {
  const cmd = policy.cmd || 'SELECT'
  const usingExpr = (policy.qual || '').trim().toLowerCase()
  const checkExpr = (policy.with_check || '').trim().toLowerCase()

  if (cmd === 'ALL') {
    return {
      level: 'high',
      title: 'Высокий риск',
      text: 'Политика ALL охватывает сразу все операции. Подходит только если вы точно понимаете последствия для чтения, вставки, изменения и удаления.',
    }
  }

  if ((cmd === 'SELECT' || cmd === 'DELETE' || cmd === 'UPDATE') && (!usingExpr || usingExpr === 'true')) {
    return {
      level: 'high',
      title: 'Опасно',
      text: 'Условие USING пустое или равно true. Это может открыть доступ ко всем строкам таблицы.',
    }
  }

  if ((cmd === 'INSERT' || cmd === 'UPDATE') && (!checkExpr || checkExpr === 'true')) {
    return {
      level: 'medium',
      title: 'Нужна проверка',
      text: 'WITH CHECK пустой или слишком широкий. Пользователь сможет записывать данные без явного ограничения.',
    }
  }

  if (usingExpr.includes('auth.uid()') || checkExpr.includes('auth.uid()') || usingExpr.includes('user_id') || checkExpr.includes('user_id')) {
    return {
      level: 'low',
      title: 'Обычно безопасно',
      text: 'Политика ограничивает доступ по пользователю или контексту сессии. Это типичный и безопасный паттерн для RLS.',
    }
  }

  return {
    level: 'medium',
    title: 'Проверь вручную',
    text: 'Политика выглядит рабочей, но её безопасность зависит от бизнес-логики и структуры таблицы.',
  }
}

function getPolicyGuidance(cmd) {
  const map = {
    SELECT: 'Используй для ограничения чтения строк, например: пользователь видит только свои записи.',
    INSERT: 'Используй для контроля, какие строки пользователь может создавать.',
    UPDATE: 'Используй, когда пользователь может менять только свои строки или строки своего tenant.',
    DELETE: 'Используй, когда удаление должно быть строго ограничено владельцем или ролью.',
    ALL: 'Используй только для компактной записи, если одно и то же правило осознанно подходит для всех операций.',
  }
  return map[cmd] || ''
}

function diffLines(prevText, nextText) {
  const a = (prevText || '').split('\n')
  const b = (nextText || '').split('\n')
  const max = Math.max(a.length, b.length)
  const out = []

  for (let i = 0; i < max; i++) {
    const prev = a[i] ?? ''
    const next = b[i] ?? ''

    if (!prev && next) {
      out.push({ type: 'added', text: next })
    } else if (prev && !next) {
      out.push({ type: 'removed', text: prev })
    } else if (prev !== next) {
      out.push({ type: 'changed', text: next, prevText: prev })
    } else {
      out.push({ type: 'same', text: next })
    }
  }

  return out
}

export default function Policies() {
  const [tables, setTables] = useState([])
  const [policies, setPolicies] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingPolicies, setLoadingPolicies] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editPolicy, setEditPolicy] = useState(null)
  const [prevSQL, setPrevSQL] = useState('')
  const [form, setForm] = useState({
    policyname: '',
    cmd: 'SELECT',
    qual: '',
    with_check: '',
  })

  useEffect(() => {
    loadTables()
  }, [])

  async function loadTables() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_BASE}/api/policies`)
      if (!res.ok) throw new Error('Не удалось загрузить список таблиц')
      const data = await res.json()
      setTables(data)
    } catch (err) {
      setError(err.message || 'Ошибка загрузки таблиц')
    } finally {
      setLoading(false)
    }
  }

  async function loadPolicies(tableName) {
    try {
      setSelectedTable(tableName)
      setLoadingPolicies(true)
      setError(null)
      const res = await fetch(`${API_BASE}/api/policies/${encodeURIComponent(tableName)}`)
      if (!res.ok) throw new Error('Не удалось загрузить политики таблицы')
      const data = await res.json()
      setPolicies(data)
    } catch (err) {
      setError(err.message || 'Ошибка загрузки политик')
    } finally {
      setLoadingPolicies(false)
    }
  }

  async function toggleRLS(tableName, enabled) {
    try {
      setSaving(true)
      setError(null)
      const res = await fetch(`${API_BASE}/api/policies/${encodeURIComponent(tableName)}/rls`, {
        method: enabled ? 'POST' : 'DELETE',
      })
      if (!res.ok) throw new Error('Не удалось изменить состояние RLS')
      await loadTables()
      if (selectedTable === tableName) await loadPolicies(tableName)
    } catch (err) {
      setError(err.message || 'Ошибка переключения RLS')
    } finally {
      setSaving(false)
    }
  }

  async function createPolicy() {
    try {
      setSaving(true)
      setError(null)
      const res = await fetch(`${API_BASE}/api/policies/${encodeURIComponent(selectedTable)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Не удалось создать политику')
      await loadPolicies(selectedTable)
      await loadTables()
      closeModal()
    } catch (err) {
      setError(err.message || 'Ошибка создания политики')
    } finally {
      setSaving(false)
    }
  }

  async function updatePolicy() {
    try {
      setSaving(true)
      setError(null)
      const res = await fetch(
        `${API_BASE}/api/policies/${encodeURIComponent(selectedTable)}/${encodeURIComponent(editPolicy.policyname)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      )
      if (!res.ok) throw new Error('Не удалось обновить политику')
      await loadPolicies(selectedTable)
      closeModal()
    } catch (err) {
      setError(err.message || 'Ошибка обновления политики')
    } finally {
      setSaving(false)
    }
  }

  async function deletePolicy(policyname) {
    if (!window.confirm(`Удалить политику "${policyname}"?`)) return

    try {
      setSaving(true)
      setError(null)
      const res = await fetch(
        `${API_BASE}/api/policies/${encodeURIComponent(selectedTable)}/${encodeURIComponent(policyname)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error('Не удалось удалить политику')
      await loadPolicies(selectedTable)
      await loadTables()
    } catch (err) {
      setError(err.message || 'Ошибка удаления политики')
    } finally {
      setSaving(false)
    }
  }

  function openCreateModal() {
    setEditPolicy(null)
    setForm({
      policyname: '',
      cmd: 'SELECT',
      qual: '',
      with_check: '',
    })
    setPrevSQL('')
    setShowModal(true)
  }

  function openEditModal(policy) {
    setEditPolicy(policy)
    const nextForm = {
      policyname: policy.policyname || '',
      cmd: policy.cmd || 'SELECT',
      qual: policy.qual || '',
      with_check: policy.with_check || '',
    }
    setForm(nextForm)
    setPrevSQL(buildPolicySQL(selectedTable, nextForm))
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditPolicy(null)
    setPrevSQL('')
    setForm({
      policyname: '',
      cmd: 'SELECT',
      qual: '',
      with_check: '',
    })
  }

  const sqlPreview = useMemo(() => {
    return buildPolicySQL(selectedTable || 'table_name', form)
  }, [selectedTable, form])

  const sqlDiff = useMemo(() => {
    return diffLines(prevSQL, sqlPreview)
  }, [prevSQL, sqlPreview])

  const commandMeta = getCommandMeta(form.cmd)
  const risk = getRiskAnalysis(form)

  const s = {
    page: { padding: '24px' },
    intro: { marginBottom: '24px' },
    title: { fontSize: '24px', fontWeight: 700, marginBottom: '8px' },
    subtitle: { color: 'var(--text-secondary)', maxWidth: '760px' },
    error: {
      marginBottom: '16px',
      color: '#f87171',
      background: 'rgba(248,113,113,0.1)',
      border: '1px solid rgba(248,113,113,0.25)',
      padding: '12px 14px',
      borderRadius: '12px',
    },
    layout: {
      display: 'grid',
      gridTemplateColumns: '320px 1fr',
      gap: '24px',
      alignItems: 'start',
    },
    card: {
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    },
    sidebar: {
      padding: '16px',
      position: 'sticky',
      top: '24px',
    },
    panel: {
      padding: '20px',
    },
    sectionTitle: { fontSize: '16px', fontWeight: 700, marginBottom: '12px' },
    tableItem: {
      padding: '12px',
      borderRadius: '12px',
      border: '1px solid transparent',
      background: 'var(--bg)',
      marginBottom: '10px',
      cursor: 'pointer',
    },
    tableItemSelected: {
      border: '1px solid rgba(59,130,246,0.35)',
      background: 'rgba(59,130,246,0.12)',
    },
    tableHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '10px',
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 700,
      whiteSpace: 'nowrap',
    },
    actionButton: {
      padding: '8px 12px',
      borderRadius: '10px',
      border: '1px solid var(--border)',
      background: 'var(--surface)',
      cursor: 'pointer',
      fontWeight: 600,
    },
    primaryButton: {
      padding: '10px 14px',
      borderRadius: '10px',
      border: '1px solid rgba(59,130,246,0.25)',
      background: '#2563eb',
      color: 'white',
      cursor: 'pointer',
      fontWeight: 700,
    },
    panelHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '16px',
    },
    emptyState: {
      color: 'var(--text-secondary)',
      padding: '24px',
      borderRadius: '12px',
      border: '1px dashed var(--border)',
      background: 'var(--bg)',
    },
    policyCard: {
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '16px',
      marginBottom: '14px',
    },
    policyHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '12px',
      marginBottom: '12px',
    },
    policyName: { fontSize: '16px', fontWeight: 700, marginBottom: '4px' },
    policyMeta: { color: 'var(--text-secondary)', fontSize: '13px' },
    codeLabel: { fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 700 },
    codeBox: {
      background: '#0f172a',
      color: '#e2e8f0',
      borderRadius: '12px',
      padding: '12px',
      fontSize: '12px',
      lineHeight: 1.5,
      whiteSpace: 'pre-wrap',
      overflowX: 'auto',
      marginBottom: '12px',
    },
    helperBox: {
      padding: '12px',
      borderRadius: '12px',
      marginBottom: '12px',
      border: '1px solid var(--border)',
      background: 'rgba(148,163,184,0.08)',
    },
    overlay: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,23,42,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 1000,
    },
    modal: {
      width: 'min(1100px, 96vw)',
      maxHeight: '92vh',
      overflow: 'auto',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '20px',
      padding: '24px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
    },
    modalGrid: {
      display: 'grid',
      gridTemplateColumns: '1.1fr 1fr',
      gap: '20px',
    },
    field: { marginBottom: '14px' },
    label: { display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' },
    input: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '10px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--text)',
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '10px',
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      color: 'var(--text)',
      minHeight: '96px',
      resize: 'vertical',
      fontFamily: 'inherit',
    },
    sideNote: {
      padding: '12px',
      borderRadius: '12px',
      background: 'rgba(59,130,246,0.08)',
      border: '1px solid rgba(59,130,246,0.18)',
      marginBottom: '12px',
    },
    riskLow: {
      background: 'rgba(34,197,94,0.12)',
      border: '1px solid rgba(34,197,94,0.25)',
      color: '#166534',
    },
    riskMedium: {
      background: 'rgba(245,158,11,0.12)',
      border: '1px solid rgba(245,158,11,0.25)',
      color: '#92400e',
    },
    riskHigh: {
      background: 'rgba(239,68,68,0.12)',
      border: '1px solid rgba(239,68,68,0.25)',
      color: '#991b1b',
    },
    diffBox: {
      background: '#0b1120',
      color: '#e2e8f0',
      borderRadius: '12px',
      padding: '12px',
      fontSize: '12px',
      lineHeight: 1.6,
      whiteSpace: 'pre-wrap',
      overflowX: 'auto',
    },
    diffLine: {
      display: 'block',
      padding: '2px 8px',
      borderRadius: '6px',
      marginBottom: '2px',
    },
    modalActions: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px',
      marginTop: '18px',
    },
  }

  if (loading) {
    return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Загрузка политик...</div>
  }

  return (
    <div style={s.page}>
      <div style={s.intro}>
        <h1 style={s.title}>Политики RLS</h1>
        <p style={s.subtitle}>
          Управление Row Level Security для таблиц базы данных. Названия таблиц и политик остаются без перевода,
          а все пояснения и действия приведены на русском языке.
        </p>
      </div>

      {error && <div style={s.error}>{error}</div>}

      <div style={s.layout}>
        <div style={{ ...s.card, ...s.sidebar }}>
          <div style={s.sectionTitle}>Таблицы</div>

          {tables.length === 0 && <div style={s.emptyState}>Таблицы не найдены</div>}

          {tables.map((table) => {
            const enabled = !!table.rls_enabled

            return (
              <div
                key={table.table_name}
                style={{
                  ...s.tableItem,
                  ...(selectedTable === table.table_name ? s.tableItemSelected : {}),
                }}
                onClick={() => loadPolicies(table.table_name)}
              >
                <div style={s.tableHeader}>
                  <strong>{table.table_name}</strong>
                  <span
                    style={{
                      ...s.badge,
                      ...(enabled
                        ? { background: 'rgba(34,197,94,0.15)', color: '#166534' }
                        : { background: 'rgba(148,163,184,0.16)', color: '#475569' }),
                    }}
                  >
                    {enabled ? 'RLS включён' : 'RLS выключен'}
                  </span>
                </div>

                <button
                  style={s.actionButton}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleRLS(table.table_name, !enabled)
                  }}
                  disabled={saving}
                >
                  {enabled ? 'Выключить RLS' : 'Включить RLS'}
                </button>
              </div>
            )
          })}
        </div>

        <div style={{ ...s.card, ...s.panel }}>
          {selectedTable ? (
            <>
              <div style={s.panelHeader}>
                <div>
                  <div style={s.sectionTitle}>Политики для таблицы: {selectedTable}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    Выбери таблицу слева, чтобы просматривать и редактировать её правила доступа.
                  </div>
                </div>

                <button style={s.primaryButton} onClick={openCreateModal}>
                  + Новая политика
                </button>
              </div>

              {loadingPolicies ? (
                <div style={s.emptyState}>Загрузка политик таблицы...</div>
              ) : policies.length === 0 ? (
                <div style={s.emptyState}>
                  Для этой таблицы политики не заданы. Обычно начинают с SELECT-политики, чтобы ограничить видимость строк.
                </div>
              ) : (
                policies.map((policy) => {
                  const riskInfo = getRiskAnalysis(policy)

                  return (
                    <div key={policy.policyname} style={s.policyCard}>
                      <div style={s.policyHeader}>
                        <div>
                          <div style={s.policyName}>{policy.policyname}</div>
                          <div style={s.policyMeta}>
                            {getCommandMeta(policy.cmd).label}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button style={s.actionButton} onClick={() => openEditModal(policy)}>
                            Изменить
                          </button>
                          <button style={s.actionButton} onClick={() => deletePolicy(policy.policyname)}>
                            Удалить
                          </button>
                        </div>
                      </div>

                      <div
                        style={{
                          ...s.helperBox,
                          ...(riskInfo.level === 'low'
                            ? s.riskLow
                            : riskInfo.level === 'high'
                            ? s.riskHigh
                            : s.riskMedium),
                        }}
                      >
                        <strong>{riskInfo.title}:</strong> {riskInfo.text}
                      </div>

                      <div style={s.helperBox}>
                        <strong>Назначение:</strong> {getPolicyGuidance(policy.cmd)}
                      </div>

                      {policy.qual && (
                        <>
                          <div style={s.codeLabel}>USING / Условие доступа</div>
                          <div style={s.codeBox}>{policy.qual}</div>
                        </>
                      )}

                      {policy.with_check && (
                        <>
                          <div style={s.codeLabel}>WITH CHECK / Проверка записи</div>
                          <div style={s.codeBox}>{policy.with_check}</div>
                        </>
                      )}

                      <div style={s.codeLabel}>SQL политики</div>
                      <div style={s.codeBox}>
                        {buildPolicySQL(selectedTable, {
                          policyname: policy.policyname,
                          cmd: policy.cmd,
                          qual: policy.qual,
                          with_check: policy.with_check,
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </>
          ) : (
            <div style={s.emptyState}>Выбери таблицу слева, чтобы увидеть политики и состояние RLS.</div>
          )}
        </div>
      </div>

      {showModal && (
        <div style={s.overlay} onClick={closeModal}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ ...s.panelHeader, marginBottom: '20px' }}>
              <div>
                <div style={s.sectionTitle}>
                  {editPolicy ? 'Редактирование политики' : 'Создание новой политики'}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Таблица: <strong>{selectedTable}</strong>
                </div>
              </div>
            </div>

            <div style={s.modalGrid}>
              <div>
                <div style={s.field}>
                  <label style={s.label}>Название политики</label>
                  <input
                    style={s.input}
                    value={form.policyname}
                    onChange={(e) => setForm({ ...form, policyname: e.target.value })}
                    placeholder="Например: users_select_own_rows"
                    disabled={!!editPolicy}
                  />
                </div>

                <div style={s.field}>
                  <label style={s.label}>Тип политики</label>
                  <select
                    style={s.input}
                    value={form.cmd}
                    onChange={(e) => setForm({ ...form, cmd: e.target.value })}
                  >
                    {COMMAND_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={s.sideNote}>
                  <strong>Для чего нужна эта политика:</strong>
                  <div style={{ marginTop: '6px' }}>{commandMeta.purpose}</div>
                  <div style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>{getPolicyGuidance(form.cmd)}</div>
                </div>

                <div
                  style={{
                    ...s.sideNote,
                    ...(risk.level === 'low' ? s.riskLow : risk.level === 'high' ? s.riskHigh : s.riskMedium),
                  }}
                >
                  <strong>{risk.title}:</strong> {risk.text}
                </div>

                <div style={s.field}>
                  <label style={s.label}>USING / Условие доступа</label>
                  <textarea
                    style={s.textarea}
                    value={form.qual}
                    onChange={(e) => setForm({ ...form, qual: e.target.value })}
                    placeholder="Например: auth.uid() = user_id"
                  />
                </div>

                <div style={s.field}>
                  <label style={s.label}>WITH CHECK / Проверка записи</label>
                  <textarea
                    style={s.textarea}
                    value={form.with_check}
                    onChange={(e) => setForm({ ...form, with_check: e.target.value })}
                    placeholder="Например: auth.uid() = user_id"
                  />
                </div>
              </div>

              <div>
                <div style={s.codeLabel}>Inline SQL preview (live)</div>
                <div style={s.codeBox}>{sqlPreview}</div>

                <div style={{ ...s.codeLabel, marginTop: '16px' }}>Изменения по сравнению с предыдущей версией</div>
                <div style={s.diffBox}>
                  {sqlDiff.map((line, idx) => {
                    let bg = 'transparent'
                    let prefix = ' '
                    if (line.type === 'added') {
                      bg = 'rgba(34,197,94,0.18)'
                      prefix = '+'
                    } else if (line.type === 'changed') {
                      bg = 'rgba(245,158,11,0.18)'
                      prefix = '~'
                    } else if (line.type === 'removed') {
                      bg = 'rgba(148,163,184,0.16)'
                      prefix = '-'
                    }

                    return (
                      <span key={idx} style={{ ...s.diffLine, background: bg }}>
                        {prefix} {line.text || ' '}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>

            <div style={s.modalActions}>
              <button style={s.actionButton} onClick={closeModal}>
                Отмена
              </button>
              <button
                style={s.primaryButton}
                onClick={editPolicy ? updatePolicy : createPolicy}
                disabled={saving || !selectedTable || !form.policyname.trim()}
              >
                {saving ? 'Сохранение...' : editPolicy ? 'Сохранить изменения' : 'Создать политику'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
