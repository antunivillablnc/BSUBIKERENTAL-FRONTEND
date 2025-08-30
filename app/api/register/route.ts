import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const { fullName, email, password, role } = await req.json();
    if (!fullName || !email || !password || !role) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    // Normalize role to lowercase for consistency
    const normalizedRole = role.toLowerCase();
    // Check for existing user
    const existingSnap = await db.collection('users').where('email', '==', email).limit(1).get();
    const existing = !existingSnap.empty;
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    // Hash password
    const hashed = await bcrypt.hash(password, 10);
    // Create user
    await db.collection('users').add({
      name: fullName,
      email,
      password: hashed,
      role: normalizedRole,
      createdAt: new Date(),
    });
    return NextResponse.json({ message: "Registration successful" });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: `Registration failed: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
} 