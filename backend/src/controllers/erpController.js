const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/db');

// --- Class Details (AI&DS III-A Single Class Focus) ---
function getClassDetails(req, res) {
  db.get('SELECT * FROM class_details WHERE id = 1', [], (err, details) => {
    if (err || !details) {
      return res.json({
        details: {
          department: 'AI & DS',
          year: 'III Year',
          section: 'A',
          semester: 'V',
          room: 'F305',
          class_advisor: 'Mrs Vasanthapriya M J T',
          academic_year: '2026-2027 (ODD)',
          batch: '2024-2028'
        }
      });
    }
    res.json({ details });
  });
}

function updateClassDetails(req, res) {
  const { department, year, section, semester, room, class_advisor, academic_year, batch } = req.body;
  db.run(
    `UPDATE class_details SET 
      department = ?, year = ?, section = ?, semester = ?, room = ?, 
      class_advisor = ?, academic_year = ?, batch = ? 
    WHERE id = 1`,
    [department, year, section, semester, room, class_advisor, academic_year, batch],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update class details' });
      res.json({ message: 'Class details updated successfully' });
    }
  );
}

// --- Faculty Controllers ---
function getFaculties(req, res) {
  db.all('SELECT * FROM faculties ORDER BY name ASC', [], (err, faculties) => {
    if (err) return res.status(500).json({ error: 'Database error fetching faculties' });
    res.json({ faculties });
  });
}

function createFaculty(req, res) {
  const { name, department, email } = req.body;
  if (!name) return res.status(400).json({ error: 'Faculty name is required' });

  const id = 'fac-' + uuidv4();
  db.run('INSERT INTO faculties (id, name, department, email) VALUES (?, ?, ?, ?)', [id, name, department || 'AI & DS', email || ''], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to create faculty record' });
    res.json({ message: 'Faculty created successfully', id });
  });
}

function updateFaculty(req, res) {
  const { id } = req.params;
  const { name, department, email } = req.body;

  db.run('UPDATE faculties SET name = ?, department = ?, email = ? WHERE id = ?', [name, department, email, id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to update faculty record' });
    res.json({ message: 'Faculty updated successfully' });
  });
}

function deleteFaculty(req, res) {
  const { id } = req.params;
  db.run('DELETE FROM faculties WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete faculty record' });
    res.json({ message: 'Faculty deleted successfully' });
  });
}

// --- Subject Controllers ---
function getSubjects(req, res) {
  const { faculty_name, department, semester, section, type } = req.query;

  let query = 'SELECT * FROM subjects WHERE (is_archived = 0 OR is_archived IS NULL)';
  const params = [];

  if (faculty_name) {
    query += ' AND LOWER(faculty_name) = LOWER(?)';
    params.push(faculty_name.trim());
  }

  if (department && department !== 'All') {
    const dClean = department.trim().toLowerCase();
    if (dClean.includes('ai') || dClean.includes('ds') || dClean.includes('data')) {
      query += ` AND (department LIKE '%AI%' OR department LIKE '%DS%' OR department LIKE '%Data%')`;
    } else {
      query += ` AND department = ?`;
      params.push(department);
    }
  }

  if (semester) {
    query += ' AND semester = ?';
    params.push(parseInt(semester));
  }

  if (section) {
    query += ' AND section = ?';
    params.push(section);
  }

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  query += ' ORDER BY name ASC';

  db.all(query, params, (err, subjects) => {
    if (err) return res.status(500).json({ error: 'Database error fetching subjects: ' + err.message });
    
    // Also fetch dynamic attendance stats for each subject
    db.all('SELECT * FROM attendance_sessions', [], (errSess, sessions) => {
      db.all('SELECT * FROM attendance_records', [], (errRec, records) => {
        db.all("SELECT COUNT(*) as total_students FROM users WHERE role = 'student'", [], (errStu, stuRow) => {
          const totalStudents = stuRow ? stuRow.total_students : 1;
          const sessList = sessions || [];
          const recList = records || [];

          const enrichedSubjects = (subjects || []).map((s) => {
            const matchedSessions = sessList.filter(
              (sess) => sess.subject.toLowerCase() === s.name.toLowerCase() || sess.subject.toLowerCase() === s.code.toLowerCase()
            );
            const classesHeld = matchedSessions.length;
            
            const sessionIds = new Set(matchedSessions.map((ms) => ms.id));
            const matchedRecords = recList.filter((r) => sessionIds.has(r.session_id) && r.status === 'present');
            const presentCount = matchedRecords.length;

            const totalPossible = classesHeld * totalStudents;
            const avgPercentage = classesHeld > 0 && totalPossible > 0 ? Math.min(100, Math.round((presentCount / totalPossible) * 100)) : null;

            return {
              ...s,
              type: s.type || 'Theory',
              section: s.section || 'A',
              status: s.status || 'Active',
              classesHeld,
              presentCount,
              absentCount: Math.max(0, (totalStudents * classesHeld) - presentCount),
              avgPercentage,
              attendance_percentage: avgPercentage
            };
          });

          res.json({ subjects: enrichedSubjects });
        });
      });
    });
  });
}

function autoMapSubjectToFaculty(subjectId, subjectName, subjectCode, department, year, section, semester, facultyName, callback) {
  if (!facultyName || facultyName.trim() === '') {
    if (callback) callback();
    return;
  }
  const cleanFacName = facultyName.trim();
  db.get(
    `SELECT id, name FROM faculty WHERE LOWER(TRIM(name)) = LOWER(?) OR LOWER(TRIM(email)) = LOWER(?) OR LOWER(TRIM(faculty_code)) = LOWER(?)`,
    [cleanFacName, cleanFacName, cleanFacName],
    (err, facRow) => {
      if (err || !facRow) {
        if (callback) callback();
        return;
      }
      const facultyId = facRow.id;
      const mapId1 = 'FS-' + uuidv4().slice(0, 8);
      const mapId2 = 'FSM-' + uuidv4().slice(0, 8);

      db.run(`DELETE FROM faculty_subjects WHERE subject_code = ? OR subject_name = ?`, [subjectCode, subjectName], () => {
        db.run(`DELETE FROM faculty_subject_mapping WHERE subject_code = ? OR subject_name = ? OR subject_id = ?`, [subjectCode, subjectName, subjectId], () => {
          db.run(
            `INSERT INTO faculty_subjects (id, faculty_id, subject_code, subject_name, department, year, section)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [mapId1, facultyId, subjectCode, subjectName, department || 'AI & DS', parseInt(year || 3), section || 'A'],
            () => {
              db.run(
                `INSERT INTO faculty_subject_mapping (id, faculty_id, subject_id, subject_name, subject_code, department, year, section, semester)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [mapId2, facultyId, subjectId, subjectName, subjectCode, department || 'AI & DS', parseInt(year || 3), section || 'A', parseInt(semester || 5)],
                () => {
                  db.run(
                    `UPDATE timetables SET faculty_id = ?, faculty_name = ? WHERE subject_name = ? OR subject_id = ?`,
                    [facultyId, facRow.name, subjectName, subjectId],
                    () => {
                      if (global.io) {
                        global.io.emit('faculty_mapping_updated', {
                          faculty_id: facultyId,
                          faculty_name: facRow.name,
                          subject_code: subjectCode,
                          subject_name: subjectName
                        });
                        global.io.emit('subject_mapped', { subject_id: subjectId, faculty_id: facultyId });
                      }
                      if (callback) callback();
                    }
                  );
                }
              );
            }
          );
        });
      });
    }
  );
}

function createSubject(req, res) {
  const { name, code, type, department, year, semester, section, faculty_name, credits, status, description } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Subject Name and Subject Code are required.' });

  const id = 'sub-' + uuidv4();
  const cleanName = name.trim();
  const cleanCode = code.trim().toUpperCase();
  const cleanFacName = faculty_name ? faculty_name.trim() : 'Faculty Member';

  db.run(
    `INSERT INTO subjects (id, name, code, type, department, year, semester, section, faculty_name, credits, description, status, is_archived) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      id,
      cleanName,
      cleanCode,
      type || 'Theory',
      department || 'AI & DS',
      parseInt(year || 3),
      parseInt(semester || 5),
      section || 'A',
      cleanFacName,
      parseInt(credits || 3),
      description || '',
      status || 'Active'
    ],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed') || err.message.includes('unique constraint') || err.message.includes('duplicate key')) {
          return res.status(409).json({ error: 'Subject code already exists. Please use a unique subject code.' });
        }
        return res.status(500).json({ error: 'Failed to create subject: ' + err.message });
      }
      autoMapSubjectToFaculty(id, cleanName, cleanCode, department || 'AI & DS', year || 3, section || 'A', semester || 5, cleanFacName, () => {
        broadcastTimetableEvent('subject_created', { id, name: cleanName, code: cleanCode, faculty_name: cleanFacName });
        res.status(201).json({ message: 'Subject created successfully, auto-mapped to faculty, and synchronized across modules!', id });
      });
    }
  );
}

function updateSubject(req, res) {
  const { id } = req.params;
  const { name, code, type, department, year, semester, section, faculty_name, credits, status, description } = req.body;

  const cleanName = name ? name.trim() : '';
  const cleanCode = code ? code.trim().toUpperCase() : '';
  const cleanFacName = faculty_name ? faculty_name.trim() : '';

  db.run(
    `UPDATE subjects 
     SET name = ?, code = ?, type = ?, department = ?, year = ?, semester = ?, section = ?, faculty_name = ?, credits = ?, status = ?, description = ? 
     WHERE id = ?`,
    [
      cleanName,
      cleanCode,
      type || 'Theory',
      department || 'AI & DS',
      parseInt(year || 3),
      parseInt(semester || 5),
      section || 'A',
      cleanFacName,
      parseInt(credits || 3),
      status || 'Active',
      description,
      id
    ],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update subject: ' + err.message });
      autoMapSubjectToFaculty(id, cleanName, cleanCode, department || 'AI & DS', year || 3, section || 'A', semester || 5, cleanFacName, () => {
        broadcastTimetableEvent('subject_updated', { id, name: cleanName, code: cleanCode, faculty_name: cleanFacName });
        res.json({ message: 'Subject updated successfully and auto-mapped across all modules!' });
      });
    }
  );
}

function toggleArchiveSubject(req, res) {
  const { id } = req.params;
  db.get('SELECT is_archived FROM subjects WHERE id = ?', [id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Subject not found' });
    const newArchived = row.is_archived === 1 ? 0 : 1;
    db.run('UPDATE subjects SET is_archived = ?, status = ? WHERE id = ?', [newArchived, newArchived ? 'Inactive' : 'Active', id], (err2) => {
      if (err2) return res.status(500).json({ error: 'Failed to archive subject' });
      broadcastTimetableEvent('subject_updated', { id, is_archived: newArchived });
      res.json({ message: newArchived ? 'Subject archived' : 'Subject restored', is_archived: newArchived });
    });
  });
}

function deleteSubject(req, res) {
  const { id } = req.params;
  db.get('SELECT name, code FROM subjects WHERE id = ?', [id], (getErr, subj) => {
    const subjName = subj ? subj.name : '';
    const subjCode = subj ? subj.code : '';

    // 1. Delete attendance records for sessions belonging to this subject
    db.run(
      `DELETE FROM attendance_records WHERE session_id IN (SELECT id FROM attendance_sessions WHERE subject = ? OR subject = ?)`,
      [subjName, subjCode],
      () => {
        // 2. Delete attendance sessions belonging to this subject
        db.run(`DELETE FROM attendance_sessions WHERE subject = ? OR subject = ?`, [subjName, subjCode], () => {
          // 3. Delete timetable entries belonging to this subject
          db.run(`DELETE FROM timetables WHERE subject_name = ? OR subject_id = ?`, [subjName, id], () => {
            // 4. Delete the subject itself
            db.run('DELETE FROM subjects WHERE id = ?', [id], function (err) {
              if (err) return res.status(500).json({ error: 'Failed to delete subject: ' + err.message });
              broadcastTimetableEvent('subject_deleted', { id, name: subjName });
              res.json({ message: `Subject '${subjName || id}' and its associated slots/sessions were removed successfully.` });
            });
          });
        });
      }
    );
  });
}

const { supabase } = require('../database/supabaseClient');

async function syncTimetableToSupabase(action, slotOrId) {
  if (!supabase) return;
  try {
    if (action === 'delete') {
      await supabase.from('timetables').delete().eq('id', slotOrId);
    } else {
      await supabase.from('timetables').upsert(slotOrId, { onConflict: 'id' });
    }
  } catch (err) {
    console.warn(`[SUPABASE DIRECT SYNC WARNING] ${err.message}`);
  }
}

// --- Helper to broadcast real-time timetable Socket.IO events ---
function broadcastTimetableEvent(eventType, payload) {
  if (global.io) {
    global.io.emit(eventType, payload);
    global.io.emit('timetable_updated', payload);
    global.io.emit('timetable_created', payload);
    global.io.emit('timetable_changed', { event: eventType, ...payload });
    console.log(`⚡ [REALTIME TIMETABLE SYNC] Socket.IO broadcast: '${eventType}'`, payload);
  }
}

function parseYearNumber(y) {
  if (y === undefined || y === null || y === '') return 3;
  if (typeof y === 'number' && !isNaN(y)) return y;
  const str = String(y).trim();
  const match = str.match(/\d+/);
  if (match) return parseInt(match[0], 10);
  if (str.includes('III') || str.includes('3')) return 3;
  if (str.includes('IV') || str.includes('4')) return 4;
  if (str.includes('II') || str.includes('2')) return 2;
  if (str.includes('I') || str.includes('1')) return 1;
  return 3;
}

// --- Timetable Controllers ---
function getTimetables(req, res) {
  const { department, year, section, day, date, subject, faculty, status, sort_by = 'period' } = req.query;
  let query = 'SELECT * FROM timetables WHERE 1=1';
  const params = [];

  if (department && department !== 'All' && department !== 'all') {
    const deptParam = department.includes('AI') ? '%AI%' : `%${department}%`;
    query += ' AND (department = ? OR department LIKE ? OR department IS NULL)';
    params.push(department, deptParam);
  }

  if (year && year !== 'All' && year !== 'all') {
    const yrNum = parseYearNumber(year);
    query += ' AND (year = ? OR year IS NULL)';
    params.push(yrNum);
  }

  if (section && section !== 'All' && section !== 'all') {
    query += ' AND (section = ? OR section IS NULL)';
    params.push(section);
  }

  if (day) {
    query += ' AND day = ?';
    params.push(day);
  }

  if (date) {
    query += ' AND (date = ? OR date IS NULL OR date = "")';
    params.push(date);
  }

  if (subject) {
    query += ' AND (subject_name LIKE ? OR subject_id = ?)';
    params.push(`%${subject}%`, subject);
  }

  if (faculty) {
    query += ' AND (faculty_name LIKE ? OR faculty_id = ?)';
    params.push(`%${faculty}%`, faculty);
  }

  if (status) {
    query += ' AND (status = ? OR status IS NULL OR status = "")';
    params.push(status);
  } else {
    query += " AND (status = 'ACTIVE' OR status IS NULL OR status = '')";
  }

  if (sort_by === 'date') {
    query += ' ORDER BY date DESC, CAST(period_number AS INTEGER) ASC, start_time ASC';
  } else if (sort_by === 'subject') {
    query += ' ORDER BY subject_name ASC, CAST(period_number AS INTEGER) ASC';
  } else if (sort_by === 'faculty') {
    query += ' ORDER BY faculty_name ASC, CAST(period_number AS INTEGER) ASC';
  } else {
    query += " ORDER BY CASE day WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 WHEN 'Sunday' THEN 7 ELSE 8 END, CAST(period_number AS INTEGER) ASC, start_time ASC";
  }
  db.all(query, params, (err, timetables) => {
    if (err) return res.status(500).json({ error: 'Database error fetching timetables: ' + err.message });
    res.json({ timetables: timetables || [] });
  });
}

// Student Timetable API: GET /api/timetable/student
function getStudentTimetable(req, res) {
  const studentId = req.query.student_id || req.user?.id;
  const rawDept = req.query.department || req.user?.department || 'AI & DS';
  const rawYr = req.query.year || req.user?.year || 3;
  const rawSec = req.query.section || req.user?.section || 'A';
  const rawSem = req.query.semester || req.user?.semester || 5;

  const yr = parseYearNumber(rawYr);
  const sec = (typeof rawSec === 'string' && rawSec.length === 1) ? rawSec : 'A';
  const sem = parseYearNumber(rawSem) || 5;

  const sql = `
    SELECT * FROM timetables 
    WHERE (status = 'ACTIVE' OR status IS NULL OR status = '')
    ORDER BY CASE day WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 WHEN 'Sunday' THEN 7 ELSE 8 END, CAST(period_number AS INTEGER) ASC, start_time ASC
  `;

  db.all(sql, [], (err, timetables) => {
    if (err) return res.status(500).json({ error: 'Database error fetching student timetable' });

    const allList = timetables || [];
    const deptClean = rawDept.toLowerCase();

    let filtered = allList.filter((t) => {
      const d = (t.department || '').toLowerCase();
      const matchDept = !d || d.includes('ai') || d.includes(deptClean) || deptClean.includes(d);
      const matchYr = !t.year || t.year == yr;
      const matchSec = !t.section || t.section === sec;
      return matchDept && matchYr && matchSec;
    });

    if (filtered.length === 0) {
      filtered = allList;
    }

    res.json({
      student_id: studentId,
      department: rawDept,
      year: yr,
      section: sec,
      semester: sem,
      timetables: filtered
    });
  });
}

// Faculty Timetable API: GET /api/timetable/faculty
function getFacultyTimetable(req, res) {
  const facultyId = req.query.faculty_id || req.user?.id || req.user?.faculty_code || 'FAC-001-ID';
  const facultyName = req.query.faculty_name || req.user?.name || '';

  db.get("SELECT * FROM faculty WHERE id = ? OR faculty_code = ? OR LOWER(name) = LOWER(?)", [facultyId, facultyId, facultyName], (err, fac) => {
    const matchedName = fac ? fac.name : facultyName;
    const searchParam = matchedName ? `%${matchedName.toLowerCase()}%` : '%';

    const isCommon = facultyId === 'FAC-COMMON' || (fac && fac.faculty_code === 'VEL TECH') || (req.user && (req.user.faculty_code === 'VEL TECH' || req.user.name === 'Faculty Common Check'));

    const sql = isCommon
      ? `SELECT * FROM timetables WHERE (status = 'ACTIVE' OR status IS NULL OR status = '') ORDER BY CASE day WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 ELSE 7 END, CAST(period_number AS INTEGER) ASC, start_time ASC`
      : `SELECT * FROM timetables WHERE (faculty_id = ? OR LOWER(faculty_name) LIKE ? OR faculty_id = ? OR LOWER(faculty_name) = LOWER(?)) AND (status = 'ACTIVE' OR status IS NULL OR status = '') ORDER BY CASE day WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 ELSE 7 END, CAST(period_number AS INTEGER) ASC, start_time ASC`;

    const sqlParams = isCommon ? [] : [facultyId, searchParam, fac ? fac.id : facultyId, matchedName];

    db.all(sql, sqlParams, (errTt, timetables) => {
      if (errTt) return res.status(500).json({ error: 'Database error fetching faculty timetable: ' + errTt.message });
      finishFacultyResponse(res, facultyId, matchedName, timetables || []);
    });
  });
}

function finishFacultyResponse(res, facultyId, matchedName, ttList) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = days[new Date().getDay()] || 'Monday';

  const todayClasses = ttList.filter((t) => (t.day || '').toLowerCase() === todayName.toLowerCase());

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const parseMins = (tStr) => {
    if (!tStr) return 0;
    const clean = tStr.trim();
    const parts = clean.split(' ');
    const timeParts = parts[0].split(':');
    let hrs = parseInt(timeParts[0]);
    const mins = parseInt(timeParts[1] || 0);
    if (parts[1] && parts[1].toUpperCase() === 'PM' && hrs < 12) hrs += 12;
    if (parts[1] && parts[1].toUpperCase() === 'AM' && hrs === 12) hrs = 0;
    return hrs * 60 + mins;
  };

  let currentActivePeriod = null;
  let nextPeriod = null;

  for (const slot of todayClasses) {
    const startM = parseMins(slot.start_time);
    const endM = parseMins(slot.end_time);
    if (nowMins >= startM && nowMins <= endM) {
      currentActivePeriod = slot;
    } else if (nowMins < startM && !nextPeriod) {
      nextPeriod = slot;
    }
  }

  res.json({
    faculty_id: facultyId,
    faculty_name: matchedName,
    todayDay: todayName,
    todayClasses,
    weeklyTimetable: ttList,
    timetables: ttList,
    currentActivePeriod,
    nextPeriod
  });
}

function createTimetable(req, res) {
  const {
    department = 'AI & DS',
    year = 3,
    section = 'A',
    semester = 5,
    date,
    day = 'Monday',
    period_number = 1,
    subject_id,
    subject_name,
    faculty_id,
    faculty_name,
    start_time,
    end_time,
    room_number = 'F305',
    academic_year = '2026-2027 (ODD)',
    status = 'ACTIVE'
  } = req.body;

  if (!subject_name || !faculty_name || !start_time) {
    return res.status(400).json({ error: 'Subject Name, Faculty Name, and Start Time are required.' });
  }

  const id = 'tt-' + uuidv4();
  const sql = `
    INSERT INTO timetables (id, department, year, section, semester, date, day, period_number, subject_id, subject_name, faculty_id, faculty_name, start_time, end_time, room_number, academic_year, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const newEntry = {
    id,
    department,
    year: parseInt(year || 3),
    section,
    semester: parseInt(semester || 5),
    date: date || null,
    day,
    period_number: parseInt(period_number || 1),
    subject_id: subject_id || null,
    subject_name: subject_name.trim(),
    faculty_id: faculty_id || null,
    faculty_name: faculty_name.trim(),
    start_time,
    end_time: end_time || '09:00 AM',
    room_number: room_number || 'F305',
    academic_year,
    status
  };

  // Check if a slot for this department, year, section, day, and period_number already exists
  db.get(
    `SELECT id FROM timetables WHERE (department = ? OR department LIKE ?) AND (year = ? OR year IS NULL) AND (section = ? OR section IS NULL) AND day = ? AND period_number = ?`,
    [newEntry.department, `%${newEntry.department}%`, newEntry.year, newEntry.section, newEntry.day, newEntry.period_number],
    (checkErr, existingSlot) => {
      if (existingSlot) {
        const updateSql = `
          UPDATE timetables 
          SET subject_id = ?, subject_name = ?, faculty_id = ?, faculty_name = ?, start_time = ?, end_time = ?, room_number = ?, semester = ?, date = ?, academic_year = ?, status = 'ACTIVE'
          WHERE id = ?
        `;
        db.run(
          updateSql,
          [
            newEntry.subject_id,
            newEntry.subject_name,
            newEntry.faculty_id,
            newEntry.faculty_name,
            newEntry.start_time,
            newEntry.end_time,
            newEntry.room_number,
            newEntry.semester,
            newEntry.date,
            newEntry.academic_year,
            existingSlot.id
          ],
          function (updateErr) {
            if (updateErr) return res.status(500).json({ error: 'Failed to update timetable slot: ' + updateErr.message });

            const updatedSlotObj = { ...newEntry, id: existingSlot.id };
            syncTimetableToSupabase('update', updatedSlotObj);
            broadcastTimetableEvent('timetable_updated', { action: 'updated', slot: updatedSlotObj });
            res.status(200).json({ message: `Timetable entry updated successfully for ${newEntry.day} Period ${newEntry.period_number}!`, id: existingSlot.id, timetable: updatedSlotObj });
          }
        );
      } else {
        db.run(
          sql,
          [
            newEntry.id,
            newEntry.department,
            newEntry.year,
            newEntry.section,
            newEntry.semester,
            newEntry.date,
            newEntry.day,
            newEntry.period_number,
            newEntry.subject_id,
            newEntry.subject_name,
            newEntry.faculty_id,
            newEntry.faculty_name,
            newEntry.start_time,
            newEntry.end_time,
            newEntry.room_number,
            newEntry.academic_year,
            newEntry.status
          ],
          function (err) {
            if (err) return res.status(500).json({ error: 'Failed to create timetable slot: ' + err.message });

            syncTimetableToSupabase('create', newEntry);

            // Trigger Socket.IO Realtime Sync
            broadcastTimetableEvent('timetable_created', { slot: newEntry });
            broadcastTimetableEvent('timetable_updated', { action: 'created', slot: newEntry });

            res.status(201).json({ message: 'Timetable entry created successfully and synchronized across all portals!', id, timetable: newEntry });
          }
        );
      }
    }
  );
}

function updateTimetable(req, res) {
  const { id } = req.params;
  const {
    department = 'AI & DS',
    year = 3,
    section = 'A',
    semester = 5,
    date,
    day = 'Monday',
    period_number = 1,
    subject_id,
    subject_name,
    faculty_id,
    faculty_name,
    start_time,
    end_time,
    room_number = 'F305',
    academic_year = '2026-2027 (ODD)',
    status = 'ACTIVE'
  } = req.body;

  const sql = `
    UPDATE timetables 
    SET department = ?, year = ?, section = ?, semester = ?, date = ?, day = ?, period_number = ?, subject_id = ?, subject_name = ?, faculty_id = ?, faculty_name = ?, start_time = ?, end_time = ?, room_number = ?, academic_year = ?, status = ?
    WHERE id = ?
  `;

  const updatedEntry = {
    id,
    department,
    year: parseInt(year || 3),
    section,
    semester: parseInt(semester || 5),
    date: date || null,
    day,
    period_number: parseInt(period_number || 1),
    subject_id: subject_id || null,
    subject_name,
    faculty_id: faculty_id || null,
    faculty_name,
    start_time,
    end_time,
    room_number,
    academic_year,
    status
  };

  db.run(
    sql,
    [
      updatedEntry.department,
      updatedEntry.year,
      updatedEntry.section,
      updatedEntry.semester,
      updatedEntry.date,
      updatedEntry.day,
      updatedEntry.period_number,
      updatedEntry.subject_id,
      updatedEntry.subject_name,
      updatedEntry.faculty_id,
      updatedEntry.faculty_name,
      updatedEntry.start_time,
      updatedEntry.end_time,
      updatedEntry.room_number,
      updatedEntry.academic_year,
      updatedEntry.status,
      id
    ],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update timetable entry: ' + err.message });

      syncTimetableToSupabase('update', updatedEntry);

      // Trigger Socket.IO Realtime Sync
      broadcastTimetableEvent('timetable_updated', { action: 'updated', slot: updatedEntry });

      res.json({ message: 'Timetable entry updated successfully and synchronized across all portals!', timetable: updatedEntry });
    }
  );
}

function deleteTimetable(req, res) {
  const { id } = req.params;
  db.run('DELETE FROM timetables WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete timetable entry: ' + err.message });

    syncTimetableToSupabase('delete', id);

    // Trigger Socket.IO Realtime Sync
    broadcastTimetableEvent('timetable_deleted', { id });
    broadcastTimetableEvent('timetable_updated', { action: 'deleted', id });

    res.json({ message: 'Timetable entry deleted successfully and synchronized across all portals!', id });
  });
}

// --- Real SQLite CRUD for Departments ---
function getDepartments(req, res) {
  db.all('SELECT * FROM departments ORDER BY name ASC', [], (err, departments) => {
    if (err) return res.status(500).json({ error: 'Database error fetching departments' });
    res.json({ departments: departments || [] });
  });
}

function createDepartment(req, res) {
  const { name, code, hod_name, description } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Department Name and Code are required' });

  const id = 'dept-' + uuidv4();
  db.run(
    'INSERT INTO departments (id, name, code, hod_name, description) VALUES (?, ?, ?, ?, ?)',
    [id, name.trim(), code.trim().toUpperCase(), hod_name || '', description || ''],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to create department: ' + err.message });
      res.status(201).json({ message: 'Department created successfully', id });
    }
  );
}

function updateDepartment(req, res) {
  const { id } = req.params;
  const { name, code, hod_name, description } = req.body;
  db.run(
    'UPDATE departments SET name = ?, code = ?, hod_name = ?, description = ? WHERE id = ?',
    [name.trim(), code.trim().toUpperCase(), hod_name || '', description || '', id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update department: ' + err.message });
      res.json({ message: 'Department updated successfully' });
    }
  );
}

function deleteDepartment(req, res) {
  const { id } = req.params;
  db.run('DELETE FROM departments WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete department' });
    res.json({ message: 'Department deleted successfully' });
  });
}

// --- Real SQLite CRUD for Courses ---
function getCourses(req, res) {
  db.all('SELECT * FROM courses ORDER BY name ASC', [], (err, courses) => {
    if (err) return res.status(500).json({ error: 'Database error fetching courses' });
    res.json({ courses: courses || [] });
  });
}

function createCourse(req, res) {
  const { name, code, duration_years, description } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Course Name and Code are required' });

  const id = 'crs-' + uuidv4();
  db.run(
    'INSERT INTO courses (id, name, code, duration_years, description) VALUES (?, ?, ?, ?, ?)',
    [id, name.trim(), code.trim().toUpperCase(), parseInt(duration_years || 4), description || ''],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to create course: ' + err.message });
      res.status(201).json({ message: 'Course created successfully', id });
    }
  );
}

function updateCourse(req, res) {
  const { id } = req.params;
  const { name, code, duration_years, description } = req.body;
  db.run(
    'UPDATE courses SET name = ?, code = ?, duration_years = ?, description = ? WHERE id = ?',
    [name.trim(), code.trim().toUpperCase(), parseInt(duration_years || 4), description || '', id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update course' });
      res.json({ message: 'Course updated successfully' });
    }
  );
}

function deleteCourse(req, res) {
  const { id } = req.params;
  db.run('DELETE FROM courses WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete course' });
    res.json({ message: 'Course deleted successfully' });
  });
}

// --- Real SQLite CRUD for Batches ---
function getBatches(req, res) {
  db.all('SELECT * FROM batches ORDER BY name DESC', [], (err, batches) => {
    if (err) return res.status(500).json({ error: 'Database error fetching batches' });
    res.json({ batches: batches || [] });
  });
}

function createBatch(req, res) {
  const { name, start_year, end_year } = req.body;
  if (!name) return res.status(400).json({ error: 'Batch name is required' });

  const id = 'bth-' + uuidv4();
  db.run(
    'INSERT INTO batches (id, name, start_year, end_year) VALUES (?, ?, ?, ?)',
    [id, name.trim(), parseInt(start_year || 2024), parseInt(end_year || 2028)],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to create batch: ' + err.message });
      res.status(201).json({ message: 'Batch created successfully', id });
    }
  );
}

function deleteBatch(req, res) {
  const { id } = req.params;
  db.run('DELETE FROM batches WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete batch' });
    res.json({ message: 'Batch deleted successfully' });
  });
}

// --- Real SQLite CRUD for Semesters ---
function getSemesters(req, res) {
  db.all('SELECT * FROM semesters ORDER BY semester_number ASC', [], (err, semesters) => {
    if (err) return res.status(500).json({ error: 'Database error fetching semesters' });
    res.json({ semesters: semesters || [] });
  });
}

function createSemester(req, res) {
  const { name, semester_number } = req.body;
  if (!name || !semester_number) return res.status(400).json({ error: 'Semester name and number are required' });

  const id = 'sem-' + uuidv4();
  db.run(
    'INSERT INTO semesters (id, name, semester_number) VALUES (?, ?, ?)',
    [id, name.trim(), parseInt(semester_number)],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to create semester: ' + err.message });
      res.status(201).json({ message: 'Semester created successfully', id });
    }
  );
}

// --- Real SQLite CRUD for Sections ---
function getSections(req, res) {
  db.all('SELECT * FROM sections ORDER BY name ASC', [], (err, sections) => {
    if (err) return res.status(500).json({ error: 'Database error fetching sections' });
    res.json({ sections: sections || [] });
  });
}

function createSection(req, res) {
  const { name, capacity } = req.body;
  if (!name) return res.status(400).json({ error: 'Section name is required' });

  const id = 'sec-' + uuidv4();
  db.run(
    'INSERT INTO sections (id, name, capacity) VALUES (?, ?, ?)',
    [id, name.trim().toUpperCase(), parseInt(capacity || 60)],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to create section: ' + err.message });
      res.status(201).json({ message: 'Section created successfully', id });
    }
  );
}

function deleteSection(req, res) {
  const { id } = req.params;
  db.run('DELETE FROM sections WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete section' });
    res.json({ message: 'Section deleted successfully' });
  });
}

// --- Real SQLite CRUD for Class Portals ---
function getClassPortals(req, res) {
  db.all('SELECT * FROM class_portals ORDER BY created_at DESC', [], (err, portals) => {
    if (err) return res.status(500).json({ error: 'Database error fetching class portals' });
    res.json({ class_portals: portals || [] });
  });
}

function generateClassPortal(req, res) {
  const bcrypt = require('bcryptjs');
  const { portal_name, display_name, portal_id, username, password, advisor, room, max_students } = req.body;

  const dispName = (display_name || portal_id || username || 'AI3A').trim();
  const portId = (portal_id || username || dispName).trim();
  const uname = (username || dispName).trim();
  const pName = (portal_name || dispName).trim();
  const defaultPass = password || '1234';
  const passHash = bcrypt.hashSync(defaultPass, 10);
  const id = 'cp-' + uuidv4();

  const finalizePortalCreation = (targetId) => {
    // 1. Seed Faculty / Staff Container (Account for Class Portal login)
    db.run(
      `INSERT OR REPLACE INTO faculty (id, faculty_code, name, email, department, designation, assigned_class, assigned_section, password_hash, password_changed, must_change_password)
       VALUES (?, ?, ?, ?, ?, 'Class Advisor Portal', ?, 'A', ?, 0, 1)`,
      [targetId, uname, `Class Portal ${dispName}`, `${uname.toLowerCase()}@kandrix.ai`, pName, dispName, passHash]
    );

    // 2. Seed Subjects Container for this class
    const defaultSubjects = [
      { code: 'CS51T', name: 'Programming Language for AI', type: 'Theory', credits: 3 },
      { code: 'CS55T', name: 'Knowledge Engineering', type: 'Theory', credits: 3 },
      { code: 'CS52T', name: 'Data Analytics', type: 'Theory', credits: 3 },
      { code: 'CS53IT', name: 'Web Technology', type: 'Theory', credits: 3 },
      { code: 'CS54T', name: 'Blockchain Technology', type: 'Theory', credits: 3 },
      { code: 'CS57P', name: 'Data Analytics Laboratory', type: 'Lab', credits: 2 }
    ];

    defaultSubjects.forEach((sub) => {
      const subId = `sub-${dispName.toLowerCase()}-${sub.code.toLowerCase()}`;
      db.run(
        `INSERT OR IGNORE INTO subjects (id, name, code, type, department, year, semester, section, faculty_name, credits, status, is_archived)
         VALUES (?, ?, ?, ?, ?, 3, 5, 'A', ?, ?, 'Active', 0)`,
        [subId, sub.name, sub.code, sub.type, pName, advisor || 'Staff', sub.credits]
      );
    });

    // 3. Seed Timetable Container for this class
    const defaultTtSlots = [
      { day: 'Monday', period: 1, name: 'Knowledge Engineering', start: '08:15 AM', end: '09:05 AM' },
      { day: 'Monday', period: 2, name: 'Programming Language for AI', start: '09:05 AM', end: '09:55 AM' },
      { day: 'Monday', period: 3, name: 'Data Analytics', start: '10:10 AM', end: '11:00 AM' },
      { day: 'Tuesday', period: 1, name: 'Data Analytics', start: '08:15 AM', end: '09:05 AM' },
      { day: 'Wednesday', period: 1, name: 'Web Technology', start: '08:15 AM', end: '09:05 AM' }
    ];

    defaultTtSlots.forEach((slot) => {
      const ttId = `tt-${dispName.toLowerCase()}-${slot.day.toLowerCase()}-p${slot.period}`;
      db.run(
        `INSERT OR IGNORE INTO timetables (id, department, year, section, semester, day, period_number, subject_name, faculty_name, start_time, end_time, room_number)
         VALUES (?, ?, 3, 'A', 5, ?, ?, ?, ?, ?, ?, ?)`,
        [ttId, pName, slot.day, slot.period, slot.name, advisor || 'Staff', slot.start, slot.end, room || '306']
      );
    });

    return res.status(200).json({
      message: `Class Portal ${dispName} configured successfully!`,
      portal: {
        id: targetId,
        portal_name: pName,
        portal_id: portId,
        display_name: dispName,
        username: uname,
        password: defaultPass,
        advisor: advisor || 'Class Advisor',
        room: room || '306',
        max_students: parseInt(max_students || 70)
      }
    });
  };

  db.get('SELECT id FROM class_portals WHERE username = ? OR portal_id = ?', [uname, portId], (checkErr, existing) => {
    if (existing) {
      db.run(
        `UPDATE class_portals 
         SET display_name = ?, password_hash = ?, advisor = ?, room = ?, max_students = ?
         WHERE id = ?`,
        [dispName, passHash, advisor || 'Class Advisor', room || '306', parseInt(max_students || 70), existing.id],
        function (updErr) {
          if (updErr) {
            console.error('[CLASS PORTAL UPDATE ERROR]', updErr);
            return res.status(500).json({ error: 'Failed to update Class Portal: ' + updErr.message });
          }
          finalizePortalCreation(existing.id);
        }
      );
    } else {
      db.run(
        `INSERT INTO class_portals 
        (id, portal_name, display_name, portal_id, username, password_hash, department, course, batch, semester, section, advisor, room, max_students, is_first_login)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'B.Tech', '2024-2028', 5, 'A', ?, ?, ?, 1)`,
        [id, pName, dispName, portId, uname, passHash, pName, advisor || 'Class Advisor', room || '306', parseInt(max_students || 70)],
        function (insErr) {
          if (insErr) {
            console.error('[CLASS PORTAL INSERT ERROR]', insErr);
            // Fallback insert without portal_name column if old SQLite table schema without portal_name column exists
            return db.run(
              `INSERT INTO class_portals 
              (id, portal_id, display_name, username, password_hash, department, course, batch, semester, section, advisor, room, max_students, is_first_login)
              VALUES (?, ?, ?, ?, ?, ?, 'B.Tech', '2024-2028', 5, 'A', ?, ?, ?, 1)`,
              [id, portId, dispName, uname, passHash, pName, advisor || 'Class Advisor', room || '306', parseInt(max_students || 70)],
              function (fallbackErr) {
                if (fallbackErr) {
                  console.error('[CLASS PORTAL FALLBACK INSERT ERROR]', fallbackErr);
                  return res.status(500).json({ error: 'Failed to create Class Portal: ' + fallbackErr.message });
                }
                finalizePortalCreation(id);
              }
            );
          }
          finalizePortalCreation(id);
        }
      );
    }
  });
}

function deleteClassPortal(req, res) {
  const { id } = req.params;
  db.run('DELETE FROM class_portals WHERE id = ? OR username = ?', [id, id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete class portal' });
    db.run('DELETE FROM faculty WHERE id = ? OR faculty_code = ?', [id, id]);
    res.json({ message: 'Class Portal deleted successfully' });
  });
}

// --- Institution Settings ---
function getInstitutionSettings(req, res) {
  db.get('SELECT * FROM institution_settings WHERE id = "inst-1"', [], (err, settings) => {
    if (err || !settings) {
      return res.json({
        settings: {
          institution_name: 'KANDRIX AI Attendance System',
          logo_url: '',
          academic_year: '2026-2027 (ODD)',
          semester_settings: 'Odd Semester (V)',
          min_attendance_pct: 75.0
        }
      });
    }
    res.json({ settings });
  });
}

function updateInstitutionSettings(req, res) {
  const { institution_name, logo_url, academic_year, semester_settings, min_attendance_pct } = req.body;
  db.run(
    `UPDATE institution_settings SET 
      institution_name = ?, logo_url = ?, academic_year = ?, semester_settings = ?, min_attendance_pct = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = "inst-1"`,
    [institution_name, logo_url || '', academic_year, semester_settings, parseFloat(min_attendance_pct || 75.0)],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update institution settings' });
      res.json({ message: 'Institution settings updated successfully' });
    }
  );
}

module.exports = {
  getClassDetails,
  updateClassDetails,
  getFaculties,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getSubjects,
  createSubject,
  updateSubject,
  toggleArchiveSubject,
  deleteSubject,
  getTimetables,
  getStudentTimetable,
  getFacultyTimetable,
  createTimetable,
  updateTimetable,
  deleteTimetable,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getBatches,
  createBatch,
  deleteBatch,
  getSemesters,
  createSemester,
  getSections,
  createSection,
  deleteSection,
  getClassPortals,
  generateClassPortal,
  deleteClassPortal,
  getInstitutionSettings,
  updateInstitutionSettings
};

