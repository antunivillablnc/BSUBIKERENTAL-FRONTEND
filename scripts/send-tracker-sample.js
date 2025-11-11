// Usage: node scripts/send-tracker-sample.js [deviceId] [lat] [lng]
// Requires env: IOT_SHARED_SECRET (same as backend), API_BASE (default http://localhost:4000)

require('dotenv').config();

const API_BASE = process.env.API_BASE || 'http://localhost:4000';
const SECRET = process.env.IOT_SHARED_SECRET || '';

const deviceId = process.argv[2] || 'dev-001';
const lat = Number(process.argv[3] || 13.7565);
const lng = Number(process.argv[4] || 121.0583);

if (!SECRET) {
  console.error('IOT_SHARED_SECRET is required in env');
  process.exit(1);
}

(async () => {
  const url = `${API_BASE}/tracker`;
  const body = {
    deviceId,
    latitude: lat,
    longitude: lng,
    speed: 5 + Math.random() * 10,
    heading: Math.floor(Math.random() * 360),
    timestamp: Date.now(),
    battery: 80,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SECRET}`,
    },
    body: JSON.stringify(body),
  });
  let data = {};
  try { data = await res.json(); } catch {}
  console.log(res.status, data);
})();


