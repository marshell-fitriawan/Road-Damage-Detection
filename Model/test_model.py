#!/usr/bin/env python3
"""
test_model.py — Testing Tool untuk Model Deteksi Kerusakan Jalan
=================================================================
Menguji model YOLOv8n-seg pada file gambar atau video TANPA perlu
menjalankan API server. Model dimuat langsung dari config.yaml.

Penggunaan:
  # Test gambar
  python test_model.py gambar.jpg
  python test_model.py gambar.jpg --save      # simpan hasil anotasi

  # Test video
  python test_model.py video.mp4 --save

  # Ganti model aktif
  python test_model.py gambar.jpg --model exp02_tambah_negatif

  # Atur confidence threshold
  python test_model.py gambar.jpg --conf 0.5

  # Via API server (jika server sedang jalan)
  python test_model.py gambar.jpg --api http://localhost:5000
"""

import argparse
import csv
import os
import sys
import time
from pathlib import Path

import cv2
import numpy as np

# ─── Muat konfigurasi ─────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Tambahkan path Model/ ke sys.path agar bisa import
sys.path.insert(0, SCRIPT_DIR)


def load_config():
    import yaml

    config_path = os.path.join(SCRIPT_DIR, "config.yaml")
    registry_path = os.path.join(SCRIPT_DIR, "model_registry.yaml")

    with open(config_path, "r") as f:
        config = yaml.safe_load(f)

    with open(registry_path, "r") as f:
        registry = yaml.safe_load(f)

    return config, registry


def load_model(model_name=None):
    """Muat model YOLO dari registry berdasarkan nama atau config default."""
    from ultralytics import YOLO

    config, registry = load_config()

    if model_name is None:
        model_name = config["model"]["active_model"]

    if model_name not in registry.get("models", {}):
        print(f"[ERROR] Model '{model_name}' tidak ditemukan di registry.")
        print(f"  Model tersedia: {list(registry.get('models', {}).keys())}")
        sys.exit(1)

    entry = registry["models"][model_name]
    weights_path = os.path.join(SCRIPT_DIR, entry["weights_path"])

    if not os.path.exists(weights_path):
        # Fallback
        fallback = os.path.join(SCRIPT_DIR, config["model"]["fallback_weights"])
        if os.path.exists(fallback):
            print(f"[WARNING] {weights_path} tidak ditemukan.")
            print(f"[INFO] Fallback ke: {fallback}")
            weights_path = fallback
        else:
            print(f"[ERROR] Model file tidak ditemukan: {weights_path}")
            print(f"[ERROR] Fallback juga tidak ada: {fallback}")
            sys.exit(1)

    print(f"[INFO] Loading model: {model_name}")
    print(f"[INFO] Path: {weights_path}")
    return YOLO(weights_path), model_name


def test_image(model, image_path, conf=0.40, save=False, save_dir="output"):
    """Deteksi pada 1 file gambar."""
    print(f"\n{'=' * 60}")
    print(f"  FILE: {os.path.basename(image_path)}")
    print(f"{'=' * 60}")

    if not os.path.exists(image_path):
        print(f"[ERROR] File tidak ditemukan: {image_path}")
        return []

    # Baca gambar
    frame = cv2.imread(image_path)
    if frame is None:
        print(f"[ERROR] Gagal membaca gambar: {image_path}")
        return []

    h, w = frame.shape[:2]
    print(f"  Resolusi: {w} x {h} px")

    # Inferensi
    start_time = time.time()
    results = model(frame, conf=conf, verbose=False)
    infer_time = time.time() - start_time
    result = results[0]

    print(f"  Waktu inferensi: {infer_time * 1000:.1f} ms")
    print(f"  Jumlah deteksi: {len(result.boxes) if result.boxes is not None else 0}")
    print()

    # Kumpulkan deteksi
    detections = []
    if result.boxes is not None:
        print(f"  {'No':<4} {'Kelas':<20} {'Conf':<8} {'Area':<10} {'BBox'}")
        print(f"  {'-' * 54}")
        for i, box in enumerate(result.boxes):
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])
            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]

            # Hitung area
            area_px = (x2 - x1) * (y2 - y1)

            class_name = (
                model.names[class_id] if class_id < len(model.names) else str(class_id)
            )

            detections.append(
                {
                    "no": i + 1,
                    "class_id": class_id,
                    "class_name": class_name,
                    "confidence": round(confidence, 4),
                    "bbox": (x1, y1, x2, y2),
                    "area_px": area_px,
                }
            )

            print(
                f"  {i + 1:<4} {class_name:<20} {confidence:.4f}  {area_px:<8} ({x1},{y1})-({x2},{y2})"
            )
        print()

    # Simpan gambar anotasi
    if save:
        os.makedirs(save_dir, exist_ok=True)
        annotated = result.plot()
        out_name = f"annotated_{Path(image_path).stem}.jpg"
        out_path = os.path.join(save_dir, out_name)
        cv2.imwrite(out_path, annotated)
        print(f"  [SAVED] Gambar anotasi: {out_path}")

    return detections


def test_video(
    model, video_path, conf=0.40, save=False, save_dir="output", max_frames=None
):
    """Deteksi pada file video frame per frame."""
    print(f"\n{'=' * 60}")
    print(f"  VIDEO: {os.path.basename(video_path)}")
    print(f"{'=' * 60}")

    if not os.path.exists(video_path):
        print(f"[ERROR] File tidak ditemukan: {video_path}")
        return

    # Buka video
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[ERROR] Gagal membuka video: {video_path}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    print(f"  Resolusi: {frame_w} x {frame_h} px")
    print(f"  FPS: {fps:.1f}")
    print(f"  Total frame: {total_frames}")
    if max_frames:
        print(f"  Diproses: {max_frames} frame (max)")
    print()

    if save:
        os.makedirs(save_dir, exist_ok=True)

        # Output video
        out_video_path = os.path.join(
            save_dir, f"annotated_{Path(video_path).stem}.mp4"
        )
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out_video = cv2.VideoWriter(out_video_path, fourcc, fps, (frame_w, frame_h))

        # Output CSV log
        csv_path = os.path.join(save_dir, f"detections_{Path(video_path).stem}.csv")
        csv_file = open(csv_path, "w", newline="")
        csv_writer = csv.writer(csv_file)
        csv_writer.writerow(
            [
                "frame",
                "class_id",
                "class_name",
                "confidence",
                "x1",
                "y1",
                "x2",
                "y2",
                "area_px",
            ]
        )

    # Proses frame
    frame_count = 0
    total_detections = 0
    total_infer_time = 0
    all_detections = []

    while True:
        ret, frame = cap.read()
        if not ret or (max_frames and frame_count >= max_frames):
            break

        # Inferensi
        start_time = time.time()
        results = model(frame, conf=conf, verbose=False)
        infer_time = time.time() - start_time
        total_infer_time += infer_time
        result = results[0]

        frame_detections = []
        if result.boxes is not None:
            for box in result.boxes:
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
                area_px = (x2 - x1) * (y2 - y1)
                class_name = (
                    model.names[class_id]
                    if class_id < len(model.names)
                    else str(class_id)
                )

                frame_detections.append(
                    {
                        "frame": frame_count + 1,
                        "class_id": class_id,
                        "class_name": class_name,
                        "confidence": round(confidence, 4),
                        "bbox": (x1, y1, x2, y2),
                        "area_px": area_px,
                    }
                )

                total_detections += 1

                if save:
                    csv_writer.writerow(
                        [
                            frame_count + 1,
                            class_id,
                            class_name,
                            round(confidence, 4),
                            x1,
                            y1,
                            x2,
                            y2,
                            area_px,
                        ]
                    )

        if save:
            annotated = result.plot()
            out_video.write(annotated)

        # Progress
        frame_count += 1
        if (
            frame_count % 50 == 0
            or frame_count == total_frames
            or (max_frames and frame_count == max_frames)
        ):
            print(
                f"  Frame {frame_count}/{min(total_frames, max_frames or total_frames)} "
                f"| Deteksi: {total_detections} | "
                f"Rata-rata: {total_infer_time / frame_count * 1000:.1f}ms/frame",
                end="\r",
            )

        all_detections.extend(frame_detections)

    print()
    cap.release()

    if save:
        out_video.release()
        csv_file.close()
        print(f"\n  [SAVED] Video anotasi: {out_video_path}")
        print(f"  [SAVED] Log deteksi: {csv_path}")

    # Ringkasan
    avg_time = total_infer_time / frame_count if frame_count > 0 else 0
    print(f"\n  {'=' * 40}")
    print(f"  RINGKASAN VIDEO")
    print(f"  {'=' * 40}")
    print(f"  Frame diproses: {frame_count}")
    print(f"  Total deteksi: {total_detections}")
    print(f"  Waktu rata-rata/frame: {avg_time * 1000:.1f} ms")
    print(f"  Estimasi FPS: {1 / avg_time:.1f}" if avg_time > 0 else "")

    # Hitung per kelas
    if total_detections > 0:
        from collections import Counter

        class_counts = Counter(d["class_name"] for d in all_detections)
        print(f"  Deteksi per kelas:")
        for cls_name, count in class_counts.most_common():
            print(f"    - {cls_name}: {count}")

    return all_detections


def test_via_api(image_path, api_url="http://localhost:5000", conf=0.40):
    """Upload gambar ke API server yang sedang berjalan."""
    import requests

    print(f"\n{'=' * 60}")
    print(f"  TEST VIA API: {api_url}/detect")
    print(f"{'=' * 60}")

    if not os.path.exists(image_path):
        print(f"[ERROR] File tidak ditemukan: {image_path}")
        return

    with open(image_path, "rb") as f:
        files = {"image": f}
        data = {"conf": str(conf)}

        print(f"  Upload: {os.path.basename(image_path)}")
        print(f"  Conf: {conf}")

        try:
            resp = requests.post(
                f"{api_url}/detect", files=files, data=data, timeout=30
            )
            result = resp.json()

            if result.get("success"):
                dets = result.get("detections", [])
                print(f"\n  Deteksi: {len(dets)} objek")
                for d in dets:
                    b = d["bbox"]
                    print(
                        f"    {d['class_name']} | conf={d['confidence']:.4f} | area={d.get('area_px', '?')}px | "
                        f"({b['x1']},{b['y1']})-({b['x2']},{b['y2']})"
                    )
            else:
                print(f"[ERROR] API error: {result.get('error', 'unknown')}")

        except requests.exceptions.ConnectionError:
            print(f"[ERROR] Tidak bisa connect ke {api_url}")
            print("  Pastikan API server berjalan: python api.py")
        except Exception as e:
            print(f"[ERROR] {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Testing Tool — Deteksi Kerusakan Jalan",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Contoh:
  python test_model.py gambar.jpg
  python test_model.py gambar.jpg --save
  python test_model.py video.mp4 --save --max-frames 500
  python test_model.py gambar.jpg --model exp02_tambah_negatif --conf 0.5
  python test_model.py gambar.jpg --api http://localhost:5000
        """,
    )
    parser.add_argument(
        "input", nargs="?", help="Path ke file gambar (jpg/png) atau video (mp4/avi)"
    )
    parser.add_argument(
        "--model", help="Nama model di registry (default: active_model di config.yaml)"
    )
    parser.add_argument(
        "--conf",
        type=float,
        default=None,
        help="Confidence threshold (default: dari config.yaml)",
    )
    parser.add_argument(
        "--save", action="store_true", help="Simpan hasil anotasi ke folder output/"
    )
    parser.add_argument(
        "--save-dir", default="output", help="Folder output (default: output/)"
    )
    parser.add_argument(
        "--api",
        help="URL API server untuk test via API (contoh: http://localhost:5000)",
    )
    parser.add_argument(
        "--max-frames", type=int, default=None, help="Maksimal frame untuk video"
    )
    parser.add_argument(
        "--info", action="store_true", help="Tampilkan info model & registry saja"
    )

    args = parser.parse_args()

    # Mode: info model
    if args.info:
        config, registry = load_config()
        active = config["model"]["active_model"]
        print(f"\n{'=' * 50}")
        print(f"  KONFIGURASI MODEL")
        print(f"{'=' * 50}")
        print(f"  Model aktif : {active}")
        print(f"  Default conf: {config['model']['confidence_threshold']}")
        print(f"  Min area    : {config['detection']['min_area_px']} px")
        print(f"  Quality chk : {config['detection']['enable_quality_check']}")
        print(f"\n  Model tersedia:")
        for name, entry in registry.get("models", {}).items():
            loaded = (
                "✅"
                if os.path.exists(os.path.join(SCRIPT_DIR, entry["weights_path"]))
                else "❌"
            )
            marker = "▶ ACTIVE" if name == active else "   "
            print(f"    {marker} {loaded} {name}")
            if entry.get("test_map50_box"):
                print(
                    f"           Box mAP50: {entry['test_map50_box']:.4f} | Mask mAP50: {entry.get('test_map50_mask', 0):.4f}"
                )
            else:
                print(f"           (belum dievaluasi)")
        return

    # Validasi input file
    if not os.path.exists(args.input):
        print(f"[ERROR] File tidak ditemukan: {args.input}")
        sys.exit(1)

    # Tentukan mode: API atau direct
    if args.api:
        conf = args.conf if args.conf else 0.40
        test_via_api(args.input, args.api, conf)
        return

    # ─── Mode Direct ───────────────────────────

    # Load model
    model, model_name = load_model(args.model)

    # Konfigurasi
    config, _ = load_config()
    conf = (
        args.conf if args.conf is not None else config["model"]["confidence_threshold"]
    )

    print(f"\n  Model  : {model_name}")
    print(f"  Conf   : {conf}")
    print(f"  File   : {args.input}")
    print(f"  Save   : {'YES' if args.save else 'NO'}")

    # Cek tipe file
    img_exts = (".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff")
    vid_exts = (".mp4", ".avi", ".mov", ".mkv", ".wmv")

    ext = Path(args.input).suffix.lower()

    if ext in img_exts:
        test_image(model, args.input, conf=conf, save=args.save, save_dir=args.save_dir)

    elif ext in vid_exts:
        test_video(
            model,
            args.input,
            conf=conf,
            save=args.save,
            save_dir=args.save_dir,
            max_frames=args.max_frames,
        )

    else:
        print(f"[ERROR] Format tidak dikenal: {ext}")
        print(f"  Format gambar: {img_exts}")
        print(f"  Format video : {vid_exts}")
        sys.exit(1)


if __name__ == "__main__":
    main()
