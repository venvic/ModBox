import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getStorage, Storage } from "firebase-admin/storage";
import { writeFileSync, unlinkSync } from 'fs';
import path from 'path';
import os from 'os';

const serviceAccount = JSON.parse(process.env.NEXT_PUBLIC_SERVICE_ACCOUNT || '{}');
const bucketName = process.env.STORAGE_BUCKET || process.env.NEXT_PUBLIC_STORAGE_BUCKET || '';

if (!bucketName) {
  throw new Error('Storage bucket name not specified. Set FIREBASE_STORAGE_BUCKET in your env.');
}

let firebaseApp: App;
let storage: Storage;

if (!getApps().length) {
    firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: bucketName,
    });
    storage = getStorage(firebaseApp);
} else {
    firebaseApp = getApps()[0];
    storage = getStorage(firebaseApp);
}

const bucket = storage.bucket(bucketName);

export async function POST(req: NextRequest) {
  if (!req.body) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${file.name}`);
  writeFileSync(tempFilePath, buffer);

  const destination = `TEMP_UPLOADS/${Date.now()}-${file.name}`;
  await bucket.upload(tempFilePath, {
    destination,
    metadata: {
      contentType: file.type || 'application/octet-stream',
    },
  });

  const encodedDestination = encodeURIComponent(destination);
  const firebaseStorageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedDestination}?alt=media`;
  return NextResponse.json({ url: firebaseStorageUrl });
}

export const config = {
  api: {
    bodyParser: false,
  },
};