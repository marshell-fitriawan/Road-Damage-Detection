import React, { useEffect, useState } from "react";
import { createPortal } from 'react-dom';
import { roadDamageService } from "../services/api";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
import { timeAgo } from "../utils/timeUtils";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Trash2,
  MapPin,
  Calendar,
  Filter,
  Eye,
  X,
  CheckSquare,
  Square,
  Trash,
  ScanSearch,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ZoomIn,
  User,
  Activity,
  ShieldCheck,
  Wrench,
  Clock,
  FileText,
  Save,
  CheckCircle2,
  Search,
  Download,
} from "lucide-react";

/* ─── Detail Modal ───────────────────────────────────────────────────────── */
const DetailModal = ({ damage, editingNotes, setEditingNotes, onSaveNotes, onClose, onDelete, getSeverityBadge, getStatusBadge, getDamageTypeColor }) => {
  const [imgZoomed, setImgZoomed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSaveNotes(damage.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const severityLabel = { high: "Tinggi", medium: "Sedang", low: "Rendah" };
  const statusLabel = { pending: "Pending", verified: "Terverifikasi", repaired: "Diperbaiki" };

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      {/* Zoomed image overlay */}
      {imgZoomed && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/95"
          style={{ zIndex: 10001 }}
          onClick={() => setImgZoomed(false)}
        >
          <img
            src={`/storage/${damage.image_path}`}
            alt={damage.damage_type}
            className="max-w-full max-h-full object-contain"
            style={{ maxHeight: "90vh" }}
          />
          <button
            onClick={() => setImgZoomed(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div
        className="bg-gray-900 border border-gray-700/80 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[88vh] overflow-y-auto"
        style={{ animation: "slideUpFade 0.3s cubic-bezier(0.16,1,0.3,1) both" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/60 px-5 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${getDamageTypeColor(damage.damage_type)}`}>
              {damage.damage_type}
            </div>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${getStatusBadge(damage.status)}`}>
              {statusLabel[damage.status] || damage.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-700/70 hover:bg-gray-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Image */}
        {damage.image_path && (
          <div className="relative group cursor-pointer" onClick={() => setImgZoomed(true)}>
            <img
              src={`/storage/${damage.image_path}`}
              alt={damage.damage_type}
              className="w-full object-cover"
              style={{ maxHeight: "220px" }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-3">
                <ZoomIn className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        )}

        <div className="p-5 space-y-5">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Confidence</p>
              </div>
              <p className="text-lg font-bold text-white">{(damage.confidence * 100).toFixed(1)}%</p>
              <div className="mt-1.5 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                  style={{ width: `${(damage.confidence * 100).toFixed(0)}%` }}
                />
              </div>
            </div>
            <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Keparahan</p>
              </div>
              <p className={`text-sm font-bold px-2 py-0.5 rounded-lg w-fit ${getSeverityBadge(damage.severity)}`}>
                {severityLabel[damage.severity]?.toUpperCase() || damage.severity?.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Info rows */}
          <div className="space-y-2.5">
            {damage.latitude && damage.longitude && (
              <div className="flex items-center gap-3 bg-gray-800/40 border border-gray-700/40 rounded-xl px-4 py-3">
                <MapPin className="w-4 h-4 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide">Koordinat GPS</p>
                  <p className="text-sm font-mono text-gray-200">
                    {damage.latitude.toFixed(6)}, {damage.longitude.toFixed(6)}
                  </p>
                </div>
              </div>
            )}
            {damage.tracking_session?.user && (
              <div className="flex items-center gap-3 bg-gray-800/40 border border-gray-700/40 rounded-xl px-4 py-3">
                <User className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide">Petugas</p>
                  <p className="text-sm text-gray-200 font-semibold">{damage.tracking_session.user.name}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 bg-gray-800/40 border border-gray-700/40 rounded-xl px-4 py-3">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wide">Terdeteksi</p>
                <p className="text-sm text-gray-200">
                  {format(new Date(damage.created_at), "dd MMMM yyyy, HH:mm", { locale: id })}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <label className="text-sm font-semibold text-gray-300">Catatan Admin</label>
            </div>
            <textarea
              value={editingNotes}
              onChange={e => setEditingNotes(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none transition-colors"
              placeholder="Tambahkan catatan untuk kerusakan ini..."
              rows={3}
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className={`mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                saved
                  ? "bg-green-600 text-white"
                  : "bg-blue-600 hover:bg-blue-500 text-white"
              } disabled:opacity-60`}
            >
              {saved ? (
                <><CheckCircle2 className="w-4 h-4" /> Tersimpan!</>
              ) : saving ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menyimpan...</>
              ) : (
                <><Save className="w-4 h-4" /> Simpan Catatan</>
              )}
            </button>
          </div>

          {/* Delete button */}
          <button
            onClick={() => onDelete(damage.id)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600/10 border border-red-600/30 text-red-400 hover:bg-red-600/20 hover:text-red-300 font-semibold text-sm transition-all"
          >
            <Trash2 className="w-4 h-4" /> Hapus Data Ini
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────── */
const HistoryPage = () => {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const [damages, setDamages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    type: "",
    severity: "",
    status: "",
    sort_by: "created_at",
    sort_order: "desc",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDamage, setSelectedDamage] = useState(null);
  const [editingNotes, setEditingNotes] = useState("");

  // Delete confirm modal state
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, bulk: false });

  // Bulk select
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Client-side search filter
  const filteredDamages = damages.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchType = d.damage_type?.toLowerCase().includes(q);
    const matchUser = d.tracking_session?.user?.name?.toLowerCase().includes(q);
    return matchType || matchUser;
  });

  useEffect(() => { loadDamages(); }, [currentPage, filters]);

  const loadDamages = async () => {
    setLoading(true);
    try {
      const response = await roadDamageService.getAll({ ...filters, page: currentPage, per_page: 12 });
      setDamages(response.data || []);
      setTotalPages(response.last_page || 1);
    } catch (error) {
      console.error("Error loading damages:", error);
      toast.error("Gagal memuat data kerusakan. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger custom modal instead of browser confirm
  const handleDelete = (id) => {
    setDeleteConfirm({ open: true, id, bulk: false });
  };

  const confirmDelete = async () => {
    if (deleteConfirm.bulk) {
      const count = selectedIds.size;
      setBulkDeleting(true);
      try {
        await roadDamageService.bulkDelete(Array.from(selectedIds));
        setSelectedIds(new Set());
        setSelectMode(false);
        loadDamages();
        toast.delete(`${count} data kerusakan berhasil dihapus`);
      } catch (e) {
        toast.error("Gagal menghapus data");
      } finally { setBulkDeleting(false); }
    } else {
      try {
        await roadDamageService.delete(deleteConfirm.id);
        setSelectedDamage(null);
        loadDamages();
        toast.delete("Data kerusakan berhasil dihapus");
      } catch (e) {
        toast.error("Gagal menghapus data");
      }
    }
    setDeleteConfirm({ open: false, id: null, bulk: false });
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === damages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(damages.map(d => d.id)));
    }
  };

  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await roadDamageService.update(id, { status: newStatus });
      loadDamages();
      toast.success("Status berhasil diperbarui");
    } catch (error) { toast.error("Gagal memperbarui status"); }
  };

  const handleExportCSV = () => {
    const headers = ["ID", "Jenis", "Keparahan", "Status", "Confidence", "Petugas", "Koordinat", "Tanggal"];
    const rows = filteredDamages.map((d) => [
      d.id,
      d.damage_type,
      d.severity,
      d.status,
      `${(d.confidence * 100).toFixed(1)}%`,
      d.tracking_session?.user?.name || "-",
      d.latitude && d.longitude ? `${d.latitude.toFixed(6)}, ${d.longitude.toFixed(6)}` : "-",
      format(new Date(d.created_at), "dd/MM/yyyy HH:mm"),
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kerusakan-jalan-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveNotes = async (id) => {
    try {
      await roadDamageService.update(id, { notes: editingNotes });
      toast.success("Catatan berhasil disimpan");
      loadDamages();
    } catch {
      toast.error("Gagal menyimpan catatan");
    }
  };

  const getDamageTypeColor = (type) => {
    const colors = {
      "Retak-Buaya": "text-red-400 bg-red-900/40 border border-red-700/40",
      "Retak-Memanjang": "text-yellow-400 bg-yellow-900/40 border border-yellow-700/40",
      "Retak-Melintang": "text-green-400 bg-green-900/40 border border-green-700/40",
      Lubang: "text-blue-400 bg-blue-900/40 border border-blue-700/40",
    };
    return colors[type] || "text-gray-400 bg-gray-900/40 border border-gray-700/40";
  };

  const getSeverityBadge = (severity) => {
    const badges = { high: "bg-red-600 text-white", medium: "bg-yellow-500 text-white", low: "bg-green-600 text-white" };
    return badges[severity] || "bg-gray-600 text-white";
  };

  const getStatusBadge = (status) => {
    const badges = { pending: "bg-yellow-600 text-white", verified: "bg-blue-600 text-white", repaired: "bg-green-600 text-white" };
    return badges[status] || "bg-gray-600 text-white";
  };

  const getStatusIcon = (status) => {
    if (status === "repaired") return <Wrench className="w-3 h-3" />;
    if (status === "verified") return <ShieldCheck className="w-3 h-3" />;
    return <Clock className="w-3 h-3" />;
  };

  return (
    <div>
      <div className="overflow-auto p-4 lg:p-8">
        <div className="space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold text-primary">Kelola Data Kerusakan</h1>
              <p className="text-gray-400 mt-1 text-sm">Lihat, periksa, ubah, atau hapus data kerusakan jalan</p>
            </div>
            <div className="flex gap-2">
              {!selectMode ? (
                <>
                  {isAdmin() && (
                    <button
                      onClick={handleExportCSV}
                      className="btn-secondary flex items-center gap-2 text-green-400 border-green-700/50 hover:border-green-500"
                    >
                      <Download className="w-4 h-4" /> Export CSV
                    </button>
                  )}
                  <button onClick={() => setSelectMode(true)} className="btn-secondary flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" /> Pilih
                  </button>
                  <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary flex items-center gap-2 ${showFilters ? "border-blue-500 text-blue-400" : ""}`}>
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

          {/* Bulk toolbar */}
          {selectMode && (
            <div className="card bg-blue-900/20 border-blue-600/50 flex items-center justify-between gap-4 py-3">
              <div className="flex items-center gap-3">
                <button onClick={selectAll} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
                  {selectedIds.size === damages.length && damages.length > 0
                    ? <CheckSquare className="w-5 h-5 text-blue-400" />
                    : <Square className="w-5 h-5 text-gray-500" />}
                  Pilih Semua
                </button>
                <span className="text-sm text-gray-400">
                  {selectedIds.size > 0
                    ? <span className="text-blue-300 font-semibold">{selectedIds.size} dipilih</span>
                    : "Belum ada yang dipilih"}
                </span>
              </div>
              <button
                onClick={() => setDeleteConfirm({ open: true, id: null, bulk: true })}
                disabled={selectedIds.size === 0 || bulkDeleting}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  selectedIds.size > 0 && !bulkDeleting
                    ? "bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                }`}
              >
                <Trash className="w-4 h-4" />
                {bulkDeleting ? "Menghapus..." : `Hapus${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
              </button>
            </div>
          )}

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan jenis kerusakan atau nama petugas..."
              className="input-field pl-10 w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-400" /> Filter &amp; Pengurutan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Jenis Kerusakan", key: "type", options: [["", "Semua"], ["Retak-Buaya","Retak Buaya"], ["Retak-Memanjang","Retak Memanjang"], ["Retak-Melintang","Retak Melintang"], ["Lubang","Lubang"]] },
                  { label: "Keparahan", key: "severity", options: [["","Semua"],["low","Low"],["medium","Medium"],["high","High"]] },
                  { label: "Status", key: "status", options: [["","Semua"],["pending","Pending"],["verified","Verified"],["repaired","Repaired"]] },
                ].map(({ label, key, options }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-2">{label}</label>
                    <select value={filters[key]} onChange={e => setFilters({ ...filters, [key]: e.target.value })} className="input-field">
                      {options.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium mb-2">Urutkan</label>
                  <select
                    value={`${filters.sort_by}_${filters.sort_order}`}
                    onChange={e => {
                      const [sort_by, sort_order] = e.target.value.split("_");
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

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
          ) : filteredDamages.length === 0 ? (
            <div className="card text-center py-16">
              <div className="w-20 h-20 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto mb-4">
                <ScanSearch className="w-10 h-10 text-gray-500" />
              </div>
              <p className="text-gray-300 text-lg font-semibold">
                {searchQuery ? "Tidak ada hasil pencarian" : "Belum ada data kerusakan"}
              </p>
              <p className="text-gray-500 text-sm mt-1 mb-4">
                {searchQuery
                  ? `Tidak ada kerusakan yang cocok dengan "${searchQuery}"`
                  : "Data kerusakan jalan yang terdeteksi akan muncul di sini setelah petugas melakukan tracking"}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-2 bg-blue-600/20 border border-blue-600/40 text-blue-400 rounded-lg text-sm hover:bg-blue-600/30 transition-colors"
                >
                  Hapus Pencarian
                </button>
              )}
              {!searchQuery && Object.values(filters).some(v => v && v !== "created_at" && v !== "desc") && (
                <button
                  onClick={() => setFilters({ type: "", severity: "", status: "", sort_by: "created_at", sort_order: "desc" })}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
                >
                  Reset Filter
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDamages.map((damage) => {
                const isSelected = selectedIds.has(damage.id);
                return (
                  <div
                    key={damage.id}
                    className={`card hover:border-primary transition-all relative overflow-hidden group ${
                      isSelected ? "border-blue-500 bg-blue-900/10" : ""
                    }`}
                  >
                    {selectMode && (
                      <button onClick={() => toggleSelect(damage.id)} className="absolute top-3 left-3 z-10">
                        {isSelected
                          ? <CheckSquare className="w-6 h-6 text-blue-400 drop-shadow" />
                          : <Square className="w-6 h-6 text-gray-400 drop-shadow" />}
                      </button>
                    )}

                    {damage.image_path && (
                      <div className={selectMode ? "cursor-pointer" : ""} onClick={selectMode ? () => toggleSelect(damage.id) : undefined}>
                        <img
                          src={`/storage/${damage.image_path}`}
                          alt={damage.damage_type}
                          className={`w-full h-44 object-cover rounded-lg mb-4 transition-opacity ${isSelected ? "opacity-60" : ""}`}
                        />
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getDamageTypeColor(damage.damage_type)}`}>
                          {damage.damage_type}
                        </span>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold ${getSeverityBadge(damage.severity)}`}>
                          {damage.severity?.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Status</span>
                        <select
                          value={damage.status}
                          onChange={e => handleStatusUpdate(damage.id, e.target.value)}
                          className={`px-2 py-1 rounded text-xs font-bold cursor-pointer border-0 outline-none ${getStatusBadge(damage.status)}`}
                        >
                          <option value="pending">PENDING</option>
                          <option value="verified">VERIFIED</option>
                          <option value="repaired">REPAIRED</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Confidence</span>
                        <span className="font-semibold text-gray-200">{(damage.confidence * 100).toFixed(1)}%</span>
                      </div>

                      {damage.tracking_session?.user && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <User className="w-3 h-3" />
                          <span>{damage.tracking_session.user.name}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        <span
                          title={format(new Date(damage.created_at), "dd MMMM yyyy, HH:mm", { locale: id })}
                          className="cursor-help"
                        >
                          {timeAgo(damage.created_at)}
                        </span>
                      </div>
                    </div>

                    {!selectMode && (
                      <div className="flex gap-2 pt-3 mt-3 border-t border-gray-700/50">
                        <button
                          onClick={() => { setSelectedDamage(damage); setEditingNotes(damage.notes || ""); }}
                          title="Lihat detail kerusakan"
                          className="flex-1 bg-blue-600/20 hover:bg-blue-600 border border-blue-600/40 hover:border-blue-500 text-blue-400 hover:text-white py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" /> Detail
                        </button>
                        <button
                          onClick={() => handleDelete(damage.id)}
                          title="Hapus data kerusakan ini"
                          className="flex-1 bg-red-600/10 hover:bg-red-600 border border-red-600/30 hover:border-red-500 text-red-400 hover:text-white py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </div>
                    )}

                    {selectMode && (
                      <button
                        onClick={() => toggleSelect(damage.id)}
                        className={`w-full mt-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          isSelected ? "bg-blue-600 text-white" : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                        }`}
                      >
                        {isSelected ? "✓ Dipilih" : "Pilih"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="btn-secondary flex items-center gap-1 disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" /> Sebelumnya
              </button>
              <span className="text-gray-400 text-sm">Halaman {currentPage} dari {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="btn-secondary flex items-center gap-1 disabled:opacity-50">
                Selanjutnya <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedDamage && (
        <DetailModal
          damage={selectedDamage}
          editingNotes={editingNotes}
          setEditingNotes={setEditingNotes}
          onSaveNotes={handleSaveNotes}
          onClose={() => setSelectedDamage(null)}
          onDelete={(id) => { setSelectedDamage(null); handleDelete(id); }}
          getSeverityBadge={getSeverityBadge}
          getStatusBadge={getStatusBadge}
          getDamageTypeColor={getDamageTypeColor}
        />
      )}

      {/* Custom Confirm Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        title={deleteConfirm.bulk ? `Hapus ${selectedIds.size} Data?` : "Hapus Data Kerusakan?"}
        message={
          deleteConfirm.bulk
            ? `${selectedIds.size} data kerusakan yang dipilih akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.`
            : "Data kerusakan ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan."
        }
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: null, bulk: false })}
        confirmLabel="Ya, Hapus"
      />
    </div>
  );
};

export default HistoryPage;
