import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '../lib/firebase';

type Args = {
  months: number;
  minBikes: number;
  maxBikes: number;
};

function getArgNum(name: string, def: number): number {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!raw) return def;
  const v = Number(raw.split('=')[1]);
  return Number.isFinite(v) ? v : def;
}

function choice<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randFloat(min: number, max: number) { return min + Math.random() * (max - min); }
function randInt(min: number, max: number) { return Math.floor(randFloat(min, max + 1)); }

function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

function normalizeName(s: string) { return s.toLowerCase().replace(/\s+/g, ' ').trim(); }

async function main() {
  const args: Args = {
    months: getArgNum('months', 9),
    minBikes: getArgNum('minBikes', 25),
    maxBikes: getArgNum('maxBikes', 35),
  };

  const bikesSnap = await db.collection('bikes').get();
  const bikes = bikesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((b) => (b.name || '').toString().trim().length > 0);
  if (bikes.length === 0) throw new Error('No bikes found. Seed bikes first.');

  const targetCount = Math.min(bikes.length, randInt(args.minBikes, args.maxBikes));
  const shuffled = [...bikes].sort(() => Math.random() - 0.5).slice(0, targetCount);

  // Build a name map for clarity
  const bikeIdToName: Record<string, string> = {};
  shuffled.forEach((b) => { bikeIdToName[b.id] = b.name || b.id; });

  // Time window
  const today = new Date();
  const startDate = new Date();
  startDate.setMonth(today.getMonth() - args.months);
  startDate.setHours(8, 0, 0, 0);

  let ridesWritten = 0;
  let issuesWritten = 0;

  const analyticalRef = db.collection('analytical_data');
  const issuesRef = db.collection('reported_issues');

  // Per-bike parameters
  for (const bike of shuffled) {
    const bikeName = bikeIdToName[bike.id];
    // Tighter, realistic thresholds to strengthen signal for the model
    const wearKmThreshold = randFloat(220, 380); // km until typical issue on campus bikes
    const dailyRideProb = randFloat(0.5, 0.85); // probability of a ride on a day
    const speedBias = randFloat(12, 18); // km/h average baseline
    const distanceBias = randFloat(2.5, 6.5); // km baseline per ride

    let date = new Date(startDate);
    let kmSinceIssue = 0;
    let lastIssueDate: Date | null = null;

    // Write in batches per bike to reduce roundtrips
    let batch = db.batch();
    let inBatch = 0;
    const commitIfNeeded = async () => {
      if (inBatch >= 400) { await batch.commit(); batch = db.batch(); inBatch = 0; }
    };

    while (date <= today) {
      if (Math.random() < dailyRideProb) {
        const dist = Math.max(0.5, randFloat(distanceBias * 0.6, distanceBias * 1.5));
        const speed = Math.max(6, randFloat(speedBias * 0.7, speedBias * 1.3));
        const durationMin = (dist / speed) * 60 * randFloat(0.9, 1.1);

        const rideDoc = analyticalRef.doc();
        batch.set(rideDoc, {
          bike_name: bikeName,
          ride_date: date,
          distance_km: Number(dist.toFixed(2)),
          duration_min: Number(durationMin.toFixed(1)),
          avg_speed_kmh: Number(speed.toFixed(1)),
          createdAt: new Date(),
        });
        inBatch += 1; ridesWritten += 1;
        kmSinceIssue += dist;
        await commitIfNeeded();

        // Issue trigger based on cumulative km + noise; enforce spacing
        const noise = randFloat(-25, 25);
        const threshold = wearKmThreshold + noise;
        const minDaysBetween = 7;
        const canIssue = !lastIssueDate || (date.getTime() - lastIssueDate.getTime()) / (24*60*60*1000) >= minDaysBetween;
        if (kmSinceIssue >= threshold && canIssue) {
          const issueDoc = issuesRef.doc();
          const issueType = choice(['brake', 'tire', 'chain', 'gear', 'general']);
          batch.set(issueDoc, {
            bikeId: bike.id,
            type: issueType,
            reportedAt: date,
            message: `${issueType} maintenance required`,
            status: 'open',
            createdAt: new Date(),
          });
          inBatch += 1; issuesWritten += 1;
          kmSinceIssue = 0; lastIssueDate = new Date(date);
          await commitIfNeeded();
        }
      }

      // advance 1 day
      date = addDays(date, 1);
    }

    if (inBatch > 0) await batch.commit();

    // Ensure at least 2 issues per bike by injecting one near the end window if needed
    const issuesSnap = await db.collection('reported_issues').where('bikeId', '==', bike.id).get();
    const countIssues = issuesSnap.size;
    if (countIssues < 2) {
      const fallbackDate = addDays(today, -randInt(5, 20));
      await issuesRef.add({
        bikeId: bike.id,
        type: 'general',
        reportedAt: fallbackDate,
        message: 'scheduled maintenance',
        status: 'open',
        createdAt: new Date(),
      });
      issuesWritten += 1;
    }
  }

  console.log(`✅ Seeded synthetic data → rides: ${ridesWritten}, issues: ${issuesWritten}`);
}

main().catch((e) => { console.error(e); process.exit(1); });


