import React, { useRef, useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { trackingService } from "../services/api";
import {
  Camera,
  StopCircle,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle,
  ShieldAlert,
  Navigation,
  Map,
  PlayCircle,
  Activity,
  Crosshair,
  CameraOff,
  ChevronRight,
  Clock,
  Ruler,
  AlertTriangle,
} from "lucide-react";
import MapPickerModal from "../components/MapPickerModal";

const DETECTION_INTERVAL_MS = 800;
const SEND_WIDTH = 640;
const JPEG_QUALITY = 0.5;
const GPS_INTERVAL_MS = 1000;
const GPS_MIN_DISTANCE_M = 5;

const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const CLASS_COLORS = {
  Lubang: "#3b82f6",
  "Retak-Buaya": "#ef4444",
  "Retak-Memanjang": "#eab308",
  "Retak-Melintang": "#22c55e",
};

const getColorForClass = (className) => CLASS_COLORS[className] || "#888";

const petugasIcon = L.divIcon({
  className: "",
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

/* ─────────────── Sub-components ─────────────── */

const SectionCard = ({ children, className = "" }) => (
  <div
    className={`rounded-xl border border-gray-700/60 bg-[#1a2035] overflow-hidden ${className}`}
  >
    {children}
  </div>
);

const CardHeader = ({
  icon: Icon,
  iconColor = "text-red-400",
  title,
  right,
}) => (
  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/60 bg-[#1d2540]">
    <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
      <Icon className={`w-4 h-4 ${iconColor}`} />
      {title}
    </div>
    {right}
  </div>
);

const GpsBadge = ({ gpsReady, gpsAccuracy }) => (
  <div
    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${
      gpsReady
        ? "bg-green-900/30 border-green-700/50 text-green-400"
        : "bg-yellow-900/30 border-yellow-700/50 text-yellow-400"
    }`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full ${gpsReady ? "bg-green-400" : "bg-yellow-400"} animate-pulse`}
    />
    {gpsReady
      ? `GPS Aktif${gpsAccuracy ? ` ±${gpsAccuracy}m` : ""}`
      : "Mencari GPS..."}
  </div>
);

const StatBox = ({ label, value, unit }) => (
  <div className="bg-[#0f1520] rounded-lg p-3">
    <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">
      {label}
    </p>
    <p className="text-gray-100 text-lg font-semibold leading-none">
      {value} <span className="text-gray-400 text-xs font-normal">{unit}</span>
    </p>
  </div>
);

const DamageRow = ({ damage, index }) => {
  const pct = (damage.confidence * 100).toFixed(1);
  const color = pct >= 70 ? "#ef4444" : pct >= 40 ? "#f59e0b" : "#22c55e";
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800/60 last:border-0 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center gap-2.5">
        <div
          className="w-2 h-2 rounded-sm flex-shrink-0"
          style={{
            background: getColorForClass(
              damage.damage_type || damage.class_name,
            ),
          }}
        />
        <div>
          <p
            className="text-[13px] font-medium"
            style={{
              color: getColorForClass(damage.damage_type || damage.class_name),
            }}
          >
            {damage.damage_type || damage.class_name}
          </p>
          {(damage.latitude || damage.lat) && (
            <p className="text-[10px] text-gray-500 mt-0.5 font-mono">
              {(damage.latitude || damage.lat)?.toFixed(6)},{" "}
              {(damage.longitude || damage.lng)?.toFixed(6)}
            </p>
          )}
        </div>
      </div>
      <span className="text-xs font-semibold" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
};

/* ─────────────── Main Page ─────────────── */

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
  const hasFlewOnce = useRef(false);
  const bgGpsWatchRef = useRef(null);

  const [session, setSession] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsReady, setGpsReady] = useState(false);
  const [detectionResults, setDetectionResults] = useState([]);
  const [totalDetections, setTotalDetections] = useState(0);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [savedDamages, setSavedDamages] = useState([]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState({
    camera: "unknown",
    gps: "unknown",
  });
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [pendingRoute, setPendingRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [sessionStart, setSessionStart] = useState(null);

  useEffect(() => {
    checkActiveSession();
    startBackgroundGPS();
    return () => {
      stopEverything();
      stopBackgroundGPS();
    };
  }, []);

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
      (err) => console.warn("Background GPS error:", err.code),
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 },
    );
  };

  const stopBackgroundGPS = () => {
    if (bgGpsWatchRef.current !== null) {
      navigator.geolocation.clearWatch(bgGpsWatchRef.current);
      bgGpsWatchRef.current = null;
    }
  };

  const checkActiveSession = async () => {
    try {
      const data = await trackingService.getActiveSession();
      if (data.session) {
        setSession(data.session);
        setIsTracking(true);
        setSavedDamages(data.session.road_damages || []);
        if (data.session.start_point || data.session.ruas_jalan_name) {
          setRouteInfo({
            startPoint: data.session.start_point,
            endPoint: data.session.end_point,
            ruasJalanName: data.session.ruas_jalan_name,
          });
        }
        setSessionStart(new Date(data.session.created_at));
        setStatusMessage(
          "Sesi tracking aktif ditemukan. Kamera siap diaktifkan.",
        );
      }
    } catch (err) {
      console.error("Error checking active session:", err);
    }
  };

  const checkPermissions = () => {
    setError(null);
    setShowMapPicker(true);
  };

  const handleRouteConfirmed = (routeData) => {
    setShowMapPicker(false);
    setPendingRoute(routeData);
    setRouteInfo(routeData);
    setShowPermissionModal(true);
  };

  const requestPermissionsAndStart = async () => {
    setShowPermissionModal(false);
    setError(null);
    setStatusMessage("Meminta izin kamera dan GPS...");

    try {
      const testStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      testStream.getTracks().forEach((t) => t.stop());
      setPermissionStatus((prev) => ({ ...prev, camera: "granted" }));
    } catch (err) {
      setError(
        "Izin KAMERA ditolak. Buka pengaturan browser dan izinkan akses kamera untuk situs ini, lalu coba lagi.",
      );
      setPermissionStatus((prev) => ({ ...prev, camera: "denied" }));
      return;
    }

    try {
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setLocation(loc);
            locationRef.current = loc;
            resolve();
          },
          (err) => {
            if (err.code === 1) reject(new Error("PERMISSION_DENIED"));
            else {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const loc = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                  };
                  setLocation(loc);
                  locationRef.current = loc;
                  resolve();
                },
                (lowAccErr) => reject(lowAccErr),
                {
                  enableHighAccuracy: false,
                  timeout: 30000,
                  maximumAge: 30000,
                },
              );
            }
          },
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
        );
      });
      setPermissionStatus((prev) => ({ ...prev, gps: "granted" }));
    } catch (err) {
      const isDenied = err.message === "PERMISSION_DENIED" || err.code === 1;
      setError(
        isDenied
          ? 'Izin GPS/Lokasi ditolak.\n\nCara mengizinkan di iPhone:\n1. Buka Pengaturan → Privacy & Security → Location Services\n2. Cari Safari → pilih "While Using"\n3. Kembali ke browser dan coba lagi'
          : "GPS tidak bisa didapatkan. Pastikan Location Services aktif dan berada di luar ruangan.",
      );
      setPermissionStatus((prev) => ({
        ...prev,
        gps: isDenied ? "denied" : "unavailable",
      }));
      return;
    }

    await startTracking(pendingRoute);
  };

  const startTracking = async (routeData = null) => {
    setError(null);
    try {
      stopBackgroundGPS();
      const data = await trackingService.start(routeData);
      setSession(data.session);
      setIsTracking(true);
      setSessionStart(new Date());
      setStatusMessage("Sesi tracking dimulai. Mengaktifkan kamera...");

      await startCamera();

      if (locationRef.current.lat && locationRef.current.lng) {
        try {
          await trackingService.updateRoute(
            data.session.id,
            locationRef.current.lat,
            locationRef.current.lng,
          );
        } catch (e) {
          console.error("Failed to send initial location:", e);
        }
      }

      startGPSTracking(data.session.id);
      detectingRef.current = true;
      startDetectionLoop(data.session.id);
      startOverlayLoop();

      const ruasInfo = routeData?.ruasJalanName
        ? ` | Ruas: ${routeData.ruasJalanName}`
        : "";
      setStatusMessage(`Tracking aktif${ruasInfo}. Arahkan kamera ke jalan.`);
    } catch (err) {
      console.error("Error starting tracking:", err);
      setError(
        err.response?.data?.message ||
          "Gagal memulai tracking. Pastikan kamera dan GPS diizinkan.",
      );
    }
  };

  const startCamera = async () => {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
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

  const startGPSTracking = (sessionId) => {
    if (!navigator.geolocation) return;
    const gpsOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    };

    const handlePosition = async (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      if (accuracy > 50) return;
      const prev = locationRef.current;
      if (prev.lat && prev.lng) {
        const distance = getDistanceMeters(
          prev.lat,
          prev.lng,
          latitude,
          longitude,
        );
        if (distance < GPS_MIN_DISTANCE_M) {
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
        console.error("Failed to update route:", e);
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      handlePosition,
      (err) => console.warn("GPS watch error:", err.code),
      gpsOptions,
    );
    gpsIntervalRef.current = watchId;

    const forceInterval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        handlePosition,
        (err) => console.warn("GPS force error:", err.code),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 },
      );
    }, GPS_INTERVAL_MS);
    gpsIntervalRef.forceInterval = forceInterval;
  };

  const startOverlayLoop = () => {
    const drawOverlay = () => {
      if (!detectingRef.current || !videoRef.current || !canvasRef.current)
        return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (
        canvas.width !== video.videoWidth ||
        canvas.height !== video.videoHeight
      ) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = video.videoWidth / SEND_WIDTH;
      if (lastDetectionsRef.current.length > 0) {
        lastDetectionsRef.current.forEach((detection) => {
          const { bbox, class_name, confidence } = detection;
          if (!bbox) return;
          const x1 = bbox.x1 * scale;
          const y1 = bbox.y1 * scale;
          const x2 = bbox.x2 * scale;
          const y2 = bbox.y2 * scale;
          const color = getColorForClass(class_name);
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
          const label = `${class_name} ${(confidence * 100).toFixed(1)}%`;
          ctx.font = "14px Arial";
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = color;
          ctx.fillRect(x1, y1 - 22, textWidth + 8, 22);
          ctx.fillStyle = "#fff";
          ctx.fillText(label, x1 + 4, y1 - 6);
        });
      }
      overlayIntervalRef.current = requestAnimationFrame(drawOverlay);
    };
    overlayIntervalRef.current = requestAnimationFrame(drawOverlay);
  };

  const startDetectionLoop = (sessionId) => {
    if (!sendCanvasRef.current)
      sendCanvasRef.current = document.createElement("canvas");
    const sendFrame = async () => {
      if (!detectingRef.current || !videoRef.current) return;
      const video = videoRef.current;
      if (video.videoWidth === 0) return;
      const sendCanvas = sendCanvasRef.current;
      const aspectRatio = video.videoHeight / video.videoWidth;
      sendCanvas.width = SEND_WIDTH;
      sendCanvas.height = Math.round(SEND_WIDTH * aspectRatio);
      const sendCtx = sendCanvas.getContext("2d");
      sendCtx.drawImage(video, 0, 0, SEND_WIDTH, sendCanvas.height);
      try {
        const startTime = performance.now();
        const blob = await new Promise((resolve) =>
          sendCanvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
        );
        if (!blob) return;
        const formData = new FormData();
        formData.append("image", blob, "frame.jpg");
        formData.append("return_image", "false");
        formData.append("conf", "0.25");
        const response = await fetch("/yolo/detect", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        const detectionFps = Math.round(1000 / (performance.now() - startTime));
        setFps(detectionFps);
        if (data.success && data.total_detections > 0) {
          lastDetectionsRef.current = data.detections;
          setDetectionResults(data.detections);
          setTotalDetections((prev) => prev + data.total_detections);
          const best = data.detections.reduce(
            (b, d) => (d.confidence > b.confidence ? d : b),
            data.detections[0],
          );
          if (
            best.confidence > 0.5 &&
            locationRef.current.lat &&
            locationRef.current.lng
          ) {
            const saveCanvas = document.createElement("canvas");
            saveCanvas.width = video.videoWidth;
            saveCanvas.height = video.videoHeight;
            saveCanvas.getContext("2d").drawImage(video, 0, 0);
            await saveBestDetection(sessionId, saveCanvas, best);
          }
        } else {
          lastDetectionsRef.current = [];
          setDetectionResults([]);
        }
      } catch (err) {
        console.error("Detection error:", err);
      }
    };
    intervalRef.current = setInterval(sendFrame, DETECTION_INTERVAL_MS);
    sendFrame();
  };

  const saveBestDetection = async (sessionId, canvas, detection) => {
    try {
      const imageBase64 = canvas.toDataURL("image/jpeg", 0.9);
      const currentLoc = locationRef.current;
      await trackingService.saveDamage(sessionId, {
        image: imageBase64,
        damage_type: detection.class_name,
        confidence: detection.confidence,
        latitude: currentLoc.lat,
        longitude: currentLoc.lng,
      });
      setSavedDamages((prev) => [
        ...prev,
        {
          damage_type: detection.class_name,
          confidence: detection.confidence,
          latitude: currentLoc.lat,
          longitude: currentLoc.lng,
          created_at: new Date().toISOString(),
        },
      ]);
      setStatusMessage(`Kerusakan "${detection.class_name}" tersimpan!`);
    } catch (err) {
      console.error("Error saving damage:", err);
    }
  };

  const stopTracking = async () => {
    try {
      detectingRef.current = false;
      stopEverything();
      if (session) {
        const result = await trackingService.stop(session.id);
        setStatusMessage(
          `Tracking selesai. ${result.total_damages} kerusakan terdeteksi.`,
        );
      }
      setSession(null);
      setIsTracking(false);
      setIsCameraReady(false);
      setDetectionResults([]);
      setRouteInfo(null);
      setSessionStart(null);
      hasFlewOnce.current = false;
      startBackgroundGPS();
    } catch (err) {
      console.error("Error stopping tracking:", err);
      setError("Gagal menghentikan tracking.");
    }
  };

  const stopEverything = () => {
    detectingRef.current = false;
    lastDetectionsRef.current = [];
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (gpsIntervalRef.current !== null) {
      navigator.geolocation.clearWatch(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
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

  /* ─── Derived ─── */
  const allDamages = savedDamages;
  const sessionDuration = sessionStart
    ? Math.floor((Date.now() - sessionStart.getTime()) / 60000)
    : null;

  /* ─── Render ─── */
  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">
          Tracking Kerusakan Jalan
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Tentukan rute inspeksi, lalu pantau kondisi jalan secara real-time
          menggunakan kamera dan GPS
        </p>
      </div>

      {/* Status & Error Banners */}
      {error && (
        <div className="rounded-xl border border-red-600/50 bg-red-600/10 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm whitespace-pre-line">{error}</p>
        </div>
      )}

      {statusMessage && !error && (
        <div className="rounded-xl border border-blue-600/40 bg-blue-600/10 p-3 flex items-center gap-3">
          <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <p className="text-blue-300 text-sm">{statusMessage}</p>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* ── LEFT COLUMN ── */}
        <div className="flex flex-col gap-4">
          {/* Route Selection Card */}
          <SectionCard>
            <CardHeader
              icon={Map}
              iconColor="text-red-400"
              title="Rute Inspeksi"
              right={
                routeInfo &&
                !isTracking && (
                  <button
                    onClick={() => setShowMapPicker(true)}
                    className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1 transition-colors"
                  >
                    Ganti Rute
                  </button>
                )
              }
            />
            <div className="p-4 space-y-3">
              {/* Route info or placeholder */}
              {routeInfo ? (
                <div className="bg-[#0f1520] rounded-lg p-3 flex items-start justify-between">
                  <div className="space-y-1">
                    {routeInfo.ruasJalanName && (
                      <p className="text-gray-100 text-sm font-semibold">
                        {routeInfo.ruasJalanName}
                      </p>
                    )}
                    {routeInfo.startPoint && (
                      <p className="text-xs text-gray-500">
                        <span className="text-green-400 font-medium">A</span>{" "}
                        {routeInfo.startPoint.lat.toFixed(5)},{" "}
                        {routeInfo.startPoint.lng.toFixed(5)}
                      </p>
                    )}
                    {routeInfo.endPoint && (
                      <p className="text-xs text-gray-500">
                        <span className="text-red-400 font-medium">B</span>{" "}
                        {routeInfo.endPoint.lat.toFixed(5)},{" "}
                        {routeInfo.endPoint.lng.toFixed(5)}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 mt-0.5" />
                </div>
              ) : (
                <button
                  onClick={checkPermissions}
                  className="w-full bg-[#0f1520] hover:bg-[#141c2e] border border-gray-700/60 rounded-lg p-3 flex items-center justify-between transition-colors group"
                >
                  <div className="text-left">
                    <p className="text-gray-500 text-xs">Rute dipilih</p>
                    <p className="text-gray-300 text-sm mt-0.5">
                      Pilih rute inspeksi...
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </button>
              )}

              {/* Stats row — shown when tracking */}
              {isTracking && (
                <div className="grid grid-cols-3 gap-2">
                  <StatBox label="FPS" value={fps} />
                  <StatBox label="Total Deteksi" value={totalDetections} />
                  <StatBox label="Tersimpan" value={savedDamages.length} />
                </div>
              )}

              {/* Start / Stop button */}
              {!isTracking ? (
                <button
                  onClick={checkPermissions}
                  className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white font-semibold py-3 rounded-lg transition-all text-sm"
                >
                  <PlayCircle className="w-5 h-5" />
                  Mulai Tracking
                </button>
              ) : (
                <button
                  onClick={stopTracking}
                  className="w-full flex items-center justify-center gap-2 bg-red-700/80 hover:bg-red-700 active:scale-[0.98] text-white font-semibold py-3 rounded-lg transition-all text-sm border border-red-600/50"
                >
                  <StopCircle className="w-5 h-5" />
                  Selesai Tracking
                </button>
              )}

              {/* GPS Status inline */}
              <div className="flex items-center justify-between">
                <GpsBadge gpsReady={gpsReady} gpsAccuracy={gpsAccuracy} />
                {isTracking && location.lat && (
                  <span className="text-gray-500 font-mono text-[10px]">
                    {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                  </span>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Camera Card */}
          <SectionCard>
            <CardHeader
              icon={Camera}
              iconColor="text-blue-400"
              title="Kamera Live"
              right={<GpsBadge gpsReady={gpsReady} gpsAccuracy={gpsAccuracy} />}
            />
            <div className="relative bg-black" style={{ minHeight: "240px" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto"
                style={{ display: isCameraReady ? "block" : "none" }}
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ display: isCameraReady ? "block" : "none" }}
              />

              {!isCameraReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <CameraOff className="w-12 h-12 text-gray-700" />
                  <p className="text-gray-500 text-sm">Kamera belum aktif</p>
                  <p className="text-gray-600 text-xs">
                    Klik "Mulai Tracking" untuk memulai
                  </p>
                </div>
              )}

              {/* Detection badge overlay */}
              {isTracking && isCameraReady && (
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                    <span className="text-xs font-semibold text-red-400">
                      Mendeteksi...
                    </span>
                  </div>
                </div>
              )}

              {/* Live detection chips */}
              {detectionResults.length > 0 && (
                <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
                  {detectionResults.map((d, i) => (
                    <span
                      key={i}
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: getColorForClass(d.class_name) + "33",
                        color: getColorForClass(d.class_name),
                        border: `1px solid ${getColorForClass(d.class_name)}66`,
                      }}
                    >
                      {d.class_name} {(d.confidence * 100).toFixed(0)}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="flex flex-col gap-4">
          {/* Mini Map */}
          <SectionCard>
            <CardHeader
              icon={Crosshair}
              iconColor="text-blue-400"
              title="Posisi Saya"
              right={
                gpsReady &&
                location.lat && (
                  <span className="text-[10px] text-gray-500 font-mono">
                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </span>
                )
              }
            />
            <div
              style={{
                height: "220px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <MapContainer
                center={
                  location.lat
                    ? [location.lat, location.lng]
                    : [-0.0917, 109.3717]
                }
                zoom={location.lat ? 17 : 12}
                style={{
                  height: "100%",
                  width: "100%",
                  position: "absolute",
                  inset: 0,
                }}
                zoomControl={true}
                scrollWheelZoom={true}
                className="map-dark"
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution="&copy; OpenStreetMap &copy; CARTO"
                  subdomains="abcd"
                  maxZoom={19}
                />
                <FlyToLocation location={location} hasFlewOnce={hasFlewOnce} />
                {location.lat && (
                  <Marker
                    position={[location.lat, location.lng]}
                    icon={petugasIcon}
                  />
                )}
              </MapContainer>

              {!gpsReady && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 1000,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(15,15,35,0.88)",
                    gap: "10px",
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      border: "3px solid #3b82f6",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <p style={{ color: "#9ca3af", fontSize: "13px", margin: 0 }}>
                    Mencari sinyal GPS...
                  </p>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}

              {gpsReady && gpsAccuracy && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "8px",
                    left: "8px",
                    zIndex: 1000,
                    background: "rgba(0,0,0,0.7)",
                    color:
                      gpsAccuracy <= 10
                        ? "#22c55e"
                        : gpsAccuracy <= 30
                          ? "#eab308"
                          : "#ef4444",
                    padding: "3px 8px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: "600",
                    pointerEvents: "none",
                  }}
                >
                  GPS ±{gpsAccuracy}m
                </div>
              )}
            </div>
          </SectionCard>

          {/* Saved Damages List */}
          <SectionCard className="flex-1">
            <CardHeader
              icon={AlertTriangle}
              iconColor="text-red-400"
              title={
                <span className="flex items-center gap-2">
                  Kerusakan Tersimpan
                  {allDamages.length > 0 && (
                    <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      {allDamages.length}
                    </span>
                  )}
                </span>
              }
            />
            <div className="max-h-52 overflow-y-auto">
              {allDamages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <AlertTriangle className="w-8 h-8 text-gray-700" />
                  <p className="text-gray-500 text-sm">
                    Belum ada kerusakan tersimpan
                  </p>
                </div>
              ) : (
                allDamages
                  .slice()
                  .reverse()
                  .map((d, i) => <DamageRow key={i} damage={d} index={i} />)
              )}
            </div>

            {/* Legend */}
            <div className="px-4 py-3 border-t border-gray-800/60 bg-[#141c2e]">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {Object.entries(CLASS_COLORS).map(([name, color]) => (
                  <div key={name} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ background: color }}
                    />
                    <span className="text-gray-400 text-[11px]">
                      {name === "Lubang"
                        ? "Lubang (Pothole)"
                        : name.replace("-", " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Permission Modal ── */}
      {showPermissionModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
        >
          <div className="rounded-xl border border-gray-700 bg-[#1a2035] max-w-md w-full p-6 space-y-5">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-7 h-7 text-yellow-400" />
              <h2 className="text-lg font-bold text-gray-100">
                Izin Diperlukan
              </h2>
            </div>

            <p className="text-gray-400 text-sm">
              Aplikasi membutuhkan akses{" "}
              <strong className="text-gray-200">Kamera</strong> dan{" "}
              <strong className="text-gray-200">GPS/Lokasi</strong> untuk
              memulai tracking.
            </p>

            <div className="space-y-2">
              {[
                {
                  icon: Camera,
                  color: "text-blue-400",
                  title: "Kamera",
                  desc: "Mendeteksi kerusakan jalan secara real-time",
                  key: "camera",
                },
                {
                  icon: Navigation,
                  color: "text-green-400",
                  title: "GPS / Lokasi",
                  desc: "Mencatat koordinat posisi kerusakan",
                  key: "gps",
                },
              ].map(({ icon: Icon, color, title, desc, key }) => (
                <div
                  key={key}
                  className="flex items-center gap-3 bg-[#0f1520] rounded-lg p-3"
                >
                  <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-200">
                      {title}
                    </p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                  {permissionStatus[key] === "granted" && (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                  {permissionStatus[key] === "denied" && (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
              ))}
            </div>

            {(permissionStatus.camera === "denied" ||
              ["denied", "unavailable"].includes(permissionStatus.gps)) && (
              <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-3 text-xs text-red-300 space-y-1">
                <p className="font-semibold mb-1">
                  Cara mengizinkan di iPhone (iOS):
                </p>
                <p>
                  • <strong>Lokasi:</strong> Pengaturan → Privacy & Security →
                  Location Services → Safari → While Using
                </p>
                <p>
                  • <strong>Kamera:</strong> Pengaturan → Privacy & Security →
                  Camera → Safari → aktifkan
                </p>
                <p>
                  • Pastikan buka via <strong>https://</strong>
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowPermissionModal(false)}
                className="flex-1 bg-gray-700/50 hover:bg-gray-700 text-gray-300 font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                Batal
              </button>
              <button
                onClick={requestPermissionsAndStart}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Izinkan & Mulai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Picker Modal */}
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
