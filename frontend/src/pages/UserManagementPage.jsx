import React, { useEffect, useState } from 'react';
import { userService } from '../services/api';
import { UserPlus, Edit, ToggleLeft, ToggleRight, Search, X } from 'lucide-react';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'petugas' });
  const [formError, setFormError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadUsers();
  }, [currentPage, searchTerm, roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await userService.getAll({
        page: currentPage,
        search: searchTerm,
        role: roleFilter,
      });
      setUsers(data.data || []);
      setTotalPages(data.last_page || 1);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      if (editingUser) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        await userService.update(editingUser.id, updateData);
      } else {
        await userService.create(formData);
      }
      setShowForm(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'petugas' });
      loadUsers();
    } catch (error) {
      setFormError(error.response?.data?.message || 'Gagal menyimpan data pengguna.');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, password: '', role: user.role });
    setShowForm(true);
  };

  const handleToggleActive = async (userId) => {
    try {
      await userService.toggleActive(userId);
      loadUsers();
    } catch (error) {
      console.error('Error toggling user:', error);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'petugas' });
    setFormError('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Kelola Akun Pengguna</h1>
        <button onClick={() => { cancelForm(); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Tambah Akun
        </button>
      </div>

      {/* Search & Filter */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Cari nama atau email..."
              className="input-field pl-10"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
            className="input-field w-full md:w-48"
          >
            <option value="">Semua Peran</option>
            <option value="admin">Admin</option>
            <option value="petugas">Petugas</option>
          </select>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card border-primary">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h2>
            <button onClick={cancelForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>

          {formError && (
            <div className="bg-red-600/20 border border-red-600 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{formError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nama</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password {editingUser && '(kosongkan jika tidak diubah)'}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input-field"
                {...(!editingUser && { required: true })}
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Peran</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="input-field"
              >
                <option value="petugas">Petugas Lapangan</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary">{editingUser ? 'Simpan Perubahan' : 'Buat Akun'}</button>
              <button type="button" onClick={cancelForm} className="btn-secondary">Batal</button>
            </div>
          </form>
        </div>
      )}

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                  user.role === 'admin' ? 'bg-primary' : 'bg-blue-600'
                }`}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-gray-400">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-blue-600/20 text-blue-400'
                }`}>
                  {user.role === 'admin' ? 'Admin' : 'Petugas'}
                </span>
                <span className="text-sm text-gray-400">{user.tracking_sessions_count || 0} tracking</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEdit(user)} className="text-gray-400 hover:text-white p-1" title="Edit">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleToggleActive(user.id)} className="p-1" title={user.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                    {user.is_active ? (
                      <ToggleRight className="w-6 h-6 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn-secondary disabled:opacity-50">Sebelumnya</button>
          <span className="text-gray-400">Halaman {currentPage} dari {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn-secondary disabled:opacity-50">Selanjutnya</button>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
