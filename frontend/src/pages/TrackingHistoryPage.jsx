import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { trackingService } from '../services/api';
import { Route, MapPin, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const TrackingHistoryPage = ({ showAll = false }) => {
  const { isAdmin } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedSession, setExpandedSession] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);

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
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (sessionId) => {
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
      console.error('Error loading session detail:', error);
    }
  };

  const getColorForClass = (className) => {
    const colors = {
      'Lubang': '#3b82f6',
      'Retak-Buaya': '#ef4444',
      'Retak-Memanjang': '#eab308',
      'Retak-Melintang': '#22c55e',
    };
    return colors[className] || '#888';
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
        <h1 className="text-3xl font-bold text-primary">
          {showAll ? 'Riwayat Tracking Semua Petugas' : 'Riwayat Tracking Saya'}
        </h1>
        <p className="text-gray-400 mt-1">
          {showAll ? 'Lihat semua sesi tracking dari seluruh petugas' : 'Lihat riwayat sesi tracking Anda'}
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="card text-center py-12">
          <Route className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Belum ada riwayat tracking</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div key={session.id} className="card">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleExpand(session.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    session.status === 'active' ? 'bg-green-600' : 'bg-gray-600'
                  }`}>
                    <Route className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    {showAll && session.user && (
                      <p className="font-semibold">{session.user.name}</p>
                    )}
                    <p className="text-sm text-gray-400">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(session.started_at).toLocaleString('id-ID')}
                      {session.ended_at && (
                        <span> — {new Date(session.ended_at).toLocaleTimeString('id-ID')}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
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
                  {expandedSession === session.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Detail */}
              {expandedSession === session.id && sessionDetail && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  {sessionDetail.road_damages && sessionDetail.road_damages.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-300">Kerusakan Terdeteksi:</h4>
                      {sessionDetail.road_damages.map((damage) => (
                        <div key={damage.id} className="bg-secondary rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {damage.image_path && (
                              <img
                                src={`/storage/${damage.image_path}`}
                                alt={damage.damage_type}
                                className="w-16 h-16 object-cover rounded"
                              />
                            )}
                            <div>
                              <p className="font-semibold" style={{ color: getColorForClass(damage.damage_type) }}>
                                {damage.damage_type}
                              </p>
                              <p className="text-xs text-gray-400">
                                <MapPin className="w-3 h-3 inline mr-1" />
                                {damage.latitude?.toFixed(6)}, {damage.longitude?.toFixed(6)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{(damage.confidence * 100).toFixed(1)}%</p>
                            <p className={`text-xs px-2 py-0.5 rounded ${
                              damage.status === 'repaired' ? 'bg-green-600' :
                              damage.status === 'verified' ? 'bg-blue-600' : 'bg-yellow-600'
                            } text-white`}>
                              {damage.status}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-4">Tidak ada kerusakan terdeteksi pada sesi ini</p>
                  )}

                  {/* Route info */}
                  {sessionDetail.route_path && sessionDetail.route_path.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-400">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {sessionDetail.route_path.length} titik koordinat terekam
                      </p>
                    </div>
                  )}
                </div>
              )}
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

export default TrackingHistoryPage;
