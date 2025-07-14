"use client";
import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";

// Dynamically import react-leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then(mod => mod.MapContainer),
  { ssr: false, loading: () => <div>Loading map...</div> }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then(mod => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then(mod => mod.Marker),
  { ssr: false }
);

// Types for fetched data
interface Bike {
  id: string;
  name: string;
  plateNumber?: string;
  amenities: string[];
  latitude?: number;
  longitude?: number;
  status: string;
}
interface Application {
  id: string;
  createdAt: string;
}
interface ApiResponse {
  success: boolean;
  bike?: Bike;
  application?: Application;
  error?: string;
}

export default function MyBikePage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Custom bike icon for the map marker, only on client
  const bikeIcon = useMemo(() => {
    if (typeof window !== "undefined") {
      const L = require("leaflet");
      return L.icon({
        iconUrl: "/bike-marker.png",
        iconSize: [40, 50],
        iconAnchor: [20, 50],
        popupAnchor: [0, -50],
        className: "animated-bike-marker", // Add animation class
      });
    }
    return undefined;
  }, []);

  useEffect(() => {
    async function fetchBike() {
      setLoading(true);
      setError("");
      let userId = undefined;
      if (typeof window !== 'undefined') {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            userId = user.id;
          } catch {}
        }
      }
      if (!userId) {
        setError('User not logged in.');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/my-bike?userId=${userId}`);
        const json: ApiResponse = await res.json();
        if (!json.success) throw new Error(json.error || "Unknown error");
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    fetchBike();
  }, []);

  if (!mounted) return null;

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;
  if (error) return <div style={{ padding: 32, color: 'red' }}>{error}</div>;
  if (!data || !data.bike) return <div style={{ padding: 32 }}>You have no active bike rental.</div>;

  const { bike, application } = data;
  // Debug: print coordinates being used for the marker
  console.log('Bike marker coordinates:', bike.latitude, bike.longitude);
  const hasLocation = mounted && bike?.latitude && bike?.longitude && 
                     typeof bike.latitude === 'number' && typeof bike.longitude === 'number';

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      backgroundImage: `url('/car-rental-app.jpg')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundColor: '#aaa',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Overlay for darkening the background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(80,80,80,0.7)',
        zIndex: 0,
        pointerEvents: 'none',
      }} />
      {/* Map (only if we have valid location data and are mounted) */}
      {hasLocation && mounted && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1 }}>
          <MapContainer
            center={[bike.latitude!, bike.longitude!]}
            zoom={16}
            style={{ height: '100%', width: '100%' }}
            key={`map-${bike.latitude}-${bike.longitude}`}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <Marker
              position={[bike.latitude!, bike.longitude!]}
              icon={bikeIcon}
            />
          </MapContainer>
        </div>
      )}
      {/* Overlay Card */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.98)',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          padding: 32,
          minWidth: 320,
          maxWidth: 400,
          zIndex: 10,
          color: '#222',
          fontFamily: 'inherit',
          fontSize: 18,
          letterSpacing: 0.1,
          lineHeight: 1.6,
        }}
      >
        <h2 style={{ margin: 0, fontWeight: 800, color: '#1976d2', fontSize: 28, letterSpacing: 1 }}>
          {bike.name}
        </h2>
        <div style={{ color: '#22c55e', fontWeight: 700, margin: '8px 0 16px 0', fontSize: 20 }}>
          Status: {bike.status.charAt(0).toUpperCase() + bike.status.slice(1)}
        </div>
        <div>
          <b>Plate Number:</b> <span style={{ color: '#1976d2', fontWeight: 600 }}>{bike.plateNumber || 'N/A'}</span>
        </div>
        <div>
          <b>Amenities:</b> {
            (() => {
              let amenities: any = bike.amenities;
              if (!Array.isArray(amenities)) {
                // Try to parse if it's a string like "[Helmet], [Tumbler], [Air Pump]"
                if (typeof amenities === 'string') {
                  amenities = amenities
                    .split(',')
                    .map((s: any) => s.replace(/\[|\]/g, '').trim())
                    .filter(Boolean);
                } else if (typeof amenities === 'object' && amenities !== null) {
                  amenities = Object.values(amenities);
                } else {
                  amenities = [];
                }
              }
              return amenities.length > 0
                ? amenities.map((a: any, i: number) => <span key={i} style={{ background: '#e3f2fd', color: '#1976d2', borderRadius: 6, padding: '2px 8px', marginRight: 6, fontWeight: 500 }}>{a}</span>)
                : <span style={{ color: '#888' }}>None</span>;
            })()
          }
        </div>
        <div>
          <b>Last Updated:</b> {application ? new Date(application.createdAt).toLocaleString() : 'N/A'}
        </div>
        {hasLocation && (
          <div>
            <b>Location:</b> <span style={{ color: '#1976d2', fontWeight: 600 }}>{bike.latitude}, {bike.longitude}</span>
          </div>
        )}
      </div>
    </div>
  );
} 