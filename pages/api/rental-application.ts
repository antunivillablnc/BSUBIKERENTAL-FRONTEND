import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { IncomingForm, File as FormidableFile, Fields, Files } from 'formidable';
import path from 'path';
import cloudinary from '../../lib/cloudinary';

export const config = {
  api: {
    bodyParser: false,
  },
};

const prisma = new PrismaClient();

function getStringField(field: string | string[] | undefined): string | undefined {
  if (Array.isArray(field)) return field[0];
  return field ? String(field) : undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }
  try {
    const form = new IncomingForm({ keepExtensions: true });
    const data = await new Promise<{ fields: Fields; files: Files }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // Access fields and file
    const fields = data.fields;
    let file = data.files.indigencyFile as FormidableFile | FormidableFile[] | undefined;
    if (Array.isArray(file)) file = file[0];

    // Prevent duplicate active/pending/approved applications
    const existing = await prisma.bikeRentalApplication.findFirst({
      where: {
        userId: getStringField(fields.userId),
        status: { in: ["pending", "approved", "active"] },
      },
    });
    if (existing) {
      res.status(400).json({ success: false, error: "You already have an active or pending rental application." });
      return;
    }

    // Upload the file to Cloudinary if it exists
    let certificatePath = null;
    if (file && file.filepath && file.originalFilename) {
      const publicId = path.parse(file.originalFilename).name;
      const upload = await cloudinary.uploader.upload(file.filepath, {
        folder: 'bike-rental/certificates',
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
      });
      certificatePath = upload.secure_url;
    }

    // Save form data to Prisma
    const application = await prisma.bikeRentalApplication.create({
      data: {
        lastName: getStringField(fields.lastName)!,
        firstName: getStringField(fields.firstName)!,
        middleName: getStringField(fields.middleName),
        srCode: getStringField(fields.srCode)!,
        sex: getStringField(fields.sex)!,
        dateOfBirth: new Date(getStringField(fields.dateOfBirth)!),
        phoneNumber: getStringField(fields.phoneNumber)!,
        email: getStringField(fields.email)!,
        collegeProgram: getStringField(fields.collegeProgram)!,
        gwaLastSemester: getStringField(fields.gwaLastSemester)!,
        extracurricularActivities: getStringField(fields.extracurricularActivities),
        houseNo: getStringField(fields.houseNo)!,
        streetName: getStringField(fields.streetName)!,
        barangay: getStringField(fields.barangay)!,
        municipality: getStringField(fields.municipality)!,
        province: getStringField(fields.province)!,
        distanceFromCampus: getStringField(fields.distanceFromCampus)!,
        familyIncome: getStringField(fields.familyIncome)!,
        intendedDuration: getStringField(fields.intendedDuration)!,
        intendedDurationOther: getStringField(fields.intendedDurationOther),
        certificatePath: certificatePath,
        userId: getStringField(fields.userId)!,
      },
    });

    res.status(200).json({ success: true, application });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
} 