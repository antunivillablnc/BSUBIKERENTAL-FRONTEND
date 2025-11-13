import mapboxgl from "mapbox-gl";

export type LngLatTuple = [number, number];

export const MAPBOX_TOKEN = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "").trim();

export const getMapStyleUrl = (dark: boolean) =>
  dark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11";

export function disableMapboxTelemetry(mapboxglAny: any) {
  try {
    (mapboxglAny as any).setTelemetryEnabled?.(false);
  } catch {}
}

export function upsertGeojsonLine(
  map: any,
  sourceId: string,
  layerId: string,
  coords: LngLatTuple[],
  color: string = "#22c55e",
  width: number = 5
) {
  const geojson: any = {
    type: "FeatureCollection",
    features:
      coords.length >= 2
        ? [
            {
              type: "Feature",
              geometry: { type: "LineString", coordinates: coords.map(([lng, lat]) => [lng, lat]) },
              properties: {},
            },
          ]
        : [],
  };
  if (coords.length >= 2) {
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, { type: "geojson", data: geojson });
    } else {
      (map.getSource(sourceId) as any).setData(geojson as any);
    }
    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        paint: { "line-color": color, "line-width": width, "line-opacity": 0.95 },
      });
    }
  } else {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  }
}

export function upsertCirclePoints(
  map: any,
  sourceId: string,
  layerId: string,
  coords: LngLatTuple[],
  radius: number = 3,
  color: string = "#22c55e"
) {
  const geojson: any = {
    type: "FeatureCollection",
    features: coords.map(([lng, lat], i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: { index: i + 1 },
    })),
  };
  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, { type: "geojson", data: geojson });
  } else {
    (map.getSource(sourceId) as any).setData(geojson as any);
  }
  if (!map.getLayer(layerId)) {
    map.addLayer({
      id: layerId,
      type: "circle",
      source: sourceId,
      paint: {
        "circle-color": color,
        "circle-radius": radius,
        "circle-opacity": 0.9,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#0f172a",
      },
    });
  }
}

export function fitBoundsToCoords(
  map: any,
  coords: LngLatTuple[],
  padding: number = 40,
  duration: number = 600
) {
  try {
    const bounds = new mapboxgl.LngLatBounds();
    coords.forEach((c) => bounds.extend(c as any));
    map.fitBounds(bounds, { padding, duration });
  } catch {}
}

export function upsertMultiLine(
  map: any,
  sourceId: string,
  layerId: string,
  segments: LngLatTuple[][],
  color: string = "#16a34a",
  width: number = 5
) {
  const features =
    (segments || [])
      .filter(seg => Array.isArray(seg) && seg.length >= 2)
      .map(seg => ({
        type: "Feature",
        geometry: { type: "LineString", coordinates: seg.map(([lng, lat]) => [lng, lat]) },
        properties: {},
      }));
  const geojson: any = { type: "FeatureCollection", features };
  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, { type: "geojson", data: geojson });
  } else {
    (map.getSource(sourceId) as any).setData(geojson as any);
  }
  if (!map.getLayer(layerId)) {
    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      paint: { "line-color": color, "line-width": width, "line-opacity": 0.95 },
    });
  }
}

export function createDotElement(options: {
  color: string;
  shadowColor?: string;
  size?: number;
  title?: string;
}) {
  const { color, shadowColor = "rgba(0,0,0,0.25)", size = 12, title } = options;
  const el = document.createElement("div");
  if (title) el.title = title;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = "9999px";
  el.style.background = color;
  el.style.boxShadow = `0 0 0 3px ${shadowColor}`;
  return el;
}

export async function directionsSnapCoords(
  start: LngLatTuple,
  end: LngLatTuple,
  profile: "cycling" | "driving" | "walking",
  token: string
): Promise<LngLatTuple[] | null> {
  try {
    const coords2 = `${start[0]},${start[1]};${end[0]},${end[1]}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/${encodeURIComponent(
      profile
    )}/${coords2}?geometries=geojson&overview=full&alternatives=false&steps=false&access_token=${encodeURIComponent(
      token
    )}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const j = await res.json();
    const geom = j?.routes?.[0]?.geometry?.coordinates;
    if (Array.isArray(geom) && geom.length >= 2) {
      const snapped = (geom as any[]).map((c: any): LngLatTuple => [Number(c[0]), Number(c[1])]);
      return snapped.length >= 2 ? snapped : null;
    }
  } catch {}
  return null;
}

export async function directionsSnapPairs(
  coords: LngLatTuple[],
  profile: "cycling" | "driving" | "walking",
  token: string,
  maxPairs: number = 200
): Promise<LngLatTuple[][]> {
  if (!Array.isArray(coords) || coords.length < 2) return [];
  const segments: LngLatTuple[][] = [];
  const n = Math.min(coords.length - 1, maxPairs);
  for (let i = 0; i < n; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    try {
      const snapped = await directionsSnapCoords(a, b, profile, token);
      if (snapped && snapped.length >= 2) {
        segments.push(snapped);
      }
    } catch {
      // skip failed pair
    }
  }
  return segments;
}

export async function mapMatchChunks(
  coords: LngLatTuple[],
  profile: "cycling" | "driving" | "walking",
  token: string,
  chunkSize: number = 100,
  overlapPoints: number = 1
): Promise<LngLatTuple[][]> {
  if (!Array.isArray(coords) || coords.length < 2) return [];
  const segments: LngLatTuple[][] = [];
  const step = Math.max(2, chunkSize - overlapPoints);
  for (let start = 0; start < coords.length - 1; start += step) {
    const end = Math.min(coords.length, start + chunkSize);
    const slice = coords.slice(start, end);
    if (slice.length < 2) break;
    const coordStr = slice.map(([lng, lat]) => `${lng},${lat}`).join(";");
    const radiuses = new Array(slice.length).fill(25).join(";");
    const url = `https://api.mapbox.com/matching/v5/mapbox/${encodeURIComponent(
      profile
    )}/${coordStr}?geometries=geojson&tidy=true&radiuses=${radiuses}&access_token=${encodeURIComponent(
      token
    )}`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const j = await res.json();
      const match = Array.isArray(j?.matchings) && j.matchings.length > 0 ? j.matchings[0] : null;
      const coordsOut = match?.geometry?.coordinates;
      if (Array.isArray(coordsOut) && coordsOut.length >= 2) {
        const snapped = (coordsOut as any[])
          .map((c: any): LngLatTuple => [Number(c[0]), Number(c[1])])
          .filter((p: LngLatTuple): p is LngLatTuple => Number.isFinite(p[0]) && Number.isFinite(p[1]));
        if (snapped.length >= 2) segments.push(snapped);
      }
    } catch {
      // skip this chunk on error
    }
  }
  return segments;
}


