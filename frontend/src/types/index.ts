export interface User {
  id: string;
  name: string;
  roll_number?: string;
  email: string;
  role: 'admin' | 'student' | 'faculty' | 'class_portal';
  department?: string;
  year?: number;
  section?: string;
  phone?: string;
  profile_photo?: string;
  device_fingerprint?: string;
  must_change_password?: number;
  is_first_login?: boolean | number;
  first_login?: boolean | number;
  password_changed?: number;
  password_changed_at?: string;
  attendance_percentage?: number;
  status?: string;
  dob?: string;
  gender?: string;
  blood_group?: string;
  address?: string;
  parent_name?: string;
  parent_phone?: string;
  bio?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  hod_name?: string;
  description?: string;
  created_at?: string;
}

export interface ClassItem {
  id: string;
  name: string;
  level_year: number;
  created_at?: string;
}

export interface SectionItem {
  id: string;
  name: string;
  created_at?: string;
}

export interface SubjectItem {
  id: string;
  name: string;
  code: string;
  department: string;
  year: number;
  semester: number;
  faculty_name?: string;
  credits?: number;
  description?: string;
  is_archived?: number;
  created_at?: string;
}

export interface TimetableItem {
  id: string;
  department: string;
  year: number;
  section: string;
  semester?: number;
  date?: string;
  day: string;
  period_number?: number | string;
  subject_name: string;
  subject?: string;
  faculty_name: string;
  start_time: string;
  end_time: string;
  room_number: string;
  created_at?: string;
}

export interface AttendanceSession {
  id: string;
  subject: string;
  department: string;
  year: number;
  section: string;
  period_number?: number | string;
  faculty_name?: string;
  date?: string;
  admin_lat: number;
  admin_lng: number;
  start_time: string;
  expiry_time: string;
  duration_minutes: number;
  attendance_code?: string;
  token?: string;
  status: 'active' | 'completed' | 'cancelled';
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  student_name?: string;
  roll_number?: string;
  session_id: string;
  subject?: string;
  period_number?: string | number;
  session_date?: string;
  date?: string;
  attendance_code?: string;
  attendance_time: string;
  distance_meters: number;
  status: 'present' | 'late' | 'flagged';
  profile_photo?: string;
}

export interface ViolationLog {
  id: string;
  student_id?: string;
  student_name: string;
  roll_number: string;
  violation_type: 'MOCK_GPS' | 'OUT_OF_RANGE' | 'EXPIRED_QR' | 'DEVICE_MISMATCH' | 'DUPLICATE_ATTENDANCE' | 'DEVMODE_DETECTED';
  details: string;
  created_at: string;
}

export interface DashboardMetrics {
  overview: {
    totalStudents: number;
    presentToday: number;
    absentToday: number;
    attendancePercentage: number;
    activeSessions: number;
    totalDepartments?: number;
    totalSubjects?: number;
  };
  departmentStats: Array<{ department: string; student_count: number }>;
  dailyTrends: Array<{ date: string; count: number }>;
  subjectStats?: Array<{ subject: string; present: number; total: number; percentage: number; students?: number }>;
}
