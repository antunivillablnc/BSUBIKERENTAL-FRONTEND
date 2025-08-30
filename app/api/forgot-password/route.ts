import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { db } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Find user by email
  const userSnap = await db.collection('users').where('email', '==', email).limit(1).get();
  const userDoc = userSnap.docs[0];
  const user: any = userDoc ? { id: userDoc.id, ...userDoc.data() } : null;
  if (!user) {
    // Always return success for security
    return NextResponse.json({ message: "If this email is registered, a reset link has been sent." });
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now

  // Store token and expiry in user record
  await db.collection('users').doc(user.id).update({
    passwordResetToken: token,
    passwordResetExpiry: expiry,
  });

  // Generate reset link
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const resetLink = `${baseUrl}/reset-password?token=${token}`;

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER,
    port: Number(process.env.EMAIL_PORT),
    secure:true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false, // <--- Add this line
    },
  });

  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS);

  await transporter.sendMail({
    to: user.email,
    subject: "Password Reset",
    text: `Reset link: ${resetLink}`,
  });

  return NextResponse.json({ message: "If this email is registered, a reset link has been sent." });
} 