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

    // Execute alter table column migrations on Supabase PostgreSQL
    try {
      await client.query(`
        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS portal_id TEXT;
        ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS portal_id TEXT;
        ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS portal_id TEXT;
        ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS portal_id TEXT;
        ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS portal_id TEXT;
        ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS portal_id TEXT;
        ALTER TABLE public.class_portals ADD COLUMN IF NOT EXISTS portal_id TEXT;
        ALTER TABLE public.class_portals ADD COLUMN IF NOT EXISTS department_id TEXT;
      `);
      console.log('✅ Supabase PostgreSQL portal_id schema columns verified.');
    } catch (e) {
      console.warn('⚠️ Supabase schema column alter warning:', e.message);
    }

    // Read and run schema migrations
    const schemaSqlPath = path.join(__dirname, 'supabase_schema.sql');
    if (fs.existsSync(schemaSqlPath)) {
      const sqlContent = fs.readFileSync(schemaSqlPath, 'utf8');
      await client.query(sqlContent);
      console.log('✅ Supabase PostgreSQL tables, indexes, and RLS policies verified and migrated.');
    }

    client.release();
    isSupabaseActive = true;

    // Seed default records into Supabase PostgreSQL tables
    await seedSupabaseDatabase();

    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Supabase PostgreSQL database:', error.message);
    isSupabaseActive = false;
    return false;
  }
}

async function seedSupabaseDatabase() {
  try {
    const bcrypt = require('bcryptjs');
    const adminHash = await bcrypt.hash('elite minds', 10);
    const defaultPassHash = await bcrypt.hash('1234', 10);

    // 1. Seed Super Admin (vel / elite minds) into users table
    await queryPg(
      `INSERT INTO users (id, name, roll_number, email, username, role, password_hash, institution_name, department_name, status)
       VALUES ('usr-admin-vel', 'Vel Admin', 'ADMIN01', 'admin@kandrix.ai', 'vel', 'super_admin', $1, 'KANDRIX AI Attendance Platform', 'Super Admin', 'Active')
       ON CONFLICT (id) DO UPDATE SET password_hash = $1, username = 'vel', role = 'super_admin'`,
      [adminHash]
    );

    // 2. Seed Class Portals (AI3A, AI3B, AI3C, CSE3A / 1234)
    const portals = [
      { id: 'cp-ai3a', portal_id: 'AI3A', name: 'AI & DS III A', username: 'AI3A', dept: 'AI & DS', advisor: 'Mrs Vasantha Priya', room: 'F305', max: 61 },
      { id: 'cp-ai3b', portal_id: 'AI3B', name: 'AI & DS III B', username: 'AI3B', dept: 'AI & DS', advisor: 'Dr Rajesh Kumar', room: 'F306', max: 60 },
      { id: 'cp-ai3c', portal_id: 'AI3C', name: 'AI & DS III C', username: 'AI3C', dept: 'AI & DS', advisor: 'Mrs Krithiga', room: 'F307', max: 60 },
      { id: 'cp-cse3a', portal_id: 'CSE3A', name: 'CSE III A', username: 'CSE3A', dept: 'Computer Science', advisor: 'Prof Senthil', room: 'C201', max: 65 }
    ];

    for (const p of portals) {
      await queryPg(
        `INSERT INTO class_portals (id, portal_id, display_name, username, password_hash, department, course, batch, semester, section, advisor, room, max_students)
         VALUES ($1, $2, $3, $4, $5, $6, 'B.Tech', '2024-2028', 5, 'A', $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET password_hash = $5, username = $4, display_name = $3`,
        [p.id, p.portal_id, p.name, p.username, defaultPassHash, p.dept, p.advisor, p.room, p.max]
      );

      await queryPg(
        `INSERT INTO users (id, name, roll_number, email, username, role, password_hash, department, status, portal_id)
         VALUES ($1, $2, $3, $4, $5, 'class_portal', $6, $7, 'Active', $8)
         ON CONFLICT (id) DO UPDATE SET password_hash = $6, username = $5, portal_id = $8`,
        [`usr-${p.id}`, p.name, p.portal_id, `${p.username.toLowerCase()}@kandrix.ai`, p.username, defaultPassHash, p.dept, p.portal_id]
      );
    }

    // 3. Seed Students (assigned ONLY to AI3A)
    const students = [
      { id: 'usr-student-21104001', name: 'Dhanush Kumar R', roll: '21104001', email: 'dhanush@veltech.edu.in', dept: 'AI & DS', year: 3, sec: 'A', portal_id: 'AI3A' },
      { id: 'usr-student-21ai001', name: 'Aarav Sharma', roll: '21AI001', email: 'aarav@veltech.edu.in', dept: 'AI & DS', year: 3, sec: 'A', portal_id: 'AI3A' },
      { id: 'usr-student-21ai002', name: 'Ananya Verma', roll: '21AI002', email: 'ananya@veltech.edu.in', dept: 'AI & DS', year: 3, sec: 'A', portal_id: 'AI3A' }
    ];

    for (const st of students) {
      await queryPg(
        `INSERT INTO users (id, name, roll_number, email, username, role, password_hash, department, year, section, status, first_login, is_first_login, must_change_password, password_changed, portal_id)
         VALUES ($1, $2, $3, $4, $3, 'student', $5, $6, $7, $8, 'Active', 0, 0, 0, 1, $9)
         ON CONFLICT (id) DO UPDATE SET password_hash = $5, username = $3, portal_id = $9`,
        [st.id, st.name, st.roll, st.email, defaultPassHash, st.dept, st.year, st.sec, st.portal_id]
      );
    }

    // 4. Seed Departments
    await queryPg(
      `INSERT INTO departments (id, name, code, hod_name, description)
       VALUES ('dept-aids', 'Artificial Intelligence & Data Science', 'AI & DS', 'Dr K. Arumugam', 'AI & Data Science Department'),
              ('dept-cse', 'Computer Science & Engineering', 'CSE', 'Dr M. Sundar', 'Computer Science Department'),
              ('dept-it', 'Information Technology', 'IT', 'Dr R. Senthil', 'IT Department')
       ON CONFLICT (id) DO NOTHING`
    );

    // 5. Seed Faculty
    await queryPg(
      `INSERT INTO faculty (id, faculty_code, name, email, department, designation, qualification, password_hash, status, portal_id)
       VALUES ('fac-001', 'FAC001', 'Mrs Vasantha Priya', 'vasanthapriya@veltech.edu.in', 'AI & DS', 'Assistant Professor', 'M.Tech', $1, 'Active', 'AI3A'),
              ('fac-002', 'FAC002', 'Dr Rajesh Kumar', 'rajeshkumar@veltech.edu.in', 'AI & DS', 'Associate Professor', 'Ph.D', $1, 'Active', 'AI3A')
       ON CONFLICT (id) DO NOTHING`,
      [defaultPassHash]
    );

    // 6. Seed Subjects for AI3A
    const subjects = [
      { id: 'sub-cs51t', name: 'Programming Language for AI', code: 'CS51T', type: 'Theory', dept: 'AI & DS', yr: 3, sem: 5, sec: 'A', fac: 'Mrs Vasantha Priya', cr: 3, portal_id: 'AI3A' },
      { id: 'sub-cs55t', name: 'Knowledge Engineering', code: 'CS55T', type: 'Theory', dept: 'AI & DS', yr: 3, sem: 5, sec: 'A', fac: 'Dr Rajesh Kumar', cr: 3, portal_id: 'AI3A' },
      { id: 'sub-cs52t', name: 'Data Analytics', code: 'CS52T', type: 'Theory', dept: 'AI & DS', yr: 3, sem: 5, sec: 'A', fac: 'Mrs Vasantha Priya', cr: 3, portal_id: 'AI3A' },
      { id: 'sub-cs53it', name: 'Web Technology', code: 'CS53IT', type: 'Theory', dept: 'AI & DS', yr: 3, sem: 5, sec: 'A', fac: 'Dr Rajesh Kumar', cr: 3, portal_id: 'AI3A' }
    ];

    for (const s of subjects) {
      await queryPg(
        `INSERT INTO subjects (id, name, code, type, department, year, semester, section, faculty_name, credits, status, is_archived, portal_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Active', 0, $11)
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.name, s.code, s.type, s.dept, s.yr, s.sem, s.sec, s.fac, s.cr, s.portal_id]
      );
    }

    // 7. Seed Timetables for AI3A
    const timetableSlots = [
      { id: 'tt-aids-mon-p1', dept: 'AI & DS', yr: 3, sec: 'A', sem: 5, day: 'Monday', period: 1, name: 'Knowledge Engineering', fac: 'Dr Rajesh Kumar', start: '08:15 AM', end: '09:05 AM', room: 'F305', portal_id: 'AI3A' },
      { id: 'tt-aids-mon-p2', dept: 'AI & DS', yr: 3, sec: 'A', sem: 5, day: 'Monday', period: 2, name: 'Programming Language for AI', fac: 'Mrs Vasantha Priya', start: '09:05 AM', end: '09:55 AM', room: 'F305', portal_id: 'AI3A' },
      { id: 'tt-aids-mon-p3', dept: 'AI & DS', yr: 3, sec: 'A', sem: 5, day: 'Monday', period: 3, name: 'Data Analytics', fac: 'Mrs Vasantha Priya', start: '10:10 AM', end: '11:00 AM', room: 'F305', portal_id: 'AI3A' }
    ];

    for (const t of timetableSlots) {
      await queryPg(
        `INSERT INTO timetables (id, department, year, section, semester, day, period_number, subject_name, faculty_name, start_time, end_time, room_number, portal_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO NOTHING`,
        [t.id, t.dept, t.yr, t.sec, t.sem, t.day, t.period, t.name, t.fac, t.start, t.end, t.room, t.portal_id]
      );
    }

    // 8. Fix unassigned portal_id for existing rows
    await queryPg("UPDATE users SET portal_id = 'AI3A' WHERE role = 'student' AND (portal_id IS NULL OR portal_id = '')");
    await queryPg("UPDATE subjects SET portal_id = 'AI3A' WHERE (portal_id IS NULL OR portal_id = '')");
    await queryPg("UPDATE timetables SET portal_id = 'AI3A' WHERE (portal_id IS NULL OR portal_id = '')");

    console.log('✅ Supabase PostgreSQL cloud database successfully seeded with Default Users, Portals, Students, Departments, Faculty, Subjects & Timetables!');
  } catch (err) {
    console.error('❌ Supabase seeding warning:', err.message);
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
