"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

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
  const [bikes, setBikes] = useState<Bike[]>([]);

  const token = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "").trim();

  // Parse query params for optional single-bike focus
  const query = useMemo(() => (typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null), []);
  const qLat = query?.get('lat');
  const qLng = query?.get('lng');
  const qLabel = query?.get('label');
  const selectedLat = qLat ? Number(qLat) : undefined;
  const selectedLng = qLng ? Number(qLng) : undefined;

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

    const style = isDark() ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11";

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
      const next = isDark() ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11";
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

    // Clear existing markers
    for (const m of markersRef.current) m.remove();
    markersRef.current = [];

    // If single selection provided, place that marker and center
    if (typeof selectedLat === 'number' && !Number.isNaN(selectedLat) && typeof selectedLng === 'number' && !Number.isNaN(selectedLng)) {
      const el = document.createElement('div');
      el.style.width = '12px';
      el.style.height = '12px';
      el.style.borderRadius = '9999px';
      el.style.background = '#2563eb';
      el.style.boxShadow = '0 0 0 4px rgba(37,99,235,0.35)';
      if (qLabel) el.title = qLabel;
      const marker = new mapboxgl.Marker(el).setLngLat([selectedLng, selectedLat]).addTo(map);
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
      const el = document.createElement('div');
      el.title = name;
      el.style.width = '10px';
      el.style.height = '10px';
      el.style.borderRadius = '9999px';
      el.style.background = '#22c55e';
      el.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.35)';
      const marker = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map);
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

  const showNoGpsNotice = !(typeof selectedLat === 'number' && typeof selectedLng === 'number') && bikes.every(b => !(typeof b.latitude === 'number' && typeof b.longitude === 'number'));

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ color: '#1976d2', fontWeight: 800, fontSize: 28 }}>Bike Locations Map</h1>
          <a href="/admin/bikes" style={{ color: '#1976d2', fontWeight: 700, textDecoration: 'none' }}>← Back to Bikes</a>
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


