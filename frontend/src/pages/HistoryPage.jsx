import React, { useEffect, useState } from 'react';
import { roadDamageService } from '../services/api';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Trash2, Edit, MapPin, Calendar, Filter, Eye, X, CheckSquare, Square, Trash } from 'lucide-react';

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

  // State untuk fitur pilih & hapus massal
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

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

  // Toggle pilih satu item
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Pilih semua di halaman ini
  const selectAll = () => {
    if (selectedIds.size === damages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(damages.map(d => d.id)));
    }
  };

  // Keluar dari mode pilih
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  // Hapus semua yang dipilih
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Hapus ${selectedIds.size} data kerusakan yang dipilih? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBulkDeleting(true);
    try {
      await roadDamageService.bulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      setSelectMode(false);
      loadDamages();
    } catch (error) {
      alert('Gagal menghapus data');
    } finally {
      setBulkDeleting(false);
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
        <div className="flex gap-2">
          {!selectMode ? (
            <>
              <button onClick={() => setSelectMode(true)} className="btn-secondary flex items-center gap-2">
                <CheckSquare className="w-4 h-4" /> Pilih
              </button>
              <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary flex items-center gap-2">
                <Filter className="w-4 h-4" /> Filter
              </button>
            </>
          ) : (
            <button onClick={exitSelectMode} className="btn-secondary flex items-center gap-2">
              <X className="w-4 h-4" /> Batal
            </button>
          )}
        </div>
      </div>

      {/* Toolbar bulk delete - muncul saat mode pilih aktif */}
      {selectMode && (
        <div className="card bg-blue-900/20 border-blue-600/50 flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3">
            {/* Checkbox select all */}
            <button onClick={selectAll} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
              {selectedIds.size === damages.length && damages.length > 0
                ? <CheckSquare className="w-5 h-5 text-blue-400" />
                : <Square className="w-5 h-5 text-gray-500" />
              }
              Pilih Semua
            </button>
            <span className="text-sm text-gray-400">
              {selectedIds.size > 0 ? (
                <span className="text-blue-300 font-semibold">{selectedIds.size} dipilih</span>
              ) : 'Belum ada yang dipilih'}
            </span>
          </div>
          <button
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0 || bulkDeleting}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              selectedIds.size > 0 && !bulkDeleting
                ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Trash className="w-4 h-4" />
            {bulkDeleting ? 'Menghapus...' : `Hapus ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`}
          </button>
        </div>
      )}

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
          {damages.map((damage) => {
            const isSelected = selectedIds.has(damage.id);
            return (
              <div
                key={damage.id}
                className={`card hover:border-primary transition-colors relative ${
                  isSelected ? 'border-blue-500 bg-blue-900/10' : ''
                }`}
              >
                {/* Checkbox overlay saat mode pilih */}
                {selectMode && (
                  <button
                    onClick={() => toggleSelect(damage.id)}
                    className="absolute top-3 left-3 z-10"
                  >
                    {isSelected
                      ? <CheckSquare className="w-6 h-6 text-blue-400 drop-shadow" />
                      : <Square className="w-6 h-6 text-gray-400 drop-shadow" />
                    }
                  </button>
                )}

                {/* Gambar - klik untuk pilih saat mode pilih */}
                {damage.image_path && (
                  <div
                    className={selectMode ? 'cursor-pointer' : ''}
                    onClick={selectMode ? () => toggleSelect(damage.id) : undefined}
                  >
                    <img src={`/storage/${damage.image_path}`} alt={damage.damage_type}
                      className={`w-full h-48 object-cover rounded-lg mb-4 ${isSelected ? 'opacity-70' : ''}`} />
                  </div>
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

                {/* Tombol aksi - sembunyikan saat mode pilih */}
                {!selectMode && (
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
                )}

                {/* Tap area saat mode pilih */}
                {selectMode && (
                  <button
                    onClick={() => toggleSelect(damage.id)}
                    className={`w-full mt-2 py-2 rounded text-sm font-semibold transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    {isSelected ? '✓ Dipilih' : 'Pilih'}
                  </button>
                )}
              </div>
            );
          })}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
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
