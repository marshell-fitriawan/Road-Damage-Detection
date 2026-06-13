# Technical Specification
## YOLOv8n-seg — Instance Segmentation untuk Deteksi Kerusakan Jalan

---

## 1. Model Architecture

### Spesifikasi Model

| Parameter | Nilai |
|---|---|
| Model | YOLOv8n-seg (nano segmentation) |
| Task | Instance Segmentation |
| Framework | Ultralytics 8.4.21 |
| Backend | PyTorch 2.10.0 + CUDA 12.1 |
| Input size | 640×640 piksel, 3 channel RGB |
| Parameter count | ~3,4 juta |
| Pretrained weights | COCO (transfer learning) |
| Output file | `best.pt` |

### Tiga Komponen Utama Arsitektur

#### Backbone — CSPDarknet
- Input: frame 640×640 px, 3 channel RGB
- Layer: Conv 3×3×N → C2f Module (CSP) → SPPF Module
- Output: Feature Maps pada 3 skala — **P3 (small), P4 (medium), P5 (large)**
- Mekanisme: Cross Stage Partial (CSP) untuk efisiensi komputasi

#### Neck — FPN + PAN
- **FPN** (Feature Pyramid Network): top-down, Upsample ×2, Concat Features
- **PAN** (Path Aggregation Network): bottom-up, Multi-scale Output
- Fungsi: menggabungkan feature map dari berbagai skala untuk deteksi objek kecil, sedang, dan besar sekaligus

#### Head — Detection + Segmentation
- **Detection Head**: menghasilkan Bounding Box + Class Score + Label Kelas
- **Segmentation Head**: menghasilkan Proto-mask (32ch) + Mask Coefficients → **Segmentation Mask Piksel**

### Keunggulan Instance Segmentation vs Bounding Box

| Aspek | Bounding Box | Instance Segmentation |
|---|---|---|
| Presisi area | Kotak persegi | Mask tingkat piksel |
| Estimasi luas | Tidak akurat | Dapat dihitung |
| Detail kerusakan | Terbatas | Detail per objek |

---

## 2. Dataset

### Komposisi Dataset

| Split | Jumlah Gambar | Jumlah Anotasi |
|---|---|---|
| Training | 2.709 | 4.682 |
| Validation | 226 | 332 |
| Test | 129 | 199 |
| **Total** | **3.064** | **5.213** |

### Sumber Dataset

| Sumber | Detail |
|---|---|
| **Primer** | Roboflow Universe publik — 1.258 gambar asli, sudah beranotasi segmentasi format YOLOv8 |
| **Sekunder** | Pengambilan langsung di Kabupaten Kubu Raya, Kalimantan Barat — target ~500 gambar (belum tersedia saat proposal) |

Angka 3.064 adalah **setelah augmentasi** (3 versi per gambar sumber dari Roboflow pipeline).

### Distribusi Kelas (Total 5.213 Anotasi)

| Kelas | Jumlah Anotasi | Proporsi |
|---|---|---|
| pothole (Lubang) | 1.775 | 34.0% |
| longitudinal-crack (Retak Memanjang) | 1.602 | 30.7% |
| alligator-crack (Retak Buaya) | 1.375 | 26.4% |
| transverse-crack (Retak Melintang) | 461 | 8.8% |

> ⚠️ **Class imbalance**: `transverse-crack` hanya 8.8% dari total. Ditangani melalui augmentasi. Monitor metrik per-class saat evaluasi, jangan hanya lihat mAP overall.

### Format Anotasi
- Format: **YOLO Segmentation** (polygon mask, bukan bounding box)
- Platform anotasi: Roboflow
- File konfigurasi: `data.yaml` dari Roboflow export

---

## 3. Preprocessing & Augmentasi

### Pipeline Augmentasi (Roboflow, 3 versi per gambar sumber)

| Tahapan | Detail |
|---|---|
| Resize | 640×640 px (wajib, input size model) |
| Normalisasi piksel | Nilai 0–255 → 0.0–1.0 |
| Horizontal flip | Probabilitas 50% |
| Rotasi | ±10° |
| Brightness/Contrast | Adjustment otomatis |
| Mosaic augmentation | Gabung 4 gambar jadi 1 tile |

### Aturan Penting
- Augmentasi **HANYA** diterapkan pada **training set**
- Validation set dan test set **TIDAK boleh diaugmentasi** — untuk memastikan evaluasi objektif

---

## 4. Training Configuration

### Hyperparameter

| Parameter | Nilai |
|---|---|
| Epoch | 100 |
| Batch Size | 16 |
| Learning Rate (lr0) | 0.01 |
| Optimizer | AdamW |
| Image Size | 640×640 |
| Pretrained Weights | COCO dataset |
| Early Stopping Patience | 30 epoch |
| Device | CUDA (GPU) |

### Platform Training

| Platform | Spesifikasi GPU |
|---|---|
| **Utama**: Google Colaboratory | Tesla T4 (16GB VRAM) / V100 |
| **Lokal (opsional)** | NVIDIA RTX 3060 (VRAM 6 GB) |

> ⚠️ Jangan train di CPU — dengan 3.064 gambar dan 100 epoch, training di CPU bisa memakan waktu berhari-hari.

### Contoh Kode Training

```python
from ultralytics import YOLO

model = YOLO('yolov8n-seg.pt')  # pretrained COCO weights

model.train(
    data='data.yaml',
    epochs=100,
    batch=16,
    imgsz=640,
    lr0=0.01,
    optimizer='AdamW',
    device='cuda',
    project='road_damage',
    name='yolov8n_seg_v1',
    save=True,
    save_period=10,
    plots=True,
)
```

### Output Training

| File | Keterangan |
|---|---|
| `best.pt` | Bobot terbaik berdasarkan val mAP (digunakan untuk deployment) |
| `last.pt` | Bobot epoch terakhir (jika training berhenti sebelum selesai) |
| `results.csv` | Log metrik per epoch |
| `confusion_matrix.png` | Confusion matrix validasi |
| `results.png` | Training curves (loss, metrik) |

> **DON'T** deploy `last.pt` — selalu gunakan `best.pt`

---

## 5. Logika Frame Selector (120 Frame Window)

### Alur Frame Processing

Ini adalah bagian paling kritis yang membedakan sistem ini dari implementasi YOLO generik.

```python
WINDOW_SIZE = 120          # jumlah frame per jendela
best_frame = None
best_score = 0.0
frame_count = 0

while kamera_aktif:
    frame = ambil_frame()
    results = model(frame)

    if results[0].masks is not None:  # ada deteksi
        confidence = float(results[0].boxes.conf.max())

        # Tampilkan mask + label + score ke layar
        annotated = results[0].plot()
        tampilkan(annotated)

        if not detection_window_active:
            # Mulai jendela baru
            detection_window_active = True
            frame_count = 0
            best_frame = frame.copy()
            best_score = confidence
        else:
            # Update best frame dalam jendela
            if confidence > best_score:
                best_score = confidence
                best_frame = frame.copy()

        frame_count += 1

        if frame_count >= WINDOW_SIZE:
            # Simpan dan kirim 1 frame terbaik
            simpan_dan_kirim(best_frame, best_score, hasil_deteksi)
            # Reset jendela
            detection_window_active = False
            best_frame = None
            best_score = 0.0
            frame_count = 0
    else:
        tampilkan(frame)  # tanpa overlay deteksi
```

### Alasan 120 Frame
- Video standar: 30 fps
- 120 frame ÷ 30 fps = **~4 detik**
- Cukup untuk memastikan objek masuk penuh ke bidang pandang kamera
- Memberikan kesempatan memilih frame dengan pencahayaan & sudut terbaik

### Aturan Frame Selector
- Saat kerusakan terdeteksi → mulai jendela 120 frame
- Catat confidence score tiap frame, simpan yang tertinggi
- Setelah 120 frame → simpan 1 frame terbaik, kirim ke API
- Reset window
- Jika tidak ada kerusakan dalam 120 frame → reset tanpa menyimpan

---

## 6. Stack Teknologi

### Bahasa Pemrograman

**Python 3.13** — kompatibel penuh dengan seluruh library yang digunakan.

### Framework & Library

| Library | Versi | Fungsi |
|---|---|---|
| Ultralytics YOLOv8 | 8.4.21 | Training & inferensi model segmentasi |
| PyTorch | 2.10.0 | Backend deep learning (GPU/CUDA 12.1) |
| OpenCV | 4.13.0 | Baca kamera, preprocessing frame, tampilan real-time |
| Flask | 3.1.3 | REST API & Web interface |
| NumPy | 2.4.3 | Komputasi numerik & manipulasi array |
| Pillow | 10.4.0 | Pemrosesan gambar |

### Tools Pendukung

| Tool | Fungsi |
|---|---|
| Google Colaboratory | Platform training berbasis cloud (GPU gratis) |
| Roboflow | Anotasi, augmentasi, split dataset, ekspor format YOLO |
| Visual Studio Code | Code editor utama (Python + IntelliSense) |
| Git & GitHub | Version control & penyimpanan repositori |
| Postman | Testing endpoint Flask REST API |

---

## 7. Evaluasi & Target Metrik

### Definisi Komponen

| Istilah | Keterangan |
|---|---|
| **TP** (True Positive) | Kerusakan terdeteksi dan memang ada kerusakan |
| **TN** (True Negative) | Tidak ada kerusakan dan model tidak mendeteksi |
| **FP** (False Positive) | Model mendeteksi kerusakan padahal tidak ada |
| **FN** (False Negative) | Ada kerusakan tapi tidak terdeteksi model |

### Target Metrik

| Metrik | Rumus | Target Minimum | Target Ideal |
|---|---|---|---|
| Accuracy | (TP+TN)/(TP+TN+FP+FN) × 100% | ≥ 75% | — |
| Precision | TP/(TP+FP) × 100% | ≥ 70% | ≥ 80% |
| Recall | TP/(TP+FN) × 100% | ≥ 70% | ≥ 80% |
| F1-Score | 2 × (P×R)/(P+R) × 100% | ≥ 70% | ≥ 80% |
| mAP50 | Mean AP pada IoU=0.5 | ≥ 60% | ≥ 70% |
| mAP50-95 | Mean AP pada IoU=0.5:0.95 | ≥ 40% | — |
| FPS inferensi (GPU) | — | ≥ 15 FPS | ≥ 25+ FPS |
| Waktu respons API | — | ≤ 2 detik | ≤ 1 detik |

### Prioritas Recall

> ⚠️ **Recall lebih penting dari Precision** dalam konteks ini. Kerusakan jalan yang TIDAK terdeteksi (False Negative) lebih berbahaya daripada false alarm (False Positive). Jika harus trade-off, prioritaskan Recall.

### Skenario Pengujian

| No | Skenario | Input | Metrik |
|---|---|---|---|
| 1 | Gambar diam (test set) | 129 gambar test set Roboflow | Confusion Matrix, Accuracy, Precision, Recall, F1-Score |
| 2 | Video rekaman jalan | Video dengan kondisi kerusakan | Precision, Recall, F1-Score per frame |
| 3 | Siang vs malam | Gambar 2 kondisi pencahayaan | Accuracy, Precision, Recall, F1-Score (dibandingkan) |
| 4 | 10 km/jam vs 20 km/jam | Video rekaman di Kubu Raya | Confidence score rata-rata, Precision, Recall, F1-Score (dibandingkan) |

---

## 8. Flask API Specification

### Endpoint yang Dibutuhkan

#### `POST /detect` — Deteksi dari Gambar Upload

```
Request:  multipart/form-data { image: file, conf: float (opsional), return_image: bool (opsional) }

Response: {
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

#### `GET /stream` — Live Camera Feed dengan Overlay

```
Response: multipart/x-mixed-replace (MJPEG stream)
Parameter opsional: ?conf=0.15 (confidence threshold)
```

#### `GET /health` — Status Server & Model

```
Response: {
  "status": "ok",
  "model": "YOLOv8n-seg",
  "classes": ["Retak-Buaya", "Retak-Memanjang", "Retak-Melintang", "Lubang"]
}
```

#### `GET /history` — Riwayat Frame Tersimpan (jika diimplementasikan)

```
Response: {
  "frames": [
    {
      "filename": "2026-06-01_14-23-45.jpg",
      "class": "pothole",
      "confidence": 0.87,
      "timestamp": "2026-06-01T14:23:45"
    }
  ]
}
```

---

## 9. Kebutuhan Hardware

| Komponen | Minimum | Rekomendasi |
|---|---|---|
| CPU | AMD Ryzen 5 atau setara | AMD Ryzen 7 / Intel i7 |
| RAM | 8 GB | 16 GB |
| GPU (lokal) | NVIDIA RTX 3060 (VRAM 6 GB) | NVIDIA RTX 3070+ (VRAM 8 GB) |
| GPU (training) | Google Colab T4 (VRAM 16 GB) | Google Colab A100 (VRAM 40 GB) |
| Storage | 20 GB free disk | 50 GB free disk |
| Kamera | Smartphone dengan kamera 720p | 1080p, frame rate ≥ 30fps |
| Jaringan | LAN lokal untuk streaming kamera | — |
