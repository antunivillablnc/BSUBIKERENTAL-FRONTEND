import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/serverAuth';
import { getMongoDb, maybeObjectId } from '@/lib/mongo';

type HistoryItem = {
	_id: string;
	userId: string;
	bikeId?: string | null;
	bikeName?: string | null;
	startDate?: string | Date | null;
	endDate?: string | Date | null;
	status?: string | null;
	totalCost?: number | null;
	createdAt?: string | Date | null;
};

// No indexes needed when using Firestore/compat layer

export async function GET(req: NextRequest) {
	let user = getAuthUserFromRequest(req);
	// Fallback: allow querying by userId/email when auth cookie is not present (helps when cross-site cookies are blocked)
	if (!user?.id) {
		const url = new URL(req.url);
		const qsUserId = url.searchParams.get('userId') || undefined;
		const qsEmail = url.searchParams.get('email') || undefined;
		if (!qsUserId && !qsEmail) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}
		user = {
			id: String(qsUserId || ''),
			email: String(qsEmail || ''),
			role: 'student',
		};
	}

	const { searchParams } = new URL(req.url);
	const page = Math.max(1, Number(searchParams.get('page') || '1'));
	const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '10')));
	const sortParam = (searchParams.get('sort') || '-createdAt').trim().replace(/^\+/, '');

	try {
		const db = await getMongoDb();
		const rentalsCol = db.collection('rentalHistory');
		const bikesCol = db.collection('bikes');
		const appsCol = db.collection('applications');

		// 1) Completed rentals from rentalHistory
		const userIdStr = String(user.id);
		// Query by both ObjectId and string to be robust to schema differences
		const userIdCandidates: any[] = [userIdStr];
		try { userIdCandidates.push(maybeObjectId(userIdStr)); } catch {}
		const byUserId = { userId: { $in: userIdCandidates } } as any;
		const byEmail = user.email ? { email: String(user.email) } : null;

		const rentalsQuery = rentalsCol.find(byUserId);
		const rentalsRaw = await rentalsQuery.toArray();
		const rentalsFallback = rentalsRaw.length === 0 && byEmail ? await rentalsCol.find(byEmail).toArray() : [];
		const rentalsDocs = rentalsRaw.length ? rentalsRaw : rentalsFallback;

		// Collect bikeIds to batch-fetch names
		const bikeIdSet = new Set<string>();
		for (const r of rentalsDocs) {
			if (r?.bikeId) bikeIdSet.add(String(r.bikeId));
		}

		// 2) In-progress/approved/etc from backend /dashboard to ensure parity with admin
		const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || '').replace(/\/$/, '');
		let appsDocs: any[] = [];
		if (baseUrl) {
			try {
				const q = user.id ? `userId=${encodeURIComponent(String(user.id))}` : (user.email ? `email=${encodeURIComponent(String(user.email))}` : '');
				if (q) {
					const resp = await fetch(`${baseUrl}/dashboard?${q}`, { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
					if (resp.ok) {
						const data = await resp.json();
						if (data?.success && Array.isArray(data.applications)) {
							appsDocs = data.applications as any[];
						}
					}
				}
			} catch {}
		}
		// Fallback to Mongo 'applications' if HTTP not available or empty
		if (appsDocs.length === 0) {
			try {
				const appsById = await appsCol.find(byUserId).toArray();
				const appsByEmail = appsById.length === 0 && byEmail ? await appsCol.find(byEmail).toArray() : [];
				appsDocs = (appsById.length ? appsById : appsByEmail) as any[];
			} catch {}
		}
		// Track bikes from apps too
		for (const a of appsDocs) if (a?.bikeId) bikeIdSet.add(String(a.bikeId));

		// Batch load bikes
		const bikeIdArr = Array.from(bikeIdSet);
		const bikeMap = new Map<string, string>();
		if (bikeIdArr.length) {
			const ids = bikeIdArr.map(maybeObjectId);
			const bikes = await bikesCol.find({ _id: { $in: ids } }).toArray();
			for (const b of bikes) {
				bikeMap.set(String(b._id), String((b as any)?.name || ''));
			}
		}

		const fromRentals: HistoryItem[] = rentalsDocs.map((r: any) => {
			const created = r?.createdAt instanceof Date ? r.createdAt.toISOString() : r?.createdAt ?? null;
			const start = r?.startDate instanceof Date ? r.startDate.toISOString() : r?.startDate ?? null;
			const end = r?.endDate instanceof Date ? r.endDate.toISOString() : r?.endDate ?? null;
			const bikeId = r?.bikeId ? String(r.bikeId) : null;
			const bikeName = r?.bikeName ?? (bikeId ? bikeMap.get(bikeId) || null : null);
			return {
				_id: String(r._id),
				userId: String(r.userId || user.id),
				bikeId,
				bikeName,
				startDate: start,
				endDate: end,
				status: r?.status ?? 'Completed',
				totalCost: typeof r?.totalCost === 'number' ? r.totalCost : null,
				createdAt: created,
			};
		});

		const fromApps: HistoryItem[] = appsDocs
			.map((a: any) => {
			const base = a?.assignedAt instanceof Date ? a.assignedAt : (a?.createdAt instanceof Date ? a.createdAt : (a?.assignedAt || a?.createdAt || null));
			const startIso = base instanceof Date ? base.toISOString() : (base ?? null);
			const bikeId = a?.bikeId ? String(a.bikeId) : null;
			const bikeName = a?.bike?.name ?? a?.bikeName ?? (bikeId ? bikeMap.get(bikeId) || null : null);
			const s = String(a?.status || '').toLowerCase();
			const normalizedStatus =
				s === 'rejected' || s === 'declined' ? 'Rejected' :
				(a?.bikeId ? 'Rented' : (s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Submitted'));
			return {
				_id: `app-${String(a._id || a.id)}`,
				userId: String(a.userId || user.id),
				bikeId,
				bikeName,
				startDate: startIso,
				endDate: null,
				status: normalizedStatus,
				totalCost: null,
				createdAt: startIso,
			};
		});

		// Only show completed rentals in history
		const completed = fromRentals.filter((r) => {
			const s = String(r.status || '').toLowerCase();
			return s === 'completed' || !!r.endDate;
		});
		completed.sort((a, b) => {
			const aT = new Date(String(a.createdAt || a.startDate || 0)).getTime();
			const bT = new Date(String(b.createdAt || b.startDate || 0)).getTime();
			return sortParam.startsWith('-') ? bT - aT : aT - bT;
		});

		const total = completed.length;
		const startIdx = (page - 1) * limit;
		const sliced = completed.slice(startIdx, startIdx + limit);

		return NextResponse.json({ items: sliced, total, page, limit });
	} catch (e: any) {
		const message = String(e?.message || e || 'Unknown error');
		return NextResponse.json({ error: message }, { status: 500 });
	}
}



