import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { db } from '@/lib/firebase';
import { sendMail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || '').trim();
    if (!email) return NextResponse.json({ message: 'Email is required' }, { status: 400 });

    const snap = await db.collection('users').where('email', '==', email).limit(1).get();
    const doc = snap.docs[0];
    const user: any = doc ? { id: doc.id, ...doc.data() } : null;

    if (!user) {
      return NextResponse.json({ message: 'If this email is registered, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    await db.collection('users').doc(user.id).update({ passwordResetToken: token, passwordResetExpiry: expiry });

    const baseUrl = (process.env.FRONTEND_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    try {
      await sendMail({
        to: email,
        subject: 'Password Reset',
        text: `Reset your password: ${resetLink}`,
        html: `<p>Click the link to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
      });
    } catch (e) {
      // do not reveal email send failures
      console.error('Failed to send reset email:', e);
    }

    return NextResponse.json({ message: 'If this email is registered, a reset link has been sent.' });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to process request' }, { status: 500 });
  }
}


