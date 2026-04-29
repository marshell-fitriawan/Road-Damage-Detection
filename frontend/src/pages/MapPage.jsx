import React, { useEffect, useState, useRef, useCallback } from 'react';
import RoadDamageMap from '../components/RoadDamageMap';
import { roadDamageService, trackingService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Filter, X, RefreshCw, Radio } from 'lucide-react';

const POLL_INTERVAL = 5000; // Refresh setiap 5 detik

const MapPage = () => {
  const { isAdmin } = useAuth();
  const [markers, setMarkers] = useState([]);
  const [routePaths, setRoutePaths] = useState([]);
  const [liveTracking, setLiveTracking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ type: '', severity: '', status: '' });
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [isLiveMode, setIsLiveMode] = useState(true);
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
      setMarkers(results[0].markers || []);

      // Completed routes (garis putus-putus)
      const completedRoutes = (results[1].data || [])
        .filter(s => s.route_path && s.route_path.length > 1)
        .map((s, i) => ({
          path: s.route_path,
          color: '#6b7280',
          userName: s.user?.name || 'Petugas',
        }));
      setRoutePaths(completedRoutes);

      // Live tracking sessions (admin only)
      if (isAdmin() && results[2]) {
        setLiveTracking(results[2].sessions || []);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error refreshing map data:', error);
    }
  }, [filters, isAdmin]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value === prev[key] ? '' : value }));
  };

  const clearFilters = () => setFilters({ type: '', severity: '', status: '' });

  const damageTypes = ['Retak-Buaya', 'Retak-Memanjang', 'Retak-Melintang', 'Lubang'];
  const severities = ['low', 'medium', 'high'];
  const statuses = ['pending', 'verified', 'repaired'];

  const activePetugasCount = liveTracking.length;

  return (
    <div className="h-full flex-col space-y-4">
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
          <button onClick={() => refreshData()} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary flex items-center gap-2 text-sm">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
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
              <div className="w-6 h-0.5 bg-blue-400"></div> Rute Live
            </div>
            <div className="flex items-center gap-1">
              <div className="w-6 h-0.5 bg-gray-400 border-dashed border-t-2 border-gray-400"></div> Rute Selesai
            </div>
          </>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 card p-0 overflow-hidden" style={{ minHeight: '500px' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full" style={{ minHeight: '500px' }}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <RoadDamageMap
            markers={markers}
            routePaths={routePaths}
            liveTracking={liveTracking}
            onMarkerClick={setSelectedMarker}
          />
        )}
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>Menampilkan {markers.length} titik kerusakan — Kabupaten Kubu Raya</span>
        {lastUpdate && (
          <span>Terakhir diperbarui: {lastUpdate.toLocaleTimeString('id-ID')}</span>
        )}
      </div>

      {/* Detail Modal */}
      {selectedMarker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-primary">{selectedMarker.type}</h2>
              <button onClick={() => setSelectedMarker(null)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            {selectedMarker.image_url && (
              <img src={selectedMarker.image_url} alt={selectedMarker.type} className="w-full rounded-lg mb-4" />
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Tingkat Keparahan</p>
                <p className={`font-bold text-lg ${
                  selectedMarker.severity === 'high' ? 'text-red-500' :
                  selectedMarker.severity === 'medium' ? 'text-yellow-500' : 'text-green-500'
                }`}>{selectedMarker.severity.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <p className={`font-bold text-lg ${
                  selectedMarker.status === 'repaired' ? 'text-green-500' :
                  selectedMarker.status === 'verified' ? 'text-blue-500' : 'text-yellow-500'
                }`}>{selectedMarker.status.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Confidence</p>
                <p className="font-bold">{(selectedMarker.confidence * 100).toFixed(1)}%</p>
              </div>
              {selectedMarker.area_cm2 && (
                <div>
                  <p className="text-sm text-gray-400">Luas Kerusakan</p>
                  <p className="font-bold">{selectedMarker.area_cm2.toFixed(1)} cm²</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-400">Koordinat</p>
                <p className="font-mono text-sm">{selectedMarker.lat.toFixed(6)}, {selectedMarker.lng.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Waktu Deteksi</p>
                <p>{new Date(selectedMarker.created_at).toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;
