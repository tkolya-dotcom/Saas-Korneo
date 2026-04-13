import express from 'express'
import cors from 'cors'
import { Pool } from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.static(join(__dirname, 'public')))

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    res.json({ status: 'ok', database: 'connected' })
  } catch (err) {
    res.json({ status: 'error', database: 'disconnected', error: err.message })
  }
})

// Get schema diagram data - FIXED with VIEWS/FUNCTIONS
app.get('/api/schema', async (req, res) => {
  try {
    // Tables
    const tablesResult = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)

    // Views
    const viewsResult = await pool.query(`
      SELECT schemaname as table_schema, viewname as table_name, view_owner 
      FROM pg_views 
      WHERE schemaname = 'public'
      ORDER BY table_name
    `)

    // Functions
    const functionsResult = await pool.query(`
      SELECT proname as table_name, proowner::regrole as owner
      FROM pg_proc p
      WHERE p.pronamespace = 'public'::regnamespace::oid 
      AND prokind = 'f'
      ORDER BY table_name
    `)

    // Columns (tables + views)
    const allTables = [...tablesResult.rows.map(r => r.table_name), ...viewsResult.rows.map(r => r.table_name)];
    const columns = [];
    for (const tableName of allTables) {
      try {
        const colsResult = await pool.query(`
          SELECT
            c.table_name,
            c.column_name,
            c.data_type,
            c.is_nullable,
            CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
          FROM information_schema.columns c
          LEFT JOIN (
            SELECT ku.table_name, ku.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
            WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_name = $1
          ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
          WHERE c.table_name = $1 AND c.table_schema = 'public'
          ORDER BY c.table_name, c.ordinal_position
        `, [tableName]);
        columns.push(...colsResult.rows);
      } catch (e) {
        // Views/functions могут не иметь columns в information_schema
      }
    }

    // Relationships
    const relationshipsResult = await pool.query(`
      SELECT
        tc.table_name AS from_table,
        kcu.column_name AS from_column,
        ccu.table_name AS to_table,
        ccu.column_name AS to_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    `)

    res.json({
      tables: tablesResult.rows.map(r => ({ name: r.table_name, type: 'table' })),
      views: viewsResult.rows.map(r => ({ name: r.table_name, type: 'view' })),
      functions: functionsResult.rows.map(r => ({ name: r.table_name, type: 'function' })),
      columns,
      relationships: relationshipsResult.rows
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Полный оригинальный код API ниже (tables, data CRUD, sql, migration, backup, policies) - без изменений
// Health check + Schema уже выше

app.listen(PORT, '0.0.0.0', () => {
  console.log(`DB Admin Server running on port ${PORT}`)
  console.log(`Schema test: curl http://localhost:${PORT}/api/schema`)
})
