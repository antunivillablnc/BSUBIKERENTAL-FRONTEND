"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { onValue, ref, rtdb, ref as dbRef, query as rtdbQuery, orderByKey, limitToLast } from "@/lib/firebaseClient";
import { MAPBOX_TOKEN, getMapStyleUrl, upsertGeojsonLine, upsertCirclePoints, fitBoundsToCoords, createDotElement, upsertMultiLine, directionsSnapPairs } from "@/lib/mapboxCommon";
import { useTelemetryRoute } from "@/lib/useTelemetryRoute";

interface Bike {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  status: string;
}

// Normalize a tracker device identifier to the GPS history convention.
// Legacy history keys are shaped like "BIKE_TRACKER_001", even if the
// live device id is "bike_tracker_001" or just "001".
function normalizeHistoryDeviceId(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = String(raw).trim();
  if (!trimmed) return undefined;
  const upper = trimmed.toUpperCase();
  if (upper.startsWith("BIKE_TRACKER_")) return upper;
  const match = upper.match(/\d+/);
  if (match) {
    const n = Number.parseInt(match[0], 10);
    if (Number.isFinite(n)) {
      return `BIKE_TRACKER_${n.toString().padStart(3, "0")}`;
    }
  }
  // Fallback: sanitize non-word characters
  const safe = upper.replace(/[^\w]+/g, "_");
  return safe || undefined;
}

export default function AdminBikesMapPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const markersByIdRef = useRef<Record<string, mapboxgl.Marker>>({});
  const unsubByIdRef = useRef<Record<string, () => void>>({});
  const point1MarkerRef = useRef<mapboxgl.Marker | null>(null);
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const endMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [hasLiveData, setHasLiveData] = useState(false);
  const deviceCenteredRef = useRef(false);
  const lastPosRef = useRef<Record<string, [number, number]>>({});

  // Live route + analytics (for single device tracking)
  const routeRef = useRef<[number, number][]>([]);
  const [distanceKmToday, setDistanceKmToday] = useState(0);
  const [lastFixTs, setLastFixTs] = useState<number | null>(null);
  const snapTimeoutRef = useRef<number | null>(null);
  const snapAbortRef = useRef<AbortController | null>(null);

  const token = MAPBOX_TOKEN;

  // Create a pin-shaped marker element (SVG) with drop shadow
  const createPinElement = (title?: string, color: string = '#22c55e') => {
    const el = document.createElement('div');
    if (title) el.title = title;
    el.style.width = '28px';
    el.style.height = '28px';
    el.style.willChange = 'transform';
    el.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))';
    el.innerHTML = `
      <svg viewBox="0 0 24 24" width="28" height="28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <path fill="${color}" d="M12 2c-4.42 0-8 3.58-8 8 0 5.25 8 12 8 12s8-6.75 8-12c0-4.42-3.58-8-8-8zm0 12a4 4 0 110-8 4 4 0 010 8z"/>
        <circle cx="12" cy="10" r="2.25" fill="#fff"/>
      </svg>
    `;
    return el;
  };

  // Parse query params for optional single-bike focus
  const query = useMemo(() => (typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null), []);
  const qLat = query?.get('lat');
  const qLng = query?.get('lng');
  const qLabel = query?.get('label');
  const qDeviceId = query?.get('deviceId') || undefined;
  const qFollow = (query?.get('follow') || '').toLowerCase();
  const [follow, setFollow] = useState<boolean>(() => !!qDeviceId || qFollow === 'true' || qFollow === '1' || qFollow === 'yes');
  const followRef = useRef<boolean>(!!qDeviceId || qFollow === 'true' || qFollow === '1' || qFollow === 'yes');
  useEffect(() => { followRef.current = follow; }, [follow]);
  const selectedLat = qLat ? Number(qLat) : undefined;
  const selectedLng = qLng ? Number(qLng) : undefined;

  // Smoothly keep the viewport centered near the given position if follow is enabled
  const maybeCenterOn = (map: mapboxgl.Map, key: string, lng: number, lat: number) => {
    if (!followRef.current) return;
    const prev = lastPosRef.current[key];
    lastPosRef.current[key] = [lng, lat];
    if (prev) {
      const dLng = Math.abs(prev[0] - lng);
      const dLat = Math.abs(prev[1] - lat);
      if (dLng < 0.00003 && dLat < 0.00003) return;
    }
    try {
      const bounds: any = (map as any).getBounds?.();
      const inside = bounds && typeof bounds.contains === 'function' ? bounds.contains([lng, lat] as any) : false;
      if (!inside) map.easeTo({ center: [lng, lat], duration: 800 });
      else map.panTo([lng, lat], { duration: 600 });
    } catch {}
  };

  useEffect(() => {
    if (!containerRef.current) return;
    if (!token) return;
    if (mapRef.current) return;

    mapboxgl.accessToken = token;

    // Stick to dark map design at all times (style centrally defined)
    const style = getMapStyleUrl(true);

    // Campus default [lng, lat]
    const center: [number, number] = [121.16294702315251, 13.956835879996431];
    const startZoom = typeof selectedLat === 'number' && typeof selectedLng === 'number' && !Number.isNaN(selectedLat) && !Number.isNaN(selectedLng) ? 17 : 15;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style,
      center,
      zoom: startZoom,
      attributionControl: false,
    });
    map.on("error", () => {});
    mapRef.current = map;

    return () => {
      // no-op
    };
  }, [selectedLat, selectedLng, token]);

  // Render markers whenever bikes or selected coords change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear RTDB listeners for any previous bikes
    for (const off of Object.values(unsubByIdRef.current)) {
      try { off(); } catch {}
    }
    unsubByIdRef.current = {};

    // Clear existing markers
    for (const m of markersRef.current) m.remove();
    markersRef.current = [];
    // Preserve deviceId markers; only remove non-device dynamic markers
    for (const [key, m] of Object.entries(markersByIdRef.current)) {
      if (!key.startsWith('device:')) {
        m.remove();
        delete markersByIdRef.current[key];
      }
    }

    // If single selection provided, place that marker and center
    if (typeof selectedLat === 'number' && !Number.isNaN(selectedLat) && typeof selectedLng === 'number' && !Number.isNaN(selectedLng)) {
      const el = createPinElement(qLabel || undefined, '#2563eb');
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([selectedLng, selectedLat]).addTo(map);
      markersRef.current.push(marker);
      try {
        map.flyTo({ center: [selectedLng, selectedLat], zoom: 17 });
      } catch {}
      return;
    }

    // Otherwise, plot all bikes with coordinates and fit bounds
    const coords: [number, number, string][] = [];
    for (const b of bikes) {
      if (typeof b.latitude === 'number' && typeof b.longitude === 'number') {
        coords.push([b.longitude, b.latitude, b.name]);
      }
    }
    for (const [lng, lat, name] of coords) {
      const el = createPinElement(name, '#22c55e');
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(map);
      markersRef.current.push(marker);
    }
    if (coords.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      coords.forEach(([lng, lat]) => bounds.extend([lng, lat] as [number, number]));
      try {
        map.fitBounds(bounds, { padding: 40, duration: 600 });
      } catch {}
    }
  }, [bikes, selectedLat, selectedLng]);

  // Subscribe to RTDB for live bike positions and update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!Array.isArray(bikes) || bikes.length === 0) return;

    // Helper to upsert a marker for a bike
    const upsertMarker = (bikeId: string, name: string | undefined, lng: number, lat: number) => {
      let marker = markersByIdRef.current[bikeId];
      if (!marker) {
        const el = createPinElement(name || bikeId, '#22c55e');
        marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(map);
        markersByIdRef.current[bikeId] = marker;
      } else {
        try { marker.setLngLat([lng, lat]); } catch {}
      }
      setHasLiveData(true);
      // Follow when tracking a single bike (or follow enabled explicitly)
      if (followRef.current && (bikes.length === 1)) {
        maybeCenterOn(map, `bike:${bikeId}`, lng, lat);
      }
    };

    // Subscribe for each bike
    for (const b of bikes) {
      const path = `tracker/bikes/${b.id}/last`;
      const off = onValue(ref(rtdb, path), (snap: any) => {
        const v = snap?.val?.() ?? snap?.val ?? null;
        if (!v) return;
        const lat = Number(v.lat);
        const lng = Number(v.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          upsertMarker(b.id, b.name, lng, lat);
        }
      });
      unsubByIdRef.current[b.id] = off;
    }

    return () => {
      for (const off of Object.values(unsubByIdRef.current)) {
        try { off(); } catch {}
      }
      unsubByIdRef.current = {};
      // Do not remove device markers on bikes subscription teardown
      for (const [key, m] of Object.entries(markersByIdRef.current)) {
        if (!key.startsWith('device:')) {
          m.remove();
          delete markersByIdRef.current[key];
        }
      }
    };
  }, [bikes]);

  // Fallback: auto-discover bikes from RTDB when bikes list is empty
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (Array.isArray(bikes) && bikes.length > 0) return; // handled by per-bike subscription

    // Helper to upsert a marker for a bike
    const upsert = (bikeId: string, name: string | undefined, lng: number, lat: number) => {
      let marker = markersByIdRef.current[bikeId];
      if (!marker) {
        const el = createPinElement(name || bikeId, '#22c55e');
        marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(map);
        markersByIdRef.current[bikeId] = marker;
      } else {
        try { marker.setLngLat([lng, lat]); } catch {}
      }
      setHasLiveData(true);
      if (followRef.current) {
        maybeCenterOn(map, `auto:${bikeId}`, lng, lat);
      }
    };

    const off = onValue(ref(rtdb, 'tracker/bikes'), (snap: any) => {
      const obj = snap?.val?.() ?? snap?.val ?? null;
      if (!obj || typeof obj !== 'object') return;
      for (const [bikeId, data] of Object.entries<any>(obj)) {
        const last = (data as any)?.last;
        const lat = Number(last?.lat);
        const lng = Number(last?.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          const name = (last as any)?.bikeName || undefined;
          upsert(bikeId, name, lng, lat);
        }
      }
    });

    return () => {
      try { off(); } catch {}
    };
  }, [bikes]);

  // Removed device 'last' subscription; rely on telemetry stream for position

  // Haversine distance in kilometers
  const haversineKm = (a: [number, number], b: [number, number]) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b[1] - a[1]);
    const dLng = toRad(b[0] - a[0]);
    const lat1 = toRad(a[1]);
    const lat2 = toRad(b[1]);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  };

  // Draw or update the polyline on the map
  // Render the trail: markers come from raw sequential coords, while the line can be raw or snapped
  const upsertRouteOnMap = (rawCoords: [number, number][], lineCoords?: [number, number][]) => {
    const map = mapRef.current;
    if (!map || rawCoords.length < 1) return;

    // Draw full merged trail from Point 1 through Point N
    const drawCoords = (lineCoords && lineCoords.length >= 2) ? lineCoords : rawCoords;
    try {
      // Do not render the unsnapped base polyline; we will show snapped segments only

      // Render all telemetry points as small circles for visibility
      upsertCirclePoints(map, "trail-points", "trail-points", rawCoords, 3, "#22c55e");

      // Markers:
      // - Point 1 (oldest) small gray marker
      // - Start marker shows Point 2 (if exists)
      // - End marker shows Point N (latest)
      const point1 = rawCoords[0];
      const start = rawCoords.length >= 2 ? rawCoords[1] : rawCoords[0];
      const end = rawCoords[rawCoords.length - 1];

      // Point 1 small gray marker
      const p1El = document.createElement("div");
      p1El.title = "Point 1";
      p1El.style.width = "10px";
      p1El.style.height = "10px";
      p1El.style.borderRadius = "9999px";
      p1El.style.background = "#9ca3af";
      p1El.style.boxShadow = "0 0 0 3px rgba(156,163,175,0.35)";
      point1MarkerRef.current?.remove();
      point1MarkerRef.current = new mapboxgl.Marker(p1El).setLngLat(point1 as any).addTo(map);

      const startEl = createDotElement({
        color: "#22c55e",
        shadowColor: "rgba(34,197,94,0.35)",
        size: 12,
        title: rawCoords.length >= 2 ? "Point 2" : "Point 1",
      });

      const endEl = createDotElement({
        color: "#ef4444",
        shadowColor: "rgba(239,68,68,0.35)",
        size: 12,
        title: `Point ${rawCoords.length}`,
      });

      startMarkerRef.current?.remove();
      endMarkerRef.current?.remove();
      startMarkerRef.current = new mapboxgl.Marker(startEl).setLngLat(start as any).addTo(map);
      endMarkerRef.current = new mapboxgl.Marker(endEl).setLngLat(end as any).addTo(map);

      // Fit bounds to full trail 1..N (or to single point if only one)
      const toFrame = drawCoords.length >= 1 ? drawCoords : [rawCoords[0]];
      fitBoundsToCoords(map, toFrame);
    } catch {}
  };

  // Subscribe via shared telemetry hook; build full trail and snap once (optional).
  // Prefer the legacy GPS history RTDB tree when a deviceId is available:
  //   GPS TRACKING HISTORY/devices/{deviceId}/telemetry
  const historyDeviceId = normalizeHistoryDeviceId(qDeviceId);
  const telemetryPath = historyDeviceId
    ? `GPS TRACKING HISTORY/devices/${historyDeviceId}/telemetry`
    : undefined;
  const tele = useTelemetryRoute(telemetryPath);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const rawRoute = tele.coords;
    setDistanceKmToday(tele.distanceKm);
    setLastFixTs(tele.lastFixTs);
    routeRef.current = rawRoute;
    upsertRouteOnMap(rawRoute);

    // Snap each consecutive line segment (A->B) with Directions and render as multiple lines
    (async () => {
      try {
        if (!token || rawRoute.length < 2) return;
        const segments = await directionsSnapPairs(rawRoute, "cycling", token, 300);
        if (segments && segments.length) {
          upsertMultiLine(map, "route-snapped", "route-snapped-line", segments, "#16a34a", 5);
          // Ensure unsnapped line is hidden if any snapped segments exist
          try {
            if (map.getLayer("route-line")) map.removeLayer("route-line");
            if (map.getSource("route")) map.removeSource("route");
          } catch {}
        }
      } catch {}
    })();

    return () => {
      // Clean up route layers when path changes
      try {
        if (map.getLayer("route-line")) map.removeLayer("route-line");
        if (map.getSource("route")) map.removeSource("route");
        if (map.getLayer("route-snapped-line")) map.removeLayer("route-snapped-line");
        if (map.getSource("route-snapped")) map.removeSource("route-snapped");
        if (map.getLayer("trail-points")) map.removeLayer("trail-points");
        if (map.getSource("trail-points")) map.removeSource("trail-points");
      } catch {}
      try { point1MarkerRef.current?.remove(); } catch {}
      try { startMarkerRef.current?.remove(); } catch {}
      try { endMarkerRef.current?.remove(); } catch {}
    };
  }, [tele.coords, tele.lastFixTs, tele.distanceKm, token]);

  // If a deviceId is provided in the query, fetch the latest position once and show a marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!qDeviceId) return;

    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || "";
        const res = await fetch(`${base}/tracker/last?deviceId=${encodeURIComponent(String(qDeviceId))}`, {
          cache: 'no-store',
          credentials: 'omit'
        });
        const json = await res.json();
        const v = json?.data || null;
        if (!v) return;
        const lat = Number(v.lat);
        const lng = Number(v.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const key = `device:${qDeviceId}`;
        let marker = markersByIdRef.current[key];
        if (!marker) {
          const el = createPinElement(String(qDeviceId), '#2563eb');
          marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(map);
          markersByIdRef.current[key] = marker;
        } else {
          try { marker.setLngLat([lng, lat]); } catch {}
        }
        setHasLiveData(true);
        if (!deviceCenteredRef.current) {
          deviceCenteredRef.current = true;
          try { map.flyTo({ center: [lng, lat], zoom: 17 }); } catch {}
        }
      } catch {}
    })();
  }, [qDeviceId]);

  useEffect(() => {
    // Load bikes for all-markers view
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/bikes`, {
          credentials: 'include'
        });
        const data = await res.json();
        if (data?.success && Array.isArray(data.bikes)) setBikes(data.bikes);
      } catch {}
    })();
  }, []);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      for (const m of markersRef.current) m.remove();
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const showNoGpsNotice =
    !(typeof selectedLat === 'number' && typeof selectedLng === 'number') &&
    !hasLiveData &&
    bikes.every(b => !(typeof b.latitude === 'number' && typeof b.longitude === 'number'));

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ color: '#1976d2', fontWeight: 800, fontSize: 28 }}>Bike Locations Map</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#374151' }}>
              <input
                type="checkbox"
                checked={follow}
                onChange={(e) => setFollow(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              Follow live location
            </label>
            <a href="/admin/bikes" style={{ color: '#1976d2', fontWeight: 700, textDecoration: 'none' }}>← Back to Bikes</a>
          </div>
        </div>
        {showNoGpsNotice && (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', padding: 12, borderRadius: 8, marginBottom: 12, fontWeight: 600 }}>
            No GPS coordinates set for this bike yet. Showing default campus view.
          </div>
        )}
        {!token ? (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e0e0e0', padding: 24 }}>
            Set NEXT_PUBLIC_MAPBOX_TOKEN to enable the map.
          </div>
        ) : (
          <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 16, border: '1px solid var(--border-color, #e5e7eb)', overflow: 'hidden', position: 'relative', boxShadow: '0 6px 18px var(--shadow-color, rgba(0,0,0,0.12))' }}>
            <div ref={containerRef} style={{ height: '70vh', width: '100%' }} />

            {/* Status overlay (left top) */}
            <div
              style={{
                position: 'absolute',
                left: 12,
                top: 12,
                background: 'var(--card-bg, #fff)',
                color: 'var(--text-primary, #111827)',
                border: '1px solid var(--border-color, #e5e7eb)',
                boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                borderRadius: 12,
                padding: '8px 10px',
                fontSize: 12,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}
            >
              {(() => {
                const now = Date.now();
                const ageMs = lastFixTs ? now - lastFixTs : Infinity;
                const online = ageMs < 120000;
                const label = online ? 'Online' : 'No signal';
                const dot = online ? '#22c55e' : '#9ca3af';
                const sub = lastFixTs ? `${Math.round(ageMs / 1000)}s ago` : '—';
                return (
                  <>
                    <span style={{ width: 8, height: 8, borderRadius: 9999, background: dot }} />
                    <span style={{ fontWeight: 700 }}>{label}</span>
                    <span style={{ color: '#6b7280', fontWeight: 600 }}>{sub}</span>
                  </>
                );
              })()}
            </div>

            {/* Distance overlay (right top) */}
            <div
              style={{
                position: 'absolute',
                right: 12,
                top: 12,
                background: 'var(--card-bg, #fff)',
                color: 'var(--text-primary, #111827)',
                border: '1px solid var(--border-color, #e5e7eb)',
                boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                borderRadius: 12,
                padding: '10px 12px',
                fontSize: 14,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 9999, background: '#22c55e' }} />
              <span style={{ fontWeight: 700 }}>Distance Travelled:</span>
              <span style={{ color: '#16a34a', fontWeight: 900 }}>{distanceKmToday.toFixed(1)} km</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


