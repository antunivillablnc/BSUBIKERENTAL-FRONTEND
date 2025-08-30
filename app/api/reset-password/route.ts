import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) {
    return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
  }
  // Find user by token
  const snap = await db.collection('users').where('passwordResetToken', '==', token).limit(1).get();
  const doc = snap.docs[0];
  const user: any = doc ? { id: doc.id, ...doc.data() } : null;
  if (!user || !user.passwordResetExpiry || user.passwordResetExpiry.toDate?.() < new Date()) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }
  // Hash new password
  const hashed = await bcrypt.hash(password, 10);
  // Update user password and clear token
  await db.collection('users').doc(user.id).update({
    password: hashed,
    passwordResetToken: null,
    passwordResetExpiry: null,
  });
  return NextResponse.json({ message: "Password has been reset. You can now log in." });
} 