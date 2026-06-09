import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Pie, Bar, Line } from "react-chartjs-2";
import { roadDamageService, trackingService } from "../services/api";
import { useTheme } from "../contexts/ThemeContext";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Route,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronRight,
} from "lucide-react";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const StatCard = ({ icon: Icon, label, value, trend, trendUp, color }) => {
  return (
    <div
      className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 hover:border-gray-600 transition-all hover:shadow-lg hover:shadow-${color}/20 group`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-sm font-medium">{label}</p>
          <h3 className="text-4xl font-bold text-white mt-2 group-hover:text-gray-100 transition">
            {value}
          </h3>

          {trend && (
            <div
              className={`flex items-center gap-1 mt-3 px-3 py-1 rounded-full w-fit text-xs font-semibold ${
                trendUp
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {trendUp ? (
                <ArrowUpRight size={14} />
              ) : (
                <ArrowDownRight size={14} />
              )}
              {trend}
            </div>
          )}
        </div>

        <div
          className={`p-4 rounded-lg bg-gradient-to-br from-${color}-500/20 to-${color}-600/10`}
        >
          <Icon size={28} className={`text-${color}-400`} />
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [stats, setStats] = useState(null);
  const [recentTracking, setRecentTracking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("week");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, trackingData] = await Promise.all([
        roadDamageService.getStatistics(),
        trackingService
          .getAllHistory({ per_page: 15 })
          .catch(() => ({ data: [] })),
      ]);
      setStats(statsData);
      setRecentTracking(trackingData.data || []);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  // Generate tracking activity data for line chart
  const generateTrackingActivityData = () => {
    if (!recentTracking || recentTracking.length === 0) {
      return { labels: [], datasets: [] };
    }

    // Group tracking by date
    const activityByDate = {};
    recentTracking.forEach((item) => {
      const date = new Date(item.created_at).toLocaleDateString("id-ID", {
        month: "short",
        day: "numeric",
      });
      activityByDate[date] = (activityByDate[date] || 0) + 1;
    });

    const dates = Object.keys(activityByDate).reverse();
    const counts = dates.map((date) => activityByDate[date]);

    return {
      labels: dates,
      datasets: [
        {
          label: "Aktivitas Tracking",
          data: counts,
          borderColor: "rgba(59, 130, 246, 1)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "rgba(59, 130, 246, 1)",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-blue-500"></div>
          <p className="text-gray-400 font-medium">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-16">
        <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
        <p className="text-gray-400 text-lg">Gagal memuat statistik</p>
      </div>
    );
  }

  // Format datetime
  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const damageTypeColors = {
    Lubang: {
      bg: "rgba(59, 130, 246, 0.8)",
      border: "rgba(59, 130, 246, 1)",
      light: "blue",
    },
    "Retak-Buaya": {
      bg: "rgba(239, 68, 68, 0.8)",
      border: "rgba(239, 68, 68, 1)",
      light: "red",
    },
    "Retak-Memanjang": {
      bg: "rgba(234, 179, 8, 0.8)",
      border: "rgba(234, 179, 8, 1)",
      light: "yellow",
    },
    "Retak-Melintang": {
      bg: "rgba(34, 197, 94, 0.8)",
      border: "rgba(34, 197, 94, 1)",
      light: "green",
    },
  };

  const damageTypeData = {
    labels: stats.by_type.map((item) => item.damage_type),
    datasets: [
      {
        label: "Jumlah Kerusakan",
        data: stats.by_type.map((item) => item.count),
        backgroundColor: stats.by_type.map(
          (item) =>
            damageTypeColors[item.damage_type]?.bg ||
            "rgba(156, 163, 175, 0.8)",
        ),
        borderColor: stats.by_type.map(
          (item) =>
            damageTypeColors[item.damage_type]?.border ||
            "rgba(156, 163, 175, 1)",
        ),
        borderWidth: 2,
      },
    ],
  };

  const severityData = {
    labels: stats.by_severity.map((item) => item.severity.toUpperCase()),
    datasets: [
      {
        label: "Jumlah",
        data: stats.by_severity.map((item) => item.count),
        backgroundColor: [
          "rgba(39, 174, 96, 0.8)",
          "rgba(243, 156, 18, 0.8)",
          "rgba(231, 76, 60, 0.8)",
        ],
        borderColor: [
          "rgba(39, 174, 96, 1)",
          "rgba(243, 156, 18, 1)",
          "rgba(231, 76, 60, 1)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: isDark ? "#eee" : "#374151",
          font: { size: 13, weight: "500" },
          padding: 15,
          usePointStyle: true,
        },
      },
    },
    scales: {
      y: {
        ticks: { color: isDark ? "#999" : "#6b7280" },
        grid: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)", drawBorder: false },
        beginAtZero: true,
      },
      x: {
        ticks: { color: isDark ? "#999" : "#6b7280" },
        grid: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)", drawBorder: false },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: isDark ? "#eee" : "#374151",
          font: { size: 13, weight: "500" },
          padding: 15,
          usePointStyle: true,
        },
      },
    },
  };

  const pendingCount =
    stats.by_status.find((s) => s.status === "pending")?.count || 0;
  const verifiedCount =
    stats.by_status.find((s) => s.status === "verified")?.count || 0;
  const repairedCount =
    stats.by_status.find((s) => s.status === "repaired")?.count || 0;

  // Get most common damage type
  const mostCommonDamage = stats.by_type.reduce(
    (a, b) => (a.count > b.count ? a : b),
    stats.by_type[0],
  );

  return (
    <div className="bg-gray-900">
      <div className="overflow-auto p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8 pb-8">
          {/* Header Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-4xl font-bold text-white">
                  Ringkasan Monitoring
                </h1>
                <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
                  <Calendar size={16} />
                  {dateStr} • {timeStr} - Data real-time
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedPeriod("week")}
                  className={`px-4 py-2 rounded-lg font-medium transition ${selectedPeriod === "week" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
                >
                  Minggu Ini
                </button>
                <button
                  onClick={() => setSelectedPeriod("month")}
                  className={`px-4 py-2 rounded-lg font-medium transition ${selectedPeriod === "month" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
                >
                  Bulan Ini
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={AlertCircle}
              label="Total Kerusakan"
              value={stats.total}
              color="red"
            />
            <StatCard
              icon={Activity}
              label="Sesi Tracking"
              value={recentTracking.length}
              color="green"
            />
            <StatCard
              icon={Clock}
              label="Belum Diverifikasi"
              value={pendingCount}
              color="yellow"
            />
            <StatCard
              icon={CheckCircle}
              label="Sudah Diperbaiki"
              value={repairedCount}
              color="blue"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Damage Type Chart */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 hover:border-gray-600 transition">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Grafik Jenis Kerusakan
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {stats.by_type.length} jenis kerusakan
                  </p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <TrendingUp size={20} className="text-blue-400" />
                </div>
              </div>
              <div className="h-72">
                <Pie data={damageTypeData} options={pieOptions} />
              </div>
            </div>

            {/* Recent Tracking History */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 hover:border-gray-600 transition lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Riwayat Tracking Terbaru
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {recentTracking.length} tracking terakhir
                  </p>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <Route size={20} className="text-purple-400" />
                </div>
              </div>

              {recentTracking.length === 0 ? (
                <div className="text-center py-12">
                  <Route className="w-14 h-14 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 font-medium">
                    Belum ada riwayat tracking
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Mulai tracking untuk memantau kondisi jalan
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTracking.slice(0, 5).map((session) => (
                    <div
                      key={session.id}
                      className="bg-gray-700/20 rounded-xl p-4 border border-gray-700/50 hover:border-gray-600 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                            <Route className="w-6 h-6 text-blue-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-white">
                              {new Date(session.started_at).toLocaleDateString(
                                "id-ID",
                                {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                },
                              )}
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                              {session.officer_name &&
                                `Petugas: ${session.officer_name}`}
                              {session.started_at &&
                                ` • Dimulai: ${new Date(session.started_at).toLocaleTimeString("id-ID")}`}
                              {session.ended_at &&
                                ` • Selesai: ${new Date(session.ended_at).toLocaleTimeString("id-ID")}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                              session.status === "active"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-gray-600/50 text-gray-300"
                            }`}
                          >
                            {session.status === "active" ? "Aktif" : "Selesai"}
                          </span>
                          <p className="text-sm text-gray-400 mt-2 flex items-center justify-end gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {session.road_damages_count || 0} kerusakan
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {recentTracking.length > 5 && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <button
                    onClick={() => navigate("/admin/tracking")}
                    className="w-full py-3 px-4 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 rounded-lg transition border border-blue-600/30 hover:border-blue-600/50 font-medium text-sm"
                  >
                    Lihat Semua Riwayat
                  </button>
                </div>
              )}
            </div>

            {/* Severity Chart */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 hover:border-gray-600 transition lg:col-span-3">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Tingkat Keparahan
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Distribusi severity kerusakan jalan
                  </p>
                </div>
                <div className="p-3 bg-orange-500/20 rounded-lg">
                  <AlertCircle size={20} className="text-orange-400" />
                </div>
              </div>
              <div className="h-72">
                <Bar data={severityData} options={chartOptions} />
              </div>
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 rounded-2xl p-6 border border-red-700/30 hover:border-red-600/50 transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-400 text-sm font-medium">
                    Belum Diverifikasi
                  </p>
                  <p className="text-3xl font-bold text-red-300 mt-2">
                    {pendingCount}
                  </p>
                </div>
                <div className="p-3 bg-red-500/20 rounded-lg">
                  <Clock size={24} className="text-red-400" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 rounded-2xl p-6 border border-yellow-700/30 hover:border-yellow-600/50 transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-400 text-sm font-medium">
                    Terverifikasi
                  </p>
                  <p className="text-3xl font-bold text-yellow-300 mt-2">
                    {verifiedCount}
                  </p>
                </div>
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <AlertCircle size={24} className="text-yellow-400" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-2xl p-6 border border-green-700/30 hover:border-green-600/50 transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-400 text-sm font-medium">
                    Sudah Diperbaiki
                  </p>
                  <p className="text-3xl font-bold text-green-300 mt-2">
                    {repairedCount}
                  </p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <CheckCircle size={24} className="text-green-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
