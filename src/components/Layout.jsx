import { useState, useEffect } from 'react'
import { Outlet, NavLink, useParams } from 'react-router-dom'
import { checkConnection } from '../lib/supabase'
import styles from './Layout.module.css'

export default function Layout() {
  const [connected, setConnected] = useState(false)
  const params = useParams()

  useEffect(() => {
    checkConnection().then(setConnected)
  }, [])

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <svg viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#1a1a1a" />
            <path d="M8 16L14 10L20 16L14 22Z" fill="#3b82f6" />
            <path d="M14 16L20 10L26 16L20 22Z" fill="#3b82f6" opacity="0.6" />
          </svg>
          <h1>DB Админ</h1>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navTitle}>Навигация</div>
          <ul className={styles.navList}>
            <li className={styles.navItem}>
              <NavLink to="/" end className={({ isActive }) => [styles.navLink, isActive ? styles.active : ''].join(' ')}>
                Таблицы
              </NavLink>
            </li>
            <li className={styles.navItem}>
              <NavLink to="/schema" className={({ isActive }) => [styles.navLink, isActive ? styles.active : ''].join(' ')}>
                Схема БД
              </NavLink>
            </li>
            <li className={styles.navItem}>
              <NavLink to="/sql" className={({ isActive }) => [styles.navLink, isActive ? styles.active : ''].join(' ')}>
                SQL Запросы
              </NavLink>
            </li>
            <li className={styles.navItem}>
              <NavLink to="/backup" className={({ isActive }) => [styles.navLink, isActive ? styles.active : ''].join(' ')}>
                Резервная копия
              </NavLink>
            </li>
            <li className={styles.navItem}>
              <NavLink to="/migration" className={({ isActive }) => [styles.navLink, isActive ? styles.active : ''].join(' ')}>
                Миграция
              </NavLink>
            </li>
            <li className={styles.navItem}>
              <NavLink to="/policies" className={({ isActive }) => [styles.navLink, isActive ? styles.active : ''].join(' ')}>
                Политики
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className={styles.status}>
          <div className={styles.statusBadge}>
            <span className={[styles.statusDot, connected ? styles.connected : styles.disconnected].join(' ')} />
            {connected ? 'Подключено' : 'Отключено'}
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <h2 className={styles.headerTitle}>
            {params.tableName ? 'Таблица: ' + params.tableName : 'Панель управления'}
          </h2>
        </header>

        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}

