import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

type WeeklyDatum = { day: string; distance: number; calories: number; co2: number };
type AnalyticsResponse = {
  success: true;
  distanceKmToday: number;
  co2SavedKgToday: number;
  caloriesBurnedToday: number;
  weekly: WeeklyDatum[];
  longestRideKm: number;
  fastestSpeedKmh: number;
} | {
  success: false;
  error: string;
};

const CO2_PER_KM_KG = 0.12;       // rough estimate vs car
const CALORIES_PER_KM = 30;       // casual pace estimate

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfNdaysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

export async function GET(req: NextRequest): Promise<NextResponse<AnalyticsResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const bikeIdStr = (searchParams.get('bikeId') || '').trim();
    const bikeName = (searchParams.get('bikeName') || '').trim();
    if (!bikeIdStr && !bikeName) {
      return NextResponse.json({ success: false, error: 'bikeId or bikeName is required' }, { status: 400 });
    }

    // Prefer collection with bike_id if available, fallback to name-based
    const collections = ['analytical_with_bike_id', 'analytical'];
    let docs: any[] = [];
    for (const coll of collections) {
      try {
        let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection(coll);
        if (coll === 'analytical_with_bike_id' && bikeIdStr) {
          const numericId = Number(bikeIdStr);
          if (!Number.isNaN(numericId)) {
            query = query.where('bike_id', '==', numericId);
          }
        } else if (coll === 'analytical' && bikeName) {
          query = query.where('bike_name', '==', bikeName);
        } else {
          continue;
        }
        const snap = await query.get();
        docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (docs.length > 0) break;
      } catch {
        // try next collection
      }
    }

    const todayS = startOfDay(new Date()).getTime();
    const last7Start = startOfNdaysAgo(6).getTime(); // includes today -> 7 days window
    const byDay: Record<string, number> = {};
    let longestRideKm = 0;
    let fastestSpeedKmh = 0;
    let distanceKmToday = 0;

    for (const r of docs) {
      const rideDate: Date =
        (r.ride_date as any)?.toDate?.() ||
        (r.ride_date ? new Date(r.ride_date) : null);
      const dist = Number(r.distance_km || 0) || 0;
      const speed = Number(r.avg_speed_kmh || 0) || 0;
      if (rideDate instanceof Date && !isNaN(rideDate.getTime())) {
        const s = startOfDay(rideDate).getTime();
        if (s >= last7Start) {
          const key = startOfDay(rideDate).toISOString().slice(0, 10);
          byDay[key] = (byDay[key] || 0) + dist;
        }
        if (s === todayS) {
          distanceKmToday += dist;
        }
      }
      if (dist > longestRideKm) longestRideKm = dist;
      if (speed > fastestSpeedKmh) fastestSpeedKmh = speed;
    }

    // Build last 7 days array (Mon..Sun presentation left to client)
    const weekly: WeeklyDatum[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = startOfNdaysAgo(i);
      const key = day.toISOString().slice(0, 10);
      const distance = Number((byDay[key] || 0).toFixed(2));
      weekly.push({
        day: day.toLocaleDateString(undefined, { weekday: 'short' }),
        distance,
        calories: Math.round(distance * CALORIES_PER_KM),
        co2: Number((distance * CO2_PER_KM_KG).toFixed(2)),
      });
    }

    const co2SavedKgToday = Number((distanceKmToday * CO2_PER_KM_KG).toFixed(2));
    const caloriesBurnedToday = Math.round(distanceKmToday * CALORIES_PER_KM);

    return NextResponse.json({
      success: true,
      distanceKmToday: Number(distanceKmToday.toFixed(2)),
      co2SavedKgToday,
      caloriesBurnedToday,
      weekly,
      longestRideKm: Number(longestRideKm.toFixed(1)),
      fastestSpeedKmh: Number(fastestSpeedKmh.toFixed(1)),
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to load analytics' }, { status: 500 });
  }
}


