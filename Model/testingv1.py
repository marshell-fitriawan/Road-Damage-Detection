import base64
import datetime
import os
import socket

import cv2
import numpy as np
import yaml
from flask import (
    Flask,
    Response,
    jsonify,
    redirect,
    render_template_string,
    request,
    url_for,
)
from ultralytics import YOLO

app = Flask(__name__)

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
ACTIVE_MODEL_NAME = config["model"]["active_model"]
DEFAULT_CONF = config["model"]["confidence_threshold"]
MIN_DETECTION_AREA = config["detection"]["min_area_px"]


def _load_model(model_name):
    """Muat model berdasarkan nama dari registry."""
    registry = _load_registry()
    if model_name not in registry.get("models", {}):
        print(f"[ERROR] Model '{model_name}' tidak ditemukan di model_registry.yaml")
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

# Sumber kamera aktif: 0 = webcam laptop, atau URL IP Webcam HP
camera_source = 0
current_ip_url = ""

# Folder penyimpanan frame terbaik (FR6)
SAVE_DIR = "saved_frames"
os.makedirs(SAVE_DIR, exist_ok=True)

CLASS_NAMES = ["Retak-Buaya", "Retak-Memanjang", "Retak-Melintang", "Lubang"]
FRAME_WINDOW = 120  # FR6: rentang frame untuk memilih frame terbaik

# Konfigurasi deteksi (dari config.yaml)
# DEFAULT_CONF, MIN_DETECTION_AREA sudah dimuat dari config di atas
MIN_BRIGHTNESS = config["detection"]["min_brightness"]
MIN_BLUR_SCORE = config["detection"]["min_blur_score"]
ENABLE_QUALITY_CHECK = config["detection"]["enable_quality_check"]

# Kalibrasi luas: ketinggian kamera kepala motor/sepeda ~1.3-1.5m
# 0.30 cm/pixel pada resolusi 1280x720 (sesuaikan jika perlu)
CM_PER_PIXEL = 0.30


def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "localhost"


HTML = """
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <title>Deteksi Kerusakan Jalan</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background: #1a1a2e;
            color: #eee;
            font-family: Arial, sans-serif;
            min-height: 100vh;
            padding: 16px;
        }
        h1 {
            color: #e94560;
            font-size: clamp(18px, 5vw, 26px);
            text-align: center;
            margin-bottom: 4px;
        }
        .subtitle {
            color: #aaa;
            font-size: 13px;
            text-align: center;
            margin-bottom: 16px;
        }

        /* ── Tab menu ── */
        .tabs {
            display: flex;
            gap: 8px;
            justify-content: center;
            flex-wrap: wrap;
            margin-bottom: 16px;
        }
        .tab-btn {
            padding: 11px 18px;
            border: 2px solid #e94560;
            border-radius: 10px;
            background: transparent;
            color: #e94560;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            touch-action: manipulation;
            transition: background 0.15s;
        }
        .tab-btn.active, .tab-btn:hover {
            background: #e94560;
            color: #fff;
        }

        /* ── Panel ── */
        .panel { display: none; max-width: 720px; margin: 0 auto; }
        .panel.active { display: block; }

        /* ── Kamera HP panel ── */
        .info-box {
            background: #0f3460;
            border: 1px solid #335;
            border-radius: 8px;
            padding: 10px 14px;
            font-size: 12px;
            color: #aaa;
            margin-bottom: 12px;
            text-align: center;
        }
        .info-box span { color: #55ff55; font-weight: bold; }
        .go-btn {
            display: block;
            width: 100%;
            padding: 14px;
            background: #27ae60;
            color: #fff;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            text-decoration: none;
            text-align: center;
            touch-action: manipulation;
        }
        .go-btn:active { background: #1e8449; }

        /* ── Upload panel ── */
        .upload-area {
            border: 2px dashed #e94560;
            border-radius: 12px;
            padding: 28px 16px;
            text-align: center;
            cursor: pointer;
            background: #16213e;
            margin-bottom: 12px;
            transition: background 0.15s;
        }
        .upload-area:hover { background: #1a2a50; }
        .upload-area input[type=file] { display: none; }
        .upload-area .icon { font-size: 40px; margin-bottom: 8px; }
        .upload-area p { color: #aaa; font-size: 13px; }
        .upload-area .label { color: #e94560; font-weight: bold; font-size: 15px; }
        .detect-btn {
            display: block;
            width: 100%;
            padding: 13px;
            background: #e94560;
            color: #fff;
            border: none;
            border-radius: 10px;
            font-size: 15px;
            font-weight: bold;
            cursor: pointer;
            touch-action: manipulation;
        }
        .detect-btn:disabled { background: #555; cursor: not-allowed; }
        .detect-btn:not(:disabled):active { background: #c73652; }

        /* ── Preview & hasil ── */
        .preview-wrap {
            margin-top: 14px;
            display: none;
        }
        .preview-wrap img, .preview-wrap video {
            width: 100%;
            border: 3px solid #e94560;
            border-radius: 10px;
            display: block;
        }
        .result-wrap {
            margin-top: 12px;
            display: none;
        }
        .result-wrap img {
            width: 100%;
            border: 3px solid #55ff55;
            border-radius: 10px;
            display: block;
        }
        .det-info {
            margin-top: 8px;
            padding: 10px 14px;
            background: #16213e;
            border-radius: 8px;
            font-size: 13px;
            text-align: left;
        }
        .det-item { padding: 4px 0; border-bottom: 1px solid #223; }
        .det-item:last-child { border-bottom: none; }
        .conf { color: #aaa; font-size: 12px; }

        /* ── Spinner ── */
        .spinner {
            display: none;
            margin: 16px auto;
            width: 36px; height: 36px;
            border: 4px solid #333;
            border-top-color: #e94560;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Legend ── */
        .legend {
            display: flex; flex-wrap: wrap; gap: 10px;
            justify-content: center; margin-top: 16px;
        }
        .legend-item { display: flex; align-items: center; gap: 5px; font-size: 12px; }
        .dot { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; }

        /* ── Video hasil frame-by-frame ── */
        #video-result-canvas {
            width: 100%;
            border: 3px solid #55ff55;
            border-radius: 10px;
            display: none;
        }
        .progress-bar-wrap {
            background: #16213e;
            border-radius: 6px;
            height: 8px;
            margin-top: 8px;
            display: none;
        }
        .progress-bar {
            background: #e94560;
            height: 100%;
            border-radius: 6px;
            width: 0%;
            transition: width 0.2s;
        }
    </style>
</head>
<body>
    <h1>&#128507; Deteksi Kerusakan Jalan</h1>
    <p class="subtitle">YOLOv8 Instance Segmentation &mdash; Real-Time</p>

    <!-- Tab Menu -->
    <div class="tabs">
        <button class="tab-btn active" onclick="switchTab('cam')">&#127909; Kamera HP</button>
        <button class="tab-btn" onclick="switchTab('photo')">&#128444; Upload Foto</button>
        <button class="tab-btn" onclick="switchTab('video')">&#127916; Upload Video</button>
        <a href="/saved_frames" style="padding:11px 18px;border:2px solid #27ae60;border-radius:10px;background:transparent;color:#27ae60;font-size:14px;font-weight:bold;text-decoration:none;">&#128190; Frame Tersimpan</a>
    </div>

    <!-- Panel: Kamera HP -->
    <div id="panel-cam" class="panel active">
        <div class="info-box">
            Buka dari HP: <span>https://{{ local_ip }}:5000/camera</span><br>
            <small>Pastikan HP &amp; laptop di WiFi yang sama. Izinkan peringatan sertifikat di browser.</small>
        </div>
        <a href="/camera" class="go-btn">&#127909; Buka Kamera HP Sekarang</a>
    </div>

    <!-- Panel: Upload Foto -->
    <div id="panel-photo" class="panel">
        <div class="upload-area" id="photo-drop" onclick="document.getElementById('photo-input').click()">
            <div class="icon">&#128444;</div>
            <div class="label">Pilih atau seret foto ke sini</div>
            <p>JPG / PNG &mdash; Maks 10 MB</p>
            <input type="file" id="photo-input" accept="image/jpeg,image/png" onchange="onPhotoSelect(event)">
        </div>
        <button class="detect-btn" id="photo-btn" disabled onclick="detectPhoto()">Deteksi Foto</button>
        <div class="spinner" id="photo-spinner"></div>
        <div class="preview-wrap" id="photo-preview-wrap">
            <img id="photo-preview" alt="Preview" />
        </div>
        <div class="result-wrap" id="photo-result-wrap">
            <img id="photo-result" alt="Hasil" />
            <div class="det-info" id="photo-det-info"></div>
        </div>
    </div>

    <!-- Panel: Upload Video -->
    <div id="panel-video" class="panel">
        <div class="upload-area" id="video-drop" onclick="document.getElementById('video-input').click()">
            <div class="icon">&#127916;</div>
            <div class="label">Pilih atau seret video ke sini</div>
            <p>MP4 / MOV / AVI &mdash; Maks 500 MB</p>
            <input type="file" id="video-input" accept="video/*" onchange="onVideoSelect(event)">
        </div>
        <button class="detect-btn" id="video-btn" disabled onclick="detectVideo()">Deteksi Video</button>
        <div class="spinner" id="video-spinner"></div>
        <div class="preview-wrap" id="video-preview-wrap">
            <video id="video-preview" controls muted playsinline></video>
        </div>
        <canvas id="video-result-canvas"></canvas>
        <div class="progress-bar-wrap" id="progress-wrap">
            <div class="progress-bar" id="progress-bar"></div>
        </div>
        <div class="det-info" id="video-det-info" style="margin-top:8px;display:none;"></div>
    </div>

    <!-- Legend -->
    <div class="legend">
        <div class="legend-item"><div class="dot" style="background:#ff5555"></div> Retak-Buaya</div>
        <div class="legend-item"><div class="dot" style="background:#55ff55"></div> Retak-Memanjang</div>
        <div class="legend-item"><div class="dot" style="background:#5555ff"></div> Retak-Melintang</div>
        <div class="legend-item"><div class="dot" style="background:#ffff55"></div> Lubang</div>
    </div>

    <script>
    // ── Tab switch ──
    function switchTab(id) {
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('panel-' + id).classList.add('active');
        event.target.classList.add('active');
    }

    // ── Upload Foto ──
    var photoFile = null;

    function onPhotoSelect(e) {
        photoFile = e.target.files[0];
        if (!photoFile) return;
        var url = URL.createObjectURL(photoFile);
        document.getElementById('photo-preview').src = url;
        document.getElementById('photo-preview-wrap').style.display = 'block';
        document.getElementById('photo-result-wrap').style.display = 'none';
        document.getElementById('photo-btn').disabled = false;
    }

    function detectPhoto() {
        if (!photoFile) return;
        document.getElementById('photo-spinner').style.display = 'block';
        document.getElementById('photo-btn').disabled = true;
        document.getElementById('photo-result-wrap').style.display = 'none';

        var form = new FormData();
        form.append('image', photoFile, photoFile.name);

        fetch('/detect_frame', { method: 'POST', body: form })
            .then(r => r.json())
            .then(data => {
                document.getElementById('photo-spinner').style.display = 'none';
                document.getElementById('photo-btn').disabled = false;
                if (!data.success) { alert('Error: ' + data.error); return; }

                document.getElementById('photo-result').src = data.image_base64;
                document.getElementById('photo-result-wrap').style.display = 'block';

                var info = document.getElementById('photo-det-info');
                if (data.total_detections === 0) {
                    info.innerHTML = '<span style="color:#aaa">Tidak ada kerusakan terdeteksi.</span>';
                } else {
                    info.innerHTML = '<b style="color:#e94560">' + data.total_detections + ' kerusakan terdeteksi:</b>';
                    data.detections.forEach(function(d, i) {
                        info.innerHTML += '<div class="det-item">' + (i+1) + '. ' + d.class_name +
                            ' <span class="conf">(' + (d.confidence*100).toFixed(1) + '%)</span>' +
                            ' &mdash; <span style="color:#ffff55">' + d.area_cm2 + ' cm&sup2;</span>' +
                            ' <span style="color:#aaa;font-size:11px">(' + d.area_m2 + ' m&sup2;)</span></div>';
                    });
                    var total_cm2 = data.detections.reduce(function(s,d){return s+d.area_cm2;},0);
                    info.innerHTML += '<div style="margin-top:6px;color:#55ff55;font-weight:bold;">Total luas: ' +
                        total_cm2.toFixed(1) + ' cm&sup2; (' + (total_cm2/10000).toFixed(4) + ' m&sup2;)</div>';
                }
            })
            .catch(function(err) {
                document.getElementById('photo-spinner').style.display = 'none';
                document.getElementById('photo-btn').disabled = false;
                alert('Gagal menghubungi server: ' + err);
            });
    }

    // ── Upload Video ──
    var videoFile = null;
    var videoProcessing = false;

    function onVideoSelect(e) {
        videoFile = e.target.files[0];
        if (!videoFile) return;
        var url = URL.createObjectURL(videoFile);
        document.getElementById('video-preview').src = url;
        document.getElementById('video-preview-wrap').style.display = 'block';
        document.getElementById('video-btn').disabled = false;
        document.getElementById('video-result-canvas').style.display = 'none';
        document.getElementById('progress-wrap').style.display = 'none';
    }

    function detectVideo() {
        if (!videoFile || videoProcessing) return;
        videoProcessing = true;

        var video = document.createElement('video');
        video.src = URL.createObjectURL(videoFile);
        video.muted = true;

        var canvas  = document.getElementById('video-result-canvas');
        var ctx     = canvas.getContext('2d');
        var captureCanvas = document.createElement('canvas');
        var captureCtx    = captureCanvas.getContext('2d');

        var spinner  = document.getElementById('video-spinner');
        var btn      = document.getElementById('video-btn');
        var progWrap = document.getElementById('progress-wrap');
        var progBar  = document.getElementById('progress-bar');
        var detInfo  = document.getElementById('video-det-info');

        spinner.style.display = 'block';
        btn.disabled = true;
        canvas.style.display = 'none';
        progWrap.style.display = 'none';
        detInfo.style.display = 'none';

        video.onloadedmetadata = function() {
            var duration = video.duration;
            var fps      = 5; // proses 5 frame per detik
            var interval = 1 / fps;
            var times    = [];
            for (var t = 0; t < duration; t += interval) times.push(t);

            captureCanvas.width  = video.videoWidth;
            captureCanvas.height = video.videoHeight;
            canvas.width         = video.videoWidth;
            canvas.height        = video.videoHeight;
            canvas.style.display = 'block';
            progWrap.style.display = 'block';
            spinner.style.display = 'none';

            var idx = 0;
            var totalDet = 0;

            function processNext() {
                if (idx >= times.length) {
                    btn.disabled = false;
                    videoProcessing = false;
                    detInfo.style.display = 'block';
                    detInfo.innerHTML = '<b style="color:#e94560">Selesai.</b> Total deteksi selama video: <b style="color:#55ff55">' + totalDet + '</b>';
                    return;
                }
                video.currentTime = times[idx];
            }

            video.onseeked = function() {
                captureCtx.drawImage(video, 0, 0);
                captureCanvas.toBlob(function(blob) {
                    var form = new FormData();
                    form.append('image', blob, 'frame.jpg');
                    fetch('/detect_frame', { method: 'POST', body: form })
                        .then(r => r.json())
                        .then(function(data) {
                            if (data.image_base64) {
                                var img = new Image();
                                img.onload = function() {
                                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                                };
                                img.src = data.image_base64;
                            }
                            totalDet += (data.total_detections || 0);
                            idx++;
                            progBar.style.width = ((idx / times.length) * 100).toFixed(1) + '%';
                            processNext();
                        })
                        .catch(function() {
                            idx++;
                            processNext();
                        });
                }, 'image/jpeg', 0.8);
            };

            processNext();
        };

        video.onerror = function() {
            spinner.style.display = 'none';
            btn.disabled = false;
            videoProcessing = false;
            alert('Gagal membaca video.');
        };

        video.load();
    }
    </script>
</body>
</html>
"""


def save_best_frame(frame, annotated, conf, class_name):
    """Simpan frame terbaik ke disk (FR6)."""
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    fname = f"{ts}_{class_name.replace('-', '_')}_conf{int(conf * 100)}.jpg"
    path = os.path.join(SAVE_DIR, fname)
    cv2.imwrite(path, annotated)
    return fname


def open_capture(source):
    cap = cv2.VideoCapture(source)
    if isinstance(source, int):
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    return cap


def generate_frames():
    global camera_source
    active_source = camera_source
    cap = open_capture(active_source)

    # FR6: state untuk auto-save frame terbaik
    frame_count = 0
    best_conf = 0.0
    best_frame = None
    best_annotated = None
    best_class = ""
    last_saved = ""  # nama file terakhir disimpan

    while True:
        # Jika source berubah (user ganti kamera), buka capture baru
        if camera_source != active_source:
            cap.release()
            active_source = camera_source
            cap = open_capture(active_source)
            # Reset window
            frame_count = 0
            best_conf = 0.0
            best_frame = None
            best_annotated = None

        success, frame = cap.read()
        if not success:
            frame = np.zeros((480, 640, 3), dtype="uint8")
            cv2.putText(
                frame,
                "Tidak dapat membaca kamera",
                (60, 240),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
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

        results = model(frame, conf=DEFAULT_CONF, verbose=False)
        result = results[0]
        annotated = result.plot()
        frame_count += 1

        # Hitung luas per objek dari mask segmentasi
        mask_areas = {}  # index -> (area_px, area_cm2)
        if result.masks is not None:
            img_h, img_w = frame.shape[:2]
            for i, mask_tensor in enumerate(result.masks.data):
                mask_np = mask_tensor.cpu().numpy()
                # resize mask ke resolusi asli jika berbeda
                if mask_np.shape != (img_h, img_w):
                    mask_np = cv2.resize(
                        mask_np, (img_w, img_h), interpolation=cv2.INTER_NEAREST
                    )
                area_px = int((mask_np > 0.5).sum())
                area_cm2 = area_px * (CM_PER_PIXEL**2)
                mask_areas[i] = (area_px, area_cm2)

        # Overlay luas pada tiap deteksi
        if result.boxes is not None and len(result.boxes) > 0:
            for i, box in enumerate(result.boxes):
                if i in mask_areas:
                    area_px, area_cm2 = mask_areas[i]
                    x1, y1 = int(box.xyxy[0][0]), int(box.xyxy[0][1])
                    label = f"{area_cm2:.0f} cm2 ({area_px}px)"
                    cv2.putText(
                        annotated,
                        label,
                        (x1, max(y1 - 6, 14)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.45,
                        (255, 255, 0),
                        1,
                        cv2.LINE_AA,
                    )

        # FR6: cek deteksi dengan confidence tertinggi di frame ini
        if result.boxes is not None and len(result.boxes) > 0:
            confs = result.boxes.conf.tolist()
            max_conf = max(confs)
            max_idx = confs.index(max_conf)
            cid = int(result.boxes.cls[max_idx])
            cname = CLASS_NAMES[cid] if cid < len(CLASS_NAMES) else str(cid)

            if max_conf > best_conf:
                best_conf = max_conf
                best_frame = frame.copy()
                best_annotated = annotated.copy()
                best_class = cname

        # FR6: setiap FRAME_WINDOW frame, simpan frame terbaik jika ada deteksi
        if frame_count >= FRAME_WINDOW:
            if best_frame is not None:
                last_saved = save_best_frame(
                    best_frame, best_annotated, best_conf, best_class
                )
                print(f"[FR6] Disimpan: {last_saved} (conf={best_conf:.2f})")
            # Reset window
            frame_count = 0
            best_conf = 0.0
            best_frame = None
            best_annotated = None

        # Tambahkan info simpan pada overlay
        if last_saved:
            cv2.putText(
                annotated,
                f"Tersimpan: {last_saved}",
                (8, annotated.shape[0] - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (0, 255, 100),
                1,
                cv2.LINE_AA,
            )

        _, buffer = cv2.imencode(".jpg", annotated)
        yield (
            b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n"
        )

    cap.release()


def get_single_frame():
    """Ambil satu frame untuk iOS polling."""
    global camera_source
    cap = open_capture(camera_source)
    success, frame = cap.read()
    cap.release()
    if not success:
        frame = np.zeros((480, 640, 3), dtype="uint8")
        cv2.putText(
            frame,
            "Tidak dapat membaca kamera",
            (60, 240),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 0, 255),
            2,
        )
        _, buffer = cv2.imencode(".jpg", frame)
        return buffer.tobytes()
    results = model(frame, conf=DEFAULT_CONF, verbose=False)
    annotated = results[0].plot()
    _, buffer = cv2.imencode(".jpg", annotated)
    return buffer.tobytes()


@app.route("/saved_frames")
def saved_frames_page():
    """Halaman daftar frame terbaik yang tersimpan (FR6)."""
    files = sorted(
        [f for f in os.listdir(SAVE_DIR) if f.endswith(".jpg")], reverse=True
    )
    rows = "".join(
        f'<div class="sf-item"><img src="/saved_frames/{f}" alt="{f}"><p>{f}</p></div>'
        for f in files
    )
    html = f"""
    <!DOCTYPE html><html lang="id"><head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Frame Tersimpan</title>
    <style>
        body{{background:#1a1a2e;color:#eee;font-family:Arial,sans-serif;padding:16px;}}
        h1{{color:#e94560;text-align:center;margin-bottom:16px;}}
        .grid{{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;}}
        .sf-item{{background:#16213e;border:2px solid #e94560;border-radius:8px;padding:8px;max-width:280px;text-align:center;}}
        .sf-item img{{width:100%;border-radius:6px;}}
        .sf-item p{{font-size:10px;color:#aaa;margin-top:6px;word-break:break-all;}}
        a{{display:inline-block;margin-bottom:16px;padding:10px 18px;background:#e94560;color:#fff;border-radius:8px;text-decoration:none;}}
        .empty{{color:#555;text-align:center;margin-top:40px;}}
    </style></head><body>
    <h1>&#128190; Frame Tersimpan (FR6)</h1>
    <a href="/">&larr; Kembali</a>
    <div class="grid">{rows if rows else '<p class="empty">Belum ada frame tersimpan.</p>'}</div>
    </body></html>
    """
    return html


@app.route("/saved_frames/<path:filename>")
def serve_saved_frame(filename):
    from flask import send_from_directory

    return send_from_directory(SAVE_DIR, filename)


@app.route("/")
def index():
    return render_template_string(HTML, local_ip=get_local_ip())


@app.route("/set_webcam", methods=["POST"])
def set_webcam():
    global camera_source
    camera_source = 0
    return redirect(url_for("index"))


@app.route("/set_ip", methods=["POST"])
def set_ip():
    global camera_source, current_ip_url
    ip_url = request.form.get("ip_url", "").strip()
    if ip_url:
        current_ip_url = ip_url
        camera_source = ip_url
    return redirect(url_for("index"))


@app.route("/video_feed")
def video_feed():
    return Response(
        generate_frames(), mimetype="multipart/x-mixed-replace; boundary=frame"
    )


@app.route("/frame")
def frame():
    """Endpoint satu frame JPEG untuk iOS Safari."""
    return Response(
        get_single_frame(), mimetype="image/jpeg", headers={"Cache-Control": "no-store"}
    )


CAMERA_HTML = """
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <title>Deteksi - Kamera HP</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background:#1a1a2e; color:#eee; font-family:Arial,sans-serif; text-align:center; padding:12px; }
        h1 { color:#e94560; font-size:clamp(16px,5vw,24px); margin-bottom:6px; }
        #status { color:#aaa; font-size:13px; margin:8px 0; min-height:20px; }
        #result { width:100%; max-width:900px; border:3px solid #e94560; border-radius:8px; display:block; margin:0 auto; min-height:200px; background:#0f3460; }
        #detinfo { margin-top:10px; font-size:14px; color:#55ff55; min-height:20px; }
        .legend { display:flex; flex-wrap:wrap; gap:10px; justify-content:center; margin-top:12px; }
        .legend-item { display:flex; align-items:center; gap:5px; font-size:12px; }
        .dot { width:11px; height:11px; border-radius:50%; flex-shrink:0; }
        .back { display:inline-block; margin-top:14px; padding:10px 20px; background:#e94560; color:#fff; border-radius:8px; text-decoration:none; font-size:14px; }
        #fps { color:#555; font-size:11px; margin-top:4px; }
    </style>
</head>
<body>
    <h1>&#127909; Deteksi Kamera HP</h1>
    <div id="status">Meminta ijin kamera...</div>
    <canvas id="capture" style="display:none"></canvas>
    <img id="result" alt="Hasil deteksi" />
    <div id="detinfo"></div>
    <div id="fps"></div>

    <div class="legend">
        <div class="legend-item"><div class="dot" style="background:#ff5555"></div> Retak-Buaya</div>
        <div class="legend-item"><div class="dot" style="background:#55ff55"></div> Retak-Memanjang</div>
        <div class="legend-item"><div class="dot" style="background:#5555ff"></div> Retak-Melintang</div>
        <div class="legend-item"><div class="dot" style="background:#ffff55"></div> Lubang</div>
    </div>

    <a href="/" class="back">&#8592; Kembali</a>

    <script>
        const status   = document.getElementById('status');
        const canvas   = document.getElementById('capture');
        const resultImg = document.getElementById('result');
        const detinfo  = document.getElementById('detinfo');
        const fpsEl    = document.getElementById('fps');
        const ctx      = canvas.getContext('2d');
        let processing = false;
        let lastTime   = performance.now();
        let frameCount = 0;

        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;

        navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: {ideal:1280}, height: {ideal:720} }
        }).then(stream => {
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                canvas.width  = video.videoWidth;
                canvas.height = video.videoHeight;
                status.textContent = 'Kamera aktif — mendeteksi...';
                requestAnimationFrame(loop);
            };
        }).catch(err => {
            status.textContent = 'Gagal akses kamera: ' + err.message;
            status.style.color = '#e94560';
        });

        function loop() {
            if (!processing) {
                processing = true;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(blob => {
                    const form = new FormData();
                    form.append('image', blob, 'frame.jpg');
                    fetch('/detect_frame', { method: 'POST', body: form })
                        .then(r => r.json())
                        .then(data => {
                            if (data.image_base64) resultImg.src = data.image_base64;
                            const n = data.total_detections || 0;
                            if (n > 0) {
                                var parts = data.detections.map(function(d){
                                    return d.class_name + ' ' + (d.confidence*100).toFixed(0)
                                           + '% ~' + d.area_cm2 + 'cm\u00b2';
                                });
                                detinfo.textContent = n + ' kerusakan: ' + parts.join(' | ');
                            } else {
                                detinfo.textContent = 'Tidak ada kerusakan terdeteksi';
                            }
                            // Hitung FPS
                            frameCount++;
                            const now = performance.now();
                            if (now - lastTime >= 1000) {
                                fpsEl.textContent = frameCount + ' FPS';
                                frameCount = 0;
                                lastTime = now;
                            }
                            processing = false;
                            requestAnimationFrame(loop);
                        })
                        .catch(() => { processing = false; requestAnimationFrame(loop); });
                }, 'image/jpeg', 0.8);
            } else {
                requestAnimationFrame(loop);
            }
        }
    </script>
</body>
</html>
"""


@app.route("/camera")
def camera_page():
    return render_template_string(CAMERA_HTML)


@app.route("/detect_frame", methods=["POST"])
def detect_frame():
    """Terima frame dari browser HP, kembalikan hasil deteksi JSON."""
    if "image" not in request.files:
        return jsonify({"success": False, "error": "Tidak ada gambar"}), 400

    file = request.files["image"]
    np_arr = np.frombuffer(file.read(), np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if frame is None:
        return jsonify({"success": False, "error": "Gagal decode gambar"}), 400

    results = model(frame, conf=0.15, verbose=False)
    result = results[0]

    detections = []
    img_h, img_w = frame.shape[:2]

    # Hitung luas mask per objek
    mask_areas = {}
    if result.masks is not None:
        for i, mask_tensor in enumerate(result.masks.data):
            mask_np = mask_tensor.cpu().numpy()
            if mask_np.shape != (img_h, img_w):
                mask_np = cv2.resize(
                    mask_np, (img_w, img_h), interpolation=cv2.INTER_NEAREST
                )
            area_px = int((mask_np > 0.5).sum())
            area_cm2 = round(area_px * (CM_PER_PIXEL**2), 1)
            mask_areas[i] = (area_px, area_cm2)

    if result.boxes is not None:
        for i, box in enumerate(result.boxes):
            cid = int(box.cls[0])
            area_px, area_cm2 = mask_areas.get(i, (0, 0.0))
            # Filter: skip deteksi terlalu kecil (kemungkinan besar false positive)
            if area_px < MIN_DETECTION_AREA:
                continue

            detections.append(
                {
                    "class_name": CLASS_NAMES[cid]
                    if cid < len(CLASS_NAMES)
                    else str(cid),
                    "confidence": round(float(box.conf[0]), 3),
                    "area_px": area_px,
                    "area_cm2": area_cm2,
                    "area_m2": round(area_cm2 / 10000, 4),
                }
            )

    annotated = result.plot()

    # Overlay luas pada gambar hasil
    if result.boxes is not None:
        for i, box in enumerate(result.boxes):
            if i in mask_areas:
                area_px, area_cm2 = mask_areas[i]
                x1, y1 = int(box.xyxy[0][0]), int(box.xyxy[0][1])
                label = f"{area_cm2:.0f} cm2 ({area_px}px)"
                cv2.putText(
                    annotated,
                    label,
                    (x1, max(y1 - 6, 14)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.45,
                    (255, 255, 0),
                    1,
                    cv2.LINE_AA,
                )

    _, buffer = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
    img_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode("utf-8")

    return jsonify(
        {
            "success": True,
            "total_detections": len(detections),
            "detections": detections,
            "image_base64": img_b64,
            "calibration_cm_per_pixel": CM_PER_PIXEL,
        }
    )


if __name__ == "__main__":
    ip = get_local_ip()

    print("=" * 50)
    print("  ROAD DAMAGE DETECTION — TESTING V1")
    print(f"  Model aktif : {ACTIVE_MODEL_NAME}")
    print(f"  Conf        : {DEFAULT_CONF} (default)")
    print(f"  Min area    : {MIN_DETECTION_AREA} px")
    print("=" * 50)

    # Coba pakai HTTPS (diperlukan agar Chrome HP bisa akses kamera)
    try:
        import OpenSSL  # noqa

        ssl_context = "adhoc"
        proto = "https"
    except ImportError:
        ssl_context = None
        proto = "http"
        print(
            "⚠️  pyOpenSSL tidak terinstall — kamera HP via browser tidak bisa akses kamera."
        )
        print("   Jalankan: pip install pyopenssl")

    print(f"Server berjalan di:")
    print(f"  Lokal        : {proto}://localhost:5000")
    print(f"  Jaringan (HP): {proto}://{ip}:5000")
    if ssl_context:
        print(f"  Kamera HP    : {proto}://{ip}:5000/camera")
        print(
            "  (Terima peringatan sertifikat di browser HP — klik 'Advanced' lalu 'Proceed')"
        )
    app.run(host="0.0.0.0", port=5000, ssl_context=ssl_context, debug=False)
