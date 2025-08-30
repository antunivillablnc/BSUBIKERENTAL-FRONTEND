import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, File as FormidableFile, Fields, Files } from 'formidable';
import path from 'path';
import cloudinary from '../../lib/cloudinary';
import { db } from '@/lib/firebase';

export const config = {
  api: {
    bodyParser: false,
  },
};

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

    // Access fields and files
    const fields = data.fields;
    let indigencyFile = data.files.indigencyFile as FormidableFile | FormidableFile[] | undefined;
    if (Array.isArray(indigencyFile)) indigencyFile = indigencyFile[0];
    let gwaFile = data.files.gwaFile as FormidableFile | FormidableFile[] | undefined;
    if (Array.isArray(gwaFile)) gwaFile = gwaFile[0];
    let ecaFile = data.files.ecaFile as FormidableFile | FormidableFile[] | undefined;
    if (Array.isArray(ecaFile)) ecaFile = ecaFile[0];
    let itrFile = data.files.itrFile as FormidableFile | FormidableFile[] | undefined;
    if (Array.isArray(itrFile)) itrFile = itrFile[0];

    // Prevent duplicate active/pending/approved applications (filter in memory to avoid composite index)
    const userId = getStringField(fields.userId);
    const existingSnap = await db.collection('applications').where('userId', '==', userId).get();
    const existing = existingSnap.docs
      .map(d => ({ id: d.id, ...(d.data() as any) }))
      .find(a => ['pending', 'approved', 'active', 'assigned'].includes(String(a.status || '').toLowerCase()));
    if (existing) {
      res.status(400).json({ success: false, error: "You already have an active or pending rental application." });
      return;
    }

    // Upload files to Cloudinary if present
    let certificatePath: string | null = null;
    let gwaDocumentPath: string | null = null;
    let ecaDocumentPath: string | null = null;
    let itrDocumentPath: string | null = null;

    if (indigencyFile && indigencyFile.filepath && indigencyFile.originalFilename) {
      const publicId = path.parse(indigencyFile.originalFilename).name;
      const upload = await cloudinary.uploader.upload(indigencyFile.filepath, {
        folder: 'bike-rental/certificates',
        public_id: publicId,
        overwrite: true,
        resource_type: 'auto',
        type: 'upload',
      });
      certificatePath = upload.secure_url;
    }
    if (gwaFile && gwaFile.filepath && gwaFile.originalFilename) {
      const publicId = path.parse(gwaFile.originalFilename).name;
      const upload = await cloudinary.uploader.upload(gwaFile.filepath, {
        folder: 'bike-rental/documents/gwa',
        public_id: publicId,
        overwrite: true,
        resource_type: 'auto',
        type: 'upload',
      });
      gwaDocumentPath = upload.secure_url;
    }
    if (ecaFile && ecaFile.filepath && ecaFile.originalFilename) {
      const publicId = path.parse(ecaFile.originalFilename).name;
      const upload = await cloudinary.uploader.upload(ecaFile.filepath, {
        folder: 'bike-rental/documents/eca',
        public_id: publicId,
        overwrite: true,
        resource_type: 'auto',
        type: 'upload',
      });
      ecaDocumentPath = upload.secure_url;
    }
    if (itrFile && itrFile.filepath && itrFile.originalFilename) {
      const publicId = path.parse(itrFile.originalFilename).name;
      const upload = await cloudinary.uploader.upload(itrFile.filepath, {
        folder: 'bike-rental/documents/itr',
        public_id: publicId,
        overwrite: true,
        resource_type: 'auto',
        type: 'upload',
      });
      itrDocumentPath = upload.secure_url;
    }

    // Save form data to Firestore
    const docRef = await db.collection('applications').add({
      lastName: getStringField(fields.lastName)!,
      firstName: getStringField(fields.firstName)!,
      middleName: getStringField(fields.middleName) || null,
      srCode: getStringField(fields.srCode)!,
      sex: getStringField(fields.sex)!,
      dateOfBirth: new Date(getStringField(fields.dateOfBirth)!),
      phoneNumber: getStringField(fields.phoneNumber)!,
      email: getStringField(fields.email)!,
      collegeProgram: getStringField(fields.collegeProgram) || null,
      college: getStringField(fields.college) || null,
      program: getStringField(fields.program) || null,
      gwaLastSemester: getStringField(fields.gwaLastSemester) || null,
      extracurricularActivities: getStringField(fields.extracurricularActivities) || null,
      houseNo: getStringField(fields.houseNo)!,
      streetName: getStringField(fields.streetName)!,
      barangay: getStringField(fields.barangay)!,
      municipality: getStringField(fields.municipality)!,
      province: getStringField(fields.province)!,
      distanceFromCampus: getStringField(fields.distanceFromCampus)!,
      familyIncome: getStringField(fields.familyIncome)!,
      intendedDuration: getStringField(fields.intendedDuration)!,
      intendedDurationOther: getStringField(fields.intendedDurationOther) || null,
      certificatePath: certificatePath,
      gwaDocumentPath: gwaDocumentPath,
      ecaDocumentPath: ecaDocumentPath,
      itrDocumentPath: itrDocumentPath,
      userId: userId!,
      bikeId: null,
      status: 'pending',
      dueDate: null,
      assignedAt: null,
      createdAt: new Date(),
    });
    const application = { id: docRef.id };

    res.status(200).json({ success: true, application });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
} 