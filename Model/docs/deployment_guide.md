# =============================================================================
# DEPLOYMENT GUIDE — Cara Menyimpan Model Baru dari Google Colab
# =============================================================================
# Dokumen ini menjelaskan langkah-langkah setelah selesai training di Colab.
# Ikuti step-by-step setiap kali selesai 1 eksperimen.
# =============================================================================

## 📋 Checklist Cepat (1 Eksperimen)

Setiap kali selesai training 1 eksperimen di Colab:

```
□ 1. Download best.pt dari Colab
□ 2. Simpan ke Model/models/<exp_name>.pt
□ 3. Catat metrik evaluasi
□ 4. Update model_registry.yaml
□ 5. (Opsional) Ganti model aktif
□ 6. Test deteksi
```

> Jalankan 10x (untuk 10 eksperimen). Di percobaan terakhir, pilih model
> dengan performa terbaik untuk deployment final.

---

## STEP 1 — Download Model dari Google Colab

### Di Google Colab, setelah training selesai:

```python
# Di Colab — setelah training selesai
from google.colab import files

# Download best.pt
files.download("/content/road_damage/expXX_baseline/weights/best.pt")
# → File akan terdownload sebagai best.pt

# Download juga hasil evaluasi (confusion matrix, dll)
files.download("/content/road_damage/expXX_baseline/confusion_matrix.png")
```

### Atau mount Google Drive (lebih praktis untuk banyak file):

```python
# Di Colab — simpan ke Google Drive
from google.colab import drive
drive.mount('/content/drive')

# Copy hasil training ke Drive
!cp /content/road_damage/expXX_baseline/weights/best.pt \
     "/content/drive/MyDrive/road_damage_detection/experiments/expXX_baseline.pt"
```

---

## STEP 2 — Simpan ke Folder Lokal

Setelah file .pt ada di komputer lokal:

```bash
# Pindahkan ke folder models/ dengan nama sesuai eksperimen
mv best.pt Model/models/exp02_tambah_negatif.pt

# Contoh untuk semua eksperimen:
# mv best.pt Model/models/exp01_baseline.pt        (Eksp 1)
# mv best.pt Model/models/exp02_tambah_negatif.pt  (Eksp 2)
# mv best.pt Model/models/exp03_small_model.pt     (Eksp 3)
# ...
# mv best.pt Model/models/exp10_final.pt           (Eksp 10)
```

> ⚠️ **PENTING:** Rename file .pt sesuai nama eksperimen!
> Jangan simpan sebagai "best.pt" — nanti ketimpa eksperimen lain.

---

## STEP 3 — Catat Metrik Evaluasi

Jalankan evaluasi di Colab setelah training:

```python
from ultralytics import YOLO

# Load model yang baru selesai training
model = YOLO("/content/road_damage/expXX_baseline/weights/best.pt")

# Evaluasi pada test set
metrics = model.val(data="data.yaml", split="test")

print(f"mAP50:     {metrics.seg.map50:.4f}")
print(f"mAP50-95:  {metrics.seg.map:.4f}")
print(f"Precision: {metrics.seg.mp:.4f}")
print(f"Recall:    {metrics.seg.mr:.4f}")

# Hitung F1-Score
precision = metrics.seg.mp
recall = metrics.seg.mr
f1 = 2 * (precision * recall) / (precision + recall)
print(f"F1-Score:  {f1:.4f}")
```

Catat angka-angka ini, lalu buka `model_registry.yaml` dan isi:

```yaml
exp02_tambah_negatif:
  weights_path: "models/exp02_tambah_negatif.pt"
  base_model: "yolov8n-seg.pt"
  tanggal: "2026-06-15"            # isi tanggal training
  epochs: 100
  batch: 8
  lr0: 0.001
  optimizer: "AdamW"
  dataset: "Roboflow + 200-300 gambar negatif jalan bagus"
  negatif_images: true
  map50: 0.68                       # ← isi dari hasil evaluasi
  map50_95: 0.42                    # ← isi
  precision: 0.72                   # ← isi
  recall: 0.78                      # ← isi
  f1: 0.75                          # ← isi
  fps: 28                           # ← isi (cek FPS inferensi)
  notes: "Tambah gambar negatif — false positive berkurang signifikan"
```

---

## STEP 4 — Ganti Model Aktif (2 Cara)

### Cara A — Via API (tanpa restart server):

```bash
curl -X POST http://localhost:5000/switch-model \
  -H "Content-Type: application/json" \
  -d '{"model": "exp02_tambah_negatif"}'
```

Response sukses:
```json
{
  "success": true,
  "message": "Model berubah dari 'exp01_baseline' ke 'exp02_tambah_negatif'",
  "active_model": "exp02_tambah_negatif"
}
```

### Cara B — Edit config.yaml lalu restart:

```yaml
# config.yaml — ubah baris ini:
model:
  active_model: "exp02_tambah_negatif"   # ganti nama model
```

Kemudian restart server:
```bash
# Matikan server (Ctrl+C), lalu jalankan ulang
python Model/api.py
```

### Verifikasi model aktif:

```bash
curl http://localhost:5000/models
# → Cari yang "active": true
```

---

## STEP 5 — Test Deteksi

```bash
# Test dengan gambar jalan rusak
curl -X POST http://localhost:5000/detect \
  -F "image=@test.jpg"

# Test dengan gambar negatif (jalan bagus) — harus 0 deteksi
curl -X POST http://localhost:5000/detect \
  -F "image=@jalan_bagus.jpg"

# Test dengan confidence rendah (bandingkan)
curl -X POST http://localhost:5000/detect \
  -F "image=@test.jpg" \
  -F "conf=0.15"
```

---

## STEP Terakhir — Pilih Model Terbaik

Setelah 10 eksperimen selesai, bandingkan metrik:

| Eksperimen | mAP50 | Recall | Precision | F1 | FPS |
|---|---|---|---|---|---|
| exp01_baseline | ? | ? | ? | ? | ? |
| exp02_tambah_negatif | ? | ? | ? | ? | ? |
| exp03_small_model | ? | ? | ? | ? | ? |
| ... | | | | | |
| **exp10_final** | **?** | **?** | **?** | **?** | **?** |

Pilih model dengan **Recall tertinggi** (prioritas #1) dan **mAP50 tertinggi** (prioritas #2).

Setelah pilih, set sebagai active_model di `config.yaml`:
```yaml
model:
  active_model: "exp10_final"  # model terbaik
```

---

## ⚠️ Catatan Penting

| Hal | Penjelasan |
|---|---|
| **Jangan timpa file** | Setiap eksperimen simpan dengan nama UNIK (exp01, exp02, dll) |
| **Catat metrik SEMUA kelas** | Jangan hanya rata-rata — perhatikan `transverse-crack` yang cuma 8.8% |
| **Evaluasi di TEST set** | Bukan validation set — validation set sudah dipakai untuk early stopping |
| **File .pt bisa besar** | YOLOv8n-seg ~6MB, YOLOv8s-seg ~23MB — masih ringan |
| **Backup ke Drive** | Simpan semua file .pt ke Google Drive juga sebagai cadangan |
