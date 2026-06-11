import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  MapPin,
  Eye,
  EyeOff,
  AlertCircle,
  Sun,
  Moon,
  X,
  Phone,
  MessageCircle,
} from "lucide-react";

// ── Popup Kontak Admin ──────────────────────────────────────────
const AdminContactPopup = ({ onClose, isDark }) => {
  // Ganti nomor WA admin di sini
  const ADMIN_WA = "6283143298622"; // format: 62 + nomor tanpa 0 di depan
  const ADMIN_NAMA = "Admin Sistem";

  const handleOpenWA = () => {
    window.open(`https://wa.me/${ADMIN_WA}`, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          zIndex: 200,
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Popup card */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 201,
          width: "100%",
          maxWidth: 340,
          padding: "0 16px",
          animation: "popupIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <div
          style={{
            borderRadius: 20,
            background: isDark ? "#1a2235" : "#ffffff",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
            boxShadow: isDark
              ? "0 24px 60px rgba(0,0,0,0.6)"
              : "0 24px 60px rgba(0,0,0,0.15)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "20px 20px 16px",
              borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #25D366, #128C7E)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <MessageCircle size={20} color="#fff" />
              </div>
              <div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: isDark ? "#fff" : "#1e293b",
                    margin: 0,
                  }}
                >
                  Hubungi Admin
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
                    margin: 0,
                    marginTop: 1,
                  }}
                >
                  Bantuan akses sistem
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                border: "none",
                background: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.06)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Konten */}
          <div style={{ padding: "18px 20px 20px" }}>
            <p
              style={{
                fontSize: 13,
                color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)",
                marginBottom: 16,
                lineHeight: 1.5,
                margin: 0,
                marginBottom: 16,
              }}
            >
              Jika Anda lupa password atau membutuhkan akses ke sistem, silakan
              hubungi admin melalui WhatsApp:
            </p>

            {/* Card info admin */}
            <div
              style={{
                borderRadius: 12,
                background: isDark
                  ? "rgba(37,211,102,0.08)"
                  : "rgba(37,211,102,0.06)",
                border: `1px solid ${isDark ? "rgba(37,211,102,0.25)" : "rgba(37,211,102,0.3)"}`,
                padding: "12px 14px",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #25D366, #128C7E)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Phone size={18} color="#fff" />
              </div>
              <div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: isDark ? "#fff" : "#1e293b",
                    margin: 0,
                  }}
                >
                  {ADMIN_NAMA}
                </p>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#25D366",
                    margin: 0,
                    marginTop: 2,
                  }}
                >
                  +
                  {ADMIN_WA.replace(/^62/, "62 ").replace(
                    /(\d{4})(\d{4})(\d+)/,
                    "$1-$2-$3",
                  )}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: isDark
                      ? "rgba(255,255,255,0.35)"
                      : "rgba(0,0,0,0.35)",
                    margin: 0,
                    marginTop: 1,
                  }}
                >
                  Dinas PU Kabupaten Kubu Raya
                </p>
              </div>
            </div>

            {/* Tombol buka WA */}
            <button
              onClick={handleOpenWA}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg, #25D366, #128C7E)",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 4px 16px rgba(37,211,102,0.35)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 6px 20px rgba(37,211,102,0.45)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 16px rgba(37,211,102,0.35)";
              }}
            >
              <MessageCircle size={18} />
              Buka WhatsApp
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// ── Login Page ──────────────────────────────────────────────────
const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdminContact, setShowAdminContact] = useState(false);
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/petugas/dashboard", { replace: true });
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.errors?.email?.[0] ||
        "Login gagal. Periksa email dan password Anda.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "row",
        background: isDark
          ? "linear-gradient(135deg, #0f0c29 0%, #1a1a2e 40%, #16213e 100%)"
          : "linear-gradient(135deg, #e0e7ff 0%, #f0f4f8 40%, #dbeafe 100%)",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Theme toggle — pojok kanan atas */}
      <button
        onClick={toggleTheme}
        aria-label="Toggle dark/light mode"
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 100,
          width: 44,
          height: 44,
          borderRadius: 12,
          border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`,
          background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.3s",
          color: isDark ? "#fbbf24" : "#6366f1",
        }}
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* ===== SISI KIRI — Background / Branding (DESKTOP ONLY) ===== */}
      <div
        className="hidden lg:flex"
        style={{
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "48px 40px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative gradient orbs */}
        <div
          style={{
            position: "absolute",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: isDark
              ? "radial-gradient(circle, rgba(233,69,96,0.15) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)",
            top: "10%",
            left: "20%",
            filter: "blur(60px)",
            animation: "float-orb 8s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: isDark
              ? "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
            bottom: "15%",
            right: "15%",
            filter: "blur(50px)",
            animation: "float-orb 10s ease-in-out infinite reverse",
          }}
        />

        {/* Logo + Brand */}
        <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: isDark
                ? "linear-gradient(135deg, #e94560, #8b5cf6)"
                : "linear-gradient(135deg, #2563eb, #7c3aed)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 28px",
              boxShadow: isDark
                ? "0 8px 32px rgba(233,69,96,0.3)"
                : "0 8px 32px rgba(37,99,235,0.25)",
            }}
          >
            <MapPin size={40} color="#fff" />
          </div>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: isDark ? "#ffffff" : "#1e293b",
              letterSpacing: "-0.5px",
              marginBottom: 8,
            }}
          >
            Road Damage Detection
          </h2>
          <p
            style={{
              fontSize: 15,
              color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
              maxWidth: 320,
              lineHeight: 1.6,
            }}
          >
            Sistem Monitoring & Tracking Kerusakan Jalan
            <br />
            Dinas Pekerjaan Umum Kabupaten Kubu Raya
          </p>
        </div>

        {/* Placeholder note for background */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 11,
            color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          Background Area
        </div>
      </div>

      {/* ===== SISI KANAN — Form Login ===== */}
      <div
        style={{
          width: "100%",
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 20px",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 400,
            padding: "36px 32px",
            borderRadius: 20,
            background: isDark
              ? "rgba(22,33,62,0.7)"
              : "rgba(255,255,255,0.85)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
            boxShadow: isDark
              ? "0 16px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)"
              : "0 16px 64px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)",
            animation: "fadeSlideUp 0.6s ease-out",
          }}
        >
          {/* Mobile logo (hidden on desktop) */}
          <div
            className="lg:hidden"
            style={{ textAlign: "center", marginBottom: 24 }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: isDark
                  ? "linear-gradient(135deg, #e94560, #8b5cf6)"
                  : "linear-gradient(135deg, #2563eb, #7c3aed)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
                boxShadow: isDark
                  ? "0 6px 24px rgba(233,69,96,0.3)"
                  : "0 6px 24px rgba(37,99,235,0.2)",
              }}
            >
              <MapPin size={28} color="#fff" />
            </div>
            <h3
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: isDark ? "#fff" : "#1e293b",
                marginBottom: 2,
              }}
            >
              Road Damage Detection
            </h3>
            <p
              style={{
                fontSize: 12,
                color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
              }}
            >
              Dinas PU Kabupaten Kubu Raya
            </p>
          </div>

          {/* Heading */}
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: isDark ? "#ffffff" : "#1e293b",
              marginBottom: 6,
              letterSpacing: "-0.3px",
            }}
          >
            Selamat Datang
          </h1>
          <p
            style={{
              fontSize: 14,
              color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)",
              marginBottom: 28,
            }}
          >
            Masuk menggunakan akun yang telah didaftarkan
          </p>

          {/* Error */}
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 14px",
                borderRadius: 12,
                background: isDark
                  ? "rgba(239,68,68,0.12)"
                  : "rgba(239,68,68,0.08)",
                border: `1px solid ${isDark ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.2)"}`,
                marginBottom: 20,
              }}
            >
              <AlertCircle
                size={18}
                color="#ef4444"
                style={{ flexShrink: 0 }}
              />
              <p style={{ fontSize: 13, color: "#ef4444", margin: 0 }}>
                {error}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 18 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                required
                autoFocus
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
                  background: isDark
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.02)",
                  color: isDark ? "#f3f4f6" : "#1e293b",
                  fontSize: 15,
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = isDark ? "#e94560" : "#2563eb";
                  e.target.style.boxShadow = isDark
                    ? "0 0 0 3px rgba(233,69,96,0.15)"
                    : "0 0 0 3px rgba(37,99,235,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.12)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: "100%",
                    padding: "12px 48px 12px 16px",
                    borderRadius: 12,
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
                    background: isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.02)",
                    color: isDark ? "#f3f4f6" : "#1e293b",
                    fontSize: 15,
                    outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = isDark ? "#e94560" : "#2563eb";
                    e.target.style.boxShadow = isDark
                      ? "0 0 0 3px rgba(233,69,96,0.15)"
                      : "0 0 0 3px rgba(37,99,235,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.12)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: isDark
                      ? "rgba(255,255,255,0.35)"
                      : "rgba(0,0,0,0.3)",
                    padding: 4,
                    display: "flex",
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: 12,
                border: "none",
                background: isDark
                  ? "linear-gradient(135deg, #e94560, #c73659)"
                  : "linear-gradient(135deg, #2563eb, #4f46e5)",
                color: "#ffffff",
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "all 0.25s",
                boxShadow: isDark
                  ? "0 4px 20px rgba(233,69,96,0.35)"
                  : "0 4px 20px rgba(37,99,235,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                letterSpacing: "0.3px",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = isDark
                    ? "0 8px 28px rgba(233,69,96,0.45)"
                    : "0 8px 28px rgba(37,99,235,0.35)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = isDark
                  ? "0 4px 20px rgba(233,69,96,0.35)"
                  : "0 4px 20px rgba(37,99,235,0.25)";
              }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  Memproses...
                </>
              ) : (
                "Masuk ke Sistem"
              )}
            </button>
          </form>

          {/* Footer */}
          <p
            style={{
              textAlign: "center",
              fontSize: 12,
              color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
              marginTop: 20,
              lineHeight: 1.6,
            }}
          >
            Lupa password?{" "}
            <span
              onClick={() => setShowAdminContact(true)}
              style={{
                color: isDark ? "#e94560" : "#2563eb",
                cursor: "pointer",
                fontWeight: 600,
                textDecoration: "underline",
                textUnderlineOffset: 2,
              }}
            >
              Hubungi admin sistem
            </span>
          </p>
        </div>
      </div>

      {/* Popup kontak admin */}
      {showAdminContact && (
        <AdminContactPopup
          onClose={() => setShowAdminContact(false)}
          isDark={isDark}
        />
      )}

      {/* Animations */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes float-orb {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%      { transform: translate(20px, -15px) scale(1.05); }
          66%      { transform: translate(-15px, 10px) scale(0.95); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes popupIn {
          from { opacity: 0; transform: translate(-50%, -45%) scale(0.92); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
