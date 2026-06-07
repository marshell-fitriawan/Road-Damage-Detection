import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
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
import "./index.css";

// Halaman yang TIDAK pakai wrapper max-w / padding
const MAP_ROUTES = ["/admin/peta", "/petugas/peta"];

const AppContent = () => {
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

  if (location.pathname === "/login") {
    return <LoginPage />;
  }

  const isAdminRoute = location.pathname.startsWith("/admin/");
  const isPetugasRoute = location.pathname.startsWith("/petugas/");

  // Cek apakah halaman saat ini adalah halaman peta
  const isMapRoute = MAP_ROUTES.some((r) => location.pathname === r);

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
  );

  return (
    <>
      {/* TopNavbar — tampil di semua halaman admin/petugas */}
      {(isAdminRoute || isPetugasRoute) && <TopNavbar />}

      {/* 
        Halaman peta: TANPA wrapper max-w / padding — langsung isi sisa tinggi layar.
        Halaman lain: pakai wrapper normal dengan max-w dan padding.
        Navbar height: ~57px mobile, ~64px desktop.
      */}
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
      ) : (
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
