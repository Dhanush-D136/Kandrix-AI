import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { SubjectItem, Department } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Plus,
  Edit3,
  Archive,
  Trash2,
  X,
  Search,
  UserCheck,
  CheckCircle2,
  Calendar,
  Clock,
  Layers,
  FileSpreadsheet,
  QrCode,
  ListChecks
} from 'lucide-react';

interface SubjectsPageProps {
  onNavigate?: (tab: string, extraData?: any) => void;
}

export const SubjectsPage: React.FC<SubjectsPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isFaculty = user?.role === 'student' ? false : !isAdmin; // detect faculty/admin

  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'Theory',
    department: 'AI & DS',
    year: '3',
    semester: '5',
    section: 'A',
    faculty_name: user?.name || '',
    credits: '3',
    status: 'Active',
    description: ''
  });

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (isFaculty && user?.name) {
        params.append('faculty_name', user.name);
      }
      if (departmentFilter) params.append('department', departmentFilter);
      if (semesterFilter) params.append('semester', semesterFilter);
      if (typeFilter) params.append('type', typeFilter);

      const [resSub, resDept] = await Promise.all([
        api.get(`/subjects?${params.toString()}`),
        api.get('/departments')
      ]);

      setSubjects(resSub.data.subjects || []);
      setDepartments(resDept.data.departments || []);
    } catch (err) {
      console.error('Failed to fetch subjects', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [departmentFilter, semesterFilter, typeFilter]);

  const openAddModal = () => {
    setEditingSubject(null);
    setFormData({
      name: '',
      code: '',
      type: 'Theory',
      department: departments[0]?.name || 'AI & DS',
      year: '3',
      semester: '5',
      section: 'A',
      faculty_name: user?.name || '',
      credits: '3',
      status: 'Active',
      description: ''
    });
    setShowModal(true);
  };

  const openEditModal = (sub: SubjectItem) => {
    setEditingSubject(sub);
    setFormData({
      name: sub.name,
      code: sub.code,
      type: (sub as any).type || 'Theory',
      department: sub.department,
      year: String(sub.year),
      semester: String(sub.semester),
      section: (sub as any).section || 'A',
      faculty_name: sub.faculty_name || '',
      credits: String(sub.credits || 3),
      status: (sub as any).status || 'Active',
      description: sub.description || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSubject) {
        await api.put(`/subjects/${editingSubject.id}`, formData);
        alert('✅ Subject updated successfully!');
      } else {
        await api.post('/subjects', formData);
        alert('✅ Subject created and synchronized across modules!');
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to save subject'}`);
    }
  };

  const handleToggleArchive = async (id: string) => {
    try {
      await api.put(`/subjects/${id}/archive`);
      fetchData();
    } catch (err) {
      alert('Failed to archive subject');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete subject "${name}"? This action cannot be undone.`)) {
      try {
        await api.delete(`/subjects/${id}`);
        fetchData();
      } catch (err) {
        alert('Failed to delete subject');
      }
    }
  };

  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      (s.faculty_name && s.faculty_name.toLowerCase().includes(search.toLowerCase()));

    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-2xl text-[#111827]">
              Subject Master & Curriculum Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold text-xs border border-blue-200">
              KANDRIX AI
            </span>
          </div>
          <p className="text-xs text-[#6B7280] font-medium mt-1">
            Manage academic subjects, assign faculty, set credits, and synchronize with Timetable and Attendance Hub.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openAddModal}
            className="px-5 py-2.5 rounded-full bg-[#6D5DFC] text-xs font-bold text-white shadow-floating hover:bg-[#5b4be0] transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Subject</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-[24px] border border-[#E7E7E7] shadow-enterprise flex flex-col md:flex-row items-center gap-3">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search by subject name, code, or faculty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] placeholder-[#9CA3AF] pl-9 focus:outline-none focus:border-[#6D5DFC] font-medium"
          />
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3" />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
          >
            <option value="">All Departments</option>
            <option value="AI & DS">AI & DS</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Electronics">Electronics</option>
            <option value="Mechanical">Mechanical</option>
          </select>

          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
          >
            <option value="">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
          >
            <option value="">All Types</option>
            <option value="Theory">Theory</option>
            <option value="Laboratory">Laboratory</option>
            <option value="Project">Project</option>
            <option value="Seminar">Seminar</option>
            <option value="Library/Sports">Library/Sports</option>
          </select>
        </div>
      </div>

      {/* Subjects Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSubjects.map((sub) => {
          const typeColor =
            (sub as any).type === 'Laboratory'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : (sub as any).type === 'Project'
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : (sub as any).type === 'Seminar'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-blue-50 text-blue-700 border-blue-200';

          return (
            <div
              key={sub.id}
              className={`bg-white p-6 rounded-[24px] border shadow-enterprise space-y-4 flex flex-col justify-between transition-all ${
                sub.is_archived ? 'opacity-60 border-slate-300 bg-slate-50' : 'border-[#E7E7E7] hover:border-[#6D5DFC]/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#F3F0FF] text-[#6D5DFC] flex items-center justify-center font-bold shadow-sm">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-extrabold text-base text-[#111827]">{sub.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-bold text-[#6D5DFC] font-mono px-2 py-0.5 rounded-full bg-[#F3F0FF] border border-[#6D5DFC]/20">
                          {sub.code}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeColor}`}>
                          {(sub as any).type || 'Theory'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(sub)}
                        className="p-1.5 rounded-full text-[#6B7280] hover:text-[#6D5DFC] hover:bg-[#F3F0FF] transition-colors"
                        title="Edit Subject"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id, sub.name)}
                        className="p-1.5 rounded-full text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Subject"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[#6B7280] font-medium">
                    <span>Dept: <strong className="text-[#111827]">{sub.department}</strong></span>
                    <span>Sem {sub.semester} • Sec {(sub as any).section || 'A'} • {sub.credits} Credits</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#111827] font-semibold pt-1">
                    <UserCheck className="w-4 h-4 text-[#4F7CFF]" />
                    <span>Faculty: <strong className="text-[#4F7CFF]">{sub.faculty_name || 'Assigned Faculty'}</strong></span>
                  </div>

                  {/* Attendance Stats Widget */}
                  <div className="p-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] grid grid-cols-3 gap-2 text-center text-xs mt-3">
                    <div>
                      <span className="text-[9px] text-[#6B7280] font-bold block uppercase">Classes</span>
                      <strong className="font-mono text-[#111827] font-extrabold text-xs">{(sub as any).classesHeld || 0}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#12B76A] font-bold block uppercase">Present</span>
                      <strong className="font-mono text-[#12B76A] font-extrabold text-xs">{(sub as any).presentCount || 0}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#6D5DFC] font-bold block uppercase">Attendance</span>
                      <strong className="font-mono text-[#6D5DFC] font-extrabold text-xs">
                        {(sub as any).classesHeld && (sub as any).classesHeld > 0 && (sub as any).avgPercentage !== null && (sub as any).avgPercentage !== undefined
                          ? `${(sub as any).avgPercentage}%`
                          : '--'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Faculty / Admin */}
              <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => onNavigate && onNavigate('reports', { subject: sub.name, code: sub.code })}
                  className="px-3 py-2 rounded-xl bg-[#F3F0FF] text-[#6D5DFC] font-bold hover:bg-[#6D5DFC] hover:text-white transition-all flex items-center justify-center gap-1.5"
                >
                  <ListChecks className="w-3.5 h-3.5" />
                  <span>View Attendance</span>
                </button>

                <button
                  onClick={() => onNavigate && onNavigate('sessions', { subject: sub.name, code: sub.code, faculty: sub.faculty_name })}
                  className="px-3 py-2 rounded-xl bg-[#ECFDF5] text-[#12B76A] font-bold border border-[#12B76A]/20 hover:bg-[#12B76A] hover:text-white transition-all flex items-center justify-center gap-1.5"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Generate QR</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Subject Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[24px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <h3 className="font-display font-bold text-lg text-[#111827]">
                {editingSubject ? 'Edit Subject Details' : 'Add New Subject'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Subject Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Operating Systems"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Subject Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. CS301 / AL3501"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-mono uppercase font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Subject Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
                  >
                    <option value="Theory">Theory</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="Project">Project</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Library/Sports">Library/Sports</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Credits</label>
                  <input
                    type="number"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-2.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium text-[11px]"
                  >
                    <option value="AI & DS">AI & DS</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Mechanical">Mechanical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Semester</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full px-2.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium text-[11px]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Sem {s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Section</label>
                  <select
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-2.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium text-[11px]"
                  >
                    <option value="A">Sec A</option>
                    <option value="B">Sec B</option>
                    <option value="C">Sec C</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Assigned Faculty Name</label>
                <input
                  type="text"
                  value={formData.faculty_name}
                  onChange={(e) => setFormData({ ...formData, faculty_name: e.target.value })}
                  placeholder="e.g. Dr Rajesh Kumar"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0] transition-all mt-2"
              >
                {editingSubject ? 'Update Subject' : 'Save Subject & Sync Modules'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
