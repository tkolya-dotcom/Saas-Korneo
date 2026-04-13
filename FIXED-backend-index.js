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

// FIXED Schema API - добавлены views/functions
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

    // Columns for tables (views часто без columns в info_schema)
    const columns = await pool.query(`
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
      ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
      WHERE c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position
    `)

    // Relationships
    const relationshipsResult = await pool.query(`
      SELECT
        tc.table_name AS from_table,
        kcu.column_name AS from_column,
        ccu.table_name AS to_table,
        ccu.column_name AS to_column,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    `)

    res.json({
      tables: tablesResult.rows.map(r => ({ name: r.table_name, type: 'table' })),
      views: viewsResult.rows.map(r => ({ name: r.table_name, type: 'view' })),
      functions: functionsResult.rows.map(r => ({ name: r.table_name, type: 'function' })),
      columns: columns.rows,
      relationships: relationshipsResult.rows
    })
  } catch (err) {
    console.error('Schema error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Tables list
app.get('/api/tables', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        t.table_name,
        t.table_type,
        obj_description(c.oid) as description
      FROM information_schema.tables t
      LEFT JOIN pg_class c ON c.relname = t.table_name
      WHERE t.table_schema = 'public'
      ORDER BY t.table_name
    `)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Table columns
app.get('/api/tables/:name/columns', async (req, res) => {
  try {
    const { name } = req.params
    const result = await pool.query(`
      SELECT
        c.column_name,
        c.data_type,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        c.is_nullable,
        c.column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
        CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key,
        fk.foreign_table_name,
        fk.foreign_column_name
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.column_name = pk.column_name
      LEFT JOIN (
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = $1 AND tc.constraint_type = 'FOREIGN KEY'
      ) fk ON c.column_name = fk.column_name
      WHERE c.table_name = $1 AND c.table_schema = 'public'
      ORDER BY c.ordinal_position
    `, [name])
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Data CRUD endpoints (pagination, create/update/delete)
app.get('/api/data/:table', async (req, res) => {
  try {
    const { table } = req.params
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '')
    const { page = 0, limit = 50, search = '' } = req.query

    let query = `SELECT * FROM "public"."${safeTable}"`
    const params = []

    if (search) {
      query += ` WHERE to_tsvector('simple', *) @@ plainto_tsquery('simple', $${params.length + 1})`
      params.push(search)
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM "public"."${safeTable}"`)
    const total = parseInt(countResult.rows[0].count)

    query += ` ORDER BY 1 LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(parseInt(limit), parseInt(page) * parseInt(limit))

    const result = await pool.query(query, params)

    res.json({
      data: result.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// SQL executor (safe)
app.post('/api/sql', async (req, res) => {
  try {
    const { query } = req.body
    if (!query.match(/^(SELECT|EXPLAIN|WITH)/i)) {
      return res.status(403).json({ error: 'Only SELECT queries allowed' })
    }
    const result = await pool.query(query)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Migration/Backup endpoints
app.get('/api/migration/export/:table', async (req, res) => {
  try {
    const { table } = req.params
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '')
    const data = await pool.query(`SELECT * FROM "public"."${safeTable}" LIMIT 100`)
    res.json({ table: safeTable, rows: data.rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// RLS Policies
app.get('/api/policies/:table', async (req, res) => {
  try {
    const { table } = req.params
    const result = await pool.query(`
      SELECT policyname, cmd, qual, with_check
      FROM pg_policies 
      WHERE tablename = $1 AND schemaname = 'public'
    `, [table])
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Wildcard SPA route
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'))
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Server error' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ DB Admin v2 - FIXED Schema API on port ${PORT}`)
  console.log(`Health: http://localhost:${PORT}/api/health`)
  console.log(`Schema: http://localhost:${PORT}/api/schema`)
})
