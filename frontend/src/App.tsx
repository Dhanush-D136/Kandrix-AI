import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { FirstLoginModal } from './components/FirstLoginModal';

import { Login } from './pages/Login';
import { SessionHub } from './pages/SessionHub';
import { AttendanceReportsPage } from './pages/AttendanceReportsPage';
import { ProfilePage } from './pages/ProfilePage';
import { StudentDashboard } from './pages/StudentDashboard';
import { QRScannerView } from './pages/QRScannerView';
import { ClassManagementPage } from './pages/ClassManagementPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { InstitutionManagementPage } from './pages/InstitutionManagementPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { StudentTimetablePage } from './pages/StudentTimetablePage';
import { TimetablePage } from './pages/TimetablePage';
import { StudentManagement } from './pages/StudentManagement';
import { FacultyManagement } from './pages/FacultyManagement';
import { AttendanceManagementPage } from './pages/AttendanceManagementPage';
import { RefreshCw } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, token, isLoading, mustChangePasswordTempToken } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isClassPortal = user?.role === 'class_portal' || user?.role === 'faculty';
  
  const [activeTab, setActiveTab] = useState<string>(() => (
    isAdmin ? 'dashboard' : isClassPortal ? 'class-portal-dashboard' : 'student-dashboard'
  ));
  const [sessionParams, setSessionParams] = useState<{ subject?: string; code?: string; faculty?: string; period?: string } | null>(null);

  const handleNavigate = (tab: string, extraData?: any) => {
    setActiveTab(tab);
    if (extraData) {
      setSessionParams(extraData);
    }
  };

  // Sync active tab whenever user or role changes
  useEffect(() => {
    if (user) {
      if (user.role === 'admin' && (activeTab === 'student-dashboard' || activeTab === 'qr-scanner' || activeTab === 'student-timetable')) {
        setActiveTab('dashboard');
      } else if (user.role === 'student' && (activeTab === 'dashboard' || activeTab === 'class-portals' || activeTab === 'departments')) {
        setActiveTab('student-dashboard');
      } else if (isClassPortal && (activeTab === 'departments' || activeTab === 'class-portals' || activeTab === 'backup')) {
        setActiveTab('class-portal-dashboard');
      }
    }
  }, [user]);

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col items-center justify-center space-y-4 font-sans relative overflow-hidden">
        <div className="bg-aurora-glow" />
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-md relative z-10">
          <RefreshCw className="w-7 h-7 animate-spin" />
        </div>
        <h2 className="font-extrabold text-lg text-slate-900 relative z-10">Initializing KANDRIX AI Attendance System...</h2>
        <p className="text-xs text-slate-500 relative z-10">AI Enhanced Smart QR Attendance Platform</p>
      </div>
    );
  }

  // Route Guard: If first login password change is required, force modal overlay
  if (mustChangePasswordTempToken || (user && (user.is_first_login === true || user.is_first_login === 1 || user.must_change_password === 1))) {
    return <FirstLoginModal />;
  }

  // Route Guard: If not authenticated, render Login Page
  if (!user || !token) {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 transition-colors duration-300 font-sans relative overflow-x-hidden">
      {/* Ambient Background Glow */}
      <div className="bg-aurora-glow" />

      <Navbar />

      <div className="flex-1 flex flex-col md:flex-row relative z-10 max-w-[1500px] w-full mx-auto">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-4 md:p-6 lg:p-8 w-full overflow-y-auto">
          {isAdmin ? (
            /* Portal 1: Super Admin Portal */
            <>
              {activeTab === 'dashboard' && <ClassManagementPage />}
              {activeTab === 'class-portals' && <ClassManagementPage />}
              {activeTab === 'students-management' && <StudentManagement />}
              {activeTab === 'faculty-management' && <FacultyManagement />}
              {activeTab === 'subjects' && <SubjectsPage onNavigate={handleNavigate} />}
              {activeTab === 'reports' && <AttendanceReportsPage onNavigate={handleNavigate} />}
              {activeTab === 'backup' && <AttendanceManagementPage />}
              {(activeTab === 'profile' || activeTab === 'settings') && <ProfilePage />}
            </>
          ) : isClassPortal ? (
            /* Portal 2: Class Portal */
            <>
              {(activeTab === 'class-portal-dashboard' || activeTab === 'dashboard') && (
                <SessionHub
                  initialSubject={sessionParams?.subject}
                  initialFaculty={sessionParams?.faculty}
                  initialSubjectCode={sessionParams?.code}
                  initialPeriod={sessionParams?.period}
                />
              )}
              {activeTab === 'students-management' && <StudentManagement />}
              {activeTab === 'faculty-management' && <FacultyManagement />}
              {activeTab === 'subjects' && <SubjectsPage onNavigate={handleNavigate} />}
              {activeTab === 'timetable' && <TimetablePage onNavigate={handleNavigate} />}
              {activeTab === 'sessions' && (
                <SessionHub
                  initialSubject={sessionParams?.subject}
                  initialFaculty={sessionParams?.faculty}
                  initialSubjectCode={sessionParams?.code}
                  initialPeriod={sessionParams?.period}
                />
              )}
              {activeTab === 'reports' && <AttendanceReportsPage onNavigate={handleNavigate} />}
              {(activeTab === 'profile' || activeTab === 'settings') && <ProfilePage />}
            </>
          ) : (
            /* Portal 3: Student Portal */
            <>
              {(activeTab === 'student-dashboard' || activeTab === 'dashboard' || activeTab === 'history') && <StudentDashboard />}
              {activeTab === 'qr-scanner' && (
                <QRScannerView onSuccessReturn={() => setActiveTab('student-dashboard')} />
              )}
              {activeTab === 'student-timetable' && <StudentTimetablePage />}
              {(activeTab === 'profile' || activeTab === 'settings') && <ProfilePage />}
            </>
          )}
        </main>
      </div>
      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

