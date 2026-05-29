import React, { useState } from "react";
import { X, ChevronDown, Mail, MessageCircle, FileText } from "lucide-react";

const HelpModal = ({ isOpen, onClose }) => {
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqs = [
    {
      id: 1,
      question: "Bagaimana cara melakukan tracking kerusakan jalan?",
      answer:
        'Untuk memulai tracking, klik tombol "Mulai Tracking" di dashboard. Sistem akan mulai merekam koordinat GPS dan mengambil foto. Pastikan izin lokasi dan kamera sudah diaktifkan.',
    },
    {
      id: 2,
      question: "Berapa lama data penyimpanan?",
      answer:
        "Semua data tracking dan foto kerusakan disimpan selama 1 tahun. Setelah itu, data akan diarsipkan secara otomatis.",
    },
    {
      id: 3,
      question: "Apa itu deteksi otomatis kerusakan?",
      answer:
        "Sistem menggunakan AI (YOLOv8) untuk mendeteksi jenis kerusakan jalan secara otomatis. Namun, verifikasi manual oleh petugas tetap diperlukan untuk akurasi maksimal.",
    },
    {
      id: 4,
      question: "Bagaimana cara export laporan?",
      answer:
        'Navigasi ke menu Riwayat Tracking, pilih periode yang diinginkan, kemudian klik tombol "Export PDF" atau "Export Excel".',
    },
    {
      id: 5,
      question: "Apakah aplikasi bisa digunakan offline?",
      answer:
        "Ya, aplikasi memiliki mode offline terbatas. Data akan disinkronkan otomatis ketika koneksi internet tersedia kembali.",
    },
    {
      id: 6,
      question: "Siapa yang bisa mengakses data?",
      answer:
        "Hanya administrator dan petugas lapangan yang terdaftar yang dapat mengakses data. Setiap akses dicatat dalam log aktivitas.",
    },
  ];

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-accent border border-gray-700 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-secondary border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Bantuan & FAQ</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Contact Support */}
          <div className="bg-gradient-to-r from-blue-600/20 to-primary/20 border border-primary/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Butuh Bantuan Lebih Lanjut?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <a
                href="mailto:support@example.com"
                className="flex items-center gap-3 px-4 py-3 bg-primary/20 hover:bg-primary/30 rounded-lg border border-primary/50 transition-colors"
              >
                <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-medium text-white">
                    Email Support
                  </p>
                  <p className="text-xs text-gray-400">
                    support@dpu-kuburaya.go.id
                  </p>
                </div>
              </a>
              <a
                href="tel:+6281234567890"
                className="flex items-center gap-3 px-4 py-3 bg-primary/20 hover:bg-primary/30 rounded-lg border border-primary/50 transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-medium text-white">WhatsApp</p>
                  <p className="text-xs text-gray-400">+62 812-3456-7890</p>
                </div>
              </a>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Pertanyaan Umum (FAQ)
            </h3>

            <div className="space-y-2">
              {faqs.map((faq) => (
                <div key={faq.id}>
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-800/80 border border-gray-700 rounded-lg transition-colors text-left group"
                  >
                    <p className="font-medium text-gray-200 group-hover:text-white">
                      {faq.question}
                    </p>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                        expandedFaq === faq.id ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {expandedFaq === faq.id && (
                    <div className="px-4 py-3 bg-gray-800/50 border border-gray-700 border-t-0 rounded-b-lg">
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Documentation */}
          <div className="space-y-3 pt-4 border-t border-gray-700">
            <h3 className="text-lg font-semibold text-white">Dokumentasi</h3>
            <div className="space-y-2">
              <a
                href="#"
                className="flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-800/80 rounded-lg border border-gray-700 transition-colors"
              >
                <span className="text-gray-300 hover:text-white">
                  📖 Panduan Pengguna Lengkap
                </span>
                <ChevronDown className="w-5 h-5 text-gray-400 rotate-180" />
              </a>
              <a
                href="#"
                className="flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-800/80 rounded-lg border border-gray-700 transition-colors"
              >
                <span className="text-gray-300 hover:text-white">
                  📱 Tutorial Video
                </span>
                <ChevronDown className="w-5 h-5 text-gray-400 rotate-180" />
              </a>
              <a
                href="#"
                className="flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-800/80 rounded-lg border border-gray-700 transition-colors"
              >
                <span className="text-gray-300 hover:text-white">
                  🐛 Laporan Bug / Masalah
                </span>
                <ChevronDown className="w-5 h-5 text-gray-400 rotate-180" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
