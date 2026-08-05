const express = require('express');
const router = express.Router();

const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');
const sessionController = require('../controllers/sessionController');
const attendanceController = require('../controllers/attendanceController');
const studentController = require('../controllers/studentController');
const erpController = require('../controllers/erpController');
const facultyController = require('../controllers/facultyController');

// --- Auth Routes ---
router.post('/auth/admin/login', authController.adminLogin);
router.post('/auth/student/login', authController.studentLogin);
router.post('/auth/faculty/login', facultyController.facultyLogin);
router.post('/auth/faculty/change-password', facultyController.facultyChangePassword);
router.post('/auth/student/first-login-change-password', verifyToken, authController.firstTimePasswordChange);
router.post('/auth/change-password', verifyToken, authController.changePassword);
router.get('/auth/me', verifyToken, authController.getMe);
router.put('/auth/admin/profile', verifyToken, authController.updateAdminProfile);
router.put('/auth/student/profile', verifyToken, requireRole('student'), authController.updateStudentProfile);
router.post('/auth/student/register-device', verifyToken, requireRole('student'), authController.registerStudentDevice);

// --- Class & Faculty Ecosystem Routes ---
router.get('/faculty/dashboard', facultyController.getFacultyDashboard);
router.get('/faculty/attendance-analytics', verifyToken, facultyController.getFacultyAttendanceAnalytics);
router.get('/faculty/session-students/:sessionId', verifyToken, facultyController.getSessionStudentRoster);
router.put('/faculty/attendance-records/:id', verifyToken, facultyController.updateFacultyAttendanceRecord);
router.delete('/faculty/attendance-records/:id', verifyToken, facultyController.deleteFacultyAttendanceRecord);
router.get('/faculty/students', facultyController.getFacultyStudents);
router.post('/faculty/remarks', facultyController.addFacultyRemark);
router.get('/faculty/remarks/:student_id', facultyController.getFacultyRemarks);
router.post('/faculty/documents', facultyController.uploadFacultyDocument);
router.get('/faculty/documents', facultyController.getFacultyDocuments);
router.post('/faculty/leave-requests', facultyController.submitLeaveRequest);
router.get('/faculty/leave-requests', facultyController.getFacultyLeaveRequests);
router.put('/faculty/profile/:id', facultyController.updateFacultyProfile);

// --- Admin Staff / Faculty Management Routes ---
router.get('/admin/faculty-management/stats', facultyController.adminGetFacultyManagementStats);
router.get('/admin/faculty-management/faculties', facultyController.adminGetFaculties);
router.get('/admin/faculty-management/faculties/:id', facultyController.adminGetFacultyDetails);
router.post('/admin/faculty-management/faculties', facultyController.adminCreateFaculty);
router.put('/admin/faculty-management/faculties/:id', facultyController.adminUpdateFaculty);
router.post('/admin/faculty-management/faculties/:id/reset-password', facultyController.adminResetFacultyPassword);
router.delete('/admin/faculty-management/faculties/:id', facultyController.adminDeleteFaculty);
router.get('/admin/faculty-management/activity-logs', facultyController.adminGetFacultyLoginActivity);
router.get('/admin/faculties-list', facultyController.adminGetFaculties);
router.post('/admin/faculties-create', facultyController.adminCreateFaculty);
router.delete('/admin/faculties-delete/:id', facultyController.adminDeleteFaculty);

// --- Class Details & ERP Routes ---
router.get('/class-details', verifyToken, erpController.getClassDetails);
router.put('/class-details', verifyToken, requireRole('admin'), erpController.updateClassDetails);

router.get('/faculties', verifyToken, erpController.getFaculties);
router.post('/faculties', verifyToken, requireRole('admin'), erpController.createFaculty);
router.put('/faculties/:id', verifyToken, requireRole('admin'), erpController.updateFaculty);
router.delete('/faculties/:id', verifyToken, requireRole('admin'), erpController.deleteFaculty);

// --- Institution Settings Routes ---
router.get('/institution', verifyToken, erpController.getInstitutionSettings);
router.put('/institution', verifyToken, requireRole('admin'), erpController.updateInstitutionSettings);

// --- Department ERP Routes ---
router.get('/departments', verifyToken, erpController.getDepartments);
router.post('/departments', verifyToken, requireRole('admin'), erpController.createDepartment);
router.put('/departments/:id', verifyToken, requireRole('admin'), erpController.updateDepartment);
router.delete('/departments/:id', verifyToken, requireRole('admin'), erpController.deleteDepartment);

// --- Course ERP Routes ---
router.get('/courses', verifyToken, erpController.getCourses);
router.post('/courses', verifyToken, requireRole('admin'), erpController.createCourse);
router.put('/courses/:id', verifyToken, requireRole('admin'), erpController.updateCourse);
router.delete('/courses/:id', verifyToken, requireRole('admin'), erpController.deleteCourse);

// --- Batch ERP Routes ---
router.get('/batches', verifyToken, erpController.getBatches);
router.post('/batches', verifyToken, requireRole('admin'), erpController.createBatch);
router.delete('/batches/:id', verifyToken, requireRole('admin'), erpController.deleteBatch);

// --- Semester ERP Routes ---
router.get('/semesters', verifyToken, erpController.getSemesters);
router.post('/semesters', verifyToken, requireRole('admin'), erpController.createSemester);

// --- Section ERP Routes ---
router.get('/sections', verifyToken, erpController.getSections);
router.post('/sections', verifyToken, requireRole('admin'), erpController.createSection);
router.delete('/sections/:id', verifyToken, requireRole('admin'), erpController.deleteSection);

// --- Class Portal Creator Routes ---
router.get('/class-portals', verifyToken, erpController.getClassPortals);
router.post('/class-portals', verifyToken, requireRole('admin'), erpController.generateClassPortal);
router.post('/class-portals/generate', verifyToken, requireRole('admin'), erpController.generateClassPortal);
router.delete('/class-portals/:id', verifyToken, requireRole('admin'), erpController.deleteClassPortal);

router.get('/class-portal', verifyToken, erpController.getClassPortals);
router.post('/class-portal', verifyToken, requireRole('admin'), erpController.generateClassPortal);
router.post('/class-portal/generate', verifyToken, requireRole('admin'), erpController.generateClassPortal);
router.delete('/class-portal/:id', verifyToken, requireRole('admin'), erpController.deleteClassPortal);

// --- Subject ERP Routes ---
router.get('/subjects', verifyToken, erpController.getSubjects);
router.post('/subjects', verifyToken, requireRole('admin'), erpController.createSubject);
router.put('/subjects/:id', verifyToken, requireRole('admin'), erpController.updateSubject);
router.put('/subjects/:id/archive', verifyToken, requireRole('admin'), erpController.toggleArchiveSubject);
router.delete('/subjects/:id', verifyToken, requireRole('admin'), erpController.deleteSubject);

// --- Timetable ERP Routes ---
router.get('/timetable/student', verifyToken, erpController.getStudentTimetable);
router.get('/timetable/faculty', verifyToken, erpController.getFacultyTimetable);
router.get('/timetable', verifyToken, erpController.getTimetables);
router.post('/timetable', verifyToken, requireRole('admin'), erpController.createTimetable);
router.put('/timetable/:id', verifyToken, requireRole('admin'), erpController.updateTimetable);
router.delete('/timetable/:id', verifyToken, requireRole('admin'), erpController.deleteTimetable);

// Plural Aliases for Timetable Routes
router.get('/timetables', verifyToken, erpController.getTimetables);
router.post('/timetables', verifyToken, requireRole('admin'), erpController.createTimetable);
router.put('/timetables/:id', verifyToken, requireRole('admin'), erpController.updateTimetable);
router.delete('/timetables/:id', verifyToken, requireRole('admin'), erpController.deleteTimetable);

// --- Session Routes (Dynamic QR Attendance) ---
router.get('/sessions/current-slot', verifyToken, sessionController.getCurrentTimetableSlot);
router.get('/timetable/current-slot', verifyToken, sessionController.getCurrentTimetableSlot);
router.post('/sessions/auto-launch', verifyToken, sessionController.autoLaunchSession);
router.post('/sessions', verifyToken, sessionController.createSession);
router.get('/sessions', verifyToken, sessionController.getSessions);
router.get('/sessions/:id', verifyToken, sessionController.getSessionById);
router.get('/sessions/:id/qr', verifyToken, sessionController.getSessionQR);
router.put('/sessions/:id/end', verifyToken, sessionController.endSession);
router.post('/sessions/:id/end', verifyToken, sessionController.endSession);

// --- Attendance Routes ---
router.post('/attendance/mark', verifyToken, requireRole('student'), attendanceController.markAttendance);
router.get('/attendance/debug-log', verifyToken, attendanceController.getDebugLog);
router.get('/attendance/my-history', verifyToken, requireRole('student'), attendanceController.getStudentHistory);
router.get('/attendance/records', verifyToken, attendanceController.getAllAttendanceRecords);
router.post('/attendance/admin-mark', verifyToken, attendanceController.adminMarkAttendance);
router.put('/attendance/records/:id', verifyToken, attendanceController.updateAttendanceRecord);
router.delete('/attendance/records/:id', verifyToken, attendanceController.deleteAttendanceRecord);

// --- Student Management Routes ---
router.get('/students', verifyToken, studentController.getStudents);
router.post('/students', verifyToken, requireRole('admin'), studentController.createStudent);
router.post('/students/bulk-delete', verifyToken, requireRole('admin'), studentController.bulkDeleteStudents);
router.post('/students/bulk-import', verifyToken, requireRole('admin'), studentController.bulkImportStudents);
router.post('/students/bulk-reset-passwords', verifyToken, requireRole('admin'), studentController.bulkResetStudentPasswords);
router.get('/students/login-activity', verifyToken, studentController.getLoginActivity);
router.get('/students/password-audit-logs', verifyToken, studentController.getPasswordAuditLogs);
router.get('/students/:id/profile-details', verifyToken, studentController.getStudentProfileDetails);
router.put('/students/:id', verifyToken, studentController.updateStudent);
router.delete('/students/:id', verifyToken, requireRole('admin'), studentController.deleteStudent);
router.post('/students/:id/reset-device', verifyToken, requireRole('admin'), studentController.resetStudentDevice);
router.post('/students/:id/reset-password', verifyToken, requireRole('admin'), studentController.resetStudentPassword);
router.post('/students/:id/force-password-change', verifyToken, requireRole('admin'), studentController.forceStudentPasswordChange);
router.put('/students/:id/status', verifyToken, requireRole('admin'), studentController.updateStudentAccountStatus);

// --- Database Backup System ---
const multer = require('multer');
const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const attendanceBackupController = require('../controllers/attendanceBackupController');

router.get('/admin/attendance-management/export', verifyToken, attendanceBackupController.exportAttendance);
router.post('/admin/attendance-management/import', verifyToken, requireRole('admin'), uploadMemory.single('file'), attendanceBackupController.importAttendance);
router.post('/admin/attendance-management/backup', verifyToken, requireRole('admin'), attendanceBackupController.createFullBackup);
router.get('/admin/attendance-management/backups', verifyToken, requireRole('admin'), attendanceBackupController.getBackupsList);
router.get('/admin/attendance-management/backups/:id/download', verifyToken, requireRole('admin'), attendanceBackupController.downloadBackup);
router.post('/admin/attendance-management/backups/:id/restore', verifyToken, requireRole('admin'), attendanceBackupController.restoreBackup);
router.delete('/admin/attendance-management/backups/:id', verifyToken, requireRole('admin'), attendanceBackupController.deleteBackup);
router.post('/admin/attendance-management/reset-today', verifyToken, requireRole('admin'), attendanceBackupController.resetTodayAttendance);
router.post('/admin/attendance-management/reset-all', verifyToken, requireRole('admin'), attendanceBackupController.resetAllAttendance);
router.post('/admin/attendance-management/undo-reset', verifyToken, requireRole('admin'), attendanceBackupController.undoLastReset);

module.exports = router;




