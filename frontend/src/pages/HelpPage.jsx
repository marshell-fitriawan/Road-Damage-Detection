import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import {
  ArrowLeft,
  HelpCircle,
  MessageCircle,
  Phone,
  ChevronDown,
  ChevronRight,
  MapPin,
  Camera,
  Play,
  CheckCircle,
  Navigation,
  BookOpen,
  AlertTriangle,
  Map,
} from "lucide-react";

// ── Data panduan ─────────────────────────────────────────────
const PANDUAN = [
  {
    id: "mulai-tracking",
    icon: Play,
    color: "#22c55e",
    title: "Memulai Sesi Tracking",
    steps: [
      "Buka menu Mulai Tracking dari navigasi bawah.",
      "Pastikan GPS aktif dan sinyal internet tersedia.",
      "Tekan tombol Mulai — sistem akan mulai merekam rute perjalanan Anda.",
      "Berkendara seperti biasa di ruas jalan yang akan disurvei.",
    ],
  },
  {
    id: "lapor-kerusakan",
    icon: Camera,
    color: "#3b82f6",
    title: "Melaporkan Kerusakan Jalan",
    steps: [
      "Saat menemukan kerusakan, tekan tombol Laporkan Kerusakan.",
      "Pilih jenis kerusakan: Lubang, Retak Buaya, Retak Memanjang, atau Retak Melintang.",
      "Pilih tingkat keparahan: Rendah, Sedang, atau Tinggi.",
      "Ambil foto kerusakan — pastikan jelas dan terang.",
      "Tekan Simpan. Lokasi GPS akan otomatis tercatat.",
    ],
  },
  {
    id: "selesai-tracking",
    icon: CheckCircle,
    color: "#8b5cf6",
    title: "Mengakhiri Sesi Tracking",
    steps: [
      "Tekan tombol Selesai Tracking saat survei jalan sudah selesai.",
      "Konfirmasi untuk menyimpan sesi.",
      "Sistem akan menyimpan seluruh rute dan data kerusakan secara otomatis.",
      "Data bisa dilihat kembali di menu Riwayat Tracking.",
    ],
  },
  {
    id: "lihat-peta",
    icon: Map,
    color: "#f59e0b",
    title: "Melihat Peta Kerusakan",
    steps: [
      "Buka menu Peta Kerusakan untuk melihat sebaran kerusakan.",
      "Gunakan filter untuk menyaring berdasarkan jenis atau tingkat keparahan.",
      "Titik berwarna menunjukkan jenis kerusakan yang berbeda.",
      "Tekan titik di peta untuk melihat detail foto dan informasi kerusakan.",
    ],
  },
  {
    id: "tips-lapangan",
    icon: AlertTriangle,
    color: "#ef4444",
    title: "Tips Penggunaan di Lapangan",
    steps: [
      "Aktifkan mode Hemat Data jika sinyal lemah agar tracking tetap berjalan.",
      "Isi daya HP sebelum survei panjang — GPS dan kamera mengonsumsi baterai besar.",
      "Foto kerusakan di siang hari atau dengan cahaya cukup agar hasil lebih akurat.",
      "Jangan tutup aplikasi saat tracking aktif — gunakan tombol Home bila perlu.",
    ],
  },
];

// ── Kontak admin ─────────────────────────────────────────────
// Ganti nomor dan nama sesuai admin sistem
const ADMIN_CONTACTS = [
  {
    nama: "Admin Sistem",
    jabatan: "Administrator RDDS",
    wa: "6283143298622",
    tersedia: "Senin – Jumat, 08.00 – 16.00",
  },
];

const HelpPage = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [expandedId, setExpandedId] = useState(null);

  const toggle = (id) => setExpandedId((prev) => (prev === id ? null : id));

  // ── Styling helpers ──────────────────────────────────────────
  const bg = isDark ? "bg-gray-950" : "bg-slate-50";
  const cardBg = isDark
    ? "bg-gray-900 border-gray-700/60"
    : "bg-white border-gray-200";
  const labelColor = isDark ? "text-gray-400" : "text-gray-500";
  const textColor = isDark ? "text-white" : "text-gray-900";
  const subText = isDark ? "text-gray-500" : "text-gray-400";
  const divider = isDark ? "border-gray-700/50" : "border-gray-100";

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* ── Header ── */}
      <div
        className={`sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3 ${
          isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
        } shadow-sm`}
      >
        <button
          onClick={() => navigate(-1)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            isDark
              ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
              : "bg-gray-100 hover:bg-gray-200 text-gray-600"
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className={`text-base font-bold leading-none ${textColor}`}>
            Bantuan
          </h1>
          <p className={`text-xs mt-0.5 ${labelColor}`}>
            Panduan & kontak dukungan
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* ── Banner intro ── */}
        <div
          className={`rounded-2xl p-4 flex items-center gap-4 ${
            isDark
              ? "bg-blue-600/10 border border-blue-500/20"
              : "bg-blue-50 border border-blue-100"
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/30">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className={`text-sm font-bold ${textColor}`}>
              Road Damage Detection System
            </p>
            <p className={`text-xs mt-0.5 ${labelColor}`}>
              Sistem monitoring kerusakan jalan — Dinas PU Kabupaten Kubu Raya
            </p>
          </div>
        </div>

        {/* ── Panduan Penggunaan ── */}
        <div className={`rounded-2xl border ${cardBg} overflow-hidden`}>
          <div
            className={`px-5 py-4 border-b flex items-center gap-3 ${
              isDark
                ? "border-gray-700/60 bg-gray-800/40"
                : "border-gray-100 bg-gray-50"
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${textColor}`}>
                Panduan Penggunaan
              </p>
              <p className={`text-xs ${labelColor}`}>
                Langkah-langkah menggunakan aplikasi
              </p>
            </div>
          </div>

          <div
            className="divide-y"
            style={{
              borderColor: isDark
                ? "rgba(75,85,99,0.3)"
                : "rgba(229,231,235,0.8)",
            }}
          >
            {PANDUAN.map((item) => {
              const Icon = item.icon;
              const isOpen = expandedId === item.id;
              return (
                <div key={item.id}>
                  <button
                    onClick={() => toggle(item.id)}
                    className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors ${
                      isOpen
                        ? isDark
                          ? "bg-gray-800/60"
                          : "bg-gray-50"
                        : isDark
                          ? "hover:bg-gray-800/40"
                          : "hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${item.color}18` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                    <span className={`flex-1 text-sm font-medium ${textColor}`}>
                      {item.title}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${labelColor} ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Steps accordion */}
                  {isOpen && (
                    <div
                      className={`px-5 pb-4 ${isDark ? "bg-gray-800/30" : "bg-gray-50/80"}`}
                    >
                      <ol className="space-y-2.5 mt-1">
                        {item.steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                              style={{
                                background: `${item.color}20`,
                                color: item.color,
                              }}
                            >
                              {i + 1}
                            </span>
                            <p
                              className={`text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}
                            >
                              {step}
                            </p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Kontak Admin ── */}
        <div className={`rounded-2xl border ${cardBg} overflow-hidden`}>
          <div
            className={`px-5 py-4 border-b flex items-center gap-3 ${
              isDark
                ? "border-gray-700/60 bg-gray-800/40"
                : "border-gray-100 bg-gray-50"
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-green-600/20 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${textColor}`}>
                Hubungi Admin
              </p>
              <p className={`text-xs ${labelColor}`}>
                Butuh bantuan? Hubungi via WhatsApp
              </p>
            </div>
          </div>

          <div className="px-5 py-5 space-y-4">
            {ADMIN_CONTACTS.map((admin, i) => (
              <div
                key={i}
                className={`rounded-xl p-4 border ${
                  isDark
                    ? "bg-gray-800/50 border-gray-700/50"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                {/* Info admin */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center font-bold text-white text-base flex-shrink-0">
                    {admin.nama.charAt(0)}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${textColor}`}>
                      {admin.nama}
                    </p>
                    <p className={`text-xs ${labelColor}`}>{admin.jabatan}</p>
                  </div>
                </div>

                {/* Jam tersedia */}
                <div
                  className={`flex items-center gap-2 mb-3 text-xs ${labelColor}`}
                >
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  {admin.tersedia}
                </div>

                {/* Nomor WA */}
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl mb-3 ${
                    isDark
                      ? "bg-gray-700/60"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  <Phone className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span
                    className={`text-sm font-mono font-semibold ${textColor}`}
                  >
                    +
                    {admin.wa
                      .replace(/^62/, "62 ")
                      .replace(/(\d{4})(\d{4})(\d+)/, "$1-$2-$3")}
                  </span>
                </div>

                {/* Tombol WA */}
                <a
                  href={`https://wa.me/${admin.wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 active:scale-[0.98] text-white text-sm font-bold transition-all shadow-md shadow-green-600/20"
                >
                  <MessageCircle className="w-4 h-4" />
                  Kirim Pesan WhatsApp
                </a>
              </div>
            ))}

            <p className={`text-xs text-center ${subText}`}>
              Di luar jam kerja? Kirim pesan tetap — admin akan membalas saat
              jam aktif.
            </p>
          </div>
        </div>

        {/* ── Versi ── */}
        <p className={`text-center text-xs ${subText} pb-2`}>
          Road Damage Detection System · v1.0.0
          <br />
          Dinas Pekerjaan Umum Kabupaten Kubu Raya
        </p>
      </div>
    </div>
  );
};

export default HelpPage;
