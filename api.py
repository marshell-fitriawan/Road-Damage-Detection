import base64
import io
import numpy as np
import cv2
from flask import Flask, request, jsonify, Response, render_template_string
from ultralytics import YOLO
from PIL import Image

app = Flask(__name__)

model = YOLO("runs/segment/train/weights/best.pt")

CLASS_NAMES = ['Retak-Buaya', 'Retak-Memanjang', 'Retak-Melintang', 'Lubang']

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
        <tr><td>conf</td><td>float (opsional)</td><td>Confidence threshold (default: 0.15)</td></tr>
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
    return jsonify({
        "status": "ok",
        "model": "YOLOv8n-seg",
        "classes": CLASS_NAMES  # ['Retak-Buaya', 'Retak-Memanjang', 'Retak-Melintang', 'Lubang']
    })


# ─────────────────────────────────────────────
#  POST /detect — Deteksi dari gambar upload
# ─────────────────────────────────────────────
@app.route("/detect", methods=["POST"])
def detect():
    if "image" not in request.files:
        return jsonify({"success": False, "error": "Tidak ada file 'image' dalam request"}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"success": False, "error": "File kosong"}), 400

    # Ambil parameter opsional
    conf = float(request.form.get("conf", 0.15))
    return_image = request.form.get("return_image", "true").lower() != "false"

    # Baca gambar
    image_bytes = file.read()
    np_arr = np.frombuffer(image_bytes, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if frame is None:
        return jsonify({"success": False, "error": "Gagal membaca gambar"}), 400

    # Jalankan inferensi
    results = model(frame, conf=conf, verbose=False)
    result = results[0]

    # Kumpulkan deteksi
    detections = []
    if result.boxes is not None:
        for box in result.boxes:
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])
            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
            detections.append({
                "class_id": class_id,
                "class_name": CLASS_NAMES[class_id] if class_id < len(CLASS_NAMES) else str(class_id),
                "confidence": round(confidence, 4),
                "bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2}
            })

    # Buat gambar anotasi (opsional)
    image_base64 = None
    if return_image:
        annotated = result.plot()
        _, buffer = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
        image_base64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode("utf-8")

    return jsonify({
        "success": True,
        "total_detections": len(detections),
        "detections": detections,
        "image_base64": image_base64
    })


# ─────────────────────────────────────────────
#  GET /stream — Live webcam MJPEG stream
# ─────────────────────────────────────────────
def generate_stream(conf=0.15):
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    while True:
        success, frame = cap.read()
        if not success:
            frame = np.zeros((480, 640, 3), dtype="uint8")
            cv2.putText(frame, "Kamera tidak tersedia", (80, 240),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
            _, buffer = cv2.imencode(".jpg", frame)
            yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n")
            continue

        results = model(frame, conf=conf, verbose=False)
        annotated = results[0].plot()
        _, buffer = cv2.imencode(".jpg", annotated)
        yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n")

    cap.release()


@app.route("/stream")
def stream():
    conf = float(request.args.get("conf", 0.15))
    return Response(
        generate_stream(conf),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


if __name__ == "__main__":
    print("API berjalan di http://localhost:5000")
    print("Dokumentasi: http://localhost:5000/")
    app.run(host="0.0.0.0", port=5000, debug=False)
