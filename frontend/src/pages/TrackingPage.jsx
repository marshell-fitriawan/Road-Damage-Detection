import React, { useRef, useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { trackingService } from '../services/api';
import { Camera, StopCircle, MapPin, Loader2, AlertCircle, CheckCircle, ShieldAlert, Navigation, Map, Satellite } from 'lucide-react';
import MapPickerModal from '../components/MapPickerModal';

const DETECTION_INTERVAL_MS = 800;
const SEND_WIDTH = 640;
const JPEG_QUALITY = 0.5;
const GPS_INTERVAL_MS = 1000;
const GPS_MIN_DISTANCE_M = 5;

const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Icon posisi petugas untuk mini-map
const petugasIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:22px;height:22px;
    background:#3b82f6;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 0 0 3px rgba(59,130,246,0.4), 0 2px 8px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// Komponen untuk fly ke posisi petugas (hanya sekali saat pertama kali GPS didapat)
const FlyToLocation = ({ location, hasFlewOnce }) => {
  const map = useMap();
  useEffect(() => {
    if (location.lat && location.lng && !hasFlewOnce.current) {
      map.flyTo([location.lat, location.lng], 17, { duration: 1.5 });
      hasFlewOnce.current = true;
    }
  }, [location.lat, location.lng]);
  return null;
};

const TrackingPage = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const sendCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const gpsIntervalRef = useRef(null);
  const detectingRef = useRef(false);
  const lastDetectionsRef = useRef([]);
  const overlayIntervalRef = useRef(null);
  const locationRef = useRef({ lat: null, lng: null });
  const hasFlewOnce = useRef(false);         // Sudah fly ke posisi petugas sekali
  const bgGpsWatchRef = useRef(null);        // watchPosition untuk GPS background (sebelum tracking)

  const [session, setSession] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [gpsAccuracy, setGpsAccuracy] = useState(null); // akurasi GPS dalam meter
  const [gpsReady, setGpsReady] = useState(false);      // GPS sudah dapat sinyal
  const [detectionResults, setDetectionResults] = useState([]);
  const [totalDetections, setTotalDetections] = useState(0);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [savedDamages, setSavedDamages] = useState([]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState({ camera: 'unknown', gps: 'unknown' });

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [pendingRoute, setPendingRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  // Aktifkan GPS background saat halaman pertama kali dibuka
  useEffect(() => {
    checkActiveSession();
    startBackgroundGPS();
    return () => {
      stopEverything();
      stopBackgroundGPS();
    };
  }, []);

  // GPS background - aktif sebelum tracking dimulai, hanya untuk tampilkan posisi di mini-map
  const startBackgroundGPS = () => {
    if (!navigator.geolocation) return;
    bgGpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        locationRef.current = loc;
        setGpsReady(true);
      },
      (err) => {
        console.warn('Background GPS error:', err.code);
        // Tidak tampilkan error — GPS background bersifat opsional
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
    );
  };

  const stopBackgroundGPS = () => {
    if (bgGpsWatchRef.current !== null) {
      navigator.geolocation.clearWatch(bgGpsWatchRef.current);
      bgGpsWatchRef.current = null;
    }
  };;

  const checkActiveSession = async () => {
    try {
      const data = await trackingService.getActiveSession();
      if (data.session) {
        setSession(data.session);
        setIsTracking(true);
        setSavedDamages(data.session.road_damages || []);
        // Pulihkan info rute jika ada
        if (data.session.start_point || data.session.ruas_jalan_name) {
          setRouteInfo({
            startPoint: data.session.start_point,
            endPoint: data.session.end_point,
            ruasJalanName: data.session.ruas_jalan_name,
          });
        }
        setStatusMessage('Sesi tracking aktif ditemukan. Kamera siap diaktifkan.');
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    }
  };

  // Check permissions before starting - sekarang buka map picker dulu
  const checkPermissions = async () => {
    setError(null);
    // Langsung buka modal pilih rute
    setShowMapPicker(true);
  };

  // Dipanggil saat petugas konfirmasi rute di MapPickerModal
  const handleRouteConfirmed = (routeData) => {
    setShowMapPicker(false);
    setPendingRoute(routeData);
    setRouteInfo(routeData);

    // Cek permission setelah rute dipilih
    checkPermissionsAndStart(routeData);
  };

  // Cek & minta permission, lalu mulai tracking dengan data rute
  const checkPermissionsAndStart = async (routeData) => {
    setError(null);

    // iOS Safari tidak support navigator.permissions.query untuk camera/geolocation
    // Langsung tampilkan modal permission dan minta izin secara eksplisit
    setShowPermissionModal(true);
  };

  // Request permissions and then start tracking
  const requestPermissionsAndStart = async () => {
    setShowPermissionModal(false);
    setError(null);
    setStatusMessage('Meminta izin kamera dan GPS...');

    // Try requesting camera
    try {
      const testStream = await navigator.mediaDevices.getUserMedia({ video: true });
      testStream.getTracks().forEach(t => t.stop());
      setPermissionStatus(prev => ({ ...prev, camera: 'granted' }));
    } catch (err) {
      setError('Izin KAMERA ditolak. Buka pengaturan browser dan izinkan akses kamera untuk situs ini, lalu coba lagi.');
      setPermissionStatus(prev => ({ ...prev, camera: 'denied' }));
      return;
    }

    // Try requesting GPS
    try {
      await new Promise((resolve, reject) => {
        // iOS butuh waktu lebih lama, timeout 30 detik
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setLocation(loc);
            locationRef.current = loc;
            resolve();
          },
          (err) => {
            // Kode error: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
            if (err.code === 1) {
              reject(new Error('PERMISSION_DENIED'));
            } else {
              // Timeout atau unavailable - coba lagi dengan akurasi rendah
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                  setLocation(loc);
                  locationRef.current = loc;
                  resolve();
                },
                (lowAccErr) => reject(lowAccErr),
                { enableHighAccuracy: false, timeout: 30000, maximumAge: 30000 }
              );
            }
          },
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
        );
      });
      setPermissionStatus(prev => ({ ...prev, gps: 'granted' }));
    } catch (err) {
      const isDenied = err.message === 'PERMISSION_DENIED' || err.code === 1;
      setError(
        isDenied
          ? 'Izin GPS/Lokasi ditolak.\n\nCara mengizinkan di iPhone:\n1. Buka Pengaturan → Privacy & Security → Location Services\n2. Cari Safari → pilih "While Using"\n3. Kembali ke browser dan coba lagi'
          : 'GPS tidak bisa didapatkan. Pastikan:\n1. Location Services aktif di Pengaturan iPhone\n2. Berada di tempat dengan sinyal GPS (dekat jendela/luar ruangan)\n3. Coba lagi dalam beberapa detik'
      );
      setPermissionStatus(prev => ({ ...prev, gps: isDenied ? 'denied' : 'unavailable' }));
      return;
    }

    // Both granted, start tracking with pending route data
    await startTracking(pendingRoute);
  };

  // Start tracking session
  const startTracking = async (routeData = null) => {
    setError(null);
    try {
      // Stop GPS background dulu sebelum tracking GPS dimulai (hindari konflik)
      stopBackgroundGPS();

      const data = await trackingService.start(routeData);
      setSession(data.session);
      setIsTracking(true);
      setStatusMessage('Sesi tracking dimulai. Mengaktifkan kamera...');

      // 2. Start camera
      await startCamera();

      // 3. Send initial location immediately if available (so admin map shows marker right away)
      if (locationRef.current.lat && locationRef.current.lng) {
        try {
          await trackingService.updateRoute(data.session.id, locationRef.current.lat, locationRef.current.lng);
        } catch (e) {
          console.error('Failed to send initial location:', e);
        }
      }

      // 4. Start GPS tracking per detik
      startGPSTracking(data.session.id);

      // 5. Start detection loop (sends frames at interval) + overlay loop (draws at full FPS)
      detectingRef.current = true;
      startDetectionLoop(data.session.id);
      startOverlayLoop();

      const ruasInfo = routeData?.ruasJalanName ? ` | Ruas: ${routeData.ruasJalanName}` : '';
      setStatusMessage(`Tracking aktif${ruasInfo}. Arahkan kamera ke jalan.`);
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
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    });

    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      streamRef.current = mediaStream;
      setIsCameraReady(true);
    }
  };

  // Start GPS tracking - update setiap 1 detik menggunakan watchPosition
  const startGPSTracking = (sessionId) => {
    if (!navigator.geolocation) return;

    const gpsOptions = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };

    const handlePosition = async (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;

      // Abaikan pembacaan GPS yang akurasinya sangat buruk (>50 meter)
      if (accuracy > 50) {
        console.warn(`GPS accuracy too low: ${accuracy}m, skipping`);
        return;
      }

      const prev = locationRef.current;

      // Hanya update jika bergerak lebih dari GPS_MIN_DISTANCE_M meter
      // Ini mencegah titik bergerak sendiri akibat GPS drift saat diam
      if (prev.lat && prev.lng) {
        const distance = getDistanceMeters(prev.lat, prev.lng, latitude, longitude);
        if (distance < GPS_MIN_DISTANCE_M) {
          // Tetap update state UI tapi jangan kirim ke server
          setLocation({ lat: latitude, lng: longitude });
          locationRef.current = { lat: latitude, lng: longitude };
          return;
        }
      }

      const loc = { lat: latitude, lng: longitude };
      setLocation(loc);
      locationRef.current = loc;
      try {
        await trackingService.updateRoute(sessionId, latitude, longitude);
      } catch (e) {
        console.error('Failed to update route:', e);
      }
    };

    const handleError = (err) => {
      console.warn('GPS watch error:', err.code, err.message);
    };

    // watchPosition: update otomatis saat posisi berubah
    const watchId = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      gpsOptions
    );

    gpsIntervalRef.current = watchId;

    // Paksa update setiap 1 detik meski posisi tidak berubah
    const forceInterval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        handlePosition,
        (err) => console.warn('GPS force error:', err.code),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
      );
    }, GPS_INTERVAL_MS);

    gpsIntervalRef.forceInterval = forceInterval;
  };

  // Draw overlay loop - runs at full FPS, just draws bounding boxes over video
  const startOverlayLoop = () => {
    const drawOverlay = () => {
      if (!detectingRef.current || !videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Match canvas to video display size
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Clear and draw current detections overlay (transparent background)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Scale factor: detections are based on SEND_WIDTH, need to scale to actual video size
      const scale = video.videoWidth / SEND_WIDTH;

      if (lastDetectionsRef.current.length > 0) {
        lastDetectionsRef.current.forEach((detection) => {
          const { bbox, class_name, confidence } = detection;
          if (!bbox) return;
          // Scale bbox coordinates from send resolution to display resolution
          const x1 = bbox.x1 * scale;
          const y1 = bbox.y1 * scale;
          const x2 = bbox.x2 * scale;
          const y2 = bbox.y2 * scale;

          const color = getColorForClass(class_name);
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

          const label = `${class_name} ${(confidence * 100).toFixed(1)}%`;
          ctx.font = '14px Arial';
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = color;
          ctx.fillRect(x1, y1 - 22, textWidth + 8, 22);
          ctx.fillStyle = '#fff';
          ctx.fillText(label, x1 + 4, y1 - 6);
        });
      }

      overlayIntervalRef.current = requestAnimationFrame(drawOverlay);
    };
    overlayIntervalRef.current = requestAnimationFrame(drawOverlay);
  };

  // Detection loop - sends frame to YOLO API at fixed interval (not every frame)
  const startDetectionLoop = (sessionId) => {
    // Create a hidden canvas for downscaling frames before sending
    if (!sendCanvasRef.current) {
      sendCanvasRef.current = document.createElement('canvas');
    }

    const sendFrame = async () => {
      if (!detectingRef.current || !videoRef.current) return;

      const video = videoRef.current;
      if (video.videoWidth === 0) return; // Video not ready yet

      const sendCanvas = sendCanvasRef.current;
      const aspectRatio = video.videoHeight / video.videoWidth;
      const sendHeight = Math.round(SEND_WIDTH * aspectRatio);

      sendCanvas.width = SEND_WIDTH;
      sendCanvas.height = sendHeight;

      const sendCtx = sendCanvas.getContext('2d');
      sendCtx.drawImage(video, 0, 0, SEND_WIDTH, sendHeight);

      try {
        const startTime = performance.now();

        // Convert to small JPEG blob
        const blob = await new Promise((resolve) =>
          sendCanvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
        );
        if (!blob) return;

        const formData = new FormData();
        formData.append('image', blob, 'frame.jpg');
        formData.append('return_image', 'false'); // Don't need annotated image back
        formData.append('conf', '0.25'); // Slightly higher confidence = fewer false positives & faster

        const response = await fetch('/yolo/detect', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();

        const endTime = performance.now();
        const detectionFps = Math.round(1000 / (endTime - startTime));
        setFps(detectionFps);

        if (data.success && data.total_detections > 0) {
          lastDetectionsRef.current = data.detections;
          setDetectionResults(data.detections);
          setTotalDetections((prev) => prev + data.total_detections);

          // Find best detection (highest confidence) and save
          const bestDetection = data.detections.reduce((best, d) =>
            d.confidence > best.confidence ? d : best, data.detections[0]);

          if (bestDetection.confidence > 0.5 && locationRef.current.lat && locationRef.current.lng) {
            // Use full-res canvas for saving
            const saveCanvas = document.createElement('canvas');
            saveCanvas.width = video.videoWidth;
            saveCanvas.height = video.videoHeight;
            const saveCtx = saveCanvas.getContext('2d');
            saveCtx.drawImage(video, 0, 0);
            await saveBestDetection(sessionId, saveCanvas, bestDetection);
          }
        } else {
          lastDetectionsRef.current = [];
          setDetectionResults([]);
        }
      } catch (err) {
        console.error('Detection error:', err);
      }
    };

    // Run detection at fixed interval instead of every frame
    intervalRef.current = setInterval(sendFrame, DETECTION_INTERVAL_MS);
    // Also run once immediately
    sendFrame();
  };

  // Save best detection frame
  const saveBestDetection = async (sessionId, canvas, detection) => {
    try {
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.9);
      const currentLoc = locationRef.current;

      await trackingService.saveDamage(sessionId, {
        image: imageBase64,
        damage_type: detection.class_name,
        confidence: detection.confidence,
        latitude: currentLoc.lat,
        longitude: currentLoc.lng,
      });

      setSavedDamages((prev) => [...prev, {
        damage_type: detection.class_name,
        confidence: detection.confidence,
        latitude: currentLoc.lat,
        longitude: currentLoc.lng,
        created_at: new Date().toISOString(),
      }]);

      setStatusMessage(`Kerusakan "${detection.class_name}" tersimpan!`);
    } catch (err) {
      console.error('Error saving damage:', err);
    }
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
      setRouteInfo(null);

      // Nyalakan kembali GPS background setelah tracking selesai
      hasFlewOnce.current = false;
      startBackgroundGPS();
    } catch (err) {
      console.error('Error stopping tracking:', err);
      setError('Gagal menghentikan tracking.');
    }
  };

  const stopEverything = () => {
    detectingRef.current = false;
    lastDetectionsRef.current = [];
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    // Clear GPS watchPosition
    if (gpsIntervalRef.current !== null) {
      navigator.geolocation.clearWatch(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
    // Clear force GPS interval
    if (gpsIntervalRef.forceInterval) {
      clearInterval(gpsIntervalRef.forceInterval);
      gpsIntervalRef.forceInterval = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (overlayIntervalRef.current) {
      cancelAnimationFrame(overlayIntervalRef.current);
      overlayIntervalRef.current = null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Tracking Kerusakan Jalan</h1>
        <p className="text-gray-400 mt-2">
          Tentukan rute inspeksi, lalu pantau kondisi jalan secara real-time menggunakan kamera dan GPS
        </p>
      </div>

      {error && (
        <div className="card bg-red-600/20 border-red-600">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-red-400 text-sm whitespace-pre-line">{error}</div>
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

      {/* Info Rute yang dipilih */}
      {routeInfo && (
        <div className="card bg-yellow-600/10 border border-yellow-600/40">
          <div className="flex items-start gap-3">
            <Map className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              {routeInfo.ruasJalanName && (
                <p className="font-semibold text-yellow-300">{routeInfo.ruasJalanName}</p>
              )}
              {routeInfo.startPoint && (
                <p className="text-gray-400">
                  <span className="text-green-400 font-medium">A (Mulai):</span>{' '}
                  {routeInfo.startPoint.lat.toFixed(6)}, {routeInfo.startPoint.lng.toFixed(6)}
                </p>
              )}
              {routeInfo.endPoint && (
                <p className="text-gray-400">
                  <span className="text-red-400 font-medium">B (Akhir):</span>{' '}
                  {routeInfo.endPoint.lat.toFixed(6)}, {routeInfo.endPoint.lng.toFixed(6)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="card">
        <div className="flex gap-4 flex-wrap items-center">
          {!isTracking ? (
            <button onClick={checkPermissions} className="btn-primary flex items-center gap-2 text-lg px-6 py-3">
              <Map className="w-5 h-5" />
              Pilih Rute & Mulai Tracking
            </button>
          ) : (
            <button onClick={stopTracking} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center gap-2 text-lg transition-colors">
              <StopCircle className="w-6 h-6" />
              Selesai Tracking
            </button>
          )}

          {/* Status GPS */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${gpsReady ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'}`}></div>
              <span className={gpsReady ? 'text-green-400' : 'text-yellow-400'}>
                {gpsReady ? `GPS Aktif${gpsAccuracy ? ` (±${gpsAccuracy}m)` : ''}` : 'Mencari GPS...'}
              </span>
            </div>
            {isTracking && location.lat && (
              <div className="flex items-center gap-1 text-gray-400">
                <MapPin className="w-3.5 h-3.5" />
                <span className="font-mono text-xs">{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mini-map posisi petugas */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-secondary border-b border-gray-700">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
            <Navigation className="w-4 h-4 text-blue-400" />
            Posisi Saya
          </div>
          {gpsReady && location.lat && (
            <span className="text-xs text-gray-500 font-mono">
              {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </span>
          )}
        </div>

        <div style={{
          height: '280px',
          position: 'relative',
          overflow: 'hidden',   /* penting: cegah tiles bocor keluar */
          borderRadius: '0 0 8px 8px',
        }}>
          {/* MapContainer selalu di-render agar Leaflet tidak re-mount */}
          <MapContainer
            center={location.lat ? [location.lat, location.lng] : [-0.0917, 109.3717]}
            zoom={location.lat ? 17 : 12}
            style={{ height: '100%', width: '100%', position: 'absolute', inset: 0 }}
            zoomControl={true}
            scrollWheelZoom={true}
            className="map-dark"
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap &copy; CARTO'
              subdomains="abcd"
              maxZoom={19}
            />
            <FlyToLocation location={location} hasFlewOnce={hasFlewOnce} />
            {location.lat && (
              <Marker position={[location.lat, location.lng]} icon={petugasIcon} />
            )}
          </MapContainer>

          {/* Overlay placeholder saat GPS belum siap */}
          {!gpsReady && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1000,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(15,15,35,0.88)', gap: '12px',
              pointerEvents: 'none',
            }}>
              <div style={{
                width: '36px', height: '36px', border: '3px solid #3b82f6',
                borderTopColor: 'transparent', borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>Mencari sinyal GPS...</p>
              <p style={{ color: '#6b7280', fontSize: '12px', margin: 0 }}>Pastikan GPS aktif di pengaturan HP</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Overlay akurasi GPS */}
          {gpsReady && gpsAccuracy && (
            <div style={{
              position: 'absolute', bottom: '8px', left: '8px', zIndex: 1000,
              background: 'rgba(0,0,0,0.7)',
              color: gpsAccuracy <= 10 ? '#22c55e' : gpsAccuracy <= 30 ? '#eab308' : '#ef4444',
              padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600',
              pointerEvents: 'none',
            }}>
              GPS ±{gpsAccuracy}m {gpsAccuracy <= 10 ? '●' : gpsAccuracy <= 30 ? '◐' : '○'}
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
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
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

      {/* Permission Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="card max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <ShieldAlert className="w-8 h-8 text-yellow-400" />
              <h2 className="text-xl font-bold text-primary">Izin Diperlukan</h2>
            </div>

            <p className="text-gray-300 mb-5">
              Untuk memulai tracking, aplikasi membutuhkan akses ke <strong>Kamera</strong> dan <strong>GPS/Lokasi</strong> perangkat Anda.
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 bg-secondary rounded-lg p-3">
                <Camera className="w-6 h-6 text-blue-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Kamera</p>
                  <p className="text-xs text-gray-400">Untuk mendeteksi kerusakan jalan secara real-time</p>
                </div>
                {permissionStatus.camera === 'granted' && <CheckCircle className="w-5 h-5 text-green-400 ml-auto flex-shrink-0" />}
                {permissionStatus.camera === 'denied' && <AlertCircle className="w-5 h-5 text-red-400 ml-auto flex-shrink-0" />}
              </div>

              <div className="flex items-center gap-3 bg-secondary rounded-lg p-3">
                <Navigation className="w-6 h-6 text-green-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">GPS / Lokasi</p>
                  <p className="text-xs text-gray-400">Untuk mencatat koordinat posisi kerusakan</p>
                </div>
                {permissionStatus.gps === 'granted' && <CheckCircle className="w-5 h-5 text-green-400 ml-auto flex-shrink-0" />}
                {permissionStatus.gps === 'denied' && <AlertCircle className="w-5 h-5 text-red-400 ml-auto flex-shrink-0" />}
              </div>
            </div>

            {(permissionStatus.camera === 'denied' || permissionStatus.gps === 'denied' || permissionStatus.gps === 'unavailable') && (
              <div className="bg-red-600/20 border border-red-600 rounded-lg p-3 mb-4">
                <p className="text-red-300 text-sm font-semibold mb-2">Cara mengizinkan di iPhone (iOS):</p>
                <ul className="text-xs text-red-300/80 space-y-1 list-disc list-inside">
                  <li><strong>Lokasi:</strong> Pengaturan → Privacy & Security → Location Services → Safari → While Using</li>
                  <li><strong>Kamera:</strong> Pengaturan → Privacy & Security → Camera → Safari → aktifkan</li>
                  <li>Setelah mengizinkan, kembali ke browser dan coba lagi</li>
                  <li>Pastikan buka via <strong>https://</strong> bukan http://</li>
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowPermissionModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={requestPermissionsAndStart}
                className="flex-1 btn-primary py-3 px-4 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Izinkan & Mulai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Picker Modal - pilih titik mulai & akhir */}
      <MapPickerModal
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={handleRouteConfirmed}
        currentLocation={location.lat ? location : null}
      />
    </div>
  );
};

export default TrackingPage;
