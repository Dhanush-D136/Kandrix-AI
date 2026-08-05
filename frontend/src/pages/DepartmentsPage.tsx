import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Department } from '../types';
import { Building2, Plus, Edit3, Trash2, X, Search, CheckCircle2, UserCheck } from 'lucide-react';

export const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    hod_name: '',
    description: ''
  });

  const fetchDepartments = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/departments');
      const list = Array.isArray(res.data) ? res.data : (res.data.departments || []);
      setDepartments(list);
    } catch (err) {
      console.error('Failed to fetch departments', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openAddModal = () => {
    setEditingDept(null);
    setFormData({ name: '', code: '', hod_name: '', description: '' });
    setShowModal(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      hod_name: dept.hod_name || '',
      description: dept.description || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await api.put(`/departments/${editingDept.id}`, formData);
      } else {
        await api.post('/departments', formData);
      }
      setShowModal(false);
      fetchDepartments();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save department');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name} department?`)) {
      try {
        await api.delete(`/departments/${id}`);
        fetchDepartments();
      } catch (err) {
        alert('Failed to delete department');
      }
    }
  };

  const filteredDepts = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.code.toLowerCase().includes(search.toLowerCase()) ||
      (d.hod_name && d.hod_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-[#111827]">Department Management</h1>
          <p className="text-xs text-[#6B7280] font-medium mt-1">Manage college academic departments, department codes, and HOD assignments</p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 rounded-full bg-[#6D5DFC] text-xs font-bold text-white shadow-floating hover:bg-[#5b4be0] transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-[24px] border border-[#E7E7E7] shadow-enterprise flex items-center gap-3">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            placeholder="Search department name, code, or HOD..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] placeholder-[#9CA3AF] pl-9 focus:outline-none focus:border-[#6D5DFC] font-medium"
          />
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3" />
        </div>
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDepts.map((dept) => (
          <div key={dept.id} className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4 hover:border-[#6D5DFC]/40 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#F3F0FF] text-[#6D5DFC] flex items-center justify-center font-bold shadow-sm">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-base text-[#111827]">{dept.name}</h3>
                    <span className="text-[10px] font-bold text-[#6D5DFC] font-mono px-2 py-0.5 rounded-full bg-[#F3F0FF] border border-[#6D5DFC]/20">
                      {dept.code}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(dept)}
                    className="p-1.5 rounded-full text-[#6B7280] hover:text-[#6D5DFC] hover:bg-[#F3F0FF] transition-colors"
                    title="Edit Department"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(dept.id, dept.name)}
                    className="p-1.5 rounded-full text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Department"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[#111827] font-semibold">
                  <UserCheck className="w-4 h-4 text-[#4F7CFF]" />
                  <span>HOD: <strong className="text-[#4F7CFF]">{dept.hod_name || 'Unassigned'}</strong></span>
                </div>
                <p className="text-[#6B7280] text-[11px] font-medium leading-relaxed">
                  {dept.description || 'No description provided.'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[24px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <h3 className="font-display font-bold text-lg text-[#111827]">
                {editingDept ? 'Edit Department' : 'Add New Department'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Department Code</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. CSE or AIDS"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">HOD Name</label>
                <input
                  type="text"
                  value={formData.hod_name}
                  onChange={(e) => setFormData({ ...formData, hod_name: e.target.value })}
                  placeholder="e.g. Dr. Vasantha Priya"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Department details..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0] transition-all"
              >
                {editingDept ? 'Update Department' : 'Create Department'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
