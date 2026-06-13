import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, User, Settings, HelpCircle, ChevronDown } from "lucide-react";
import ProfileModal from "./ProfileModal";
import SettingsModal from "./SettingsModal";
import HelpModal from "./HelpModal";

const UserProfileDropdown = () => {
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

  // Menu items berdasarkan role
  const menuItems = [
    {
      label: "Profil Saya",
      icon: User,
      action: () => {
        setIsOpen(false);
        setOpenModal("profile");
      },
      show: true,
    },
    {
      label: "Pengaturan",
      icon: Settings,
      action: () => {
        setIsOpen(false);
        setOpenModal("settings");
      },
      show: true,
    },
    {
      label: "Bantuan",
      icon: HelpCircle,
      action: () => {
        setIsOpen(false);
        setOpenModal("help");
      },
      show: true,
    },
  ];

  const visibleMenuItems = menuItems.filter((item) => item.show);

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* User Profile Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/20 hover:bg-primary/30 transition-colors w-full text-left group"
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${
              isAdmin() ? "bg-primary" : "bg-blue-600"
            } flex-shrink-0`}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-400 capitalize">
              {user?.role === "admin" ? "Administrator" : "Petugas Lapangan"}
            </p>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-accent border border-gray-700 rounded-lg shadow-lg overflow-hidden z-50">
            {/* User Info Header */}
            <div className="px-4 py-3 bg-secondary border-b border-gray-700">
              <p className="text-sm font-semibold text-white">{user?.name}</p>
              <p className="text-xs text-gray-400 mt-1">Email: {user?.email}</p>
              <p className="text-xs text-gray-400 mt-1">
                Role:{" "}
                <span className="text-primary capitalize font-medium">
                  {user?.role === "admin"
                    ? "Administrator"
                    : "Petugas Lapangan"}
                </span>
              </p>
            </div>

            {/* Menu Items */}
            <nav className="py-2">
              {visibleMenuItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={index}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-primary/20 hover:text-primary transition-colors"
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
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
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>

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

export default UserProfileDropdown;
