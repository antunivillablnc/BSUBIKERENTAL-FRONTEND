"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { FeatureCollection, LineString, Position } from "geojson";

type LngLatTuple = [number, number];

export type DashboardMapProps = {
  distanceKm?: number;
  route?: LngLatTuple[];
  center?: LngLatTuple;
  zoom?: number;
  className?: string;
  height?: number | string;
};

const FALLBACK_TOKEN = ""; // empty indicates missing

export default function DashboardMap({
  distanceKm = 15.2,
  route,
  center,
  zoom = 14,
  className,
  height = 260,
}: DashboardMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const endMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const token = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN || FALLBACK_TOKEN).trim();

  // Default route around a small park-like loop
  const defaultRoute: LngLatTuple[] = (
    route || [
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

  useEffect(() => {
    if (!containerRef.current) return;
    if (!token) return; // Graceful fallback handled by render below
    if (mapRef.current) return; // already initialized

    let cancelled = false;
    let rafId = 0;
    let classObserver: MutationObserver | null = null;

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
      const lineCoordinates: Position[] = defaultRoute.map(([lng, lat]) => [lng, lat]);
      const geojson: FeatureCollection<LineString> = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: lineCoordinates,
            },
            properties: {},
          },
        ],
      };

      if (!map.getSource("route")) {
        map.addSource("route", { type: "geojson", data: geojson });
      }
      if (!map.getLayer("route-line")) {
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          paint: {
            "line-color": "#22c55e",
            "line-width": 5,
            "line-opacity": 0.95,
          },
        });
      }

      // Start/End markers
      const start = defaultRoute[0];
      const end = defaultRoute[defaultRoute.length - 1];

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
    </div>
  );
}


