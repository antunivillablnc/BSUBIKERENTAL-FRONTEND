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
} | {
  success: false;
  error: string;
};

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

    // Prefer going through backend dashboard route to avoid Firestore index issues
    let applications: any[] = [];
    try {
      const base = getApiBaseUrl();
      const q = user.id ? `userId=${encodeURIComponent(String(user.id))}` :
        (user.email ? `email=${encodeURIComponent(String(user.email))}` : '');
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
        .where('userId', '==', String(user.id || ''));
      const snap = await query.get();
      applications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }

    const activeStatuses = new Set(['assigned', 'active', 'approved']);
    const currentApp = applications
      .filter((a: any) => activeStatuses.has(String(a.status || '').toLowerCase()) && a.bikeId)
      .sort((a: any, b: any) => {
        const da = new Date(a.createdAt || a.assignedAt || 0).getTime();
        const dbt = new Date(b.createdAt || b.assignedAt || 0).getTime();
        return dbt - da;
      })[0];

    if (!currentApp?.bikeId) {
      return NextResponse.json({ success: false, error: 'No assigned bike found' }, { status: 404 });
    }

    const bikeDoc = await db.collection('bikes').doc(String(currentApp.bikeId)).get();
    const bike = bikeDoc.exists ? { id: bikeDoc.id, ...bikeDoc.data() } : null;
    const assignedAt = (currentApp.assignedAt as any)?.toDate?.() || currentApp.assignedAt || null;

    return NextResponse.json({
      success: true,
      bikeId: String(currentApp.bikeId),
      bikeName: bike?.name || bike?.plateNumber || null,
      applicationId: String(currentApp.id),
      assignedAt: assignedAt ? new Date(assignedAt).toISOString() : null,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to get assigned bike' }, { status: 500 });
  }
}


