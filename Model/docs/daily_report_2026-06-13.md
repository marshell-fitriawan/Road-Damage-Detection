# Daily Report — 13 Juni 2026
## Progress Pengembangan Sistem Deteksi Kerusakan Jalan

> **Penulis:** Marshell Devilito Fitriawan (3202316070)
> **Institusi:** Politeknik Negeri Pontianak — D3 Teknik Informatika
> **Pembimbing:** Safri Adam, S.Kom., M.Kom

---

## 📋 Ringkasan Hari Ini

Hari ini kita melakukan **restrukturisasi besar** dan **perbaikan kualitas** pada sistem deteksi kerusakan jalan. Mulai dari penataan ulang folder project, konsolidasi dokumentasi, perbaikan false positive, hingga pembuatan sistem manajemen model dan testing tools.

---

## 1. 🔄 Restrukturisasi Project

### Sebelum:
```
Road-Damage-Detection/
├── backend/        (campur aduk)
├── frontend/
├── runs/
├── train/, valid/, test/
├── api.py, yolo26n.pt, yolov8n-seg.pt, data.yaml  (berserakan)
└── ...
```

### Sesudah:
```
Road-Damage-Detection/
├── Backend/                    ← Laravel (PHP)
├── Frontend/                   ← React (JavaScript)
├── Model/                      ← YOLO & Dataset (TERSTRUKTUR)
│   ├── api.py, testingv1.py
│   ├── config.yaml             ← [BARU] Konfigurasi terpusat
│   ├── model_registry.yaml     ← [BARU] Registry 10 model
│   ├── requirements.txt        ← [BARU] Dependensi Python
│   ├── models/                 ← [BARU] Folder model .pt
│   ├── test_model.py           ← [BARU] Testing tool CLI
│   ├── extract_frames.py       ← [BARU] Ekstrak frame video
│   ├── testing_ui.py           ← [BARU] UI Testing web (port 5005)
│   ├── train/, valid/, test/
│   ├── runs/, docs/
│   └── ...
├── start.bat, setup-laravel.bat
└── PANDUAN-MENJALANKAN-APLIKASI.txt
```

### File yang dipindahkan ke `Model/`:
`api.py`, `testingv1.py`, `runs/`, `train/`, `valid/`, `test/`, `data.yaml`, `yolo26n.pt`, `yolov8n-seg.pt`, `README.dataset.txt`, `README.roboflow.txt`

### Folder yang di-rename:
`backend/` → `Backend/`, `frontend/` → `Frontend/`

### File referensi path yang diperbarui:
`start.bat`, `setup-laravel.bat`, `.gitignore`, `PANDUAN-MENJALANKAN-APLIKASI.txt`, `Backend/README.md`

---

## 2. 📚 Konsolidasi Dokumentasi Model (8 file → 5 file)

| File Lama | Digabung ke |
|---|---|
| `AI_Engineer_Guide.md` | `technical_specification.md` + `development_guide.md` |
| `Knowledge.md` | `technical_specification.md` |
| `Project_Context.md` | `project_overview.md` |
| `context.md` | `project_overview.md` |
| `model_versioning_colab.md` | `development_guide.md` |
| `plan.md` | `development_guide.md` |
| `positif_negatif_rule.md` | `development_guide.md` |
| `requirements.md` | Diperbarui & dilengkapi |

### 5 File Dokumentasi Baru:

| File | Isi |
|---|---|
| `project_state.md` | ⬅️ **BACA PERTAMA** — status real, navigasi untuk AI agent |
| `project_overview.md` | Identitas proyek, tujuan, kelas, arsitektur |
| `technical_specification.md` | Detail model, dataset, training, API, stack |
| `development_guide.md` | 5 fase, DO & DON'T, experiment tracking, edge cases |
| `requirements.md` | Kebutuhan fungsional & non-fungsional |

---

## 3. 🔧 Perbaikan False Positive (Deteksi pada Keyboard, Wajah, Meja)

### Diagnosis

| Penyebab | Detail |
|---|---|
| **Confidence threshold 0.15 terlalu rendah** | Hampir semua pola "mirip retak" terdeteksi |
| **Tidak ada gambar negatif di dataset** | Model tidak pernah lihat jalan bagus |
| **Tidak ada post-processing filter** | Tidak ada validasi ukuran/kualitas |

### Solusi yang Diterapkan

| Perubahan | File | Sebelum | Sesudah |
|---|---|---|---|
| Confidence threshold | `api.py`, `testingv1.py` | `0.15` | **`0.40`** |
| Filter area minimum | `api.py`, `testingv1.py` | tidak ada | **1024 px² (32×32)** |
| Filter kualitas gambar | `api.py` | tidak ada | **Brightness ≥ 30 + Blur ≥ 50** |
| Semua threshold dari konfigurasi | `api.py`, `testingv1.py` | hardcoded | **dari `config.yaml`** |

---

## 4. 🗂️ Sistem Manajemen Model (10 Eksperimen)

### File Baru

| File | Fungsi |
|---|---|
| `config.yaml` | Konfigurasi terpusat — pilih model aktif & parameter deteksi |
| `model_registry.yaml` | Registry 10 eksperimen + kolom metrik |
| `models/` | Folder penyimpanan semua file .pt |

### API Endpoint Baru

| Endpoint | Method | Fungsi |
|---|---|---|
| `/models` | GET | Lihat semua model + status loaded/active |
| `/switch-model` | POST | Ganti model aktif **tanpa restart server** |

### Cara Ganti Model

```bash
curl -X POST http://localhost:5000/switch-model \
  -H "Content-Type: application/json" \
  -d '{"model": "exp02_tambah_negatif"}'
```

---

## 5. 📊 Evaluasi Exp01 — Test Set (129 Gambar, 199 Instance)

### Metrik Final (Test Set)

| Metrik | Nilai | Target Min | Status |
|---|---|---|---|
| **Box mAP50** | **0.7602** | ≥ 0.60 | 🟢 LULUS |
| **Mask mAP50** | **0.7274** | ≥ 0.60 | 🟢 LULUS |
| **Precision** | **0.7425** | ≥ 0.70 | 🟢 LULUS |
| **Recall** | **0.7602** | ≥ 0.70 | 🟢 LULUS |
| **F1-Score** | **0.7512** | ≥ 0.70 | 🟢 LULUS |

### Performa Per Kelas (Box AP50)

| Kelas | AP50 | Status |
|---|---|---|
| Lubang (pothole) | **0.8895** | 🟢 Sangat baik |
| Retak Memanjang | **0.8011** | 🟢 Baik |
| Retak Melintang | **0.7797** | 🟢 Baik |
| **Retak Buaya** | **0.5703** | 🟡 Perlu perbaikan |

---

## 6. 🛠️ Tools Baru

### `test_model.py` — Testing Tool
Menguji model pada file gambar atau video **tanpa perlu menjalankan API server**.

```bash
# Test gambar
python test_model.py gambar.jpg --save

# Test video (frame by frame, simpan output + CSV log)
python test_model.py video.mp4 --save

# Cek semua model yang tersedia
python test_model.py --info
```

Fitur:
- Deteksi gambar tunggal with detailed output
- Deteksi video frame per frame dengan progress bar
- Simpan annotated video + CSV log deteksi
- Bisa ganti model & confidence threshold via CLI
- Bisa test via API server yang sedang berjalan

### `extract_frames.py` — Frame Extraction Tool
Mengubah video menjadi kumpulan gambar unik untuk ditambahkan ke dataset.

```bash
# Ekstrak dari video (otomatis cegah duplikat)
python extract_frames.py video_jalan.mp4

# Untuk dataset negatif (jalan bagus)
python extract_frames.py video_jalan_bagus.mp4 --prefix negatif_ --output dataset_negatif

# Ekstrak dari semua video dalam folder
python extract_frames.py folder_video/

# Panduan interval & threshold
python extract_frames.py --info
```

Fitur:
- Deduplikasi berbasis histogram HSV
- Interval frame yang bisa diatur
- Resize output
- Prefix nama file

### `testing_ui.py` — UI Testing Web Terpadu
Antarmuka web untuk testing model, ekstraksi frame, dan test API dalam satu halaman.

```bash
python testing_ui.py
# Buka: http://localhost:5005
```

**4 Tab:**
| Tab | Fungsi |
|---|---|
| 🧪 **Test Model** | Upload gambar/video → deteksi & anotasi langsung |
| 🎞️ **Extract Frames** | Upload video → ekstrak frame unik → download ZIP |
| 🔌 **API Test** | Test endpoint `/detect`, `/health`, `/models` dari API server |
| ℹ️ **Info** | Lihat model aktif & status registry |

### CORS Fix
Menambahkan `flask-cors` ke `api.py` agar browser mengizinkan request dari Testing UI (port 5005) ke API server (port 5000).

```bash
pip install flask-cors
```

```python
from flask_cors import CORS
CORS(app)
```

---

## 7. 📁 Ringkasan Semua File (Kondisi Final)

```
Model/
├── api.py                        ← Flask API (endpoint: /detect, /stream, /health, /models, /switch-model)
├── testingv1.py                  ← Testing + streaming (fitur lengkap)
├── test_model.py                 ← [BARU] Testing gambar/video tanpa server
├── extract_frames.py             ← [BARU] Ekstrak frame video ke dataset
├── testing_ui.py                 ← [BARU] UI Testing web (port 5005)
├── config.yaml                   ← [BARU] Konfigurasi & pilih model aktif
├── model_registry.yaml           ← [BARU] Registry 10 eksperimen
├── requirements.txt              ← [BARU] Dependensi Python
├── data.yaml                     ← Konfigurasi dataset
├── yolo26n.pt, yolov8n-seg.pt   ← Pre-trained models
│
├── models/
│   └── exp01_baseline/weights/
│       ├── best.pt               ← Model hasil training (best validation mAP)
│       └── last.pt               ← Model epoch terakhir
│
├── train/ (2.709 gambar), valid/ (226), test/ (129)
│   ├── images/
│   └── labels/
│
└── docs/
    ├── project_state.md          ← Status & navigasi
    ├── project_overview.md       ← Identitas & tujuan
    ├── technical_specification.md ← Detail teknis
    ├── development_guide.md      ← Panduan pengembangan
    ├── requirements.md           ← Kebutuhan formal
    ├── deployment_guide.md       ← Panduan deploy dari Colab
    └── daily_report_2026-06-13.md ← [BARU] Daily report hari ini
```

---

## 8. 🎯 Rencana Selanjutnya

### Jangka Pendek (Prioritas Tinggi)

| No | Pekerjaan | Detail |
|---|---|---|
| **1** | 📸 **Ambil video jalan untuk dataset negatif** | Rekam jalan bagus di Kubu Raya (min 5 lokasi, berbagai kondisi: siang, sore, malam, basah) |
| **2** | 🎞️ **Ekstrak frame dengan `extract_frames.py`** | `python extract_frames.py video_jalan_bagus.mp4 --prefix negatif_ --output dataset_negatif` |
| **3** | ☁️ **Upload dataset + gambar negatif ke Roboflow** | Tambahkan 200-300 gambar negatif + anotasi jika perlu |
| **4** | ⚡ **Install flask-cors** | `pip install flask-cors` (dibutuhkan Testing UI) |
| **5** | 🧠 **Training Exp02 di Google Colab** | `yolov8n-seg.pt` + dataset lengkap dengan negatif |

### Jangka Menengah (9 Eksperimen Colab)

| Exp | Model | Perubahan |
|---|---|---|
| 02 | `yolov8n-seg` | + gambar negatif |
| 03 | `yolov8s-seg` | Model lebih besar (11,2M params) |
| 04 | `yolov8n-seg` | LR 0.0005 |
| 05 | `yolov8n-seg` | Epoch 150 |
| 06 | `yolov8n-seg` | Augmentasi brightness tinggi |
| 07 | `yolov8n-seg` | Augmentasi blur ringan |
| 08 | `yolov8n-seg` | Seed 123 (uji stabilitas) |
| 09 | `yolov8s-seg` | Small + LR kecil + epoch panjang |
| 10 | `yolov8s-seg` | Final — kombinasi terbaik |

### Setiap Selesai Training, Lakukan:

```bash
# 1. Download best.pt dari Colab
# 2. Simpan:
cp best.pt Model/models/exp02_tambah_negatif/weights/best.pt

# 3. Catat metrik di model_registry.yaml
# 4. Ganti model aktif:
curl -X POST http://localhost:5000/switch-model \
  -H "Content-Type: application/json" \
  -d '{"model": "exp02_tambah_negatif"}'

# 5. Test:
python test_model.py gambar_test.jpg --save
```

### Setelah Semua Eksperimen Selesai
- Pilih model dengan **Recall tertinggi + mAP50 tertinggi**
- Evaluasi formal 4 skenario (test set, video, siang/malam, 10/20 km/jam)
- Integrasi dengan Backend Laravel & Frontend React
- Penulisan laporan Tugas Akhir (BAB I–V)
- Sidang Tugas Akhir (Juli–Agustus 2026)
