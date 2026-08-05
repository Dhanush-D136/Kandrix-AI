import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Building, GraduationCap, Calendar, Layers, Plus, Trash2, Save, CheckCircle2 } from 'lucide-react';

export const InstitutionManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'courses' | 'batches' | 'semesters' | 'sections'>('settings');

  // Institution Settings State
  const [settings, setSettings] = useState({
    institution_name: 'KANDRIX AI Attendance System',
    logo_url: '',
    academic_year: '2026-2027 (ODD)',
    semester_settings: 'Odd Semester (V)',
    min_attendance_pct: 75
  });

  // Master Data Lists
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  // Modal / Input States
  const [courseForm, setCourseForm] = useState({ name: '', code: '', duration_years: 4, description: '' });
  const [batchForm, setBatchForm] = useState({ name: '', start_year: 2024, end_year: 2028 });
  const [sectionForm, setSectionForm] = useState({ name: '', capacity: 60 });
  const [msg, setMsg] = useState('');

  const fetchMasterData = async () => {
    try {
      const [resInst, resCrs, resBth, resSem, resSec] = await Promise.all([
        api.get('/institution'),
        api.get('/courses'),
        api.get('/batches'),
        api.get('/semesters'),
        api.get('/sections')
      ]);

      if (resInst.data.settings) setSettings(resInst.data.settings);
      setCourses(resCrs.data.courses || []);
      setBatches(resBth.data.batches || []);
      setSemesters(resSem.data.semesters || []);
      setSections(resSec.data.sections || []);
    } catch (err) {
      console.error('Failed to load institution master data', err);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/institution', settings);
      setMsg('Institution settings saved successfully!');
      setTimeout(() => setMsg(''), 3000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save settings');
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/courses', courseForm);
      setCourseForm({ name: '', code: '', duration_years: 4, description: '' });
      fetchMasterData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add course');
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (confirm('Delete this course?')) {
      await api.delete(`/courses/${id}`);
      fetchMasterData();
    }
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/batches', batchForm);
      setBatchForm({ name: '', start_year: 2024, end_year: 2028 });
      fetchMasterData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add batch');
    }
  };

  const handleDeleteBatch = async (id: string) => {
    if (confirm('Delete this batch?')) {
      await api.delete(`/batches/${id}`);
      fetchMasterData();
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/sections', sectionForm);
      setSectionForm({ name: '', capacity: 60 });
      fetchMasterData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add section');
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (confirm('Delete this section?')) {
      await api.delete(`/sections/${id}`);
      fetchMasterData();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-extrabold text-2xl text-slate-900">Institution & Master Setup</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Configure global institution settings, courses, batches, semesters, and sections</p>
        </div>
      </div>

      {msg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{msg}</span>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Institution Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'courses' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Courses ({courses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('batches')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'batches' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Batches ({batches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('semesters')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'semesters' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Semesters ({semesters.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sections')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'sections' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Sections ({sections.length})</span>
        </button>
      </div>

      {/* TAB 1: INSTITUTION SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="kandrix-card p-6 space-y-4 max-w-2xl">
          <h3 className="font-extrabold text-lg text-slate-900 border-b border-slate-200 pb-3">Institution Configuration</h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Institution Name</label>
            <input
              type="text"
              required
              value={settings.institution_name}
              onChange={(e) => setSettings({ ...settings, institution_name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Academic Year</label>
              <input
                type="text"
                required
                value={settings.academic_year}
                onChange={(e) => setSettings({ ...settings, academic_year: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Semester Cycle</label>
              <input
                type="text"
                required
                value={settings.semester_settings}
                onChange={(e) => setSettings({ ...settings, semester_settings: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Minimum Attendance Threshold (%)</label>
            <input
              type="number"
              min="50"
              max="100"
              required
              value={settings.min_attendance_pct}
              onChange={(e) => setSettings({ ...settings, min_attendance_pct: Number(e.target.value) })}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-blue-600 text-white text-xs font-extrabold shadow-md hover:bg-blue-700 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </form>
      )}

      {/* TAB 2: COURSES CRUD */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <form onSubmit={handleAddCourse} className="kandrix-card p-6 space-y-4 max-w-xl">
            <h3 className="font-extrabold text-base text-slate-900">Add New Course</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Course Name (e.g. B.Tech)"
                required
                value={courseForm.name}
                onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs"
              />
              <input
                type="text"
                placeholder="Course Code (e.g. BTECH)"
                required
                value={courseForm.code}
                onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs uppercase"
              />
            </div>
            <button type="submit" className="px-4 py-2.5 rounded-2xl bg-blue-600 text-white text-xs font-bold flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Course
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {courses.map((c) => (
              <div key={c.id} className="kandrix-card p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{c.name}</h4>
                  <p className="text-xs text-blue-600 font-mono font-semibold">{c.code} &bull; {c.duration_years} Years</p>
                </div>
                <button onClick={() => handleDeleteCourse(c.id)} className="text-rose-500 hover:text-rose-700 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: BATCHES CRUD */}
      {activeTab === 'batches' && (
        <div className="space-y-6">
          <form onSubmit={handleAddBatch} className="kandrix-card p-6 space-y-4 max-w-xl">
            <h3 className="font-extrabold text-base text-slate-900">Add Academic Batch</h3>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Batch Name (e.g. 2024-2028)"
                required
                value={batchForm.name}
                onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs"
              />
              <input
                type="number"
                placeholder="Start Year"
                value={batchForm.start_year}
                onChange={(e) => setBatchForm({ ...batchForm, start_year: Number(e.target.value) })}
                className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs"
              />
              <input
                type="number"
                placeholder="End Year"
                value={batchForm.end_year}
                onChange={(e) => setBatchForm({ ...batchForm, end_year: Number(e.target.value) })}
                className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs"
              />
            </div>
            <button type="submit" className="px-4 py-2.5 rounded-2xl bg-blue-600 text-white text-xs font-bold flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Batch
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {batches.map((b) => (
              <div key={b.id} className="kandrix-card p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{b.name}</h4>
                  <p className="text-xs text-slate-500">{b.start_year} - {b.end_year}</p>
                </div>
                <button onClick={() => handleDeleteBatch(b.id)} className="text-rose-500 hover:text-rose-700 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SEMESTERS VIEW */}
      {activeTab === 'semesters' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {semesters.map((s) => (
            <div key={s.id} className="kandrix-card p-4 text-center">
              <h4 className="font-extrabold text-slate-900 text-base">{s.name}</h4>
              <p className="text-xs text-blue-600 font-bold">Semester #{s.semester_number}</p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: SECTIONS CRUD */}
      {activeTab === 'sections' && (
        <div className="space-y-6">
          <form onSubmit={handleAddSection} className="kandrix-card p-6 space-y-4 max-w-xl">
            <h3 className="font-extrabold text-base text-slate-900">Add Section</h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Section Name (e.g. A, B)"
                required
                value={sectionForm.name}
                onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs uppercase"
              />
              <input
                type="number"
                placeholder="Capacity (e.g. 60)"
                value={sectionForm.capacity}
                onChange={(e) => setSectionForm({ ...sectionForm, capacity: Number(e.target.value) })}
                className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs"
              />
            </div>
            <button type="submit" className="px-4 py-2.5 rounded-2xl bg-blue-600 text-white text-xs font-bold flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Section
            </button>
          </form>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sections.map((s) => (
              <div key={s.id} className="kandrix-card p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">Section {s.name}</h4>
                  <p className="text-xs text-slate-500">Capacity: {s.capacity} Students</p>
                </div>
                <button onClick={() => handleDeleteSection(s.id)} className="text-rose-500 hover:text-rose-700 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
