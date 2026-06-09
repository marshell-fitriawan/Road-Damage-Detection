import React, { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  LogOut,
  User,
  Settings,
  HelpCircle,
  ChevronDown,
  Menu,
  X,
  LayoutDashboard,
  Map,
  Camera,
  History,
  Users,
  Route as RouteIcon,
  Play,
  MapPin,
  Sun,
  Moon,
} from "lucide-react";
import ProfileModal from "./ProfileModal";
import SettingsModal from "./SettingsModal";
import HelpModal from "./HelpModal";

const TopNavbar = () => {
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openModal, setOpenModal] = useState(null);
  const dropdownRef = useRef(null);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Kunci scroll body saat drawer terbuka
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Tutup drawer saat route berubah
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setIsOpen(false);
    setDrawerOpen(false);
    await logout();
  };

  // Nav items berdasarkan role
  const adminNavItems = [
    { path: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/admin/peta", icon: Map, label: "Peta Monitoring" },
    { path: "/admin/kerusakan", icon: Camera, label: "Data Kerusakan" },
    { path: "/admin/tracking", icon: RouteIcon, label: "Riwayat Tracking" },
    { path: "/admin/pengguna", icon: Users, label: "Kelola Pengguna" },
  ];

  const petugasNavItems = [
    { path: "/petugas/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/petugas/tracking", icon: Play, label: "Mulai Tracking" },
    { path: "/petugas/peta", icon: Map, label: "Peta Kerusakan" },
    { path: "/petugas/riwayat", icon: History, label: "Riwayat Tracking" },
  ];

  const navItems = isAdmin() ? adminNavItems : petugasNavItems;

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  // Menu profil dropdown
  const menuItems = [
    {
      label: "Profil Saya",
      icon: User,
      action: () => { setIsOpen(false); setOpenModal("profile"); },
    },
    {
      label: "Pengaturan",
      icon: Settings,
      action: () => { setIsOpen(false); setOpenModal("settings"); },
    },
    {
      label: "Bantuan",
      icon: HelpCircle,
      action: () => { setIsOpen(false); setOpenModal("help"); },
    },
  ];

  return (
    <>
      {/* ============================================================
          NAVBAR UTAMA
          ============================================================ */}
      <nav className="bg-gradient-to-r from-gray-900 via-gray-800 to-blue-900 border-b border-gray-700 px-4 lg:px-6 py-3 lg:py-4 relative z-[600]">
        <div className="flex items-center justify-between">

          {/* KIRI: Hamburger (mobile) + Logo + Nav links (desktop) */}
          <div className="flex items-center gap-3 lg:gap-8">
            {/* Hamburger — hanya mobile */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-gray-700/60 hover:bg-gray-600/80 transition-colors text-white"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 lg:w-8 lg:h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm lg:text-base font-bold text-white leading-none">Road Damage</p>
                <p className="text-[10px] lg:text-xs text-blue-300 leading-none mt-0.5">Detection System</p>
              </div>
            </div>

            {/* Nav links — hanya desktop */}
            <div className="hidden lg:flex items-center gap-1 text-sm font-medium">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                      isActive(item.path)
                        ? "bg-blue-600/30 text-blue-300 border border-blue-500/40"
                        : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* KANAN: Theme Toggle + User Profile Dropdown */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200"
              style={{
                background: isDark ? 'rgba(251,191,36,0.1)' : 'rgba(99,102,241,0.1)',
                color: isDark ? '#fbbf24' : '#6366f1',
                border: `1px solid ${isDark ? 'rgba(251,191,36,0.2)' : 'rgba(99,102,241,0.2)'}`,
              }}
              title={isDark ? 'Switch ke Light Mode' : 'Switch ke Dark Mode'}
            >
              {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 px-2 lg:px-3 py-2 rounded-lg hover:bg-gray-700/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm bg-blue-600 flex-shrink-0">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-white leading-tight">
                  {user?.name || "Admin"}
                </p>
                <p className="text-xs text-gray-400 leading-tight">
                  {user?.role === "admin" ? "Administrator" : "Petugas"}
                </p>
              </div>
              <ChevronDown
                size={15}
                className={`hidden sm:block text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Dropdown */}
            {isOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-[700]">
                <div className="px-4 py-3 bg-gray-900 border-b border-gray-700">
                  <p className="text-sm font-semibold text-white">{user?.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
                  <span className="inline-block mt-1 text-xs bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded px-2 py-0.5 capitalize">
                    {user?.role === "admin" ? "Administrator" : "Petugas"}
                  </span>
                </div>
                <nav className="py-1">
                  {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={index}
                        onClick={item.action}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-blue-600/20 hover:text-blue-300 transition-colors"
                      >
                        <Icon size={15} className="flex-shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
                <div className="h-px bg-gray-700" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-600/20 hover:text-red-300 transition-colors"
                >
                  <LogOut size={15} className="flex-shrink-0" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
          </div>
        </div>
      </nav>

      {/* ============================================================
          MOBILE DRAWER — slide dari kiri
          ============================================================ */}
      {/* Overlay backdrop — z-[800] agar di atas Leaflet map (z 400-500) */}
      <div
        className={`lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ zIndex: 800 }}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel — z-[900] agar selalu di atas peta dan backdrop */}
      <div
        style={{ zIndex: 900 }}
        className={`lg:hidden fixed top-0 left-0 h-full w-72 max-w-[85vw] bg-gray-900 border-r border-gray-700 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 bg-gradient-to-r from-gray-900 to-blue-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Road Damage</p>
              <p className="text-[10px] text-blue-300">Detection System</p>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-8 h-8 rounded-lg bg-gray-700/60 hover:bg-gray-600/80 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            aria-label="Tutup menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User info di drawer */}
        <div className="px-5 py-4 border-b border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-base flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              <span className="inline-block mt-0.5 text-[10px] bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded px-1.5 py-0.5 capitalize">
                {user?.role === "admin" ? "Administrator" : "Petugas"}
              </span>
            </div>
          </div>
        </div>

        {/* Nav links di drawer */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
            Menu Navigasi
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-white" : "text-gray-400"}`} />
                <span className="font-medium text-sm">{item.label}</span>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                )}
              </Link>
            );
          })}

          <div className="h-px bg-gray-700 my-2" />
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
            Akun
          </p>
          {/* Theme toggle in drawer */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-gray-800 hover:text-white transition-all"
          >
            {isDark ? (
              <Sun className="w-5 h-5 flex-shrink-0 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 flex-shrink-0 text-indigo-500" />
            )}
            <span className="font-medium text-sm">{isDark ? 'Mode Terang' : 'Mode Gelap'}</span>
          </button>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={item.action}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-gray-800 hover:text-white transition-all"
              >
                <Icon className="w-5 h-5 flex-shrink-0 text-gray-400" />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout di bagian bawah drawer */}
        <div className="px-3 py-3 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-600/20 hover:text-red-300 transition-all"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm">Logout</span>
          </button>
          <p className="text-[10px] text-center text-gray-600 mt-2">
            Dinas PU Kabupaten Kubu Raya
          </p>
        </div>
      </div>

      {/* ============================================================
          MODALS
          ============================================================ */}
      <ProfileModal isOpen={openModal === "profile"} onClose={() => setOpenModal(null)} />
      <SettingsModal isOpen={openModal === "settings"} onClose={() => setOpenModal(null)} />
      <HelpModal isOpen={openModal === "help"} onClose={() => setOpenModal(null)} />
    </>
  );
};

export default TopNavbar;
