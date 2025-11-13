import { useEffect, useMemo, useRef, useState } from "react";
import { rtdb, ref as dbRef, onValue } from "@/lib/firebaseClient";

export type LngLatTuple = [number, number];

export type UseTelemetryRouteResult = {
  coords: LngLatTuple[];
  lastFixTs: number | null;
  distanceKm: number;
  isLoaded: boolean;
};

function haversineKm(a: LngLatTuple, b: LngLatTuple): number {
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
}

/**
 * Subscribe to an RTDB telemetry node (e.g., tracker/devices/{id}/telemetry) and
 * produce an ordered coordinate list [lng, lat] sorted by timestamp, along with
 * last fix timestamp and total distance.
 */
export function useTelemetryRoute(path?: string | null): UseTelemetryRouteResult {
  const [coords, setCoords] = useState<LngLatTuple[]>([]);
  const [lastFixTs, setLastFixTs] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!path) {
      setCoords([]);
      setLastFixTs(null);
      setDistanceKm(0);
      setIsLoaded(false);
      return;
    }
    let off: (() => void) | null = null;
    try {
      const ref = dbRef(rtdb, path);
      off = onValue(ref as any, (snap: any) => {
        const obj = snap?.val?.() ?? snap?.val ?? null;
        if (!obj || typeof obj !== "object") {
          setCoords([]);
          setLastFixTs(null);
          setDistanceKm(0);
          setIsLoaded(true);
          return;
        }
        const items: { lng: number; lat: number; ts: number }[] = [];
        for (const [k, vAny] of Object.entries<any>(obj)) {
          const lat = Number(vAny?.lat ?? vAny?.latitude);
          const lng = Number(vAny?.lng ?? vAny?.longitude);
          let ts = Number(vAny?.ts ?? vAny?.timestamp ?? vAny?.time ?? k);
          if (!Number.isFinite(ts)) continue;
          ts = ts < 2_000_000_000 ? ts * 1000 : ts;
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
          items.push({ lng, lat, ts });
        }
        items.sort((a, b) => a.ts - b.ts);
        const pts: LngLatTuple[] = items.map(p => [p.lng, p.lat]);
        setCoords(pts);
        setLastFixTs(items.length ? items[items.length - 1].ts : null);
        // distance
        let km = 0;
        for (let i = 1; i < pts.length; i++) km += haversineKm(pts[i - 1], pts[i]);
        setDistanceKm(km);
        setIsLoaded(true);
      });
    } catch {
      setIsLoaded(true);
    }
    return () => { try { off?.(); } catch {} };
  }, [path]);

  return { coords, lastFixTs, distanceKm, isLoaded };
}


