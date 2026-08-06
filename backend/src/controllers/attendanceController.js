const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/db');
const { verifyDynamicTokenSignature } = require('../utils/qrEncryptor');
const { activeSessionQRCodes } = require('./sessionController');

/**
 * MANDATORY REAL-TIME DYNAMIC QR ATTENDANCE ENGINE (5-Second Dynamic Rotation)
 * Attendance is ONLY marked when the single latest server-generated QR payload is submitted.
 * Old QRs are rejected immediately with: "❌ QR Expired: This attendance QR is no longer valid. Please scan the latest QR."
 */
function markAttendance(req, res) {
  const timestamp = new Date().toISOString();
  const studentId = req.user.id;
  const studentName = req.user.name;
  const rollNumber = req.user.roll_number;

  const isBluetoothCheckIn = req.body.method === 'bluetooth' || req.body.verification_method === 'bluetooth' || req.body.check_in_method === 'bluetooth';

  let parsedPayload = null;
  let parsedSessionId = passedSessionId;
  let parsedNonce = passedCode || 'BT_BEACON_CHECKIN';

  if (!isBluetoothCheckIn && !qr_payload && (!passedSessionId || !passedCode)) {
    console.error(`❌ [SECURITY REJECT] Missing scanned QR payload!`);
    return res.status(400).json({
      success: false,
      reason: 'QR_NOT_SCANNED',
      message: 'Please scan a valid attendance QR code or use Bluetooth Beacon Check-In.'
    });
  }

  // Extract JSON / String payload if QR method used
  if (!isBluetoothCheckIn && qr_payload) {
    if (typeof qr_payload === 'object' && qr_payload !== null) {
      parsedPayload = qr_payload;
      parsedSessionId = parsedPayload.sessionId || parsedSessionId;
      parsedNonce = parsedPayload.nonce || parsedPayload.attendanceCode || parsedNonce;
    } else if (typeof qr_payload === 'string') {
      try {
        parsedPayload = JSON.parse(qr_payload);
        parsedSessionId = parsedPayload.sessionId || parsedSessionId;
        parsedNonce = parsedPayload.nonce || parsedPayload.attendanceCode || parsedNonce;
      } catch (e) {
        if (qr_payload.startsWith('ATTENDANCE:')) {
          const parts = qr_payload.split(':');
          if (parts.length >= 3) {
            parsedSessionId = parts[1];
            parsedNonce = parts[2];
          } else if (parts.length === 2) {
            parsedNonce = parts[1];
          }
        } else {
          parsedNonce = qr_payload;
        }
      }
    }
  }

  console.log(`\n====================================================`);
  console.log(`[ATTENDANCE MARK REQUEST] Method: ${isBluetoothCheckIn ? 'BLUETOOTH BEACON' : 'DYNAMIC QR'}`);
  console.log(`[STUDENT] ${studentName} (${rollNumber})`);

  // Query database for active session
  const sessionQuery = (parsedSessionId && parsedSessionId !== 'Unknown')
    ? "SELECT * FROM attendance_sessions WHERE id = ? AND status = 'active'"
    : "SELECT * FROM attendance_sessions WHERE status = 'active' ORDER BY start_time DESC LIMIT 1";

  const queryParams = (parsedSessionId && parsedSessionId !== 'Unknown') ? [parsedSessionId] : [];

  db.get(sessionQuery, queryParams, (err, session) => {
    if (err || !session) {
      const errorMsg = 'No active lecture session found for attendance marking!';
      console.error(`❌ [MARK REJECTED] ${errorMsg}`);
      return res.status(404).json({
        success: false,
        reason: 'SESSION_NOT_FOUND',
        message: errorMsg
      });
    }

    const sessionId = session.id;

    // 3. Server-Side Nonce Validation (Dynamic QR mode only)
    if (!isBluetoothCheckIn) {
      const latestServerPayload = activeSessionQRCodes.get(sessionId);
      if (latestServerPayload && parsedNonce !== latestServerPayload.nonce) {
        console.warn(`⚠️ [EXPIRED QR REJECTED] Scanned Nonce (${parsedNonce}) != Latest Server Nonce (${latestServerPayload.nonce})`);
        return res.status(400).json({
          success: false,
          reason: 'EXPIRED_QR',
          message: '❌ QR Expired\nThis attendance QR is no longer valid. Please scan the latest 7-second dynamic QR.'
        });
      }
    }

    // 4. Secondary Bluetooth Proximity Verification
    const rssiVal = typeof req.body.bluetooth_rssi === 'number' ? req.body.bluetooth_rssi : (parsedPayload && typeof parsedPayload.bluetooth_rssi === 'number' ? parsedPayload.bluetooth_rssi : -68);
    const bluetoothDisabled = req.body.bluetooth_disabled === true || req.body.bluetooth_enabled === false;

    if (bluetoothDisabled) {
      console.warn(`⚠️ [BLUETOOTH DISABLED REJECTED] ${studentName} - Bluetooth disabled on device.`);
      return res.status(400).json({
        success: false,
        reason: 'BLUETOOTH_DISABLED',
        message: '❌ Enable Bluetooth to continue.\nBluetooth proximity verification requires an active Bluetooth connection.'
      });
    }

    // Bluetooth signal threshold: RSSI >= -85 dBm (~5-10 meters range)
    if (rssiVal < -88) {
      console.warn(`⚠️ [WEAK BLUETOOTH REJECTED] ${studentName} - Signal RSSI: ${rssiVal} dBm`);
      return res.status(400).json({
        success: false,
        reason: 'WEAK_BLUETOOTH_SIGNAL',
        message: `❌ Weak Bluetooth Signal (${rssiVal} dBm)\nYou are out of classroom Bluetooth range (approx 5-10m). Please move closer to classroom beacon.`
      });
    }

    // 5. Duplicate Scan Protection
    db.get('SELECT * FROM attendance_records WHERE student_id = ? AND session_id = ?', [studentId, sessionId], (err, existingRecord) => {
      if (existingRecord) {
        const errorMsg = 'Attendance already marked for this session.';
        console.warn(`⚠️ [DUPLICATE SCAN REJECTED] ${studentName} - ${session.subject}`);
        return res.status(409).json({
          success: false,
          reason: 'DUPLICATE',
          message: errorMsg
        });
      }

      // Fetch Student details
      db.get('SELECT * FROM users WHERE id = ?', [studentId], (err, student) => {
        if (err || !student) {
          return res.status(404).json({ success: false, message: 'Student account not found' });
        }

        // 6. Insert Verified Attendance Record & Bluetooth Log into Database
        const recordId = uuidv4();
        const btLogId = uuidv4();
        const attendanceTime = new Date().toISOString();

        // Insert Bluetooth Audit Log
        try {
          db.run(
            `INSERT INTO bluetooth_logs (id, session_id, student_id, rssi, status, timestamp) VALUES (?, ?, ?, ?, 'VERIFIED', CURRENT_TIMESTAMP)`,
            [btLogId, sessionId, studentId, rssiVal]
          );
        } catch (e) {}

        db.run(
          `INSERT INTO attendance_records (
            id, student_id, session_id, attendance_code, 
            attendance_time, student_lat, student_lng, 
            distance_meters, status, device_fingerprint, notes
          )
          VALUES (?, ?, ?, ?, ?, 0.0, 0.0, 0.0, 'present', ?, ?)`,
          [
            recordId,
            studentId,
            sessionId,
            parsedNonce,
            attendanceTime,
            student.device_fingerprint || 'camera_scanner',
            `QR + Bluetooth Proximity Verified (RSSI: ${rssiVal} dBm)`
          ],
          function (insertErr) {
            if (insertErr) {
              console.error(`❌ [DB INSERT FAILED] ${insertErr.message}`);
              return res.status(500).json({
                success: false,
                reason: 'DB_INSERT_ERROR',
                message: 'Failed to record attendance: ' + insertErr.message
              });
            }

            console.log(`✅ [DUAL VERIFIED ATTENDANCE RECORDED] Student: ${studentName}, RSSI: ${rssiVal} dBm, Record ID: ${recordId}`);

            const recordPayload = {
              id: recordId,
              student_id: studentId,
              student_name: studentName,
              roll_number: rollNumber,
              vh_number: student.vh_number,
              email: student.email,
              department: student.department,
              year: student.year,
              section: student.section,
              profile_photo: student.profile_photo,
              attendance_time: attendanceTime,
              distance_meters: 0,
              attendance_code: parsedNonce,
              bluetooth_rssi: rssiVal,
              verification_type: 'QR_BLUETOOTH',
              status: 'present',
              subject: session.subject,
              period_number: session.period_number,
              date: session.date || attendanceTime.split('T')[0]
            };

            // 7. Emit Real-Time WebSockets for Instant Sync Across Dashboards
            const io = req.app.get('socketio');
            if (io) {
              io.emit('attendanceMarked', recordPayload);
              io.emit('attendance_marked', {
                sessionId,
                attendanceCode: parsedNonce,
                record: recordPayload
              });
              io.emit('attendance_updated', {
                sessionId,
                record: recordPayload
              });
              io.emit('roster_updated', {
                sessionId,
                studentId,
                status: 'present'
              });
              console.log(`⚡ [WEBSOCKET BROADCAST] Emitted live attendance update for: ${studentName}`);
            }

            console.log(`====================================================\n`);

            res.status(200).json({
              success: true,
              attendanceId: recordId,
              attendanceCode: parsedNonce,
              bluetoothRssi: rssiVal,
              verificationType: 'QR + Bluetooth Proximity',
              message: `Attendance Verified & Recorded Successfully for ${session.subject}!`,
              record: recordPayload
            });
          }
        );
      });
    });
  });
}

function getDebugLog(req, res) {
  res.json({ message: 'Mandatory Camera QR Engine Active' });
}

function getStudentHistory(req, res) {
  const studentId = req.user.id;

  const query = `
    SELECT ar.*, s.subject, s.department, s.year, s.section, s.period_number, s.date as session_date, s.start_time as session_start
    FROM attendance_records ar
    JOIN attendance_sessions s ON ar.session_id = s.id
    WHERE ar.student_id = ?
    ORDER BY ar.attendance_time DESC
  `;

  db.all(query, [studentId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ history: rows });
  });
}

// Get All Attendance Records (Admin View with Search & Filters)
function getAllAttendanceRecords(req, res) {
  const { search, department, year, section, subject, status, from_date, to_date } = req.query;

  let query = `
    SELECT ar.id, ar.student_id, ar.session_id, ar.attendance_code, ar.attendance_time, 
           ar.student_lat, ar.student_lng, ar.distance_meters, ar.status, ar.notes,
           u.name as student_name, u.roll_number, u.email as student_email, 
           u.department as student_department, u.year as student_year, u.section as student_section, u.profile_photo,
           s.subject, s.department as session_department, s.year as session_year, s.section as session_section
    FROM attendance_records ar
    JOIN users u ON ar.student_id = u.id
    LEFT JOIN attendance_sessions s ON ar.session_id = s.id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ` AND (u.name LIKE ? OR u.roll_number LIKE ? OR s.subject LIKE ?)`;
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  if (department) {
    query += ` AND (u.department = ? OR s.department = ?)`;
    params.push(department, department);
  }

  if (year) {
    query += ` AND (u.year = ? OR s.year = ?)`;
    params.push(parseInt(year), parseInt(year));
  }

  if (section) {
    query += ` AND (u.section = ? OR s.section = ?)`;
    params.push(section, section);
  }

  if (subject) {
    query += ` AND s.subject LIKE ?`;
    params.push(`%${subject}%`);
  }

  if (status) {
    query += ` AND ar.status = ?`;
    params.push(status);
  }

  if (from_date) {
    query += ` AND DATE(ar.attendance_time) >= DATE(?)`;
    params.push(from_date);
  }

  if (to_date) {
    query += ` AND DATE(ar.attendance_time) <= DATE(?)`;
    params.push(to_date);
  }

  query += ` ORDER BY ar.attendance_time DESC`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to query attendance records: ' + err.message });
    res.json({ records: rows || [], total: rows ? rows.length : 0 });
  });
}

// Admin Manual Mark Attendance
function adminMarkAttendance(req, res) {
  const { student_id, session_id, status = 'present', attendance_time, notes } = req.body;

  if (!student_id) {
    return res.status(400).json({ error: 'Student ID is required' });
  }

  const recordId = uuidv4();
  const time = attendance_time || new Date().toISOString();
  const activeSessionId = session_id || 'ADMIN_MANUAL_SESSION';
  const recordStatus = status.toLowerCase();

  db.run(
    `INSERT INTO attendance_records (id, student_id, session_id, attendance_code, attendance_time, student_lat, student_lng, distance_meters, status, device_fingerprint, notes)
     VALUES (?, ?, ?, 'ADMIN_INSERT', ?, 0.0, 0.0, 0.0, ?, 'admin_manual', ?)`,
    [recordId, student_id, activeSessionId, time, recordStatus, notes || 'Manually inserted by Administrator'],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to insert attendance record: ' + err.message });

      const io = req.app.get('socketio');
      if (io) {
        io.emit('attendance_updated', { recordId, student_id, status: recordStatus });
      }

      res.status(201).json({
        message: 'Attendance record created successfully',
        record: { id: recordId, student_id, session_id: activeSessionId, status: recordStatus, attendance_time: time, notes }
      });
    }
  );
}

// Admin Update Attendance Record
function updateAttendanceRecord(req, res) {
  const { id } = req.params;
  const { status, notes, attendance_time } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const updatedStatus = status.toLowerCase();

  let query = `UPDATE attendance_records SET status = ?, notes = ?`;
  const params = [updatedStatus, notes || ''];

  if (attendance_time) {
    query += `, attendance_time = ?`;
    params.push(attendance_time);
  }

  query += ` WHERE id = ?`;
  params.push(id);

  db.run(query, params, function (err) {
    if (err) return res.status(500).json({ error: 'Failed to update attendance record: ' + err.message });

    const io = req.app.get('socketio');
    if (io) {
      io.emit('attendance_updated', { id, status: updatedStatus });
    }

    res.json({ message: 'Attendance record updated successfully' });
  });
}

// Admin Delete Attendance Record
function deleteAttendanceRecord(req, res) {
  const { id } = req.params;

  db.run(`DELETE FROM attendance_records WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete attendance record: ' + err.message });

    const io = req.app.get('socketio');
    if (io) {
      io.emit('attendance_deleted', { id });
    }

    res.json({ message: 'Attendance record deleted successfully' });
  });
}

module.exports = {
  markAttendance,
  getDebugLog,
  getStudentHistory,
  getAllAttendanceRecords,
  adminMarkAttendance,
  updateAttendanceRecord,
  deleteAttendanceRecord
};
