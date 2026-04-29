import React, { useEffect, useState } from 'react';
import { roadDamageService } from '../services/api';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Trash2, Edit, MapPin, Calendar, Filter, Eye, X } from 'lucide-react';

const HistoryPage = () => {
  const [damages, setDamages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    type: '', severity: '', status: '',
    sort_by: 'created_at', sort_order: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDamage, setSelectedDamage] = useState(null);
  const [editingNotes, setEditingNotes] = useState('');

  useEffect(() => {
    loadDamages();
  }, [currentPage, filters]);

  const loadDamages = async () => {
    setLoading(true);
    try {
      const response = await roadDamageService.getAll({
        ...filters, page: currentPage, per_page: 12,
      });
      setDamages(response.data || []);
      setTotalPages(response.last_page || 1);
    } catch (error) {
      console.error('Error loading damages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      await roadDamageService.delete(id);
      loadDamages();
    } catch (error) {
      alert('Gagal menghapus data');
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await roadDamageService.update(id, { status: newStatus });
      loadDamages();
    } catch (error) {
      alert('Gagal mengupdate status');
    }
  };

  const handleSaveNotes = async (id) => {
    try {
      await roadDamageService.update(id, { notes: editingNotes });
      setSelectedDamage(null);
      loadDamages();
    } catch (error) {
      alert('Gagal menyimpan catatan');
    }
  };

  const getDamageTypeColor = (type) => {
    const colors = {
      'Retak-Buaya': 'text-red-400 bg-red-900/30',
      'Retak-Memanjang': 'text-yellow-400 bg-yellow-900/30',
      'Retak-Melintang': 'text-green-400 bg-green-900/30',
      'Lubang': 'text-blue-400 bg-blue-900/30',
    };
    return colors[type] || 'text-gray-400 bg-gray-900/30';
  };

  const getSeverityBadge = (severity) => {
    const badges = { high: 'bg-red-600 text-white', medium: 'bg-yellow-600 text-white', low: 'bg-green-600 text-white' };
    return badges[severity] || 'bg-gray-600 text-white';
  };

  const getStatusBadge = (status) => {
    const badges = { pending: 'bg-yellow-600 text-white', verified: 'bg-blue-600 text-white', repaired: 'bg-green-600 text-white' };
    return badges[status] || 'bg-gray-600 text-white';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Kelola Data Kerusakan</h1>
          <p className="text-gray-400 mt-1">Lihat, periksa, ubah, atau hapus data kerusakan jalan</p>
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary flex items-center gap-2">
          <Filter className="w-4 h-4" /> Filter & Sort
        </button>
      </div>

      {showFilters && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Filter & Pengurutan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Jenis Kerusakan</label>
              <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="input-field">
                <option value="">Semua</option>
                <option value="Retak-Buaya">Retak Buaya</option>
                <option value="Retak-Memanjang">Retak Memanjang</option>
                <option value="Retak-Melintang">Retak Melintang</option>
                <option value="Lubang">Lubang</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Keparahan</label>
              <select value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value })} className="input-field">
                <option value="">Semua</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="input-field">
                <option value="">Semua</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="repaired">Repaired</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Urutkan</label>
              <select
                value={`${filters.sort_by}_${filters.sort_order}`}
                onChange={(e) => {
                  const [sort_by, sort_order] = e.target.value.split('_');
                  setFilters({ ...filters, sort_by, sort_order });
                }}
                className="input-field"
              >
                <option value="created_at_desc">Terbaru</option>
                <option value="created_at_asc">Terlama</option>
                <option value="confidence_desc">Confidence Tertinggi</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : damages.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 text-lg">Belum ada data kerusakan jalan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {damages.map((damage) => (
            <div key={damage.id} className="card hover:border-primary transition-colors">
              {damage.image_path && (
                <img src={`/storage/${damage.image_path}`} alt={damage.damage_type}
                  className="w-full h-48 object-cover rounded-lg mb-4" />
              )}
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-3 ${getDamageTypeColor(damage.damage_type)}`}>
                {damage.damage_type}
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Keparahan:</span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityBadge(damage.severity)}`}>
                    {damage.severity.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Status:</span>
                  <select value={damage.status} onChange={(e) => handleStatusUpdate(damage.id, e.target.value)}
                    className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadge(damage.status)} cursor-pointer`}>
                    <option value="pending">PENDING</option>
                    <option value="verified">VERIFIED</option>
                    <option value="repaired">REPAIRED</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Confidence:</span>
                  <span className="font-semibold">{(damage.confidence * 100).toFixed(1)}%</span>
                </div>
                {damage.latitude && damage.longitude && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span className="font-mono text-xs">{damage.latitude.toFixed(4)}, {damage.longitude.toFixed(4)}</span>
                  </div>
                )}
                {damage.tracking_session && damage.tracking_session.user && (
                  <div className="text-sm text-gray-400">
                    Petugas: {damage.tracking_session.user.name}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(damage.created_at), 'dd MMM yyyy HH:mm', { locale: id })}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-gray-700">
                <button onClick={() => { setSelectedDamage(damage); setEditingNotes(damage.notes || ''); }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded flex items-center justify-center gap-2 text-sm transition-colors">
                  <Eye className="w-4 h-4" /> Detail
                </button>
                <button onClick={() => handleDelete(damage.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded flex items-center justify-center gap-2 text-sm transition-colors">
                  <Trash2 className="w-4 h-4" /> Hapus
                </button>
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

      {/* Detail Modal */}
      {selectedDamage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-primary">Detail Kerusakan</h2>
              <button onClick={() => setSelectedDamage(null)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            {selectedDamage.image_path && (
              <img src={`/storage/${selectedDamage.image_path}`} alt={selectedDamage.damage_type} className="w-full rounded-lg mb-4" />
            )}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-400">Jenis</p><p className="font-bold">{selectedDamage.damage_type}</p></div>
                <div><p className="text-sm text-gray-400">Confidence</p><p className="font-bold">{(selectedDamage.confidence * 100).toFixed(1)}%</p></div>
                <div><p className="text-sm text-gray-400">Keparahan</p><p className="font-bold uppercase">{selectedDamage.severity}</p></div>
                <div><p className="text-sm text-gray-400">Status</p><p className="font-bold uppercase">{selectedDamage.status}</p></div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Catatan</label>
                <textarea
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  className="input-field h-24"
                  placeholder="Tambahkan catatan..."
                />
                <button onClick={() => handleSaveNotes(selectedDamage.id)} className="btn-primary mt-2 text-sm">
                  Simpan Catatan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
