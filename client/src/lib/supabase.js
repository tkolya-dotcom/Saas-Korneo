// API configuration
export const API_BASE = '/api'

// Check database connection
export async function checkConnection() {
  try {
    const res = await fetch(`${API_BASE}/health`)
    const data = await res.json()
    return data.status === 'ok'
  } catch {
    return false
  }
}

// Fetch table data with pagination
export async function fetchTableData(tableName, page = 0, limit = 50) {
  const res = await fetch(`${API_BASE}/data/${tableName}?page=${page}&limit=${limit}`)
  return res.json()
}

// Delete row
export async function deleteRow(tableName, id) {
  const res = await fetch(`${API_BASE}/data/${tableName}/${id}`, {
    method: 'DELETE'
  })
  return res.ok
}

// Fetch single row
export async function fetchRow(tableName, id) {
  const res = await fetch(`${API_BASE}/data/${tableName}/${id}`)
  return res.json()
}

// Update row
export async function updateRow(tableName, id, data) {
  const res = await fetch(`${API_BASE}/data/${tableName}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return res.json()
}

// Create row
export async function createRow(tableName, data) {
  const res = await fetch(`${API_BASE}/data/${tableName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return res.json()
}
