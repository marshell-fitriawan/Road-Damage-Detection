import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, User, Settings, HelpCircle, ChevronDown } from "lucide-react";
import ProfileModal from "./ProfileModal";
import SettingsModal from "./SettingsModal";
import HelpModal from "./HelpModal";

const TopNavbar = () => {
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [openModal, setOpenModal] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown ketika klik di luar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
  };

  // Navigation items berdasarkan role
  const adminNavItems = [
    { path: "/admin/dashboard", label: "Dashboard" },
    { path: "/admin/peta", label: "Peta Monitoring" },
    { path: "/admin/kerusakan", label: "Data Kerusakan" },
    { path: "/admin/tracking", label: "Riwayat Tracking" },
    { path: "/admin/pengguna", label: "Kelola Pengguna" },
  ];

  const petugasNavItems = [
    { path: "/petugas/dashboard", label: "Dashboard" },
    { path: "/petugas/tracking", label: "Mulai Tracking" },
    { path: "/petugas/peta", label: "Peta Kerusakan" },
    { path: "/petugas/riwayat", label: "Riwayat Tracking" },
  ];

  const navItems = isAdmin() ? adminNavItems : petugasNavItems;

  // Menu items
  const menuItems = [
    {
      label: "Profil Saya",
      icon: User,
      action: () => {
        setIsOpen(false);
        setOpenModal("profile");
      },
    },
    {
      label: "Pengaturan",
      icon: Settings,
      action: () => {
        setIsOpen(false);
        setOpenModal("settings");
      },
    },
    {
      label: "Bantuan",
      icon: HelpCircle,
      action: () => {
        setIsOpen(false);
        setOpenModal("help");
      },
    },
  ];

  return (
    <>
      <nav className="bg-gradient-to-r from-gray-900 via-gray-800 to-blue-900 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="text-2xl font-bold text-white">LOGO</div>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium">
              {navItems.map((item) => (
                <a
                  key={item.path}
                  href={item.path}
                  className={`transition ${
                    location.pathname === item.path
                      ? "text-blue-400 border-b-2 border-blue-400 pb-1"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm bg-blue-600">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-white">
                  {user?.name || "Admin"}
                </p>
                <p className="text-xs text-gray-400">
                  {user?.role === "admin" ? "Administrator" : "Petugas"}
                </p>
              </div>
              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-accent border border-gray-700 rounded-lg shadow-lg overflow-hidden z-50">
                {/* User Info Header */}
                <div className="px-4 py-3 bg-secondary border-b border-gray-700">
                  <p className="text-sm font-semibold text-white">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Email: {user?.email}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Role:{" "}
                    <span className="text-blue-400 capitalize font-medium">
                      {user?.role === "admin" ? "Administrator" : "Petugas"}
                    </span>
                  </p>
                </div>

                {/* Menu Items */}
                <nav className="py-2">
                  {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={index}
                        onClick={item.action}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-blue-600/20 hover:text-blue-400 transition-colors"
                      >
                        <Icon size={16} className="flex-shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>

                {/* Divider */}
                <div className="h-px bg-gray-700"></div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-600/20 hover:text-red-300 transition-colors"
                >
                  <LogOut size={16} className="flex-shrink-0" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Modals */}
      <ProfileModal
        isOpen={openModal === "profile"}
        onClose={() => setOpenModal(null)}
      />
      <SettingsModal
        isOpen={openModal === "settings"}
        onClose={() => setOpenModal(null)}
      />
      <HelpModal
        isOpen={openModal === "help"}
        onClose={() => setOpenModal(null)}
      />
    </>
  );
};

export default TopNavbar;
