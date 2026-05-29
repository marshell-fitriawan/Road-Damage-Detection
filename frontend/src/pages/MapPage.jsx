import React, { useEffect, useState, useRef, useCallback } from "react";
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
  MapPin,
  Sun,
  Moon,
  Route,
  AlertCircle,
  CheckCircle,
  Wrench,
  Users,
} from "lucide-react";

const POLL_INTERVAL = 5000; // Refresh setiap 5 detik

// Hanya update state jika data benar-benar berubah — mencegah re-mount marker Leaflet
const setIfChanged = (setter, newValue) => {
  setter((prev) => {
    const prevJson = JSON.stringify(prev);
    const newJson = JSON.stringify(newValue);
    return prevJson === newJson ? prev : newValue;
  });
};

const MapPage = () => {
  const { isAdmin } = useAuth();
  const [markers, setMarkers] = useState([]);
  const [routePaths, setRoutePaths] = useState([]);
  const [liveTracking, setLiveTracking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarTab, setSidebarTab] = useState("filter"); // "filter" atau "aktivitas"
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

  // Load initial data
  useEffect(() => {
    loadData();
  }, [filters]);

  // Real-time polling
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

      // Admin: get completed routes + live tracking
      if (isAdmin()) {
        promises.push(
          trackingService
            .getAllHistory({ per_page: 50, status: "completed" })
            .catch(() => ({ data: [] })),
        );
        promises.push(
          trackingService.getLiveSessions().catch(() => ({ sessions: [] })),
        );
      } else {
        // Petugas: own routes only
        promises.push(
          trackingService.getMyHistory(1).catch(() => ({ data: [] })),
        );
      }

      const results = await Promise.all(promises);

      // Markers kerusakan
      setIfChanged(setMarkers, results[0].markers || []);

      // Completed routes (garis putus-putus)
      const completedRoutes = (results[1].data || [])
        .filter(
          (s) =>
            (s.route_path && s.route_path.length > 1) ||
            (s.road_damages && s.road_damages.length > 0),
        )
        .map((s) => ({
          id: s.id,
          path: s.route_path || [],
          color: "#6b7280",
          userName: s.user?.name || "Petugas",
          start_point: s.start_point || null,
          end_point: s.end_point || null,
          ruas_jalan_name: s.ruas_jalan_name || null,
          damages: s.road_damages || [],
        }));
      setIfChanged(setRoutePaths, completedRoutes);

      // Live tracking sessions (admin only)
      if (isAdmin() && results[2]) {
        setIfChanged(setLiveTracking, results[2].sessions || []);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error refreshing map data:", error);
    }
  }, [filters, isAdmin]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === prev[key] ? "" : value,
    }));
  };

  const clearFilters = () => {
    setFilters({ type: "", severity: "", status: "" });
    setSelectedArea("all");
  };

  const damageTypes = [
    "Retak-Buaya",
    "Retak-Memanjang",
    "Retak-Melintang",
    "Lubang",
  ];
  const severities = ["low", "medium", "high"];
  const statuses = ["pending", "verified", "repaired"];

  const activePetugasCount = liveTracking.length;

  // Calculate statistics
  const totalDamages = markers.length;
  const pendingDamages = markers.filter((m) => m.status === "pending").length;
  const repairedDamages = markers.filter((m) => m.status === "repaired").length;

  // Breakdown by damage type
  const damageBreakdown = {
    Lubang: markers.filter((m) => m.damage_type === "Lubang").length,
    "Retak-Buaya": markers.filter((m) => m.damage_type === "Retak-Buaya")
      .length,
    "Retak-Memanjang": markers.filter(
      (m) => m.damage_type === "Retak-Memanjang",
    ).length,
    "Retak-Melintang": markers.filter(
      (m) => m.damage_type === "Retak-Melintang",
    ).length,
  };

  return (
    <div className="bg-gray-900 flex-1 flex flex-col">
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map Container */}
        <div className="flex-1 flex flex-col relative">
          {/* Top Controls */}
          <div className="bg-gray-800/50 border-b border-gray-700 px-2 py-1 flex items-center justify-between flex-wrap gap-1.5 text-xs">
            <div className="flex items-center gap-2">
              {isAdmin() && (
                <button
                  onClick={() => setIsLiveMode(!isLiveMode)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                    isLiveMode
                      ? "bg-green-600 text-white"
                      : "bg-gray-600 text-gray-300"
                  }`}
                >
                  <Radio
                    className={`w-3 h-3 ${isLiveMode ? "animate-pulse" : ""}`}
                  />
                  {isLiveMode ? "LIVE" : "LIVE OFF"}
                </button>
              )}
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="bg-gray-700 border border-gray-600 text-gray-100 text-xs rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500"
              >
                {KECAMATAN_KUBU_RAYA.map((kec) => (
                  <option key={kec.id} value={kec.id}>
                    {kec.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedRuas}
                onChange={(e) => setSelectedRuas(e.target.value)}
                className="bg-gray-700 border border-gray-600 text-gray-100 text-xs rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500"
              >
                <option value="">Semua Ruas Jalan</option>
                {ruasList.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refreshData()}
                className="bg-gray-700 hover:bg-gray-600 text-gray-100 text-xs px-2 py-0.5 rounded transition flex items-center gap-0.5"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
              <button
                onClick={() => setSidebarTab("filter")}
                className="bg-gray-700 hover:bg-gray-600 text-gray-100 text-xs px-2 py-0.5 rounded transition flex items-center gap-0.5"
              >
                <Filter className="w-3 h-3" /> Filter
              </button>
              <button
                onClick={() =>
                  setMapMode(mapMode === "dark" ? "light" : "dark")
                }
                className={`text-xs px-2 py-0.5 rounded transition flex items-center gap-0.5 ${
                  mapMode === "dark"
                    ? "bg-gray-700 text-yellow-300 hover:bg-gray-600"
                    : "bg-yellow-100 text-gray-800 hover:bg-yellow-200"
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
          <div className="flex-1 relative overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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
              />
            )}
          </div>

          {/* Legend */}
          <div className="bg-gray-800/50 border-t border-gray-700 px-2 py-0.5 text-xs text-gray-400 flex flex-wrap gap-2 overflow-x-auto whitespace-nowrap">
            <div className="flex items-center gap-0.5">
              <div className="w-1 h-1 rounded-full bg-blue-500"></div>{" "}
              <span className="text-xs">Lubang</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-1 h-1 rounded-full bg-red-500"></div>{" "}
              <span className="text-xs">Retak Buaya</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-1 h-1 rounded-full bg-yellow-500"></div>{" "}
              <span className="text-xs">Retak Memanjang</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-1 h-1 rounded-full bg-green-500"></div>{" "}
              <span className="text-xs">Retak Melintang</span>
            </div>
            {isAdmin() && (
              <div className="flex items-center gap-0.5">
                <div className="w-1 h-1 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 animate-pulse"></div>{" "}
                <span className="text-xs">Live</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setSidebarTab("filter")}
              className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors ${
                sidebarTab === "filter"
                  ? "bg-gray-700 text-white border-b-2 border-blue-500"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              FILTER
            </button>
            <button
              onClick={() => setSidebarTab("aktivitas")}
              className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors ${
                sidebarTab === "aktivitas"
                  ? "bg-gray-700 text-white border-b-2 border-blue-500"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              AKTIVITAS
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {/* FILTER Tab */}
            {sidebarTab === "filter" && (
              <div className="px-4 py-4 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-white mb-3 tracking-wide">
                    JENIS KERUSAKAN
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(damageBreakdown).map(([type, count]) => (
                      <label
                        key={type}
                        className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded hover:bg-gray-700/50 transition group"
                      >
                        <input
                          type="checkbox"
                          checked={filters.type === type}
                          onChange={() => handleFilterChange("type", type)}
                          className="w-4 h-4 rounded accent-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-300 font-medium">
                            {type}
                          </div>
                          <div className="text-xs text-gray-500">
                            Kasus: {count}
                          </div>
                        </div>
                        <div
                          className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            type === "Lubang"
                              ? "bg-blue-500"
                              : type === "Retak-Buaya"
                                ? "bg-red-500"
                                : type === "Retak-Memanjang"
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                          }`}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <h3 className="text-xs font-bold text-white mb-3 tracking-wide">
                    TINGKAT KEPARAHAN
                  </h3>
                  <div className="space-y-2">
                    {[
                      { key: "low", label: "Rendah", color: "green" },
                      { key: "medium", label: "Sedang", color: "yellow" },
                      { key: "high", label: "Tinggi", color: "red" },
                    ].map((s) => (
                      <label
                        key={s.key}
                        className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded hover:bg-gray-700/50 transition"
                      >
                        <input
                          type="checkbox"
                          checked={filters.severity === s.key}
                          onChange={() => handleFilterChange("severity", s.key)}
                          className="w-4 h-4 rounded accent-blue-500"
                        />
                        <span className="text-sm text-gray-300">{s.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <h3 className="text-xs font-bold text-white mb-3 tracking-wide">
                    STATUS
                  </h3>
                  <div className="space-y-2">
                    {[
                      { key: "pending", label: "Belum Diverifikasi" },
                      { key: "verified", label: "Terverifikasi" },
                      { key: "repaired", label: "Sudah Diperbaiki" },
                    ].map((s) => (
                      <label
                        key={s.key}
                        className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded hover:bg-gray-700/50 transition"
                      >
                        <input
                          type="checkbox"
                          checked={filters.status === s.key}
                          onChange={() => handleFilterChange("status", s.key)}
                          className="w-4 h-4 rounded accent-blue-500"
                        />
                        <span className="text-sm text-gray-300">{s.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* AKTIVITAS Tab */}
            {sidebarTab === "aktivitas" && (
              <div className="px-4 py-4 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-white mb-3 tracking-wide">
                    AKTIVITAS PETUGAS
                  </h3>
                  {liveTracking.length > 0 ? (
                    <div className="space-y-2">
                      {liveTracking.slice(0, 8).map((session, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-700/30 rounded p-3 border border-gray-700/50 hover:border-gray-600 transition group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white text-sm truncate">
                                {session.user?.name || "Petugas"}
                              </p>
                              <p className="text-gray-400 truncate text-xs mt-1">
                                📍{" "}
                                {session.ruas_jalan_name?.substring(0, 35) ||
                                  "Lokasi"}
                              </p>
                              <p className="text-gray-500 text-xs mt-1">
                                Status:{" "}
                                <span className="text-blue-300">Progress</span>
                              </p>
                            </div>
                            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">
                        Tidak ada aktivitas
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <h3 className="text-xs font-bold text-white mb-3 tracking-wide">
                    ACTIVE TRACKING STATUS
                  </h3>
                  {activePetugasCount > 0 ? (
                    <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-blue-700/50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-white">
                            {activePetugasCount}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Tracking ID: T005
                          </p>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-700/30">
                        <div>
                          <p className="text-xs text-gray-400">Lokasi</p>
                          <p className="text-xs font-semibold text-white truncate">
                            Pal Lima
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Petugas</p>
                          <p className="text-xs font-semibold text-white">
                            Andi S.
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-gray-400">Status</p>
                          <p className="text-xs font-semibold text-green-400">
                            Aktif (20 Menit)
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Progress</p>
                          <div className="w-full bg-gray-700 rounded h-1.5 mt-1.5">
                            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded w-2/3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-700 border-dashed text-center">
                      <p className="text-sm text-gray-400">
                        Tidak ada tracking aktif
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Modal - Remove if using tab-based filter */}
    </div>
  );
};

export default MapPage;
