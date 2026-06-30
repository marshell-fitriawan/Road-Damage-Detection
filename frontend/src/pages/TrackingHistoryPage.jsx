import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { trackingService } from "../services/api";
import ConfirmModal from "../components/ConfirmModal";
import { timeAgo } from "../utils/timeUtils";
import { useToast } from "../contexts/ToastContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  Footprints,
  MapPin,
  Clock,
  ShieldX,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Trash,
  CheckSquare,
  Square,
  X,
  Radio,
  CheckCheck,
} from "lucide-react";

const TrackingHistoryPage = ({ showAll = false }) => {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const { isDark } = useTheme();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedSession, setExpandedSession] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);

  // State pilih & hapus massal
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // State custom confirm modal
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, sessionId: null, bulk: false });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [currentPage]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      let data;
      if (showAll && isAdmin()) {
        data = await trackingService.getAllHistory({ page: currentPage });
      } else {
        data = await trackingService.getMyHistory(currentPage);
      }
      setSessions(data.data || []);
      setTotalPages(data.last_page || 1);
    } catch (error) {
      console.error("Error loading sessions:", error);
      toast.error("Gagal memuat riwayat tracking. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (sessionId) => {
    if (selectMode) return; // jangan expand saat mode pilih
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      setSessionDetail(null);
      return;
    }
    try {
      const data = await trackingService.getSession(sessionId);
      setSessionDetail(data.session);
      setExpandedSession(sessionId);
    } catch (error) {
      console.error("Error loading session detail:", error);
    }
  };

  // Hapus satu sesi — buka modal konfirmasi
  const handleDelete = (e, sessionId) => {
    e.stopPropagation();
    setDeleteConfirm({ open: true, sessionId, bulk: false });
  };

  // Eksekusi hapus setelah konfirmasi
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      if (deleteConfirm.bulk) {
        const count = selectedIds.size;
        setBulkDeleting(true);
        await trackingService.bulkDeleteSessions(Array.from(selectedIds));
        setSelectedIds(new Set());
        setSelectMode(false);
        setExpandedSession(null);
        setSessionDetail(null);
        toast.delete(`${count} sesi tracking berhasil dihapus`);
      } else {
        await trackingService.deleteSession(deleteConfirm.sessionId);
        if (expandedSession === deleteConfirm.sessionId) {
          setExpandedSession(null);
          setSessionDetail(null);
        }
        toast.delete("Sesi tracking berhasil dihapus");
      }
      loadSessions();
    } catch (error) {
      console.error("Gagal menghapus:", error);
      toast.error("Gagal menghapus sesi tracking. Silakan coba lagi.");
    } finally {
      setDeleting(false);
      setBulkDeleting(false);
      setDeleteConfirm({ open: false, sessionId: null, bulk: false });
    }
  };

  // Toggle pilih satu item
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Pilih semua di halaman ini
  const selectAll = () => {
    if (selectedIds.size === sessions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sessions.map((s) => s.id)));
    }
  };

  // Keluar mode pilih
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  // Hapus massal — buka modal konfirmasi
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setDeleteConfirm({ open: true, sessionId: null, bulk: true });
  };

  const getColorForClass = (className) => {
    const colors = {
      Lubang: "#3b82f6",
      "Retak-Buaya": "#ef4444",
      "Retak-Memanjang": "#eab308",
      "Retak-Melintang": "#22c55e",
    };
    return colors[className] || "#888";
  };

  const canDelete = showAll && isAdmin();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-auto p-4 lg:p-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">
                {showAll
                  ? "Riwayat Tracking Semua Petugas"
                  : "Riwayat Tracking Saya"}
              </h1>
              <p className="text-gray-400 mt-1">
                {showAll
                  ? "Lihat semua sesi tracking dari seluruh petugas"
                  : "Lihat riwayat sesi tracking Anda"}
              </p>
            </div>
            {/* Tombol Pilih hanya untuk admin di halaman semua riwayat */}
            {canDelete && sessions.length > 0 && (
              <div className="flex gap-2">
                {!selectMode ? (
                  <button
                    onClick={() => setSelectMode(true)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <CheckSquare className="w-4 h-4" /> Pilih
                  </button>
                ) : (
                  <button
                    onClick={exitSelectMode}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <X className="w-4 h-4" /> Batal
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Toolbar bulk delete */}
          {selectMode && (
            <div className="card bg-blue-900/20 border-blue-600/50 flex items-center justify-between gap-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={selectAll}
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  {selectedIds.size === sessions.length &&
                  sessions.length > 0 ? (
                    <CheckSquare className="w-5 h-5 text-blue-400" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-500" />
                  )}
                  Pilih Semua
                </button>
                <span className="text-sm text-gray-400">
                  {selectedIds.size > 0 ? (
                    <span className="text-blue-300 font-semibold">
                      {selectedIds.size} dipilih
                    </span>
                  ) : (
                    "Belum ada yang dipilih"
                  )}
                </span>
              </div>
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0 || bulkDeleting}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  selectedIds.size > 0 && !bulkDeleting
                    ? "bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                }`}
              >
                <Trash className="w-4 h-4" />
                {bulkDeleting
                  ? "Menghapus..."
                  : `Hapus ${selectedIds.size > 0 ? `(${selectedIds.size})` : ""}`}
              </button>
            </div>
          )}

          {sessions.length === 0 ? (
            <div className="card text-center py-16">
              <div className={`w-20 h-20 rounded-full border flex items-center justify-center mx-auto mb-4 ${
                isDark ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-200"
              }`}>
                <Footprints className={`w-10 h-10 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
              </div>
              <p className="text-gray-300 text-lg font-semibold">Belum ada riwayat tracking</p>
              <p className="text-gray-500 text-sm mt-1">Sesi tracking yang sudah selesai akan muncul di sini</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => {
                const isSelected = selectedIds.has(session.id);
                return (
                  <div
                    key={session.id}
                    className={`card transition-colors ${isSelected ? "border-blue-500 bg-blue-900/10" : ""}`}
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() =>
                        selectMode
                          ? toggleSelect(session.id)
                          : toggleExpand(session.id)
                      }
                    >
                      <div className="flex items-center gap-4">
                        {/* Checkbox saat mode pilih */}
                        {selectMode ? (
                          <div className="w-10 h-10 flex items-center justify-center">
                            {isSelected ? (
                              <CheckSquare className="w-6 h-6 text-blue-400" />
                            ) : (
                              <Square className="w-6 h-6 text-gray-500" />
                            )}
                          </div>
                        ) : (
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              session.status === "active"
                                ? "bg-green-600/20 border border-green-500/50"
                                : isDark
                                  ? "bg-gray-700/60 border border-gray-600/50"
                                  : "bg-gray-100 border border-gray-200"
                            }`}
                          >
                            {session.status === "active" ? (
                              <Radio className="w-5 h-5 text-green-400 animate-pulse" />
                            ) : (
                              <CheckCheck className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                            )}
                          </div>
                        )}

                        <div>
                          {showAll && session.user && (
                            <p className="font-semibold">{session.user.name}</p>
                          )}
                          {session.ruas_jalan_name && (
                            <p className="text-sm text-yellow-400 font-medium">
                              {session.ruas_jalan_name}
                            </p>
                          )}
                          <p className="text-sm text-gray-400">
                            <Clock className="w-3 h-3 inline mr-1" />
                            <span
                              title={new Date(session.started_at).toLocaleString("id-ID")}
                              className="cursor-help"
                            >
                              {timeAgo(session.started_at)}
                            </span>
                            {session.ended_at && (
                              <span className="text-gray-500">
                                {" "}s/d{" "}
                                {new Date(session.ended_at).toLocaleTimeString("id-ID")}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              session.status === "active"
                                ? "bg-green-600 text-white"
                                : isDark
                                  ? "bg-gray-600 text-white"
                                  : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {session.status === "active" ? "Aktif" : "Selesai"}
                          </span>
                          <p className="text-sm text-gray-400 mt-1">
                            <ShieldX className="w-3 h-3 inline mr-1 text-red-400" />
                            {session.road_damages_count || 0} kerusakan
                          </p>
                        </div>

                        {/* Tombol hapus per sesi (admin, bukan mode pilih) */}
                        {canDelete &&
                          !selectMode &&
                          session.status !== "active" && (
                            <button
                              onClick={(e) => handleDelete(e, session.id)}
                              className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white transition-colors"
                              title="Hapus sesi ini"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                        {!selectMode &&
                          (expandedSession === session.id ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ))}
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {expandedSession === session.id &&
                      sessionDetail &&
                      !selectMode && (
                        <div className={`mt-4 pt-4 border-t ${
                          isDark ? "border-gray-700" : "border-gray-200"
                        }`}>
                          {sessionDetail.road_damages &&
                          sessionDetail.road_damages.length > 0 ? (
                            <div className="space-y-3">
                              <h4 className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                                Kerusakan Terdeteksi:
                              </h4>
                              {sessionDetail.road_damages.map((damage) => (
                                <div
                                  key={damage.id}
                                  className="bg-secondary rounded-lg p-3 flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-3">
                                    {damage.image_path && (
                                      <img
                                        src={`/storage/${damage.image_path}`}
                                        alt={damage.damage_type}
                                        className="w-16 h-16 object-cover rounded"
                                      />
                                    )}
                                    <div>
                                      <p
                                        className="font-semibold"
                                        style={{
                                          color: getColorForClass(
                                            damage.damage_type,
                                          ),
                                        }}
                                      >
                                        {damage.damage_type}
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        <MapPin className="w-3 h-3 inline mr-1" />
                                        {damage.latitude?.toFixed(6)},{" "}
                                        {damage.longitude?.toFixed(6)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold">
                                      {(damage.confidence * 100).toFixed(1)}%
                                    </p>
                                     <p
                                       className={`text-xs px-2 py-0.5 rounded ${
                                         damage.status === "repaired"
                                           ? "bg-green-600"
                                           : damage.status === "waiting_validation"
                                             ? "bg-orange-500"
                                             : damage.status === "verified"
                                               ? "bg-blue-600"
                                               : "bg-yellow-600"
                                       } text-white`}
                                     >
                                       {{ pending: "Belum Diverifikasi", verified: "Terverifikasi", waiting_validation: "Menunggu Validasi", repaired: "Diperbaiki" }[damage.status] || damage.status}
                                     </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-400 text-center py-4">
                              Tidak ada kerusakan terdeteksi pada sesi ini
                            </p>
                          )}

                          {sessionDetail.route_path &&
                            sessionDetail.route_path.length > 0 && (
                              <div className="mt-3">
                                <p className="text-sm text-gray-400">
                                  <MapPin className="w-3 h-3 inline mr-1" />
                                  {sessionDetail.route_path.length} titik
                                  koordinat terekam
                                </p>
                              </div>
                            )}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn-secondary flex items-center gap-1 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" /> Sebelumnya
              </button>
              <span className="text-gray-400 text-sm">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="btn-secondary flex items-center gap-1 disabled:opacity-50"
              >
                Selanjutnya <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Custom Confirm Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        type="danger"
        title={deleteConfirm.bulk ? `Hapus ${selectedIds.size} Sesi?` : "Hapus Sesi Tracking?"}
        message={
          deleteConfirm.bulk
            ? `${selectedIds.size} sesi tracking beserta semua data kerusakannya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`
            : "Sesi tracking ini beserta semua data kerusakannya akan dihapus secara permanen."
        }
        confirmLabel="Ya, Hapus"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, sessionId: null, bulk: false })}
        loading={deleting}
      />
    </div>
  );
};

export default TrackingHistoryPage;
