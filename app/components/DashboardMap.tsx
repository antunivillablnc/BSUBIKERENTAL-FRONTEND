"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import type { FeatureCollection, LineString, Position } from "geojson";
import { rtdb, ref as dbRef, onValue, query as rtdbQuery, orderByKey, limitToLast } from "@/lib/firebaseClient";

type LngLatTuple = [number, number];

export type DashboardMapProps = {
  distanceKm?: number;
  route?: LngLatTuple[];
  center?: LngLatTuple;
  zoom?: number;
  className?: string;
  height?: number | string;
  bikeId?: string;
  realtimePath?: string; // optional explicit RTDB path override
  deviceId?: string; // optional deviceId subscription
  follow?: boolean; // keep recentering on new points
  offlineTimeoutMs?: number; // threshold to consider offline
  trailPointLimit?: number; // number of telemetry points to draw
  snapToRoads?: boolean; // use Mapbox Map Matching to follow roads
  snapProfile?: "cycling" | "driving" | "walking"; // map matching profile
  snapMode?: "auto" | "directions" | "off"; // snapping strategy
};

const FALLBACK_TOKEN = ""; // empty indicates missing

export default function DashboardMap({
  distanceKm = 15.2,
  route,
  center,
  zoom = 14,
  className,
  height = 260,
  bikeId,
  realtimePath,
  deviceId,
  follow = true,
  offlineTimeoutMs = 120000,
  trailPointLimit = 100,
  snapToRoads = true,
  snapProfile = "cycling",
  snapMode = "auto",
}: DashboardMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const endMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [liveRoute, setLiveRoute] = useState<LngLatTuple[] | null>(null);
  const [livePoint, setLivePoint] = useState<LngLatTuple | null>(null);
  const centeredOnceRef = useRef(false);
  const [lastFixTs, setLastFixTs] = useState<number | null>(null);
  const fallbackTrailRef = useRef<LngLatTuple[]>([]);
  const [snappedRoute, setSnappedRoute] = useState<LngLatTuple[] | null>(null);
  const snapTimeoutRef = useRef<number | null>(null);
  const snapAbortRef = useRef<AbortController | null>(null);

  const token = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN || FALLBACK_TOKEN).trim();

  // Default route around a small park-like loop
  const defaultRoute: LngLatTuple[] = (
    (liveRoute || route) || [
      [121.11685, 13.9572],
      [121.1182, 13.9579],
      [121.1193, 13.9588],
      [121.1191, 13.9599],
      [121.1177, 13.9602],
      [121.1164, 13.9594],
      [121.1162, 13.9583],
      [121.11685, 13.9572],
    ]
  );

  const defaultCenter: LngLatTuple = center || defaultRoute[0];

  // Subscribe to Realtime Database for a bike's live route
  useEffect(() => {
    const path =
      realtimePath ||
      (bikeId ? `telemetry/${bikeId}/route` : undefined);
    if (!path) return;
    let unsubscribe: (() => void) | null = null;
    try {
      const ref = dbRef(rtdb, path);
      const off = onValue(ref, (snap) => {
        const val = snap.val();
        if (!val) return;
        const pairs: LngLatTuple[] = [];
        const pushIfValid = (lng: any, lat: any) => {
          const Lng = Number(lng), Lat = Number(lat);
          if (!Number.isFinite(Lng) || !Number.isFinite(Lat)) return;
          pairs.push([Lng, Lat]);
        };
        if (Array.isArray(val)) {
          for (const p of val) {
            if (Array.isArray(p) && p.length >= 2) pushIfValid(p[0], p[1]);
            else if (p && typeof p === "object") pushIfValid(p.lng ?? p.longitude, p.lat ?? p.latitude);
          }
        } else if (typeof val === "object") {
          for (const k of Object.keys(val)) {
            const p = val[k];
            if (Array.isArray(p) && p.length >= 2) pushIfValid(p[0], p[1]);
            else if (p && typeof p === "object") pushIfValid(p.lng ?? p.longitude, p.lat ?? p.latitude);
          }
        }
        if (pairs.length >= 2) {
          setLiveRoute(pairs);
          // If map is ready, update source and markers immediately
          const map = mapRef.current;
          if (map && map.getSource("route")) {
            const lineCoordinates: Position[] = pairs.map(([lng, lat]) => [lng, lat]);
            const geojson: FeatureCollection<LineString> = {
              type: "FeatureCollection",
              features: [{ type: "Feature", geometry: { type: "LineString", coordinates: lineCoordinates }, properties: {} }],
            };
            try {
              (map.getSource("route") as mapboxgl.GeoJSONSource).setData(geojson as any);
            } catch {}
            // Reposition markers
            try {
              const start = pairs[0];
              const end = pairs[pairs.length - 1];
              startMarkerRef.current?.setLngLat(start);
              endMarkerRef.current?.setLngLat(end);
              const bounds = new mapboxgl.LngLatBounds();
              pairs.forEach((c) => bounds.extend(c as any));
              try { map.fitBounds(bounds, { padding: 40, duration: 400 }); } catch {}
            } catch {}
          }
        }
      });
      unsubscribe = () => off();
    } catch {
      // ignore
    }
    return () => { unsubscribe?.(); };
  }, [bikeId, realtimePath]);

  // Subscribe to rolling telemetry trail (device or bike) and draw recent path
  useEffect(() => {
    const path = deviceId
      ? `tracker/devices/${deviceId}/telemetry`
      : (bikeId ? `tracker/bikes/${bikeId}/telemetry` : undefined);
    if (!path) return;
    let off: (() => void) | null = null;
    try {
      const q = rtdbQuery(dbRef(rtdb, path), orderByKey(), limitToLast(Math.max(10, trailPointLimit)));
      off = onValue(q as any, (snap) => {
        const obj = (snap as any)?.val?.() ?? (snap as any)?.val ?? null;
        if (!obj || typeof obj !== "object") return;
        const keys = Object.keys(obj).sort();
        const pts: LngLatTuple[] = [];
        for (const k of keys) {
          const v = obj[k];
          const lat = Number(v?.lat ?? v?.latitude);
          const lng = Number(v?.lng ?? v?.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
          pts.push([lng, lat]);
        }
        if (pts.length >= 2) {
          setLiveRoute(pts);
          setLivePoint(pts[pts.length - 1]);
          // Keep fallback trail in sync with server telemetry
          try { fallbackTrailRef.current = pts.slice(-Math.max(10, trailPointLimit)); } catch {}
          const latest = Number(keys[keys.length - 1]);
          if (Number.isFinite(latest)) setLastFixTs(latest < 2_000_000_000 ? latest * 1000 : latest);
        }
      });
    } catch {}
    return () => { try { off?.(); } catch {} };
  }, [bikeId, deviceId, trailPointLimit]);

  // Subscribe to single-point live location similar to admin map
  useEffect(() => {
    centeredOnceRef.current = false;
    if (!bikeId && !deviceId) return;
    let off: (() => void) | null = null;
    try {
      const path = deviceId
        ? `tracker/devices/${deviceId}/last`
        : `tracker/bikes/${bikeId}/last`;
      const refPoint = dbRef(rtdb, path);
      off = onValue(refPoint, (snap) => {
        const v = (snap as any)?.val?.() ?? (snap as any)?.val ?? null;
        if (!v) return;
        const lat = Number(v.lat ?? v.latitude);
        const lng = Number(v.lng ?? v.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const point: LngLatTuple = [lng, lat];
        setLivePoint(point);
        const ts = Number((v as any).ts ?? (v as any).timestamp ?? (v as any).time);
        if (Number.isFinite(ts)) setLastFixTs(ts < 2_000_000_000 ? ts * 1000 : ts);

        // Build a local trail if server telemetry is not being appended
        try {
          const trail = fallbackTrailRef.current;
          const last = trail[trail.length - 1];
          if (!last || last[0] !== point[0] || last[1] !== point[1]) {
            trail.push(point);
            if (trail.length > Math.max(10, trailPointLimit)) trail.shift();
          }
          setLiveRoute([...trail]);
        } catch {}

        // Optionally recenter
        const map = mapRef.current;
        if (map && (!centeredOnceRef.current || follow)) {
          centeredOnceRef.current = true;
          try { map.flyTo({ center: [lng, lat], zoom: Math.max(15, zoom) }); } catch {}
        }
      });
    } catch {}
    return () => { try { off?.(); } catch {} };
  }, [bikeId, deviceId, zoom, follow]);

  // Snap the live route to roads using Mapbox Map Matching (debounced and chunked)
  useEffect(() => {
    if (!snapToRoads || snapMode === "off" || !token) {
      setSnappedRoute(null);
      return;
    }
    if (!liveRoute || liveRoute.length < 2) return;

    // Limit to last N points (Map Matching supports up to ~100 coords per request)
    const limit = Math.max(2, Math.min(trailPointLimit, 100));
    const recent = liveRoute.slice(-limit);

    // debounce requests
    if (snapTimeoutRef.current) {
      try { window.clearTimeout(snapTimeoutRef.current); } catch {}
      snapTimeoutRef.current = null;
    }
    if (snapAbortRef.current) {
      try { snapAbortRef.current.abort(); } catch {}
      snapAbortRef.current = null;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const ac = new AbortController();
        snapAbortRef.current = ac;

        // If user prefers simple simulation, route once between first and last recent points
        if (snapMode === "directions") {
          const start = recent[0];
          const end = recent[recent.length - 1];
          const coords2 = `${start[0]},${start[1]};${end[0]},${end[1]}`;
          const dirUrl = `https://api.mapbox.com/directions/v5/mapbox/${encodeURIComponent(snapProfile)}/${coords2}?geometries=geojson&overview=full&alternatives=false&steps=false&access_token=${encodeURIComponent(token)}`;
          const res = await fetch(dirUrl, { signal: ac.signal });
          if (res.ok) {
            const json = await res.json();
            const routeGeom = json?.routes?.[0]?.geometry?.coordinates;
            if (Array.isArray(routeGeom) && routeGeom.length >= 2) {
              const snapped = (routeGeom as any[])
                .map((c: any): LngLatTuple => [Number(c[0]), Number(c[1])])
                .filter((p: LngLatTuple): p is LngLatTuple => Number.isFinite(p[0]) && Number.isFinite(p[1]));
              if (snapped.length >= 2) { setSnappedRoute(snapped); return; }
            }
          }
          // fall through to auto if directions fails
        }

        // For just two points, use Directions API to compute a road route between them
        if (recent.length === 2) {
          const coords2 = `${recent[0][0]},${recent[0][1]};${recent[1][0]},${recent[1][1]}`;
          const dirUrl = `https://api.mapbox.com/directions/v5/mapbox/${encodeURIComponent(snapProfile)}/${coords2}?geometries=geojson&overview=full&access_token=${encodeURIComponent(token)}`;
          const res = await fetch(dirUrl, { signal: ac.signal });
          if (!res.ok) throw new Error("directions failed");
          const json = await res.json();
          const routeGeom = json?.routes?.[0]?.geometry?.coordinates;
          if (Array.isArray(routeGeom) && routeGeom.length >= 2) {
            const snapped = (routeGeom as any[])
              .map((c: any): LngLatTuple => [Number(c[0]), Number(c[1])])
              .filter((p: LngLatTuple): p is LngLatTuple => Number.isFinite(p[0]) && Number.isFinite(p[1]));
            if (snapped.length >= 2) setSnappedRoute(snapped);
            return;
          }
        }

        // 3+ points: use Map Matching to follow the road along the trace (auto mode)
        const coords = recent.map(([lng, lat]) => `${lng},${lat}`).join(";");
        const radiuses = new Array(recent.length).fill(25).join(";"); // meters tolerance
        const matchUrl = `https://api.mapbox.com/matching/v5/mapbox/${encodeURIComponent(snapProfile)}/${coords}?geometries=geojson&tidy=true&radiuses=${radiuses}&access_token=${encodeURIComponent(token)}`;
        const res = await fetch(matchUrl, { signal: ac.signal });
        if (res.ok) {
          const json = await res.json();
          const match = Array.isArray(json?.matchings) && json.matchings.length > 0 ? json.matchings[0] : null;
          const coordsOut = match?.geometry?.coordinates;
          if (Array.isArray(coordsOut) && coordsOut.length >= 2) {
            const snapped = (coordsOut as any[])
              .map((c: any): LngLatTuple => [Number(c[0]), Number(c[1])])
              .filter((p: LngLatTuple): p is LngLatTuple => Number.isFinite(p[0]) && Number.isFinite(p[1]));
            if (snapped.length >= 2) { setSnappedRoute(snapped); return; }
          }
        }

        // Fallback: a single Directions route from first to last recent point
        const start = recent[0];
        const end = recent[recent.length - 1];
        const coords2 = `${start[0]},${start[1]};${end[0]},${end[1]}`;
        const url = `https://api.mapbox.com/directions/v5/mapbox/${encodeURIComponent(snapProfile)}/${coords2}?geometries=geojson&overview=full&alternatives=false&steps=false&access_token=${encodeURIComponent(token)}`;
        try {
          const r = await fetch(url, { signal: ac.signal });
          if (r.ok) {
            const j = await r.json();
            const geom = j?.routes?.[0]?.geometry?.coordinates;
            if (Array.isArray(geom) && geom.length >= 2) {
              const snapped = (geom as any[])
                .map((c: any): LngLatTuple => [Number(c[0]), Number(c[1])])
                .filter((p: LngLatTuple): p is LngLatTuple => Number.isFinite(p[0]) && Number.isFinite(p[1]));
              if (snapped.length >= 2) { setSnappedRoute(snapped); return; }
            }
          }
        } catch {}
      } catch {
        // fallback silently to raw route
        if (typeof window !== "undefined") {
          try { console.debug("[DashboardMap] snapping failed, rendering raw route"); } catch {}
        }
        setSnappedRoute(null);
      } finally {
        snapAbortRef.current = null;
      }
    }, 350);

    snapTimeoutRef.current = timeoutId;
    return () => {
      try { window.clearTimeout(timeoutId); } catch {}
    };
  }, [liveRoute, snapToRoads, snapProfile, token, trailPointLimit]);

  // Update map line and markers whenever liveRoute changes
  useEffect(() => {
    const map = mapRef.current;
    const renderRoute = (snappedRoute && snappedRoute.length >= 2) ? snappedRoute : liveRoute;
    if (!map || !renderRoute || renderRoute.length < 2) return;

    const lineCoordinates: Position[] = renderRoute.map(([lng, lat]) => [lng, lat]);
    const geojson: FeatureCollection<LineString> = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", geometry: { type: "LineString", coordinates: lineCoordinates }, properties: {} },
      ],
    };

    try {
      if (!map.getSource("route")) {
        map.addSource("route", { type: "geojson", data: geojson });
      } else {
        (map.getSource("route") as mapboxgl.GeoJSONSource).setData(geojson as any);
      }

      if (!map.getLayer("route-line")) {
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          paint: { "line-color": "#22c55e", "line-width": 5, "line-opacity": 0.95 },
        });
      }

      // Move start/end markers with route
      const start = renderRoute[0];
      const end = renderRoute[renderRoute.length - 1];
      startMarkerRef.current?.setLngLat(start);
      endMarkerRef.current?.setLngLat(end);

      if (follow) {
        try { map.panTo(end as any); } catch {}
      }
    } catch {}
  }, [liveRoute, snappedRoute, follow]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!token) return; // Graceful fallback handled by render below
    if (mapRef.current) return; // already initialized

    let cancelled = false;
    let rafId = 0;
    let classObserver: MutationObserver | null = null;

    // Disable Mapbox telemetry to avoid blocked requests to events.mapbox.com
    try {
      (mapboxgl as any).setTelemetryEnabled?.(false);
    } catch {}

    const isDark = () => {
      if (typeof document !== "undefined") {
        return document.documentElement.classList.contains("dark");
      }
      if (typeof window !== "undefined" && window.matchMedia) {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
      return false;
    };

    const getMapStyle = (dark: boolean) => dark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11";

    const applyRouteAndMarkers = (map: mapboxgl.Map) => {
      const hasLine = defaultRoute.length >= 2;
      if (hasLine) {
        const lineCoordinates: Position[] = defaultRoute.map(([lng, lat]) => [lng, lat]);
        const geojson: FeatureCollection<LineString> = {
          type: "FeatureCollection",
          features: [{
            type: "Feature",
            geometry: { type: "LineString", coordinates: lineCoordinates },
            properties: {},
          }],
        };
        if (!map.getSource("route")) {
          map.addSource("route", { type: "geojson", data: geojson });
        }
        if (!map.getLayer("route-line")) {
          map.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            paint: { "line-color": "#22c55e", "line-width": 5, "line-opacity": 0.95 },
          });
        }
      }

      // Start/End markers or single live point
      const start = hasLine ? defaultRoute[0] : (livePoint || defaultRoute[0]);
      const end = hasLine ? defaultRoute[defaultRoute.length - 1] : (livePoint || defaultRoute[0]);

      const startEl = document.createElement("div");
      startEl.style.width = "12px";
      startEl.style.height = "12px";
      startEl.style.borderRadius = "9999px";
      startEl.style.background = "#22c55e";
      startEl.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.35)";

      const endEl = document.createElement("div");
      endEl.style.width = "12px";
      endEl.style.height = "12px";
      endEl.style.borderRadius = "9999px";
      endEl.style.background = "#ef4444";
      endEl.style.boxShadow = "0 0 0 3px rgba(239,68,68,0.35)";

      startMarkerRef.current?.remove();
      endMarkerRef.current?.remove();
      startMarkerRef.current = new mapboxgl.Marker(startEl).setLngLat(start).addTo(map);
      endMarkerRef.current = new mapboxgl.Marker(endEl).setLngLat(end).addTo(map);
    };

    const init = () => {
      if (cancelled) return;
      if (!containerRef.current || !(containerRef.current as any).isConnected) return;

      try {
        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: getMapStyle(isDark()),
          center: defaultCenter,
          zoom,
          attributionControl: false,
        });
        mapRef.current = map;

        // Swallow non-critical mapbox errors that can appear on rapid mount/unmount
        map.on("error", () => {});

        map.on("load", () => {
          if (cancelled) return;
      // Fit bounds to route
      const bounds = new mapboxgl.LngLatBounds();
      defaultRoute.forEach((c) => bounds.extend(c as any));
      try {
        map.fitBounds(bounds, { padding: 40, duration: 600 });
      } catch {}
      applyRouteAndMarkers(map);
    });

        // Observe theme changes on <html class="dark"> and switch style accordingly
        classObserver = new MutationObserver(() => {
          if (!mapRef.current) return;
          const dark = isDark();
          const nextStyle = getMapStyle(dark);
          // Avoid redundant setStyle calls by checking current style id
          const styleUrl = (mapRef.current as any).getStyle()?.sprite as string | undefined;
          if (styleUrl && styleUrl.includes(dark ? "dark" : "light")) return;
          mapRef.current.setStyle(nextStyle);
          mapRef.current.once("styledata", () => {
            if (cancelled || !mapRef.current) return;
            try {
              applyRouteAndMarkers(mapRef.current);
            } catch {}
          });
        });
        classObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      } catch {
        // no-op; mapbox may throw if container disappears mid-init
      }
    };

    // Delay init to avoid clashes with entry/exit animations causing rapid mount/unmount
    rafId = requestAnimationFrame(init);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      classObserver?.disconnect();
      startMarkerRef.current?.remove();
      endMarkerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const heightStyle = typeof height === "number" ? `${height}px` : height;

  if (!token) {
    return (
      <div
        className={className}
        style={{
          position: "relative",
          width: "100%",
          height: heightStyle,
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid var(--border-color, #e5e7eb)",
          background: "var(--card-bg, #ffffff)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", color: "var(--text-secondary, #334155)" }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>
            Map unavailable
          </div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            Set `NEXT_PUBLIC_MAPBOX_TOKEN` to enable the interactive map.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ position: "relative", width: "100%" }}
    >
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: heightStyle,
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid var(--border-color, #e5e7eb)",
        }}
      />

      <div
        style={{
          position: "absolute",
          right: 12,
          top: 12,
          background: "var(--card-bg)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-color)",
          boxShadow: "0 6px 18px var(--shadow-color)",
          borderRadius: 12,
          padding: "10px 12px",
          fontSize: 14,
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 9999, background: "#22c55e" }} />
        <span style={{ fontWeight: 700 }}>Distance Travelled Today:</span>
        <span style={{ color: "#16a34a", fontWeight: 900 }}>{distanceKm.toFixed(1)} km</span>
      </div>

      <div
        style={{
          position: "absolute",
          left: 12,
          top: 12,
          background: "var(--card-bg)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-color)",
          boxShadow: "0 6px 18px var(--shadow-color)",
          borderRadius: 12,
          padding: "8px 10px",
          fontSize: 12,
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        {(() => {
          const now = Date.now();
          const ageMs = lastFixTs ? now - lastFixTs : Infinity;
          const online = ageMs < offlineTimeoutMs;
          const label = online ? "Online" : "No signal";
          const dot = online ? "#22c55e" : "#9ca3af";
          const sub = lastFixTs ? `${Math.round(ageMs / 1000)}s ago` : "—";
          return (
            <>
              <span style={{ width: 8, height: 8, borderRadius: 9999, background: dot }} />
              <span style={{ fontWeight: 700 }}>{label}</span>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{sub}</span>
            </>
          );
        })()}
      </div>
    </div>
  );
}


