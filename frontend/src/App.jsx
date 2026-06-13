import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import TopNavbar from "./components/TopNavbar";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import PetugasDashboard from "./pages/PetugasDashboard";
import MapPage from "./pages/MapPage";
import HistoryPage from "./pages/HistoryPage";
import TrackingPage from "./pages/TrackingPage";
import TrackingHistoryPage from "./pages/TrackingHistoryPage";
import UserManagementPage from "./pages/UserManagementPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import HelpPage from "./pages/HelpPage";
import "./index.css";

// Halaman yang TIDAK pakai wrapper max-w / padding
const MAP_ROUTES = ["/admin/peta", "/petugas/peta"];

const AppContent = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ backgroundColor: "var(--color-secondary)" }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4" style={{ color: "var(--color-text-muted)" }}>
            Memuat sistem...
          </p>
        </div>
      </div>
    );
  }

  if (location.pathname === "/login") {
    return <LoginPage />;
  }

  const isAdminRoute = location.pathname.startsWith("/admin/");
  const isPetugasRoute = location.pathname.startsWith("/petugas/");

  // Halaman peta: full screen tanpa wrapper
  const isMapRoute = MAP_ROUTES.some((r) => location.pathname === r);

  // Halaman profil/pengaturan/bantuan: punya header sendiri, tanpa wrapper max-w
  const isFullPageRoute = [
    "/admin/profil",
    "/admin/pengaturan",
    "/admin/bantuan",
    "/petugas/profil",
    "/petugas/pengaturan",
    "/petugas/bantuan",
  ].includes(location.pathname);

  const routes = (
    <Routes>
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

      {/* ── Petugas Routes ── */}
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
      <Route
        path="/petugas/profil"
        element={
          <ProtectedRoute roles={["petugas"]}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/petugas/pengaturan"
        element={
          <ProtectedRoute roles={["petugas"]}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/petugas/bantuan"
        element={
          <ProtectedRoute roles={["petugas"]}>
            <HelpPage />
          </ProtectedRoute>
        }
      />

      {/* ── Admin Routes ── */}
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
      <Route
        path="/admin/profil"
        element={
          <ProtectedRoute roles={["admin"]}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pengaturan"
        element={
          <ProtectedRoute roles={["admin"]}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/bantuan"
        element={
          <ProtectedRoute roles={["admin"]}>
            <HelpPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );

  return (
    <>
      {/* TopNavbar — tampil di semua halaman admin/petugas */}
      {(isAdminRoute || isPetugasRoute) && <TopNavbar />}

      {/* Peta: full screen */}
      {isMapRoute ? (
        <div
          className="mobile-content-height lg:desktop-content-height"
          style={{
            width: "100%",
            height: "calc(100vh - 57px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {routes}
        </div>
      ) : isFullPageRoute ? (
        /* Profil / Pengaturan / Bantuan: tanpa wrapper, page punya header sendiri */
        <div
          className="w-full overflow-auto"
          style={{ minHeight: "calc(100vh - 57px)" }}
        >
          {routes}
        </div>
      ) : (
        /* Halaman normal */
        <main
          className="w-full overflow-auto"
          style={{ minHeight: "calc(100vh - 57px)" }}
        >
          <div className="max-w-7xl mx-auto p-4 lg:p-8">{routes}</div>
        </main>
      )}
    </>
  );
};

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={<AppContent />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
