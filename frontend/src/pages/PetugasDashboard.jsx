import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { trackingService, roadDamageService } from '../services/api';
import { Play, MapPin, History, Route, AlertTriangle } from 'lucide-react';

const PetugasDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeSession, setActiveSession] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [activeData, historyData, statsData] = await Promise.all([
        trackingService.getActiveSession(),
        trackingService.getMyHistory(1),
        roadDamageService.getStatistics().catch(() => null),
      ]);
      setActiveSession(activeData.session);
      setRecentSessions(historyData.data || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Dashboard Petugas</h1>
        <p className="text-gray-400 mt-1">Selamat datang, {user?.name}</p>
      </div>

      {/* Active Session Alert */}
      {activeSession && (
        <div className="card bg-green-600/20 border-green-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div>
                <p className="font-semibold text-green-400">Sesi Tracking Aktif</p>
                <p className="text-sm text-gray-300">
                  Dimulai: {new Date(activeSession.started_at).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/petugas/tracking')}
              className="btn-primary text-sm"
            >
              Lanjutkan Tracking
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/petugas/tracking')}
          className="card hover:border-primary transition-colors text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <Play className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-white">Mulai Tracking</p>
              <p className="text-sm text-gray-400">Pantau kondisi jalan</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/petugas/peta')}
          className="card hover:border-primary transition-colors text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
              <MapPin className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Lihat Peta</p>
              <p className="text-sm text-gray-400">Peta kerusakan jalan</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/petugas/riwayat')}
          className="card hover:border-primary transition-colors text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center group-hover:bg-yellow-500/30 transition-colors">
              <History className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Riwayat Tracking</p>
              <p className="text-sm text-gray-400">Lihat riwayat Anda</p>
            </div>
          </div>
        </button>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <p className="text-gray-400 text-sm">Total Kerusakan</p>
            <p className="text-2xl font-bold text-primary">{stats.total}</p>
          </div>
          {stats.by_type.map((item) => {
            const colorMap = {
              'Lubang': 'text-blue-400',
              'Retak-Buaya': 'text-red-400',
              'Retak-Memanjang': 'text-yellow-400',
              'Retak-Melintang': 'text-green-400',
            };
            return (
              <div key={item.damage_type} className="card text-center">
                <p className="text-gray-400 text-sm">{item.damage_type}</p>
                <p className={`text-2xl font-bold ${colorMap[item.damage_type] || 'text-gray-400'}`}>{item.count}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Tracking History */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4 text-primary">Riwayat Tracking Terbaru</h2>
        {recentSessions.length === 0 ? (
          <div className="text-center py-8">
            <Route className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Belum ada riwayat tracking</p>
            <p className="text-sm text-gray-500 mt-1">Mulai tracking untuk memantau kondisi jalan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentSessions.slice(0, 5).map((session) => (
              <div key={session.id} className="bg-secondary rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Route className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-semibold">
                      {new Date(session.started_at).toLocaleDateString('id-ID', { 
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                      })}
                    </p>
                    <p className="text-sm text-gray-400">
                      {new Date(session.started_at).toLocaleTimeString('id-ID')}
                      {session.ended_at && ` - ${new Date(session.ended_at).toLocaleTimeString('id-ID')}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    session.status === 'active' ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                  }`}>
                    {session.status === 'active' ? 'Aktif' : 'Selesai'}
                  </span>
                  <p className="text-sm text-gray-400 mt-1">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    {session.road_damages_count || 0} kerusakan
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PetugasDashboard;
