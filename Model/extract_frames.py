#!/usr/bin/env python3
"""
extract_frames.py — Ekstrak Gambar dari Video untuk Dataset
============================================================
Mengubah video menjadi kumpulan gambar unik (tidak duplikat)
untuk ditambahkan ke dataset training.

Cocok untuk:
  - Membuat gambar negatif (jalan bagus) dari video jalan tanpa kerusakan
  - Menambah variasi dataset positif dari video jalan rusak
  - Cari gambar unik dari rekaman HP saat survei jalan

CARA KERJA:
  Video → Ekstrak frame tiap interval → Filter duplikat (histogram)
        → Simpan gambar unik ke folder output

Penggunaan:
  # Ekstrak dari 1 video
  python extract_frames.py video.mp4

  # Ekstrak dari semua video dalam folder
  python extract_frames.py folder_video/

  # Atur interval (setiap 30 frame)
  python extract_frames.py video.mp4 --interval 30

  # Atur threshold deduplikasi (0.0 = semua unik, 1.0 = semua sama)
  python extract_frames.py video.mp4 --threshold 0.85

  # Output ke folder tertentu
  python extract_frames.py video.mp4 --output dataset_baru

  # Untuk gambar negatif (jalan bagus) — prefix nama
  python extract_frames.py video_jalan_bagus.mp4 --prefix negatif_

  # Resize output
  python extract_frames.py video.mp4 --resize 640 640
"""

import argparse
import os
import sys
import time
from pathlib import Path

import cv2
import numpy as np

# ─── Konfigurasi default ─────────────────────
DEFAULT_INTERVAL = 30  # Ambil 1 frame setiap N frame
DEFAULT_THRESHOLD = 0.90  # Threshold kemiripan histogram (0-1)
# Makin tinggi: makin ketat (hanya frame sangat berbeda yg disimpan)
# 0.95 = simpan hanya jika beda >5%
# 0.80 = simpan jika beda >20%
OUTPUT_DIR = "extracted_frames"  # Folder output default


def histogram_similarity(img1, img2):
    """
    Hitung kemiripan 2 gambar berdasarkan histogram warna.
    Nilai 1.0 = identik, 0.0 = sangat berbeda.
    """
    # Konversi ke HSV untuk perbandingan warna lebih akurat
    hsv1 = cv2.cvtColor(img1, cv2.COLOR_BGR2HSV)
    hsv2 = cv2.cvtColor(img2, cv2.COLOR_BGR2HSV)

    # Hitung histogram untuk 3 channel
    similarities = []
    for channel in range(3):
        hist1 = cv2.calcHist([hsv1], [channel], None, [64], [0, 256])
        hist2 = cv2.calcHist([hsv2], [channel], None, [64], [0, 256])

        # Normalisasi
        cv2.normalize(hist1, hist1, 0, 1, cv2.NORM_MINMAX)
        cv2.normalize(hist2, hist2, 0, 1, cv2.NORM_MINMAX)

        # Korelasi histogram
        sim = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
        similarities.append(sim)

    return sum(similarities) / len(similarities)


def extract_frames(
    video_path, output_dir, interval, threshold, prefix="", resize=None, max_frames=None
):
    """
    Ekstrak frame unik dari video.

    Args:
        video_path: Path file video
        output_dir: Folder output gambar
        interval: Ambil 1 frame setiap N frame
        threshold: Threshold kemiripan (0-1)
        prefix: Prefix nama file output
        resize: Tuple (width, height) atau None
        max_frames: Maksimal frame yang diproses

    Returns:
        Jumlah gambar yang berhasil diekstrak
    """
    video_name = Path(video_path).stem
    print(f"\n{'=' * 60}")
    print(f"  VIDEO: {video_name}{Path(video_path).suffix}")
    print(f"{'=' * 60}")

    # Buka video
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"  [ERROR] Gagal membuka video: {video_path}")
        return 0

    # Info video
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0
    frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    print(f"  Resolusi : {frame_w} x {frame_h}")
    print(f"  Duration : {duration:.1f} detik ({fps:.1f} fps)")
    print(f"  Total    : {total_frames} frame")
    print(f"  Interval : setiap {interval} frame")
    print(f"  Deduplikasi: threshold {threshold}")
    print()

    # Buat folder output
    os.makedirs(output_dir, exist_ok=True)

    # State deduplikasi
    last_saved_frame = None
    saved_count = 0
    skipped_dedup = 0
    skipped_interval = 0
    frame_count = 0
    start_time = time.time()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Batas maksimal frame
        if max_frames and frame_count >= max_frames:
            break

        # Ekstrak hanya setiap interval frame
        if frame_count % interval != 0:
            frame_count += 1
            skipped_interval += 1
            continue

        # Resize jika diminta
        if resize:
            frame = cv2.resize(frame, resize, interpolation=cv2.INTER_AREA)

        # Deduplikasi: skip jika terlalu mirip dengan frame terakhir yang disimpan
        if last_saved_frame is not None:
            sim = histogram_similarity(frame, last_saved_frame)
            if sim > threshold:
                skipped_dedup += 1
                frame_count += 1
                continue
        else:
            sim = 0  # frame pertama selalu disimpan

        # Simpan frame
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"{prefix}{video_name}_f{frame_count:06d}.jpg"
        filepath = os.path.join(output_dir, filename)
        cv2.imwrite(filepath, frame, [cv2.IMWRITE_JPEG_QUALITY, 95])

        last_saved_frame = frame.copy()
        saved_count += 1

        # Progress
        if saved_count % 20 == 0 or saved_count <= 5:
            progress = frame_count / min(total_frames, max_frames or total_frames) * 100
            elapsed = time.time() - start_time
            print(
                f"  Progress: {frame_count:>6d}/{min(total_frames, max_frames or total_frames)} "
                f"frame ({progress:.0f}%) | Saved: {saved_count} | "
                f"Skip dup: {skipped_dedup} | {elapsed:.0f}s",
                end="\r",
            )

        frame_count += 1

    cap.release()
    print()

    # Ringkasan
    elapsed = time.time() - start_time
    print(f"\n  {'=' * 40}")
    print(f"  RINGKASAN EKSTRAKSI")
    print(f"  {'=' * 40}")
    print(f"  Video         : {video_name}")
    print(f"  Frame diproses: {frame_count}")
    print(f"  Disimpan      : {saved_count} gambar")
    print(f"  Dilewati (interval): {skipped_interval}")
    print(f"  Dilewati (duplikat): {skipped_dedup}")
    print(f"  Waktu         : {elapsed:.1f} detik")
    print(f"  Output        : {os.path.abspath(output_dir)}/")

    return saved_count


def process_folder(
    folder_path,
    output_dir,
    interval,
    threshold,
    prefix="",
    resize=None,
    max_frames=None,
):
    """Ekstrak frame dari semua video dalam folder."""
    video_exts = (".mp4", ".avi", ".mov", ".mkv", ".wmv", ".flv", ".webm")

    video_files = []
    for f in os.listdir(folder_path):
        if f.lower().endswith(video_exts):
            video_files.append(os.path.join(folder_path, f))

    if not video_files:
        print(f"[ERROR] Tidak ada file video di folder: {folder_path}")
        print(f"  Format: {video_exts}")
        return 0

    # Buat subfolder per video untuk output
    total_saved = 0
    for v in sorted(video_files):
        video_name = Path(v).stem
        vid_output = os.path.join(output_dir, video_name)
        saved = extract_frames(
            v, vid_output, interval, threshold, prefix, resize, max_frames
        )
        total_saved += saved

    print(f"\n{'=' * 60}")
    print(f"  TOTAL: {len(video_files)} video → {total_saved} gambar")
    print(f"  Folder output: {os.path.abspath(output_dir)}/")
    print(f"{'=' * 60}")

    return total_saved


def main():
    parser = argparse.ArgumentParser(
        description="Ekstrak Gambar Unik dari Video untuk Dataset",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Contoh:
  # 1 video → folder output/
  python extract_frames.py video_jalan.mp4

  # Semua video dalam folder
  python extract_frames.py folder_video/

  # Untuk dataset negatif (jalan bagus)
  python extract_frames.py video_jalan_bagus.mp4 --prefix negatif_ --output dataset_negatif

  # Interval lebih rapat (setiap 15 frame)
  python extract_frames.py video.mp4 --interval 15

  # Deduplikasi lebih longgar (lebih banyak gambar disimpan)
  python extract_frames.py video.mp4 --threshold 0.80

  # Deduplikasi lebih ketat (lebih sedikit, lebih bervariasi)
  python extract_frames.py video.mp4 --threshold 0.95

  # Resize output ke 640x640
  python extract_frames.py video.mp4 --resize 640 640

  # Proses 500 frame pertama aja (testing cepat)
  python extract_frames.py video.mp4 --max-frames 500
        """,
    )
    parser.add_argument(
        "input", nargs="?", help="Path file video atau folder berisi video"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=DEFAULT_INTERVAL,
        help=f"Ambil 1 frame setiap N frame (default: {DEFAULT_INTERVAL})",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_THRESHOLD,
        help=f"Threshold kemiripan histogram (0-1). Makin tinggi = makin ketat. "
        f"(default: {DEFAULT_THRESHOLD})",
    )
    parser.add_argument(
        "--output", default=OUTPUT_DIR, help=f"Folder output (default: {OUTPUT_DIR}/)"
    )
    parser.add_argument(
        "--prefix", default="", help="Prefix nama file output (contoh: negatif_)"
    )
    parser.add_argument(
        "--resize",
        type=int,
        nargs=2,
        metavar=("WIDTH", "HEIGHT"),
        help="Resize output ke ukuran tertentu (contoh: 640 640)",
    )
    parser.add_argument(
        "--max-frames",
        type=int,
        help="Maksimal frame yang diproses (untuk testing cepat)",
    )
    parser.add_argument(
        "--info", action="store_true", help="Tampilkan penjelasan interval & threshold"
    )

    args = parser.parse_args()

    # Mode info
    if args.info:
        print(f"""
╔══════════════════════════════════════════════════════════╗
║         PANDUAN INTERVAL & THRESHOLD                    ║
╠══════════════════════════════════════════════════════════╣
║                                                        ║
║  INTERVAL — Seberapa sering ambil frame                ║
║  ─────────────────────────────────────────────────     ║
║  interval=5   → dari video 30fps = 6 gambar/detik      ║
║  interval=15  → dari video 30fps = 2 gambar/detik    ║
║  interval=30  → dari video 30fps = 1 gambar/detik    ║
║  interval=60  → dari video 30fps = 1 gambar/2 detik   ║
║                                                        ║
║  REKOMENDASI: interval 30 untuk jalan (~1fps)          ║
║                                                        ║
║  THRESHOLD — Seberapa ketat cek duplikat               ║
║  ─────────────────────────────────────────────────     ║
║  0.95 → sangat ketat (hanya simpan frame sangat beda)  ║
║  0.90 → ketat (default, recommended)                    ║
║  0.80 → longgar (lebih banyak gambar)                   ║
║  0.50 → sangat longgar (hampir semua disimpan)          ║
║                                                        ║
║  CARA KERJA DEDUPLIKASI:                                ║
║  Setiap frame dibandingkan histogram HSV-nya dengan     ║
║  frame terakhir yang disimpan. Jika kemiripan >         ║
║  threshold, frame dilewati. Ini memastikan gambar       ║
║  yang disimpan selalu bervariasi.                       ║
║                                                        ║
╚══════════════════════════════════════════════════════════╝
        """)
        return

    # Validasi input
    if not args.input:
        parser.print_help()
        print("\n[ERROR] Masukkan path file video atau folder video")
        sys.exit(1)

    if not os.path.exists(args.input):
        print(f"[ERROR] File/folder tidak ditemukan: {args.input}")
        sys.exit(1)

    # Cek threshold valid
    if args.threshold < 0 or args.threshold > 1:
        print(f"[ERROR] Threshold harus antara 0 dan 1. Nilai: {args.threshold}")
        sys.exit(1)

    # Proses
    if os.path.isfile(args.input):
        extract_frames(
            args.input,
            args.output,
            args.interval,
            args.threshold,
            args.prefix,
            args.resize,
            args.max_frames,
        )
    elif os.path.isdir(args.input):
        process_folder(
            args.input,
            args.output,
            args.interval,
            args.threshold,
            args.prefix,
            args.resize,
            args.max_frames,
        )


if __name__ == "__main__":
    main()
