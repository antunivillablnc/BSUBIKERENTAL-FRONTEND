"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import type { FeatureCollection, LineString, Position } from "geojson";
import { rtdb, ref as dbRef, onValue, query as rtdbQuery, orderByKey, limitToLast } from "@/lib/firebaseClient";
import { MAPBOX_TOKEN, getMapStyleUrl, upsertMultiLine, directionsSnapPairs, upsertCirclePoints } from "@/lib/mapboxCommon";
import { useTelemetryRoute } from "@/lib/useTelemetryRoute";

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
  onDistanceChange?: (km: number) => void; // emit live distance
  onWeeklyUpdate?: (data: { day: string; distance: number; calories: number; co2: number }[]) => void;
  onPersonalUpdate?: (stats: { longestRideKm: number; fastestSpeedKmh: number }) => void;
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
  onDistanceChange,
  onWeeklyUpdate,
  onPersonalUpdate,
}: DashboardMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const endMarkerRef = useRef<mapboxgl.Marker | null>(null);
	const deviceMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [liveRoute, setLiveRoute] = useState<LngLatTuple[] | null>(null);
  const [livePoint, setLivePoint] = useState<LngLatTuple | null>(null);
  const centeredOnceRef = useRef(false);
  const [lastFixTs, setLastFixTs] = useState<number | null>(null);
  const fallbackTrailRef = useRef<LngLatTuple[]>([]);
  const [snappedRoute, setSnappedRoute] = useState<LngLatTuple[] | null>(null);
  const snapTimeoutRef = useRef<number | null>(null);
  const snapAbortRef = useRef<AbortController | null>(null);

  const token = (MAPBOX_TOKEN || FALLBACK_TOKEN).trim();

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

  // Use shared telemetry hook: full history and timestamp ordering
  const telemetryPath = deviceId
    ? `tracker/devices/${deviceId}/telemetry`
    : (bikeId ? `tracker/bikes/${bikeId}/telemetry` : (realtimePath || undefined));
  const tele = useTelemetryRoute(telemetryPath);
  useEffect(() => {
    if (tele.coords && tele.coords.length) {
      setLiveRoute(tele.coords);
      setLivePoint(tele.coords[tele.coords.length - 1]);
      setLastFixTs(tele.lastFixTs);
      try { onDistanceChange?.(tele.distanceKm); } catch {}
    } else {
      setLiveRoute(null);
      setLivePoint(null);
      setLastFixTs(null);
      try { onDistanceChange?.(0); } catch {}
    }
  }, [tele.coords, tele.lastFixTs]);

	// Prefer live distance from telemetry for the map's distance display
	const distanceKmDisplay = tele?.distanceKm ?? distanceKm;

	// If deviceId is provided, fetch the latest single-point once (like admin map) to seed location
	useEffect(() => {
		const map = mapRef.current;
		if (!map) return;
		if (!deviceId) return;

		(async () => {
			try {
				const base = process.env.NEXT_PUBLIC_API_BASE_URL || "";
				const res = await fetch(`${base}/tracker/last?deviceId=${encodeURIComponent(String(deviceId))}`, {
					cache: 'no-store',
					credentials: 'omit'
				});
				const json = await res.json();
				const v = json?.data || null;
				if (!v) return;
				const lat = Number(v.lat);
				const lng = Number(v.lng);
				if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

				if (!deviceMarkerRef.current) {
					const el = document.createElement("div");
					el.title = String(deviceId);
					el.style.width = "12px";
					el.style.height = "12px";
					el.style.borderRadius = "9999px";
					el.style.background = "#2563eb";
					el.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.35)";
					deviceMarkerRef.current = new mapboxgl.Marker({ element: el as any, anchor: "bottom" }).setLngLat([lng, lat]).addTo(map);
				} else {
					try { deviceMarkerRef.current.setLngLat([lng, lat]); } catch {}
				}
				setLivePoint([lng, lat]);
				if (typeof v?.ts === "number") setLastFixTs(v.ts);
				if (!centeredOnceRef.current) {
					centeredOnceRef.current = true;
					try { map.flyTo({ center: [lng, lat], zoom: Math.max(zoom, 15) }); } catch {}
				}
			} catch {}
		})();
	}, [deviceId]);

  // Secondary subscription used to compute weekly/personal metrics from timestamped telemetry
  useEffect(() => {
    if (!telemetryPath) return;
    let off: (() => void) | null = null;
    try {
      const q = rtdbQuery(dbRef(rtdb, telemetryPath), orderByKey());
      off = onValue(q as any, (snap) => {
        const obj = (snap as any)?.val?.() ?? (snap as any)?.val ?? null;
        if (!obj || typeof obj !== "object") return;
        const keys = Object.keys(obj).sort();
        type Pt = { lng: number; lat: number; ts: number };
        const pts: Pt[] = [];
        for (const k of keys) {
          const v = obj[k];
          const lat = Number(v?.lat ?? v?.latitude);
          const lng = Number(v?.lng ?? v?.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
          let ts = Number(k);
          if (!(Number.isFinite(ts) && ts > 1e9)) ts = Number(v?.ts ?? v?.timestamp ?? v?.time ?? Date.now());
          pts.push({ lng, lat, ts: ts < 2_000_000_000 ? ts * 1000 : ts });
        }
        if (pts.length < 2) return;

        const toRad = (d: number) => (d * Math.PI) / 180;
        const havKm = (a: Pt, b: Pt) => {
          const R = 6371;
          const dLat = toRad(b.lat - a.lat);
          const dLng = toRad(b.lng - a.lng);
          const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
          const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
          return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
        };

        // Group by date (YYYY-MM-DD)
        const groups: Record<string, number> = {};
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          const dayA = new Date(a.ts).toISOString().slice(0, 10);
          const dayB = new Date(b.ts).toISOString().slice(0, 10);
          if (dayA !== dayB) continue;
          const km = havKm(a, b);
          groups[dayA] = (groups[dayA] || 0) + km;
        }

        // Weekly array Mon..Sun of last 7 days
        const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const MET = 8.0, WEIGHT_KG = 70, SPEED_KMH = 16;
        const weekly: { day: string; distance: number; calories: number; co2: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          const key = d.toISOString().slice(0, 10);
          const dist = Number((groups[key] || 0).toFixed(2));
          const hours = dist / SPEED_KMH;
          const kcal = Math.round(MET * WEIGHT_KG * hours);
          const co2 = Number((dist * 7.5 * 2.31 / 100).toFixed(2));
          weekly.push({ day: dayNames[d.getDay()], distance: dist, calories: kcal, co2 });
        }
        try { onWeeklyUpdate?.(weekly); } catch {}

        // Personal: longest ride and fastest speed
        let longest = 0;
        for (const k of Object.keys(groups)) longest = Math.max(longest, groups[k] || 0);
        let fastest = 0;
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          const dtH = Math.max(1e-6, (b.ts - a.ts) / (1000 * 60 * 60));
          const spd = havKm(a, b) / dtH;
          if (spd < 60) fastest = Math.max(fastest, spd);
        }
        try { onPersonalUpdate?.({ longestRideKm: Number(longest.toFixed(1)), fastestSpeedKmh: Number(fastest.toFixed(1)) }); } catch {}
      });
    } catch {}
    return () => { try { off?.(); } catch {} };
  }, [telemetryPath, onWeeklyUpdate, onPersonalUpdate]);

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

  // Update markers whenever liveRoute changes (no raw polyline)
  useEffect(() => {
    const map = mapRef.current;
    const renderRoute = liveRoute;
    if (!map || !renderRoute || renderRoute.length < 2) return;

    try {
      // Ensure any previous unsnapped line is removed
      try {
        if (map.getLayer("route-line")) map.removeLayer("route-line");
        if (map.getSource("route")) map.removeSource("route");
      } catch {}

      // Draw small dots for each telemetry fix
      try {
        upsertCirclePoints(map as any, "trail-points", "trail-points", renderRoute as any, 3, "#22c55e");
      } catch {}

      // Move start/end markers with route
      const start = renderRoute[0];
      const end = renderRoute[renderRoute.length - 1];
      startMarkerRef.current?.setLngLat(start);
      endMarkerRef.current?.setLngLat(end);

      if (follow) {
        try { map.panTo(end as any); } catch {}
      }
    } catch {}
  }, [liveRoute, follow]);

  // Render snapped segments (multiple lines) based on liveRoute
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !liveRoute || liveRoute.length < 2 || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const segments = await directionsSnapPairs(liveRoute, snapProfile, token, 300);
        if (cancelled) return;
        if (segments && segments.length) {
          upsertMultiLine(map as any, "route-snapped", "route-snapped-line", segments, "#22c55e", 5);
        } else {
          // cleanup if no segments
          try {
            if (map.getLayer("route-snapped-line")) map.removeLayer("route-snapped-line");
            if (map.getSource("route-snapped")) map.removeSource("route-snapped");
            if (map.getLayer("trail-points")) map.removeLayer("trail-points");
            if (map.getSource("trail-points")) map.removeSource("trail-points");
          } catch {}
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
      try {
        if (map.getLayer("route-snapped-line")) map.removeLayer("route-snapped-line");
        if (map.getSource("route-snapped")) map.removeSource("route-snapped");
        if (map.getLayer("trail-points")) map.removeLayer("trail-points");
        if (map.getSource("trail-points")) map.removeSource("trail-points");
      } catch {}
    };
  }, [liveRoute, token, snapProfile]);

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

    const getMapStyle = (dark: boolean) => getMapStyleUrl(dark);

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
        <span style={{ color: "#16a34a", fontWeight: 900 }}>{distanceKmDisplay.toFixed(1)} km</span>
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


