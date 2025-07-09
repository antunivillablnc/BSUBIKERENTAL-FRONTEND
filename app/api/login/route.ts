import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  // Find user by email
  const user = await prisma.user.findUnique({ where: { email: username } });
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
    await prisma.activityLog.create({
      data: {
        type: 'Login',
        adminName: user.name || '',
        adminEmail: user.email,
        description: 'Admin logged in',
      },
    });
  }
  return NextResponse.json({ message: "Login successful", user: { id: user.id, email: user.email, role: user.role, name: user.name } });
} 