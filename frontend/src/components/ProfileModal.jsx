import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Mail,
  Shield,
  Clock,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const ProfileModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("info");
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleTogglePassword = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setMessage({ type: "", text: "" });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      if (!formData.currentPassword) {
        setMessage({
          type: "error",
          text: "Password saat ini tidak boleh kosong",
        });
        setLoading(false);
        return;
      }

      if (!formData.newPassword || formData.newPassword.length < 6) {
        setMessage({
          type: "error",
          text: "Password baru minimal 6 karakter",
        });
        setLoading(false);
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({
          type: "error",
          text: "Password baru tidak cocok",
        });
        setLoading(false);
        return;
      }

      // Simulasi API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      setMessage({
        type: "success",
        text: "Password berhasil diubah!",
      });

      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: "Gagal mengubah password",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-accent border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-secondary border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Profil Saya</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 bg-secondary">
          <button
            onClick={() => setActiveTab("info")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === "info"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            <Mail className="w-4 h-4" />
            Informasi Profil
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === "password"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            <Shield className="w-4 h-4" />
            Ubah Password
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Info Tab */}
          {activeTab === "info" && (
            <div className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4 pb-6 border-b border-gray-700">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-white text-2xl ${
                    user?.role === "admin" ? "bg-primary" : "bg-blue-600"
                  }`}
                >
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {user?.name}
                  </h3>
                  <p className="text-sm text-gray-400 capitalize">
                    {user?.role === "admin"
                      ? "Administrator"
                      : "Petugas Lapangan"}
                  </p>
                </div>
              </div>

              {/* Profile Info Cards */}
              <div className="grid grid-cols-1 gap-4">
                {/* Email */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Email
                    </p>
                  </div>
                  <p className="text-base font-medium text-white">
                    {user?.email}
                  </p>
                </div>

                {/* Role */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Role / Jabatan
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        user?.role === "admin"
                          ? "bg-primary/20 text-primary"
                          : "bg-blue-600/20 text-blue-400"
                      }`}
                    >
                      {user?.role === "admin"
                        ? "Administrator"
                        : "Petugas Lapangan"}
                    </span>
                  </div>
                </div>

                {/* Member Since */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Member Sejak
                    </p>
                  </div>
                  <p className="text-base font-medium text-white">
                    29 Mei 2024
                  </p>
                </div>
              </div>

              {/* Info Note */}
              <div className="bg-blue-600/20 border border-blue-600 rounded-lg p-4 text-sm text-blue-400">
                <p>
                  Untuk mengubah email atau informasi lainnya, hubungi
                  administrator sistem.
                </p>
              </div>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === "password" && (
            <form onSubmit={handleChangePassword} className="space-y-6">
              {/* Message */}
              {message.text && (
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
                    message.type === "success"
                      ? "bg-green-600/20 border-green-600 text-green-400"
                      : "bg-red-600/20 border-red-600 text-red-400"
                  }`}
                >
                  {message.type === "success" ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span className="text-sm">{message.text}</span>
                </div>
              )}

              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password Saat Ini
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    placeholder="Masukkan password saat ini"
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-primary focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => handleTogglePassword("current")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    {showPasswords.current ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    placeholder="Masukkan password baru (minimal 6 karakter)"
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-primary focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => handleTogglePassword("new")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    {showPasswords.new ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Ketik ulang password baru"
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-primary focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => handleTogglePassword("confirm")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password Strength Indicator */}
              {formData.newPassword && (
                <div className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg">
                  <p className="text-xs text-gray-400 mb-2">
                    Kekuatan password:
                  </p>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-2 flex-1 rounded-full ${
                          formData.newPassword.length >= i * 3
                            ? "bg-green-500"
                            : "bg-gray-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                {loading ? "Mengubah..." : "Ubah Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
