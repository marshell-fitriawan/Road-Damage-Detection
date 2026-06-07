import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import RoadDamageMap, {
  KECAMATAN_KUBU_RAYA,
} from "../components/RoadDamageMap";
import { roadDamageService, trackingService } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import {
  Filter,
  X,
  RefreshCw,
  Radio,
  Sun,
  Moon,
  Users,
  ChevronDown,
} from "lucide-react";

const POLL_INTERVAL = 5000;

// Warna berbeda tiap rute petugas (sinkron dengan RoadDamageMap.petugasColors)
const ROUTE_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#eab308',
  '#8b5cf6', '#f97316', '#ec4899', '#2dd4bf',
];

const setIfChanged = (setter, newValue) => {
  setter((prev) => {
    const prevJson = JSON.stringify(prev);
    const newJson = JSON.stringify(newValue);
    return prevJson === newJson ? prev : newValue;
  });
};

// Floating Filter Panel (matches screenshot design)
const FilterPanel = ({ filters, setFilters, markers, onClose }) => {
  const [localFilters, setLocalFilters] = useState({ ...filters });

  const damageBreakdown = {
    Lubang: markers.filter((m) => m.type === "Lubang").length,
    "Retak-Buaya": markers.filter((m) => m.type === "Retak-Buaya").length,
    "Retak-Memanjang": markers.filter((m) => m.type === "Retak-Memanjang").length,
    "Retak-Melintang": markers.filter((m) => m.type === "Retak-Melintang").length,
  };


  const toggleType = (type) => {
    setLocalFilters((prev) => ({
      ...prev,
      type: prev.type === type ? "" : type,
    }));
  };
  const toggleSeverity = (s) => {
    setLocalFilters((prev) => ({
      ...prev,
      severity: prev.severity === s ? "" : s,
    }));
  };
  const toggleStatus = (s) => {
    setLocalFilters((prev) => ({
      ...prev,
      status: prev.status === s ? "" : s,
    }));
  };

  const handleApply = () => {
    setFilters(localFilters);
    onClose();
  };
  const handleReset = () => {
    const cleared = { type: "", severity: "", status: "" };
    setLocalFilters(cleared);
    setFilters(cleared);
  };

  // Damage type pill colors
  const typeStyles = {
    Lubang: {
      active: "bg-blue-500 text-white border-blue-500",
      inactive:
        "bg-blue-500/10 text-blue-300 border-blue-500/50 hover:bg-blue-500/20",
      dot: "bg-blue-400",
    },
    "Retak-Buaya": {
      active: "bg-red-500 text-white border-red-500",
      inactive:
        "bg-red-500/10 text-red-300 border-red-500/50 hover:bg-red-500/20",
      dot: "bg-red-400",
    },
    "Retak-Memanjang": {
      active: "bg-yellow-500 text-gray-900 border-yellow-500",
      inactive:
        "bg-yellow-500/10 text-yellow-300 border-yellow-500/50 hover:bg-yellow-500/20",
      dot: "bg-yellow-400",
    },
    "Retak-Melintang": {
      active: "bg-green-500 text-white border-green-500",
      inactive:
        "bg-green-500/10 text-green-300 border-green-500/50 hover:bg-green-500/20",
      dot: "bg-green-400",
    },
  };

  const totalShown = markers.length;

  return (
    <div className="absolute top-2 right-2 z-[1000] w-80 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex gap-0">
          <button className="px-4 py-1 text-sm font-bold text-white border-b-2 border-blue-500">
            FILTER
          </button>
          <button className="px-4 py-1 text-sm font-semibold text-gray-400 hover:text-gray-200 transition">
            AKTIVITAS
          </button>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Showing count */}
        <p className="text-xs text-gray-400">
          Menampilkan{" "}
          <span className="text-white font-semibold">{totalShown}</span> Laporan
          Terkini
        </p>

        {/* Jenis Kerusakan */}
        <div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(damageBreakdown).map(([type, count]) => {
              const s = typeStyles[type];
              const isActive = localFilters.type === type;
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                    isActive ? s.active : s.inactive
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  {type} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Severity */}
        <div>
          <p className="text-xs font-bold text-gray-400 mb-2 tracking-widest uppercase">
            Severity
          </p>
          <div className="flex gap-2">
            {[
              {
                key: "low",
                label: "Rendah",
                color: "bg-green-500/20 text-green-400 border-green-500/50",
                active: "bg-green-500 text-white border-green-500",
              },
              {
                key: "medium",
                label: "Sedang",
                color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
                active: "bg-yellow-500 text-gray-900 border-yellow-500",
              },
              {
                key: "high",
                label: "Tinggi",
                color: "bg-red-500/20 text-red-400 border-red-500/50",
                active: "bg-red-500 text-white border-red-500",
              },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => toggleSeverity(s.key)}
                className={`flex-1 py-1.5 rounded-full border text-xs font-bold transition-all ${
                  localFilters.severity === s.key
                    ? s.active
                    : s.color + " hover:opacity-80"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <p className="text-xs font-bold text-gray-400 mb-2 tracking-widest uppercase">
            Status
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              {
                key: "pending",
                label: "Belum Diverifikasi",
                color: "bg-purple-500/20 text-purple-300 border-purple-500/50",
                active: "bg-purple-500 text-white border-purple-500",
              },
              {
                key: "verified",
                label: "Terverifikasi",
                color: "bg-blue-500/20 text-blue-300 border-blue-500/50",
                active: "bg-blue-500 text-white border-blue-500",
              },
              {
                key: "repaired",
                label: "Sudah Diperbaiki",
                color: "bg-green-500/20 text-green-300 border-green-500/50",
                active: "bg-green-500 text-white border-green-500",
              },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => toggleStatus(s.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                  localFilters.status === s.key
                    ? s.active
                    : s.color + " hover:opacity-80"
                }`}
              >
                {s.key === "verified" && <span>✓</span>}
                {s.key === "repaired" && <span>✓</span>}
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Apply / Reset */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleApply}
            className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-lg text-sm transition-colors"
          >
            Apply
          </button>
          <button
            onClick={handleReset}
            className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold rounded-lg text-sm transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Aktivitas Panel — menggunakan data REAL dari liveTracking API
// ============================================================
const AktivitasPanel = ({ liveTracking, onClose }) => {
  const activePetugasCount = liveTracking.length;

  // Hitung durasi sesi dalam menit/jam dari started_at
  const getDurasi = (startedAt) => {
    if (!startedAt) return null;
    const start = new Date(startedAt);
    const now = new Date();
    const menit = Math.floor((now - start) / 60000);
    if (menit < 1) return "Baru Mulai";
    if (menit < 60) return `${menit} menit`;
    const jam = Math.floor(menit / 60);
    const sisa = menit % 60;
    return sisa > 0 ? `${jam}j ${sisa}m` : `${jam} jam`;
  };

  // Progress berdasarkan jumlah kerusakan (maks 20 = 100%)
  const getProgress = (session) => {
    const total = (session.road_damages || session.damages || []).length;
    return Math.min(total / 20, 1);
  };

  const petugasColors = [
    "#3b82f6", "#ef4444", "#22c55e",
    "#eab308", "#8b5cf6", "#f97316",
  ];

  return (
    <div className="absolute top-2 right-2 z-[1000] w-80 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex gap-0">
          <button className="px-4 py-1 text-sm font-semibold text-gray-400 hover:text-gray-200 transition">
            FILTER
          </button>
          <button className="px-4 py-1 text-sm font-bold text-white border-b-2 border-blue-500">
            AKTIVITAS
          </button>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-4 space-y-4 max-h-[70vh] overflow-y-auto">

        {/* ── Aktivitas Petugas ── */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 mb-3 tracking-widest uppercase">
            Aktivitas Petugas
          </h3>
          {liveTracking.length > 0 ? (
            <div className="space-y-2">
              {liveTracking.slice(0, 8).map((session, idx) => {
                const color = petugasColors[idx % petugasColors.length];
                const durasi = getDurasi(session.started_at);
                const namaRuas = session.ruas_jalan_name || null;
                const lokasiLabel = namaRuas
                  ? namaRuas.substring(0, 35)
                  : session.last_position
                    ? `${Number(session.last_position.lat).toFixed(5)}, ${Number(session.last_position.lng).toFixed(5)}`
                    : "Menunggu GPS...";
                const jumlahKerusakan = (session.road_damages || session.damages || []).length;

                return (
                  <div
                    key={session.id || idx}
                    className="rounded-lg p-3 border transition hover:border-gray-500"
                    style={{
                      background: `${color}0d`,
                      borderColor: `${color}35`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Nama petugas dari data user */}
                        <p className="font-semibold text-white text-sm truncate">
                          {session.user?.name || "Petugas"}
                        </p>
                        {/* Ruas jalan atau koordinat GPS terakhir */}
                        <p className="text-gray-400 truncate text-xs mt-1">
                          📍 {lokasiLabel}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-gray-500 text-xs">
                            Status:{" "}
                            <span className="font-medium" style={{ color }}>
                              Aktif{durasi ? ` · ${durasi}` : ""}
                            </span>
                          </span>
                          {jumlahKerusakan > 0 && (
                            <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full font-semibold">
                              {jumlahKerusakan} kerusakan
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Indikator warna per petugas */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: `${color}25`,
                          border: `1.5px solid ${color}50`,
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full animate-pulse"
                          style={{ backgroundColor: color }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Tidak ada aktivitas</p>
              <p className="text-xs text-gray-600 mt-1">
                Belum ada petugas yang sedang tracking
              </p>
            </div>
          )}
        </div>

        {/* ── Active Tracking Status — satu card per sesi ── */}
        <div className="pt-2 border-t border-gray-700">
          <h3 className="text-xs font-bold text-gray-400 mb-3 tracking-widest uppercase">
            Active Tracking Status
          </h3>
          {activePetugasCount > 0 ? (
            <div className="space-y-3">
              {liveTracking.slice(0, 5).map((session, idx) => {
                const color = petugasColors[idx % petugasColors.length];
                const durasi = getDurasi(session.started_at);
                const progress = getProgress(session);
                const namaRuas = session.ruas_jalan_name;
                const lokasiRingkas = namaRuas
                  ? namaRuas.length > 24 ? namaRuas.substring(0, 24) + "…" : namaRuas
                  : session.last_position
                    ? `${Number(session.last_position.lat).toFixed(4)}, ${Number(session.last_position.lng).toFixed(4)}`
                    : "—";
                const namaPetugas = session.user?.name || "Petugas";
                const jumlahKerusakan = (session.road_damages || session.damages || []).length;

                return (
                  <div
                    key={`status-${session.id || idx}`}
                    className="rounded-lg p-4 space-y-3 border"
                    style={{
                      background: `linear-gradient(135deg, ${color}18, ${color}08)`,
                      borderColor: `${color}40`,
                    }}
                  >
                    {/* ID sesi + dot aktif */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-white leading-none">
                          #{session.id}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Petugas:{" "}
                          <span className="text-white font-semibold">
                            {namaPetugas}
                          </span>
                        </p>
                      </div>
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <div
                          className="w-3 h-3 rounded-full animate-pulse"
                          style={{ backgroundColor: color }}
                        />
                      </div>
                    </div>

                    {/* Grid info: Ruas Jalan + Durasi Aktif */}
                    <div
                      className="grid grid-cols-2 gap-2 pt-2 border-t"
                      style={{ borderColor: `${color}30` }}
                    >
                      <div>
                        <p className="text-xs text-gray-400">Ruas Jalan</p>
                        <p className="text-xs font-semibold text-white mt-0.5 leading-tight">
                          {lokasiRingkas}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Durasi Aktif</p>
                        <p
                          className="text-xs font-semibold mt-0.5"
                          style={{ color }}
                        >
                          {durasi || "Baru Mulai"}
                        </p>
                      </div>
                    </div>

                    {/* Grid info: Kerusakan + Progress */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-400">Kerusakan</p>
                        <p className="text-xs font-semibold text-white mt-0.5">
                          {jumlahKerusakan} terdeteksi
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1.5">
                          Progress
                        </p>
                        <div className="w-full bg-gray-700 rounded h-1.5">
                          <div
                            className="h-full rounded transition-all duration-500"
                            style={{
                              width: `${Math.max(progress * 100, 4)}%`,
                              background: `linear-gradient(to right, ${color}, ${color}90)`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-4 border border-dashed border-gray-700 text-center">
              <p className="text-sm text-gray-400">Tidak ada tracking aktif</p>
              <p className="text-xs text-gray-600 mt-1">
                Petugas belum memulai sesi
              </p>
            </div>
          )}
        </div>

        {/* Ringkasan total aktif */}
        {activePetugasCount > 0 && (
          <div className="pt-2 border-t border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-500">Total petugas aktif</span>
            <span className="text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full">
              {activePetugasCount} petugas
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const MapPage = () => {
  const { isAdmin } = useAuth();
  const [markers, setMarkers] = useState([]);
  const [routePaths, setRoutePaths] = useState([]);
  const [liveTracking, setLiveTracking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openPanel, setOpenPanel] = useState(null); // null | "filter" | "aktivitas"
  const [filters, setFilters] = useState({
    type: "",
    severity: "",
    status: "",
  });
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [selectedArea, setSelectedArea] = useState("all");
  const [mapMode, setMapMode] = useState("dark");
  const [selectedRuas, setSelectedRuas] = useState("");
  const [ruasList, setRuasList] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [filters]);

  useEffect(() => {
    if (isLiveMode) {
      pollRef.current = setInterval(() => {
        refreshData();
      }, POLL_INTERVAL);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isLiveMode, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      await refreshData();
    } finally {
      setLoading(false);
    }
  };

  const refreshData = useCallback(async () => {
    try {
      const promises = [roadDamageService.getMapMarkers(filters)];
      if (isAdmin()) {
        promises.push(
          trackingService
            .getAllHistory({ per_page: 50, status: "completed" })
            .catch(() => ({ data: [] })),
          trackingService.getLiveSessions().catch(() => ({ sessions: [] })),
        );
      } else {
        promises.push(
          trackingService.getMyHistory(1).catch(() => ({ data: [] })),
        );
      }

      const results = await Promise.all(promises);
      setIfChanged(setMarkers, results[0].markers || []);

      const completedRoutes = (results[1].data || [])
        .filter(
          (s) =>
            (s.route_path && s.route_path.length > 1) ||
            (s.road_damages && s.road_damages.length > 0),
        )
        .map((s, idx) => ({
          id: s.id,
          path: s.route_path || [],
          color: ROUTE_COLORS[idx % ROUTE_COLORS.length],
          userName: s.user?.name || "Petugas",
          start_point: s.start_point || null,
          end_point: s.end_point || null,
          ruas_jalan_name: s.ruas_jalan_name || null,
          damages: s.road_damages || [],
        }));
      setIfChanged(setRoutePaths, completedRoutes);

      if (isAdmin() && results[2]) {
        setIfChanged(setLiveTracking, results[2].sessions || []);
      }
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error refreshing map data:", error);
    }
  }, [filters, isAdmin]);

  const hasActiveFilters = filters.type || filters.severity || filters.status;

  return (
    <div
      className="bg-gray-900"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          position: "relative",
          minHeight: 0,
        }}
      >
        {/* Map Container */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            position: "relative",
            minHeight: 0,
          }}
        >
          {/* Top Controls Bar */}
          <div className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/60 px-2 py-1.5 flex items-center justify-between flex-wrap gap-1.5 text-xs z-10 flex-shrink-0">
            <div className="flex items-center gap-2">
              {isAdmin() && (
                <button
                  onClick={() => setIsLiveMode(!isLiveMode)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                    isLiveMode
                      ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                      : "bg-gray-600 text-gray-300"
                  }`}
                >
                  <Radio
                    className={`w-3 h-3 ${isLiveMode ? "animate-pulse" : ""}`}
                  />
                  {isLiveMode ? "LIVE" : "LIVE OFF"}
                </button>
              )}

              <div className="relative">
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="appearance-none bg-gray-800 border border-gray-600 text-gray-100 text-xs rounded-lg pl-2.5 pr-6 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {KECAMATAN_KUBU_RAYA.map((kec) => (
                    <option key={kec.id} value={kec.id}>
                      {kec.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={selectedRuas}
                  onChange={(e) => setSelectedRuas(e.target.value)}
                  className="appearance-none bg-gray-800 border border-gray-600 text-gray-100 text-xs rounded-lg pl-2.5 pr-6 py-1 focus:outline-none focus:border-blue-500 cursor-pointer max-w-[160px]"
                >
                  <option value="">Semua Ruas Jalan</option>
                  {ruasList.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => refreshData()}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-200 text-xs px-2.5 py-1 rounded-lg transition flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>

              {/* Filter button */}
              <button
                onClick={() =>
                  setOpenPanel(openPanel === "filter" ? null : "filter")
                }
                className={`text-xs px-2.5 py-1 rounded-lg transition flex items-center gap-1 border ${
                  openPanel === "filter"
                    ? "bg-blue-600 border-blue-500 text-white"
                    : hasActiveFilters
                      ? "bg-blue-900/50 border-blue-600 text-blue-300"
                      : "bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700"
                }`}
              >
                <Filter className="w-3 h-3" />
                Filter
                {hasActiveFilters && (
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                )}
              </button>

              {isAdmin() && (
                <button
                  onClick={() =>
                    setOpenPanel(openPanel === "aktivitas" ? null : "aktivitas")
                  }
                  className={`text-xs px-2.5 py-1 rounded-lg transition flex items-center gap-1 border ${
                    openPanel === "aktivitas"
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700"
                  }`}
                >
                  <Users className="w-3 h-3" />
                  Aktivitas
                  {liveTracking.length > 0 && (
                    <span className="bg-green-500 text-white text-[10px] font-bold px-1 rounded-full">
                      {liveTracking.length}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() =>
                  setMapMode(mapMode === "dark" ? "light" : "dark")
                }
                className={`text-xs px-2.5 py-1 rounded-lg transition flex items-center gap-1 border ${
                  mapMode === "dark"
                    ? "bg-gray-800 border-gray-600 text-yellow-300 hover:bg-gray-700"
                    : "bg-yellow-100 border-yellow-300 text-gray-800 hover:bg-yellow-200"
                }`}
              >
                {mapMode === "dark" ? (
                  <Sun className="w-3 h-3" />
                ) : (
                  <Moon className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {/* Map */}
          <div
            style={{
              flex: 1,
              position: "relative",
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full bg-gray-900">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
                  <p className="text-sm text-gray-400">Memuat peta...</p>
                </div>
              </div>
            ) : (
              <RoadDamageMap
                markers={markers}
                routePaths={routePaths}
                liveTracking={liveTracking}
                selectedArea={selectedArea}
                mapMode={mapMode}
                selectedRuas={selectedRuas || null}
                onRuasListLoaded={setRuasList}
                filters={filters}
              />
            )}

            {/* Floating Panels */}
            {openPanel === "filter" && (
              <FilterPanel
                filters={filters}
                setFilters={setFilters}
                markers={markers}
                onClose={() => setOpenPanel(null)}
              />
            )}
            {openPanel === "aktivitas" && (
              <AktivitasPanel
                liveTracking={liveTracking}
                onClose={() => setOpenPanel(null)}
              />
            )}
          </div>

          {/* Legend */}
          <div className="bg-gray-900/80 backdrop-blur-sm border-t border-gray-700/60 px-3 py-1 text-xs text-gray-400 flex items-center flex-wrap gap-3 overflow-x-auto whitespace-nowrap flex-shrink-0">
            {[
              { color: "bg-blue-500", label: "Lubang" },
              { color: "bg-red-500", label: "Retak Buaya" },
              { color: "bg-yellow-500", label: "Retak Memanjang" },
              { color: "bg-green-500", label: "Retak Melintang" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${color}`} />
                <span>{label}</span>
              </div>
            ))}
            {isAdmin() && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 animate-pulse" />
                <span>Live</span>
              </div>
            )}
            {lastUpdate && (
              <span className="ml-auto text-gray-600 text-[10px]">
                Update: {lastUpdate.toLocaleTimeString("id-ID")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
