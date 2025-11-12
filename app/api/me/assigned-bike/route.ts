import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { getAuthUserFromRequest } from '@/lib/serverAuth';
import { getApiBaseUrl } from '@/lib/apiClient';

type AssignedBikeResponse = {
  success: true;
  bikeId: string;
  bikeName?: string | null;
  applicationId: string;
  assignedAt?: string | null;
  deviceId?: string | null;
} | {
  success: false;
  error: string;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest): Promise<NextResponse<AssignedBikeResponse>> {
  try {
    let user = getAuthUserFromRequest(req);
    if (!user?.id && !user?.email) {
      // Allow fallback via query for cases where cookies aren’t available
      const url = new URL(req.url);
      const qsUserId = url.searchParams.get('userId') || undefined;
      const qsEmail = url.searchParams.get('email') || undefined;
      if (!qsUserId && !qsEmail) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      user = { id: String(qsUserId || ''), email: String(qsEmail || ''), role: 'student' } as any;
    }

    // Cache simple scalars for safe narrowing
    const uid = user?.id ? String(user.id) : '';
    const uemail = user?.email ? String(user.email) : '';

    // Prefer going through backend dashboard route to avoid Firestore index issues
    let applications: any[] = [];
    try {
      const base = getApiBaseUrl();
      const q = uid ? `userId=${encodeURIComponent(uid)}` :
        (uemail ? `email=${encodeURIComponent(uemail)}` : '');
      const resp = await fetch(`${base}/dashboard?${q}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.success && Array.isArray(data.applications)) {
          applications = data.applications;
        }
      }
    } catch {
      // fall through to Firestore fallback
    }

    if (applications.length === 0) {
      // Fallback: query Firestore directly
      const query = db.collection('applications')
        .where('userId', '==', uid);
      const snap = await query.get();
      applications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }

    // Prefer 'assigned' then 'active', and only then 'approved' (rarely has a bike)
    const priority: Record<string, number> = { assigned: 3, active: 2, approved: 1 };
    const normalized = (s: any) => String(s || '').toLowerCase();
    const currentApp = applications
      .filter((a: any) => {
        const st = normalized(a.status);
        return (st === 'assigned' || st === 'active' || st === 'approved') && a.bikeId;
      })
      .sort((a: any, b: any) => {
        const pa = priority[normalized(a.status)] || 0;
        const pb = priority[normalized(b.status)] || 0;
        if (pb !== pa) return pb - pa;
        // Fallback to latest by assignedAt/createdAt
        const da = new Date(a.assignedAt || a.createdAt || 0).getTime();
        const dbt = new Date(b.assignedAt || b.createdAt || 0).getTime();
        return dbt - da;
      })[0];

    if (!currentApp?.bikeId) {
      return NextResponse.json({ success: false, error: 'No assigned bike found' }, { status: 404 });
    }

    const bikeDoc = await db.collection('bikes').doc(String(currentApp.bikeId)).get();
    const bikeData: any = bikeDoc.exists ? { id: bikeDoc.id, ...bikeDoc.data() } : null;
    const assignedAt = (currentApp.assignedAt as any)?.toDate?.() || currentApp.assignedAt || null;
    const resolvedBikeName = bikeData?.name || bikeData?.bikeName || bikeData?.plateNumber || null;
    const resolvedDeviceId = bikeData?.DEVICE_ID || bikeData?.deviceId || null;

    return NextResponse.json({
      success: true,
      bikeId: String(currentApp.bikeId),
      bikeName: resolvedBikeName,
      applicationId: String(currentApp.id),
      assignedAt: assignedAt ? new Date(assignedAt).toISOString() : null,
      deviceId: resolvedDeviceId,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to get assigned bike' }, { status: 500 });
  }
}


