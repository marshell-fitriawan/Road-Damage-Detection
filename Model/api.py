import base64
import io
import os

import cv2
import numpy as np
import yaml
from flask import Flask, Response, jsonify, render_template_string, request
from flask_cors import CORS
from PIL import Image
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)  # Izinkan CORS untuk semua origin

# ─── Muat konfigurasi ─────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(SCRIPT_DIR, "config.yaml")
REGISTRY_PATH = os.path.join(SCRIPT_DIR, "model_registry.yaml")


def _load_config():
    with open(CONFIG_PATH, "r") as f:
        return yaml.safe_load(f)


def _load_registry():
    with open(REGISTRY_PATH, "r") as f:
        return yaml.safe_load(f)


config = _load_config()

# Baca konfigurasi
ACTIVE_MODEL_NAME = config["model"]["active_model"]
DEFAULT_CONF = config["model"]["confidence_threshold"]
IOU_THRESHOLD = config["model"]["iou_threshold"]
MIN_DETECTION_AREA = config["detection"]["min_area_px"]
MIN_BRIGHTNESS = config["detection"]["min_brightness"]
MIN_BLUR_SCORE = config["detection"]["min_blur_score"]
ENABLE_QUALITY_CHECK = config["detection"]["enable_quality_check"]


# ─── Muat model ────────────────────────────────
def _load_model(model_name):
    """Muat model berdasarkan nama dari registry."""
    registry = _load_registry()
    if model_name not in registry.get("models", {}):
        print(f"[ERROR] Model '{model_name}' tidak ditemukan di model_registry.yaml")
        # Fallback: coba langsung dari runs/
        fallback = os.path.join(SCRIPT_DIR, "runs/segment/train/weights/best.pt")
        if os.path.exists(fallback):
            print(f"[INFO] Fallback ke: {fallback}")
            return YOLO(fallback)
        raise FileNotFoundError(f"Model '{model_name}' tidak ditemukan")

    entry = registry["models"][model_name]
    weights_path = os.path.join(SCRIPT_DIR, entry["weights_path"])

    if not os.path.exists(weights_path):
        print(f"[WARNING] {weights_path} tidak ditemukan")
        fallback = os.path.join(SCRIPT_DIR, config["model"]["fallback_weights"])
        if os.path.exists(fallback):
            print(f"[INFO] Fallback ke: {fallback}")
            return YOLO(fallback)
        raise FileNotFoundError(f"Model file tidak ditemukan: {weights_path}")

    print(f"[INFO] Loading model: {model_name} ({weights_path})")
    return YOLO(weights_path)


model = _load_model(ACTIVE_MODEL_NAME)
CLASS_NAMES = ["Retak-Buaya", "Retak-Memanjang", "Retak-Melintang", "Lubang"]

# ─────────────────────────────────────────────
#  HTML dokumentasi API (tampil di GET /)
# ─────────────────────────────────────────────
DOCS_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>Road Damage Detection API</title>
    <style>
        body { background:#1a1a2e; color:#eee; font-family:Arial,sans-serif; padding:30px; }
        h1 { color:#e94560; }
        h2 { color:#e94560; margin-top:30px; }
        code { background:#0f3460; padding:2px 8px; border-radius:4px; font-size:14px; }
        pre { background:#0f3460; padding:16px; border-radius:8px; overflow-x:auto; }
        .badge { display:inline-block; padding:3px 10px; border-radius:4px; font-size:12px; font-weight:bold; margin-right:8px; }
        .post { background:#e94560; }
        .get  { background:#27ae60; }
        table { border-collapse:collapse; width:100%; margin-top:10px; }
        th, td { border:1px solid #333; padding:8px 12px; text-align:left; }
        th { background:#16213e; color:#e94560; }
    </style>
</head>
<body>
    <h1>Road Damage Detection API</h1>
    <p>YOLOv8 Instance Segmentation &mdash; REST API untuk integrasi Laravel/web lain</p>

    <h2><span class="badge post">POST</span> /detect</h2>
    <p>Deteksi kerusakan jalan dari gambar yang diunggah.</p>
    <table>
        <tr><th>Parameter</th><th>Tipe</th><th>Keterangan</th></tr>
        <tr><td>image</td><td>file (multipart/form-data)</td><td>File gambar (jpg/png)</td></tr>
        <tr><td>conf</td><td>float (opsional)</td><td>Confidence threshold (default: 0.40)</td></tr>
        <tr><td>return_image</td><td>bool (opsional)</td><td>Kembalikan gambar hasil anotasi (default: true)</td></tr>
    </table>
    <h3>Contoh Response:</h3>
    <pre>{
  "success": true,
  "total_detections": 2,
  "detections": [
    {
      "class_id": 3,
      "class_name": "pothole",
      "confidence": 0.87,
      "bbox": { "x1": 120, "y1": 80, "x2": 300, "y2": 210 }
    },
    {
      "class_id": 1,
      "class_name": "Crack-long",
      "confidence": 0.72,
      "bbox": { "x1": 50, "y1": 200, "x2": 180, "y2": 260 }
    }
  ],
  "image_base64": "data:image/jpeg;base64,/9j/4AAQ..."
}</pre>

    <h2><span class="badge get">GET</span> /stream</h2>
    <p>Live video stream dari webcam dengan anotasi YOLOv8 (MJPEG).</p>
    <p>Gunakan: <code>&lt;img src="http://localhost:5000/stream"&gt;</code></p>

    <h2><span class="badge get">GET</span> /health</h2>
    <p>Cek status API.</p>
    <pre>{ "status": "ok", "model": "YOLOv8n-seg", "classes": ["Crack-alligator", "Crack-long", "Crack-trans", "pothole"] }</pre>
</body>
</html>
"""


# ─────────────────────────────────────────────
#  GET / — Dokumentasi API
# ─────────────────────────────────────────────
@app.route("/", methods=["GET"])
def docs():
    return render_template_string(DOCS_HTML)


# ─────────────────────────────────────────────
#  GET /health — Status API
# ─────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify(
        {
            "status": "ok",
            "active_model": ACTIVE_MODEL_NAME,
            "model": "YOLOv8n-seg",
            "classes": CLASS_NAMES,
            "config": {
                "confidence_threshold": DEFAULT_CONF,
                "iou_threshold": IOU_THRESHOLD,
                "min_area_px": MIN_DETECTION_AREA,
                "quality_check": ENABLE_QUALITY_CHECK,
            },
        }
    )


# ─────────────────────────────────────────────
#  POST /detect — Deteksi dari gambar upload
# ─────────────────────────────────────────────
@app.route("/detect", methods=["POST"])
def detect():
    if "image" not in request.files:
        return jsonify(
            {"success": False, "error": "Tidak ada file 'image' dalam request"}
        ), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"success": False, "error": "File kosong"}), 400

    # Ambil parameter opsional
    conf = float(request.form.get("conf", DEFAULT_CONF))
    return_image = request.form.get("return_image", "true").lower() != "false"

    # Baca gambar
    image_bytes = file.read()
    np_arr = np.frombuffer(image_bytes, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if frame is None:
        return jsonify({"success": False, "error": "Gagal membaca gambar"}), 400

    # Periksa kualitas gambar
    quality_check = _check_image_quality(frame)
    if not quality_check["passed"]:
        return jsonify(
            {
                "success": False,
                "error": f"Kualitas gambar tidak memadai: {quality_check['reason']}",
            }
        ), 400

    # Jalankan inferensi
    results = model(frame, conf=conf, verbose=False)
    result = results[0]

    # Kumpulkan deteksi dengan filter
    detections = []
    if result.boxes is not None:
        for box in result.boxes:
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])
            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
            area_px = (x2 - x1) * (y2 - y1)

            # Filter: skip deteksi terlalu kecil (kemungkinan besar false positive)
            if area_px < MIN_DETECTION_AREA:
                continue

            detections.append(
                {
                    "class_id": class_id,
                    "class_name": CLASS_NAMES[class_id]
                    if class_id < len(CLASS_NAMES)
                    else str(class_id),
                    "confidence": round(confidence, 4),
                    "bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                    "area_px": area_px,
                }
            )

    # Buat gambar anotasi (opsional)
    image_base64 = None
    if return_image:
        annotated = result.plot()
        _, buffer = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
        image_base64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode(
            "utf-8"
        )

    return jsonify(
        {
            "success": True,
            "total_detections": len(detections),
            "detections": detections,
            "image_base64": image_base64,
        }
    )


# ─────────────────────────────────────────────
#  GET /stream — Live webcam MJPEG stream
# ─────────────────────────────────────────────
def generate_stream(conf=DEFAULT_CONF):
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    while True:
        success, frame = cap.read()
        if not success:
            frame = np.zeros((480, 640, 3), dtype="uint8")
            cv2.putText(
                frame,
                "Kamera tidak tersedia",
                (80, 240),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.9,
                (0, 0, 255),
                2,
            )
            _, buffer = cv2.imencode(".jpg", frame)
            yield (
                b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"
                + buffer.tobytes()
                + b"\r\n"
            )
            continue

        # Skip frame kualitas rendah untuk streaming
        quality_check = _check_image_quality(frame)
        if not quality_check["passed"]:
            # Kirim frame polos tanpa deteksi
            _, buffer = cv2.imencode(".jpg", frame)
            yield (
                b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"
                + buffer.tobytes()
                + b"\r\n"
            )
            continue

        results = model(frame, conf=conf, verbose=False)
        annotated = results[0].plot()
        _, buffer = cv2.imencode(".jpg", annotated)
        yield (
            b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n"
        )

    cap.release()


@app.route("/stream")
def stream():
    conf = float(request.args.get("conf", DEFAULT_CONF))
    return Response(
        generate_stream(conf), mimetype="multipart/x-mixed-replace; boundary=frame"
    )


# ─────────────────────────────────────────────
#  POST /switch-model — Ganti model aktif tanpa restart
# ─────────────────────────────────────────────
@app.route("/switch-model", methods=["POST"])
def switch_model():
    """Ganti model aktif tanpa restart server.
    Request: JSON { "model": "exp02_tambah_negatif" }
    """
    global model, ACTIVE_MODEL_NAME

    data = request.get_json()
    if not data or "model" not in data:
        return jsonify({"success": False, "error": "Parameter 'model' diperlukan"}), 400

    new_model_name = data["model"]

    # Validasi: cek apakah model ada di registry
    registry = _load_registry()
    if new_model_name not in registry.get("models", {}):
        return jsonify(
            {
                "success": False,
                "error": f"Model '{new_model_name}' tidak ditemukan di registry",
                "available_models": list(registry.get("models", {}).keys()),
            }
        ), 404

    try:
        # Simpan config lama untuk rollback jika gagal
        old_model = ACTIVE_MODEL_NAME
        old_model_obj = model

        new_model = _load_model(new_model_name)

        # Update config.yaml
        config["model"]["active_model"] = new_model_name
        with open(CONFIG_PATH, "w") as f:
            yaml.dump(config, f, default_flow_style=False, indent=2, allow_unicode=True)

        # Ganti model di memori
        model = new_model
        ACTIVE_MODEL_NAME = new_model_name

        print(f"[SWITCH] Model berubah: {old_model} -> {new_model_name}")

        return jsonify(
            {
                "success": True,
                "message": f"Model berubah dari '{old_model}' ke '{new_model_name}'",
                "active_model": new_model_name,
            }
        )

    except Exception as e:
        # Rollback
        model = old_model_obj
        ACTIVE_MODEL_NAME = old_model
        config["model"]["active_model"] = old_model
        return jsonify({"success": False, "error": f"Gagal load model: {str(e)}"}), 500


# ─────────────────────────────────────────────
#  GET /models — Daftar semua model yang tersedia
# ─────────────────────────────────────────────
@app.route("/models", methods=["GET"])
def list_models():
    """Tampilkan semua model di registry beserta statusnya."""
    registry = _load_registry()
    available = []
    for name, entry in registry.get("models", {}).items():
        weights_path = os.path.join(SCRIPT_DIR, entry["weights_path"])
        available.append(
            {
                "name": name,
                "base_model": entry["base_model"],
                "loaded": os.path.exists(weights_path),
                "active": name == ACTIVE_MODEL_NAME,
                "map50": entry.get("map50"),
                "recall": entry.get("recall"),
                "notes": entry.get("notes", ""),
            }
        )
    return jsonify(
        {
            "active_model": ACTIVE_MODEL_NAME,
            "total": len(available),
            "models": available,
        }
    )


# ─────────────────────────────────────────────
#  Function: Periksa kualitas gambar
# ─────────────────────────────────────────────
def _check_image_quality(frame):
    """Periksa apakah gambar layak untuk deteksi.
    Cek: 1) Terlalu gelap, 2) Terlalu blur.
    Jika ENABLE_QUALITY_CHECK = False, skip semua pemeriksaan.
    """
    if not ENABLE_QUALITY_CHECK:
        return {"passed": True}

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    mean_brightness = gray.mean()
    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()

    if mean_brightness < MIN_BRIGHTNESS:
        return {
            "passed": False,
            "reason": f"Frame terlalu gelap ({mean_brightness:.0f}/255), minimum {MIN_BRIGHTNESS}",
        }
    if blur_score < MIN_BLUR_SCORE:
        return {
            "passed": False,
            "reason": f"Frame terlalu blur ({blur_score:.0f}), minimum {MIN_BLUR_SCORE}",
        }

    return {"passed": True}


if __name__ == "__main__":
    print("=" * 50)
    print("  ROAD DAMAGE DETECTION API")
    print(f"  Model aktif : {ACTIVE_MODEL_NAME}")
    print(f"  Conf        : {DEFAULT_CONF} (default)")
    print(f"  Min area    : {MIN_DETECTION_AREA} px")
    print(f"  Quality chk : {ENABLE_QUALITY_CHECK}")
    print("=" * 50)
    print("  Dokumentasi : http://localhost:5000/")
    print("  API berjalan : http://localhost:5000")
    print("  Daftar model: http://localhost:5000/models")
    app.run(
        host=config["flask"]["host"],
        port=config["flask"]["port"],
        debug=config["flask"]["debug"],
    )
