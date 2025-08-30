import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  const { username, password, recaptchaToken } = await req.json();
  // Verify reCAPTCHA (Invisible v2)
  if (!recaptchaToken) {
    return NextResponse.json({ error: "Missing reCAPTCHA token" }, { status: 400 });
  }
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "reCAPTCHA not configured" }, { status: 500 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0];
  const verifyBody = `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(recaptchaToken)}${ip ? `&remoteip=${encodeURIComponent(ip)}` : ""}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verifyBody,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    const verifyData: any = await verifyRes.json();
    if (!verifyData?.success) {
      return NextResponse.json({ error: "reCAPTCHA verification failed" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: "reCAPTCHA verification error" }, { status: 502 });
  }
  // Find user by email
  const userSnap = await db.collection('users').where('email', '==', username).limit(1).get();
  const userDoc = userSnap.docs[0];
  const user: any = userDoc ? { id: userDoc.id, ...userDoc.data() } : null;
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  // Compare password
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  // Optionally, return user info (never return password)
  // Log admin login activity
  if (user.role === 'admin') {
    await db.collection('activityLogs').add({
      type: 'Login',
      adminName: user.name || '',
      adminEmail: user.email,
      description: 'Admin logged in',
      createdAt: new Date(),
    });
  }
  return NextResponse.json({ message: "Login successful", user: { id: user.id, email: user.email, role: user.role, name: user.name } });
} 