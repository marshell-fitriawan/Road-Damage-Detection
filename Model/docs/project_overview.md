# Project Overview
## Rancang Bangun Sistem Deteksi dan Klasifikasi Kerusakan Jalan Berbasis Computer Vision Menggunakan YOLOv8 Segmentation

---

## 1. Identitas Proyek

| Field | Detail |
|---|---|
| **Judul** | Rancang Bangun Sistem Deteksi dan Klasifikasi Kerusakan Jalan Berbasis Computer Vision Menggunakan YOLOv8 Segmentation |
| **Mahasiswa** | Marshell Devilito Fitriawan |
| **NIM** | 3202316070 |
| **Program Studi** | D3 Teknik Informatika |
| **Jurusan** | Teknik Elektro |
| **Institusi** | Politeknik Negeri Pontianak (POLNEP) |
| **Pembimbing** | Safri Adam, S.Kom., M.Kom (NIP. 199407162022031006) |
| **Tahun** | 2026 |

---

## 2. Deskripsi Proyek

Sistem ini bertujuan mendeteksi dan mengklasifikasikan kerusakan permukaan jalan secara otomatis menggunakan model **YOLOv8 Instance Segmentation**. Input berupa video real-time dari kamera smartphone (resolusi 720p), output berupa **segmentation mask per piksel**, label jenis kerusakan, confidence score, estimasi luas kerusakan, serta pengiriman frame terbaik ke antarmuka web melalui Flask REST API.

---

## 3. Tujuan Utama

1. Mendeteksi kerusakan jalan dari video secara real-time
2. Mengklasifikasikan jenis kerusakan ke dalam **4 kelas**
3. Menghasilkan **instance segmentation mask** (bukan sekadar bounding box) untuk estimasi luas kerusakan
4. Menyimpan **1 frame terbaik** per jendela ±120 frame berdasarkan confidence score tertinggi
5. Mengirimkan hasil deteksi ke web interface via **Flask API**

---

## 4. Empat Kelas Deteksi

| ID Kelas | Nama Dataset | Label Bahasa Indonesia | Deskripsi |
|---|---|---|---|
| 0 | `pothole` | Lubang | Lubang pada permukaan jalan |
| 1 | `longitudinal-crack` | Retak Memanjang | Retakan lurus searah jalan |
| 2 | `transverse-crack` | Retak Melintang | Retakan lurus melintang jalan |
| 3 | `alligator-crack` | Retak Buaya | Retakan pola buaya (fatigue crack) |

> ⚠️ Urutan class ID harus konsisten antara dataset Roboflow, file `data.yaml`, dan inferensi. Jangan diubah urutannya.

---

## 5. Arsitektur Sistem High-Level

```
[Kamera Smartphone 720p]
        │
        ▼
[Frame Capture — OpenCV]
        │
        ▼
[Preprocessing: resize 640×640, normalisasi]
        │
        ▼
[YOLOv8n-seg Inference (best.pt)]
        │
   ┌────┴────┐
   │         │
Tidak      Terdeteksi
terdeteksi     │
   │           ▼
   │    [Tampilkan Mask + Label + Confidence Score]
   │           │
   │           ▼
   │    [Window Counter ±120 frame]
   │           │
   │           ▼
   │    [Simpan 1 Frame Terbaik (confidence tertinggi)]
   │           │
   └───────────▼
     [Flask REST API → Web Interface]
```

### Komponen Utama

| Komponen | Fungsi |
|---|---|
| Kamera (smartphone 720p) | Sumber input video real-time |
| Preprocessing Module | Resize 640×640, normalisasi piksel |
| YOLOv8n-seg Model | Deteksi + segmentasi kerusakan |
| Frame Selector Logic | Window 120 frame, pilih confidence tertinggi |
| Flask API | Jembatan hasil deteksi ke Web interface |

---

## 6. Peran dalam Kolaborasi

Proyek ini merupakan bagian dari sistem yang lebih besar bersama tim Web GIS:

- **Peran penulis (Model AI)**: Menyediakan model deteksi & klasifikasi (YOLOv8-seg) + Flask API
- **Peran tim Web GIS**: Mengintegrasikan hasil deteksi ke peta berbasis Web untuk visualisasi & pelaporan

---

## 7. Lokasi Penelitian

- **Dataset sekunder**: Jalan di wilayah **Kabupaten Kubu Raya, Kalimantan Barat**
- Pengambilan video menggunakan smartphone (resolusi 720p) dipasang pada phone holder di atas motor
- Skenario kecepatan: **10 km/jam** dan **20 km/jam**

---

## 8. Timeline Ringkasan

| Fase | Kegiatan | Bulan |
|---|---|---|
| 1 | Dataset & Anotasi | Februari 2026 |
| 2 | Training Model | Maret 2026 |
| 3 | Evaluasi Model | Maret – April 2026 |
| 4 | Pengembangan Sistem (Flask + Web) | April – Mei 2026 |
| 5 | Pengujian Final & Penulisan Laporan | Mei – Agustus 2026 |
