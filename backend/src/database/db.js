const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('./supabaseClient');
const { initSupabasePostgres } = require('./pgAdapter');


const dbPath = path.resolve(__dirname, 'smartattend.db');
const db = new sqlite3.Database(dbPath);


const PREDEFINED_100_TOKENS = [
  "A7K9X","B4XM2","C8RT5","D7PQ9","E6ZW4","F9KL8","G3YN7","H5VC2","J8MD6","K4TR9",
  "L7QW5","M9XB3","N6KP8","P4ZT7","Q8RV2","R5MN9","S7YC4","T9KD6","U4XW8","V7RP3",
  "W5ZT9","X8MN4","Y6KC7","Z9QV5","A3RT8","B7YD4","C5KP9","D8XM6","E4ZW7","F7MN2",
  "G9TR5","H6QV8","J4KC9","K7RP2","L5YD8","M8ZT4","N4XW7","P9MN3","Q6RT5","R8KP4",
  "S5QV7","T7YC9","U8MD2","V4TR6","W7ZW9","X5KC3","Y9RP8","Z6MN4","A8QV7","B5YD9",
  "C7TR4","D9KP6","E5XM8","F8ZW3","G4MN7","H7RV5","J9KC2","K5ZT8","L8YD4","M4TR7",
  "N7QV9","P5KP3","Q9XM6","R4ZW8","S8MN5","T6KC7","U9RP4","V5YD8","W8TR2","X4QV9",
  "Y7KP5","Z5XM7","A9ZW4","B6MN8","C8KC5","D4RP7","E7YD9","F5TR3","G8QV6","H4KP9",
  "J7XM5","K9ZW2","L4MN7","M7KC8","N5RP4","P8YD6","Q4TR9","R7QV3","S9KP5","T4XM8",
  "U7ZW6","V9MN2","W4KC7","X7RP8","Y5YD4","Z8TR6","A4QV9","B8KP3","C6XM7","D7ZW5"
];

/**
 * Step 1, 3, 6, 7: Automatic Database Startup Migration System & Version Validation
 */
function runMigrations() {
  return new Promise((resolve) => {
    console.log('[DATABASE MIGRATION] Inspecting database tables and schema versioning...');

    // Run direct PostgreSQL ALTER TABLE statements for Supabase compatibility
    const pgAlterStatements = [
      "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS portal_id TEXT;",
      "ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS portal_id TEXT;",
      "ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS portal_id TEXT;",
      "ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS portal_id TEXT;",
      "ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS portal_id TEXT;",
      "ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS portal_id TEXT;",
      "ALTER TABLE public.class_portals ADD COLUMN IF NOT EXISTS portal_id TEXT;",
      "ALTER TABLE public.class_portals ADD COLUMN IF NOT EXISTS department_id TEXT;",
      "ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS subject_code TEXT;",
      "ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS faculty_id TEXT;",
      "ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS subject_id TEXT;",
      "ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS faculty_name TEXT;",
      "ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS period_number TEXT;",
      "ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS date TEXT;"
    ];
    pgAlterStatements.forEach((stmt) => {
      try {
        db.run(stmt, () => {});
      } catch (e) {}
    });

    // 1. Migrate users table columns if missing
    db.all('PRAGMA table_info(users)', [], (errUser, userColumns) => {
      if (userColumns) {
        const userColNames = userColumns.map((c) => c.name.toLowerCase());
        const userMigrations = [
          { col: 'portal_id', type: 'TEXT' },
          { col: 'institution_name', type: "TEXT DEFAULT 'Elite Institute of Technology'" },
          { col: 'department_name', type: "TEXT DEFAULT 'Computer Science & Engineering'" },
          { col: 'device_fingerprint', type: 'TEXT' },
          { col: 'is_first_login', type: 'INTEGER DEFAULT 1' },
          { col: 'first_login', type: 'INTEGER DEFAULT 1' },
          { col: 'password_changed', type: 'INTEGER DEFAULT 0' },
          { col: 'must_change_password', type: 'INTEGER DEFAULT 0' },
          { col: 'password_changed_at', type: 'DATETIME' },
          { col: 'dob', type: 'TEXT' },
          { col: 'gender', type: 'TEXT' },
          { col: 'blood_group', type: 'TEXT' },
          { col: 'address', type: 'TEXT' },
          { col: 'parent_name', type: 'TEXT' },
          { col: 'parent_phone', type: 'TEXT' },
          { col: 'bio', type: 'TEXT' },
          { col: 'status', type: "TEXT DEFAULT 'Active'" },
          { col: 'admission_year', type: 'INTEGER' },
          { col: 'username', type: 'TEXT' },
          { col: 'vh_number', type: 'TEXT' }
        ];

        userMigrations.forEach(({ col, type }) => {
          if (!userColNames.includes(col.toLowerCase())) {
            console.log(`[MIGRATION EXECUTE] ADD COLUMN ${col} to users table`);
            try {
              db.run(`ALTER TABLE users ADD COLUMN ${col} ${type};`);
            } catch (e) {}
          }
        });

        // Migrate faculty table columns if missing
        db.all('PRAGMA table_info(faculty)', [], (errFac, facColumns) => {
          if (facColumns) {
            const facColNames = facColumns.map((c) => c.name.toLowerCase());
            const facMigrations = [
              { col: 'portal_id', type: 'TEXT' },
              { col: 'status', type: "TEXT DEFAULT 'Active'" },
              { col: 'password_changed', type: 'INTEGER DEFAULT 0' },
              { col: 'must_change_password', type: 'INTEGER DEFAULT 0' },
              { col: 'joining_date', type: 'TEXT' },
              { col: 'assigned_class', type: 'TEXT' },
              { col: 'assigned_section', type: 'TEXT' },
              { col: 'last_login', type: 'DATETIME' },
              { col: 'login_count', type: 'INTEGER DEFAULT 0' },
              { col: 'failed_login_attempts', type: 'INTEGER DEFAULT 0' },
              { col: 'updated_at', type: 'DATETIME' }
            ];
            facMigrations.forEach(({ col, type }) => {
              if (!facColNames.includes(col.toLowerCase())) {
                try {
                  db.run(`ALTER TABLE faculty ADD COLUMN ${col} ${type};`);
                } catch (e) {}
              }
            });
          }
        });
      }

      // 2. Migrate attendance_sessions table
      db.all('PRAGMA table_info(attendance_sessions)', [], (err, columns) => {
        if (err || !columns) {
          console.error('[DATABASE MIGRATION] Error querying attendance_sessions info:', err);
          return resolve(false);
        }

        const colNames = columns.map((c) => c.name.toLowerCase());
        console.log('[PRAGMA table_info(attendance_sessions)] Existing columns:', colNames.join(', '));

        const requiredMigrations = [
          { col: 'attendance_code', type: 'TEXT' },
          { col: 'active_token', type: 'TEXT' },
          { col: 'token', type: 'TEXT' },
          { col: 'admin_latitude', type: 'REAL' },
          { col: 'admin_longitude', type: 'REAL' },
          { col: 'end_time', type: 'DATETIME' },
          { col: 'created_at', type: 'DATETIME' },
          { col: 'period_number', type: 'TEXT' },
          { col: 'faculty_name', type: 'TEXT' },
          { col: 'faculty_id', type: 'TEXT' },
          { col: 'subject_code', type: 'TEXT' },
          { col: 'subject_id', type: 'TEXT' },
          { col: 'date', type: 'TEXT' }
        ];

        let completedCount = 0;
        requiredMigrations.forEach(({ col, type }) => {
          if (!colNames.includes(col.toLowerCase())) {
            console.log(`[MIGRATION EXECUTE] ADD COLUMN ${col} (${type}) to attendance_sessions`);
            db.run(`ALTER TABLE attendance_sessions ADD COLUMN ${col} ${type};`, () => {
              completedCount++;
              if (completedCount >= requiredMigrations.length) {
                verifyRecordsTable();
              }
            });
          } else {
            completedCount++;
            if (completedCount >= requiredMigrations.length) {
              verifyRecordsTable();
            }
          }
        });

        function verifyRecordsTable() {
          db.all('PRAGMA table_info(attendance_records)', [], (err2, recColumns) => {
            if (recColumns) {
              const recColNames = recColumns.map((c) => c.name.toLowerCase());
              if (!recColNames.includes('attendance_code')) {
                db.run('ALTER TABLE attendance_records ADD COLUMN attendance_code TEXT;');
              }
              if (!recColNames.includes('notes')) {
                db.run('ALTER TABLE attendance_records ADD COLUMN notes TEXT;');
              }
            }

            // Verify class_portals schema migrations
            db.all('PRAGMA table_info(class_portals)', [], (errCp, cpColumns) => {
              if (cpColumns) {
                const cpColNames = cpColumns.map((c) => c.name.toLowerCase());
                if (!cpColNames.includes('portal_name')) {
                  try {
                    db.run('ALTER TABLE class_portals ADD COLUMN portal_name TEXT;');
                  } catch (e) {}
                }
              }
            });

            // Verify subjects schema migrations
            db.all('PRAGMA table_info(subjects)', [], (errSub, subColumns) => {
              if (subColumns) {
                const subColNames = subColumns.map((c) => c.name.toLowerCase());
                const subMigrations = [
                  { col: 'type', type: "TEXT DEFAULT 'Theory'" },
                  { col: 'section', type: "TEXT DEFAULT 'A'" },
                  { col: 'status', type: "TEXT DEFAULT 'Active'" }
                ];
                subMigrations.forEach(({ col, type }) => {
                  if (!subColNames.includes(col.toLowerCase())) {
                    console.log(`[MIGRATION EXECUTE] ADD COLUMN ${col} to subjects`);
                    try {
                      db.run(`ALTER TABLE subjects ADD COLUMN ${col} ${type};`);
                    } catch (e) {}
                  }
                });
              }

              // Verify timetables schema migrations
              db.all('PRAGMA table_info(timetables)', [], (err3, ttColumns) => {
                if (ttColumns) {
                  const ttColNames = ttColumns.map((c) => c.name.toLowerCase());
                  const ttMigrations = [
                    { col: 'date', type: 'TEXT' },
                    { col: 'period_number', type: 'INTEGER DEFAULT 1' },
                    { col: 'semester', type: 'INTEGER DEFAULT 5' },
                    { col: 'subject_id', type: 'TEXT' },
                    { col: 'faculty_id', type: 'TEXT' },
                    { col: 'academic_year', type: "TEXT DEFAULT '2026-2027 (ODD)'" },
                    { col: 'status', type: "TEXT DEFAULT 'ACTIVE'" }
                  ];
                  ttMigrations.forEach(({ col, type }) => {
                    if (!ttColNames.includes(col.toLowerCase())) {
                      console.log(`[MIGRATION EXECUTE] ADD COLUMN ${col} to timetables`);
                      try {
                        db.run(`ALTER TABLE timetables ADD COLUMN ${col} ${type};`);
                      } catch (e) {}
                    }
                  });
                  try {
                    db.run("UPDATE timetables SET status = 'ACTIVE' WHERE status IS NULL OR status = ''");
                  } catch (e) {}
                }

                // Non-destructive Seed for Master Subjects & Timetable (Only if empty)
                db.get("SELECT COUNT(*) as count FROM subjects", [], (errSubCount, subRow) => {
                  if (!errSubCount && subRow && (subRow.count === 0 || subRow.count === '0')) {
                    console.log('[DATABASE MIGRATION] Subjects table is empty. Seeding initial Semester 5 Master Subjects...');
                    const SEMESTER_5_SUBJECTS = [
                      { code: '21AI51T', name: 'Programming Language for AI', faculty_name: 'Mrs Nivetha P', type: 'Theory', credits: 3 },
                      { code: '21AI55T', name: 'Knowledge Engineering', faculty_name: 'Mrs Krithiga', type: 'Theory', credits: 3 },
                      { code: '21HI52T', name: 'Data Analytics', faculty_name: 'Mrs Gowthami K', type: 'Theory', credits: 3 },
                      { code: '21HI53IT', name: 'Web Technology', faculty_name: 'Mrs Vasanthapriya M J T', type: 'Theory', credits: 3 },
                      { code: '21HC54T', name: 'Blockchain Technology', faculty_name: 'Mr Ramajayam', type: 'Theory', credits: 3 },
                      { code: '21AI57P', name: 'Data Analytics Laboratory', faculty_name: 'Mrs Gowthami K / Mr Balaji M', type: 'Lab', credits: 2 },
                      { code: '21EE01P', name: 'Mini Project - I', faculty_name: 'Mr Balaarunesh G', type: 'Project', credits: 2 },
                      { code: '21EE03P', name: 'Technical Seminar', faculty_name: 'Mr Balaarunesh G', type: 'Seminar', credits: 1 },
                      { code: '21MB03OT', name: 'Entrepreneurship Development', faculty_name: 'Open Elective', type: 'Theory', credits: 3 },
                      { code: 'SPORTS_HOUR', name: 'Sports', faculty_name: 'Sports Department', type: 'Sports', credits: 0 }
                    ];

                    SEMESTER_5_SUBJECTS.forEach((sub) => {
                      const subId = 'sub-' + sub.code.toLowerCase();
                      db.run(
                        `INSERT OR IGNORE INTO subjects (id, name, code, type, department, year, semester, section, faculty_name, credits, status, is_archived)
                         VALUES (?, ?, ?, ?, 'AI & DS', 3, 5, 'A', ?, ?, 'Active', 0)`,
                        [subId, sub.name, sub.code, sub.type, sub.faculty_name, sub.credits]
                      );
                    });
                  }
                });

                db.get("SELECT COUNT(*) as count FROM timetables", [], (errTtCount, ttRow) => {
                  if (!errTtCount && ttRow && (ttRow.count === 0 || ttRow.count === '0')) {
                    console.log('[DATABASE MIGRATION] Timetables table is empty. Seeding initial Semester 5 Master Timetable...');
                    const MASTER_TIMETABLE_SLOTS = [
                      // Monday
                      { day: 'Monday', period_number: 1, code: '21AI55T', name: 'Knowledge Engineering', faculty: 'Mrs Krithiga', start: '08:15 AM', end: '09:05 AM', room: 'F305' },
                      { day: 'Monday', period_number: 2, code: '21AI51T', name: 'Programming Language for AI', faculty: 'Mrs Nivetha P', start: '09:05 AM', end: '09:55 AM', room: 'F305' },
                      { day: 'Monday', period_number: 3, code: '21HI52T', name: 'Data Analytics', faculty: 'Mrs Gowthami K', start: '10:10 AM', end: '11:00 AM', room: 'F305' },
                      { day: 'Monday', period_number: 4, code: '21EE01P', name: 'Mini Project - I', faculty: 'Mr Balaarunesh G', start: '11:00 AM', end: '11:50 AM', room: 'F305' },
                      { day: 'Monday', period_number: 5, code: '21HI53IT', name: 'Web Technology', faculty: 'Mrs Vasanthapriya M J T', start: '11:50 AM', end: '12:35 PM', room: 'F305' },
                      { day: 'Monday', period_number: 6, code: '21HI53IT', name: 'Web Technology', faculty: 'Mrs Vasanthapriya M J T', start: '01:15 PM', end: '02:00 PM', room: 'F305' },
                      { day: 'Monday', period_number: 7, code: '21HI53IT', name: 'Web Technology', faculty: 'Mrs Vasanthapriya M J T', start: '02:00 PM', end: '02:45 PM', room: 'F305' },
                      { day: 'Monday', period_number: 8, code: '21HI53IT', name: 'Web Technology', faculty: 'Mrs Vasanthapriya M J T', start: '02:45 PM', end: '03:30 PM', room: 'F305' },

                      // Tuesday
                      { day: 'Tuesday', period_number: 1, code: '21MB03OT', name: 'Entrepreneurship Development', faculty: 'Open Elective', start: '08:15 AM', end: '09:05 AM', room: 'F305' },
                      { day: 'Tuesday', period_number: 2, code: '21MB03OT', name: 'Entrepreneurship Development', faculty: 'Open Elective', start: '09:05 AM', end: '09:55 AM', room: 'F305' },
                      { day: 'Tuesday', period_number: 3, code: '21HI52T', name: 'Data Analytics', faculty: 'Mrs Gowthami K', start: '10:10 AM', end: '11:00 AM', room: 'F305' },
                      { day: 'Tuesday', period_number: 4, code: '21AI55T', name: 'Knowledge Engineering', faculty: 'Mrs Krithiga', start: '11:00 AM', end: '11:50 AM', room: 'F305' },
                      { day: 'Tuesday', period_number: 5, code: '21HC54T', name: 'Blockchain Technology', faculty: 'Mr Ramajayam', start: '11:50 AM', end: '12:35 PM', room: 'F305' },
                      { day: 'Tuesday', period_number: 6, code: '21HI52T', name: 'Data Analytics', faculty: 'Mrs Gowthami K', start: '01:15 PM', end: '02:00 PM', room: 'F305' },
                      { day: 'Tuesday', period_number: 7, code: '21HI53IT', name: 'Web Technology', faculty: 'Mrs Vasanthapriya M J T', start: '02:00 PM', end: '02:45 PM', room: 'F305' },
                      { day: 'Tuesday', period_number: 8, code: '21HC54T', name: 'Blockchain Technology', faculty: 'Mr Ramajayam', start: '02:45 PM', end: '03:30 PM', room: 'F305' },

                      // Wednesday
                      { day: 'Wednesday', period_number: 1, code: '21HI53IT', name: 'Web Technology', faculty: 'Mrs Vasanthapriya M J T', start: '08:15 AM', end: '09:05 AM', room: 'F305' },
                      { day: 'Wednesday', period_number: 2, code: '21AI57P', name: 'Data Analytics Laboratory', faculty: 'Mrs Gowthami K / Mr Balaji M', start: '09:05 AM', end: '09:55 AM', room: 'Lab 2' },
                      { day: 'Wednesday', period_number: 3, code: '21AI57P', name: 'Data Analytics Laboratory', faculty: 'Mrs Gowthami K / Mr Balaji M', start: '10:10 AM', end: '11:00 AM', room: 'Lab 2' },
                      { day: 'Wednesday', period_number: 4, code: '21AI57P', name: 'Data Analytics Laboratory', faculty: 'Mrs Gowthami K / Mr Balaji M', start: '11:00 AM', end: '11:50 AM', room: 'Lab 2' },
                      { day: 'Wednesday', period_number: 5, code: '21AI57P', name: 'Data Analytics Laboratory', faculty: 'Mrs Gowthami K / Mr Balaji M', start: '11:50 AM', end: '12:35 PM', room: 'Lab 2' },
                      { day: 'Wednesday', period_number: 6, code: '21AI51T', name: 'Programming Language for AI', faculty: 'Mrs Nivetha P', start: '01:15 PM', end: '02:00 PM', room: 'F305' },
                      { day: 'Wednesday', period_number: 7, code: '21AI55T', name: 'Knowledge Engineering', faculty: 'Mrs Krithiga', start: '02:00 PM', end: '02:45 PM', room: 'F305' },
                      { day: 'Wednesday', period_number: 8, code: 'SPORTS_HOUR', name: 'Sports', faculty: 'Sports Department', start: '02:45 PM', end: '03:30 PM', room: 'Ground' },

                      // Thursday
                      { day: 'Thursday', period_number: 1, code: '21MB03OT', name: 'Entrepreneurship Development', faculty: 'Open Elective', start: '08:15 AM', end: '09:05 AM', room: 'F305' },
                      { day: 'Thursday', period_number: 2, code: '21MB03OT', name: 'Entrepreneurship Development', faculty: 'Open Elective', start: '09:05 AM', end: '09:55 AM', room: 'F305' },
                      { day: 'Thursday', period_number: 3, code: '21AI51T', name: 'Programming Language for AI', faculty: 'Mrs Nivetha P', start: '10:10 AM', end: '11:00 AM', room: 'F305' },
                      { day: 'Thursday', period_number: 4, code: '21HI52T', name: 'Data Analytics', faculty: 'Mrs Gowthami K', start: '11:00 AM', end: '11:50 AM', room: 'F305' },
                      { day: 'Thursday', period_number: 5, code: '21HC54T', name: 'Blockchain Technology', faculty: 'Mr Ramajayam', start: '11:50 AM', end: '12:35 PM', room: 'F305' },
                      { day: 'Thursday', period_number: 6, code: '21AI55T', name: 'Knowledge Engineering', faculty: 'Mrs Krithiga', start: '01:15 PM', end: '02:00 PM', room: 'F305' },
                      { day: 'Thursday', period_number: 7, code: '21HC54T', name: 'Blockchain Technology', faculty: 'Mr Ramajayam', start: '02:00 PM', end: '02:45 PM', room: 'F305' },
                      { day: 'Thursday', period_number: 8, code: '21AI51T', name: 'Programming Language for AI', faculty: 'Mrs Nivetha P', start: '02:45 PM', end: '03:30 PM', room: 'F305' },

                      // Friday
                      { day: 'Friday', period_number: 1, code: '21EE01P', name: 'Mini Project - I', faculty: 'Mr Balaarunesh G', start: '08:15 AM', end: '09:05 AM', room: 'F305' },
                      { day: 'Friday', period_number: 2, code: '21EE01P', name: 'Mini Project - I', faculty: 'Mr Balaarunesh G', start: '09:05 AM', end: '09:55 AM', room: 'F305' },
                      { day: 'Friday', period_number: 3, code: '21HI52T', name: 'Data Analytics', faculty: 'Mrs Gowthami K', start: '10:10 AM', end: '11:00 AM', room: 'F305' },
                      { day: 'Friday', period_number: 4, code: '21EE03P', name: 'Technical Seminar', faculty: 'Mr Balaarunesh G', start: '11:00 AM', end: '11:50 AM', room: 'F305' },
                      { day: 'Friday', period_number: 5, code: '21AI51T', name: 'Programming Language for AI', faculty: 'Mrs Nivetha P', start: '11:50 AM', end: '12:35 PM', room: 'F305' },
                      { day: 'Friday', period_number: 6, code: '21HI52T', name: 'Data Analytics', faculty: 'Mrs Gowthami K', start: '01:15 PM', end: '02:00 PM', room: 'F305' },
                      { day: 'Friday', period_number: 7, code: '21AI55T', name: 'Knowledge Engineering', faculty: 'Mrs Krithiga', start: '02:00 PM', end: '02:45 PM', room: 'F305' },
                      { day: 'Friday', period_number: 8, code: 'RESERVED', name: 'Reserved Hour', faculty: 'Admin Configured', start: '02:45 PM', end: '03:30 PM', room: 'F305' }
                    ];

                    MASTER_TIMETABLE_SLOTS.forEach((slot) => {
                      const ttId = `tt-${slot.day.toLowerCase()}-p${slot.period_number}`;
                      db.run(
                        `INSERT OR IGNORE INTO timetables (id, department, year, section, semester, day, period_number, subject_name, faculty_name, start_time, end_time, room_number)
                         VALUES (?, 'AI & DS', 3, 'A', 5, ?, ?, ?, ?, ?, ?, ?)`,
                        [ttId, slot.day, slot.period_number, slot.name, slot.faculty, slot.start, slot.end, slot.room]
                      );
                    });
                  }
                });

                console.log('[DATABASE MIGRATION] Schema check and non-destructive initialization verified.');
                resolve(true);
              });
            });
          });
        }
      });
    });
  });
}

function initDb() {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      // Attempt connection & migration on Supabase PostgreSQL cloud database
      await initSupabasePostgres();

      // Create Users table

      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          roll_number TEXT UNIQUE,
          email TEXT UNIQUE NOT NULL,
          role TEXT NOT NULL,
          department TEXT,
          year INTEGER,
          section TEXT,
          phone TEXT,
          profile_photo TEXT,
          institution_name TEXT DEFAULT 'Elite Institute of Technology',
          department_name TEXT DEFAULT 'Computer Science & Engineering',
          password_hash TEXT NOT NULL,
          device_fingerprint TEXT,
          must_change_password INTEGER DEFAULT 0,
          is_first_login INTEGER DEFAULT 1,
          first_login INTEGER DEFAULT 1,
          password_changed INTEGER DEFAULT 0,
          password_changed_at DATETIME,
          dob TEXT,
          gender TEXT,
          blood_group TEXT,
          address TEXT,
          parent_name TEXT,
          parent_phone TEXT,
          bio TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Attendance Tokens table (100 Predefined Tokens Pool)
      db.run(`
        CREATE TABLE IF NOT EXISTS attendance_tokens (
          id TEXT PRIMARY KEY,
          token TEXT UNIQUE NOT NULL,
          qr_image_path TEXT,
          is_used INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Attendance Sessions table
      db.run(`
        CREATE TABLE IF NOT EXISTS attendance_sessions (
          id TEXT PRIMARY KEY,
          subject TEXT NOT NULL,
          department TEXT NOT NULL,
          year INTEGER NOT NULL,
          section TEXT NOT NULL,
          admin_lat REAL NOT NULL,
          admin_lng REAL NOT NULL,
          admin_latitude REAL,
          admin_longitude REAL,
          start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          expiry_time DATETIME NOT NULL,
          end_time DATETIME,
          duration_minutes INTEGER NOT NULL,
          attendance_code TEXT NOT NULL,
          active_token TEXT,
          token TEXT,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Attendance Records table
      db.run(`
        CREATE TABLE IF NOT EXISTS attendance_records (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          attendance_code TEXT,
          attendance_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          student_lat REAL NOT NULL,
          student_lng REAL NOT NULL,
          distance_meters REAL NOT NULL,
          status TEXT NOT NULL,
          device_fingerprint TEXT,
          notes TEXT,
          FOREIGN KEY (student_id) REFERENCES users(id),
          FOREIGN KEY (session_id) REFERENCES attendance_sessions(id)
        )
      `);

      // Create Attendance Backups table
      db.run(`
        CREATE TABLE IF NOT EXISTS attendance_backups (
          backup_id TEXT PRIMARY KEY,
          backup_name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          total_records INTEGER NOT NULL DEFAULT 0,
          backup_data TEXT NOT NULL
        )
      `);

      // Create Violation Logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS violation_logs (
          id TEXT PRIMARY KEY,
          student_id TEXT,
          student_name TEXT,
          roll_number TEXT,
          violation_type TEXT NOT NULL,
          details TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Login Logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS login_logs (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          ip_address TEXT,
          device TEXT,
          browser TEXT,
          FOREIGN KEY (student_id) REFERENCES users(id)
        )
      `);

      // Create Password Audit Logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS password_audit_logs (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          changed_by TEXT NOT NULL,
          action TEXT NOT NULL,
          changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES users(id)
        )
      `);

      // Create Institution Settings table
      db.run(`
        CREATE TABLE IF NOT EXISTS institution_settings (
          id TEXT PRIMARY KEY,
          institution_name TEXT DEFAULT 'KANDRIX AI Attendance System',
          logo_url TEXT,
          academic_year TEXT DEFAULT '2026-2027 (ODD)',
          semester_settings TEXT DEFAULT 'Odd Semester (V)',
          min_attendance_pct REAL DEFAULT 75.0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Seed Default Institution Settings
      db.get('SELECT COUNT(*) as count FROM institution_settings', [], (errInst, instRow) => {
        if (!errInst && instRow && instRow.count === 0) {
          db.run(
            `INSERT INTO institution_settings (id, institution_name, logo_url, academic_year, semester_settings, min_attendance_pct)
             VALUES ('inst-1', 'KANDRIX AI Attendance System', '', '2026-2027 (ODD)', 'Odd Semester (V)', 75.0)`
          );
        }
      });

      // Create Departments table
      db.run(`
        CREATE TABLE IF NOT EXISTS departments (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT UNIQUE NOT NULL,
          hod_name TEXT,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Seed Default AI & DS Department if empty
      db.get('SELECT COUNT(*) as count FROM departments', [], (errDept, deptRow) => {
        if (!errDept && deptRow && deptRow.count === 0) {
          db.run(
            `INSERT INTO departments (id, name, code, hod_name, description)
             VALUES ('dept-aids', 'AI & DS', 'AIDS', 'Mrs Vasanthapriya M J T', 'Artificial Intelligence & Data Science')`
          );
        }
      });

      // Create Courses table
      db.run(`
        CREATE TABLE IF NOT EXISTS courses (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT UNIQUE NOT NULL,
          duration_years INTEGER DEFAULT 4,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Seed Default Courses if empty
      db.get('SELECT COUNT(*) as count FROM courses', [], (errCourse, crsRow) => {
        if (!errCourse && crsRow && crsRow.count === 0) {
          db.run(`INSERT INTO courses (id, name, code, duration_years, description) VALUES ('crs-btech', 'B.Tech', 'BTECH', 4, 'Bachelor of Technology')`);
          db.run(`INSERT INTO courses (id, name, code, duration_years, description) VALUES ('crs-mtech', 'M.Tech', 'MTECH', 2, 'Master of Technology')`);
          db.run(`INSERT INTO courses (id, name, code, duration_years, description) VALUES ('crs-mba', 'MBA', 'MBA', 2, 'Master of Business Administration')`);
        }
      });

      // Create Batches table
      db.run(`
        CREATE TABLE IF NOT EXISTS batches (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          start_year INTEGER,
          end_year INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Seed Default Batches if empty
      db.get('SELECT COUNT(*) as count FROM batches', [], (errBatch, bthRow) => {
        if (!errBatch && bthRow && bthRow.count === 0) {
          db.run(`INSERT INTO batches (id, name, start_year, end_year) VALUES ('bth-2024-2028', '2024-2028', 2024, 2028)`);
          db.run(`INSERT INTO batches (id, name, start_year, end_year) VALUES ('bth-2025-2029', '2025-2029', 2025, 2029)`);
        }
      });

      // Create Semesters table
      db.run(`
        CREATE TABLE IF NOT EXISTS semesters (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          semester_number INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Seed Default Semesters if empty
      db.get('SELECT COUNT(*) as count FROM semesters', [], (errSem, semRow) => {
        if (!errSem && semRow && semRow.count === 0) {
          for (let i = 1; i <= 8; i++) {
            db.run(`INSERT INTO semesters (id, name, semester_number) VALUES ('sem-${i}', 'Semester ${i}', ${i})`);
          }
        }
      });

      // Create Sections table
      db.run(`
        CREATE TABLE IF NOT EXISTS sections (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          capacity INTEGER DEFAULT 60,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Seed Default Sections if empty
      db.get('SELECT COUNT(*) as count FROM sections', [], (errSec, secRow) => {
        if (!errSec && secRow && secRow.count === 0) {
          ['A', 'B', 'C', 'D'].forEach((sName) => {
            db.run(`INSERT INTO sections (id, name, capacity) VALUES ('sec-${sName.toLowerCase()}', '${sName}', 60)`);
          });
        }
      });

      // Create Class Portals table
      db.run(`
        CREATE TABLE IF NOT EXISTS class_portals (
          id TEXT PRIMARY KEY,
          portal_id TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          department TEXT NOT NULL,
          course TEXT NOT NULL,
          batch TEXT NOT NULL,
          semester INTEGER NOT NULL,
          section TEXT NOT NULL,
          advisor TEXT,
          room TEXT,
          max_students INTEGER DEFAULT 60,
          is_first_login INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Seed Default AI3A Class Portal if empty
      db.get('SELECT COUNT(*) as count FROM class_portals', [], (errPortal, portalRow) => {
        if (!errPortal && portalRow && portalRow.count === 0) {
          const defaultPassHash = bcrypt.hashSync('1234', 10);
          db.run(
            `INSERT INTO class_portals (id, portal_id, display_name, username, password_hash, department, course, batch, semester, section, advisor, room, max_students, is_first_login)
             VALUES ('cp-ai3a', 'AI-2024-SEM5-A', 'AI3A', 'AI3A', ?, 'AI & DS', 'B.Tech', '2024-2028', 5, 'A', 'Mrs Vasanthapriya M J T', '306', 60, 1)`,
            [defaultPassHash]
          );

          // Also seed corresponding faculty account for AI3A login compatibility
          db.run(
            `INSERT OR IGNORE INTO faculty (id, faculty_code, name, email, department, designation, assigned_class, assigned_section, password_hash, password_changed, must_change_password)
             VALUES ('cp-ai3a-fac', 'AI3A', 'Class Portal AI3A', 'ai3a@kandrix.ai', 'AI & DS', 'Class Advisor Portal', 'AI3A', 'A', ?, 0, 1)`,
            [defaultPassHash]
          );
        }
      });

      // Create Subjects table
      db.run(`
        CREATE TABLE IF NOT EXISTS subjects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT UNIQUE NOT NULL,
          type TEXT DEFAULT 'Theory',
          department TEXT NOT NULL,
          year INTEGER NOT NULL,
          semester INTEGER NOT NULL,
          section TEXT DEFAULT 'A',
          faculty_name TEXT,
          credits INTEGER DEFAULT 3,
          description TEXT,
          status TEXT DEFAULT 'Active',
          is_archived INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Timetables table
      db.run(`
        CREATE TABLE IF NOT EXISTS timetables (
          id TEXT PRIMARY KEY,
          department TEXT NOT NULL,
          year INTEGER NOT NULL,
          section TEXT NOT NULL,
          semester INTEGER DEFAULT 5,
          date TEXT,
          day TEXT NOT NULL,
          period_number INTEGER DEFAULT 1,
          subject_id TEXT,
          subject_name TEXT NOT NULL,
          faculty_id TEXT,
          faculty_name TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          room_number TEXT NOT NULL,
          academic_year TEXT DEFAULT '2026-2027 (ODD)',
          status TEXT DEFAULT 'ACTIVE',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create System Settings table
      db.run(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id INTEGER PRIMARY KEY DEFAULT 1,
          wifi_restriction_enabled INTEGER DEFAULT 0,
          allowed_ip_subnets TEXT DEFAULT '192.168.1.0/24,10.0.0.0/16',
          geofence_radius_meters REAL DEFAULT 30.0,
          grace_period_minutes INTEGER DEFAULT 5
        )
      `);

      // Run automatic schema migrations
      await runMigrations();

      // Seed Initial Admin (Vel Admin with credentials: vel / elite minds)
      const adminPasswordHash = await bcrypt.hash('elite minds', 10);

      // Seed Initial Admin ONLY if not existing (Vel Admin)
      db.run(
        `INSERT OR IGNORE INTO users (id, name, roll_number, email, role, department, year, section, phone, profile_photo, password_hash, must_change_password, is_first_login) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
        [
          'admin-1',
          'Vel Admin',
          'vel',
          'vel',
          'admin',
          'Computer Science & Engineering',
          0,
          'N/A',
          '+1-555-0192',
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
          adminPasswordHash
        ]
      );

      // Seed 100 Predefined Attendance Tokens
      for (const token of PREDEFINED_100_TOKENS) {
        db.run(
          `INSERT OR IGNORE INTO attendance_tokens (id, token, qr_image_path, is_used, is_active)
           VALUES (?, ?, ?, 0, 0)`,
          [uuidv4(), token, `/attendance_qr_codes/${token}.png`]
        );
      }

      // Seed Default System Settings
      db.run(
        `INSERT OR IGNORE INTO system_settings (id, wifi_restriction_enabled, allowed_ip_subnets, geofence_radius_meters, grace_period_minutes)
         VALUES (1, 0, '192.168.1.0/24', 30.0, 5)`
      );

      // Create Class Details table
      db.run(`
        CREATE TABLE IF NOT EXISTS class_details (
          id INTEGER PRIMARY KEY DEFAULT 1,
          department TEXT NOT NULL,
          year TEXT NOT NULL,
          section TEXT NOT NULL,
          semester TEXT NOT NULL,
          room TEXT NOT NULL,
          class_advisor TEXT NOT NULL,
          academic_year TEXT NOT NULL,
          batch TEXT NOT NULL
        )
      `, () => {
        db.run(
          `INSERT OR IGNORE INTO class_details (id, department, year, section, semester, room, class_advisor, academic_year, batch)
           VALUES (1, 'AI & DS', 'III Year', 'A', 'V', 'F305', 'Mrs Vasanthapriya M J T', '2026-2027 (ODD)', '2024-2028')`
        );
      });

      // Create Faculties table with extended schema
      db.run(`
        CREATE TABLE IF NOT EXISTS faculty (
          id TEXT PRIMARY KEY,
          faculty_code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          department TEXT,
          designation TEXT,
          email TEXT UNIQUE NOT NULL,
          phone TEXT,
          qualification TEXT,
          experience TEXT,
          specialization TEXT,
          profile_photo TEXT,
          status TEXT DEFAULT 'Active',
          password_hash TEXT NOT NULL,
          password_changed INTEGER DEFAULT 0,
          must_change_password INTEGER DEFAULT 0,
          last_login DATETIME,
          login_count INTEGER DEFAULT 0,
          failed_login_attempts INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, async () => {
        // Run column migrations on faculty table if created with legacy schema
        db.all('PRAGMA table_info(faculty)', [], (errFacCol, facCols) => {
          if (facCols) {
            const facColNames = facCols.map((c) => c.name.toLowerCase());
            const facMigrations = [
              { col: 'status', type: "TEXT DEFAULT 'Active'" },
              { col: 'password_changed', type: 'INTEGER DEFAULT 0' },
              { col: 'must_change_password', type: 'INTEGER DEFAULT 0' },
              { col: 'joining_date', type: 'TEXT' },
              { col: 'assigned_class', type: 'TEXT' },
              { col: 'assigned_section', type: 'TEXT' },
              { col: 'last_login', type: 'DATETIME' },
              { col: 'login_count', type: 'INTEGER DEFAULT 0' },
              { col: 'failed_login_attempts', type: 'INTEGER DEFAULT 0' },
              { col: 'updated_at', type: 'DATETIME' }
            ];
            facMigrations.forEach(({ col, type }) => {
              if (!facColNames.includes(col.toLowerCase())) {
                try {
                  db.run(`ALTER TABLE faculty ADD COLUMN ${col} ${type};`);
                } catch (e) {}
              }
            });
          }
        });

        // Seed official 6 faculty accounts for B.Tech AI & DS (Non-destructive)
        const bcrypt = require('bcryptjs');
        const defaultHash = await bcrypt.hash('1234', 10);
        
        const officialFaculties = [
          { id: 'FAC-001-ID', code: 'FAC001', name: 'NIVETHA P', desig: 'ASSISTANT PROFESSOR', dept: 'B.Tech- Artificial Intelligence and Data Science', qual: 'B.E(CSE).,M.E(CSE)', email: 'nivetha.p@velhightech.com', phone: '8838801690', spec: 'Programming Language for AI', photo: 'https://universitykart.b-cdn.net/Content/upload/admin/44wzl2yr.t4g.png' },
          { id: 'FAC-003-ID', code: 'FAC003', name: 'VASANTHAPRIYA M J T', desig: 'ASSISTANT PROFESSOR', dept: 'B.Tech- Artificial Intelligence and Data Science', qual: 'B.E(CSE).,M.E(CSE)', email: 'vasanthapriya@velhightech.com', phone: '7358724529', spec: 'Web Technology', photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150' },
          { id: 'FAC-007-ID', code: 'FAC007', name: 'KIRUTHIGA S', desig: 'ASSISTANT PROFESSOR', dept: 'B.Tech- Artificial Intelligence and Data Science', qual: 'M.E(CSE)', email: 'kiruthiga.s@velhightech.com', phone: '8668049226', spec: 'Knowledge Engineering', photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
          { id: 'FAC-008-ID', code: 'FAC008', name: 'GOWTHAMI K', desig: 'ASSISTANT PROFESSOR', dept: 'B.Tech- Artificial Intelligence and Data Science', qual: 'B.TECH(IT).,M.E(CSE)', email: 'k.gowthami@velhightech.com', phone: '7010330175', spec: 'Data Analytics', photo: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150' },
          { id: 'FAC-009-ID', code: 'FAC009', name: 'RAMAJAYAM A', desig: 'ASSISTANT PROFESSOR', dept: 'B.Tech- Artificial Intelligence and Data Science', qual: 'B.E(CSE).,M.E(CSE)', email: 'ramajayam.a@velhightech.com', phone: '6380301370', spec: 'Block Chain Technology', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
          { id: 'FAC-011-ID', code: 'FAC011', name: 'BALAARUNESH G', desig: 'ASSISTANT PROFESSOR', dept: 'B.Tech- Artificial Intelligence and Data Science', qual: 'B.E(ECE).,M.E(CSE)', email: 'balaaruneshg@velhightech.com', phone: '7904795396', spec: 'Mini Project & Technical Seminar', photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' }
        ];

        officialFaculties.forEach((f) => {
          db.run(
            `INSERT OR IGNORE INTO faculty (id, faculty_code, name, department, designation, email, phone, qualification, experience, specialization, profile_photo, status, password_hash, password_changed, must_change_password)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Teaching Faculty', ?, ?, 'Active', ?, 0, 1)`,
            [f.id, f.code, f.name, f.dept, f.desig, f.email, f.phone, f.qual, f.spec, f.photo, defaultHash]
          );

          // Insert Faculty Subject Mapping if not existing
          const mapId = `map-${f.code.toLowerCase()}`;
          db.run(
            `INSERT OR IGNORE INTO faculty_subject_mapping (id, faculty_id, subject_name, subject_code, department, year, section)
             VALUES (?, ?, ?, '21AI51T', 'AI & DS', 3, 'A')`,
            [mapId, f.id, f.spec]
          );
        });
      });

      // Automatic profile photo migration query (replace legacy unsplash URLs with official CDN photo)
      const officialPhoto = 'https://universitykart.b-cdn.net/Content/upload/admin/44wzl2yr.t4g.png';
      db.run(`UPDATE faculty SET profile_photo = ? WHERE profile_photo LIKE '%unsplash.com%' OR profile_photo IS NULL OR profile_photo = ''`, [officialPhoto]);
      db.run(`UPDATE users SET profile_photo = ? WHERE (role = 'faculty' OR role = 'admin') AND (profile_photo LIKE '%unsplash.com%' OR profile_photo IS NULL OR profile_photo = '')`, [officialPhoto]);

      // Create Faculty Subjects Mapping tables
      db.run(`
        CREATE TABLE IF NOT EXISTS faculty_subject_mapping (
          id TEXT PRIMARY KEY,
          faculty_id TEXT NOT NULL,
          subject_id TEXT,
          subject_name TEXT NOT NULL,
          subject_code TEXT NOT NULL,
          department TEXT,
          year INTEGER DEFAULT 3,
          section TEXT DEFAULT 'A',
          semester INTEGER DEFAULT 5,
          academic_year TEXT DEFAULT '2025-2026',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS faculty_timetable_mapping (
          id TEXT PRIMARY KEY,
          faculty_id TEXT NOT NULL,
          faculty_name TEXT,
          day TEXT NOT NULL,
          period TEXT NOT NULL,
          subject_id TEXT,
          subject_name TEXT NOT NULL,
          subject_code TEXT,
          section TEXT DEFAULT 'A',
          department TEXT DEFAULT 'AI & DS',
          year INTEGER DEFAULT 3,
          room_no TEXT DEFAULT 'F305',
          start_time TEXT,
          end_time TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS faculty_subjects (
          id TEXT PRIMARY KEY,
          faculty_id TEXT NOT NULL,
          subject_code TEXT NOT NULL,
          subject_name TEXT NOT NULL,
          department TEXT,
          year INTEGER,
          section TEXT
        )
      `, () => {
        db.run(`INSERT OR IGNORE INTO faculty_subjects (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FS-001', 'FAC-001-ID', '21AI51T', 'Programming Language for AI', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subjects (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FS-002', 'FAC-007-ID', '21AI55T', 'Knowledge Engineering', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subjects (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FS-003', 'FAC-008-ID', '21HI52T', 'Data Analytics', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subjects (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FS-004', 'FAC-003-ID', '21HI53IT', 'Web Technology', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subjects (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FS-005', 'FAC-009-ID', '21HC54T', 'Blockchain Technology', 'AI & DS', 3, 'A')`);

        db.run(`INSERT OR IGNORE INTO faculty_subject_mapping (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FSM-001', 'FAC-001-ID', '21AI51T', 'Programming Language for AI', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subject_mapping (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FSM-002', 'FAC-007-ID', '21AI55T', 'Knowledge Engineering', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subject_mapping (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FSM-003', 'FAC-008-ID', '21HI52T', 'Data Analytics', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subject_mapping (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FSM-004', 'FAC-003-ID', '21HI53IT', 'Web Technology', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subject_mapping (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FSM-005', 'FAC-009-ID', '21HC54T', 'Blockchain Technology', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subject_mapping (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FSM-006', 'FAC-008-ID', '21AI57P', 'Data Analytics Laboratory', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subject_mapping (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FSM-007', 'FAC-010-ID', '21AI57P', 'Data Analytics Laboratory', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subject_mapping (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FSM-008', 'FAC-011-ID', '21EE01P', 'Mini Project - I', 'AI & DS', 3, 'A')`);
        db.run(`INSERT OR IGNORE INTO faculty_subject_mapping (id, faculty_id, subject_code, subject_name, department, year, section) VALUES ('FSM-009', 'FAC-011-ID', '21EE03P', 'Technical Seminar', 'AI & DS', 3, 'A')`);
      });

      // Create Faculty Remarks table
      db.run(`
        CREATE TABLE IF NOT EXISTS faculty_remarks (
          id TEXT PRIMARY KEY,
          student_id TEXT NOT NULL,
          faculty_id TEXT NOT NULL,
          remark_type TEXT NOT NULL,
          comment TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Faculty Documents table
      db.run(`
        CREATE TABLE IF NOT EXISTS faculty_documents (
          id TEXT PRIMARY KEY,
          faculty_id TEXT NOT NULL,
          subject_code TEXT NOT NULL,
          unit TEXT NOT NULL,
          title TEXT NOT NULL,
          file_url TEXT NOT NULL,
          file_type TEXT DEFAULT 'PDF',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Faculty Announcements table
      db.run(`
        CREATE TABLE IF NOT EXISTS faculty_announcements (
          id TEXT PRIMARY KEY,
          faculty_id TEXT NOT NULL,
          subject_code TEXT,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Faculty Leave Requests table
      db.run(`
        CREATE TABLE IF NOT EXISTS faculty_leave_requests (
          id TEXT PRIMARY KEY,
          faculty_id TEXT NOT NULL,
          leave_type TEXT NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          reason TEXT NOT NULL,
          status TEXT DEFAULT 'Pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Faculty Activity Logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS faculty_activity_logs (
          id TEXT PRIMARY KEY,
          faculty_id TEXT NOT NULL,
          action TEXT NOT NULL,
          details TEXT,
          ip_address TEXT,
          device TEXT,
          browser TEXT,
          status TEXT DEFAULT 'Success',
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, () => {
        db.all('PRAGMA table_info(faculty_activity_logs)', [], (err, cols) => {
          if (cols) {
            const names = cols.map((c) => c.name.toLowerCase());
            if (!names.includes('ip_address')) db.run('ALTER TABLE faculty_activity_logs ADD COLUMN ip_address TEXT;');
            if (!names.includes('device')) db.run('ALTER TABLE faculty_activity_logs ADD COLUMN device TEXT;');
            if (!names.includes('browser')) db.run('ALTER TABLE faculty_activity_logs ADD COLUMN browser TEXT;');
            if (!names.includes('status')) db.run("ALTER TABLE faculty_activity_logs ADD COLUMN status TEXT DEFAULT 'Success';");
          }
        });
      });

      // Create Subjects table
      db.run(`
        CREATE TABLE IF NOT EXISTS subjects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT NOT NULL,
          department TEXT,
          year INTEGER,
          semester INTEGER,
          faculty_name TEXT,
          credits INTEGER DEFAULT 3,
          description TEXT,
          is_archived INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Timetables table & seed full weekly slots for AI & DS and Computer Science
      db.run(`
        CREATE TABLE IF NOT EXISTS timetables (
          id TEXT PRIMARY KEY,
          department TEXT,
          year INTEGER,
          section TEXT,
          semester INTEGER DEFAULT 5,
          date TEXT,
          day TEXT,
          period_number INTEGER,
          subject_name TEXT,
          faculty_name TEXT,
          start_time TEXT,
          end_time TEXT,
          room_number TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_timetables_slot ON timetables(department, year, section, day, period_number);
      `);

      // Create Spell Management table
      db.run(`
        CREATE TABLE IF NOT EXISTS spell_management (
          id TEXT PRIMARY KEY,
          spell_name TEXT NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          is_active INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, () => {
        db.get("SELECT COUNT(*) as count FROM spell_management", [], (err, row) => {
          if (!err && row && (row.count === 0 || row.count === '0')) {
            console.log('[DATABASE MIGRATION] Seeding initial active Spell 1...');
            db.run(
              `INSERT OR IGNORE INTO spell_management (id, spell_name, start_date, end_date, is_active)
               VALUES ('spell-default-1', 'Spell 1', '2026-08-01', '2026-09-30', 1)`
            );
          }
        });

        console.log('✅ Database initialized cleanly with Official Production Timetables & Spell Management.');
        resolve(true);
      });
    });
  });
}

const { isSupabaseActive, getPg, allPg, runPg } = require('./pgAdapter');


const dbWrapper = {
  get(sql, params, cb) {
    if (typeof params === 'function') {
      cb = params;
      params = [];
    }
    if (isSupabaseActive()) {
      getPg(sql, params)
        .then((row) => (cb ? cb(null, row) : null))
        .catch((err) => (cb ? cb(err, null) : null));
    } else {
      db.get(sql, params, cb);
    }
  },
  all(sql, params, cb) {
    if (typeof params === 'function') {
      cb = params;
      params = [];
    }
    if (isSupabaseActive()) {
      allPg(sql, params)
        .then((rows) => (cb ? cb(null, rows) : null))
        .catch((err) => (cb ? cb(err, null) : null));
    } else {
      db.all(sql, params, cb);
    }
  },
  run(sql, params, cb) {
    if (typeof params === 'function') {
      cb = params;
      params = [];
    }
    if (isSupabaseActive()) {
      runPg(sql, params)
        .then((res) => (cb ? cb.call(res, null) : null))
        .catch((err) => (cb ? cb(err) : null));
    } else {
      db.run(sql, params, cb);
    }
  },
  serialize(cb) {
    if (isSupabaseActive()) {
      if (cb) cb();
    } else {
      db.serialize(cb);
    }
  }
};

module.exports = { db: dbWrapper, rawSqliteDb: db, initDb, runMigrations, PREDEFINED_100_TOKENS, supabase };


