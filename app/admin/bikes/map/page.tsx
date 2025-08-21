"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";

interface Bike {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  status: string;
}

export default function AdminBikesMapPage() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<Leaflet.Map | null>(null);
  const markersRef = useRef<Leaflet.LayerGroup | null>(null);
  const [bikes, setBikes] = useState<Bike[]>([]);

  // Parse query params for optional single-bike focus
  const query = useMemo(() => (typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null), []);
  const qLat = query?.get('lat');
  const qLng = query?.get('lng');
  const qLabel = query?.get('label');
  const selectedLat = qLat ? Number(qLat) : undefined;
  const selectedLng = qLng ? Number(qLng) : undefined;

  useEffect(() => {
    let isCancelled = false;
    (async () => {
      const leafletModule = await import("leaflet");
      const L: typeof import("leaflet") = (leafletModule as any).default || (leafletModule as any);

      if (isCancelled) return;
      const startCenter: [number, number] = [13.7565, 121.0583];
      const startZoom = typeof selectedLat === 'number' && typeof selectedLng === 'number' && !Number.isNaN(selectedLat) && !Number.isNaN(selectedLng) ? 17 : 15;

      // Initialize map once
      if (!mapInstanceRef.current && mapRef.current) {
        const map = L.map(mapRef.current).setView(startCenter, startZoom);
        mapInstanceRef.current = map;
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(map);
      }

      if (!mapInstanceRef.current) return;
      const map = mapInstanceRef.current;

      // Create or clear markers layer
      if (!markersRef.current) {
        markersRef.current = L.layerGroup().addTo(map);
      } else {
        markersRef.current.clearLayers();
      }

      const defaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      // Single-bike focus if coords provided
      if (typeof selectedLat === 'number' && !Number.isNaN(selectedLat) && typeof selectedLng === 'number' && !Number.isNaN(selectedLng)) {
        map.setView([selectedLat, selectedLng], 17);
        L.marker([selectedLat, selectedLng], { icon: defaultIcon }).addTo(markersRef.current).bindPopup(qLabel || 'Bike');
        return;
      }

      // All bikes with coordinates
      const points: [number, number, string][] = [];
      for (const b of bikes) {
        if (typeof b.latitude === 'number' && typeof b.longitude === 'number') {
          points.push([b.latitude, b.longitude, b.name]);
        }
      }
      for (const [lat, lng, name] of points) {
        L.marker([lat, lng], { icon: defaultIcon }).addTo(markersRef.current).bindPopup(name);
      }
      if (points.length > 0) {
        map.fitBounds(L.latLngBounds(points.map(([lat, lng]) => [lat, lng] as [number, number])).pad(0.2));
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [bikes, qLabel, selectedLat, selectedLng]);

  useEffect(() => {
    // Load bikes for all-markers view
    (async () => {
      try {
        const res = await fetch('/api/admin/bikes');
        const data = await res.json();
        if (data?.success && Array.isArray(data.bikes)) setBikes(data.bikes);
      } catch {}
    })();
  }, []);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current = null;
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
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
          <div ref={mapRef} style={{ height: '70vh', width: '100%' }} />
        </div>
      </div>
    </div>
  );
}


