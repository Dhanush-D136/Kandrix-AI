import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Users,
  UserCheck,
  QrCode,
  FileSpreadsheet,
  Database,
  User,
  Camera,
  History,
  Sparkles,
  BookOpen,
  Settings as SettingsIcon,
  LogOut,
  GraduationCap
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const role = user?.role;
  const isSuperAdmin = role === 'admin';
  const isClassPortal = role === 'class_portal' || role === 'faculty';

  // 1. Super Admin Sidebar Items
  const superAdminNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'class-portals', label: 'Class Portals', icon: GraduationCap },
    { id: 'students-management', label: 'Global Students', icon: Users },
    { id: 'faculty-management', label: 'Faculty & Staff', icon: UserCheck },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
    { id: 'backup', label: 'Database Backup', icon: Database },
  ];

  // 2. Class Portal Sidebar Items
  const classPortalNavItems = [
    { id: 'class-portal-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students-management', label: 'Students', icon: Users },
    { id: 'faculty-management', label: 'Faculty', icon: UserCheck },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'timetable', label: 'Timetable', icon: Calendar },
    { id: 'sessions', label: 'Attendance', icon: QrCode },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  // 3. Student Portal Sidebar Items
  const studentNavItems = [
    { id: 'student-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'qr-scanner', label: 'Scan QR', icon: Camera },
    { id: 'history', label: 'Attendance', icon: History },
    { id: 'student-timetable', label: 'Timetable', icon: Calendar },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const navItems = isSuperAdmin 
    ? superAdminNavItems 
    : isClassPortal 
      ? classPortalNavItems 
      : studentNavItems;

  const getBadgeLabel = () => {
    if (isSuperAdmin) return 'Super Admin';
    if (isClassPortal) return user?.department || 'Class Portal';
    return 'Student Portal';
  };

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:block w-64 p-4 shrink-0">
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-[28px] p-4 shadow-sm space-y-4 min-h-[calc(100vh-100px)] flex flex-col justify-between">
          <div>
            {/* Console Header Badge */}
            <div className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100 flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                  {getBadgeLabel()}
                </span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Navigation Items */}
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-medium text-xs transition-all duration-200 group ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Logout Button at bottom */}
          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-medium text-xs text-rose-600 hover:bg-rose-50/80 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-slate-200/80 px-2 py-2 shadow-lg">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all ${
                  isActive
                    ? 'text-blue-600 font-bold bg-blue-50'
                    : 'text-slate-500 font-medium hover:text-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110 text-blue-600' : 'text-slate-500'}`} />
                <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={logout}
            className="flex flex-col items-center justify-center py-1 px-2 rounded-2xl text-rose-500 hover:text-rose-700"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 tracking-tight">Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
};

