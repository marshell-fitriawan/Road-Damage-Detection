import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  Map,
  Camera,
  History,
  Users,
  Route as RouteIcon,
  Menu,
  X,
  LogOut,
  Play,
} from "lucide-react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import TopNavbar from "./components/TopNavbar";
import UserProfileDropdown from "./components/UserProfileDropdown";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import PetugasDashboard from "./pages/PetugasDashboard";
import MapPage from "./pages/MapPage";
import HistoryPage from "./pages/HistoryPage";
import TrackingPage from "./pages/TrackingPage";
import TrackingHistoryPage from "./pages/TrackingHistoryPage";
import UserManagementPage from "./pages/UserManagementPage";
import "./index.css";

const Navigation = ({ mobileMenuOpen, setMobileMenuOpen }) => {
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  if (!user) return null;

  // Navigation items based on role
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

  const isActive = (path) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-accent border-r border-gray-700 h-screen sticky top-0">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold text-primary">Road Damage</h1>
          <p className="text-sm text-gray-400 mt-1">Detection System</p>
        </div>

        {/* User Info - Dropdown Profile */}
        <div className="px-4 py-2 border-b border-gray-700">
          <UserProfileDropdown />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? "bg-primary text-white"
                    : "text-gray-300 hover:bg-secondary"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <div className="bg-secondary rounded-lg p-3">
            <p className="text-xs text-gray-500">Dinas PU Kubu Raya</p>
            <p className="text-xs text-gray-400 mt-1">
              YOLOv8 + Laravel + React
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 bg-primary p-3 rounded-lg shadow-lg"
      >
        {mobileMenuOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-secondary">
          <div className="p-6 border-b border-gray-700">
            <h1 className="text-xl font-bold text-primary">
              Road Damage Detection
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {user.name} -{" "}
              {user.role === "admin" ? "Administrator" : "Petugas"}
            </p>
          </div>
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? "bg-primary text-white"
                      : "text-gray-300 hover:bg-accent"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-600/20 transition-colors w-full mt-4"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </nav>
        </div>
      )}
    </>
  );
};

const AppContent = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-secondary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-400 mt-4">Memuat sistem...</p>
        </div>
      </div>
    );
  }

  // Login page - no topnavbar
  if (location.pathname === "/login") {
    return <LoginPage />;
  }

  // Check if this is an admin or petugas route
  const isAdminRoute = location.pathname.startsWith("/admin/");
  const isPetugasRoute = location.pathname.startsWith("/petugas/");

  return (
    <>
      {/* TopNavbar for both admin and petugas */}
      {(isAdminRoute || isPetugasRoute) && <TopNavbar />}

      {/* Main content */}
      <main
        className="w-full overflow-auto"
        style={{ height: "calc(100vh - 70px)" }}
      >
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          <Routes>
            {/* Root redirect */}
            <Route
              path="/"
              element={
                user ? (
                  user.role === "admin" ? (
                    <Navigate to="/admin/dashboard" replace />
                  ) : (
                    <Navigate to="/petugas/dashboard" replace />
                  )
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* Petugas Routes */}
            <Route
              path="/petugas/dashboard"
              element={
                <ProtectedRoute roles={["petugas"]}>
                  <PetugasDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/petugas/tracking"
              element={
                <ProtectedRoute roles={["petugas"]}>
                  <TrackingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/petugas/peta"
              element={
                <ProtectedRoute roles={["petugas"]}>
                  <MapPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/petugas/riwayat"
              element={
                <ProtectedRoute roles={["petugas"]}>
                  <TrackingHistoryPage showAll={false} />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/peta"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <MapPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/kerusakan"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/tracking"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <TrackingHistoryPage showAll={true} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pengguna"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </main>
    </>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
