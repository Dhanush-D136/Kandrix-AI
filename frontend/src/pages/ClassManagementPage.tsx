import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  GraduationCap,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  Key,
  ShieldCheck,
  Search,
  AlertTriangle
} from 'lucide-react';

interface ClassPortal {
  id: string;
  portal_name?: string;
  portal_id: string;
  display_name: string;
  username: string;
  advisor: string;
  room: string;
  max_students: number;
  created_at: string;
}

export const ClassManagementPage: React.FC = () => {
  const [classPortals, setClassPortals] = useState<ClassPortal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatedPortal, setGeneratedPortal] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    portal_name: 'AI & DS III A',
    display_name: 'AI3A',
    portal_id: 'AI3A',
    username: 'AI3A',
    password: '1234',
    advisor: 'Mrs Vasantha Priya',
    room: 'F305',
    max_students: 61
  });

  const fetchPortals = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/class-portals');
      const data = res.data.class_portals || res.data || [];
      setClassPortals(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load class portals', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortals();
  }, []);

  const handleCreatePortal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const res = await api.post('/class-portals', formData);
      const created = res.data.portal || res.data;
      setGeneratedPortal(created);
      setShowGenerateModal(false);
      fetchPortals();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to create Class Portal';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePortal = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete Class Portal ${name}?`)) {
      try {
        await api.delete(`/class-portals/${id}`);
        fetchPortals();
      } catch (err) {
        alert('Failed to delete class portal');
      }
    }
  };

  const filteredPortals = classPortals.filter(
    (cp) =>
      (cp.display_name && cp.display_name.toLowerCase().includes(search.toLowerCase())) ||
      (cp.portal_id && cp.portal_id.toLowerCase().includes(search.toLowerCase())) ||
      (cp.portal_name && cp.portal_name.toLowerCase().includes(search.toLowerCase())) ||
      (cp.advisor && cp.advisor.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-2xl text-slate-900">Class Portal Creator & Hub</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold text-xs border border-blue-200">
              SUPER ADMIN
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Deploy isolated Class Portals with automated Student, Staff, Subject, Timetable, Attendance, and 7s Rotating QR Containers.
          </p>
        </div>

        <button
          onClick={() => { setGeneratedPortal(null); setErrorMsg(''); setShowGenerateModal(true); }}
          className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Class Portal</span>
        </button>
      </div>

      {/* Generated Credentials Success Card */}
      {generatedPortal && (
        <div className="p-6 rounded-[28px] bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Class Portal {generatedPortal.display_name} Configured & Active!</span>
            </div>
            <button onClick={() => setGeneratedPortal(null)} className="text-xs text-slate-500 hover:text-slate-900">Dismiss</button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white border border-emerald-100">
              <span className="text-slate-500 block">Portal ID</span>
              <strong className="text-slate-900 font-mono font-extrabold">{generatedPortal.portal_id}</strong>
            </div>
            <div className="p-3 rounded-xl bg-white border border-emerald-100">
              <span className="text-slate-500 block">Username</span>
              <strong className="text-blue-700 font-mono font-extrabold">{generatedPortal.username}</strong>
            </div>
            <div className="p-3 rounded-xl bg-white border border-emerald-100">
              <span className="text-slate-500 block">Default Password</span>
              <strong className="text-emerald-700 font-mono font-extrabold">{generatedPortal.password || '1234'}</strong>
            </div>
            <div className="p-3 rounded-xl bg-white border border-emerald-100">
              <span className="text-slate-500 block">Class Advisor</span>
              <strong className="text-slate-900 font-extrabold">{generatedPortal.advisor || 'Assigned'}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="kandrix-card p-4 flex items-center gap-3">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            placeholder="Search portal display name, portal ID, or advisor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 pl-9 focus:outline-none focus:border-blue-500 font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>
      </div>

      {/* Class Portals Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-500 font-medium">Loading class portals...</div>
      ) : filteredPortals.length === 0 ? (
        <div className="kandrix-card p-12 text-center space-y-3">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-extrabold text-base text-slate-800">No Class Portals Deployed Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">Click "Create Class Portal" above to deploy your first isolated Class Portal.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPortals.map((cp) => (
            <div key={cp.id} className="kandrix-card p-6 space-y-4 flex flex-col justify-between hover:border-blue-300 transition-all">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shadow-sm border border-blue-100">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">{cp.display_name}</h3>
                      <span className="text-[10px] font-bold text-blue-600 font-mono px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200">
                        {cp.portal_id}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeletePortal(cp.id, cp.display_name)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Class Portal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-700 font-medium">
                    <span className="text-slate-500">Portal Name:</span>
                    <strong className="text-slate-900 font-bold">{cp.portal_name || cp.display_name}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 font-medium">
                    <span className="text-slate-500">Class Advisor:</span>
                    <strong className="text-slate-900 font-bold">{cp.advisor || 'N/A'}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 font-medium">
                    <span className="text-slate-500">Room Number:</span>
                    <strong className="text-slate-900 font-bold">Room {cp.room || '306'}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 font-medium pt-2 border-t border-slate-100">
                    <span className="text-slate-500">Login Username:</span>
                    <span className="font-mono font-bold text-emerald-600">{cp.username}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Containers Bound
                </span>
                <span className="text-slate-400 font-mono">Max Capacity: {cp.max_students || 70}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE CLASS PORTAL MODAL */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[28px] p-7 border border-slate-200 shadow-2xl space-y-5 animate-fade-in relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-lg text-slate-900">Create Class Portal</h3>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
                <button type="button" onClick={() => setErrorMsg('')} className="text-rose-500 hover:text-rose-800 font-bold">✕</button>
              </div>
            )}

            <form onSubmit={handleCreatePortal} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Portal Name</label>
                  <input
                    type="text"
                    required
                    value={formData.portal_name}
                    onChange={(e) => setFormData({ ...formData, portal_name: e.target.value })}
                    placeholder="e.g. AI & DS III A"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="e.g. AI3A"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Portal ID</label>
                  <input
                    type="text"
                    required
                    value={formData.portal_id}
                    onChange={(e) => setFormData({ ...formData, portal_id: e.target.value })}
                    placeholder="e.g. AI3A"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="e.g. AI3A"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Default Password</label>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="e.g. 1234"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Class Advisor</label>
                  <input
                    type="text"
                    required
                    value={formData.advisor}
                    onChange={(e) => setFormData({ ...formData, advisor: e.target.value })}
                    placeholder="e.g. Mrs Vasantha Priya"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Room No.</label>
                  <input
                    type="text"
                    required
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    placeholder="e.g. F305"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Maximum Students</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="300"
                  value={formData.max_students}
                  onChange={(e) => setFormData({ ...formData, max_students: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-100 text-[11px] text-blue-700 space-y-1 font-medium">
                <p className="font-bold text-blue-800 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5" /> Automatic Container Linkage:
                </p>
                <p>Backend automatically binds Students, Staff, Subjects, Timetable, Attendance, Reports & 7s QR Engine for <strong>{formData.display_name || 'AI3A'}</strong>.</p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 font-extrabold text-xs text-white shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Creating Portal...' : 'Create Class Portal'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
