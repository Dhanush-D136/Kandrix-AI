const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const xlsx = require('xlsx');
const { db } = require('../database/db');

// List Students with search, filtering, attendance rates, and dashboard summary counts
function getStudents(req, res) {
  const { search, department, year, section, status, page = 1, limit = 50 } = req.query;

  let query = `
    SELECT u.id, u.name, u.roll_number, u.vh_number, u.email, u.department, u.year, u.section, u.phone, u.profile_photo, 
           u.device_fingerprint, u.must_change_password, u.first_login, u.password_changed, u.password_changed_at,
           u.dob, u.gender, u.blood_group, u.address, u.parent_name, u.parent_phone, u.bio, u.status, u.admission_year, u.username, u.portal_id, u.is_profile_locked, u.created_at,
           COUNT(DISTINCT ar.id) as attended_count,
           (SELECT COUNT(*) FROM attendance_sessions s WHERE s.department = u.department AND s.year = u.year AND s.section = u.section) as total_sessions
    FROM users u
    LEFT JOIN attendance_records ar ON u.id = ar.student_id
    WHERE u.role = 'student'
  `;

  const params = [];

  // Data Isolation: If Class Portal user, strictly scope to their portal_id container!
  if (req.user && req.user.role === 'class_portal') {
    const activePortalId = req.user.portal_id || req.user.username;
    query += ` AND u.portal_id = ?`;
    params.push(activePortalId);
  }

  if (search && search.trim() !== '') {
    query += ` AND (u.name LIKE ? OR u.roll_number LIKE ? OR u.vh_number LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
    const searchParam = `%${search.trim()}%`;
    params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
  }

  if (department && department !== 'All') {
    query += ` AND u.department = ?`;
    params.push(department);
  }

  if (year) {
    query += ` AND u.year = ?`;
    params.push(parseInt(year));
  }

  if (section) {
    query += ` AND u.section = ?`;
    params.push(section);
  }

  if (status) {
    query += ` AND COALESCE(u.status, 'Active') = ?`;
    params.push(status);
  }

  query += ` GROUP BY u.id ORDER BY u.roll_number ASC`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database query error: ' + err.message });

    const formattedStudents = (rows || []).map((st) => {
      const total = st.total_sessions || 0;
      const attended = st.attended_count || 0;
      let rate = 0;
      if (total > 0) {
        rate = Math.min(100, Math.round((attended / total) * 100));
      } else {
        rate = 0;
      }
      const isDefault = Boolean(st.must_change_password === 1 || st.first_login === 1 || st.password_changed === 0);
      return {
        ...st,
        status: st.status || 'Active',
        attendance_percentage: rate,
        password_status: isDefault ? 'Default Password' : 'Custom Password'
      };
    });

    // Compute Summary Stats for Top Cards scoped to active portal container
    let statsQuery = `SELECT id, status, must_change_password, first_login, password_changed FROM users WHERE role = 'student'`;
    let statsParams = [];
    if (req.user && req.user.role === 'class_portal') {
      const activePortalId = req.user.portal_id || req.user.username;
      statsQuery += ` AND portal_id = ?`;
      statsParams.push(activePortalId);
    }

    db.all(statsQuery, statsParams, (err2, allSts) => {
      const totalStudents = allSts ? allSts.length : formattedStudents.length;
      let activeStudents = 0;
      let inactiveStudents = 0;
      let defaultPasswordCount = 0;
      let customPasswordCount = 0;

      (allSts || []).forEach((st) => {
        const stStatus = st.status || 'Active';
        if (stStatus === 'Active') activeStudents++;
        else inactiveStudents++;

        const isDef = Boolean(st.must_change_password === 1 || st.first_login === 1 || st.password_changed === 0);
        if (isDef) defaultPasswordCount++;
        else customPasswordCount++;
      });

      // Count logged in today & active sessions
      const todayStr = new Date().toISOString().split('T')[0];
      db.get(
        `SELECT COUNT(DISTINCT student_id) as count FROM login_logs WHERE DATE(login_time) = DATE('now') OR login_time LIKE ?`,
        [`${todayStr}%`],
        (err3, loggedInRow) => {
          db.get(`SELECT COUNT(*) as count FROM attendance_sessions WHERE status = 'active'`, [], (err4, activeSessionsRow) => {
            res.json({
              students: formattedStudents,
              total: formattedStudents.length,
              summaryStats: {
                totalStudents,
                activeStudents,
                inactiveStudents,
                defaultPasswordCount,
                customPasswordCount,
                loggedInToday: loggedInRow ? loggedInRow.count : 0,
                activeSessions: activeSessionsRow ? activeSessionsRow.count : 0
              }
            });
          });
        }
      );
    });
  });
}

// Add Single Student with validation
async function createStudent(req, res) {
  let { name, roll_number, vh_number, department, year, section, phone, profile_photo, dob, gender, blood_group, address, parent_name, parent_phone, bio, username, status, admission_year } = req.body;

  if (!name || !roll_number) {
    return res.status(400).json({ error: 'Student Name and Register Number are required' });
  }

  // Derive VH Number if not provided directly
  let vh = vh_number ? vh_number.trim().toUpperCase() : '';
  if (!vh) {
    const num = roll_number.replace(/[^0-9]/g, '');
    vh = 'VH' + (num.length >= 4 ? num.slice(-5) : '13936');
  }

  // Auto-generate official Elite Minds Email ID from VH Number
  const autoEmail = `${vh.toLowerCase()}@velhightech.com`;
  department = department || 'AI & Data Science';
  year = year ? parseInt(year) : 3;
  section = section || 'A';

  const id = uuidv4();
  const defaultPasswordHash = await bcrypt.hash('1234', 10);
  const photo = profile_photo || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`;
  const studentStatus = status || 'Active';
  const uname = username || roll_number.trim();
  const portalId = (req.user && req.user.portal_id) ? req.user.portal_id : (req.body.portal_id || 'AI3A');

  db.run(
    `INSERT INTO users (id, name, roll_number, vh_number, email, role, department, year, section, phone, profile_photo, dob, gender, blood_group, address, parent_name, parent_phone, bio, status, admission_year, username, password_hash, must_change_password, is_first_login, first_login, password_changed, portal_id)
     VALUES (?, ?, ?, ?, ?, 'student', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, 0, ?)`,
    [id, name.trim(), roll_number.trim(), vh, autoEmail, department, year, section, phone || '', photo, dob || null, gender || null, blood_group || null, address || null, parent_name || null, parent_phone || null, bio || null, studentStatus, admission_year || new Date().getFullYear(), uname, defaultPasswordHash, portalId],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          if (err.message.includes('roll_number')) {
            return res.status(409).json({ error: 'Validation Error: Register Number must be unique.' });
          }
          if (err.message.includes('email') || err.message.includes('vh_number')) {
            return res.status(409).json({ error: 'Validation Error: VH Number or Email already exists.' });
          }
          return res.status(409).json({ error: 'Student with this Register Number or VH Email already exists.' });
        }
        return res.status(500).json({ error: 'Failed to create student: ' + err.message });
      }

      // Log initial creation into audit logs
      const auditId = uuidv4();
      db.run(
        `INSERT INTO password_audit_logs (id, student_id, changed_by, action, changed_at) VALUES (?, ?, 'Admin', 'Account Created (Default Password Assigned)', CURRENT_TIMESTAMP)`,
        [auditId, id]
      );

      res.status(201).json({
        message: `Student account created successfully with official email "${autoEmail}" and default password "1234".`,
        student: { id, name, roll_number, vh_number: vh, email: autoEmail, department, year, section, phone, profile_photo: photo, status: studentStatus, portal_id: portalId }
      });
    }
  );
}

// Edit Student
async function updateStudent(req, res) {
  const { id } = req.params;
  const { name, roll_number, vh_number, department, year, section, phone, profile_photo, dob, gender, blood_group, address, parent_name, parent_phone, bio, status, admission_year, new_password } = req.body;

  try {
    // If request is from a student user, check if profile editing is locked by Class Portal Advisor
    if (req.user && req.user.role === 'student') {
      const lockCheck = await new Promise((resLock) => {
        db.get("SELECT is_profile_locked FROM users WHERE id = ?", [id], (e, r) => resLock(r));
      });
      if (lockCheck && lockCheck.is_profile_locked === 1) {
        return res.status(403).json({ error: '🔒 Profile editing is currently locked by your Class Portal Incharge.' });
      }
    }

    const studentStatus = status || 'Active';
    let vh = vh_number ? vh_number.trim().toUpperCase() : '';
    if (!vh && roll_number) {
      const num = roll_number.replace(/[^0-9]/g, '');
      vh = 'VH' + (num.length >= 4 ? num.slice(-5) : '13936');
    }
    const autoEmail = vh ? `${vh.toLowerCase()}@velhightech.com` : undefined;

    if (new_password && new_password.trim() !== '') {
      const passwordHash = await bcrypt.hash(new_password.trim(), 10);
      db.run(
        `UPDATE users 
         SET name = ?, roll_number = ?, vh_number = COALESCE(?, vh_number), email = COALESCE(?, email), department = ?, year = ?, section = ?, phone = ?, profile_photo = COALESCE(?, profile_photo), dob = ?, gender = ?, blood_group = ?, address = ?, parent_name = ?, parent_phone = ?, bio = ?, status = ?, admission_year = ?, password_hash = ?, must_change_password = 0, is_first_login = 0, first_login = 0, password_changed = 1
         WHERE id = ? AND role = 'student'`,
        [name, roll_number, vh || null, autoEmail || null, department, parseInt(year), section, phone || '', profile_photo, dob || null, gender || null, blood_group || null, address || null, parent_name || null, parent_phone || null, bio || null, studentStatus, admission_year || null, passwordHash, id],
        function (err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(409).json({ error: 'Another student with this Register Number or Email already exists.' });
            }
            return res.status(500).json({ error: 'Failed to update student: ' + err.message });
          }

          const auditId = uuidv4();
          db.run(
            `INSERT INTO password_audit_logs (id, student_id, changed_by, action, changed_at) VALUES (?, ?, 'Admin', 'Password Updated by Admin', CURRENT_TIMESTAMP)`,
            [auditId, id]
          );

          res.json({ message: 'Student details & password updated successfully' });
        }
      );
    } else {
      db.run(
        `UPDATE users 
         SET name = ?, roll_number = ?, vh_number = COALESCE(?, vh_number), email = COALESCE(?, email), department = ?, year = ?, section = ?, phone = ?, profile_photo = COALESCE(?, profile_photo), dob = ?, gender = ?, blood_group = ?, address = ?, parent_name = ?, parent_phone = ?, bio = ?, status = ?, admission_year = ?
         WHERE id = ? AND role = 'student'`,
        [name, roll_number, vh || null, autoEmail || null, department, parseInt(year), section, phone || '', profile_photo, dob || null, gender || null, blood_group || null, address || null, parent_name || null, parent_phone || null, bio || null, studentStatus, admission_year || null, id],
        function (err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(409).json({ error: 'Another student with this Register Number or Email already exists.' });
            }
            return res.status(500).json({ error: 'Failed to update student: ' + err.message });
          }
          res.json({ message: 'Student information updated successfully' });
        }
      );
    }
  } catch (err) {
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
}

// Delete Single Student (Cascades attendance records, login logs, audit logs)
function deleteStudent(req, res) {
  const { id } = req.params;

  db.serialize(() => {
    db.run(`DELETE FROM attendance_records WHERE student_id = ?`, [id]);
    db.run(`DELETE FROM login_logs WHERE student_id = ?`, [id]);
    db.run(`DELETE FROM password_audit_logs WHERE student_id = ?`, [id]);
    db.run(`DELETE FROM users WHERE id = ? AND role = 'student'`, [id], function (err) {
      if (err) return res.status(500).json({ error: 'Failed to delete student account' });
      res.json({ message: 'Student account and associated attendance, login, and audit records deleted permanently.' });
    });
  });
}

// Bulk Delete Students
function bulkDeleteStudents(req, res) {
  const { studentIds } = req.body;

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: 'An array of student IDs is required for bulk deletion.' });
  }

  const placeholders = studentIds.map(() => '?').join(',');

  db.serialize(() => {
    db.run(`DELETE FROM attendance_records WHERE student_id IN (${placeholders})`, studentIds);
    db.run(`DELETE FROM login_logs WHERE student_id IN (${placeholders})`, studentIds);
    db.run(`DELETE FROM password_audit_logs WHERE student_id IN (${placeholders})`, studentIds);
    db.run(`DELETE FROM users WHERE id IN (${placeholders}) AND role = 'student'`, studentIds, function (err) {
      if (err) return res.status(500).json({ error: 'Failed to bulk delete student accounts: ' + err.message });
      res.json({ message: `Successfully deleted ${this.changes} student accounts and associated records permanently.` });
    });
  });
}

// Bulk Import Students (Supports Rich 18-Column Format, Legacy Sheets, Upsert, Portal Linking, Supabase Sync)
async function bulkImportStudents(req, res) {
  const studentsList = req.body.students;

  if (!Array.isArray(studentsList) || studentsList.length === 0) {
    return res.status(400).json({ error: 'Valid array of student records is required for bulk import.' });
  }

  const { queryPg, isSupabaseActive } = require('../database/pgAdapter');

  let insertedCount = 0;
  let updatedCount = 0;
  let errors = [];

  for (const st of studentsList) {
    try {
      // 1. Column Normalization
      const roll_number = String(
        st['Register No*'] || st['Register No.'] || st['Register No'] || st['Reg. No.'] || st['Reg No'] || st['Reg. No'] || st['RegNo'] || st['roll_number'] || st['Roll Number'] || st['Reg.No.'] || st['Reg.No'] || ''
      ).trim();

      const name = String(
        st['Student Name*'] || st['Student Name'] || st['Name'] || st['student_name'] || st['name'] || ''
      ).trim();

      if (!roll_number || !name) {
        errors.push(`Skipped row: Missing mandatory Register No or Student Name (Found roll: "${roll_number}", name: "${name}")`);
        continue;
      }

      const portal_id = String(
        st['Class Portal ID*'] || st['Class Portal ID'] || st['Portal ID'] || st['Portal'] || st['portal_id'] || req.user?.portal_id || req.body?.portal_id || 'AI3C'
      ).trim().toUpperCase();

      const department = String(
        st['Department*'] || st['Department'] || st['department'] || req.user?.department || 'AI & DS'
      ).trim();

      const year = parseInt(st['Year*'] || st['Year'] || st['year'] || 3, 10) || 3;
      const semester = parseInt(st['Semester*'] || st['Semester'] || st['semester'] || 5, 10) || 5;
      const section = String(st['Section*'] || st['Section'] || st['section'] || 'C').trim().toUpperCase();

      let vh_number = String(st['VH No'] || st['VH No.'] || st['VH Number'] || st['vh_number'] || st['VH'] || '').trim().toUpperCase();
      if (!vh_number) {
        const num = roll_number.replace(/[^0-9]/g, '');
        vh_number = 'VH' + (num.length >= 4 ? num.slice(-5) : '13936');
      }

      const email = String(st['Student Email'] || st['Email'] || st['email'] || '').trim() || `${vh_number.toLowerCase()}@velhightech.com`;
      const phone = String(st['Student Phone'] || st['Student Phone No'] || st['Student phone no'] || st['Phone'] || st['phone'] || '').trim();
      const parent_name = String(st['Parent Name'] || st['parent_name'] || '').trim();
      const parent_phone = String(st['Parent Phone'] || st['Parent Phone No'] || st['Parent Phone no'] || st['parent_phone'] || '').trim();
      const blood_group = String(st['Blood Group'] || st['blood_group'] || '').trim();
      const gender = String(st['Gender'] || st['gender'] || '').trim();
      const username = String(st['Username'] || st['username'] || roll_number).trim();
      const rawPassword = String(st['Default Password'] || st['Password'] || st['password'] || '1234').trim();

      const photo = st.profile_photo || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`;

      // 2. Ensure Class Portal Container exists in class_portals table
      await new Promise((resPort) => {
        db.get("SELECT id FROM class_portals WHERE portal_id = ? OR username = ?", [portal_id, portal_id], (ePort, foundCp) => {
          if (!foundCp) {
            const cpId = `cp-${portal_id.toLowerCase()}`;
            const defHash = bcrypt.hashSync('1234', 10);
            db.run(
              `INSERT OR IGNORE INTO class_portals (id, portal_id, portal_name, display_name, username, password_hash, department, room, max_students)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'F307', 60)`,
              [cpId, portal_id, `${portal_id} Portal`, portal_id, portal_id, defHash, department],
              () => resPort(true)
            );
          } else {
            resPort(true);
          }
        });
      });

      // 3. Upsert Check in Local SQLite
      const existingStudent = await new Promise((resolve) => {
        db.get("SELECT id FROM users WHERE roll_number = ? AND role = 'student'", [roll_number], (e, row) => resolve(row));
      });

      if (existingStudent) {
        // UPDATE existing student record
        const studentId = existingStudent.id;
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE users SET 
               name = ?, vh_number = ?, email = ?, department = ?, year = ?, section = ?,
               phone = ?, parent_name = ?, parent_phone = ?, blood_group = ?, gender = ?,
               portal_id = ?, username = ?
             WHERE id = ? AND role = 'student'`,
            [name, vh_number, email, department, year, section, phone, parent_name, parent_phone, blood_group, gender, portal_id, username, studentId],
            function (err) {
              if (err) reject(err);
              else resolve(true);
            }
          );
        });

        // Supabase PostgreSQL Update
        try {
          if (isSupabaseActive && isSupabaseActive()) {
            await queryPg(
              `UPDATE public.users SET 
                 name = $1, vh_number = $2, email = $3, department = $4, year = $5, section = $6,
                 phone = $7, parent_name = $8, parent_phone = $9, blood_group = $10, gender = $11,
                 portal_id = $12, username = $13
               WHERE roll_number = $14 AND role = 'student'`,
              [name, vh_number, email, department, year, section, phone, parent_name, parent_phone, blood_group, gender, portal_id, username, roll_number]
            );
          }
        } catch (pgErr) {
          console.warn(`Supabase PG update warning for ${roll_number}:`, pgErr.message);
        }

        updatedCount++;
      } else {
        // INSERT new student record
        const studentId = uuidv4();
        const password_hash = await bcrypt.hash(rawPassword, 10);

        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO users (
               id, name, roll_number, vh_number, email, role, department, year, section,
               phone, parent_name, parent_phone, blood_group, gender, portal_id, username, password_hash, profile_photo,
               status, first_login, is_first_login, must_change_password, password_changed
             ) VALUES (
               ?, ?, ?, ?, ?, 'student', ?, ?, ?,
               ?, ?, ?, ?, ?, ?, ?, ?, ?,
               'Active', 1, 1, 1, 0
             )`,
            [studentId, name, roll_number, vh_number, email, department, year, section, phone, parent_name, parent_phone, blood_group, gender, portal_id, username, password_hash, photo],
            function (err) {
              if (err) reject(err);
              else {
                const auditId = uuidv4();
                db.run(
                  `INSERT INTO password_audit_logs (id, student_id, changed_by, action, changed_at) VALUES (?, ?, 'Admin', 'Bulk Excel Import Account Setup', CURRENT_TIMESTAMP)`,
                  [auditId, studentId]
                );
                resolve(true);
              }
            }
          );
        });

        // Supabase PostgreSQL Insert
        try {
          if (isSupabaseActive && isSupabaseActive()) {
            await queryPg(
              `INSERT INTO public.users (
                 id, name, roll_number, vh_number, email, role, department, year, section,
                 phone, parent_name, parent_phone, blood_group, gender, portal_id, username, password_hash, profile_photo,
                 status, first_login, is_first_login, must_change_password, password_changed
               ) VALUES (
                 $1, $2, $3, $4, $5, 'student', $6, $7, $8,
                 $9, $10, $11, $12, $13, $14, $15, $16, $17,
                 'Active', 1, 1, 1, 0
               ) ON CONFLICT (roll_number) DO UPDATE SET
                 name = EXCLUDED.name, vh_number = EXCLUDED.vh_number, email = EXCLUDED.email,
                 department = EXCLUDED.department, year = EXCLUDED.year, section = EXCLUDED.section,
                 phone = EXCLUDED.phone, parent_name = EXCLUDED.parent_name, parent_phone = EXCLUDED.parent_phone,
                 blood_group = EXCLUDED.blood_group, gender = EXCLUDED.gender, portal_id = EXCLUDED.portal_id`,
              [studentId, name, roll_number, vh_number, email, department, year, section, phone, parent_name, parent_phone, blood_group, gender, portal_id, username, password_hash, photo]
            );
          }
        } catch (pgErr) {
          console.warn(`Supabase PG insert warning for ${roll_number}:`, pgErr.message);
        }

        insertedCount++;
      }
    } catch (e) {
      errors.push(`Error processing student "${st['Register No*'] || st['Register Number'] || st['Name']}": ${e.message}`);
    }
  }

  res.json({
    message: `Bulk import finished. Processed ${studentsList.length} records (${insertedCount} new created, ${updatedCount} existing updated).`,
    insertedCount,
    updatedCount,
    importedCount: insertedCount + updatedCount,
    errors
  });
}

// Reset Student Registered Hardware Device
function resetStudentDevice(req, res) {
  const { id } = req.params;
  db.run("UPDATE users SET device_fingerprint = NULL WHERE id = ? AND role = 'student'", [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to reset student device: ' + err.message });
    res.json({ message: 'Student registered device reset successfully! Next scan will auto-bind new device.' });
  });
}

// Admin Reset Student Password (Default 1234 or Custom Generated)
async function resetStudentPassword(req, res) {
  const { id } = req.params;
  const { resetType, customPassword } = req.body;

  let newPass = '1234';
  if (resetType === 'custom' && customPassword && customPassword.trim() !== '') {
    newPass = customPassword.trim();
  }

  const passwordHash = await bcrypt.hash(newPass, 10);

  db.run(
    "UPDATE users SET password_hash = ?, must_change_password = 1, is_first_login = 1, first_login = 1, password_changed = 0 WHERE id = ? AND role = 'student'",
    [passwordHash, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to reset student password: ' + err.message });

      const auditId = uuidv4();
      const actionText = resetType === 'custom' ? `Password Reset to Custom Password (${newPass})` : 'Password Reset to Default (1234)';
      db.run(
        `INSERT INTO password_audit_logs (id, student_id, changed_by, action, changed_at) VALUES (?, ?, 'Admin', ?, CURRENT_TIMESTAMP)`,
        [auditId, id, actionText]
      );

      res.json({
        message: `Student password reset successfully to "${newPass}". Student will be forced to change password during next login.`
      });
    }
  );
}

// Bulk Admin Reset Student Passwords
async function bulkResetStudentPasswords(req, res) {
  const { studentIds, resetType, customPassword } = req.body;

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: 'No student IDs provided for bulk password reset.' });
  }

  let newPass = '1234';
  if (resetType === 'custom' && customPassword && customPassword.trim() !== '') {
    newPass = customPassword.trim();
  }

  const passwordHash = await bcrypt.hash(newPass, 10);
  let updatedCount = 0;

  for (const stId of studentIds) {
    await new Promise((resolve) => {
      db.run(
        "UPDATE users SET password_hash = ?, must_change_password = 1, is_first_login = 1, first_login = 1, password_changed = 0 WHERE id = ? AND role = 'student'",
        [passwordHash, stId],
        function (err) {
          if (!err && this.changes > 0) {
            updatedCount++;
            const auditId = uuidv4();
            const actionText = resetType === 'custom' ? `Bulk Reset to Custom Temp Password (${newPass})` : 'Bulk Reset to Default Password (1234)';
            db.run(
              `INSERT INTO password_audit_logs (id, student_id, changed_by, action, changed_at) VALUES (?, ?, 'Admin', ?, CURRENT_TIMESTAMP)`,
              [auditId, stId, actionText]
            );
          }
          resolve(true);
        }
      );
    });
  }

  res.json({
    message: `Successfully reset passwords for ${updatedCount} student account(s) to temporary password "${newPass}". Mandatory password change flag applied.`,
    updatedCount
  });
}

// Force Student Password Change on Next Login
function forceStudentPasswordChange(req, res) {
  const { id } = req.params;
  db.run(
    "UPDATE users SET must_change_password = 1, is_first_login = 1, first_login = 1, password_changed = 0 WHERE id = ? AND role = 'student'",
    [id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to force password change: ' + err.message });

      const auditId = uuidv4();
      db.run(
        `INSERT INTO password_audit_logs (id, student_id, changed_by, action, changed_at) VALUES (?, ?, 'Admin', 'Force Password Change Flagged', CURRENT_TIMESTAMP)`,
        [auditId, id]
      );

      res.json({ message: 'Mandatory password change enforced for student on next login.' });
    }
  );
}

// Update Account Status (Active, Inactive, Locked, Suspended)
function updateStudentAccountStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['Active', 'Inactive', 'Locked', 'Suspended'].includes(status)) {
    return res.status(400).json({ error: 'Invalid account status value' });
  }

  db.run(
    "UPDATE users SET status = ? WHERE id = ? AND role = 'student'",
    [status, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update account status: ' + err.message });

      const auditId = uuidv4();
      const actionText = status === 'Locked' ? 'Account Locked' : status === 'Suspended' ? 'Account Suspended' : status === 'Active' ? 'Account Activated' : 'Account Deactivated';

      db.run(
        `INSERT INTO password_audit_logs (id, student_id, changed_by, action, changed_at) VALUES (?, ?, 'Admin', ?, CURRENT_TIMESTAMP)`,
        [auditId, id, actionText]
      );

      res.json({ message: `Student account status updated to "${status}".` });
    }
  );
}

// Get Comprehensive Student Profile Details (Modal View)
function getStudentProfileDetails(req, res) {
  const { id } = req.params;

  db.get('SELECT * FROM users WHERE id = ? AND role = "student"', [id], (err, student) => {
    if (err || !student) return res.status(404).json({ error: 'Student account not found' });

    // Attendance Summary
    db.all(
      `SELECT ar.*, s.subject, s.date as session_date, s.period_number 
       FROM attendance_records ar
       JOIN attendance_sessions s ON ar.session_id = s.id
       WHERE ar.student_id = ?
       ORDER BY ar.attendance_time DESC`,
      [id],
      (err2, records) => {
        db.get(
          `SELECT COUNT(*) as total_sessions FROM attendance_sessions WHERE department = ? AND year = ? AND section = ?`,
          [student.department || 'AI & Data Science', student.year || 3, student.section || 'A'],
          (err3, totalRow) => {
            const presentCount = (records || []).filter((r) => r.status === 'present').length;
            const totalSessions = totalRow ? totalRow.total_sessions : 0;
            const absentCount = Math.max(0, totalSessions - presentCount);
            const overallRate = totalSessions > 0 ? Math.min(100, Math.round((presentCount / totalSessions) * 100)) : 0;
            const lastAttendanceDate = records && records.length > 0 ? records[0].attendance_time : null;

            // Login History
            db.all(
              `SELECT * FROM login_logs WHERE student_id = ? ORDER BY login_time DESC LIMIT 20`,
              [id],
              (err4, loginLogs) => {
                res.json({
                  profile: student,
                  attendanceSummary: {
                    overallRate,
                    presentCount,
                    absentCount,
                    lastAttendanceDate
                  },
                  qrScanHistory: records || [],
                  loginHistory: loginLogs || []
                });
              }
            );
          }
        );
      }
    );
  });
}

// Login Activity Monitoring
function getLoginActivity(req, res) {
  const todayStr = new Date().toISOString().split('T')[0];

  db.all(
    `SELECT l.*, u.name as student_name, u.roll_number, u.department, u.year, u.section, u.profile_photo
     FROM login_logs l
     JOIN users u ON l.student_id = u.id
     ORDER BY l.login_time DESC LIMIT 100`,
    [],
    (err, logs) => {
      db.get(`SELECT COUNT(*) as totalStudents FROM users WHERE role = 'student'`, [], (err2, totalSts) => {
        db.get(
          `SELECT COUNT(DISTINCT student_id) as loggedInToday FROM login_logs WHERE DATE(login_time) = DATE('now') OR login_time LIKE ?`,
          [`${todayStr}%`],
          (err3, loggedInRow) => {
            db.get(
              `SELECT COUNT(DISTINCT student_id) as activeRightNow FROM login_logs WHERE login_time >= datetime('now', '-30 minutes')`,
              [],
              (err4, activeRow) => {
                res.json({
                  logs: logs || [],
                  stats: {
                    totalStudents: totalSts ? totalSts.totalStudents : 0,
                    loggedInToday: loggedInRow ? loggedInRow.loggedInToday : 0,
                    activeRightNow: activeRow ? activeRow.activeRightNow : 0
                  }
                });
              }
            );
          }
        );
      });
    }
  );
}

// Password Audit Logs History
function getPasswordAuditLogs(req, res) {
  db.all(
    `SELECT pal.*, u.name as student_name, u.roll_number, u.department, u.email
     FROM password_audit_logs pal
     JOIN users u ON pal.student_id = u.id
     ORDER BY pal.changed_at DESC LIMIT 100`,
    [],
    (err, logs) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch password audit logs: ' + err.message });
      res.json({ logs: logs || [] });
    }
  );
}

// Toggle Profile Lock for single student (Class Portal Incharge control)
function toggleStudentProfileLock(req, res) {
  const { id } = req.params;
  const { is_locked } = req.body; // 1 or 0

  const lockVal = (is_locked === 1 || is_locked === true || is_locked === '1') ? 1 : 0;

  db.run(`UPDATE users SET is_profile_locked = ? WHERE id = ? AND role = 'student'`, [lockVal, id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to update profile lock status: ' + err.message });

    // Supabase Sync
    const { queryPg, isSupabaseActive } = require('../database/pgAdapter');
    try {
      if (isSupabaseActive && isSupabaseActive()) {
        queryPg(`UPDATE public.users SET is_profile_locked = $1 WHERE id = $2 AND role = 'student'`, [lockVal, id]);
      }
    } catch (e) {}

    res.json({
      message: lockVal === 1 ? '🔒 Student profile editing locked.' : '🔓 Student profile editing unlocked.',
      is_profile_locked: lockVal
    });
  });
}

// Bulk Toggle Profile Lock for multiple students
function bulkToggleStudentProfileLock(req, res) {
  const { studentIds, is_locked } = req.body;
  const lockVal = (is_locked === 1 || is_locked === true || is_locked === '1') ? 1 : 0;

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: 'An array of student IDs is required for bulk profile locking.' });
  }

  const placeholders = studentIds.map(() => '?').join(',');
  db.run(`UPDATE users SET is_profile_locked = ? WHERE id IN (${placeholders}) AND role = 'student'`, [lockVal, ...studentIds], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to bulk update profile lock status: ' + err.message });

    // Supabase Sync
    const { queryPg, isSupabaseActive } = require('../database/pgAdapter');
    try {
      if (isSupabaseActive && isSupabaseActive()) {
        const pgPlaceholders = studentIds.map((_, idx) => `$${idx + 2}`).join(',');
        queryPg(`UPDATE public.users SET is_profile_locked = $1 WHERE id IN (${pgPlaceholders}) AND role = 'student'`, [lockVal, ...studentIds]);
      }
    } catch (e) {}

    res.json({
      message: lockVal === 1 ? `🔒 Locked profile editing for ${this.changes} students.` : `🔓 Unlocked profile editing for ${this.changes} students.`,
      updatedCount: this.changes,
      is_profile_locked: lockVal
    });
  });
}

module.exports = {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkDeleteStudents,
  bulkImportStudents,
  resetStudentDevice,
  resetStudentPassword,
  bulkResetStudentPasswords,
  forceStudentPasswordChange,
  updateStudentAccountStatus,
  getStudentProfileDetails,
  getLoginActivity,
  getPasswordAuditLogs,
  toggleStudentProfileLock,
  bulkToggleStudentProfileLock
};
