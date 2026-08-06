import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Camera, History, Calendar, User, QrCode, Users } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();

  if (!user) return null;

  const isStudent = user.role === 'student';
  const isClassPortal = user.role === 'class_portal' || user.role === 'faculty';

  if (!isStudent && !isClassPortal) return null;

  const studentTabs = [
    { id: 'student-dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'qr-scanner', label: 'Scan QR', icon: Camera },
    { id: 'history', label: 'Attendance', icon: History },
    { id: 'student-timetable', label: 'Timetable', icon: Calendar },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const classPortalTabs = [
    { id: 'class-portal-dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'sessions', label: 'QR Live', icon: QrCode },
    { id: 'students-management', label: 'Students', icon: Users },
    { id: 'timetable', label: 'Timetable', icon: Calendar },
  ];

  const tabs = isStudent ? studentTabs : classPortalTabs;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 px-2 py-2 flex items-center justify-around shadow-2xl">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 ${
              isActive
                ? 'text-blue-600 bg-blue-50/80 font-bold scale-105'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600 animate-pulse' : 'text-slate-400'}`} />
            <span className="text-[10px] tracking-tight mt-0.5">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
