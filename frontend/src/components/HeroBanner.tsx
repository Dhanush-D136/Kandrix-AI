import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Image as ImageIcon, Settings } from 'lucide-react';
import { HeroBannerSettingsModal } from './HeroBannerSettingsModal';

export const HeroBanner: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [bannerUrl, setBannerUrl] = useState<string>(() => {
    return localStorage.getItem('elite_minds_hero_banner') || '/family.jpg';
  });

  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      setBannerUrl(localStorage.getItem('elite_minds_hero_banner') || '/family.jpg');
    };
    window.addEventListener('hero_banner_updated', handleStorageChange);
    return () => window.removeEventListener('hero_banner_updated', handleStorageChange);
  }, []);

  return (
    <div className="relative w-full rounded-[28px] overflow-hidden shadow-enterprise border border-[#E7E7E7] group transition-all duration-500 animate-fade-in my-2">
      {/* Smart Responsive Container with Full-Width Cinematic Cover & Rich Shading */}
      <div className="relative w-full h-[220px] sm:h-[280px] md:h-[360px] bg-[#0B0F19] overflow-hidden flex items-center justify-center">
        {/* Main Cover Image */}
        <img
          src={bannerUrl}
          alt="Elite Minds Family Hero Cover"
          className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700 ease-out filter contrast-105 z-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/family.jpg';
          }}
        />

        {/* Soft Premium Gradient & Glass Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19]/90 via-[#0B0F19]/35 to-transparent z-0" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F19]/80 via-[#0B0F19]/30 to-transparent hidden sm:block z-0" />

        {/* Top-Right Badge */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span>KANDRIX AI ATTENDANCE PLATFORM</span>
          </span>

          {isAdmin && (
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full bg-black/50 hover:bg-blue-600 backdrop-blur-md border border-white/20 text-white transition-all shadow-md group/btn"
              title="Configure Hero Banner Image"
            >
              <Settings className="w-4 h-4 group-hover/btn:rotate-90 transition-transform duration-300" />
            </button>
          )}
        </div>

        {/* Bottom Branding Overlay (Bottom-Left on Desktop, Bottom-Center on Mobile) */}
        <div className="absolute bottom-5 left-5 right-5 sm:right-auto sm:max-w-xl text-center sm:text-left space-y-1.5 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-600/30 backdrop-blur-md border border-blue-400/40 text-blue-200 text-[10px] font-mono font-extrabold uppercase tracking-wider">
            Official Institution Portal
          </div>

          <h1 className="font-sans font-extrabold text-2xl sm:text-3xl md:text-4xl text-white tracking-tight drop-shadow-md">
            KANDRIX AI Attendance System
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed drop-shadow-sm">
            AI Enhanced Smart QR Attendance Platform. Fast, secure, dynamic attendance management.
          </p>
        </div>
      </div>

      {/* Admin Settings Modal */}
      {showSettings && (
        <HeroBannerSettingsModal
          currentUrl={bannerUrl}
          onClose={() => setShowSettings(false)}
          onSave={(newUrl) => {
            localStorage.setItem('elite_minds_hero_banner', newUrl);
            setBannerUrl(newUrl);
            window.dispatchEvent(new Event('hero_banner_updated'));
            setShowSettings(false);
          }}
        />
      )}
    </div>
  );
};
