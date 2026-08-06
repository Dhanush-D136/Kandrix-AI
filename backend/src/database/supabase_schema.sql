-- ====================================================================
-- Elite Minds Attendance Portal - Supabase PostgreSQL Database Schema
-- Host: db.ehmrnreqjadhjmmtlugj.supabase.co
-- ====================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  roll_number TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  department TEXT,
  portal_id TEXT,
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
  password_changed_at TIMESTAMPTZ,
  dob TEXT,
  gender TEXT,
  blood_group TEXT,
  address TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  bio TEXT,
  status TEXT DEFAULT 'Active',
  admission_year INTEGER,
  username TEXT,
  vh_number TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS portal_id TEXT;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_roll ON public.users(roll_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_portal_id ON public.users(portal_id);

-- 2. Attendance Tokens Table (100 Predefined Tokens Pool)
CREATE TABLE IF NOT EXISTS public.attendance_tokens (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  qr_image_path TEXT,
  is_used INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.attendance_tokens ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_attendance_tokens_code ON public.attendance_tokens(token);

-- 3. Attendance Sessions Table
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  department TEXT NOT NULL,
  year INTEGER NOT NULL,
  section TEXT NOT NULL,
  admin_lat DOUBLE PRECISION NOT NULL,
  admin_lng DOUBLE PRECISION NOT NULL,
  admin_latitude DOUBLE PRECISION,
  admin_longitude DOUBLE PRECISION,
  start_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expiry_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL,
  attendance_code TEXT NOT NULL,
  active_token TEXT,
  token TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS period_number TEXT;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS faculty_name TEXT;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS faculty_id TEXT;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS subject_code TEXT;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS subject_id TEXT;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sessions_dept_sec ON public.attendance_sessions(department, year, section);
CREATE INDEX IF NOT EXISTS idx_sessions_code ON public.attendance_sessions(attendance_code);

-- 4. Attendance Records Table
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  attendance_code TEXT,
  attendance_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  student_lat DOUBLE PRECISION NOT NULL,
  student_lng DOUBLE PRECISION NOT NULL,
  distance_meters DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL,
  device_fingerprint TEXT,
  notes TEXT
);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_records_student ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_records_session ON public.attendance_records(session_id);

-- 5. Violation Logs Table
CREATE TABLE IF NOT EXISTS public.violation_logs (
  id TEXT PRIMARY KEY,
  student_id TEXT,
  student_name TEXT,
  roll_number TEXT,
  violation_type TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.violation_logs ENABLE ROW LEVEL SECURITY;

-- 6. Login Logs Table
CREATE TABLE IF NOT EXISTS public.login_logs (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  login_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  device TEXT,
  browser TEXT
);

ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_login_logs_student ON public.login_logs(student_id);

-- 7. Password Audit Logs Table
CREATE TABLE IF NOT EXISTS public.password_audit_logs (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  changed_by TEXT NOT NULL,
  action TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.password_audit_logs ENABLE ROW LEVEL SECURITY;

-- 8. Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  hod_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- 9. Classes Table
CREATE TABLE IF NOT EXISTS public.classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level_year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- 10. Sections Table
CREATE TABLE IF NOT EXISTS public.sections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- 11. Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
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
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- 12. Timetables Table
CREATE TABLE IF NOT EXISTS public.timetables (
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
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS subject_id TEXT;
ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS faculty_id TEXT;
ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
ALTER TABLE public.timetables ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2026-2027 (ODD)';
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS idx_timetables_slot ON public.timetables(department, year, section, day, period_number);

-- 13. System Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  wifi_restriction_enabled INTEGER DEFAULT 0,
  allowed_ip_subnets TEXT DEFAULT '192.168.1.0/24,10.0.0.0/16',
  geofence_radius_meters DOUBLE PRECISION DEFAULT 30.0,
  grace_period_minutes INTEGER DEFAULT 5
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 14. Faculty Table
CREATE TABLE IF NOT EXISTS public.faculty (
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
  joining_date TEXT,
  assigned_class TEXT,
  assigned_section TEXT,
  profile_photo TEXT,
  status TEXT DEFAULT 'Active',
  password_hash TEXT NOT NULL,
  password_changed INTEGER DEFAULT 0,
  must_change_password INTEGER DEFAULT 0,
  last_login TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  failed_login_attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS joining_date TEXT;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS assigned_class TEXT;
ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS assigned_section TEXT;

ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_faculty_code ON public.faculty(faculty_code);
CREATE INDEX IF NOT EXISTS idx_faculty_email ON public.faculty(email);

-- 15. Faculty Subject Mapping Table
CREATE TABLE IF NOT EXISTS public.faculty_subject_mapping (
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
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.faculty_subject_mapping ENABLE ROW LEVEL SECURITY;

-- 16. Faculty Timetable Mapping Table
CREATE TABLE IF NOT EXISTS public.faculty_timetable_mapping (
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
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.faculty_timetable_mapping ENABLE ROW LEVEL SECURITY;

-- 17. Faculty Subjects Table
CREATE TABLE IF NOT EXISTS public.faculty_subjects (
  id TEXT PRIMARY KEY,
  faculty_id TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  department TEXT,
  year INTEGER,
  section TEXT
);

ALTER TABLE public.faculty_subjects ENABLE ROW LEVEL SECURITY;

-- 18. Faculty Remarks Table
CREATE TABLE IF NOT EXISTS public.faculty_remarks (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  faculty_id TEXT NOT NULL,
  remark_type TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.faculty_remarks ENABLE ROW LEVEL SECURITY;

-- 19. Faculty Documents Table
CREATE TABLE IF NOT EXISTS public.faculty_documents (
  id TEXT PRIMARY KEY,
  faculty_id TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  unit TEXT NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT 'PDF',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.faculty_documents ENABLE ROW LEVEL SECURITY;

-- 20. Faculty Announcements Table
CREATE TABLE IF NOT EXISTS public.faculty_announcements (
  id TEXT PRIMARY KEY,
  faculty_id TEXT NOT NULL,
  subject_code TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.faculty_announcements ENABLE ROW LEVEL SECURITY;

-- 21. Faculty Leave Requests Table
CREATE TABLE IF NOT EXISTS public.faculty_leave_requests (
  id TEXT PRIMARY KEY,
  faculty_id TEXT NOT NULL,
  leave_type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.faculty_leave_requests ENABLE ROW LEVEL SECURITY;

-- 22. Faculty Activity Logs Table
CREATE TABLE IF NOT EXISTS public.faculty_activity_logs (
  id TEXT PRIMARY KEY,
  faculty_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  device TEXT,
  browser TEXT,
  status TEXT DEFAULT 'Success',
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.faculty_activity_logs ENABLE ROW LEVEL SECURITY;

-- 24. Attendance Backups Table
CREATE TABLE IF NOT EXISTS public.attendance_backups (
  backup_id TEXT PRIMARY KEY,
  backup_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  total_records INTEGER NOT NULL DEFAULT 0,
  backup_data JSONB NOT NULL
);

ALTER TABLE public.attendance_backups ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON public.attendance_backups(created_at DESC);

-- ====================================================================
-- RLS POLICIES FOR SUPABASE SERVICE ROLE / SERVER-SIDE ACCESS
-- Allow service_role & server access to read/write all tables
-- ====================================================================
DROP POLICY IF EXISTS "Allow server full access to users" ON public.users;
CREATE POLICY "Allow server full access to users" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow server full access to attendance_tokens" ON public.attendance_tokens;
CREATE POLICY "Allow server full access to attendance_tokens" ON public.attendance_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow server full access to attendance_sessions" ON public.attendance_sessions;
CREATE POLICY "Allow server full access to attendance_sessions" ON public.attendance_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow server full access to attendance_records" ON public.attendance_records;
CREATE POLICY "Allow server full access to attendance_records" ON public.attendance_records FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow server full access to attendance_backups" ON public.attendance_backups;
CREATE POLICY "Allow server full access to attendance_backups" ON public.attendance_backups FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow server full access to violation_logs" ON public.violation_logs;
CREATE POLICY "Allow server full access to violation_logs" ON public.violation_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow server full access to login_logs" ON public.login_logs;
CREATE POLICY "Allow server full access to login_logs" ON public.login_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow server full access to password_audit_logs" ON public.password_audit_logs;
CREATE POLICY "Allow server full access to password_audit_logs" ON public.password_audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow server full access to departments" ON public.departments;
CREATE POLICY "Allow server full access to departments" ON public.departments FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow server full access to classes" ON public.classes;
CREATE POLICY "Allow server full access to classes" ON public.classes FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow server full access to sections" ON public.sections;
CREATE POLICY "Allow server full access to sections" ON public.sections FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow server full access to subjects" ON public.subjects;
CREATE POLICY "Allow server full access to subjects" ON public.subjects FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow server full access to timetables" ON public.timetables;
CREATE POLICY "Allow server full access to timetables" ON public.timetables FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select access to timetables" ON public.timetables;
CREATE POLICY "Allow public select access to timetables" ON public.timetables FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write access to timetables" ON public.timetables;
CREATE POLICY "Allow public write access to timetables" ON public.timetables FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow server full access to system_settings" ON public.system_settings;
CREATE POLICY "Allow server full access to system_settings" ON public.system_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow server full access to faculty" ON public.faculty;
CREATE POLICY "Allow server full access to faculty" ON public.faculty FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.class_details (
  id TEXT PRIMARY KEY,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public.class_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow server full access to class_details" ON public.class_details;
CREATE POLICY "Allow server full access to class_details" ON public.class_details FOR ALL USING (true) WITH CHECK (true);

-- 25. Spell Management Table
CREATE TABLE IF NOT EXISTS public.spell_management (
  id TEXT PRIMARY KEY,
  spell_name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_active INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.spell_management ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow server full access to spell_management" ON public.spell_management;
CREATE POLICY "Allow server full access to spell_management" ON public.spell_management FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select access to spell_management" ON public.spell_management;
CREATE POLICY "Allow public select access to spell_management" ON public.spell_management FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write access to spell_management" ON public.spell_management;
CREATE POLICY "Allow public write access to spell_management" ON public.spell_management FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.spell_management (id, spell_name, start_date, end_date, is_active)
VALUES ('spell-default-1', 'Spell 1', '2026-08-01', '2026-09-30', 1)
ON CONFLICT (id) DO NOTHING;

-- 26. Class Portals Table
CREATE TABLE IF NOT EXISTS public.class_portals (
  id TEXT PRIMARY KEY,
  portal_name TEXT,
  portal_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  department TEXT NOT NULL,
  course TEXT DEFAULT 'B.Tech',
  batch TEXT DEFAULT '2024-2028',
  semester INTEGER DEFAULT 5,
  section TEXT DEFAULT 'A',
  advisor TEXT,
  room TEXT,
  max_students INTEGER DEFAULT 70,
  is_first_login INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.class_portals ADD COLUMN IF NOT EXISTS portal_name TEXT;
ALTER TABLE public.class_portals ADD COLUMN IF NOT EXISTS portal_id TEXT;
ALTER TABLE public.class_portals ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.class_portals ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.class_portals ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.class_portals ADD COLUMN IF NOT EXISTS advisor TEXT;
ALTER TABLE public.class_portals ADD COLUMN IF NOT EXISTS room TEXT;
ALTER TABLE public.class_portals ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 70;
ALTER TABLE public.class_portals ADD COLUMN IF NOT EXISTS is_first_login INTEGER DEFAULT 1;

ALTER TABLE public.class_portals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow server full access to class_portals" ON public.class_portals;
CREATE POLICY "Allow server full access to class_portals" ON public.class_portals FOR ALL USING (true) WITH CHECK (true);

-- 27. Institution Settings Table
CREATE TABLE IF NOT EXISTS public.institution_settings (
  id TEXT PRIMARY KEY,
  institution_name TEXT DEFAULT 'KANDRIX AI Attendance System',
  logo_url TEXT,
  academic_year TEXT DEFAULT '2026-2027 (ODD)',
  semester_settings TEXT DEFAULT 'Odd Semester (V)',
  min_attendance_pct DOUBLE PRECISION DEFAULT 75.0,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.institution_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow server full access to institution_settings" ON public.institution_settings;
CREATE POLICY "Allow server full access to institution_settings" ON public.institution_settings FOR ALL USING (true) WITH CHECK (true);

-- 28. Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  duration_years INTEGER DEFAULT 4,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow server full access to courses" ON public.courses;
CREATE POLICY "Allow server full access to courses" ON public.courses FOR ALL USING (true) WITH CHECK (true);

-- 29. Batches Table
CREATE TABLE IF NOT EXISTS public.batches (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  start_year INTEGER,
  end_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow server full access to batches" ON public.batches;
CREATE POLICY "Allow server full access to batches" ON public.batches FOR ALL USING (true) WITH CHECK (true);

-- 30. Semesters Table
CREATE TABLE IF NOT EXISTS public.semesters (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  semester_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow server full access to semesters" ON public.semesters;
CREATE POLICY "Allow server full access to semesters" ON public.semesters FOR ALL USING (true) WITH CHECK (true);

-- 31. Attendance Live Sessions Table
CREATE TABLE IF NOT EXISTS public.attendance_live_sessions (
  id TEXT PRIMARY KEY,
  class_portal_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius DOUBLE PRECISION DEFAULT 50.0,
  started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active'
);

ALTER TABLE public.attendance_live_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow server full access to attendance_live_sessions" ON public.attendance_live_sessions;
CREATE POLICY "Allow server full access to attendance_live_sessions" ON public.attendance_live_sessions FOR ALL USING (true) WITH CHECK (true);

-- 32. Live Student Locations Table
CREATE TABLE IF NOT EXISTS public.live_student_locations (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  student_name TEXT,
  roll_number TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  distance DOUBLE PRECISION NOT NULL,
  inside_boundary INTEGER DEFAULT 0,
  last_seen TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  present_marked INTEGER DEFAULT 0
);

ALTER TABLE public.live_student_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow server full access to live_student_locations" ON public.live_student_locations;
CREATE POLICY "Allow server full access to live_student_locations" ON public.live_student_locations FOR ALL USING (true) WITH CHECK (true);
