const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const dbPassword = process.env.SUPABASE_DB_PASSWORD || 'Kingdhanush@24';
const host = process.env.SUPABASE_DB_HOST || 'aws-0-ap-southeast-1.pooler.supabase.com';
const port = parseInt(process.env.SUPABASE_DB_PORT || '5432', 10);
const database = process.env.SUPABASE_DB_NAME || 'postgres';
const user = process.env.SUPABASE_DB_USER || 'postgres.ilhecqtxawgzcllcjivg';

let pool = null;
let isSupabaseActive = false;

if (dbPassword && dbPassword.trim() !== '') {
  console.log('====================================================');
  console.log('[SUPABASE PG] Initializing PostgreSQL Connection Pool:');
  console.log(`  ➔ Host:     ${host}`);
  console.log(`  ➔ Port:     ${port}`);
  console.log(`  ➔ User:     ${user}`);
  console.log(`  ➔ Database: ${database}`);
  console.log('====================================================');

  pool = new Pool({
    host,
    port,
    database,
    user,
    password: dbPassword,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });
} else {
  console.log('[SUPABASE PG] Supabase DB password not provided in .env yet. Running in SQLite fallback mode until password is set.');
}

/**
 * Convert SQLite query string syntax to PostgreSQL syntax
 */
function convertSqlToPostgres(sql) {
  let converted = sql;

  // Replace positional SQLite placeholders '?' with PostgreSQL '$1', '$2', ...
  let paramIndex = 1;
  converted = converted.replace(/\?/g, () => `$${paramIndex++}`);

  // Handle SQLite INSERT OR IGNORE INTO -> PostgreSQL ON CONFLICT DO NOTHING
  if (/INSERT\s+OR\s+IGNORE\s+INTO/gi.test(converted)) {
    converted = converted.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
    if (!/ON\s+CONFLICT/gi.test(converted)) {
      converted = converted.trim() + ' ON CONFLICT DO NOTHING';
    }
  }

  // Handle SQLite INSERT OR REPLACE INTO -> PostgreSQL ON CONFLICT (id) DO NOTHING / UPDATE
  if (/INSERT\s+OR\s+REPLACE\s+INTO/gi.test(converted)) {
    converted = converted.replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'INSERT INTO');
    if (!/ON\s+CONFLICT/gi.test(converted)) {
      converted = converted.trim() + ' ON CONFLICT (id) DO NOTHING';
    }
  }

  // Convert SQLite LIKE to PostgreSQL ILIKE for case-insensitive text search
  converted = converted.replace(/\bLIKE\b/gi, 'ILIKE');

  // Convert SQLite GROUP_CONCAT(expr) or GROUP_CONCAT(DISTINCT expr) to PostgreSQL STRING_AGG(expr, ', ')
  converted = converted.replace(/GROUP_CONCAT\s*\(\s*(DISTINCT\s+)?([^)]+)\)/gi, (match, dist, col) => {
    return `STRING_AGG(${dist || ''}${col}::text, ', ')`;
  });

  return converted;
}

/**
 * Execute query on PostgreSQL with SQLite-compatible interface
 */
async function queryPg(sql, params = []) {
  if (!pool) throw new Error('Supabase PostgreSQL pool not initialized.');
  const pgSql = convertSqlToPostgres(sql);
  const result = await pool.query(pgSql, params);
  return result;
}

async function getPg(sql, params = []) {
  const result = await queryPg(sql, params);
  return result.rows.length > 0 ? result.rows[0] : null;
}

async function allPg(sql, params = []) {
  const result = await queryPg(sql, params);
  return result.rows;
}

async function runPg(sql, params = []) {
  const result = await queryPg(sql, params);
  return {
    lastID: result.rows.length > 0 && result.rows[0].id ? result.rows[0].id : null,
    changes: result.rowCount || 0
  };
}

async function initSupabasePostgres() {
  if (!pool) {
    isSupabaseActive = false;
    return false;
  }
  try {
    const client = await pool.connect();
    console.log('====================================================');
    console.log('✅ Connected successfully to Supabase PostgreSQL cloud database!');
    console.log('====================================================');

    // Read and run schema migrations
    const schemaSqlPath = path.join(__dirname, 'supabase_schema.sql');
    if (fs.existsSync(schemaSqlPath)) {
      const sqlContent = fs.readFileSync(schemaSqlPath, 'utf8');
      await client.query(sqlContent);
      console.log('✅ Supabase PostgreSQL tables, indexes, and RLS policies verified and migrated.');
    }

    client.release();
    isSupabaseActive = true;
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Supabase PostgreSQL database:', error.message);
    isSupabaseActive = false;
    return false;
  }
}

module.exports = {
  pool,
  initSupabasePostgres,
  isSupabaseActive: () => isSupabaseActive,
  queryPg,
  getPg,
  allPg,
  runPg
};
