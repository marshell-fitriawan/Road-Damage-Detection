import React, { useState } from "react";
import { X, Clock, Download } from "lucide-react";

const ActivityLogModal = ({ isOpen, onClose }) => {
  const [filter, setFilter] = useState("all");
  const [dateRange, setDateRange] = useState({
    from: "",
    to: "",
  });

  // Sample activity data
  const activities = [
    {
      id: 1,
      action: "Login",
      description: "Berhasil login ke sistem",
      type: "login",
      timestamp: "2024-05-29 14:32:15",
      details: "IP: 192.168.56.1, Browser: Chrome",
    },
    {
      id: 2,
      action: "Update Profil",
      description: "Mengubah nama profil",
      type: "update",
      timestamp: "2024-05-29 13:15:42",
      details: "Nama: Admin -> Administrator",
    },
    {
      id: 3,
      action: "Kelola Pengguna",
      description: "Menambah pengguna baru",
      type: "user",
      timestamp: "2024-05-29 10:22:10",
      details: "Email: petugas@example.com, Role: Petugas Lapangan",
    },
    {
      id: 4,
      action: "Export Data",
      description: "Export laporan tracking",
      type: "export",
      timestamp: "2024-05-28 16:45:33",
      details: "Format: PDF, Total Records: 156",
    },
    {
      id: 5,
      action: "Verifikasi Data",
      description: "Verifikasi kerusakan jalan",
      type: "verify",
      timestamp: "2024-05-28 11:20:15",
      details: "Lokasi: Jl. Pattimura, Status: Verified",
    },
    {
      id: 6,
      action: "Login",
      description: "Berhasil login ke sistem",
      type: "login",
      timestamp: "2024-05-27 09:10:42",
      details: "IP: 192.168.56.1, Browser: Chrome",
    },
  ];

  const getTypeColor = (type) => {
    const colors = {
      login: "bg-blue-600/20 text-blue-400",
      update: "bg-yellow-600/20 text-yellow-400",
      user: "bg-purple-600/20 text-purple-400",
      export: "bg-green-600/20 text-green-400",
      verify: "bg-indigo-600/20 text-indigo-400",
    };
    return colors[type] || "bg-gray-600/20 text-gray-400";
  };

  const getTypeLabel = (type) => {
    const labels = {
      login: "Login",
      update: "Update",
      user: "Pengguna",
      export: "Export",
      verify: "Verifikasi",
    };
    return labels[type] || "Lainnya";
  };

  const filteredActivities =
    filter === "all" ? activities : activities.filter((a) => a.type === filter);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-accent border border-gray-700 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-secondary border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Riwayat Aktivitas
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Type Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-primary focus:outline-none transition-colors"
            >
              <option value="all">Semua Aktivitas</option>
              <option value="login">Login</option>
              <option value="update">Update</option>
              <option value="user">Pengguna</option>
              <option value="export">Export</option>
              <option value="verify">Verifikasi</option>
            </select>

            {/* Date From */}
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, from: e.target.value }))
              }
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-primary focus:outline-none transition-colors"
            />

            {/* Date To */}
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, to: e.target.value }))
              }
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-primary focus:outline-none transition-colors"
            />

            {/* Export Button */}
            <button className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors text-sm">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Activity List */}
        <div className="p-6 space-y-3">
          {filteredActivities.length > 0 ? (
            filteredActivities.map((activity, index) => (
              <div
                key={activity.id}
                className="border border-gray-700 rounded-lg p-4 hover:border-gray-600 hover:bg-gray-800/50 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(
                          activity.type,
                        )}`}
                      >
                        {getTypeLabel(activity.type)}
                      </span>
                      <h4 className="text-sm font-semibold text-white">
                        {activity.action}
                      </h4>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500">{activity.details}</p>
                  </div>
                  <time className="text-xs text-gray-400 ml-4 flex-shrink-0">
                    {activity.timestamp}
                  </time>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">
                Tidak ada aktivitas untuk filter yang dipilih
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredActivities.length > 0 && (
          <div className="border-t border-gray-700 bg-gray-800 px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Menampilkan {filteredActivities.length} dari {activities.length}{" "}
              aktivitas
            </p>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors text-sm">
                Sebelumnya
              </button>
              <button className="px-3 py-1 bg-primary text-white rounded-lg transition-colors text-sm">
                1
              </button>
              <button className="px-3 py-1 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors text-sm">
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogModal;
