const API = '/api'

export async function fetchTables() {
  const res = await fetch(`${API}/tables`)
  const rows = await res.json()
  return rows.map(r => ({ tablename: r.table_name, table_type: r.table_type }))
}

export function saveCustomTables() {}

export async function fetchTableData(tableName, { page = 0, pageSize = 50, search = '' } = {}) {
  const res = await fetch(`${API}/data/${tableName}?page=${page}&limit=${pageSize}&search=${encodeURIComponent(search)}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return { data: json.data, count: json.total }
}

export async function insertRow(tableName, row) {
  const res = await fetch(`${API}/data/${tableName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(row)
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json
}

export async function updateRow(tableName, id, row) {
  const res = await fetch(`${API}/data/${tableName}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(row)
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json
}

export async function deleteRow(tableName, id) {
  const res = await fetch(`${API}/data/${tableName}/${id}`, { method: 'DELETE' })
  const json = await res.json()
  if (json.error) throw new Error(json.error)
}

export async function getRowById(tableName, id) {
  const res = await fetch(`${API}/data/${tableName}/${id}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json
}

export async function checkConnection() {
  try {
    const res = await fetch(`${API}/health`)
    const json = await res.json()
    return json.status === 'ok'
  } catch {
    return false
  }
}
