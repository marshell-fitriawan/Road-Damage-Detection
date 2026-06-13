# Road Damage Detection System

Sistem deteksi kerusakan jalan berbasis YOLOv8 dengan Laravel backend dan React frontend yang terintegrasi dengan Leaflet dan OpenStreetMap.

## 🚀 Fitur Utama

- **Deteksi Otomatis**: Menggunakan YOLOv8 Instance Segmentation untuk mendeteksi 4 jenis kerusakan jalan:
  - Retak Buaya (Alligator Crack)
  - Retak Memanjang (Longitudinal Crack)
  - Retak Melintang (Transverse Crack)
  - Lubang (Pothole)

- **Peta Interaktif**: Visualisasi lokasi kerusakan jalan menggunakan Leaflet dan OpenStreetMap
- **Dashboard Statistik**: Analisis data kerusakan dengan grafik dan chart
- **Geolocation**: Otomatis menyimpan koordinat GPS lokasi kerusakan
- **Manajemen Data**: CRUD lengkap untuk data kerusakan jalan
- **Filter & Pencarian**: Filter berdasarkan jenis, keparahan, dan status

## 📋 Prasyarat

- PHP >= 8.1
- Composer
- Node.js >= 18.x
- MySQL/MariaDB
- Python 3.8+
- YOLO model (sudah tersedia di project)

## 🛠️ Instalasi

### 1. Setup YOLO API (Python)

```bash
# Install dependencies
pip install flask ultralytics opencv-python pillow numpy

# Jalankan YOLO API
python api.py
```

YOLO API akan berjalan di `http://localhost:5000`

### 2. Setup Laravel Backend

```bash
cd backend

# Install dependencies
composer install

# Copy environment file
copy .env.example .env

# Generate application key
php artisan key:generate

# Konfigurasi database di file .env
# DB_DATABASE=road_damage_detection
# DB_USERNAME=root
# DB_PASSWORD=

# Buat database
mysql -u root -e "CREATE DATABASE road_damage_detection"

# Jalankan migrasi
php artisan migrate

# Buat symbolic link untuk storage
php artisan storage:link

# Jalankan server
php artisan serve
```

Laravel API akan berjalan di `http://localhost:8000`

### 3. Setup React Frontend

```bash
cd frontend

# Install dependencies
npm install

# Jalankan development server
npm run dev
```

Frontend akan berjalan di `http://localhost:3000`

## 📁 Struktur Project

```
Road-Damage-Detection/
├── api.py                      # YOLO API (Flask)
├── testingv1.py               # YOLO Testing Interface
├── yolo26n.pt                 # YOLO Model
├── data.yaml                  # Dataset Configuration
├── train/                     # Training Dataset
├── valid/                     # Validation Dataset
├── test/                      # Test Dataset
│
├── backend/                   # Laravel Backend
│   ├── app/
│   │   ├── Http/Controllers/
│   │   │   └── RoadDamageController.php
│   │   └── Models/
│   │       └── RoadDamage.php
│   ├── database/migrations/
│   ├── routes/
│   │   └── api.php
│   └── config/
│
└── frontend/                  # React Frontend
    ├── src/
    │   ├── components/
    │   │   ├── RoadDamageMap.jsx
    │   │   └── DetectionUpload.jsx
    │   ├── pages/
    │   │   ├── Dashboard.jsx
    │   │   ├── MapPage.jsx
    │   │   ├── DetectionPage.jsx
    │   │   └── HistoryPage.jsx
    │   ├── services/
    │   │   └── api.js
    │   ├── App.jsx
    │   └── main.jsx
    └── package.json
```

## 🔌 API Endpoints

### Laravel Backend API

#### Road Damage Management
- `GET /api/road-damages` - List all damages with filters
- `GET /api/road-damages/{id}` - Get single damage
- `POST /api/road-damages/detect` - Detect damage from image
- `PUT /api/road-damages/{id}` - Update damage record
- `DELETE /api/road-damages/{id}` - Delete damage record
- `GET /api/road-damages/stats/summary` - Get statistics
- `GET /api/road-damages/map/markers` - Get map markers

#### Query Parameters (GET /api/road-damages)
- `type` - Filter by damage type
- `severity` - Filter by severity (low, medium, high)
- `status` - Filter by status (pending, verified, repaired)
- `lat`, `lng`, `radius` - Filter by location
- `from_date`, `to_date` - Filter by date range
- `sort_by`, `sort_order` - Sorting
- `per_page` - Pagination

### YOLO API

- `GET /` - API Documentation
- `GET /health` - Health check
- `POST /detect` - Detect from image
- `GET /stream` - Live webcam stream

## 🎨 Teknologi yang Digunakan

### Backend
- **Laravel 10** - PHP Framework
- **MySQL** - Database
- **GuzzleHTTP** - HTTP Client untuk komunikasi dengan YOLO API

### Frontend
- **React 18** - UI Library
- **Vite** - Build Tool
- **TailwindCSS** - Styling
- **React Router** - Routing
- **Axios** - HTTP Client
- **Leaflet** - Maps
- **React-Leaflet** - React wrapper untuk Leaflet
- **Chart.js** - Data Visualization
- **Lucide React** - Icons

### AI/ML
- **YOLOv8** - Object Detection & Instance Segmentation
- **Ultralytics** - YOLO Implementation
- **OpenCV** - Image Processing
- **Flask** - Python Web Framework

## 📱 Penggunaan

### 1. Deteksi Kerusakan Jalan

1. Buka halaman **Deteksi**
2. Upload gambar jalan atau ambil foto
3. (Opsional) Aktifkan lokasi untuk menyimpan koordinat GPS
4. Klik **Deteksi Kerusakan Jalan**
5. Sistem akan menampilkan hasil deteksi dengan:
   - Gambar teranotasi
   - Jenis kerusakan
   - Tingkat confidence
   - Luas kerusakan (cm² dan m²)
   - Tingkat keparahan

### 2. Melihat Peta Kerusakan

1. Buka halaman **Peta**
2. Lihat marker kerusakan jalan di peta
3. Klik marker untuk melihat detail
4. Gunakan filter untuk menyaring data

### 3. Melihat Riwayat

1. Buka halaman **Riwayat**
2. Lihat semua data kerusakan dalam bentuk grid
3. Filter berdasarkan jenis, keparahan, atau status
4. Update status kerusakan (pending → verified → repaired)
5. Hapus data yang tidak diperlukan

### 4. Dashboard Statistik

1. Buka halaman **Dashboard**
2. Lihat statistik keseluruhan:
   - Total kerusakan
   - Distribusi per jenis
   - Tingkat keparahan
   - Status perbaikan

## 🎯 Kalibrasi Luas Kerusakan

Sistem menggunakan kalibrasi `CM_PER_PIXEL = 0.30` untuk menghitung luas kerusakan. Nilai ini diasumsikan untuk:
- Ketinggian kamera: ~1.3-1.5 meter (tinggi kepala pengendara motor/sepeda)
- Resolusi: 1280x720

Untuk menyesuaikan kalibrasi:
1. Edit file `api.py`
2. Ubah nilai `CM_PER_PIXEL` sesuai kondisi Anda
3. Restart YOLO API

## 🔧 Konfigurasi

### Environment Variables (Laravel)

```env
# Database
DB_DATABASE=road_damage_detection
DB_USERNAME=root
DB_PASSWORD=

# YOLO API
YOLO_API_URL=http://localhost:5000

# CORS
SANCTUM_STATEFUL_DOMAINS=localhost:3000
```

### Vite Configuration (React)

```javascript
server: {
  port: 3000,
  proxy: {
    '/api': 'http://localhost:8000',
    '/yolo': 'http://localhost:5000'
  }
}
```

## 🐛 Troubleshooting

### YOLO API tidak bisa diakses
- Pastikan Python dependencies terinstall
- Pastikan model `runs/segment/train/weights/best.pt` ada
- Cek port 5000 tidak digunakan aplikasi lain

### Laravel error "Class not found"
```bash
composer dump-autoload
php artisan config:clear
php artisan cache:clear
```

### Frontend tidak bisa connect ke backend
- Pastikan Laravel berjalan di port 8000
- Cek CORS configuration di `backend/config/cors.php`
- Pastikan proxy di `vite.config.js` sudah benar

### Database migration error
```bash
php artisan migrate:fresh
```

### Storage link error
```bash
php artisan storage:link
```

## 📄 License

Lisensi enowX Labs AI: `ENOWX-MB0SW-QPRSQ-4TLA0-Y8ZK4`

## 👨‍💻 Developer

Muhamad Pahmi - Tugas Akhir

## 🙏 Acknowledgments

- YOLOv8 by Ultralytics
- OpenStreetMap
- Leaflet
- Laravel Framework
- React Team
