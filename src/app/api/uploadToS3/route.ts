// route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimit } from '@/lib/rateLimit';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const bucketMap: Record<string, string> = {
  equipment: process.env.AWS_S3_EQUIPMENT_BUCKET_NAME!,
  bands: process.env.AWS_S3_BANDS_BUCKET_NAME!,
  budgets: process.env.AWS_S3_BUDGETS_BUCKET_NAME!,
  events: process.env.AWS_S3_EVENTS_BUCKET_NAME || 'degano-events-files',
};

// Tipos de archivo permitidos: imágenes (no SVG), audio, video, PDF, docs y texto.
// Bloquea SVG (XSS), HTML/JS y ejecutables.
const ALLOWED_PREFIXES = ['image/', 'audio/', 'video/'];
const ALLOWED_EXACT = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv'
]);
const BLOCKED_EXACT = new Set(['image/svg+xml']);

const isAllowedFileType = (fileType: string): boolean => {
  if (BLOCKED_EXACT.has(fileType)) return false;
  if (ALLOWED_EXACT.has(fileType)) return true;
  return ALLOWED_PREFIXES.some((p) => fileType.startsWith(p));
};

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { key: 'uploadToS3', limit: 40, windowMs: 60_000 });
  if (limited) return limited;

  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { fileName, fileType, bucket, folder } = await req.json();

  if (!fileName || !fileType || !bucket) {
    return NextResponse.json({ error: 'Missing fileName, fileType or bucket' }, { status: 400 });
  }
  if (!bucketMap[bucket]) {
    return NextResponse.json({ error: 'Bucket no válido' }, { status: 400 });
  }
  if (!isAllowedFileType(fileType)) {
    return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 });
  }

  const uniqueFileName = `${nanoid()}-${fileName}`;
  // Si viene un folder, se usa como prefijo => "carpeta" virtual en S3.
  // Ej: <folder>/<nanoid>-archivo.pdf. Sin folder, queda en la raíz (compat).
  const key = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;
  const bucketName = bucketMap[bucket];

  const command = new PutObjectCommand({
    Bucket: bucketName!,
    Key: key,
    ContentType: fileType
  });

  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

  const publicUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return NextResponse.json({ signedUrl, url: publicUrl });
}
