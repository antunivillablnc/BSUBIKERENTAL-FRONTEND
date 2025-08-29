import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { applicationId, bikeId } = await req.json();
    // Validate application is not completed and not already assigned
    const application = await prisma.bikeRentalApplication.findUnique({ where: { id: applicationId } });
    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found.' }, { status: 404 });
    }
    if (application.status === 'completed') {
      return NextResponse.json({ success: false, error: 'This application has already been completed and cannot be reused.' }, { status: 400 });
    }
    if (!['approved', 'assigned', 'active'].includes(application.status)) {
      return NextResponse.json({ success: false, error: 'Application must be approved before assigning a bike.' }, { status: 400 });
    }
    if (application.bikeId) {
      return NextResponse.json({ success: false, error: 'Application already has a bike assigned.' }, { status: 400 });
    }
    // Check if bike is available
    const bike = await prisma.bike.findUnique({ where: { id: bikeId } });
    if (!bike || bike.status !== 'available') {
      return NextResponse.json({ success: false, error: 'Bike is not available.' }, { status: 400 });
    }
    // Assign bike to application and mark bike as rented
    await prisma.bikeRentalApplication.update({
      where: { id: applicationId },
      data: { bikeId, status: 'assigned', assignedAt: new Date() },
    });
    await prisma.bike.update({
      where: { id: bikeId },
      data: { status: 'rented' },
    });
    // Send notification email to applicant (best-effort; do not fail assignment if email fails)
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER || 'smtp.gmail.com',
        port: Number(process.env.EMAIL_PORT || 465),
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: { rejectUnauthorized: false },
      });

      const bikeLabel = bike?.name || bike?.plateNumber || 'your assigned bike';
      const recipient = application.email;
      if (recipient) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: recipient,
          subject: 'Your Bike Rental Application Has Been Accepted',
          text: `Good news! Your bike rental application has been accepted. The admin has assigned you bike ${bikeLabel}.`,
          html: `<p>Good news! Your bike rental application has been <strong>accepted</strong>.</p><p>The admin has assigned you bike <strong>${bikeLabel}</strong>.</p><p>Please check your dashboard for next steps and pickup instructions.</p>`,
        });
      }
    } catch (e) {
      console.error('Failed to send assignment email:', e);
      // continue without blocking the response
    }
    // Log activity (replace with real admin info in the future)
    await prisma.activityLog.create({
      data: {
        type: 'Assign Bike',
        adminName: 'Admin',
        adminEmail: 'admin@example.com',
        description: `Assigned bike ID ${bikeId} to application ID ${applicationId}`,
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
} 