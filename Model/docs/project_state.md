# Project State — Current Status
## Bacaan Wajib Pertama untuk AI Agent

> 📌 **Baca file ini PALING PERTAMA** sebelum membaca file lain atau menyentuh kode apapun.
> File ini menjelaskan apa yang sudah jadi, apa yang belum, dan apa yang harus dikerjakan selanjutnya.

---

## 1. Ringkasan Status Saat Ini

| Aspek | Status | Keterangan |
|---|---|---|
| Dataset | ✅ **SELESAI** | 3.064 gambar (train 2.709 / val 226 / test 129), format YOLOv8 segmentation |
| Model Training | ✅ **SELESAI** | `best.pt` sudah ada di `runs/segment/train/weights/best.pt` |
| Flask API (`api.py`) | ✅ **SELESAI** | Endpoint `/detect`, `/stream`, `/health` sudah berfungsi |
| Testing (`testingv1.py`) | ✅ **SELESAI** | Versi dengan pengukuran luas & auto-save frame terbaik |
| Integrasi Backend Laravel | ❌ **PERLU** | API endpoint Laravel perlu dikonfigurasi/diaktifkan |
| Integrasi Frontend React | ❌ **PERLU** | Frontend React perlu dihubungkan |
| Dataset sekunder Kubu Raya | ⏳ **BELUM** | Target ~500 gambar, belum dikumpulkan |
| Evaluasi formal 4 skenario | ⏳ **BELUM** | Baru dilakukan informal |

---

## 2. Struktur Folder Real (Aktual)

```
Model/
├── api.py                    ← Flask API (sudah jadi)
├── testingv1.py              ← Testing + streaming (sudah jadi)
├── config.yaml               ← ⬅️ BARU: Konfigurasi & pilih model aktif
├── model_registry.yaml       ← ⬅️ BARU: Daftar 10 eksperimen model
├── models/                   ← ⬅️ BARU: Folder simpan semua .pt model
│   ├── exp01_baseline.pt
│   ├── exp02_tambah_negatif.pt  (akan diisi setelah training)
│   ├── ...
│   └── exp10_final.pt           (akan diisi setelah training)
├── data.yaml                 ← Konfigurasi dataset
├── yolo26n.pt                ← Pre-trained YOLO
├── yolov8n-seg.pt            ← Pre-trained YOLOv8-seg
│
├── runs/                     ← Hasil training (dari Colab)
│   └── segment/train/weights/
│       └── best.pt           ← Model hasil training
│
├── train/                    ← Dataset training (2.709 gambar)
│   ├── images/
│   └── labels/
├── valid/                    ← Dataset validasi (226 gambar)
│   ├── images/
│   └── labels/
├── test/                     ← Dataset test (129 gambar)
│   ├── images/
│   └── labels/
│
└── docs/                     ← Dokumentasi
    ├── project_overview.md
    ├── technical_specification.md
    ├── development_guide.md
    ├── requirements.md
    ├── project_state.md
    └── improvement_log.md     ← ⬅️ BARU: Catatan perubahan
```

---

## 3. File Kode yang Sudah Ada & Fungsinya

### `Model/api.py` — Flask API Server (SUDAH JADI)

| Endpoint | Method | Fungsi |
|---|---|---|
| `/` | GET | Dokumentasi HTML |
| `/health` | GET | Status server & model aktif |
| `/detect` | POST | Deteksi dari upload gambar |
| `/stream` | GET | MJPEG live stream |
| **`/models`** | **GET** | **⬅️ BARU: Daftar semua model + status** |
| **`/switch-model`** | **POST** | **⬅️ BARU: Ganti model tanpa restart** |

**Model path:** Dibaca dari `config.yaml` → `model.active_model` → `model_registry.yaml`
**Default saat ini:** `exp01_baseline`

### `Model/testingv1.py` — Testing & Streaming Enhanced (SUDAH JADI)

| Fitur | Status |
|---|---|
| Live streaming kamera | ✅ |
| Deteksi via upload | ✅ |
| **Pengukuran luas kerusakan (cm² & m²)** | ✅ |
| **Auto-save frame terbaik (FR6, 120 frame)** | ✅ |
| Kalibrasi piksel↔cm (0.30 cm/piksel) | ✅ |
| Ganti sumber kamera (webcam/IP cam) | ✅ |
| HTTPS support (pyOpenSSL opsional) | ✅ |

### `Model/runs/segment/train/weights/best.pt` — Model Terlatih (SUDAH ADA)

Model YOLOv8n-seg hasil training dengan dataset 3.064 gambar.

---

## 4. Yang BELUM Jadi / Perlu Dikerjakan

| Pekerjaan | Prioritas | Detail |
|---|---|---|
| **Integrasi Backend Laravel** | Tinggi | Backend di `../Backend/` perlu dikonfigurasi agar bisa menerima data dari Flask API |
| **Integrasi Frontend React** | Tinggi | Frontend di `../Frontend/` perlu dihubungkan ke endpoint Flask |
| **Dataset sekunder Kubu Raya** | Sedang | Ambil ~500 gambar lapangan, anotasi, tambahkan ke dataset, retrain model |
| **Evaluasi formal 4 skenario** | Sedang | Dokumentasi metrik: test set, video, siang/malam, 10 vs 20 km/jam |
| **Konfigurasi file config.yaml** | Rendah | Buat file konfigurasi terpusat (opsional, saat ini hardcoded di kode) |

---

## 5. Cara Menjalankan yang Sudah Jadi

```bash
# Dari folder root project Road-Damage-Detection/
python Model/api.py
# → API berjalan di http://localhost:5000
# → Cek model aktif: http://localhost:5000/models

# Atau versi testing dengan fitur lengkap:
python Model/testingv1.py
# → Server berjalan di http://localhost:5000 (HTTP/HTTPS)
```

### Cara Ganti Model (Tanpa Restart)

```bash
# Via API (tanpa restart server)
curl -X POST http://localhost:5000/switch-model \
  -H "Content-Type: application/json" \
  -d '{"model": "exp02_tambah_negatif"}'

# Atau edit config.yaml langsung:
#   model.active_model: "exp02_tambah_negatif"
# Lalu restart api.py

---

## 6. Kontrak API dengan Tim Lain

### Input ke Model (dari Backend/Frontend)
- `POST /detect` dengan file gambar → return JSON deteksi

### Output dari Model (ke Backend)
```json
{
  "success": true,
  "total_detections": 2,
  "detections": [
    {
      "class_id": 3,
      "class_name": "Lubang",
      "confidence": 0.87,
      "bbox": { "x1": 120, "y1": 80, "x2": 300, "y2": 210 }
    }
  ],
  "image_base64": "data:image/jpeg;base64,..."
}
```

> Backend Laravel menerima data ini dan menyimpannya ke database bersama koordinat GPS dari petugas.

---

## 7. Aturan untuk AI Agent

1. **Jangan tulis ulang `api.py` atau `testingv1.py`** — sudah jadi dan berfungsi
2. **Jangan pindah-pindah file** tanpa persetujuan — struktur sudah seperti di atas
3. **Jangan ubah path model** di `api.py` — sudah menggunakan path script-relative
4. **Jika ingin membantu**, fokus pada: integrasi, evaluasi formal, atau dataset sekunder
5. **Jika rajin**, baca `docs/requirements.md` untuk daftar kebutuhan lengkap
