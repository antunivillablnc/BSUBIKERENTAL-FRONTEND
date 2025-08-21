import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// GET - Fetch all users
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json({ success: true, users });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// POST - Create new user
export async function POST(req: Request) {
  try {
    const { email, password, name, role } = await req.json();
    
    if (!email || !password || !name || !role) {
      return NextResponse.json({ success: false, error: 'All fields are required.' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'User with this email already exists.' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    });

    // Ensure leaderboard entry for non-admin users
    if ((role || '').toLowerCase() !== 'admin') {
      try {
        await prisma.leaderboard.create({
          data: {
            userId: user.id,
            name: name || email,
            distanceKm: 0,
            co2SavedKg: 0,
          },
        });
      } catch (e) {
        // Ignore if an entry already exists or any non-critical error
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        type: 'Create User',
        adminName: 'Admin',
        adminEmail: 'admin@example.com',
        description: `Created user account for ${email}`,
      },
    });

    return NextResponse.json({ success: true, user: { ...user, password: undefined } });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// PUT - Update user
export async function PUT(req: Request) {
  try {
    const { id, email, name, role, password } = await req.json();
    
    if (!id || !email || !name || !role) {
      return NextResponse.json({ success: false, error: 'ID, email, name, and role are required.' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    // Check if email is already taken by another user
    const emailTaken = await prisma.user.findFirst({ 
      where: { 
        email, 
        id: { not: id } 
      } 
    });
    if (emailTaken) {
      return NextResponse.json({ success: false, error: 'Email is already taken by another user.' }, { status: 400 });
    }

    const updateData: any = { email, name, role };
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        type: 'Update User',
        adminName: 'Admin',
        adminEmail: 'admin@example.com',
        description: `Updated user account for ${email}`,
      },
    });

    return NextResponse.json({ success: true, user: { ...user, password: undefined } });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// DELETE - Delete user
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'User ID is required.' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    // Delete user
    await prisma.user.delete({ where: { id } });

    // Log activity
    await prisma.activityLog.create({
      data: {
        type: 'Delete User',
        adminName: 'Admin',
        adminEmail: 'admin@example.com',
        description: `Deleted user account for ${existingUser.email}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
} 