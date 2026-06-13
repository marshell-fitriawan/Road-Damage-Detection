# Development Guide
## Rencana, Aturan, dan Panduan Pengembangan Model

---

## 1. Lima Fase Pengembangan

```
FASE 1          FASE 2          FASE 3          FASE 4          FASE 5
Dataset    →    Training   →    Evaluasi   →    Sistem     →    Pengujian
& Anotasi       Model           Model           Flask+Web       & Laporan
(Feb)           (Mar)           (Mar-Apr)       (Apr-Mei)       (Mei-Agt)
```

---

### FASE 1 — Dataset & Anotasi (Februari 2026)

**Pengumpulan Data**

| Sumber | Detail |
|---|---|
| **Roboflow publik** | Download dataset kerusakan jalan format segmentasi YOLOv8. Target minimum 300 gambar/kelas × 4 = 1.200 gambar |
| **Foto lapangan** | Ambil foto/video jalan rusak di Pontianak/Kubu Raya, minimal 5 lokasi. Kondisi: siang, sore, malam/lampu jalan, jalan basah, berbagai sudut kamera |

**Anotasi di Roboflow**
- Buat 4 kelas: `Retak-Buaya`, `Retak-Memanjang`, `Retak-Melintang`, `Lubang`
- Anotasi menggunakan **polygon/mask** (bukan bounding box)
- Setiap instance kerusakan dianotasi terpisah
- Review anotasi: hapus gambar blur, label salah, area tidak jelas
- Tambahkan gambar **negatif** (jalan bagus) minimal 10% dari total dataset

**Preprocessing & Augmentasi di Roboflow**
- Preprocessing: Resize 640×640 (stretch fit), Auto-orient ON
- Augmentasi: Flip horizontal, Rotasi ±15°, Brightness ±30%, Mosaic 4-image, Blur ringan
- Split: Train 70% / Valid 20% / Test 10%

**Export Dataset**
- Format: **YOLOv8 Segmentation**
- Verifikasi struktur: train/images, train/labels, valid/images, valid/labels, test/images, test/labels, data.yaml
- Cek `data.yaml`: pastikan `nc: 4` dan nama kelas benar

> ✅ **Checkpoint Fase 1:** Dataset siap, minimal 1.200 gambar teranotasi, sudah di-split dan di-export.

---

### FASE 2 — Training Model (Maret 2026)

**Setup Environment Google Colab**
- Aktifkan GPU (Runtime → Change runtime type → T4 GPU)
- Mount Google Drive
- Install: `ultralytics==8.4.21`, `roboflow`
- Verifikasi GPU: `torch.cuda.is_available()` harus True

**Load Dataset**
- Upload dataset ke Google Drive atau download via Roboflow API

**Training Baseline (Eksperimen 1)**
```python
from ultralytics import YOLO

model = YOLO("yolov8n-seg.pt")  # nano — cepat, untuk baseline

results = model.train(
    data="dataset/data.yaml",
    epochs=100,
    batch=8,
    imgsz=640,
    lr0=0.001,
    optimizer="AdamW",
    patience=30,
    save=True,
    save_period=10,
    project="runs/train",
    name="exp1_baseline",
    device=0
)
```

**Training Model Lebih Besar (Eksperimen 2)**
- Ulangi dengan `yolov8s-seg.pt` (small — lebih akurat)
- Bandingkan mAP50 exp1 vs exp2
- Pilih model terbaik untuk lanjut ke evaluasi

**Checklist Setelah Training**
- [ ] Loss curve training tidak diverge (menurun konsisten)
- [ ] Gap train loss dan val loss tidak terlalu besar (tidak overfitting)
- [ ] `best.pt` berhasil tersimpan
- [ ] `results.csv` tersimpan di direktori runs

> ✅ **Checkpoint Fase 2:** Model terlatih, `best.pt` tersimpan, loss curve wajar.

---

### FASE 3 — Evaluasi Model (Maret – April 2026)

**Validasi pada Validation Set**
```python
metrics = model.val(data="dataset/data.yaml", split="val")
print(f"mAP50: {metrics.seg.map50:.4f}")
print(f"mAP50-95: {metrics.seg.map:.4f}")
print(f"Precision: {metrics.seg.mp:.4f}")
print(f"Recall: {metrics.seg.mr:.4f}")
```

**Evaluasi pada Test Set (Final)**
```python
metrics_test = model.val(data="dataset/data.yaml", split="test")
```
- Catat semua metrik per kelas ke dalam tabel
- Screenshot confusion matrix dari `runs/val/*/confusion_matrix.png`

**Skenario Pengujian**
1. **Data gambar diam** — Test set 129 gambar, hitung TP, TN, FP, FN per kelas
2. **Data video** — 3–5 video rekaman jalan, hitung Precision, Recall, F1 per frame
3. **Siang vs malam** — Pisahkan test set, bandingkan metrik
4. **10 km/jam vs 20 km/jam** — Bandingkan confidence score rata-rata

**Dokumentasi Hasil**
- Tabel ringkasan semua metrik (val set + test set)
- Simpan confusion matrix, PR curve, F1 curve sebagai gambar
- Catat perbandingan exp1 (nano) vs exp2 (small)

> ✅ **Checkpoint Fase 3:** Semua skenario pengujian selesai, tabel metrik lengkap terdokumentasi.

---

### FASE 4 — Pengembangan Sistem (Flask + Web) (April – Mei 2026)

**Setup Project Lokal**
```bash
python -m venv venv
pip install ultralytics==8.4.21 flask==3.1.3 opencv-python==4.13.0.33 numpy==2.4.3
```
- Salin `best.pt` ke folder `models/`
- Buat file `config.yaml`

**Modul Inferensi Real-time**
- Buka stream kamera via OpenCV
- Loop frame: capture → resize 640×640 → normalisasi → inferensi
- Tampilkan overlay: segmentation mask + label + confidence score
- Implementasi frame selector logic (120 frame window)

**Modul Flask API**
- Load model YOLOv8 **sekali saat startup** (bukan per request)
- Endpoint: `GET /health`, `POST /detect`, `GET /stream`, `GET /history`

**Web Interface**
- Halaman utama: live stream `/stream`
- Info deteksi terbaru: kelas, confidence, timestamp
- Halaman riwayat: grid gambar
- Halaman upload: form upload gambar statis

**Integrasi & Testing Lokal**
- Test `/detect` via Postman
- Test live stream dari kamera smartphone (IP Webcam / DroidCam)
- Verifikasi frame terbaik tersimpan setelah 120 frame

> ✅ **Checkpoint Fase 4:** Sistem berjalan end-to-end, deteksi real-time aktif, API merespons dengan benar.

---

### FASE 5 — Pengujian Final & Penulisan Laporan (Mei – Agustus 2026)

**Pengujian Sistem Terintegrasi**
- Jalankan semua skenario pengujian secara formal
- Rekam hasil dalam tabel dokumentasi
- Uji stabilitas: deteksi 30 menit non-stop
- Uji pada perangkat berbeda

**Penulisan Laporan Tugas Akhir**
- BAB I: Pendahuluan
- BAB II: Dasar Teori
- BAB III: Metodologi & Perancangan Sistem
- BAB IV: Implementasi & Hasil (screenshot, tabel metrik, confusion matrix, contoh deteksi)
- BAB V: Kesimpulan & Saran

**Seminar & Sidang**
- Seminar Progress: Mei 2026
- Sidang Tugas Akhir: Juli – Agustus 2026

---

## 2. Experiment Tracking & Model Versioning

### Strategi 10x Training per Model

| Exp | Base Model | Epoch | LR | Batch | Tujuan |
|---|---|---|---|---|---|
| 01 | `yolov8n-seg.pt` | 100 | 0.001 | 8 | baseline cepat |
| 02 | `yolov8n-seg.pt` | 100 | 0.0005 | 8 | cek LR lebih kecil |
| 03 | `yolov8n-seg.pt` | 150 | 0.001 | 8 | cek epoch lebih panjang |
| 04 | `yolov8n-seg.pt` | 100 | 0.001 | 16 | cek batch lebih besar |
| 05 | `yolov8n-seg.pt` | 100 | 0.001 | 8 | mosaic rendah |
| 06 | `yolov8n-seg.pt` | 100 | 0.001 | 8 | brightness tinggi |
| 07 | `yolov8n-seg.pt` | 100 | 0.001 | 8 | blur ringan |
| 08 | `yolov8n-seg.pt` | 100 | 0.001 | 8 | close mosaic akhir |
| 09 | `yolov8n-seg.pt` | 200 | 0.0005 | 8 | training lebih halus |
| 10 | `yolov8n-seg.pt` | 100 | 0.001 | 8 | seed berbeda (uji stabilitas) |

Ulangi pola yang sama untuk `yolov8s-seg.pt`. Jika GPU Colab cukup, lanjut `yolov8m-seg.pt`.

### Penamaan Versi Model

Format: `<base_model>_<tanggal>_exp<nomor>_<catatan>`

Contoh:
```
yolov8n_seg_20260609_exp01_baseline
yolov8n_seg_20260609_exp02_aug_brightness
yolov8s_seg_20260609_exp01_baseline
```

### Rekomendasi Struktur Penyimpanan Google Drive

```
/MyDrive/road_damage_detection/
├── dataset/
├── experiments/
│   ├── yolov8n_seg/
│   │   ├── exp01/
│   │   ├── exp02/
│   │   └── ...exp10/
│   ├── yolov8s_seg/
│   │   ├── exp01/
│   │   └── ...
│   └── yolov8m_seg/
│       └── ...
├── selected_models/
│   ├── best_overall.pt
│   ├── best_recall.pt
│   └── best_lightweight.pt
└── experiment_summary.csv
```

### Kriteria Pemilihan Model Terbaik

Prioritas untuk proyek deteksi kerusakan jalan:

1. **Recall** jangan rendah — kerusakan jalan tidak boleh banyak terlewat
2. **mAP50** tinggi untuk performa deteksi utama
3. **mAP50-95** tinggi untuk kualitas mask/segmentasi presisi
4. **FPS** cukup tinggi untuk real-time

Jika dua model metriknya mirip:
- Pilih `yolov8n-seg` jika butuh cepat/ringan
- Pilih `yolov8s-seg` jika akurasi lebih penting
- Pilih `yolov8m-seg` hanya jika GPU/kecepatan masih memadai

### Model Registry Lokal

Gunakan `model_registry.yaml` untuk mencatat model yang pernah dilatih:

```yaml
active_model: "yolov8s_seg_exp04"

models:
  yolov8s_seg_exp04:
    weights_path: "models/yolov8s_seg_exp04_best.pt"
    base_model: "yolov8s-seg.pt"
    map50: 0.72
    map50_95: 0.45
    precision: 0.74
    recall: 0.78
    f1: 0.76
    notes: "Best overall pada test set"
```

---

## 3. DO & DON'T Rules

### ✅ DO — Harus Dilakukan

**Dataset & Anotasi**
- Gunakan format anotasi polygon/mask (bukan bounding box) untuk YOLOv8-seg
- Anotasi setiap instance kerusakan secara terpisah
- Verifikasi label di Roboflow sebelum export
- Sertakan gambar kondisi pencahayaan bervariasi (siang, sore, malam)
- Sertakan gambar berbagai sudut kamera (tegak lurus, miring, jarak dekat/jauh)
- Pisahkan dataset train/valid/test secara stratified

**Training**
- Gunakan transfer learning dari bobot pretrained COCO
- Simpan bobot terbaik berdasarkan mAP50 validation
- Monitor loss curve (box_loss, seg_loss, cls_loss, dfl_loss)
- Gunakan **early stopping** jika validation loss tidak turun 20–30 epoch
- Catat semua hyperparameter untuk reproducibility
- Training di Google Colab dengan GPU, mount Google Drive untuk checkpoint

**Inferensi & Deteksi**
- Resize setiap frame ke **640×640** sebelum inferensi
- Gunakan confidence threshold ≥ 0.25
- Gunakan IoU threshold 0.45 untuk NMS
- Tampilkan segmentation mask + label + confidence score secara overlay
- Simpan hanya 1 frame terbaik dalam jendela 120 frame
- Reset window counter setelah frame terbaik tersimpan

**Flask API**
- Load model **sekali saat startup**, bukan per request
- Kembalikan response JSON konsisten: `{status, class, confidence, timestamp}`
- Handle CORS jika frontend beda port dari Flask server

**Evaluasi**
- Hitung metrik **per kelas**, jangan hanya rata-rata
- Buat Confusion Matrix untuk melihat kebingungan antar kelas
- Bandingkan performa siang vs malam
- Catat mAP50 dan mAP50-95 sebagai metrik utama

---

### ❌ DON'T — Dilarang

**Dataset & Anotasi**
- Jangan gunakan anotasi bounding box saja — wajib mask/polygon untuk segmentasi
- Jangan campur test set ke training set (data leakage)
- Jangan anotasi area tidak jelas/blur sebagai kerusakan
- Jangan gunakan dataset dominasi satu kelas tanpa augmentasi kelas minoritas
- Jangan abaikan gambar negatif (jalan bagus tanpa kerusakan)

**Training**
- Jangan training dari scratch tanpa pretrained weights
- Jangan gunakan learning rate > 0.01 tanpa warm-up
- Jangan training dengan batch size < 4 di Colab GPU
- Jangan lanjutkan training jika validation loss tidak turun 30+ epoch (overfitting)
- Jangan hapus direktori `runs/` sebelum menyimpan `best.pt` ke Google Drive
- Jangan gunakan model selain varian `-seg` untuk task segmentasi

**Inferensi**
- Jangan gunakan confidence threshold < 0.15 (banyak false positive)
- Jangan gunakan confidence threshold > 0.8 (banyak false negative)
- Jangan proses video resolusi penuh langsung ke model tanpa resize
- Jangan simpan semua frame — hanya 1 frame terbaik per 120 frame
- Jangan blok main thread dengan operasi penyimpanan file — gunakan thread/async

**Flask API**
- Jangan load model di setiap request — load sekali saat startup
- Jangan simpan gambar di memory saja — simpan ke disk
- Jangan ekspos endpoint tanpa validasi input (cek tipe file)
- Jangan hardcode path model — gunakan konfigurasi file

**Evaluasi**
- Jangan evaluasi hanya pada validation set — wajib gunakan test set terpisah
- Jangan klaim akurasi tinggi hanya dari satu metrik
- Jangan abaikan kelas dengan performa rendah
- Jangan membandingkan mAP dari model yang ditest pada dataset berbeda

---

## 4. Edge Cases — Penanganan Khusus

| Kondisi | Penanganan |
|---|---|
| Frame sangat gelap (malam tanpa lampu) | Tambahkan threshold minimum brightness; skip frame jika terlalu gelap |
| Objek kerusakan sangat kecil (< 32×32 px) | Gunakan model `yolov8m-seg` yang lebih dalam, atau multi-scale inference |
| Multiple kerusakan dalam 1 frame | Pilih confidence tertinggi dari semua deteksi di frame tersebut |
| Kamera bergerak cepat (blur) | Skip frame dengan blur score rendah (Laplacian variance < threshold) |
| Tidak ada kerusakan dalam 120 frame | Reset window tanpa menyimpan frame; jangan kirim data kosong ke API |
| Model tidak bisa load `best.pt` | Fallback ke `last.pt`; log error dan beri notifikasi |

---

## 5. Checklist Serah Terima ke Tim Web GIS

- [ ] `best.pt` tersimpan dan bisa diload ulang tanpa error
- [ ] Model bisa berjalan inference pada video input tanpa crash
- [ ] Logika 120-frame window berfungsi dan menyimpan 1 frame terbaik
- [ ] Flask API endpoint aktif dan sudah ditest dengan Postman
- [ ] Format response API sudah disetujui bersama tim Web GIS
- [ ] Confusion matrix & metrik evaluasi semua skenario sudah didokumentasikan
- [ ] Tidak ada hardcoded path absolut di kode
- [ ] README singkat cara menjalankan sistem sudah dibuat
