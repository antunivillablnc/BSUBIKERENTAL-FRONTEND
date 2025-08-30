import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/firebase';

// GET - Fetch all users
export async function GET() {
  try {
    const snap = await db.collection('users').orderBy('createdAt', 'desc').get();
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
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
    const existingSnap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!existingSnap.empty) {
      return NextResponse.json({ success: false, error: 'User with this email already exists.' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const userRef = await db.collection('users').add({
      email,
      password: hashedPassword,
      name,
      role,
      createdAt: new Date(),
    });
    const user = { id: userRef.id, email, name, role, createdAt: new Date() };

    // Ensure leaderboard entry for non-admin users
    if ((role || '').toLowerCase() !== 'admin') {
      try {
        await db.collection('leaderboard').add({
          userId: user.id,
          name: name || email,
          distanceKm: 0,
          co2SavedKg: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (e) {
        // Ignore non-critical error
      }
    }

    // Log activity
    await db.collection('activityLogs').add({
      type: 'Create User',
      adminName: 'Admin',
      adminEmail: 'admin@example.com',
      description: `Created user account for ${email}`,
      createdAt: new Date(),
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
    const existingDoc = await db.collection('users').doc(id).get();
    if (!existingDoc.exists) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    // Check if email is already taken by another user
    const emailSnap = await db.collection('users').where('email', '==', email).get();
    const emailTaken = emailSnap.docs.some(d => d.id !== id);
    if (emailTaken) {
      return NextResponse.json({ success: false, error: 'Email is already taken by another user.' }, { status: 400 });
    }

    const updateData: any = { email, name, role };
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    await db.collection('users').doc(id).update(updateData);
    const user = { id, ...updateData };

    // Log activity
    await db.collection('activityLogs').add({
      type: 'Update User',
      adminName: 'Admin',
      adminEmail: 'admin@example.com',
      description: `Updated user account for ${email}`,
      createdAt: new Date(),
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
    const existingDoc = await db.collection('users').doc(id).get();
    if (!existingDoc.exists) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    // Delete user
    await db.collection('users').doc(id).delete();

    // Log activity
    await db.collection('activityLogs').add({
      type: 'Delete User',
      adminName: 'Admin',
      adminEmail: 'admin@example.com',
      description: `Deleted user account for ${existingDoc.data()?.email}`,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
} 