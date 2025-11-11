"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { onValue, ref, rtdb } from "@/lib/firebaseClient";

interface Bike {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  status: string;
}

export default function AdminBikesMapPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const markersByIdRef = useRef<Record<string, mapboxgl.Marker>>({});
  const unsubByIdRef = useRef<Record<string, () => void>>({});
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [hasLiveData, setHasLiveData] = useState(false);
  const deviceCenteredRef = useRef(false);
  const lastPosRef = useRef<Record<string, [number, number]>>({});

  const token = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "").trim();

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

    const isDark = () => {
      if (typeof document !== "undefined") {
        return document.documentElement.classList.contains("dark");
      }
      if (typeof window !== "undefined" && window.matchMedia) {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
      return false;
    };

    const getRoadStyle = (dark: boolean) =>
      dark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12";

    const style = getRoadStyle(isDark());

    const center: [number, number] = [121.0583, 13.7565];
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

    // Observe theme changes to swap styles
    const classObserver = new MutationObserver(() => {
      if (!mapRef.current) return;
      const next = getRoadStyle(isDark());
      try { mapRef.current.setStyle(next); } catch {}
    });
    classObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      classObserver.disconnect();
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

  // Optional: subscribe directly by deviceId if provided in the URL (?deviceId=...)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!qDeviceId) return;

    const id = String(qDeviceId);
    deviceCenteredRef.current = false;
    const off = onValue(ref(rtdb, `tracker/devices/${id}/last`), (snap: any) => {
      const v = snap?.val?.() ?? snap?.val ?? null;
      if (!v) return;
      const lat = Number(v.lat);
      const lng = Number(v.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      let marker = markersByIdRef.current[`device:${id}`];
      if (!marker) {
        const el = createPinElement(id, '#ef4444'); // red for device tracking
        marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(map);
        markersByIdRef.current[`device:${id}`] = marker;
      } else {
        try { marker.setLngLat([lng, lat]); } catch {}
      }
      setHasLiveData(true);
      if (!deviceCenteredRef.current) {
        try { map.flyTo({ center: [lng, lat], zoom: 17 }); } catch {}
        deviceCenteredRef.current = true;
      } else {
        maybeCenterOn(map, `device:${id}`, lng, lat);
      }
    });

    return () => { try { off(); } catch {} };
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
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
            <div ref={containerRef} style={{ height: '70vh', width: '100%' }} />
          </div>
        )}
      </div>
    </div>
  );
}


