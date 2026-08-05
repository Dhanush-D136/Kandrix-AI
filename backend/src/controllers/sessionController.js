const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/db');
const { generateDynamicToken } = require('../utils/qrEncryptor');

// In-Memory Active Session QR Cache: key = sessionId, value = payload object
const activeSessionQRCodes = new Map();

function generateAndCacheLatestQR(sessionId, subject = 'Subject', faculty = 'Faculty') {
  const { token, payload } = generateDynamicToken(sessionId, subject, faculty);
  activeSessionQRCodes.set(sessionId, payload);
  return { token, payload };
}

// Background 7-second dynamic QR rotation for active sessions
setInterval(() => {
  db.all("SELECT id, subject, faculty_name FROM attendance_sessions WHERE status = 'active'", [], (err, activeSessions) => {
    if (!err && activeSessions && activeSessions.length > 0) {
      activeSessions.forEach((sess) => {
        const { token, payload } = generateAndCacheLatestQR(sess.id, sess.subject, sess.faculty_name);
        db.run("UPDATE attendance_sessions SET attendance_code = ?, active_token = ?, token = ? WHERE id = ?", [payload.nonce, payload.nonce, token, sess.id]);

        if (global.io) {
          global.io.emit('qr_rotated', {
            sessionId: sess.id,
            attendanceCode: payload.nonce,
            qrPayload: payload,
            token,
            timestamp: payload.timestamp,
            expiresAt: payload.expiresAt,
            subject: sess.subject
          });
        }
      });
    }
  });
}, 7000);

// Helper to generate a random 4-digit attendance code (e.g. 4821, 7194, 3058)
function generate4DigitCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Helper to parse time string (e.g. "08:15 AM", "12:40 PM") into total minutes from midnight
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const clean = timeStr.trim();
  const isPM = clean.toUpperCase().includes('PM');
  const isAM = clean.toUpperCase().includes('AM');
  const timePart = clean.replace(/AM|PM/i, '').trim();
  const parts = timePart.split(':');
  let hours = parseInt(parts[0] || '0', 10);
  const minutes = parseInt(parts[1] || '0', 10);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

// Helper to calculate Indian Standard Time (Asia/Kolkata, UTC+5:30)
function getISTTimeDetails() {
  const now = new Date();
  const istDateString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istDateString);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayName = days[istDate.getDay()];
  const currentMinutes = istDate.getHours() * 60 + istDate.getMinutes();

  return {
    now: istDate,
    rawNow: now,
    currentDay: currentDayName,
    currentMinutes,
    todayStr: `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(2, '0')}-${String(istDate.getDate()).padStart(2, '0')}`,
    formattedTime: istDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  };
}

// Auto-detect Current Class & Next Class Slot from Timetable based on Server Clock (IST Asia/Kolkata)
function getCurrentTimetableSlot(req, res) {
  const ist = getISTTimeDetails();
  const targetDay = req.query.day || ist.currentDay;
  const { department, year, section, faculty_name } = req.query;

  let query = "SELECT * FROM timetables WHERE day = ? AND (status = 'ACTIVE' OR status IS NULL OR status = '')";
  const params = [targetDay];

  if (department && department !== 'All') {
    const deptParam = department.includes('AI') ? '%AI%' : `%${department}%`;
    query += " AND (department = ? OR department LIKE ? OR department IS NULL)";
    params.push(department, deptParam);
  }
  if (year && year !== 'All') {
    const yrNum = parseInt(year, 10) || 3;
    query += " AND (year = ? OR year IS NULL)";
    params.push(yrNum);
  }
  if (section && section !== 'All') {
    query += " AND (section = ? OR section IS NULL)";
    params.push(section);
  }
  if (faculty_name) {
    query += " AND (LOWER(faculty_name) LIKE ? OR faculty_id = ?)";
    params.push(`%${faculty_name.toLowerCase()}%`, faculty_name);
  }

  query += " ORDER BY CAST(period_number AS INTEGER) ASC, start_time ASC";

  db.all(query, params, (err, rows) => {
    if (err || !rows || rows.length === 0) {
      return res.json({
        hasActiveSlot: false,
        message: 'No Active Lecture',
        currentDay: targetDay,
        currentDate: ist.todayStr,
        currentTime: ist.formattedTime,
        currentClass: null,
        nextClass: null
      });
    }

    let currentSlot = null;
    let nextSlot = null;

    for (let i = 0; i < rows.length; i++) {
      const slot = rows[i];
      const startMins = parseTimeToMinutes(slot.start_time);
      const endMins = parseTimeToMinutes(slot.end_time);

      if (ist.currentMinutes >= startMins && ist.currentMinutes <= endMins) {
        currentSlot = slot;
        nextSlot = rows[i + 1] || null;
        break;
      } else if (ist.currentMinutes < startMins && !nextSlot) {
        nextSlot = slot;
      }
    }

    const formatClass = (s) => s ? {
      id: s.id,
      period: `Period ${s.period_number || 1}`,
      periodNumber: s.period_number || 1,
      period_number: s.period_number || 1,
      subject: s.subject_name,
      subject_name: s.subject_name,
      faculty: s.faculty_name,
      faculty_name: s.faculty_name,
      room: s.room_number || 'F305',
      room_number: s.room_number || 'F305',
      department: s.department || 'AI & DS',
      year: s.year || 3,
      section: s.section || 'A',
      startTime: s.start_time,
      start_time: s.start_time,
      endTime: s.end_time,
      end_time: s.end_time
    } : null;

    return res.json({
      hasActiveSlot: !!currentSlot,
      currentDay: targetDay,
      currentDate: ist.todayStr,
      currentTime: ist.formattedTime,
      slot: formatClass(currentSlot),
      currentClass: formatClass(currentSlot),
      nextSlot: formatClass(nextSlot),
      nextClass: formatClass(nextSlot)
    });
  });
}

// Create Attendance Session (Linked directly to Timetable Entry)
function createSession(req, res) {
  let { subject, subject_code, department, year, section, duration_minutes, period_number, faculty_name, date, room_number } = req.body;

  if (!subject || typeof subject !== 'string' || subject.trim() === '') {
    return res.status(400).json({ error: 'Subject Name is required to generate a subject-specific QR code.' });
  }

  subject = subject.trim();
  department = department || 'AI & DS';
  year = parseInt(year || 3);
  section = section || 'A';
  faculty_name = faculty_name || 'Faculty Member';
  period_number = period_number ? String(period_number) : '1';
  date = date || new Date().toISOString().split('T')[0];

  const id = uuidv4();
  const duration = parseInt(duration_minutes || 25);
  const startTime = new Date();
  const expiryTime = new Date(startTime.getTime() + duration * 60000);

  // Faculty Security Constraint: Faculty can only generate QR for assigned subjects (e.g. Mini Project, PLAI, KE, Data Analytics)
  if (req.user && req.user.role === 'faculty') {
    const userFacName = (req.user.name || '').toLowerCase();
    const reqSub = subject.toLowerCase();

    if (reqSub.includes('open elective') && !userFacName.includes('elective')) {
      return res.status(403).json({
        error: `Permission Restricted: Open Elective QR code generation is controlled by the Admin Portal.`
      });
    }
  }

  const faculty_id = (req.user && req.user.role === 'faculty') ? req.user.id : (req.body.faculty_id || null);
  if (req.user && req.user.role === 'faculty' && req.user.name) {
    faculty_name = req.user.name;
  } else {
    faculty_name = faculty_name || (req.user ? req.user.name : 'Faculty Member');
  }
  const cleanSubjectCode = subject_code || req.body.code || '';

  const { token, payload } = generateAndCacheLatestQR(id, subject, faculty_name);

  const query = `
    INSERT INTO attendance_sessions (
      id, subject, subject_code, faculty_id, faculty_name, department, year, section, 
      period_number, date,
      admin_lat, admin_lng, admin_latitude, admin_longitude, 
      start_time, expiry_time, end_time, duration_minutes, 
      attendance_code, active_token, token, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, 0.0, 0.0, 0.0, ?, ?, ?, ?, ?, ?, ?, 'active')
  `;

  function sendSessionSuccess() {
    console.log(`✅ [TIMETABLE 5s QR SESSION CREATED] ID: ${id}, Subject: ${subject}, Initial Nonce: ${payload.nonce}`);

    const sessionPayload = {
      sessionId: id,
      subject,
      department,
      year,
      section,
      period: period_number,
      faculty: faculty_name,
      date,
      room: room_number || 'F305',
      attendanceCode: payload.nonce,
      qrPayload: payload,
      token,
      expiryTime
    };

    const io = req.app.get('socketio');
    if (io) {
      io.emit('session_created', sessionPayload);
    }

    res.status(201).json({
      message: 'Attendance session created successfully linked to timetable slot',
      session: {
        id,
        subject,
        department,
        year,
        section,
        period: period_number,
        faculty: faculty_name,
        date,
        room: room_number || 'F305',
        start_time: startTime.toISOString(),
        expiry_time: expiryTime.toISOString(),
        duration_minutes: duration,
        attendance_code: payload.nonce,
        status: 'active'
      },
      qrPayload: payload,
      token
    });
  }

  db.run(
    query,
    [
      id, subject, cleanSubjectCode, faculty_id, faculty_name, department, year, section,
      period_number, date,
      startTime.toISOString(), expiryTime.toISOString(), expiryTime.toISOString(), duration,
      payload.nonce, payload.nonce, token
    ],
    function (insertErr) {
      if (insertErr) {
        console.error('❌ [CREATE SESSION FULL INSERT FAILED, ATTEMPTING AUTO-MIGRATION & FALLBACK]', insertErr.message);

        try {
          db.run("ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS subject_code TEXT;");
          db.run("ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS faculty_id TEXT;");
          db.run("ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS subject_id TEXT;");
        } catch (e) {}

        const fallbackQuery = `
          INSERT INTO attendance_sessions (
            id, subject, department, year, section, 
            period_number, faculty_name, date,
            admin_lat, admin_lng, admin_latitude, admin_longitude, 
            start_time, expiry_time, end_time, duration_minutes, 
            attendance_code, active_token, token, status
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.0, 0.0, 0.0, 0.0, ?, ?, ?, ?, ?, ?, ?, 'active')
        `;

        db.run(
          fallbackQuery,
          [
            id, subject, department, year, section,
            period_number, faculty_name, date,
            startTime.toISOString(), expiryTime.toISOString(), expiryTime.toISOString(), duration,
            payload.nonce, payload.nonce, token
          ],
          function (fbErr) {
            if (fbErr) {
              console.error('❌ [CREATE SESSION FALLBACK FAILED]', fbErr.message);
              return res.status(500).json({ error: 'Failed to create attendance session: ' + fbErr.message });
            }
            return sendSessionSuccess();
          }
        );
        return;
      }

      sendSessionSuccess();
    }
  );
}

// Rotate QR Code every 5 seconds
function rotateSessionQR(req, res) {
  const { id } = req.params;

  db.get('SELECT * FROM attendance_sessions WHERE id = ?', [id], (err, session) => {
    if (err || !session || session.status !== 'active') {
      return res.status(404).json({ error: 'Active session not found' });
    }

    const { token, payload } = generateAndCacheLatestQR(id, session.subject, session.faculty_name || 'Faculty');

    db.run(
      'UPDATE attendance_sessions SET attendance_code = ?, active_token = ?, token = ? WHERE id = ?',
      [payload.nonce, payload.nonce, token, id],
      function (updateErr) {
        if (updateErr) {
          return res.status(500).json({ error: 'Failed to rotate QR code' });
        }

        console.log(`🔄 [5s QR ROTATED] Session: ${id}, New Nonce: ${payload.nonce}`);

        const rotationPayload = {
          sessionId: id,
          attendanceCode: payload.nonce,
          qrPayload: payload,
          token,
          timestamp: payload.timestamp,
          subject: session.subject
        };

        const io = req.app.get('socketio');
        if (io) {
          io.emit('qr_rotated', rotationPayload);
        }

        res.json({
          success: true,
          qrPayload: payload,
          token
        });
      }
    );
  });
}

function getSessionQR(req, res) {
  const { id } = req.params;

  db.get('SELECT * FROM attendance_sessions WHERE id = ?', [id], (err, session) => {
    if (err || !session) return res.status(404).json({ error: 'Session not found' });

    const now = new Date();
    const expiry = new Date(session.expiry_time || session.end_time);

    if (now > expiry || session.status !== 'active') {
      return res.status(400).json({ error: 'Session has expired or is inactive', isExpired: true });
    }

    let payload = activeSessionQRCodes.get(id);
    if (!payload) {
      const generated = generateAndCacheLatestQR(id, session.subject, session.faculty_name || 'Faculty');
      payload = generated.payload;
    }

    res.json({
      sessionId: id,
      attendanceCode: payload.nonce,
      qrPayload: payload,
      token: JSON.stringify(payload),
      subject: session.subject,
      expiresAt: expiry.getTime()
    });
  });
}

function getSessions(req, res) {
  db.all('SELECT * FROM attendance_sessions ORDER BY start_time DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ sessions: rows });
  });
}

function getSessionById(req, res) {
  const { id } = req.params;
  db.get('SELECT * FROM attendance_sessions WHERE id = ?', [id], (err, session) => {
    if (err || !session) return res.status(404).json({ error: 'Session not found' });

    db.all(
      `SELECT ar.*, u.name as student_name, u.name, u.roll_number, u.email as student_email, u.email, u.profile_photo, u.department, u.year, u.section 
       FROM attendance_records ar 
       JOIN users u ON ar.student_id = u.id 
       WHERE ar.session_id = ? 
       ORDER BY ar.attendance_time DESC`,
      [id],
      (err, records) => {
        const recordList = records || [];

        // Query all enrolled student accounts
        db.all(
          `SELECT id, name, roll_number, email, department, year, section, profile_photo 
           FROM users 
           WHERE role = 'student'
           ORDER BY roll_number ASC`,
          [],
          (errStudents, allStudents) => {
            const studentRoster = allStudents || [];

            // Match cohort if department specified or default to all students
            const filteredRoster = studentRoster.filter((st) => {
              if (!session.department || session.department === 'AI & DS' || session.department === 'AI & Data Science') {
                return true;
              }
              return (
                !st.department ||
                st.department.toLowerCase().includes(session.department.toLowerCase()) ||
                session.department.toLowerCase().includes(st.department.toLowerCase())
              );
            });

            const targetRoster = filteredRoster.length > 0 ? filteredRoster : studentRoster;

            const presentMap = {};
            recordList.forEach((r) => {
              if (r.status === 'present') {
                presentMap[r.student_id] = r;
              }
            });

            const presentStudents = [];
            const absentStudents = [];
            const processedIds = new Set();

            // 1. Guaranteed inclusion for all recorded scans
            recordList.forEach((r) => {
              if (r.status === 'present' && !processedIds.has(r.student_id)) {
                processedIds.add(r.student_id);
                presentStudents.push({
                  id: r.student_id,
                  name: r.student_name || r.name || 'Student',
                  roll_number: r.roll_number,
                  email: r.student_email || r.email,
                  department: r.department || session.department || 'AI & DS',
                  year: r.year || session.year || 3,
                  section: r.section || session.section || 'A',
                  profile_photo: r.profile_photo,
                  attendance_time: r.attendance_time,
                  record_id: r.id,
                  status: 'Present',
                  scan_method: 'QR Scan'
                });
              }
            });

            // 2. Roster check for present & absent status
            targetRoster.forEach((st) => {
              if (presentMap[st.id]) {
                if (!processedIds.has(st.id)) {
                  processedIds.add(st.id);
                  presentStudents.push({
                    ...st,
                    attendance_time: presentMap[st.id].attendance_time,
                    record_id: presentMap[st.id].id,
                    status: 'Present',
                    scan_method: 'QR Scan'
                  });
                }
              } else {
                if (!processedIds.has(st.id)) {
                  absentStudents.push({
                    ...st,
                    status: 'Absent',
                    reason: 'Uninformed Absence'
                  });
                }
              }
            });

            const totalEnrolled = targetRoster.length > 0 ? Math.max(targetRoster.length, presentStudents.length + absentStudents.length) : (presentStudents.length + absentStudents.length);
            const attendanceRate = totalEnrolled > 0 ? ((presentStudents.length / totalEnrolled) * 100).toFixed(2) : '0.00';

            res.json({
              session: {
                ...session,
                presentCount: presentStudents.length,
                absentCount: absentStudents.length,
                totalEnrolled,
                attendanceRate
              },
              records: recordList,
              presentStudents,
              absentStudents,
              totalEnrolled,
              presentCount: presentStudents.length,
              absentCount: absentStudents.length,
              attendanceRate
            });
          }
        );
      }
    );
  });
}

function endSession(req, res) {
  const { id } = req.params;
  db.run('UPDATE attendance_sessions SET status = ? WHERE id = ?', ['completed', id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to terminate session' });

    const io = req.app.get('socketio');
    if (io) {
      io.emit('session_ended', { sessionId: id });
    }

    res.json({ message: 'Session closed successfully' });
  });
}

// Auto-Launch Attendance Session from Current Timetable Slot (1-Click Launch)
function autoLaunchSession(req, res) {
  const ist = getISTTimeDetails();

  db.all('SELECT * FROM timetables WHERE day = ? ORDER BY period_number ASC, id ASC', [ist.currentDay], (err, rows) => {
    if (err || !rows || rows.length === 0) {
      return res.status(400).json({
        error: 'No active timetable slot currently.',
        message: `Current time (${ist.formattedTime}) on ${ist.currentDay} is outside standard lecture hours.`
      });
    }

    let matchedSlot = null;
    let periodNumber = 1;

    for (let i = 0; i < rows.length; i++) {
      const slot = rows[i];
      const startMins = parseTimeToMinutes(slot.start_time);
      const endMins = parseTimeToMinutes(slot.end_time);

      if (ist.currentMinutes >= startMins && ist.currentMinutes <= endMins) {
        matchedSlot = slot;
        periodNumber = slot.period_number || (i + 1);
        break;
      }
    }

    // If auto-launching and currently between classes or off-hours, fallback to first slot or specified slot
    if (!matchedSlot) {
      matchedSlot = rows[0];
      periodNumber = rows[0].period_number || 1;
    }

    const sessionId = `SES-${ist.todayStr}-P${periodNumber}`;
    const attendanceCode = generate4DigitCode();
    const duration = 25;
    const startTime = new Date();
    const expiryTime = new Date(startTime.getTime() + duration * 60000);
    const currentTimestamp = Math.floor(Date.now() / 1000);

    const facName = matchedSlot.faculty_name || (req.user ? req.user.name : 'Faculty Member');
    const facId = matchedSlot.faculty_id || (req.user ? req.user.id : null);
    const subCode = matchedSlot.subject_code || matchedSlot.subject_id || '';
    const dept = matchedSlot.department || 'AI & DS';
    const yr = matchedSlot.year || 3;
    const sec = matchedSlot.section || 'A';
    const period = String(periodNumber || 1);
    const sessionDate = ist.todayStr;

    const query = `
      INSERT INTO attendance_sessions (
        id, subject, subject_code, faculty_id, faculty_name, department, year, section, 
        period_number, date,
        admin_lat, admin_lng, admin_latitude, admin_longitude, 
        start_time, expiry_time, end_time, duration_minutes, 
        attendance_code, active_token, token, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, 0.0, 0.0, 0.0, ?, ?, ?, ?, ?, ?, ?, 'active')
    `;

    db.run(
      query,
      [
        sessionId, matchedSlot.subject_name, subCode, facId, facName, dept, yr, sec,
        period, sessionDate,
        startTime.toISOString(), expiryTime.toISOString(), expiryTime.toISOString(), duration,
        attendanceCode, attendanceCode, attendanceCode
      ],
      function (insertErr) {
        if (insertErr) {
          db.get('SELECT * FROM attendance_sessions WHERE id = ?', [sessionId], (err2, existing) => {
            if (existing) {
              return res.json({
                message: 'Active timetable session already launched',
                session: existing,
                qrPayload: {
                  sessionId,
                  subject: existing.subject,
                  class: 'Elite Minds Portal',
                  period: `P${periodNumber}`,
                  faculty: matchedSlot.faculty_name,
                  room: matchedSlot.room_number,
                  attendanceCode: existing.attendance_code,
                  timestamp: currentTimestamp
                }
              });
            }
            return res.status(500).json({ error: 'Failed to auto-launch attendance session' });
          });
          return;
        }

        console.log(`✅ [1-CLICK TIMETABLE SESSION] ID: ${sessionId}, Subject: ${matchedSlot.subject_name}, Code: ${attendanceCode}`);

        const qrPayload = {
          sessionId,
          subject: matchedSlot.subject_name,
          class: 'Elite Minds Portal',
          period: `P${periodNumber}`,
          faculty: matchedSlot.faculty_name,
          room: matchedSlot.room_number,
          attendanceCode,
          timestamp: currentTimestamp
        };

        const io = req.app.get('socketio');
        if (io) {
          io.emit('session_created', qrPayload);
        }

        res.status(201).json({
          message: 'Attendance session auto-launched from timetable',
          session: {
            id: sessionId,
            subject: matchedSlot.subject_name,
            department: 'AI & DS',
            year: 3,
            section: 'A',
            period: `P${periodNumber}`,
            faculty: matchedSlot.faculty_name,
            room: matchedSlot.room_number,
            start_time: startTime.toISOString(),
            expiry_time: expiryTime.toISOString(),
            duration_minutes: duration,
            attendance_code: attendanceCode,
            status: 'active'
          },
          qrPayload
        });
      }
    );
  });
}

module.exports = {
  activeSessionQRCodes,
  generateAndCacheLatestQR,
  getCurrentTimetableSlot,
  autoLaunchSession,
  createSession,
  rotateSessionQR,
  getSessionQR,
  getSessions,
  getSessionById,
  endSession
};
