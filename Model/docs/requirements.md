# Requirements & Spesifikasi
## Kebutuhan Fungsional, Non-Fungsional, Hardware, Software, dan API

---

## 1. Kebutuhan Fungsional

### 1.1 Modul Input

| ID | Kebutuhan | Prioritas |
|---|---|---|
| F-01 | Sistem dapat menerima input video real-time dari kamera smartphone via jaringan lokal atau USB | Wajib |
| F-02 | Sistem dapat menerima input berupa file gambar (JPG/PNG) untuk pengujian statis | Wajib |
| F-03 | Sistem dapat memproses video menjadi rangkaian frame secara sequential | Wajib |
| F-04 | Sistem mendukung resolusi input minimal 720p (1280×720) | Wajib |

### 1.2 Modul Preprocessing

| ID | Kebutuhan | Prioritas |
|---|---|---|
| F-05 | Sistem me-resize setiap frame ke ukuran 640×640 piksel sebelum inferensi | Wajib |
| F-06 | Sistem melakukan normalisasi nilai piksel ke rentang [0, 1] | Wajib |
| F-07 | Sistem dapat mendeteksi frame terlalu gelap dan memberi peringatan | Opsional |

### 1.3 Modul Deteksi & Segmentasi

| ID | Kebutuhan | Prioritas |
|---|---|---|
| F-08 | Sistem mendeteksi kerusakan jalan menggunakan model YOLOv8 Instance Segmentation | Wajib |
| F-09 | Sistem mengklasifikasikan kerusakan ke dalam 4 kelas yang telah ditentukan | Wajib |
| F-10 | Sistem menghasilkan segmentation mask per piksel untuk setiap objek yang terdeteksi | Wajib |
| F-11 | Sistem menampilkan overlay mask + label + confidence score pada tampilan video | Wajib |
| F-12 | Sistem memproses deteksi secara real-time tanpa jeda signifikan | Wajib |

### 1.4 Modul Frame Selector

| ID | Kebutuhan | Prioritas |
|---|---|---|
| F-13 | Sistem menghitung jumlah frame sejak pertama kali kerusakan terdeteksi | Wajib |
| F-14 | Sistem mencatat nilai confidence score tertinggi dalam jendela ±120 frame | Wajib |
| F-15 | Sistem menyimpan 1 frame terbaik (confidence tertinggi) setelah 120 frame terpenuhi | Wajib |
| F-16 | Sistem me-reset window counter setelah frame terbaik tersimpan | Wajib |
| F-17 | Sistem tidak menyimpan frame apabila tidak ada kerusakan yang terdeteksi dalam 120 frame | Wajib |

### 1.5 Modul Flask API & Web Interface

| ID | Kebutuhan | Prioritas |
|---|---|---|
| F-18 | Sistem menyediakan REST API endpoint untuk menerima dan menampilkan frame terbaik | Wajib |
| F-19 | Sistem mengirimkan metadata deteksi (kelas, confidence, timestamp) bersama frame | Wajib |
| F-20 | Sistem menyimpan riwayat frame deteksi yang telah tersimpan | Wajib |
| F-21 | Sistem menyediakan web interface untuk memantau hasil deteksi secara visual | Wajib |
| F-22 | Sistem menyediakan endpoint untuk upload gambar dan mendapatkan hasil deteksi | Wajib |

---

## 2. Kebutuhan Non-Fungsional

### 2.1 Performa

| ID | Kebutuhan | Target |
|---|---|---|
| NF-01 | Waktu inferensi per frame | ≤ 100ms pada GPU (≤ 500ms pada CPU) |
| NF-02 | Frame rate real-time | ≥ 15 FPS pada GPU |
| NF-03 | Waktu respons Flask API | ≤ 2 detik per request |
| NF-04 | mAP50 model pada test set | ≥ 60% (target 70%+) |
| NF-05 | Recall pada kelas `Lubang` | ≥ 70% (kerusakan kritis tidak boleh banyak terlewat) |

### 2.2 Keandalan

| ID | Kebutuhan |
|---|---|
| NF-06 | Sistem berjalan stabil tanpa crash selama sesi deteksi berlangsung |
| NF-07 | Sistem menangani frame yang gagal diproses (corrupt/kosong) tanpa menghentikan stream |
| NF-08 | Sistem menyimpan log error jika terjadi kegagalan inferensi |

### 2.3 Kompatibilitas

| ID | Kebutuhan |
|---|---|
| NF-09 | Sistem dapat diakses via browser (Chrome, Firefox, Edge) tanpa instalasi tambahan |
| NF-10 | Sistem berjalan di OS Windows 10/11 dan Ubuntu 20.04+ |
| NF-11 | Sistem mendukung CUDA 12.1 untuk akselerasi GPU NVIDIA |

### 2.4 Maintainability

| ID | Kebutuhan |
|---|---|
| NF-12 | Path model, threshold, dan konfigurasi disimpan di file config terpisah |
| NF-13 | Kode dikelola dengan Git dan disimpan di repositori GitHub |

---

## 3. Kebutuhan Hardware

| Komponen | Minimum | Rekomendasi |
|---|---|---|
| CPU | AMD Ryzen 5 atau setara | AMD Ryzen 7 / Intel i7 |
| RAM | 8 GB | 16 GB |
| GPU (lokal) | NVIDIA RTX 3060 6GB VRAM | NVIDIA RTX 3070+ 8GB VRAM |
| GPU (training) | Google Colab T4 (16GB) | Google Colab A100 (40GB) |
| Storage | 20 GB free disk | 50 GB free disk |
| Kamera | Smartphone dengan kamera 720p | 1080p, frame rate ≥ 30fps |
| Jaringan | LAN lokal untuk streaming kamera | — |

---

## 4. Kebutuhan Software & Dependensi

### 4.1 Dependensi Python

```
# Core
torch==2.10.0
ultralytics==8.4.21

# Computer Vision
opencv-python==4.13.0.33
Pillow==10.4.0

# Web Framework
flask==3.1.3

# Numerik & Data
numpy==2.4.3
pandas==2.2.0
matplotlib==3.9.0
seaborn==0.13.2

# Utilities
pyyaml==6.0.1
tqdm==4.66.0
requests==2.31.0
python-dotenv==1.0.0
```

### 4.2 Konfigurasi CUDA

```
CUDA 12.1
cuDNN 8.9+
Python 3.13
```

---

## 5. Struktur File Konfigurasi

### 5.1 `config.yaml` — Konfigurasi Model & Sistem

```yaml
model:
  weights_path: "models/best.pt"
  fallback_weights: "models/last.pt"
  confidence_threshold: 0.25
  iou_threshold: 0.45
  image_size: 640

classes:
  0: "Retak-Buaya"
  1: "Retak-Memanjang"
  2: "Retak-Melintang"
  3: "Lubang"

detection:
  window_size: 120       # jumlah frame per jendela
  min_confidence: 0.25   # confidence minimum untuk dihitung

training:
  epochs: 100
  batch_size: 8
  learning_rate: 0.001
  optimizer: "AdamW"
  patience: 30
  imgsz: 640

paths:
  dataset: "dataset/data.yaml"
  saved_frames: "saved_frames/"
  runs: "runs/"
  logs: "logs/"

flask:
  host: "0.0.0.0"
  port: 5000
  debug: false
```

### 5.2 `dataset/data.yaml` — Format Roboflow Export

```yaml
path: ../dataset
train: train/images
val: valid/images
test: test/images

nc: 4
names: ["Retak-Buaya", "Retak-Memanjang", "Retak-Melintang", "Lubang"]
```

---

## 6. API Specification (Lengkap)

### `POST /detect` — Deteksi dari Gambar Upload

```
Request:
  Method: POST
  Content-Type: multipart/form-data
  Body:
    - image: file (JPG/PNG)
    - conf: float (opsional, default: 0.15)
    - return_image: bool (opsional, default: true)

Response 200:
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

Response 400:
{
  "success": false,
  "error": "Tidak ada file 'image' dalam request"
}
```

### `GET /stream` — Live Camera Feed dengan Overlay

```
Request:
  Method: GET
  Parameter: ?conf=0.15 (opsional)

Response: multipart/x-mixed-replace (MJPEG stream)
```

### `GET /health` — Status Server & Model

```
Request:
  Method: GET

Response 200:
{
  "status": "ok",
  "model": "YOLOv8n-seg",
  "classes": ["Retak-Buaya", "Retak-Memanjang", "Retak-Melintang", "Lubang"]
}
```

### `GET /history` — Riwayat Frame Tersimpan

```
Request:
  Method: GET

Response 200:
{
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

## 7. Ringkasan Target Metrik

| Metrik | Rumus | Target Minimum |
|---|---|---|
| Accuracy | (TP+TN) / (TP+TN+FP+FN) × 100% | ≥ 75% |
| Precision | TP / (TP+FP) × 100% | ≥ 70% |
| Recall | TP / (TP+FN) × 100% | ≥ 70% |
| F1-Score | 2 × (P×R)/(P+R) × 100% | ≥ 70% |
| mAP50 | Mean AP pada IoU=0.5 | ≥ 60% (target 70%) |
| mAP50-95 | Mean AP pada IoU=0.5:0.95 | ≥ 40% |
| FPS inferensi (GPU) | — | ≥ 15 FPS |
| Waktu respons API | — | ≤ 2 detik |
