import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { roadDamageService, trackingService } from '../services/api';
import { AlertCircle, CheckCircle, Clock, TrendingUp, Users, Route } from 'lucide-react';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentTracking, setRecentTracking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, trackingData] = await Promise.all([
        roadDamageService.getStatistics(),
        trackingService.getAllHistory({ per_page: 5 }).catch(() => ({ data: [] })),
      ]);
      setStats(statsData);
      setRecentTracking(trackingData.data || []);
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

  if (!stats) {
    return <div className="text-center text-gray-400 py-12">Gagal memuat statistik</div>;
  }

  const damageTypeColors = {
    'Lubang': { bg: 'rgba(59, 130, 246, 0.8)', border: 'rgba(59, 130, 246, 1)' },
    'Retak-Buaya': { bg: 'rgba(239, 68, 68, 0.8)', border: 'rgba(239, 68, 68, 1)' },
    'Retak-Memanjang': { bg: 'rgba(234, 179, 8, 0.8)', border: 'rgba(234, 179, 8, 1)' },
    'Retak-Melintang': { bg: 'rgba(34, 197, 94, 0.8)', border: 'rgba(34, 197, 94, 1)' },
  };

  const damageTypeData = {
    labels: stats.by_type.map(item => item.damage_type),
    datasets: [{
      label: 'Jumlah Kerusakan',
      data: stats.by_type.map(item => item.count),
      backgroundColor: stats.by_type.map(item => damageTypeColors[item.damage_type]?.bg || 'rgba(156, 163, 175, 0.8)'),
      borderColor: stats.by_type.map(item => damageTypeColors[item.damage_type]?.border || 'rgba(156, 163, 175, 1)'),
      borderWidth: 2,
    }],
  };

  const severityData = {
    labels: stats.by_severity.map(item => item.severity.toUpperCase()),
    datasets: [{
      label: 'Jumlah',
      data: stats.by_severity.map(item => item.count),
      backgroundColor: ['rgba(39, 174, 96, 0.8)', 'rgba(243, 156, 18, 0.8)', 'rgba(231, 76, 60, 0.8)'],
      borderColor: ['rgba(39, 174, 96, 1)', 'rgba(243, 156, 18, 1)', 'rgba(231, 76, 60, 1)'],
      borderWidth: 2,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#eee', font: { size: 12 } } },
    },
    scales: {
      y: { ticks: { color: '#eee' }, grid: { color: 'rgba(255,255,255,0.1)' } },
      x: { ticks: { color: '#eee' }, grid: { color: 'rgba(255,255,255,0.1)' } },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#eee', font: { size: 12 } } },
    },
  };

  const pendingCount = stats.by_status.find(s => s.status === 'pending')?.count || 0;
  const verifiedCount = stats.by_status.find(s => s.status === 'verified')?.count || 0;
  const repairedCount = stats.by_status.find(s => s.status === 'repaired')?.count || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Dashboard Admin</h1>
        <button onClick={loadData} className="btn-secondary text-sm">Refresh Data</button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-primary/20 to-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Kerusakan</p>
              <p className="text-3xl font-bold text-primary">{stats.total}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-primary opacity-50" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-yellow-600/20 to-yellow-600/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Pending</p>
              <p className="text-3xl font-bold text-yellow-500">{pendingCount}</p>
            </div>
            <Clock className="w-12 h-12 text-yellow-500 opacity-50" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-blue-600/20 to-blue-600/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Terverifikasi</p>
              <p className="text-3xl font-bold text-blue-500">{verifiedCount}</p>
            </div>
            <AlertCircle className="w-12 h-12 text-blue-500 opacity-50" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-green-600/20 to-green-600/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Diperbaiki</p>
              <p className="text-3xl font-bold text-green-500">{repairedCount}</p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 text-primary">Sebaran Jenis Kerusakan</h2>
          <div className="h-64">
            <Pie data={damageTypeData} options={pieOptions} />
          </div>
        </div>
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 text-primary">Tingkat Keparahan</h2>
          <div className="h-64">
            <Bar data={severityData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Damage Type Detail Cards - sesuai proposal warna */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4 text-primary">Detail Per Jenis Kerusakan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.by_type.map((item) => {
            const colorMap = {
              'Lubang': 'border-blue-500 text-blue-400',
              'Retak-Buaya': 'border-red-500 text-red-400',
              'Retak-Memanjang': 'border-yellow-500 text-yellow-400',
              'Retak-Melintang': 'border-green-500 text-green-400',
            };
            return (
              <div key={item.damage_type} className={`bg-secondary rounded-lg p-4 border-l-4 ${colorMap[item.damage_type] || 'border-gray-500 text-gray-400'}`}>
                <p className="text-sm text-gray-400">{item.damage_type}</p>
                <p className="text-2xl font-bold">{item.count}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.total > 0 ? ((item.count / stats.total) * 100).toFixed(1) : 0}% dari total
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Tracking Sessions */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4 text-primary">Rekap Tracking Terbaru</h2>
        {recentTracking.length === 0 ? (
          <p className="text-gray-400 text-center py-4">Belum ada data tracking</p>
        ) : (
          <div className="space-y-3">
            {recentTracking.map((session) => (
              <div key={session.id} className="bg-secondary rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Route className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-semibold">{session.user?.name || 'Petugas'}</p>
                    <p className="text-sm text-gray-400">
                      {new Date(session.started_at).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    session.status === 'active' ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                  }`}>
                    {session.status === 'active' ? 'Aktif' : 'Selesai'}
                  </span>
                  <p className="text-sm text-gray-400 mt-1">{session.road_damages_count || 0} kerusakan</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
