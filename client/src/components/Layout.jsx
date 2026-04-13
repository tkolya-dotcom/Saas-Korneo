import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { checkConnection } from '../lib/supabase'
import './Layout.css'

const navItems = [
  { path: '/tables', label: 'Таблицы', icon: 'table' },
  { path: '/schema', label: 'Схема БД', icon: 'schema' },
  { path: '/schema/editor', label: 'Редактор связей', icon: 'link' },
  { path: '/sql', label: 'SQL Запросы', icon: 'sql' },
  { path: '/connections', label: 'Подключения', icon: 'key' },
  { path: '/backup', label: 'Резервная копия', icon: 'backup' },
  { path: '/migration', label: 'Миграция', icon: 'migration' },
  { path: '/policies', label: 'Политики RLS', icon: 'shield' },
]

const icons = {
  table: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  ),
  schema: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <circle cx="4" cy="6" r="2" />
      <circle cx="20" cy="6" r="2" />
      <circle cx="4" cy="18" r="2" />
      <circle cx="20" cy="18" r="2" />
      <path d="M6 7.5L9 10.5M15 10.5L18 7.5M6 16.5L9 13.5M15 13.5L18 16.5" />
    </svg>
  ),
  link: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  sql: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16M4 12h16M4 17h8" />
    </svg>
  ),
  key: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  ),
  backup: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  ),
  migration: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 3l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 21l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  ),
  shield: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  db: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
}

function getPageTitle(path) {
  const item = navItems.find(n => path.startsWith(n.path))
  return item ? item.label : 'DB Admin'
}

export default function Layout() {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    checkConnection()
      .then(setConnected)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">{icons.db}</div>
            <div className="logo-text">
              <span className="logo-title">DB Admin</span>
              <span className="logo-subtitle">PostgreSQL Manager</span>
            </div>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-section">
            <span className="nav-section-title">Навигация</span>
            {navItems.slice(0, 4).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{icons[item.icon]}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="nav-section">
            <span className="nav-section-title">Инструменты</span>
            {navItems.slice(4).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{icons[item.icon]}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="connection-status">
            <span className={`status-dot ${loading ? 'loading' : connected ? 'connected' : 'disconnected'}`} />
            <span className="status-text">
              {loading ? 'Проверка...' : connected ? 'Подключено' : 'Отключено'}
            </span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="header">
          <h1 className="page-title">{getPageTitle(location.pathname)}</h1>
          <div className="header-actions">
            <div className="db-badge">PostgreSQL</div>
          </div>
        </header>

        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
