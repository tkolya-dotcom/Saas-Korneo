import { useState } from 'react'
import './ApiView.css'

export default function ApiView() {
  const [copied, setCopied] = useState(null)

  const endpoints = [
    { method: 'GET', path: '/api/tables', desc: 'Список всех таблиц в БД' },
    { method: 'GET', path: '/api/relationships', desc: 'Все внешние связи (Foreign Keys)' },
    { method: 'GET', path: '/api/schema', desc: 'Полная структура БД (таблицы, колонки, FK)' },
    { method: 'GET', path: '/api/tables/:name/data', desc: 'Данные конкретной таблицы' },
    { method: 'POST', path: '/api/sql', desc: 'Выполнение произвольного SQL запроса' }
  ]

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(window.location.origin + text)
    setCopied(text)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="api-view">
      <div className="api-header">
        <h2>API & Подключение</h2>
        <p>Используйте эти эндпоинты для интеграции с вашими сервисами</p>
      </div>

      <div className="connection-info">
        <h3>Параметры подключения</h3>
        <div className="info-card">
          <div className="info-row">
            <span className="label">Base URL:</span>
            <code className="value">{window.location.origin}</code>
          </div>
          <div className="info-row">
            <span className="label">Status:</span>
            <span className="status-online">Online</span>
          </div>
        </div>
      </div>

      <div className="endpoints-list">
        <h3>Доступные эндпоинты</h3>
        {endpoints.map(ep => (
          <div key={ep.path} className="endpoint-item" onClick={() => copyToClipboard(ep.path)}>
            <div className="ep-main">
              <span className={`method ${ep.method.toLowerCase()}`}>{ep.method}</span>
              <code className="path">{ep.path}</code>
              {copied === ep.path && <span className="copied-label">Скопировано!</span>}
            </div>
            <p className="desc">{ep.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
