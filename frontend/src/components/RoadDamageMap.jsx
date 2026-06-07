import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Marker, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ============ DATA KECAMATAN KABUPATEN KUBU RAYA ============
export const KECAMATAN_KUBU_RAYA = [
  { id: 'all', name: 'Semua Kecamatan', center: [-0.0917, 109.3717], zoom: 11 },
  { id: 'sungai_raya', name: 'Sungai Raya', center: [-0.2236, 109.6424], zoom: 11, bounds: [[-0.3989, 109.3296], [-0.0483, 109.9553]] },
  { id: 'sungai_kakap', name: 'Sungai Kakap', center: [-0.1526, 109.2070], zoom: 12, bounds: [[-0.3398, 109.0545], [0.0347, 109.3596]] },
  { id: 'rasau_jaya', name: 'Rasau Jaya', center: [-0.2394, 109.3553], zoom: 13, bounds: [[-0.3266, 109.2372], [-0.1522, 109.4735]] },
  { id: 'sungai_ambawang', name: 'Sungai Ambawang', center: [-0.0679, 109.6251], zoom: 11, bounds: [[-0.2293, 109.3642], [0.0935, 109.8860]] },
  { id: 'kuala_mandor_b', name: 'Kuala Mandor B', center: [0.1154, 109.5391], zoom: 12, bounds: [[-0.0428, 109.3657], [0.2737, 109.7126]] },
  { id: 'terentang', name: 'Terentang', center: [-0.3726, 109.7103], zoom: 11, bounds: [[-0.5031, 109.4475], [-0.2421, 109.9732]] },
  { id: 'batu_ampar', name: 'Batu Ampar', center: [-0.7553, 109.5924], zoom: 11, bounds: [[-1.0143, 109.2371], [-0.4964, 109.9478]] },
  { id: 'kubu', name: 'Kubu', center: [-0.4642, 109.4804], zoom: 11, bounds: [[-0.6585, 109.1510], [-0.2699, 109.8097]] },
  { id: 'teluk_pakedai', name: 'Teluk Pakedai', center: [-0.3948, 109.2110], zoom: 12, bounds: [[-0.5719, 109.0848], [-0.2178, 109.3372]] },
];

// ============ TILE LAYERS ============
const TILE_LAYERS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
  },
};

// ============ THEME CONFIGS ============
const THEMES = {
  dark: {
    boundary: { color: '#e94560', weight: 2.5, opacity: 0.9, fillColor: '#e94560', fillOpacity: 0.03, dashArray: '10, 5' },
    markerBorder: '#ffffff',
    markerOpacity: 0.9,
    markerFillOpacity: 0.9,
    popupText: '#f1f1f1',
    popupSubText: '#d1d5db',
    popupMuted: '#9ca3af',
    liveLabel: '#4ade80',
    roadStyles: {
      trunk:          { color: '#ff8c42', weight: 4, opacity: 0.85 },
      trunk_link:     { color: '#ff8c42', weight: 3, opacity: 0.75 },
      primary:        { color: '#ffd166', weight: 3.5, opacity: 0.80 },
      primary_link:   { color: '#ffd166', weight: 2.5, opacity: 0.70 },
      secondary:      { color: '#a8dadc', weight: 3, opacity: 0.70 },
      secondary_link: { color: '#a8dadc', weight: 2, opacity: 0.60 },
      tertiary:       { color: '#90e0ef', weight: 2.5, opacity: 0.55 },
      tertiary_link:  { color: '#90e0ef', weight: 2, opacity: 0.45 },
      residential:    { color: '#6c757d', weight: 1.5, opacity: 0.50 },
      living_street:  { color: '#6c757d', weight: 1.2, opacity: 0.40 },
      unclassified:   { color: '#6c757d', weight: 1.2, opacity: 0.40 },
      service:        { color: '#495057', weight: 1, opacity: 0.35 },
      track:          { color: '#bc6c25', weight: 1, opacity: 0.35, dashArray: '4, 4' },
      default:        { color: '#495057', weight: 1, opacity: 0.30 },
    },
    kecamatanColors: {
      sungai_raya:      { color: '#60a5fa', fillColor: '#3b82f6' },
      sungai_kakap:     { color: '#f87171', fillColor: '#ef4444' },
      rasau_jaya:       { color: '#4ade80', fillColor: '#22c55e' },
      sungai_ambawang:  { color: '#facc15', fillColor: '#eab308' },
      kuala_mandor_b:   { color: '#a78bfa', fillColor: '#8b5cf6' },
      terentang:        { color: '#fb923c', fillColor: '#f97316' },
      batu_ampar:       { color: '#f472b6', fillColor: '#ec4899' },
      kubu:             { color: '#2dd4bf', fillColor: '#14b8a6' },
      teluk_pakedai:    { color: '#22d3ee', fillColor: '#06b6d4' },
    },
    highlightFillOpacity: 0.15,
  },
  light: {
    boundary: { color: '#dc2626', weight: 2.5, opacity: 0.8, fillColor: '#dc2626', fillOpacity: 0.04, dashArray: '10, 5' },
    markerBorder: '#1f2937',
    markerOpacity: 1,
    markerFillOpacity: 0.85,
    popupText: '#1f2937',
    popupSubText: '#374151',
    popupMuted: '#6b7280',
    liveLabel: '#16a34a',
    roadStyles: {
      trunk:          { color: '#c2410c', weight: 4, opacity: 0.80 },
      trunk_link:     { color: '#c2410c', weight: 3, opacity: 0.70 },
      primary:        { color: '#b45309', weight: 3.5, opacity: 0.75 },
      primary_link:   { color: '#b45309', weight: 2.5, opacity: 0.65 },
      secondary:      { color: '#1d4ed8', weight: 3, opacity: 0.65 },
      secondary_link: { color: '#1d4ed8', weight: 2, opacity: 0.55 },
      tertiary:       { color: '#4338ca', weight: 2.5, opacity: 0.50 },
      tertiary_link:  { color: '#4338ca', weight: 2, opacity: 0.40 },
      residential:    { color: '#6b7280', weight: 1.5, opacity: 0.45 },
      living_street:  { color: '#6b7280', weight: 1.2, opacity: 0.35 },
      unclassified:   { color: '#6b7280', weight: 1.2, opacity: 0.35 },
      service:        { color: '#9ca3af', weight: 1, opacity: 0.30 },
      track:          { color: '#92400e', weight: 1, opacity: 0.30, dashArray: '4, 4' },
      default:        { color: '#9ca3af', weight: 1, opacity: 0.25 },
    },
    kecamatanColors: {
      sungai_raya:      { color: '#2563eb', fillColor: '#3b82f6' },
      sungai_kakap:     { color: '#dc2626', fillColor: '#ef4444' },
      rasau_jaya:       { color: '#16a34a', fillColor: '#22c55e' },
      sungai_ambawang:  { color: '#ca8a04', fillColor: '#eab308' },
      kuala_mandor_b:   { color: '#7c3aed', fillColor: '#8b5cf6' },
      terentang:        { color: '#ea580c', fillColor: '#f97316' },
      batu_ampar:       { color: '#db2777', fillColor: '#ec4899' },
      kubu:             { color: '#0d9488', fillColor: '#14b8a6' },
      teluk_pakedai:    { color: '#0891b2', fillColor: '#06b6d4' },
    },
    highlightFillOpacity: 0.18,
  },
};

// ============ WARNA MARKER SESUAI PROPOSAL ============
const getDamageColor = (type) => {
  const colors = {
    'Lubang': '#3b82f6',
    'Retak-Buaya': '#ef4444',
    'Retak-Memanjang': '#eab308',
    'Retak-Melintang': '#22c55e',
  };
  return colors[type] || '#6b7280';
};

const getSeveritySize = (severity) => {
  const sizes = { high: 12, medium: 9, low: 6 };
  return sizes[severity] || 8;
};

// ============ BATAS WILAYAH KABUPATEN KUBU RAYA ============
const KUBU_RAYA_CENTER = [-0.0917, 109.3717];
const DEFAULT_ZOOM = 12;
const MAX_ZOOM = 19;
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

// Icon titik mulai (A) - hijau — dibuat sekali, stabil
const START_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:26px;height:26px;background:#22c55e;
    border:3px solid white;border-radius:50%;
    box-shadow:0 2px 8px rgba(0,0,0,0.5);
    display:flex;align-items:center;justify-content:center;
    font-size:11px;font-weight:bold;color:white;
  ">A</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

// Icon titik akhir (B) - merah — dibuat sekali, stabil
const END_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:26px;height:26px;background:#ef4444;
    border:3px solid white;border-radius:50%;
    box-shadow:0 2px 8px rgba(0,0,0,0.5);
    display:flex;align-items:center;justify-content:center;
    font-size:11px;font-weight:bold;color:white;
  ">B</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

// Fetch rute mengikuti jalan dari OSRM
const fetchRoadRoute = async (start, end) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes.length > 0) {
      return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    }
  } catch (e) {
    console.error('OSRM error:', e);
  }
  return null;
};

// Komponen garis rute A→B mengikuti jalan
const RouteTargetLine = ({ startPoint, endPoint, color }) => {
  const [routePositions, setRoutePositions] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!startPoint || !endPoint) { setRoutePositions(null); return; }
    setLoading(true);
    fetchRoadRoute(startPoint, endPoint).then(coords => {
      if (coords) {
        setRoutePositions(coords);
      } else {
        // Fallback garis lurus
        setRoutePositions([[startPoint.lat, startPoint.lng], [endPoint.lat, endPoint.lng]]);
      }
      setLoading(false);
    });
  }, [startPoint?.lat, startPoint?.lng, endPoint?.lat, endPoint?.lng]);

  if (!routePositions) return null;

  return (
    <>
      {/* Garis luar (shadow) - non-interactive agar tidak blokir klik marker */}
      <Polyline
        positions={routePositions}
        color="#000000"
        weight={7}
        opacity={0.25}
        interactive={false}
      />
      {/* Garis utama target rute - non-interactive */}
      <Polyline
        positions={routePositions}
        color={color}
        weight={4}
        opacity={0.75}
        dashArray="12, 6"
        interactive={false}
      />
    </>
  );
};
const FlyToArea = ({ selectedArea }) => {
  const map = useMap();

  useEffect(() => {
    if (!selectedArea) return;

    const kecamatan = KECAMATAN_KUBU_RAYA.find(k => k.id === selectedArea);
    if (!kecamatan) return;

    if (kecamatan.id === 'all') {
      map.flyTo(KUBU_RAYA_CENTER, DEFAULT_ZOOM, { duration: 1.5 });
    } else if (kecamatan.bounds) {
      map.flyToBounds(kecamatan.bounds, { duration: 1.5, padding: [20, 20], maxZoom: kecamatan.zoom });
    } else {
      map.flyTo(kecamatan.center, kecamatan.zoom, { duration: 1.5 });
    }
  }, [selectedArea, map]);

  return null;
};

// ============ KOMPONEN HIGHLIGHT KECAMATAN ============
const HighlightKecamatan = ({ selectedArea, mapMode }) => {
  const map = useMap();
  const [geoData, setGeoData] = useState(null);
  const layerRef = useRef(null);
  const theme = THEMES[mapMode] || THEMES.dark;

  useEffect(() => {
    fetch('/kuburaya-kecamatan.json')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error('Failed to load kecamatan boundaries:', err));
  }, []);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!geoData || !selectedArea || selectedArea === 'all') return;

    const feature = geoData.features.find(f => f.properties.id === selectedArea);
    if (!feature) return;

    const colors = theme.kecamatanColors[selectedArea] || { color: '#e94560', fillColor: '#e94560' };

    const layer = L.geoJSON(feature, {
      style: {
        color: colors.color,
        weight: 3,
        opacity: 1,
        fillColor: colors.fillColor,
        fillOpacity: theme.highlightFillOpacity,
        dashArray: null,
      },
      interactive: false,
      onEachFeature: (feat, lyr) => {
        lyr.bindTooltip(feat.properties.name, {
          permanent: true,
          direction: 'center',
          className: `kecamatan-highlight-tooltip ${mapMode}`,
        });
      },
    });

    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [selectedArea, geoData, map, mapMode]);

  return null;
};

// ============ KOMPONEN JARINGAN JALAN KUBU RAYA ============
const KubuRayaRoads = ({ mapMode }) => {
  const map = useMap();
  const layerRef = useRef(null);
  const dataRef = useRef(null);
  const dataLoadedRef = useRef(false);
  const theme = THEMES[mapMode] || THEMES.dark;

  const getRoadStyleThemed = (feature) => {
    const highway = feature.properties?.highway || '';
    return theme.roadStyles[highway] || theme.roadStyles.default;
  };

  // Load data once
  useEffect(() => {
    if (dataLoadedRef.current) return;
    dataLoadedRef.current = true;

    fetch('/kuburaya-roads.json')
      .then(res => res.json())
      .then(data => {
        dataRef.current = data;
        rebuildLayer();
      })
      .catch(err => console.error('Failed to load roads:', err));

    const handleZoom = () => {
      if (!layerRef.current) return;
      const zoom = map.getZoom();
      if (zoom >= 12) {
        if (!map.hasLayer(layerRef.current)) {
          layerRef.current.addTo(map);
        }
      } else {
        if (map.hasLayer(layerRef.current)) {
          map.removeLayer(layerRef.current);
        }
      }
    };

    map.on('zoomend', handleZoom);

    return () => {
      map.off('zoomend', handleZoom);
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map]);

  // Rebuild layer when mode changes
  const rebuildLayer = () => {
    if (!dataRef.current) return;

    if (layerRef.current && map.hasLayer(layerRef.current)) {
      map.removeLayer(layerRef.current);
    }

    const layer = L.geoJSON(dataRef.current, {
      style: (feature) => getRoadStyleThemed(feature),
      onEachFeature: (feature, layer) => {
        const name = feature.properties?.name;
        const ref = feature.properties?.ref;
        const highway = feature.properties?.highway;
        if (name || ref) {
          layer.bindTooltip(
            `${name || ''}${ref ? ` (${ref})` : ''}<br/><small>${highway}</small>`,
            { sticky: true, direction: 'top', className: `road-tooltip ${mapMode}` }
          );
        }
      },
      interactive: false,
    });

    layerRef.current = layer;

    if (map.getZoom() >= 12) {
      layer.addTo(map);
    }
  };

  useEffect(() => {
    if (dataRef.current) {
      rebuildLayer();
    }
  }, [mapMode]);

  return null;
};

// ============ KOMPONEN BOUNDARY KUBU RAYA ============
const KubuRayaBoundary = ({ mapMode }) => {
  const map = useMap();
  const [geoData, setGeoData] = useState(null);
  const theme = THEMES[mapMode] || THEMES.dark;

  useEffect(() => {
    map.setMaxBounds(KUBU_RAYA_BOUNDS);
    map.setMinZoom(10);

    fetch('/kuburaya-boundary.json')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error('Failed to load boundary:', err));
  }, [map]);

  if (!geoData) return null;

  return (
    <GeoJSON
      key={`boundary-${mapMode}`}
      data={geoData}
      style={theme.boundary}
      interactive={false}
      onEachFeature={(feature, layer) => {
        layer.bindTooltip('Kabupaten Kubu Raya', {
          permanent: false,
          direction: 'center',
          className: `kuburaya-tooltip ${mapMode}`,
        });
      }}
    />
  );
};

// ============ KOMPONEN RUAS JALAN KABUPATEN KUBU RAYA ============
const RuasJalanLayer = ({ selectedRuas, mapMode, onRuasListLoaded }) => {
  const map = useMap();
  const [geoData, setGeoData] = useState(null);
  const allLayerRef = useRef(null);
  const highlightLayerRef = useRef(null);
  const isDark = mapMode === 'dark';

  // Load GeoJSON once
  useEffect(() => {
    fetch('/kuburaya-ruas-jalan.json')
      .then(res => res.json())
      .then(data => {
        setGeoData(data);
        // Extract road names for parent component
        if (onRuasListLoaded) {
          const roads = data.features
            .filter(f => f.properties.folder === 'Nama & Nomor Ruas')
            .map(f => f.properties.name)
            .filter(Boolean)
            .sort((a, b) => {
              const numA = parseInt(a.match(/^(\d+)/)?.[1] || '999');
              const numB = parseInt(b.match(/^(\d+)/)?.[1] || '999');
              return numA - numB;
            });
          onRuasListLoaded(roads);
        }
      })
      .catch(err => console.error('Failed to load ruas jalan:', err));
  }, []);

  // Show all ruas as thin lines
  useEffect(() => {
    if (!geoData) return;

    if (allLayerRef.current) {
      map.removeLayer(allLayerRef.current);
      allLayerRef.current = null;
    }

    const layer = L.geoJSON(geoData, {
      filter: (feature) => feature.properties.folder === 'Nama & Nomor Ruas',
      style: () => ({
        color: isDark ? '#fbbf24' : '#d97706',
        weight: 2,
        opacity: selectedRuas ? 0.15 : 0.45,
        dashArray: '6, 4',
      }),
      interactive: false,
    });

    layer.addTo(map);
    allLayerRef.current = layer;

    return () => {
      if (allLayerRef.current && map.hasLayer(allLayerRef.current)) {
        map.removeLayer(allLayerRef.current);
      }
    };
  }, [geoData, mapMode, selectedRuas, map]);

  // Highlight selected ruas
  useEffect(() => {
    if (highlightLayerRef.current) {
      map.removeLayer(highlightLayerRef.current);
      highlightLayerRef.current = null;
    }

    if (!geoData || !selectedRuas) return;

    const feature = geoData.features.find(
      f => f.properties.name === selectedRuas && f.properties.folder === 'Nama & Nomor Ruas'
    );
    if (!feature) return;

    const layer = L.geoJSON(feature, {
      style: () => ({
        color: isDark ? '#facc15' : '#b45309',
        weight: 6,
        opacity: 1,
      }),
      interactive: false,
      onEachFeature: (feat, lyr) => {
        lyr.bindTooltip(feat.properties.name, {
          permanent: true,
          direction: 'center',
          className: `ruas-highlight-tooltip ${mapMode}`,
        });
      },
    });

    layer.addTo(map);
    highlightLayerRef.current = layer;

    // Fly to the road
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.flyToBounds(bounds, { duration: 1.2, padding: [40, 40], maxZoom: 15 });
    }

    return () => {
      if (highlightLayerRef.current && map.hasLayer(highlightLayerRef.current)) {
        map.removeLayer(highlightLayerRef.current);
      }
    };
  }, [selectedRuas, geoData, mapMode, map]);

  return null;
};

// ============ KOMPONEN TOGGLE MODE CLASS ============
const MapModeClass = ({ mapMode }) => {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    container.classList.remove('map-dark', 'map-light');
    container.classList.add(`map-${mapMode}`);
  }, [mapMode, map]);

  return null;
};

// ============ KOMPONEN UTAMA PETA ============
const RoadDamageMap = ({
  markers = [],
  routePaths = [],
  liveTracking = [],
  selectedArea = null,
  mapMode = 'dark',
  selectedRuas = null,
  onRuasListLoaded,
  filters = {},
}) => {
  const petugasColors = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#f97316', '#ec4899'];
  const theme = THEMES[mapMode] || THEMES.dark;
  const tile = TILE_LAYERS[mapMode] || TILE_LAYERS.dark;

  // Cache icon petugas per warna — icon stabil = event handler tidak rusak saat re-render
  const petugasIcons = useMemo(() => {
    return petugasColors.map(color => createPetugasIcon(color));
  }, []);

  // Icon A (mulai) dan B (akhir) berwarna unik per rute — dibedakan agar admin tidak bingung
  const routeIcons = useMemo(() => {
    return petugasColors.map(color => ({
      start: L.divIcon({
        className: '',
        html: `<div style="
          width:28px;height:28px;background:${color};
          border:3px solid white;border-radius:50%;
          box-shadow:0 2px 10px rgba(0,0,0,0.6);
          display:flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:bold;color:white;
        ">A</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
      end: L.divIcon({
        className: '',
        html: `<div style="
          width:28px;height:28px;background:${color};
          border:3px solid white;border-radius:50%;
          box-shadow:0 2px 10px rgba(0,0,0,0.6);
          display:flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:bold;color:white;
          outline:3px dashed ${color};outline-offset:3px;
        ">B</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    }));
  }, []);

  // Filter kerusakan sesuai filter aktif (type, severity, status)
  const filterDamages = (damages) => {
    if (!damages || damages.length === 0) return [];
    return damages.filter(d => {
      if (filters.type && d.damage_type !== filters.type) return false;
      if (filters.severity && d.severity !== filters.severity) return false;
      if (filters.status && d.status !== filters.status) return false;
      return true;
    });
  };

  return (
    <MapContainer
      center={KUBU_RAYA_CENTER}
      zoom={DEFAULT_ZOOM}
      maxBounds={KUBU_RAYA_BOUNDS}
      maxBoundsViscosity={1.0}
      minZoom={10}
      maxZoom={MAX_ZOOM}
      className={`h-full w-full map-${mapMode}`}
      style={{ minHeight: '500px', height: '100%' }}
    >
      {/* Set CSS class on map container */}
      <MapModeClass mapMode={mapMode} />

      {/* Boundary Kubu Raya */}
      <KubuRayaBoundary mapMode={mapMode} />

      {/* Fly ke kecamatan yang dipilih */}
      <FlyToArea selectedArea={selectedArea} />

      {/* Highlight area kecamatan yang dipilih */}
      <HighlightKecamatan selectedArea={selectedArea} mapMode={mapMode} />

      {/* Tile Layer - berubah sesuai mode */}
      <TileLayer
        key={`tile-${mapMode}`}
        attribution={tile.attribution}
        url={tile.url}
        subdomains={tile.subdomains}
        maxZoom={MAX_ZOOM}
      />

      {/* Jaringan Jalan Kubu Raya */}
      <KubuRayaRoads mapMode={mapMode} />

      {/* Ruas Jalan Kabupaten (SK Bupati) */}
      <RuasJalanLayer selectedRuas={selectedRuas} mapMode={mapMode} onRuasListLoaded={onRuasListLoaded} />

      {/* ====== RUTE TRACKING YANG SUDAH SELESAI ====== */}
      {routePaths.map((route, index) => {
        const rIcons = routeIcons[index % routeIcons.length];
        return (
        <React.Fragment key={`route-done-${route.id || index}`}>
          {/* Garis rute aktual GPS - hanya render jika ada lebih dari 1 titik */}
          {route.path && route.path.length > 1 && (
            <Polyline
              positions={route.path.map(p => [p.lat, p.lng])}
              color={route.color || '#6b7280'}
              weight={3}
              opacity={0.5}
              dashArray="8, 6"
              interactive={false}
            />
          )}

          {/* Garis target A→B mengikuti jalan (OSRM) - warna sesuai rute */}
          {route.start_point && route.end_point && (
            <RouteTargetLine
              startPoint={route.start_point}
              endPoint={route.end_point}
              color={route.color || '#facc15'}
            />
          )}

          {/* Marker titik mulai (A) — warna unik per petugas */}
          {route.start_point && (
            <Marker position={[route.start_point.lat, route.start_point.lng]} icon={rIcons.start}>
              <Popup>
                <div style={{ color: theme.popupText, minWidth: '160px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ background: route.color, color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', flexShrink: 0 }}>A</span>
                    <span style={{ fontWeight: 'bold', color: route.color, fontSize: '13px' }}>Titik Mulai</span>
                  </div>
                  {route.userName && <p style={{ fontSize: '13px', fontWeight: '700', margin: '2px 0', color: theme.popupText }}>{route.userName}</p>}
                  {route.ruas_jalan_name && <p style={{ fontSize: '11px', color: theme.popupMuted, margin: '2px 0' }}>{route.ruas_jalan_name}</p>}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Marker titik akhir (B) — warna unik per petugas */}
          {route.end_point && (
            <Marker position={[route.end_point.lat, route.end_point.lng]} icon={rIcons.end}>
              <Popup>
                <div style={{ color: theme.popupText, minWidth: '160px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ background: route.color, color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', flexShrink: 0, outline: `2px dashed ${route.color}`, outlineOffset: '2px' }}>B</span>
                    <span style={{ fontWeight: 'bold', color: route.color, fontSize: '13px' }}>Titik Akhir</span>
                  </div>
                  {route.userName && <p style={{ fontSize: '13px', fontWeight: '700', margin: '2px 0', color: theme.popupText }}>{route.userName}</p>}
                  {route.ruas_jalan_name && <p style={{ fontSize: '11px', color: theme.popupMuted, margin: '2px 0' }}>{route.ruas_jalan_name}</p>}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Marker kerusakan — difilter sesuai filter aktif */}
          {filterDamages(route.damages || []).map((damage) => (
            damage.latitude && damage.longitude && (
              <CircleMarker
                key={`done-dmg-${damage.id}`}
                center={[damage.latitude, damage.longitude]}
                radius={getSeveritySize(damage.severity)}
                fillColor={getDamageColor(damage.damage_type)}
                color={theme.markerBorder}
                weight={2}
                opacity={1}
                fillOpacity={theme.markerFillOpacity}
              >
                <Popup maxWidth={280} minWidth={260}>
                  <div style={{ fontFamily: 'sans-serif', padding: '2px' }}>
                    {/* Gambar kerusakan */}
                    {damage.image_url && (
                      <div style={{ margin: '-8px -8px 10px -8px' }}>
                        <img
                          src={damage.image_url}
                          alt={damage.damage_type}
                          style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '6px 6px 0 0', display: 'block' }}
                        />
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0, color: getDamageColor(damage.damage_type), fontWeight: 'bold', fontSize: '15px' }}>
                        {damage.damage_type}
                      </h3>
                      <span style={{
                        padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                        background: damage.severity === 'high' ? '#dc2626' : damage.severity === 'medium' ? '#d97706' : '#16a34a',
                        color: 'white',
                      }}>
                        {damage.severity?.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.8' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', marginBottom: '4px' }}>
                        <span style={{ color: '#6b7280' }}>Status</span>
                        <span style={{
                          padding: '1px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold',
                          background: damage.status === 'repaired' ? '#16a34a' : damage.status === 'verified' ? '#2563eb' : '#d97706',
                          color: 'white',
                        }}>
                          {damage.status?.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Petugas</span>
                        <span style={{ fontWeight: '600' }}>{route.userName}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Confidence</span>
                        <span style={{ fontWeight: '600', color: getDamageColor(damage.damage_type) }}>
                          {(damage.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      {route.ruas_jalan_name && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#6b7280' }}>Ruas</span>
                          <span style={{ fontWeight: '600', fontSize: '11px', maxWidth: '140px', textAlign: 'right' }}>{route.ruas_jalan_name}</span>
                        </div>
                      )}
                      {damage.created_at && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#6b7280' }}>Waktu</span>
                          <span style={{ fontWeight: '600', fontSize: '11px' }}>
                            {new Date(damage.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      <div style={{ marginTop: '6px', padding: '6px 8px', background: '#f3f4f6', borderRadius: '6px', cursor: 'pointer' }}
                        onClick={() => navigator.clipboard?.writeText(`${damage.latitude.toFixed(7)}, ${damage.longitude.toFixed(7)}`)}
                        title="Klik untuk salin koordinat"
                      >
                        <div style={{ color: '#6b7280', fontSize: '10px', marginBottom: '2px' }}>📍 Koordinat (klik untuk salin)</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: '600', color: '#1f2937' }}>
                          {damage.latitude.toFixed(7)}, {damage.longitude.toFixed(7)}
                        </div>
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${damage.latitude},${damage.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'block', marginTop: '8px', textAlign: 'center',
                          padding: '5px', background: '#2563eb', color: 'white',
                          borderRadius: '6px', fontSize: '11px', fontWeight: '600',
                          textDecoration: 'none',
                        }}
                      >
                        🗺 Buka di Google Maps
                      </a>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            )
          ))}
        </React.Fragment>
        );
      })}

      {/* ====== LIVE TRACKING ====== */}
      {liveTracking.map((session, index) => {
        const color = petugasColors[index % petugasColors.length];
        const petugasIcon = petugasIcons[index % petugasColors.length];
        const routePath = session.route_path || [];
        const lastPos = session.last_position;
        const startPoint = session.start_point;
        const endPoint = session.end_point;

        return (
          <React.Fragment key={`live-${session.id}`}>
            {/* Garis rute realtime - non-interactive agar tidak blokir klik marker */}
            {routePath.length > 1 && (
              <Polyline
                positions={routePath.map(p => [p.lat, p.lng])}
                color={color}
                weight={4}
                opacity={0.9}
                interactive={false}
              />
            )}

            {/* Marker titik mulai (A) */}
            {startPoint && (
              <Marker
                position={[startPoint.lat, startPoint.lng]}
                icon={START_ICON}
              >
                <Popup>
                  <div style={{ color: theme.popupText, minWidth: '140px' }}>
                    <p style={{ fontWeight: 'bold', color: '#22c55e', margin: '0 0 4px' }}>Titik Mulai (A)</p>
                    {session.ruas_jalan_name && (
                      <p style={{ fontSize: '12px', margin: '2px 0' }}>{session.ruas_jalan_name}</p>
                    )}
                    <p style={{ fontSize: '11px', color: theme.popupMuted }}>
                      {startPoint.lat.toFixed(6)}, {startPoint.lng.toFixed(6)}
                    </p>
                    <p style={{ fontSize: '11px', color: theme.popupMuted }}>Petugas: {session.user?.name}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Marker titik akhir (B) */}
            {endPoint && (
              <Marker
                position={[endPoint.lat, endPoint.lng]}
                icon={END_ICON}
              >
                <Popup>
                  <div style={{ color: theme.popupText, minWidth: '140px' }}>
                    <p style={{ fontWeight: 'bold', color: '#ef4444', margin: '0 0 4px' }}>Titik Akhir (B)</p>
                    {session.ruas_jalan_name && (
                      <p style={{ fontSize: '12px', margin: '2px 0' }}>{session.ruas_jalan_name}</p>
                    )}
                    <p style={{ fontSize: '11px', color: theme.popupMuted }}>
                      {endPoint.lat.toFixed(6)}, {endPoint.lng.toFixed(6)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Garis target A→B mengikuti jalan (OSRM) */}
            {startPoint && endPoint && (
              <RouteTargetLine
                startPoint={startPoint}
                endPoint={endPoint}
                color={color}
              />
            )}

            {/* Marker posisi petugas saat ini */}
            {lastPos && (
              <Marker
                position={[lastPos.lat, lastPos.lng]}
                icon={petugasIcon}
              >
                <Popup>
                  <div style={{ color: theme.popupText, minWidth: '150px' }}>
                    <h3 style={{ color, fontWeight: 'bold', margin: '0 0 5px 0' }}>
                      {session.user?.name || 'Petugas'}
                    </h3>
                    {session.ruas_jalan_name && (
                      <p style={{ margin: '2px 0', fontSize: '12px', color: theme.popupSubText }}>
                        <strong>Ruas:</strong> {session.ruas_jalan_name}
                      </p>
                    )}
                    <p style={{ margin: '2px 0', fontSize: '12px' }}>
                      <strong>Status:</strong> Sedang Tracking
                    </p>
                    <p style={{ margin: '2px 0', fontSize: '12px' }}>
                      <strong>Kerusakan:</strong> {session.total_damages || 0} terdeteksi
                    </p>
                    <p style={{ margin: '2px 0', fontSize: '11px', color: theme.popupMuted }}>
                      {lastPos.lat.toFixed(6)}, {lastPos.lng.toFixed(6)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {filterDamages(session.damages || []).map((damage) => (
              damage.latitude && damage.longitude && (
                <CircleMarker
                  key={`live-dmg-${damage.id}`}
                  center={[damage.latitude, damage.longitude]}
                  radius={10}
                  fillColor={getDamageColor(damage.damage_type)}
                  color={theme.markerBorder}
                  weight={2}
                  opacity={1}
                  fillOpacity={0.9}
                >
                  <Popup maxWidth={260} minWidth={240}>
                    <div style={{ fontFamily: 'sans-serif', padding: '2px' }}>
                      {/* Badge live */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#16a34a', textTransform: 'uppercase' }}>Live — Baru Terdeteksi</span>
                      </div>

                      <h3 style={{ margin: '0 0 8px', color: getDamageColor(damage.damage_type), fontWeight: 'bold', fontSize: '15px' }}>
                        {damage.damage_type}
                      </h3>

                      <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.8' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#6b7280' }}>Petugas</span>
                          <span style={{ fontWeight: '600' }}>{session.user?.name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#6b7280' }}>Confidence</span>
                          <span style={{ fontWeight: '600', color: getDamageColor(damage.damage_type) }}>
                            {(damage.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        {session.ruas_jalan_name && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#6b7280' }}>Ruas</span>
                            <span style={{ fontWeight: '600', fontSize: '11px', maxWidth: '140px', textAlign: 'right' }}>{session.ruas_jalan_name}</span>
                          </div>
                        )}
                        <div style={{ marginTop: '6px', padding: '6px 8px', background: '#f3f4f6', borderRadius: '6px', cursor: 'pointer' }}
                          onClick={() => navigator.clipboard?.writeText(`${damage.latitude.toFixed(7)}, ${damage.longitude.toFixed(7)}`)}
                          title="Klik untuk salin koordinat"
                        >
                          <div style={{ color: '#6b7280', fontSize: '10px', marginBottom: '2px' }}>📍 Koordinat (klik untuk salin)</div>
                          <div style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: '600', color: '#1f2937' }}>
                            {damage.latitude.toFixed(7)}, {damage.longitude.toFixed(7)}
                          </div>
                        </div>
                        <a
                          href={`https://www.google.com/maps?q=${damage.latitude},${damage.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'block', marginTop: '8px', textAlign: 'center',
                            padding: '5px', background: '#2563eb', color: 'white',
                            borderRadius: '6px', fontSize: '11px', fontWeight: '600',
                            textDecoration: 'none',
                          }}
                        >
                          🗺 Buka di Google Maps
                        </a>
                      </div>
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
          color={theme.markerBorder}
          weight={2}
          opacity={theme.markerOpacity}
          fillOpacity={theme.markerFillOpacity}
        >
          <Popup maxWidth={280} minWidth={260}>
            <div style={{ fontFamily: 'sans-serif', padding: '2px' }}>
              {/* Gambar kerusakan */}
              {marker.image_url && (
                <div style={{ margin: '-8px -8px 10px -8px' }}>
                  <img
                    src={marker.image_url}
                    alt={marker.type}
                    style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '6px 6px 0 0', display: 'block' }}
                  />
                </div>
              )}

              {/* Header jenis kerusakan */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, color: getDamageColor(marker.type), fontWeight: 'bold', fontSize: '15px' }}>
                  {marker.type}
                </h3>
                <span style={{
                  padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                  background: marker.severity === 'high' ? '#dc2626' : marker.severity === 'medium' ? '#d97706' : '#16a34a',
                  color: 'white',
                }}>
                  {marker.severity?.toUpperCase()}
                </span>
              </div>

              {/* Info grid */}
              <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', marginBottom: '4px' }}>
                  <span style={{ color: '#6b7280' }}>Status</span>
                  <span style={{
                    padding: '1px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold',
                    background: marker.status === 'repaired' ? '#16a34a' : marker.status === 'verified' ? '#2563eb' : '#d97706',
                    color: 'white',
                  }}>
                    {marker.status?.toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Confidence</span>
                  <span style={{ fontWeight: '600', color: getDamageColor(marker.type) }}>
                    {(marker.confidence * 100).toFixed(1)}%
                  </span>
                </div>

                {marker.area_cm2 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Luas</span>
                    <span style={{ fontWeight: '600' }}>{marker.area_cm2.toFixed(1)} cm²</span>
                  </div>
                )}

                {marker.petugas_name && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Petugas</span>
                    <span style={{ fontWeight: '600' }}>{marker.petugas_name}</span>
                  </div>
                )}

                {marker.ruas_jalan && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Ruas Jalan</span>
                    <span style={{ fontWeight: '600', fontSize: '11px', maxWidth: '150px', textAlign: 'right' }}>{marker.ruas_jalan}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Waktu</span>
                  <span style={{ fontWeight: '600', fontSize: '11px' }}>
                    {new Date(marker.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Koordinat - bisa dikopi */}
                <div style={{ marginTop: '6px', padding: '6px 8px', background: '#f3f4f6', borderRadius: '6px', cursor: 'pointer' }}
                  onClick={() => navigator.clipboard?.writeText(`${marker.lat.toFixed(7)}, ${marker.lng.toFixed(7)}`)}
                  title="Klik untuk salin koordinat"
                >
                  <div style={{ color: '#6b7280', fontSize: '10px', marginBottom: '2px' }}>📍 Koordinat (klik untuk salin)</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: '600', color: '#1f2937' }}>
                    {marker.lat.toFixed(7)}, {marker.lng.toFixed(7)}
                  </div>
                </div>

                {/* Link Google Maps */}
                <a
                  href={`https://www.google.com/maps?q=${marker.lat},${marker.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block', marginTop: '8px', textAlign: 'center',
                    padding: '5px', background: '#2563eb', color: 'white',
                    borderRadius: '6px', fontSize: '11px', fontWeight: '600',
                    textDecoration: 'none',
                  }}
                >
                  🗺 Buka di Google Maps
                </a>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
};

export default RoadDamageMap;
