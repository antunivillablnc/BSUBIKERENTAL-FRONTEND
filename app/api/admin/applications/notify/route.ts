import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { sendMail } from '@/lib/mailer';
import { requireRole } from '@/lib/serverAuth';

export async function POST(req: NextRequest) {
  try {
    requireRole(['admin']);
    const body = await req.json().catch(() => ({}));
    const applicationId = String(body?.applicationId || '').trim();
    const status = String(body?.status || '').trim();
    const allowed = new Set(['approved', 'rejected', 'pending']);
    if (!applicationId || !allowed.has(status)) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }

    const appDoc = await db.collection('applications').doc(applicationId).get();
    if (!appDoc.exists) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }
    const application: any = { id: appDoc.id, ...appDoc.data() };
    const recipient = String(application.email || '').trim();
    if (!recipient) {
      return NextResponse.json({ success: true });
    }

    const subject = status === 'approved'
      ? 'Your Bike Rental Application Has Been Approved'
      : status === 'rejected'
        ? 'Your Bike Rental Application Status'
        : 'Your Bike Rental Application Status Updated';
    const bodyHtml = status === 'approved'
      ? `<p>Your bike rental application has been <strong>approved</strong>.</p><p>We will contact you with next steps.</p>`
      : status === 'rejected'
        ? `<p>We’re sorry to inform you that your application was <strong>rejected</strong>.</p>`
        : `<p>Your application status is now: <strong>${status}</strong>.</p>`;

    await sendMail({ to: recipient, subject, html: bodyHtml });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    const statusCode = (e as any)?.statusCode || 500;
    return NextResponse.json({ success: false, error: e?.message || 'Failed to send email' }, { status: statusCode });
  }
}


