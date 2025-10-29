import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { sendMail } from '@/lib/mailer';
import { requireRole } from '@/lib/serverAuth';

export async function POST(req: NextRequest) {
  try {
    requireRole(req, ['admin']);
    const body = await req.json().catch(() => ({}));
    const applicationId = String(body?.applicationId || '').trim();
    const bikeId = String(body?.bikeId || '').trim();
    if (!applicationId || !bikeId) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }

    const [appDoc, bikeDoc] = await Promise.all([
      db.collection('applications').doc(applicationId).get(),
      db.collection('bikes').doc(bikeId).get(),
    ]);

    if (!appDoc.exists) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    if (!bikeDoc.exists) return NextResponse.json({ success: false, error: 'Bike not found' }, { status: 404 });

    const application: any = { id: appDoc.id, ...appDoc.data() };
    const bike: any = { id: bikeDoc.id, ...bikeDoc.data() };

    const recipient = String(application.email || '').trim();
    if (!recipient) return NextResponse.json({ success: true });

    const bikeLabel = bike?.name || bike?.plateNumber || 'your assigned bike';
    await sendMail({
      to: recipient,
      subject: 'Your Bike Rental Application Has Been Accepted',
      text: `Good news! Your bike rental application has been accepted. The admin has assigned you bike ${bikeLabel}.`,
      html: `<p>Good news! Your bike rental application has been <strong>accepted</strong>.</p><p>The admin has assigned you bike <strong>${bikeLabel}</strong>.</p><p>Please check your dashboard for next steps and pickup instructions.</p>`,
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    const statusCode = (e as any)?.statusCode || 500;
    return NextResponse.json({ success: false, error: e?.message || 'Failed to send email' }, { status: statusCode });
  }
}


