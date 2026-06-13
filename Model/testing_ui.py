#!/usr/bin/env python3
"""
testing_ui.py — UI Testing untuk Model Deteksi Kerusakan Jalan
===============================================================
Antarmuka web sederhana untuk:
  1. Test Model   → Upload gambar/video, lihat hasil deteksi langsung
  2. Extract      → Ekstrak frame unik dari video untuk dataset
  3. API Test     → Test endpoint API yang sedang berjalan

Penggunaan:
  python testing_ui.py
  → Buka browser: http://localhost:5005
"""

import base64
import csv
import io
import os
import sys
import tempfile
import zipfile
from pathlib import Path

import cv2
import numpy as np
import requests
from flask import Flask, jsonify, render_template_string, request, send_file

# ─── Setup path ────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

# ─── Flask app ─────────────────────────────────
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 500 * 1024 * 1024  # 500MB max upload

# ─── Global state ──────────────────────────────
_model = None
_model_name = None
_config = None
_registry = None


def load_config():
    import yaml

    global _config, _registry
    config_path = os.path.join(SCRIPT_DIR, "config.yaml")
    registry_path = os.path.join(SCRIPT_DIR, "model_registry.yaml")
    with open(config_path, "r") as f:
        _config = yaml.safe_load(f)
    with open(registry_path, "r") as f:
        _registry = yaml.safe_load(f)
    return _config, _registry


def get_model():
    global _model, _model_name
    if _model is None:
        from ultralytics import YOLO

        load_config()
        _model_name = _config["model"]["active_model"]
        entry = _registry["models"][_model_name]
        weights_path = os.path.join(SCRIPT_DIR, entry["weights_path"])

        if not os.path.exists(weights_path):
            fallback = os.path.join(SCRIPT_DIR, _config["model"]["fallback_weights"])
            weights_path = fallback if os.path.exists(fallback) else None

        if weights_path and os.path.exists(weights_path):
            print(f"[INFO] Loading model: {_model_name}")
            _model = YOLO(weights_path)
        else:
            print("[ERROR] Model tidak ditemukan")
    return _model, _model_name


def histogram_similarity(img1, img2):
    hsv1 = cv2.cvtColor(img1, cv2.COLOR_BGR2HSV)
    hsv2 = cv2.cvtColor(img2, cv2.COLOR_BGR2HSV)
    similarities = []
    for channel in range(3):
        hist1 = cv2.calcHist([hsv1], [channel], None, [64], [0, 256])
        hist2 = cv2.calcHist([hsv2], [channel], None, [64], [0, 256])
        cv2.normalize(hist1, hist1, 0, 1, cv2.NORM_MINMAX)
        cv2.normalize(hist2, hist2, 0, 1, cv2.NORM_MINMAX)
        sim = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
        similarities.append(sim)
    return sum(similarities) / len(similarities)


# ─── HTML Template ─────────────────────────────
HTML = """<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>UI Testing — Road Damage Detection</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#1a1a2e;color:#eee;font-family:Arial,sans-serif;min-height:100vh}
.container{max-width:1100px;margin:0 auto;padding:20px}
h1{color:#e94560;font-size:24px;margin-bottom:4px;text-align:center}
.subtitle{color:#aaa;font-size:13px;text-align:center;margin-bottom:20px}
.tabs{display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap}
.tab-btn{padding:12px 22px;border:2px solid #e94560;border-radius:10px;background:transparent;color:#e94560;font-size:14px;font-weight:bold;cursor:pointer;transition:.2s}
.tab-btn:hover{background:#e94560;color:#fff}
.tab-btn.active{background:#e94560;color:#fff}
.tab-content{display:none}
.tab-content.active{display:block}
.card{background:#16213e;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #0f3460}
.card h3{color:#e94560;margin-bottom:12px;font-size:16px}
label{display:block;margin-bottom:6px;color:#ccc;font-size:13px;font-weight:bold}
input[type=file]{display:block;margin-bottom:10px;color:#ccc;font-size:13px}
input[type=number],input[type=text]{background:#0f3460;border:1px solid #333;color:#eee;padding:8px 12px;border-radius:6px;width:100%;margin-bottom:10px;font-size:13px}
.form-row{display:flex;gap:12px;flex-wrap:wrap}
.form-row>div{flex:1;min-width:140px}
.btn{background:#e94560;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;transition:.2s}
.btn:hover{background:#c73850}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn-secondary{background:#0f3460;color:#e94560;border:1px solid #e94560}
.btn-secondary:hover{background:#16213e}
.status{background:#0f3460;border-radius:8px;padding:14px;margin-top:12px;font-size:13px;min-height:40px;white-space:pre-wrap;font-family:monospace}
.status.success{border-left:4px solid #27ae60}
.status.error{border-left:4px solid #e94560}
.status.info{border-left:4px solid #3498db}
.result-img{max-width:100%;border-radius:8px;margin-top:12px;border:2px solid #0f3460}
table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}
th,td{border:1px solid #333;padding:8px 10px;text-align:left}
th{background:#0f3460;color:#e94560}
tr:nth-child(even){background:#1a1a2e}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;margin:1px}
.badge-hp{border:1px solid #27ae60;color:#27ae60}
.badge-hm{border:1px solid #f39c12;color:#f39c12}
.badge-ml{border:1px solid #3498db;color:#3498db}
.badge-lb{border:1px solid #9b59b6;color:#9b59b6}
.loader{display:inline-block;width:16px;height:16px;border:2px solid #e94560;border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;vertical-align:middle;margin-right:6px}
@keyframes spin{to{transform:rotate(360deg)}}
.hidden{display:none}
.download-link{display:inline-block;margin-top:8px;color:#27ae60;font-weight:bold}
</style>
</head>
<body>
<div class="container">
<h1>🛣️ Road Damage Detection — Testing UI</h1>
<p class="subtitle">Testing Tool untuk Model, Ekstraksi Frame, dan API</p>

<div class="tabs">
<button class="tab-btn active" onclick="switchTab('test-model')">🧪 Test Model</button>
<button class="tab-btn" onclick="switchTab('extract')">🎞️ Extract Frames</button>
<button class="tab-btn" onclick="switchTab('api-test')">🔌 API Test</button>
<button class="tab-btn" onclick="switchTab('info')">ℹ️ Info</button>
</div>

<!-- ─── TAB 1: TEST MODEL ──────────────────── -->
<div id="tab-test-model" class="tab-content active">
<div class="card">
<h3>📷 Upload Gambar / Video</h3>
<label>Pilih file (jpg, png, mp4, avi)</label>
<input type="file" id="test-file" accept=".jpg,.jpeg,.png,.bmp,.mp4,.avi,.mov">
<div class="form-row">
<div><label>Confidence</label><input type="number" id="test-conf" value="0.40" step="0.05" min="0" max="1"></div>
<div><label>Max Frames (video)</label><input type="number" id="test-max-frames" value="500" step="100" min="0"></div>
</div>
<button class="btn" onclick="runTestModel()">▶ Jalankan Deteksi</button>
<div id="test-status" class="status info">Menunggu input file...</div>
</div>
<div id="test-results" class="hidden">
<div class="card"><h3>📊 Hasil Deteksi</h3><div id="test-detections"></div></div>
<div class="card"><h3>🖼️ Anotasi</h3><div id="test-image"></div></div>
</div>
</div>

<!-- ─── TAB 2: EXTRACT FRAMES ──────────────── -->
<div id="tab-extract" class="tab-content">
<div class="card">
<h3>🎞️ Ekstrak Frame dari Video</h3>
<label>Pilih video (mp4, avi, mov)</label>
<input type="file" id="extract-file" accept=".mp4,.avi,.mov,.mkv,.wmv">
<div class="form-row">
<div><label>Interval (frame)</label><input type="number" id="extract-interval" value="30" min="1"></div>
<div><label>Threshold (0-1)</label><input type="number" id="extract-threshold" value="0.90" step="0.01" min="0" max="1"></div>
<div><label>Max Frames</label><input type="number" id="extract-max-frames" value="0" min="0" placeholder="0=all"></div>
</div>
<label><input type="checkbox" id="extract-prefix"> Prefix nama file: <input type="text" id="extract-prefix-text" value="negatif_" style="width:120px;display:inline"></label>
<button class="btn" onclick="runExtractFrames()">▶ Ekstrak</button>
<div id="extract-status" class="status info">Menunggu input video...</div>
</div>
<div id="extract-results" class="hidden">
<div class="card"><h3>📸 Frame Terekstrak</h3><div id="extract-gallery"></div></div>
</div>
</div>

<!-- ─── TAB 3: API TEST ────────────────────── -->
<div id="tab-api-test" class="tab-content">
<div class="card">
<h3>🔌 Test API Endpoint</h3>
<label>API URL</label>
<input type="text" id="api-url" value="http://localhost:5000">
<div class="form-row">
<div><label>Endpoint</label>
<select id="api-endpoint" style="background:#0f3460;border:1px solid #333;color:#eee;padding:8px 12px;border-radius:6px;width:100%;margin-bottom:10px;font-size:13px">
<option value="/detect">POST /detect</option>
<option value="/health">GET /health</option>
<option value="/models">GET /models</option>
</select>
</div>
<div><label>Confidence</label><input type="number" id="api-conf" value="0.40" step="0.05" min="0" max="1"></div>
</div>
<label>File gambar (untuk /detect)</label>
<input type="file" id="api-file" accept=".jpg,.jpeg,.png">
<button class="btn" onclick="runApiTest()">▶ Kirim Request</button>
<div id="api-status" class="status info">Masukkan URL API dan file (untuk /detect)</div>
</div>
<div id="api-results" class="hidden">
<div class="card"><h3>📥 Response</h3><div id="api-response"></div></div>
</div>
</div>

<!-- ─── TAB 4: INFO ────────────────────────── -->
<div id="tab-info" class="tab-content">
<div class="card"><h3>ℹ️ Informasi Sistem</h3><div id="info-content"><span class="loader"></span> Memuat...</div></div>
</div>
</div>

<script>
function switchTab(name){document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));document.querySelectorAll('.tab-btn').forEach(el=>el.classList.remove('active'));document.getElementById('tab-'+name).classList.add('active');event.target.classList.add('active');if(name==='info')loadInfo();}
function $(id){return document.getElementById(id)}
function setStatus(id,msg,type){const el=$(id);el.className='status '+type;el.innerHTML=msg;}
function show(id){$(id).classList.remove('hidden')}
function hide(id){$(id).classList.add('hidden')}

// ─── TAB 1: Test Model ──────────────────────
async function runTestModel(){
const file=$('test-file').files[0];if(!file){setStatus('test-status','Silakan pilih file gambar/video dulu','error');return;}
const conf=$('test-conf').value;const maxFrames=$('test-max-frames').value;
setStatus('test-status','<span class="loader"></span> Memproses...','info');
hide('test-results');
const form=new FormData();form.append('file',file);form.append('conf',conf);form.append('max_frames',maxFrames);
try{
const resp=await fetch('/api/test-model',{method:'POST',body:form});
const data=await resp.json();
if(data.success){
$('test-detections').innerHTML=data.html;
if(data.image_html){$('test-image').innerHTML=data.image_html;}
show('test-results');
setStatus('test-status','✅ Selesai! '+data.message,'success');
}else{setStatus('test-status','❌ Error: '+data.error,'error');}
}catch(e){setStatus('test-status','❌ Gagal: '+e.message,'error');}
}

// ─── TAB 2: Extract Frames ──────────────────
async function runExtractFrames(){
const file=$('extract-file').files[0];if(!file){setStatus('extract-status','Silakan pilih video dulu','error');return;}
const interval=$('extract-interval').value;const threshold=$('extract-threshold').value;
const maxFrames=$('extract-max-frames').value;const prefix=$('extract-prefix').checked?$('extract-prefix-text').value:'';
setStatus('extract-status','<span class="loader"></span> Memproses video... ini bisa memakan waktu','info');
hide('extract-results');
const form=new FormData();form.append('file',file);form.append('interval',interval);form.append('threshold',threshold);form.append('max_frames',maxFrames);form.append('prefix',prefix);
try{
const resp=await fetch('/api/extract-frames',{method:'POST',body:form});
if(resp.headers.get('Content-Type')?.includes('application/json')){
const data=await resp.json();
if(!data.success)setStatus('extract-status','❌ Error: '+data.error,'error');
else setStatus('extract-status','✅ Selesai! '+data.message,'success');
}else{
const blob=await resp.blob();
const url=URL.createObjectURL(blob);
$('extract-gallery').innerHTML='<a href="'+url+'" download="extracted_frames.zip" class="download-link">⬇️ Download ZIP ('+(blob.size/1024).toFixed(0)+' KB)</a><br><br><div style="color:#aaa;font-size:13px">File ZIP berisi semua frame yang berhasil diekstrak.</div>';
show('extract-results');
setStatus('extract-status','✅ Ekstraksi selesai! '+resp.headers.get('X-Extract-Message')||'','success');
}
}catch(e){setStatus('extract-status','❌ Error: '+e.message,'error');}
}

// ─── TAB 3: API Test ────────────────────────
async function runApiTest(){
const baseUrl=$('api-url').value.replace(/\\/+$/,'');const endpoint=$('api-endpoint').value;
const conf=$('api-conf').value;
setStatus('api-status','<span class="loader"></span> Mengirim request...','info');
hide('api-results');
try{
if(endpoint==='/detect'){
const file=$('api-file').files[0];
if(!file){setStatus('api-status','Pilih file gambar untuk /detect','error');return;}
const form=new FormData();form.append('image',file);form.append('conf',conf);
const resp=await fetch(baseUrl+endpoint,{method:'POST',body:form});
const data=await resp.json();
$('api-response').innerHTML=renderJson(data);
show('api-results');
setStatus('api-status','✅ Response diterima','success');
}else{
const resp=await fetch(baseUrl+endpoint);
const data=await resp.json();
$('api-response').innerHTML=renderJson(data);
show('api-results');
setStatus('api-status','✅ Response diterima','success');
}
}catch(e){setStatus('api-status','❌ Gagal: '+e.message+'. Pastikan API server berjalan.','error');}
}

function renderJson(obj){return '<pre style="background:#0f3460;padding:14px;border-radius:8px;overflow:auto;font-size:12px;color:#eee;max-height:400px">'+JSON.stringify(obj,null,2)+'</pre>';}

// ─── TAB 4: Info ────────────────────────────
async function loadInfo(){
try{
const resp=await fetch('/api/info');const data=await resp.json();
if(data.success){$('info-content').innerHTML=data.html;}
else{$('info-content').innerHTML='Error loading info';}
}catch(e){$('info-content').innerHTML='Error: '+e.message;}
}
loadInfo();
</script>
</body>
</html>"""


# ─── Routes ────────────────────────────────────


@app.route("/")
def index():
    return render_template_string(HTML)


@app.route("/api/info", methods=["GET"])
def api_info():
    load_config()
    active = _config["model"]["active_model"]

    html = f"""
    <table>
    <tr><th>Konfigurasi</th><th>Nilai</th></tr>
    <tr><td>Model Aktif</td><td><strong>{active}</strong></td></tr>
    <tr><td>Confidence Threshold</td><td>{_config["model"]["confidence_threshold"]}</td></tr>
    <tr><td>IoU Threshold</td><td>{_config["model"]["iou_threshold"]}</td></tr>
    <tr><td>Min Area Deteksi</td><td>{_config["detection"]["min_area_px"]} px²</td></tr>
    <tr><td>Quality Check</td><td>{"✅ Aktif" if _config["detection"]["enable_quality_check"] else "❌ Nonaktif"}</td></tr>
    </table>
    <br>
    <table>
    <tr><th>Model Tersedia</th><th>Loaded</th><th>mAP50</th></tr>
    """
    for name, entry in _registry.get("models", {}).items():
        loaded = (
            "✅"
            if os.path.exists(os.path.join(SCRIPT_DIR, entry["weights_path"]))
            else "❌"
        )
        map50 = (
            f"{entry.get('test_map50_box', 0):.3f}"
            if entry.get("test_map50_box")
            else "—"
        )
        marker = "▶ " if name == active else ""
        html += f"<tr><td>{marker}{name}</td><td>{loaded}</td><td>{map50}</td></tr>"

    html += "</table>"
    return jsonify({"success": True, "html": html})


@app.route("/api/test-model", methods=["POST"])
def api_test_model():
    if "file" not in request.files:
        return jsonify({"success": False, "error": "Tidak ada file"})

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"success": False, "error": "File kosong"})

    conf = float(request.form.get("conf", 0.40))
    max_frames = int(request.form.get("max_frames", 500))

    # Simpan ke temp
    suffix = Path(file.filename).suffix.lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        model, model_name = get_model()
        if model is None:
            return jsonify({"success": False, "error": "Model tidak bisa diload"})

        img_exts = (".jpg", ".jpeg", ".png", ".bmp")

        if suffix in img_exts:
            # ─── Image ───
            frame = cv2.imread(tmp_path)
            if frame is None:
                return jsonify({"success": False, "error": "Gagal membaca gambar"})

            results = model(frame, conf=conf, verbose=False)
            result = results[0]

            # Tabel deteksi
            detections = []
            if result.boxes is not None:
                for i, box in enumerate(result.boxes):
                    class_id = int(box.cls[0])
                    confidence = float(box.conf[0])
                    x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
                    area_px = (x2 - x1) * (y2 - y1)
                    class_name = (
                        model.names[class_id]
                        if class_id < len(model.names)
                        else str(class_id)
                    )
                    detections.append(
                        {
                            "no": i + 1,
                            "class_name": class_name,
                            "confidence": round(confidence, 4),
                            "area_px": area_px,
                            "bbox": f"({x1},{y1})-({x2},{y2})",
                        }
                    )

            # Gambar anotasi
            annotated = result.plot()
            _, buffer = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 90])
            img_b64 = base64.b64encode(buffer).decode("utf-8")

            # HTML tabel
            if detections:
                table = """<table><tr><th>No</th><th>Kelas</th><th>Confidence</th><th>Area (px²)</th><th>BBox</th></tr>"""
                for d in detections:
                    cls = d["class_name"]
                    badge_class = {
                        "Lubang": "badge-lb",
                        "Retak-Memanjang": "badge-hm",
                        "Retak-Melintang": "badge-hm",
                        "Retak-Buaya": "badge-hp",
                    }.get(cls, "badge-ml")
                    table += f"""<tr><td>{d["no"]}</td><td><span class="badge {badge_class}">{cls}</span></td>
                    <td>{d["confidence"]:.4f}</td><td>{d["area_px"]}</td><td>{d["bbox"]}</td></tr>"""
                table += "</table>"
            else:
                table = "<p style='color:#aaa'>Tidak ada deteksi.</p>"

            image_html = (
                f'<img src="data:image/jpeg;base64,{img_b64}" class="result-img">'
            )

            os.unlink(tmp_path)
            return jsonify(
                {
                    "success": True,
                    "message": f"{len(detections)} objek terdeteksi (model: {model_name})",
                    "html": table,
                    "image_html": image_html,
                }
            )

        elif suffix in (".mp4", ".avi", ".mov", ".mkv", ".wmv"):
            # ─── Video ───
            cap = cv2.VideoCapture(tmp_path)
            fps = cap.get(cv2.CAP_PROP_FPS)
            total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            w, h = (
                int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
                int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            )

            out_path = tmp_path.replace(suffix, "_annotated.mp4")
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            out = cv2.VideoWriter(out_path, fourcc, fps, (w, h))

            csv_buffer = io.StringIO()
            csv_writer = csv.writer(csv_buffer)
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

            frame_count = 0
            total_det = 0
            limit = min(total, max_frames) if max_frames > 0 else total

            while frame_count < limit:
                ret, frame = cap.read()
                if not ret:
                    break
                results = model(frame, conf=conf, verbose=False)
                annotated = results[0].plot()
                out.write(annotated)

                if results[0].boxes is not None:
                    for box in results[0].boxes:
                        class_id = int(box.cls[0])
                        cf = float(box.conf[0])
                        x1, y1, x2, y2 = [int(v) for v in box.xyxy[0]]
                        area = (x2 - x1) * (y2 - y1)
                        cn = (
                            model.names[class_id]
                            if class_id < len(model.names)
                            else str(class_id)
                        )
                        csv_writer.writerow(
                            [
                                frame_count + 1,
                                class_id,
                                cn,
                                round(cf, 4),
                                x1,
                                y1,
                                x2,
                                y2,
                                area,
                            ]
                        )
                        total_det += 1

                frame_count += 1

            cap.release()
            out.release()

            # Baca video untuk dikirim
            with open(out_path, "rb") as f:
                video_b64 = base64.b64encode(f.read()).decode("utf-8")

            csv_data = csv_buffer.getvalue()
            csv_b64 = base64.b64encode(csv_data.encode()).decode("utf-8")

            os.unlink(tmp_path)
            os.unlink(out_path)

            return jsonify(
                {
                    "success": True,
                    "message": f"{frame_count} frame diproses, {total_det} deteksi (model: {model_name})",
                    "html": f"""
                <p>Frame: {frame_count} | Deteksi: {total_det} | Model: {model_name}</p>
                <p><a href="data:video/mp4;base64,{video_b64}" download="annotated_{Path(file.filename).stem}.mp4" class="download-link">⬇️ Download Video Anotasi</a></p>
                <p><a href="data:text/csv;base64,{csv_b64}" download="detections_{Path(file.filename).stem}.csv" class="download-link">⬇️ Download CSV Deteksi</a></p>
                """,
                    "image_html": None,
                }
            )
        else:
            return jsonify(
                {"success": False, "error": f"Format tidak didukung: {suffix}"}
            )

    except Exception as e:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
        return jsonify({"success": False, "error": str(e)})


@app.route("/api/extract-frames", methods=["POST"])
def api_extract_frames():
    if "file" not in request.files:
        return jsonify({"success": False, "error": "Tidak ada file video"})

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"success": False, "error": "File kosong"})

    interval = int(request.form.get("interval", 30))
    threshold = float(request.form.get("threshold", 0.90))
    max_frames = int(request.form.get("max_frames", 0))
    prefix = request.form.get("prefix", "")

    # Simpan video ke temp
    suffix = Path(file.filename).suffix.lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        file.save(tmp.name)
        video_path = tmp.name

    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return jsonify({"success": False, "error": "Gagal membuka video"})

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)

        # Proses ekstraksi
        last_saved = None
        saved_count = 0
        skipped_dedup = 0
        frame_count = 0
        limit = min(total_frames, max_frames) if max_frames > 0 else total_frames

        # Kumpulkan file dalam ZIP di memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            while frame_count < limit:
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_count % interval == 0:
                    if last_saved is not None:
                        sim = histogram_similarity(frame, last_saved)
                        if sim > threshold:
                            skipped_dedup += 1
                            frame_count += 1
                            continue

                    # Simpan ke ZIP
                    fname = f"{prefix}{Path(file.filename).stem}_f{frame_count:06d}.jpg"
                    _, buffer = cv2.imencode(
                        ".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 95]
                    )
                    zf.writestr(fname, buffer.tobytes())
                    last_saved = frame.copy()
                    saved_count += 1

                frame_count += 1

        cap.release()
        os.unlink(video_path)

        zip_buffer.seek(0)
        msg = f"{saved_count} frame dari {frame_count} frame diproses (skip duplikat: {skipped_dedup})"
        resp = send_file(
            zip_buffer,
            mimetype="application/zip",
            as_attachment=True,
            download_name=f"extracted_{Path(file.filename).stem}.zip",
        )
        resp.headers["X-Extract-Message"] = msg
        return resp

    except Exception as e:
        try:
            os.unlink(video_path)
        except Exception:
            pass
        return jsonify({"success": False, "error": str(e)})


@app.route("/api/test-api", methods=["POST"])
def api_test_external():
    """Proxy: kirim request ke API eksternal."""
    import requests as req

    api_url = request.form.get("api_url", "")
    endpoint = request.form.get("endpoint", "/health")
    conf = float(request.form.get("conf", 0.40))

    if not api_url:
        return jsonify({"success": False, "error": "API URL diperlukan"})

    url = api_url.rstrip("/") + endpoint

    try:
        if endpoint == "/detect":
            if "image" not in request.files:
                return jsonify(
                    {"success": False, "error": "File gambar diperlukan untuk /detect"}
                )
            file = request.files["image"]
            files = {"image": (file.filename, file.read(), file.content_type)}
            data = {"conf": str(conf)}
            resp = req.post(url, files=files, data=data, timeout=30)
        else:
            resp = req.get(url, timeout=10)

        return jsonify(
            {
                "success": True,
                "status_code": resp.status_code,
                "response": resp.json()
                if resp.headers.get("content-type", "").startswith("application/json")
                else resp.text,
            }
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


# ─── Main ──────────────────────────────────────
if __name__ == "__main__":
    print("=" * 50)
    print("  ROAD DAMAGE DETECTION — TESTING UI")
    print("  Buka browser: http://localhost:5005")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5005, debug=False, threaded=True)
