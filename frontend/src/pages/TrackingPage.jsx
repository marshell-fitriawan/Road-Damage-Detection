import React, { useRef, useState, useEffect, useCallback } from 'react';
import { trackingService } from '../services/api';
import { Camera, StopCircle, Play, MapPin, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const TrackingPage = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const gpsIntervalRef = useRef(null);
  const detectingRef = useRef(false);

  const [session, setSession] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [detectionResults, setDetectionResults] = useState([]);
  const [totalDetections, setTotalDetections] = useState(0);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [savedDamages, setSavedDamages] = useState([]);

  // Check for active session on mount
  useEffect(() => {
    checkActiveSession();
    return () => {
      stopEverything();
    };
  }, []);

  const checkActiveSession = async () => {
    try {
      const data = await trackingService.getActiveSession();
      if (data.session) {
        setSession(data.session);
        setIsTracking(true);
        setSavedDamages(data.session.road_damages || []);
        setStatusMessage('Sesi tracking aktif ditemukan. Kamera siap diaktifkan.');
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    }
  };

  // Start tracking session
  const startTracking = async () => {
    setError(null);
    try {
      // 1. Start tracking session on server
      const data = await trackingService.start();
      setSession(data.session);
      setIsTracking(true);
      setStatusMessage('Sesi tracking dimulai. Mengaktifkan kamera...');

      // 2. Start camera
      await startCamera();

      // 3. Start GPS tracking
      startGPSTracking(data.session.id);

      // 4. Start detection loop
      detectingRef.current = true;
      requestAnimationFrame(() => detectFrame(data.session.id));

      setStatusMessage('Tracking aktif. Arahkan kamera ke jalan.');
    } catch (err) {
      console.error('Error starting tracking:', err);
      setError(err.response?.data?.message || 'Gagal memulai tracking. Pastikan kamera dan GPS diizinkan.');
    }
  };

  // Start camera
  const startCamera = async () => {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      streamRef.current = mediaStream;
      setIsCameraReady(true);
    }
  };

  // Start GPS tracking - send coordinates periodically
  const startGPSTracking = (sessionId) => {
    if (navigator.geolocation) {
      // Get initial position
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error('GPS error:', err),
        { enableHighAccuracy: true }
      );

      // Track position every 5 seconds
      gpsIntervalRef.current = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            setLocation({ lat: latitude, lng: longitude });
            try {
              await trackingService.updateRoute(sessionId, latitude, longitude);
            } catch (e) {
              console.error('Failed to update route:', e);
            }
          },
          (err) => console.error('GPS error:', err),
          { enableHighAccuracy: true }
        );
      }, 5000);
    }
  };

  // Detection frame loop - sends to YOLO API
  const detectFrame = async (sessionId) => {
    if (!detectingRef.current || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const startTime = performance.now();

      // Convert canvas to blob and send to YOLO
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
      if (!blob) {
        if (detectingRef.current) requestAnimationFrame(() => detectFrame(sessionId));
        return;
      }

      const formData = new FormData();
      formData.append('image', blob, 'frame.jpg');

      const response = await fetch('/yolo/detect', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      const endTime = performance.now();
      setFps(Math.round(1000 / (endTime - startTime)));

      if (data.success && data.total_detections > 0) {
        setDetectionResults(data.detections);
        setTotalDetections((prev) => prev + data.total_detections);

        // Draw detections on canvas
        drawDetections(ctx, data.detections);

        // Find best detection (highest confidence) and save
        const bestDetection = data.detections.reduce((best, d) =>
          d.confidence > best.confidence ? d : best, data.detections[0]);

        if (bestDetection.confidence > 0.5 && location.lat && location.lng) {
          await saveBestDetection(sessionId, canvas, bestDetection);
        }
      } else {
        setDetectionResults([]);
      }
    } catch (err) {
      console.error('Detection error:', err);
    }

    if (detectingRef.current) {
      requestAnimationFrame(() => detectFrame(sessionId));
    }
  };

  // Save best detection frame
  const saveBestDetection = async (sessionId, canvas, detection) => {
    try {
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.9);

      await trackingService.saveDamage(sessionId, {
        image: imageBase64,
        damage_type: detection.class_name,
        confidence: detection.confidence,
        latitude: location.lat,
        longitude: location.lng,
      });

      setSavedDamages((prev) => [...prev, {
        damage_type: detection.class_name,
        confidence: detection.confidence,
        latitude: location.lat,
        longitude: location.lng,
        created_at: new Date().toISOString(),
      }]);

      setStatusMessage(`Kerusakan "${detection.class_name}" tersimpan!`);
    } catch (err) {
      console.error('Error saving damage:', err);
    }
  };

  // Draw bounding boxes
  const drawDetections = (ctx, detections) => {
    detections.forEach((detection) => {
      const { bbox, class_name, confidence } = detection;
      if (!bbox) return;
      const { x1, y1, x2, y2 } = bbox;

      const color = getColorForClass(class_name);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      const label = `${class_name} ${(confidence * 100).toFixed(1)}%`;
      ctx.font = '16px Arial';
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = color;
      ctx.fillRect(x1, y1 - 25, textWidth + 10, 25);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x1 + 5, y1 - 7);
    });
  };

  const getColorForClass = (className) => {
    const colors = {
      'Lubang': '#3b82f6',          // Biru (sesuai proposal)
      'Retak-Buaya': '#ef4444',     // Merah
      'Retak-Memanjang': '#eab308', // Kuning
      'Retak-Melintang': '#22c55e', // Hijau
    };
    return colors[className] || '#888';
  };

  // Stop tracking
  const stopTracking = async () => {
    try {
      detectingRef.current = false;
      stopEverything();

      if (session) {
        const result = await trackingService.stop(session.id);
        setStatusMessage(`Tracking selesai. ${result.total_damages} kerusakan terdeteksi.`);
      }

      setSession(null);
      setIsTracking(false);
      setIsCameraReady(false);
      setDetectionResults([]);
    } catch (err) {
      console.error('Error stopping tracking:', err);
      setError('Gagal menghentikan tracking.');
    }
  };

  const stopEverything = () => {
    detectingRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Tracking Kerusakan Jalan</h1>
        <p className="text-gray-400 mt-2">
          Pantau kondisi jalan secara real-time menggunakan kamera dan GPS
        </p>
      </div>

      {error && (
        <div className="card bg-red-600/20 border-red-600">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      )}

      {statusMessage && (
        <div className="card bg-blue-600/20 border-blue-600">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-blue-400" />
            <p className="text-blue-300 text-sm">{statusMessage}</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="card">
        <div className="flex gap-4 flex-wrap items-center">
          {!isTracking ? (
            <button onClick={startTracking} className="btn-primary flex items-center gap-2 text-lg px-6 py-3">
              <Play className="w-6 h-6" />
              Mulai Tracking
            </button>
          ) : (
            <button onClick={stopTracking} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center gap-2 text-lg transition-colors">
              <StopCircle className="w-6 h-6" />
              Selesai Tracking
            </button>
          )}

          {isTracking && (
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Tracking Aktif</span>
              </div>
              {location.lat && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Camera View */}
      <div className="card p-0 overflow-hidden">
        <div className="relative bg-black" style={{ minHeight: '400px' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto"
            style={{ display: isCameraReady ? 'block' : 'none' }}
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full"
            style={{ display: isCameraReady ? 'block' : 'none' }}
          />

          {!isCameraReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Camera className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400">Kamera belum aktif</p>
                <p className="text-sm text-gray-500 mt-2">Klik "Mulai Tracking" untuk memulai</p>
              </div>
            </div>
          )}

          {/* Detection Overlay */}
          {isTracking && isCameraReady && (
            <div className="absolute top-4 left-4 bg-black/70 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm font-semibold text-primary">Mendeteksi...</span>
              </div>
              <div className="text-xs text-gray-300">
                <div>FPS: {fps}</div>
                <div>Total Deteksi: {totalDetections}</div>
                <div>Tersimpan: {savedDamages.length}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Current Detections */}
      {detectionResults.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-primary mb-3">Kerusakan Terdeteksi</h3>
          <div className="space-y-2">
            {detectionResults.map((d, i) => (
              <div key={i} className="bg-secondary rounded p-3 border-l-4" style={{ borderColor: getColorForClass(d.class_name) }}>
                <div className="flex justify-between items-center">
                  <p className="font-bold" style={{ color: getColorForClass(d.class_name) }}>{d.class_name}</p>
                  <p className="text-sm text-gray-400">{(d.confidence * 100).toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved Damages during this session */}
      {savedDamages.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-primary mb-3">
            Kerusakan Tersimpan ({savedDamages.length})
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {savedDamages.map((d, i) => (
              <div key={i} className="bg-secondary rounded p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold" style={{ color: getColorForClass(d.damage_type) }}>{d.damage_type}</p>
                  <p className="text-xs text-gray-400">
                    {d.latitude?.toFixed(6)}, {d.longitude?.toFixed(6)}
                  </p>
                </div>
                <p className="text-sm text-gray-400">{(d.confidence * 100).toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-3 text-primary">Jenis Kerusakan</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
            <span className="text-sm">Lubang (Pothole)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
            <span className="text-sm">Retak Buaya</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }}></div>
            <span className="text-sm">Retak Memanjang</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
            <span className="text-sm">Retak Melintang</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingPage;
