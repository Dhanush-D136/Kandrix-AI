const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/db');

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * 1. Start Live GPS Location Session (Class Portal Teacher)
 */
function startLiveSession(req, res) {
  const classPortalId = req.user?.portal_id || req.user?.username || req.user?.id || 'cp-ai3a';
  const { latitude, longitude, radius = 500, subject = 'Python Programming' } = req.body;

  const latNum = parseFloat(latitude || 13.0827);
  const lngNum = parseFloat(longitude || 80.2707);

  // Fetch institution default radius from system_settings if available
  db.get('SELECT geofence_radius_meters FROM system_settings WHERE id = 1', [], (errSet, settings) => {
    const activeRadius = parseFloat(req.body.radius || (settings && settings.geofence_radius_meters) || 500);

    // Close previous active live sessions for THIS SPECIFIC class portal
    db.run(
      "UPDATE attendance_live_sessions SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE (class_portal_id = ? OR class_portal_id = ?) AND status = 'active'",
      [classPortalId, req.user?.id || classPortalId],
      () => {
        const sessionId = 'live-sess-' + uuidv4();

        db.run(
          `INSERT INTO attendance_live_sessions (id, class_portal_id, subject, latitude, longitude, radius, status, started_at)
           VALUES (?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)`,
          [sessionId, classPortalId, subject, latNum, lngNum, activeRadius],
          (err) => {
            if (err) {
              return res.status(500).json({ success: false, message: 'Failed to start live session: ' + err.message });
            }

            const io = req.app.get('socketio');
            if (io) {
              io.emit('live_session_started', {
                sessionId,
                classPortalId,
                subject,
                latitude: latNum,
                longitude: lngNum,
                radius: activeRadius
              });
            }

            res.json({
              success: true,
              message: 'Live GPS Location Attendance session started successfully',
              session: {
                id: sessionId,
                class_portal_id: classPortalId,
                subject,
                latitude: latNum,
                longitude: lngNum,
                radius: activeRadius,
                status: 'active'
              }
            });
          }
        );
      }
    );
  });
}

/**
 * 2. Update Student GPS Location Ping (Student App - Watch Position)
 */
function updateStudentLocation(req, res) {
  const studentId = req.user.id;
  const studentName = req.user.name;
  const rollNumber = req.user.roll_number || '21104001';
  const { latitude, longitude, sessionId: passedSessionId } = req.body;

  const stLat = parseFloat(latitude || 0);
  const stLng = parseFloat(longitude || 0);

  if (!stLat || !stLng) {
    return res.status(400).json({ success: false, message: 'Invalid or missing GPS coordinates' });
  }

  // Find active live session matching student's portal or active session
  const sessionQuery = passedSessionId
    ? "SELECT * FROM attendance_live_sessions WHERE id = ? AND status = 'active'"
    : "SELECT * FROM attendance_live_sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1";

  const sessionParams = passedSessionId ? [passedSessionId] : [];

  db.get(sessionQuery, sessionParams, (err, session) => {
    if (err || !session) {
      db.get("SELECT * FROM attendance_sessions WHERE status = 'active' ORDER BY start_time DESC LIMIT 1", [], (err2, fallbackSess) => {
        if (!fallbackSess) {
          return res.status(404).json({ success: false, message: 'No active Live Location attendance session found' });
        }
        processGPSCheck(fallbackSess, studentId, studentName, rollNumber, stLat, stLng, req, res);
      });
      return;
    }

    processGPSCheck(session, studentId, studentName, rollNumber, stLat, stLng, req, res);
  });
}

function processGPSCheck(session, studentId, studentName, rollNumber, stLat, stLng, req, res) {
  const refLat = parseFloat(session.latitude || session.admin_lat || 13.0827);
  const refLng = parseFloat(session.longitude || session.admin_lng || 80.2707);
  const allowedRadius = parseFloat(session.radius || 500);

  const distanceMeters = getDistanceFromLatLonInMeters(stLat, stLng, refLat, refLng);
  const insideBoundary = distanceMeters <= allowedRadius ? 1 : 0;

  const locId = `loc-${studentId}-${session.id}`;

  db.run(
    `INSERT INTO live_student_locations (id, student_id, session_id, student_name, roll_number, latitude, longitude, distance, inside_boundary, last_seen, present_marked)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
     ON CONFLICT (id) DO UPDATE SET
       latitude = EXCLUDED.latitude,
       longitude = EXCLUDED.longitude,
       distance = EXCLUDED.distance,
       inside_boundary = EXCLUDED.inside_boundary,
       last_seen = CURRENT_TIMESTAMP`,
    [locId, studentId, session.id, studentName, rollNumber, stLat, stLng, distanceMeters, insideBoundary, insideBoundary],
    (err) => {
      if (insideBoundary === 1) {
        db.get('SELECT * FROM attendance_records WHERE student_id = ? AND session_id = ?', [studentId, session.id], (errR, existing) => {
          if (!existing) {
            const recordId = uuidv4();
            const attTime = new Date().toISOString();
            db.run(
              `INSERT INTO attendance_records (id, student_id, session_id, attendance_code, attendance_time, student_lat, student_lng, distance_meters, status, notes)
               VALUES (?, ?, ?, 'LIVE_GPS_AUTO', ?, ?, ?, ?, 'present', ?)`,
              [recordId, studentId, session.id, attTime, stLat, stLng, distanceMeters, `Auto-Marked via 1-Tap Live GPS (${distanceMeters}m)`],
              () => {
                console.log(`✅ [1-TAP LIVE GPS AUTO-PRESENT] Student: ${studentName}, Distance: ${distanceMeters}m`);
              }
            );
          }
        });
      }

      const io = req.app.get('socketio');
      if (io) {
        io.emit('location_update', {
          studentId,
          studentName,
          rollNumber,
          sessionId: session.id,
          classPortalId: session.class_portal_id,
          distance: distanceMeters,
          insideBoundary: insideBoundary === 1,
          status: insideBoundary === 1 ? 'PRESENT' : 'OUTSIDE_BOUNDARY'
        });
      }

      res.json({
        success: true,
        insideBoundary: insideBoundary === 1,
        distanceMeters,
        allowedRadius,
        status: insideBoundary === 1 ? 'PRESENT' : 'OUTSIDE_BOUNDARY',
        message: insideBoundary === 1
          ? `✅ Attendance Marked! You are inside classroom boundary (${distanceMeters}m away).`
          : `⚠️ Outside Classroom Boundary (${distanceMeters}m away). Allowed radius is ${allowedRadius}m.`
      });
    }
  );
}

/**
 * 3. Get Real-Time Live Session Telemetry (Class Portal Dashboard Radar)
 */
function getLiveSessionStatus(req, res) {
  const portalId = req.user?.portal_id || req.user?.username || req.user?.id;
  const isSuperAdmin = req.user?.role === 'admin';

  let sessionQuery = "SELECT * FROM attendance_live_sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1";
  let sessionParams = [];

  if (!isSuperAdmin && portalId) {
    sessionQuery = "SELECT * FROM attendance_live_sessions WHERE (class_portal_id = ? OR class_portal_id = ?) AND status = 'active' ORDER BY started_at DESC LIMIT 1";
    sessionParams = [portalId, req.user?.id || portalId];
  }

  db.get(sessionQuery, sessionParams, (err, session) => {
    if (!session) {
      return res.json({ success: true, active: false, message: 'No active Live Location session running for this portal' });
    }

    db.all("SELECT * FROM live_student_locations WHERE session_id = ?", [session.id], (err2, locations) => {
      const nearby = (locations || []).filter((l) => l.inside_boundary === 1 || l.present_marked === 1);
      const outside = (locations || []).filter((l) => l.inside_boundary === 0 && l.present_marked !== 1);

      res.json({
        success: true,
        active: true,
        session,
        studentsCount: (locations || []).length,
        nearbyCount: nearby.length,
        outsideCount: outside.length,
        locations: locations || []
      });
    });
  });
}

/**
 * 4. End Live Location Session (Class Portal Teacher)
 */
function endLiveSession(req, res) {
  const portalId = req.user?.portal_id || req.user?.username || req.user?.id;
  const query = req.user?.role === 'admin'
    ? "UPDATE attendance_live_sessions SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE status = 'active'"
    : "UPDATE attendance_live_sessions SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE (class_portal_id = ? OR class_portal_id = ?) AND status = 'active'";

  const params = req.user?.role === 'admin' ? [] : [portalId, req.user?.id || portalId];

  db.run(query, params, (err) => {
    const io = req.app.get('socketio');
    if (io) {
      io.emit('live_session_ended', { timestamp: new Date().toISOString(), portalId });
    }
    res.json({ success: true, message: 'Live GPS Location session ended successfully' });
  });
}

module.exports = {
  startLiveSession,
  updateStudentLocation,
  getLiveSessionStatus,
  endLiveSession
};
