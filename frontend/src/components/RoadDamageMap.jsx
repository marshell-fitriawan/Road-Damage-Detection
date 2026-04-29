import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Marker, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ============ WARNA MARKER SESUAI PROPOSAL ============
const getDamageColor = (type) => {
  const colors = {
    'Lubang': '#3b82f6',          // Biru
    'Retak-Buaya': '#ef4444',     // Merah
    'Retak-Memanjang': '#eab308', // Kuning
    'Retak-Melintang': '#22c55e', // Hijau
  };
  return colors[type] || '#6b7280';
};

const getSeveritySize = (severity) => {
  const sizes = { high: 12, medium: 9, low: 6 };
  return sizes[severity] || 8;
};

// ============ BATAS WILAYAH KABUPATEN KUBU RAYA ============
const KUBU_RAYA_CENTER = [-0.0917, 109.3717];
const DEFAULT_ZOOM = 11;
const KUBU_RAYA_BOUNDS = [
  [-1.05, 109.00],
  [0.30, 110.00],
];

// ============ CUSTOM ICON UNTUK POSISI PETUGAS ============
const createPetugasIcon = (color = '#3b82f6') => {
  return L.divIcon({
    className: 'petugas-marker',
    html: `
      <div style="
        width: 20px; height: 20px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 10px ${color}, 0 0 20px ${color}80;
        animation: pulse-glow 1.5s infinite;
      "></div>
      <style>
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 10px ${color}, 0 0 20px ${color}80; transform: scale(1); }
          50% { box-shadow: 0 0 20px ${color}, 0 0 40px ${color}80; transform: scale(1.1); }
        }
      </style>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// ============ KOMPONEN BOUNDARY KUBU RAYA ============
const KubuRayaBoundary = () => {
  const map = useMap();
  const [geoData, setGeoData] = useState(null);

  useEffect(() => {
    // Set map constraints
    map.setMaxBounds(KUBU_RAYA_BOUNDS);
    map.setMinZoom(10);

    // Load boundary GeoJSON
    fetch('/kuburaya-boundary.json')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error('Failed to load boundary:', err));
  }, [map]);

  if (!geoData) return null;

  return (
    <GeoJSON
      data={geoData}
      style={{
        color: '#e94560',        // Warna garis batas: merah/primary
        weight: 3,               // Ketebalan garis
        opacity: 0.8,
        fillColor: '#e94560',    // Warna fill area
        fillOpacity: 0.05,       // Transparan (hampir tidak terlihat)
        dashArray: '8, 4',       // Garis putus-putus
      }}
      onEachFeature={(feature, layer) => {
        layer.bindTooltip('Kabupaten Kubu Raya', {
          permanent: false,
          direction: 'center',
          className: 'kuburaya-tooltip',
        });
      }}
    />
  );
};

// ============ KOMPONEN UTAMA PETA ============
const RoadDamageMap = ({
  markers = [],
  routePaths = [],
  liveTracking = [],
  onMarkerClick,
}) => {
  const petugasColors = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#f97316', '#ec4899'];

  return (
    <MapContainer
      center={KUBU_RAYA_CENTER}
      zoom={DEFAULT_ZOOM}
      maxBounds={KUBU_RAYA_BOUNDS}
      maxBoundsViscosity={1.0}
      minZoom={10}
      className="h-full w-full"
      style={{ minHeight: '500px' }}
    >
      {/* Boundary Kubu Raya (garis batas wilayah) */}
      <KubuRayaBoundary />

      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* ====== RUTE TRACKING YANG SUDAH SELESAI ====== */}
      {routePaths.map((route, index) => (
        route.path && route.path.length > 1 && (
          <Polyline
            key={`route-done-${index}`}
            positions={route.path.map(p => [p.lat, p.lng])}
            color={route.color || '#6b7280'}
            weight={3}
            opacity={0.5}
            dashArray="8, 6"
          />
        )
      ))}

      {/* ====== LIVE TRACKING ====== */}
      {liveTracking.map((session, index) => {
        const color = petugasColors[index % petugasColors.length];
        const routePath = session.route_path || [];
        const lastPos = session.last_position;

        return (
          <React.Fragment key={`live-${session.id}`}>
            {routePath.length > 1 && (
              <Polyline
                positions={routePath.map(p => [p.lat, p.lng])}
                color={color}
                weight={4}
                opacity={0.9}
              />
            )}

            {lastPos && (
              <Marker
                position={[lastPos.lat, lastPos.lng]}
                icon={createPetugasIcon(color)}
              >
                <Popup>
                  <div style={{ color: '#1a1a2e', minWidth: '150px' }}>
                    <h3 style={{ color, fontWeight: 'bold', margin: '0 0 5px 0' }}>
                      {session.user?.name || 'Petugas'}
                    </h3>
                    <p style={{ margin: '2px 0', fontSize: '12px' }}>
                      <strong>Status:</strong> Sedang Tracking
                    </p>
                    <p style={{ margin: '2px 0', fontSize: '12px' }}>
                      <strong>Kerusakan:</strong> {session.total_damages || 0} terdeteksi
                    </p>
                    <p style={{ margin: '2px 0', fontSize: '11px', color: '#666' }}>
                      {lastPos.lat.toFixed(6)}, {lastPos.lng.toFixed(6)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {(session.damages || []).map((damage) => (
              damage.latitude && damage.longitude && (
                <CircleMarker
                  key={`live-dmg-${damage.id}`}
                  center={[damage.latitude, damage.longitude]}
                  radius={10}
                  fillColor={getDamageColor(damage.damage_type)}
                  color={'#ffffff'}
                  weight={2}
                  opacity={1}
                  fillOpacity={0.9}
                >
                  <Popup>
                    <div style={{ color: '#1a1a2e' }}>
                      <h3 style={{ color: getDamageColor(damage.damage_type), fontWeight: 'bold' }}>
                        {damage.damage_type}
                      </h3>
                      <p style={{ fontSize: '12px' }}>Confidence: {(damage.confidence * 100).toFixed(1)}%</p>
                      <p style={{ fontSize: '12px' }}>Petugas: {session.user?.name}</p>
                      <p style={{ fontSize: '11px', color: '#888' }}>BARU TERDETEKSI</p>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            ))}
          </React.Fragment>
        );
      })}

      {/* ====== MARKER KERUSAKAN TERSIMPAN ====== */}
      {markers.map((marker) => (
        <CircleMarker
          key={`dmg-${marker.id}`}
          center={[marker.lat, marker.lng]}
          radius={getSeveritySize(marker.severity)}
          fillColor={getDamageColor(marker.type)}
          color={getDamageColor(marker.type)}
          weight={2}
          opacity={1}
          fillOpacity={0.8}
          eventHandlers={{
            click: () => onMarkerClick && onMarkerClick(marker),
          }}
        >
          <Popup>
            <div style={{ color: '#1a1a2e', minWidth: '200px' }}>
              <h3 style={{ color: getDamageColor(marker.type), fontWeight: 'bold', fontSize: '16px' }}>
                {marker.type}
              </h3>
              {marker.image_url && (
                <img src={marker.image_url} alt={marker.type}
                  style={{ width: '100%', borderRadius: '4px', marginTop: '8px', maxHeight: '150px', objectFit: 'cover' }} />
              )}
              <div style={{ marginTop: '8px', fontSize: '12px' }}>
                <p><strong>Keparahan:</strong> {marker.severity?.toUpperCase()}</p>
                <p><strong>Status:</strong> {marker.status?.toUpperCase()}</p>
                <p><strong>Confidence:</strong> {(marker.confidence * 100).toFixed(1)}%</p>
                {marker.area_cm2 && <p><strong>Luas:</strong> {marker.area_cm2.toFixed(1)} cm²</p>}
                <p><strong>Koordinat:</strong> {marker.lat.toFixed(6)}, {marker.lng.toFixed(6)}</p>
                <p><strong>Waktu:</strong> {new Date(marker.created_at).toLocaleString('id-ID')}</p>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
};

export default RoadDamageMap;
