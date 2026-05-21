import React, { useEffect, useState, useRef, useCallback } from 'react';
import RoadDamageMap, { KECAMATAN_KUBU_RAYA } from '../components/RoadDamageMap';
import { roadDamageService, trackingService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Filter, X, RefreshCw, Radio, MapPin, Sun, Moon, Route } from 'lucide-react';

const POLL_INTERVAL = 5000; // Refresh setiap 5 detik

// Hanya update state jika data benar-benar berubah — mencegah re-mount marker Leaflet
const setIfChanged = (setter, newValue) => {
  setter(prev => {
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
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ type: '', severity: '', status: '' });
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [selectedArea, setSelectedArea] = useState('all');
  const [mapMode, setMapMode] = useState('dark');
  const [selectedRuas, setSelectedRuas] = useState('');
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
      const promises = [
        roadDamageService.getMapMarkers(filters),
      ];

      // Admin: get completed routes + live tracking
      if (isAdmin()) {
        promises.push(
          trackingService.getAllHistory({ per_page: 50, status: 'completed' }).catch(() => ({ data: [] }))
        );
        promises.push(
          trackingService.getLiveSessions().catch(() => ({ sessions: [] }))
        );
      } else {
        // Petugas: own routes only
        promises.push(
          trackingService.getMyHistory(1).catch(() => ({ data: [] }))
        );
      }

      const results = await Promise.all(promises);

      // Markers kerusakan
      setIfChanged(setMarkers, results[0].markers || []);

      // Completed routes (garis putus-putus)
      const completedRoutes = (results[1].data || [])
        .filter(s => (s.route_path && s.route_path.length > 1) || (s.road_damages && s.road_damages.length > 0))
        .map((s) => ({
          id: s.id,
          path: s.route_path || [],
          color: '#6b7280',
          userName: s.user?.name || 'Petugas',
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
      console.error('Error refreshing map data:', error);
    }
  }, [filters, isAdmin]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value === prev[key] ? '' : value }));
  };

  const clearFilters = () => {
    setFilters({ type: '', severity: '', status: '' });
    setSelectedArea('all');
  };

  const damageTypes = ['Retak-Buaya', 'Retak-Memanjang', 'Retak-Melintang', 'Lubang'];
  const severities = ['low', 'medium', 'high'];
  const statuses = ['pending', 'verified', 'repaired'];

  const activePetugasCount = liveTracking.length;

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-bold text-primary">Peta Kerusakan Jalan</h1>
        <div className="flex items-center gap-2">
          {/* Live mode toggle */}
          {isAdmin() && (
            <button
              onClick={() => setIsLiveMode(!isLiveMode)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isLiveMode ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
              }`}
            >
              <Radio className={`w-4 h-4 ${isLiveMode ? 'animate-pulse' : ''}`} />
              {isLiveMode ? 'LIVE' : 'LIVE OFF'}
            </button>
          )}
          {/* Area/Kecamatan selector */}
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4 text-primary" />
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="bg-accent border border-gray-600 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary transition-colors"
            >
              {KECAMATAN_KUBU_RAYA.map(kec => (
                <option key={kec.id} value={kec.id}>{kec.name}</option>
              ))}
            </select>
          </div>
          <button onClick={() => refreshData()} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary flex items-center gap-2 text-sm">
            <Filter className="w-4 h-4" /> Filter
          </button>
          {/* Map mode toggle */}
          <button
            onClick={() => setMapMode(mapMode === 'dark' ? 'light' : 'dark')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              mapMode === 'dark'
                ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600'
                : 'bg-yellow-100 text-gray-800 hover:bg-yellow-200'
            }`}
            title={mapMode === 'dark' ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'}
          >
            {mapMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {mapMode === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </div>

      {/* Ruas Jalan Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <Route className="w-4 h-4 text-yellow-400" />
        <span className="text-sm text-gray-400">Ruas Jalan:</span>
        <select
          value={selectedRuas}
          onChange={(e) => setSelectedRuas(e.target.value)}
          className="bg-accent border border-gray-600 text-gray-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-primary transition-colors max-w-md"
        >
          <option value="">-- Semua Ruas (tampil semua) --</option>
          {ruasList.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        {selectedRuas && (
          <button
            onClick={() => setSelectedRuas('')}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
          >
            <X className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      {/* Live tracking info */}
      {isAdmin() && activePetugasCount > 0 && (
        <div className="card bg-green-600/20 border-green-600 py-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400 font-semibold">
              {activePetugasCount} petugas sedang tracking
            </span>
            <span className="text-gray-400 text-sm">
              — Rute & kerusakan diperbarui otomatis setiap 5 detik
            </span>
          </div>
        </div>
      )}

      {showFilters && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Filter Data</h3>
            <button onClick={clearFilters} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
              <X className="w-4 h-4" /> Clear
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Jenis Kerusakan</label>
              <div className="space-y-2">
                {damageTypes.map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={filters.type === type} onChange={() => handleFilterChange('type', type)}
                      className="w-4 h-4 text-primary bg-secondary border-gray-600 rounded" />
                    <span className="text-sm">{type}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tingkat Keparahan</label>
              <div className="space-y-2">
                {severities.map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={filters.severity === s} onChange={() => handleFilterChange('severity', s)}
                      className="w-4 h-4 text-primary bg-secondary border-gray-600 rounded" />
                    <span className="text-sm capitalize">{s}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <div className="space-y-2">
                {statuses.map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={filters.status === s} onChange={() => handleFilterChange('status', s)}
                      className="w-4 h-4 text-primary bg-secondary border-gray-600 rounded" />
                    <span className="text-sm capitalize">{s}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Lubang</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> Retak Buaya</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-500"></div> Retak Memanjang</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> Retak Melintang</div>
        {isAdmin() && (
          <>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 animate-pulse"></div>
              Petugas (live)
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-0.5 bg-blue-400"></div> Rute GPS Live
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-0.5 bg-gray-400 border-dashed border-t-2 border-gray-400"></div> Rute GPS Selesai
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">A</div>
              Titik Mulai
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">B</div>
              Titik Akhir
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 border-t-2 border-dashed border-yellow-400"></div> Target Ruas (A→B)
            </div>
          </>
        )}
      </div>

      {/* Map */}
      <div className="card p-0 overflow-hidden rounded-xl border border-gray-700 relative" style={{ height: '60vh', minHeight: '400px', maxHeight: '600px' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full" style={{ height: '75vh', minHeight: '500px' }}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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

      {/* Footer info */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>
          Menampilkan {markers.length} titik kerusakan — {
            selectedArea === 'all' 
              ? 'Kabupaten Kubu Raya' 
              : KECAMATAN_KUBU_RAYA.find(k => k.id === selectedArea)?.name || 'Kabupaten Kubu Raya'
          }
        </span>
        {lastUpdate && (
          <span>Terakhir diperbarui: {lastUpdate.toLocaleTimeString('id-ID')}</span>
        )}
      </div>
    </div>
  );
};

export default MapPage;
