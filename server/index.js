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
    const functionsResult = await pool.query(`
  select
    r.routine_schema,
    r.routine_name,
    r.routine_type,
    r.data_type as return_type,
    coalesce(
      string_agg(
        coalesce(p.parameter_name, 'arg' || p.ordinal_position) || ' ' || coalesce(p.data_type, 'text'),
        ', '
        order by p.ordinal_position
      ) filter (where p.parameter_mode = 'IN'),
      ''
    ) as args
  from information_schema.routines r
  left join information_schema.parameters p
    on p.specific_schema = r.specific_schema
   and p.specific_name = r.specific_name
  where r.routine_schema not in ('pg_catalog', 'information_schema')
  group by r.routine_schema, r.routine_name, r.routine_type, r.data_type
  order by r.routine_schema, r.routine_name
`)

res.json({ status: 'ok', database: 'connected' })
  } catch (err) {
    res.json({ status: 'error', database: 'disconnected', error: err.message })
  }
})

// ==================== SCHEMA API ====================

// Get all tables
app.get('/api/tables', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.table_name,
        t.table_type,
        c.relname as view_name,
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

// Get table columns
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
        c.column_key,
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

// Get table relationships
app.get('/api/relationships', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        tc.table_name AS from_table,
        kcu.column_name AS from_column,
        ccu.table_name AS to_table,
        ccu.column_name AS to_column,
        rc.delete_rule AS on_delete
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    `)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get schema diagram data
app.get('/api/schema', async (req, res) => {
  try {
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `)
    
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
    
    const relationships = await pool.query(`
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
      tables: tables.rows.map(r => r.table_name),
      columns: columns.rows,
      relationships: relationships.rows
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ==================== DATA API ====================

// Get table data with pagination
app.get('/api/data/:table', async (req, res) => {
  try {
    const { table } = req.params
    const { page = 0, limit = 50, search = '', sort = '', order = 'ASC' } = req.query
    
    // Validate table name (prevent SQL injection)
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '')
    
    let query = `SELECT * FROM "${safeTable}" WHERE 1=1`
    const params = []
    
    if (search) {
      params.push(`%${search}%`)
      query += ` AND CAST(* AS TEXT) LIKE $${params.length}`
    }
    
    // Get total count
    const countResult = await pool.query(`SELECT COUNT(*) FROM "${safeTable}"`)
    const total = parseInt(countResult.rows[0].count)
    
    // Add pagination
    query += ` ORDER BY 1 ${order}`
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(parseInt(limit), parseInt(page) * parseInt(limit))
    
    const result = await pool.query(query, params)
    
    res.json({
      data: result.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get single row
app.get('/api/data/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '')
    
    const result = await pool.query(
      `SELECT * FROM "${safeTable}" WHERE id = $1`,
      [id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Row not found' })
    }
    
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create row
app.post('/api/data/:table', async (req, res) => {
  try {
    const { table } = req.params
    const data = req.body
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '')
    
    const columns = Object.keys(data)
    const values = Object.values(data)
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')
    
    const query = `
      INSERT INTO "${safeTable}" (${columns.map(c => `"${c}"`).join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `
    
    const result = await pool.query(query, values)
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update row
app.put('/api/data/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params
    const data = req.body
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '')
    
    const updates = Object.keys(data)
      .map((k, i) => `"${k}" = $${i + 1}`)
      .join(', ')
    const values = [...Object.values(data), id]
    
    const query = `
      UPDATE "${safeTable}" SET ${updates}
      WHERE id = $${values.length}
      RETURNING *
    `
    
    const result = await pool.query(query, values)
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Row not found' })
    }
    
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete row
app.delete('/api/data/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '')
    
    await pool.query(`DELETE FROM "${safeTable}" WHERE id = $1`, [id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Execute custom SQL (with restrictions)
app.post('/api/sql', async (req, res) => {
  try {
    const { query } = req.body
    
    // Block dangerous operations
    const blocked = ['DROP', 'TRUNCATE', 'ALTER', 'GRANT', 'REVOKE', 'CREATE ROLE', 'DROP ROLE']
    const upperQuery = query.toUpperCase()
    for (const block of blocked) {
      if (upperQuery.includes(block)) {
        return res.status(403).json({ error: `${block} is not allowed` })
      }
    }
    
    const result = await pool.query(query)
    res.json({
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields?.map(f => f.name) || []
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ==================== MIGRATION API ====================

// Get Supabase schema
app.get('/api/migration/supabase-schema', async (req, res) => {
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/?apikey=${process.env.SUPABASE_ANON_KEY}`, {
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
      }
    })
    
    // Get tables info from Supabase
    const tablesResult = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    
    res.json({
      message: 'Connect to Supabase REST API to get schema',
      localTables: tablesResult.rows
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Generate migration script
app.post('/api/migration/generate', async (req, res) => {
  try {
    // Generate CREATE TABLE statements for all tables
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    
    let script = '-- PostgreSQL Schema Export\n-- Generated: ' + new Date().toISOString() + '\n\n'
    
    for (const { table_name } of tables.rows) {
      // Get columns
      const columns = await pool.query(`
        SELECT column_name, data_type, character_maximum_length, 
               numeric_precision, numeric_scale, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [table_name])
      
      // Get primary key
      const pk = await pool.query(`
        SELECT column_name FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
      `, [table_name])
      
      // Get foreign keys
      const fks = await pool.query(`
        SELECT kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = $1 AND tc.constraint_type = 'FOREIGN KEY'
      `, [table_name])
      
      script += `\nCREATE TABLE "${table_name}" (\n`
      const colDefs = columns.rows.map(col => {
        let def = `  "${col.column_name}" ${col.data_type}`
        if (col.character_maximum_length) def += `(${col.character_maximum_length})`
        if (col.numeric_precision) def += `(${col.numeric_precision},${col.numeric_scale})`
        if (col.is_nullable === 'NO') def += ' NOT NULL'
        if (col.column_default) def += ` DEFAULT ${col.column_default}`
        return def
      })
      
      if (pk.rows.length > 0) {
        colDefs.push(`  PRIMARY KEY (${pk.rows.map(r => `"${r.column_name}"`).join(', ')})`)
      }
      
      fks.rows.forEach(fk => {
        colDefs.push(`  FOREIGN KEY ("${fk.column_name}") REFERENCES "${fk.foreign_table}"("${fk.foreign_column}")`)
      })
      
      script += colDefs.join(',\n') + '\n);\n'
    }
    
    res.json({ script })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Export data as SQL
app.get('/api/migration/export/:table', async (req, res) => {
  try {
    const { table } = req.params
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '')
    
    const data = await pool.query(`SELECT * FROM "${safeTable}"`)
    
    if (data.rows.length === 0) {
      return res.json({ inserts: [] })
    }
    
    const columns = Object.keys(data.rows[0])
    const inserts = data.rows.map(row => {
      const values = columns.map(col => {
        const val = row[col]
        if (val === null) return 'NULL'
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
        if (val instanceof Date) return `'${val.toISOString()}'`
        return String(val)
      })
      return `INSERT INTO "${safeTable}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});`
    })
    
    res.json({ 
      table: safeTable,
      rowCount: data.rows.length,
      inserts 
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Export all data
app.get('/api/migration/export-all', async (req, res) => {
  try {
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    
    const exportData = []
    
    for (const { table_name } of tables.rows) {
      const data = await pool.query(`SELECT * FROM "${table_name}"`)
      exportData.push({
        table: table_name,
        rowCount: data.rows.length,
        data: data.rows
      })
    }
    
    res.json(exportData)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ==================== POLICIES API (RLS) ====================

// Get all tables with RLS status
app.get('/api/policies', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.relname AS table_name,
        c.relrowsecurity AS rls_enabled
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
      ORDER BY c.relname
    `)
    res.json(result.rows.map(row => ({
      table_name: row.table_name,
      rls_enabled: row.rls_enabled || false
    })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get policies for specific table
app.get('/api/policies/:table', async (req, res) => {
  try {
    const { table } = req.params
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '')
    
    const result = await pool.query(`
      SELECT 
        policyname,
        cmd,
        qual,
        with_check,
        permissive,
        roles,
        schema_name
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = $1
      ORDER BY policyname
    `, [safeTable])
    
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create new policy
app.post('/api/policies/:table', async (req, res) => {
  try {
    const { table } = req.params
    const { policyname, cmd, qual, with_check } = req.body
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '')
    
    if (!policyname || !cmd) {
      return res.status(400).json({ error: 'policyname and cmd are required' })
    }
    
    const qualStr = qual || 'true'
    const withCheckStr = with_check || qualStr
    
    const query = `
      CREATE POLICY "${policyname}"
      ON "${safeTable}"
      FOR ${cmd}
      USING (${qualStr})
      WITH CHECK (${withCheckStr})
    `
    
    await pool.query(query)
    res.json({ success: true, policyname })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update existing policy
app.put('/api/policies/:table/:policyname', async (req, res) => {
  try {
    const { table, policyname } = req.params
    const { qual, with_check } = req.body
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '')
    const safePolicyName = policyname.replace(/[^a-zA-Z0-9_]/g, '')
    
    // PostgreSQL doesn't support ALTER POLICY well, so we drop and recreate
    const qualStr = qual || 'true'
    const withCheckStr = with_check || qualStr
    
    // First get the command type
    const existing = await pool.query(`
      SELECT cmd FROM pg_policies
      WHERE schemaname = 'public' AND tablename = $1 AND policyname = $2
    `, [safeTable, safePolicyName])
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found' })
    }
    
    const cmd = existing.rows[0].cmd
    
    await pool.query(`DROP POLICY "${safePolicyName}" ON "${safeTable}"`)
    await pool.query(`
      CREATE POLICY "${safePolicyName}"
      ON "${safeTable}"
      FOR ${cmd}
      USING (${qualStr})
      WITH CHECK (${withCheckStr})
    `)
    
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete policy
app.delete('/api/policies/:table/:policyname', async (req, res) => {
  try {
    const { table, policyname } = req.params
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '')
    const safePolicyName = policyname.replace(/[^a-zA-Z0-9_]/g, '')
    
    await pool.query(`DROP POLICY IF EXISTS "${safePolicyName}" ON "${safeTable}"`)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Enable RLS for table
app.post('/api/policies/:table/rls', async (req, res) => {
  try {
    const { table } = req.params
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '')
    
    await pool.query(`ALTER TABLE "${safeTable}" ENABLE ROW LEVEL SECURITY`)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Disable RLS for table
app.delete('/api/policies/:table/rls', async (req, res) => {
  try {
    const { table } = req.params
    const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '')
    
    await pool.query(`ALTER TABLE "${safeTable}" DISABLE ROW LEVEL SECURITY`)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ==================== BACKUP API ====================

// Create backup
app.post('/api/backup/create', async (req, res) => {
  try {
    const { name } = req.body
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `backup-${name || 'db'}-${timestamp}.sql`
    
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    
    let dump = `-- Backup: ${filename}\n-- Date: ${new Date().toISOString()}\n\n`
    
    for (const { table_name } of tables.rows) {
      const data = await pool.query(`SELECT * FROM "${table_name}"`)
      const columns = data.rows.length > 0 ? Object.keys(data.rows[0]) : []
      
      for (const row of data.rows) {
        const values = columns.map(col => {
          const val = row[col]
          if (val === null) return 'NULL'
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
          if (val instanceof Date) return `'${val.toISOString()}'`
          return String(val)
        })
        dump += `INSERT INTO "${table_name}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`
      }
    }
    
    res.json({ filename, content: dump, size: dump.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Serve static frontend
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'))
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`DB Admin Server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/api/health`)
})
